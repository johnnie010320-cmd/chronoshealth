import { Hono } from 'hono';
import { authMiddleware, type AuthVariables } from '../../middleware/auth.js';
import { adminMiddleware, isAdmin } from '../../middleware/admin-auth.js';
import { rateLimit } from '../../middleware/rate-limit.js';
import {
  listAdminBetaSignups,
  listAdminUsers,
  readAdminStats,
  readAdminUserDetail,
} from '../../admin/storage.js';
import {
  listAllCommunitiesAdmin,
  softDeleteCommunity,
} from '../../community/communities.js';
import type { Bindings } from '../../bindings.js';

const MODEL_VERSION = 'admin-v0.1.0';

export const adminRoute = new Hono<{
  Bindings: Bindings;
  Variables: AuthVariables;
}>();

// 관리자 권한 검증만 (실제 데이터 노출 없음) — 로그인 후 admin 여부 클라이언트 측 판단용.
adminRoute.get('/whoami', authMiddleware, rateLimit(200), async (c) => {
  const pseudonymId = c.get('userPseudonymId');
  const admin = await isAdmin(c.env, pseudonymId);
  return c.json({
    userPseudonymId: pseudonymId,
    isAdmin: admin,
    modelVersion: MODEL_VERSION,
  });
});

adminRoute.get(
  '/stats',
  authMiddleware,
  adminMiddleware,
  rateLimit(60),
  async (c) => {
    const stats = await readAdminStats(c.env.IDENTITY_DB, c.env.DB);
    return c.json({ stats, modelVersion: MODEL_VERSION });
  },
);

adminRoute.get(
  '/users',
  authMiddleware,
  adminMiddleware,
  rateLimit(200),
  async (c) => {
    const limit = clampInt(c.req.query('limit'), 50, 1, 200);
    const cursor = c.req.query('cursor') ?? null;
    const search = c.req.query('search') ?? null;
    const users = await listAdminUsers(c.env.IDENTITY_DB, c.env.DB, {
      limit,
      cursor,
      search,
    });
    return c.json({ users, modelVersion: MODEL_VERSION });
  },
);

adminRoute.get(
  '/users/:id',
  authMiddleware,
  adminMiddleware,
  rateLimit(100),
  async (c) => {
    const targetId = c.req.param('id');
    const unmask = c.req.query('unmask') === '1';
    const detail = await readAdminUserDetail(c.env.IDENTITY_DB, targetId, unmask);
    if (!detail) {
      return c.json({ error: { code: 'NOT_FOUND' } }, 404);
    }
    // unmask 호출은 향후 admin_audit_log 에 기록 (Admin-3 슬라이스에서 도입).
    return c.json({ detail, modelVersion: MODEL_VERSION });
  },
);

adminRoute.get(
  '/beta-signups',
  authMiddleware,
  adminMiddleware,
  rateLimit(60),
  async (c) => {
    const limit = clampInt(c.req.query('limit'), 50, 1, 200);
    const cursor = c.req.query('cursor') ?? null;
    const signups = await listAdminBetaSignups(c.env.DB, { limit, cursor });
    return c.json({ signups, modelVersion: MODEL_VERSION });
  },
);

adminRoute.get(
  '/communities',
  authMiddleware,
  adminMiddleware,
  rateLimit(60),
  async (c) => {
    const includeDeleted = c.req.query('includeDeleted') === '1';
    const communities = await listAllCommunitiesAdmin(c.env.DB, includeDeleted);
    return c.json({ communities, modelVersion: MODEL_VERSION });
  },
);

adminRoute.delete(
  '/communities/:id',
  authMiddleware,
  adminMiddleware,
  rateLimit(30),
  async (c) => {
    const id = c.req.param('id');
    if (id === '_lounge') {
      return c.json({ error: { code: 'LOUNGE_PROTECTED' } }, 400);
    }
    const ok = await softDeleteCommunity(c.env.DB, id);
    if (!ok) {
      return c.json({ error: { code: 'NOT_FOUND' } }, 404);
    }
    return c.json({ deleted: true, modelVersion: MODEL_VERSION });
  },
);

function clampInt(
  raw: string | undefined,
  fallback: number,
  min: number,
  max: number,
): number {
  if (!raw) return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(n)));
}
