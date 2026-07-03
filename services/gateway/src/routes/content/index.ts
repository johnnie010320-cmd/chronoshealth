import { Hono } from 'hono';
import { z } from 'zod';
import { authMiddleware, type AuthVariables } from '../../middleware/auth.js';
import { adminMiddleware } from '../../middleware/admin-auth.js';
import { rateLimit } from '../../middleware/rate-limit.js';
import {
  listContentPages,
  readContentPage,
  upsertContentPage,
} from '../../content/storage.js';
import { appendAudit } from '../../admin/audit.js';
import type { Bindings } from '../../bindings.js';

const MODEL_VERSION = 'content-v0.1.0';

const Slug = z.enum(['terms', 'privacy', 'medical_disclaimer', 'operator_info']);
const Locale = z.enum(['ko', 'en', 'ja', 'es']);

const UpsertRequest = z
  .object({
    slug: Slug,
    locale: Locale.default('ko'),
    title: z.string().min(1).max(200),
    bodyMd: z.string().min(1).max(50_000),
    version: z.string().min(1).max(20),
  })
  .strict();

// 공개 — 회원가입 / 약관 보기 페이지에서 사용. 인증 불요.
export const contentPublicRoute = new Hono<{ Bindings: Bindings }>();

contentPublicRoute.get('/:slug', async (c) => {
  const parsed = Slug.safeParse(c.req.param('slug'));
  if (!parsed.success) {
    return c.json({ error: { code: 'INVALID_INPUT' } }, 400);
  }
  const locale = Locale.safeParse(c.req.query('locale') ?? 'ko');
  const page = await readContentPage(
    c.env.DB,
    parsed.data,
    locale.success ? locale.data : 'ko',
  );
  if (!page) {
    return c.json({ error: { code: 'NOT_FOUND' } }, 404);
  }
  return c.json({ page, modelVersion: MODEL_VERSION });
});

// 관리자 — Admin-2 콘텐츠 편집.
export const contentAdminRoute = new Hono<{
  Bindings: Bindings;
  Variables: AuthVariables;
}>();

contentAdminRoute.get(
  '/',
  authMiddleware,
  adminMiddleware,
  rateLimit(100),
  async (c) => {
    const pages = await listContentPages(c.env.DB);
    return c.json({ pages, modelVersion: MODEL_VERSION });
  },
);

contentAdminRoute.put(
  '/',
  authMiddleware,
  adminMiddleware,
  rateLimit(50),
  async (c) => {
    const pseudonymId = c.get('userPseudonymId');
    let raw: unknown;
    try {
      raw = await c.req.json();
    } catch {
      return c.json({ error: { code: 'INVALID_JSON' } }, 400);
    }
    const parsed = UpsertRequest.safeParse(raw);
    if (!parsed.success) {
      return c.json({ error: { code: 'INVALID_INPUT' } }, 400);
    }
    await upsertContentPage(c.env.DB, {
      slug: parsed.data.slug,
      locale: parsed.data.locale,
      title: parsed.data.title,
      bodyMd: parsed.data.bodyMd,
      version: parsed.data.version,
      updatedByPseudonymId: pseudonymId,
    });
    const page = await readContentPage(c.env.DB, parsed.data.slug, parsed.data.locale);
    await appendAudit(c.env.DB, {
      actorPseudonymId: pseudonymId,
      action: 'content.update',
      target: `${parsed.data.slug}/${parsed.data.locale}`,
      detail: `v${parsed.data.version}`,
    });
    return c.json({ page, modelVersion: MODEL_VERSION });
  },
);
