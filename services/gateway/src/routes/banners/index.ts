import { Hono } from 'hono';
import { authMiddleware, type AuthVariables } from '../../middleware/auth.js';
import { adminMiddleware } from '../../middleware/admin-auth.js';
import { rateLimit } from '../../middleware/rate-limit.js';
import {
  deleteBanner,
  insertBanner,
  listActiveBanners,
  listAllBanners,
  moveBanner,
  nextSortOrder,
  readBannerMedia,
  setBannerActive,
} from '../../banners/storage.js';
import { MAX_BANNER_BYTES, bannerKey, resolveBannerType } from '../../banners/files.js';
import { safeFileName } from '../../messaging/files.js';
import { appendAudit } from '../../admin/audit.js';
import type { Bindings } from '../../bindings.js';

const MODEL_VERSION = 'banners-v0.1.0';

// ── 공개 — 홈 히어로용. 로그인 불필요 ──────────────────────────────────────
export const bannersPublicRoute = new Hono<{ Bindings: Bindings }>();

bannersPublicRoute.get('/', rateLimit(600), async (c) => {
  const banners = await listActiveBanners(c.env.DB);
  // 클라이언트는 파일을 /api/v1/banners/:id/file 로 로드.
  return c.json({
    banners: banners.map((b) => ({ id: b.id, kind: b.kind, contentType: b.contentType, name: b.name })),
    modelVersion: MODEL_VERSION,
  });
});

// 배너 미디어 스트림(공개). 동영상 seek 을 위해 Range 지원.
bannersPublicRoute.get('/:id/file', rateLimit(600), async (c) => {
  const media = await readBannerMedia(c.env.DB, c.req.param('id'));
  if (!media) return c.json({ error: { code: 'NOT_FOUND' } }, 404);

  const rangeHeader = c.req.header('Range');
  if (rangeHeader) {
    const m = /bytes=(\d+)-(\d*)/.exec(rangeHeader);
    if (m) {
      const start = Number(m[1]);
      const end = m[2] ? Number(m[2]) : undefined;
      const obj = await c.env.ATTACHMENTS.get(media.r2Key, {
        range: end !== undefined ? { offset: start, length: end - start + 1 } : { offset: start },
      });
      if (!obj || !('body' in obj) || !obj.body) return c.json({ error: { code: 'NOT_FOUND' } }, 404);
      const total = obj.size;
      const startB = obj.range && 'offset' in obj.range ? obj.range.offset ?? start : start;
      const len =
        obj.range && 'length' in obj.range && obj.range.length !== undefined
          ? obj.range.length
          : total - startB;
      const endB = startB + len - 1;
      return new Response(obj.body, {
        status: 206,
        headers: {
          'Content-Type': media.contentType,
          'Content-Range': `bytes ${startB}-${endB}/${total}`,
          'Content-Length': String(len),
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }
  }

  const obj = await c.env.ATTACHMENTS.get(media.r2Key);
  if (!obj) return c.json({ error: { code: 'NOT_FOUND' } }, 404);
  return new Response(obj.body, {
    headers: {
      'Content-Type': media.contentType,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=3600',
    },
  });
});

// ── 관리자 — 배너 CRUD ─────────────────────────────────────────────────────
export const bannersAdminRoute = new Hono<{
  Bindings: Bindings;
  Variables: AuthVariables;
}>();

bannersAdminRoute.get('/', authMiddleware, adminMiddleware, rateLimit(120), async (c) => {
  const banners = await listAllBanners(c.env.DB);
  return c.json({ banners, modelVersion: MODEL_VERSION });
});

// 업로드(1건). 다중은 클라이언트가 파일별로 반복 호출.
bannersAdminRoute.post('/', authMiddleware, adminMiddleware, rateLimit(30), async (c) => {
  const me = c.get('userPseudonymId');
  const form = await c.req.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File)) return c.json({ error: { code: 'INVALID_INPUT' } }, 400);
  const resolved = resolveBannerType(file.name, file.type);
  if (!resolved) return c.json({ error: { code: 'UNSUPPORTED_FILE_TYPE' } }, 400);
  if (file.size <= 0 || file.size > MAX_BANNER_BYTES) {
    return c.json({ error: { code: 'FILE_TOO_LARGE' } }, 400);
  }

  const id = crypto.randomUUID();
  const key = bannerKey(id, resolved.contentType);
  try {
    await c.env.ATTACHMENTS.put(key, await file.arrayBuffer(), {
      httpMetadata: { contentType: resolved.contentType },
    });
  } catch (err) {
    console.error('R2 put banner failed', err);
    return c.json({ error: { code: 'UPLOAD_FAILED' } }, 502);
  }

  const sortOrder = await nextSortOrder(c.env.DB);
  await insertBanner(c.env.DB, {
    id,
    kind: resolved.kind,
    r2Key: key,
    contentType: resolved.contentType,
    name: safeFileName(file.name),
    sortOrder,
    createdByPseudonymId: me,
  });
  await appendAudit(c.env.DB, {
    actorPseudonymId: me,
    action: 'banner.create',
    target: id,
    detail: file.name,
  });
  const banners = await listAllBanners(c.env.DB);
  return c.json({ banners, modelVersion: MODEL_VERSION }, 201);
});

bannersAdminRoute.patch('/:id', authMiddleware, adminMiddleware, rateLimit(60), async (c) => {
  const id = c.req.param('id');
  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    return c.json({ error: { code: 'INVALID_JSON' } }, 400);
  }
  const body = raw as { active?: unknown };
  if (typeof body.active === 'boolean') {
    const ok = await setBannerActive(c.env.DB, id, body.active);
    if (!ok) return c.json({ error: { code: 'NOT_FOUND' } }, 404);
    await appendAudit(c.env.DB, {
      actorPseudonymId: c.get('userPseudonymId'),
      action: body.active ? 'banner.activate' : 'banner.deactivate',
      target: id,
    });
  }
  const banners = await listAllBanners(c.env.DB);
  return c.json({ banners, modelVersion: MODEL_VERSION });
});

bannersAdminRoute.post('/:id/move', authMiddleware, adminMiddleware, rateLimit(60), async (c) => {
  const id = c.req.param('id');
  const dir = c.req.query('dir') === 'down' ? 'down' : 'up';
  await moveBanner(c.env.DB, id, dir);
  const banners = await listAllBanners(c.env.DB);
  return c.json({ banners, modelVersion: MODEL_VERSION });
});

bannersAdminRoute.delete('/:id', authMiddleware, adminMiddleware, rateLimit(30), async (c) => {
  const id = c.req.param('id');
  const media = await readBannerMedia(c.env.DB, id);
  const ok = await deleteBanner(c.env.DB, id);
  if (!ok) return c.json({ error: { code: 'NOT_FOUND' } }, 404);
  if (media?.r2Key) await c.env.ATTACHMENTS.delete(media.r2Key).catch(() => {});
  await appendAudit(c.env.DB, {
    actorPseudonymId: c.get('userPseudonymId'),
    action: 'banner.delete',
    target: id,
  });
  const banners = await listAllBanners(c.env.DB);
  return c.json({ banners, deleted: true, modelVersion: MODEL_VERSION });
});
