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
  readFeatureRequestMedia,
  setBodyFile,
  setBodyImage,
  setFeatureFile,
  setFeatureImage,
  softDeleteMyFeatureRequest,
  updateMyFeatureRequest,
  type FeatureRequestKind,
} from '../../feature-requests/storage.js';
import {
  MAX_FEATURE_BYTES,
  featureBodyFileKey,
  featureBodyImageKey,
  featureFileKey,
  featureImageKey,
  isPdf,
  resolveFeatureImageType,
} from '../../feature-requests/files.js';
import {
  streamFeatureImage,
  streamFeatureFile,
  streamFeatureBodyImage,
  streamFeatureBodyFile,
} from './stream.js';
import { safeFileName } from '../../messaging/files.js';
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
    linkUrl: parsed.data.linkUrl,
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
    ...(parsed.data.linkUrl !== undefined ? { linkUrl: parsed.data.linkUrl } : {}),
  });
  // 소유자가 아니거나 없는 글 → 404 (타인 글 존재 여부 노출 안 함).
  if (!ok) return c.json({ error: { code: 'NOT_FOUND' } }, 404);
  const item = await readFeatureRequest(c.env.DB, id);
  return c.json({ item, modelVersion: MODEL_VERSION });
});

featureRequestsMeRoute.delete('/:id', authMiddleware, rateLimit(60), async (c) => {
  const pseudonymId = c.get('userPseudonymId');
  const id = c.req.param('id');
  // 삭제 전 R2 첨부 정리(있으면).
  const media = await readFeatureRequestMedia(c.env.DB, id);
  const ok = await softDeleteMyFeatureRequest(c.env.DB, id, pseudonymId);
  if (!ok) return c.json({ error: { code: 'NOT_FOUND' } }, 404);
  // 본문 미디어 + 추가 첨부 R2 정리(있으면).
  for (const key of [
    media?.bodyImageKey,
    media?.bodyFileKey,
    media?.imageKey,
    media?.fileKey,
  ]) {
    if (key) await c.env.ATTACHMENTS.delete(key).catch(() => {});
  }
  return c.json({ deleted: true, modelVersion: MODEL_VERSION });
});

// ── 첨부: 이미지(png/jpg/webp, 인라인) · 파일(pdf) — 본인 글에만 ────────────
// 소유자 확인 후 R2 업로드/삭제/스트림. 스트림 캐시는 private.

// 본인 글인지 확인하고 media 를 반환. 아니면 null.
async function ownedMedia(env: Bindings, id: string, pseudonymId: string) {
  const media = await readFeatureRequestMedia(env.DB, id);
  if (!media) return null;
  if (media.ownerPseudonymId !== pseudonymId) return null;
  return media;
}

featureRequestsMeRoute.post('/:id/image', authMiddleware, rateLimit(30), async (c) => {
  const id = c.req.param('id');
  if (!(await ownedMedia(c.env, id, c.get('userPseudonymId'))))
    return c.json({ error: { code: 'NOT_FOUND' } }, 404);
  const form = await c.req.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File)) return c.json({ error: { code: 'INVALID_INPUT' } }, 400);
  const type = resolveFeatureImageType(file.name, file.type);
  if (!type) return c.json({ error: { code: 'UNSUPPORTED_FILE_TYPE' } }, 400);
  if (file.size <= 0 || file.size > MAX_FEATURE_BYTES) {
    return c.json({ error: { code: 'FILE_TOO_LARGE' } }, 400);
  }
  const key = featureImageKey(id, type);
  try {
    await c.env.ATTACHMENTS.put(key, await file.arrayBuffer(), {
      httpMetadata: { contentType: type },
    });
  } catch (err) {
    console.error('R2 put feature image failed', err);
    return c.json({ error: { code: 'UPLOAD_FAILED' } }, 502);
  }
  await setFeatureImage(c.env.DB, id, key, type);
  const item = await readFeatureRequest(c.env.DB, id);
  return c.json({ item, modelVersion: MODEL_VERSION });
});

