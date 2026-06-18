import { Hono } from 'hono';
import { authMiddleware, type AuthVariables } from '../../middleware/auth.js';
import { adminMiddleware } from '../../middleware/admin-auth.js';
import { rateLimit } from '../../middleware/rate-limit.js';
import { CreateNoticeRequest, UpdateNoticeRequest } from '../../schemas/notices.js';
import {
  deleteNotice,
  insertNotice,
  listAllNotices,
  listPublishedNotices,
  readNotice,
  updateNotice,
} from '../../notices/storage.js';
import type { Bindings } from '../../bindings.js';

const MODEL_VERSION = 'notices-v0.1.0';

// 공개 — 로그인 불필요(랜딩 포함 노출). published 만.
export const noticesPublicRoute = new Hono<{ Bindings: Bindings }>();

noticesPublicRoute.get('/', rateLimit(300), async (c) => {
  const notices = await listPublishedNotices(c.env.DB, 50);
  return c.json({ notices, modelVersion: MODEL_VERSION });
});

// 관리자 — CRUD. authMiddleware + adminMiddleware.
export const noticesAdminRoute = new Hono<{
  Bindings: Bindings;
  Variables: AuthVariables;
}>();

noticesAdminRoute.get('/', authMiddleware, adminMiddleware, rateLimit(60), async (c) => {
  const notices = await listAllNotices(c.env.DB, 200);
  return c.json({ notices, modelVersion: MODEL_VERSION });
});

noticesAdminRoute.post('/', authMiddleware, adminMiddleware, rateLimit(30), async (c) => {
  const me = c.get('userPseudonymId');
  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    return c.json({ error: { code: 'INVALID_JSON' } }, 400);
  }
  const parsed = CreateNoticeRequest.safeParse(raw);
  if (!parsed.success) return c.json({ error: { code: 'INVALID_INPUT' } }, 400);

  const id = crypto.randomUUID();
  await insertNotice(c.env.DB, {
    id,
    title: parsed.data.title,
    body: parsed.data.body,
    pinned: parsed.data.pinned,
    published: parsed.data.published,
    createdByPseudonymId: me,
  });
  const notice = await readNotice(c.env.DB, id);
  return c.json({ notice, modelVersion: MODEL_VERSION }, 201);
});

noticesAdminRoute.patch('/:id', authMiddleware, adminMiddleware, rateLimit(60), async (c) => {
  const id = c.req.param('id');
  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    return c.json({ error: { code: 'INVALID_JSON' } }, 400);
  }
  const parsed = UpdateNoticeRequest.safeParse(raw);
  if (!parsed.success) return c.json({ error: { code: 'INVALID_INPUT' } }, 400);

  const ok = await updateNotice(c.env.DB, id, parsed.data);
  if (!ok) return c.json({ error: { code: 'NOT_FOUND' } }, 404);
  const notice = await readNotice(c.env.DB, id);
  return c.json({ notice, modelVersion: MODEL_VERSION });
});

noticesAdminRoute.delete('/:id', authMiddleware, adminMiddleware, rateLimit(30), async (c) => {
  const id = c.req.param('id');
  const ok = await deleteNotice(c.env.DB, id);
  if (!ok) return c.json({ error: { code: 'NOT_FOUND' } }, 404);
  return c.json({ deleted: true, modelVersion: MODEL_VERSION });
});
