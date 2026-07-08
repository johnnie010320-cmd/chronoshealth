import { Hono } from 'hono';
import { authMiddleware, type AuthVariables } from '../../middleware/auth.js';
import { adminMiddleware } from '../../middleware/admin-auth.js';
import { rateLimit } from '../../middleware/rate-limit.js';
import {
  CreateCareAffiliateRequest,
  UpdateCareAffiliateRequest,
} from '../../schemas/care-affiliates.js';
import {
  deleteAffiliate,
  insertAffiliate,
  listAllAffiliates,
  readAffiliate,
  updateAffiliate,
} from '../../care/affiliates.js';
import { appendAudit } from '../../admin/audit.js';
import type { Bindings } from '../../bindings.js';

// 케어 제휴 카드 관리자 CRUD — migration 0037.
// 실제 제휴처 URL 이 확보되면 코드 배포 없이 여기서 입력 → /care 즉시 반영.

const MODEL_VERSION = 'care-affiliates-v0.1.0';

export const careAffiliatesAdminRoute = new Hono<{
  Bindings: Bindings;
  Variables: AuthVariables;
}>();

careAffiliatesAdminRoute.get(
  '/',
  authMiddleware,
  adminMiddleware,
  rateLimit(60),
  async (c) => {
    const affiliates = await listAllAffiliates(c.env.DB);
    return c.json({ affiliates, modelVersion: MODEL_VERSION });
  },
);

careAffiliatesAdminRoute.post(
  '/',
  authMiddleware,
  adminMiddleware,
  rateLimit(30),
  async (c) => {
    const me = c.get('userPseudonymId');
    let raw: unknown;
    try {
      raw = await c.req.json();
    } catch {
      return c.json({ error: { code: 'INVALID_JSON' } }, 400);
    }
    const parsed = CreateCareAffiliateRequest.safeParse(raw);
    if (!parsed.success) return c.json({ error: { code: 'INVALID_INPUT' } }, 400);

    if (await readAffiliate(c.env.DB, parsed.data.slug)) {
      return c.json({ error: { code: 'DUPLICATE_SLUG' } }, 409);
    }

    await insertAffiliate(c.env.DB, {
      ...parsed.data,
      updatedByPseudonymId: me,
    });
    const affiliate = await readAffiliate(c.env.DB, parsed.data.slug);
    await appendAudit(c.env.DB, {
      actorPseudonymId: me,
      action: 'care_affiliate.create',
      target: parsed.data.slug,
      detail: parsed.data.partner,
    });
    return c.json({ affiliate, modelVersion: MODEL_VERSION }, 201);
  },
);

careAffiliatesAdminRoute.patch(
  '/:slug',
  authMiddleware,
  adminMiddleware,
  rateLimit(60),
  async (c) => {
    const me = c.get('userPseudonymId');
    const slug = c.req.param('slug');
    let raw: unknown;
    try {
      raw = await c.req.json();
    } catch {
      return c.json({ error: { code: 'INVALID_JSON' } }, 400);
    }
    const parsed = UpdateCareAffiliateRequest.safeParse(raw);
    if (!parsed.success) return c.json({ error: { code: 'INVALID_INPUT' } }, 400);

    const ok = await updateAffiliate(c.env.DB, slug, parsed.data, me);
    if (!ok) return c.json({ error: { code: 'NOT_FOUND' } }, 404);

    const affiliate = await readAffiliate(c.env.DB, slug);
    await appendAudit(c.env.DB, {
      actorPseudonymId: me,
      action: 'care_affiliate.update',
      target: slug,
      detail: Object.keys(parsed.data).join(', '),
    });
    return c.json({ affiliate, modelVersion: MODEL_VERSION });
  },
);

careAffiliatesAdminRoute.delete(
  '/:slug',
  authMiddleware,
  adminMiddleware,
  rateLimit(30),
  async (c) => {
    const me = c.get('userPseudonymId');
    const slug = c.req.param('slug');
    const existing = await readAffiliate(c.env.DB, slug);
    const ok = await deleteAffiliate(c.env.DB, slug);
    if (!ok) return c.json({ error: { code: 'NOT_FOUND' } }, 404);
    await appendAudit(c.env.DB, {
      actorPseudonymId: me,
      action: 'care_affiliate.delete',
      target: slug,
      detail: existing?.partner ?? null,
    });
    return c.json({ deleted: true, modelVersion: MODEL_VERSION });
  },
);