featureRequestsMeRoute.delete('/:id/image', authMiddleware, rateLimit(30), async (c) => {
  const id = c.req.param('id');
  const media = await ownedMedia(c.env, id, c.get('userPseudonymId'));
  if (!media) return c.json({ error: { code: 'NOT_FOUND' } }, 404);
  if (media.imageKey) await c.env.ATTACHMENTS.delete(media.imageKey).catch(() => {});
  await setFeatureImage(c.env.DB, id, null, null);
  const item = await readFeatureRequest(c.env.DB, id);
  return c.json({ item, modelVersion: MODEL_VERSION });
});

featureRequestsMeRoute.get('/:id/image', authMiddleware, rateLimit(200), async (c) => {
  const media = await ownedMedia(c.env, c.req.param('id'), c.get('userPseudonymId'));
  if (!media) return c.json({ error: { code: 'NOT_FOUND' } }, 404);
  return streamFeatureImage(c.env, media);
});

featureRequestsMeRoute.post('/:id/file', authMiddleware, rateLimit(30), async (c) => {
  const id = c.req.param('id');
  if (!(await ownedMedia(c.env, id, c.get('userPseudonymId'))))
    return c.json({ error: { code: 'NOT_FOUND' } }, 404);
  const form = await c.req.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File)) return c.json({ error: { code: 'INVALID_INPUT' } }, 400);
  if (!isPdf(file.name, file.type)) return c.json({ error: { code: 'UNSUPPORTED_FILE_TYPE' } }, 400);
  if (file.size <= 0 || file.size > MAX_FEATURE_BYTES) {
    return c.json({ error: { code: 'FILE_TOO_LARGE' } }, 400);
  }
  const key = featureFileKey(id);
  try {
    await c.env.ATTACHMENTS.put(key, await file.arrayBuffer(), {
      httpMetadata: { contentType: 'application/pdf' },
    });
  } catch (err) {
    console.error('R2 put feature file failed', err);
    return c.json({ error: { code: 'UPLOAD_FAILED' } }, 502);
  }
  await setFeatureFile(c.env.DB, id, key, safeFileName(file.name));
  const item = await readFeatureRequest(c.env.DB, id);
  return c.json({ item, modelVersion: MODEL_VERSION });
});

featureRequestsMeRoute.delete('/:id/file', authMiddleware, rateLimit(30), async (c) => {
  const id = c.req.param('id');
  const media = await ownedMedia(c.env, id, c.get('userPseudonymId'));
  if (!media) return c.json({ error: { code: 'NOT_FOUND' } }, 404);
  if (media.fileKey) await c.env.ATTACHMENTS.delete(media.fileKey).catch(() => {});
  await setFeatureFile(c.env.DB, id, null, null);
  const item = await readFeatureRequest(c.env.DB, id);
  return c.json({ item, modelVersion: MODEL_VERSION });
});

featureRequestsMeRoute.get('/:id/file', authMiddleware, rateLimit(200), async (c) => {
  const media = await ownedMedia(c.env, c.req.param('id'), c.get('userPseudonymId'));
  if (!media) return c.json({ error: { code: 'NOT_FOUND' } }, 404);
  return streamFeatureFile(c.env, media);
});

// ── 본문 미디어: 본문 자체를 이미지/PDF로 채우기(이미지 XOR PDF) — 본인 글에만 ──────
// 추가 첨부(image/file)와 별개 슬롯. 한쪽 업로드 시 반대쪽 본문 미디어는 정리.

featureRequestsMeRoute.post('/:id/body-image', authMiddleware, rateLimit(30), async (c) => {
  const id = c.req.param('id');
  const media = await ownedMedia(c.env, id, c.get('userPseudonymId'));
  if (!media) return c.json({ error: { code: 'NOT_FOUND' } }, 404);
  const form = await c.req.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File)) return c.json({ error: { code: 'INVALID_INPUT' } }, 400);
  const type = resolveFeatureImageType(file.name, file.type);
  if (!type) return c.json({ error: { code: 'UNSUPPORTED_FILE_TYPE' } }, 400);
  if (file.size <= 0 || file.size > MAX_FEATURE_BYTES) {
    return c.json({ error: { code: 'FILE_TOO_LARGE' } }, 400);
  }
  const key = featureBodyImageKey(id, type);
  try {
    await c.env.ATTACHMENTS.put(key, await file.arrayBuffer(), {
      httpMetadata: { contentType: type },
    });
  } catch (err) {
    console.error('R2 put feature body image failed', err);
    return c.json({ error: { code: 'UPLOAD_FAILED' } }, 502);
  }
  await setBodyImage(c.env.DB, id, key, type);
  // 교체된 이전 본문 미디어 정리(반대쪽 PDF, 확장자 바뀐 이전 이미지).
  if (media.bodyFileKey) await c.env.ATTACHMENTS.delete(media.bodyFileKey).catch(() => {});
  if (media.bodyImageKey && media.bodyImageKey !== key)
    await c.env.ATTACHMENTS.delete(media.bodyImageKey).catch(() => {});
  const item = await readFeatureRequest(c.env.DB, id);
  return c.json({ item, modelVersion: MODEL_VERSION });
});

