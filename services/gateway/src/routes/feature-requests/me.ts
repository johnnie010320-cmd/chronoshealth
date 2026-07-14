import { Hono } from 'hono';
import { authMiddleware, type AuthVariables } from '../../middleware/auth.js';
import { rateLimit } from '../../middleware/rate-limit.js';
import {
  CreateFeatureRequest,
  UpdateFeatureRequest,
} from '../../schemas/feature-requests.js';
import {
  insertFeatureRequest,
  listMyFeatureRequests,
  readFeatureRequest,
  softDeleteMyFeatureRequest,
  updateMyFeatureRequest,
  type FeatureRequestKind,
} from '../../feature-requests/storage.js';
import type { Bindings } from '../../bindings.js';

const MODEL_VERSION = 'feature-requests-v0.1.0';

// 사용자 — 마이페이지 "기능 요청 및 버그 리포트". 본인 글만 CRUD.
export const featureRequestsMeRoute = new Hono<{
  Bindings: Bindings;
  Variables: AuthVariables;
}>();

featureRequestsMeRoute.get('/', authMiddleware, rateLimit(120), async (c) => {
  const pseudonymId = c.get('userPseudonymId');
  const items = await listMyFeatureRequests(c.env.DB, pseudonymId);
  return c.json({ items, modelVersion: MODEL_VERSION });
});

featureRequestsMeRoute.post('/', authMiddleware, rateLimit(30), async (c) => {
  const pseudonymId = c.get('userPseudonymId');
  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    return c.json({ error: { code: 'INVALID_JSON' } }, 400);
  }
  const parsed = CreateFeatureRequest.safeParse(raw);
  if (!parsed.success) return c.json({ error: { code: 'INVALID_INPUT' } }, 400);

  const id = crypto.randomUUID();
  await insertFeatureRequest(c.env.DB, {
    id,
    userPseudonymId: pseudonymId,
    kind: parsed.data.kind as FeatureRequestKind,
    title: parsed.data.title,
    body: parsed.data.body,
  });
  const item = await readFeatureRequest(c.env.DB, id);
  return c.json({ item, modelVersion: MODEL_VERSION }, 201);
});

featureRequestsMeRoute.patch('/:id', authMiddleware, rateLimit(60), async (c) => {
  const pseudonymId = c.get('userPseudonymId');
  const id = c.req.param('id');
  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    return c.json({ error: { code: 'INVALID_JSON' } }, 400);
  }
  const parsed = UpdateFeatureRequest.safeParse(raw);
  if (!parsed.success) return c.json({ error: { code: 'INVALID_INPUT' } }, 400);

  const ok = await updateMyFeatureRequest(c.env.DB, id, pseudonymId, {
    ...(parsed.data.kind !== undefined
      ? { kind: parsed.data.kind as FeatureRequestKind }
      : {}),
    ...(parsed.data.title !== undefined ? { title: parsed.data.title } : {}),
    ...(parsed.data.body !== undefined ? { body: parsed.data.body } : {}),
  });
  // 소유자가 아니거나 없는 글 → 404 (타인 글 존재 여부 노출 안 함).
  if (!ok) return c.json({ error: { code: 'NOT_FOUND' } }, 404);
  const item = await readFeatureRequest(c.env.DB, id);
  return c.json({ item, modelVersion: MODEL_VERSION });
});

featureRequestsMeRoute.delete('/:id', authMiddleware, rateLimit(60), async (c) => {
  const pseudonymId = c.get('userPseudonymId');
  const id = c.req.param('id');
  const ok = await softDeleteMyFeatureRequest(c.env.DB, id, pseudonymId);
  if (!ok) return c.json({ error: { code: 'NOT_FOUND' } }, 404);
  return c.json({ deleted: true, modelVersion: MODEL_VERSION });
});
