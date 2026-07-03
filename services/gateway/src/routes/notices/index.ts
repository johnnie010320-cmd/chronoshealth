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
  readNoticeMedia,
  setNoticeFile,
  setNoticeImage,
  updateNotice,
} from '../../notices/storage.js';
import {
  MAX_NOTICE_BYTES,
  isPdf,
  noticeFileKey,
  noticeImageKey,
  resolveNoticeImageType,
} from '../../notices/files.js';
import { safeFileName } from '../../messaging/files.js';
import type { Bindings } from '../../bindings.js';

const MODEL_VERSION = 'notices-v0.1.0';

// 공개 — 로그인 불필요(랜딩 포함 노출). published 만.
export const noticesPublicRoute = new Hono<{ Bindings: Bindings }>();

noticesPublicRoute.get('/', rateLimit(300), async (c) => {
  const notices = await listPublishedNotices(c.env.DB, 50);
  return c.json({ notices, modelVersion: MODEL_VERSION });
});

// 공개 첨부 스트림 — 공지는 공개라 인증 불필요.
noticesPublicRoute.get('/:id/image', rateLimit(300), async (c) => {
  const media = await readNoticeMedia(c.env.DB, c.req.param('id'));
  if (!media?.imageKey) return c.json({ error: { code: 'NOT_FOUND' } }, 404);
  const obj = await c.env.ATTACHMENTS.get(media.imageKey);
  if (!obj) return c.json({ error: { code: 'NOT_FOUND' } }, 404);
  return new Response(obj.body, {
    headers: {
      'Content-Type': media.imageType ?? 'application/octet-stream',
      'Cache-Control': 'public, max-age=3600',
    },
  });
});

noticesPublicRoute.get('/:id/file', rateLimit(300), async (c) => {
  const media = await readNoticeMedia(c.env.DB, c.req.param('id'));
  if (!media?.fileKey) return c.json({ error: { code: 'NOT_FOUND' } }, 404);
  const obj = await c.env.ATTACHMENTS.get(media.fileKey);
  if (!obj) return c.json({ error: { code: 'NOT_FOUND' } }, 404);
  const name = safeFileName(media.fileName ?? 'notice.pdf');
  return new Response(obj.body, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${name}"`,
      'Cache-Control': 'public, max-age=3600',
    },
  });
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
    linkUrl: parsed.data.linkUrl,
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
  // 첨부(R2) 정리 후 행 삭제.
  const media = await readNoticeMedia(c.env.DB, id);
  const ok = await deleteNotice(c.env.DB, id);
  if (!ok) return c.json({ error: { code: 'NOT_FOUND' } }, 404);
  if (media?.imageKey) await c.env.ATTACHMENTS.delete(media.imageKey).catch(() => {});
  if (media?.fileKey) await c.env.ATTACHMENTS.delete(media.fileKey).catch(() => {});
  return c.json({ deleted: true, modelVersion: MODEL_VERSION });
});

// ── 첨부 업로드/삭제 (관리자) ──────────────────────────────────────────────
noticesAdminRoute.post('/:id/image', authMiddleware, adminMiddleware, rateLimit(30), async (c) => {
  const id = c.req.param('id');
  if (!(await readNotice(c.env.DB, id))) return c.json({ error: { code: 'NOT_FOUND' } }, 404);
  const form = await c.req.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File)) return c.json({ error: { code: 'INVALID_INPUT' } }, 400);
  const type = resolveNoticeImageType(file.name, file.type);
  if (!type) return c.json({ error: { code: 'UNSUPPORTED_FILE_TYPE' } }, 400);
  if (file.size <= 0 || file.size > MAX_NOTICE_BYTES) {
    return c.json({ error: { code: 'FILE_TOO_LARGE' } }, 400);
  }
  const key = noticeImageKey(id, type);
  try {
    await c.env.ATTACHMENTS.put(key, await file.arrayBuffer(), {
      httpMetadata: { contentType: type },
    });
  } catch (err) {
    console.error('R2 put notice image failed', err);
    return c.json({ error: { code: 'UPLOAD_FAILED' } }, 502);
  }
  await setNoticeImage(c.env.DB, id, key, type);
  const notice = await readNotice(c.env.DB, id);
  return c.json({ notice, modelVersion: MODEL_VERSION });
});

noticesAdminRoute.delete('/:id/image', authMiddleware, adminMiddleware, rateLimit(30), async (c) => {
  const id = c.req.param('id');
  const media = await readNoticeMedia(c.env.DB, id);
  if (!media) return c.json({ error: { code: 'NOT_FOUND' } }, 404);
  if (media.imageKey) await c.env.ATTACHMENTS.delete(media.imageKey).catch(() => {});
  await setNoticeImage(c.env.DB, id, null, null);
  const notice = await readNotice(c.env.DB, id);
  return c.json({ notice, modelVersion: MODEL_VERSION });
});

noticesAdminRoute.post('/:id/file', authMiddleware, adminMiddleware, rateLimit(30), async (c) => {
  const id = c.req.param('id');
  if (!(await readNotice(c.env.DB, id))) return c.json({ error: { code: 'NOT_FOUND' } }, 404);
  const form = await c.req.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File)) return c.json({ error: { code: 'INVALID_INPUT' } }, 400);
  if (!isPdf(file.name, file.type)) return c.json({ error: { code: 'UNSUPPORTED_FILE_TYPE' } }, 400);
  if (file.size <= 0 || file.size > MAX_NOTICE_BYTES) {
    return c.json({ error: { code: 'FILE_TOO_LARGE' } }, 400);
  }
  const key = noticeFileKey(id);
  try {
    await c.env.ATTACHMENTS.put(key, await file.arrayBuffer(), {
      httpMetadata: { contentType: 'application/pdf' },
    });
  } catch (err) {
    console.error('R2 put notice file failed', err);
    return c.json({ error: { code: 'UPLOAD_FAILED' } }, 502);
  }
  await setNoticeFile(c.env.DB, id, key, safeFileName(file.name));
  const notice = await readNotice(c.env.DB, id);
  return c.json({ notice, modelVersion: MODEL_VERSION });
});

noticesAdminRoute.delete('/:id/file', authMiddleware, adminMiddleware, rateLimit(30), async (c) => {
  const id = c.req.param('id');
  const media = await readNoticeMedia(c.env.DB, id);
  if (!media) return c.json({ error: { code: 'NOT_FOUND' } }, 404);
  if (media.fileKey) await c.env.ATTACHMENTS.delete(media.fileKey).catch(() => {});
  await setNoticeFile(c.env.DB, id, null, null);
  const notice = await readNotice(c.env.DB, id);
  return c.json({ notice, modelVersion: MODEL_VERSION });
});