featureRequestsMeRoute.delete('/:id/body-image', authMiddleware, rateLimit(30), async (c) => {
  const id = c.req.param('id');
  const media = await ownedMedia(c.env, id, c.get('userPseudonymId'));
  if (!media) return c.json({ error: { code: 'NOT_FOUND' } }, 404);
  if (media.bodyImageKey) await c.env.ATTACHMENTS.delete(media.bodyImageKey).catch(() => {});
  await setBodyImage(c.env.DB, id, null, null);
  const item = await readFeatureRequest(c.env.DB, id);
  return c.json({ item, modelVersion: MODEL_VERSION });
});

featureRequestsMeRoute.get('/:id/body-image', authMiddleware, rateLimit(200), async (c) => {
  const media = await ownedMedia(c.env, c.req.param('id'), c.get('userPseudonymId'));
  if (!media) return c.json({ error: { code: 'NOT_FOUND' } }, 404);
  return streamFeatureBodyImage(c.env, media);
});

featureRequestsMeRoute.post('/:id/body-file', authMiddleware, rateLimit(30), async (c) => {
  const id = c.req.param('id');
  const media = await ownedMedia(c.env, id, c.get('userPseudonymId'));
  if (!media) return c.json({ error: { code: 'NOT_FOUND' } }, 404);
  const form = await c.req.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File)) return c.json({ error: { code: 'INVALID_INPUT' } }, 400);
  if (!isPdf(file.name, file.type)) return c.json({ error: { code: 'UNSUPPORTED_FILE_TYPE' } }, 400);
  if (file.size <= 0 || file.size > MAX_FEATURE_BYTES) {
    return c.json({ error: { code: 'FILE_TOO_LARGE' } }, 400);
  }
  const key = featureBodyFileKey(id);
  try {
    await c.env.ATTACHMENTS.put(key, await file.arrayBuffer(), {
      httpMetadata: { contentType: 'application/pdf' },
    });
  } catch (err) {
    console.error('R2 put feature body file failed', err);
    return c.json({ error: { code: 'UPLOAD_FAILED' } }, 502);
  }
  await setBodyFile(c.env.DB, id, key, safeFileName(file.name));
  // 교체된 이전 본문 이미지 정리.
  if (media.bodyImageKey) await c.env.ATTACHMENTS.delete(media.bodyImageKey).catch(() => {});
  const item = await readFeatureRequest(c.env.DB, id);
  return c.json({ item, modelVersion: MODEL_VERSION });
});

featureRequestsMeRoute.delete('/:id/body-file', authMiddleware, rateLimit(30), async (c) => {
  const id = c.req.param('id');
  const media = await ownedMedia(c.env, id, c.get('userPseudonymId'));
  if (!media) return c.json({ error: { code: 'NOT_FOUND' } }, 404);
  if (media.bodyFileKey) await c.env.ATTACHMENTS.delete(media.bodyFileKey).catch(() => {});
  await setBodyFile(c.env.DB, id, null, null);
  const item = await readFeatureRequest(c.env.DB, id);
  return c.json({ item, modelVersion: MODEL_VERSION });
});

featureRequestsMeRoute.get('/:id/body-file', authMiddleware, rateLimit(200), async (c) => {
  const media = await ownedMedia(c.env, c.req.param('id'), c.get('userPseudonymId'));
  if (!media) return c.json({ error: { code: 'NOT_FOUND' } }, 404);
  return streamFeatureBodyFile(c.env, media);
});
