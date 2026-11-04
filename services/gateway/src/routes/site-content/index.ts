import { Hono } from 'hono';
import { z } from 'zod';
import { authMiddleware, type AuthVariables } from '../../middleware/auth.js';
import { adminMiddleware } from '../../middleware/admin-auth.js';
import { rateLimit } from '../../middleware/rate-limit.js';
import { listSiteContent, upsertSiteContent } from '../../site-content/storage.js';
import { appendAudit } from '../../admin/audit.js';
import type { Bindings } from '../../bindings.js';

const MODEL_VERSION = 'site-content-v0.1.0';

const UpsertRequest = z
  .object({
    key: z
      .string()
      .min(1)
      .max(80)
      .regex(/^[a-z0-9_]+$/, 'key must be snake_case'),
    value: z.string().max(20_000),
  })
  .strict();

// ── 공개 — 회사 사이트가 카피 블록을 한 번에 로드 ──────────────────────────
export const siteContentPublicRoute = new Hono<{ Bindings: Bindings }>();

siteContentPublicRoute.get('/', rateLimit(600), async (c) => {
  const rows = await listSiteContent(c.env.DB);
  const content: Record<string, string> = {};
  for (const r of rows) content[r.key] = r.value;
  return c.json({ content, modelVersion: MODEL_VERSION });
});

// ── 관리자 — 편집 ──────────────────────────────────────────────────────────
export const siteContentAdminRoute = new Hono<{
  Bindings: Bindings;
  Variables: AuthVariables;
}>();

siteContentAdminRoute.get('/', authMiddleware, adminMiddleware, rateLimit(120), async (c) => {
  const items = await listSiteContent(c.env.DB);
  return c.json({ items, modelVersion: MODEL_VERSION });
});

siteContentAdminRoute.put('/', authMiddleware, adminMiddleware, rateLimit(120), async (c) => {
  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    return c.json({ error: { code: 'INVALID_JSON' } }, 400);
  }
  const parsed = UpsertRequest.safeParse(raw);
  if (!parsed.success) return c.json({ error: { code: 'INVALID_INPUT' } }, 400);

  await upsertSiteContent(c.env.DB, parsed.data.key, parsed.data.value, c.get('userPseudonymId'));
  await appendAudit(c.env.DB, {
    actorPseudonymId: c.get('userPseudonymId'),
    action: 'site_content.update',
    target: parsed.data.key,
  });
  const items = await listSiteContent(c.env.DB);
  return c.json({ items, modelVersion: MODEL_VERSION });
});
