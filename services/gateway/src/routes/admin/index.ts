import { Hono } from 'hono';
import { z } from 'zod';
import { authMiddleware, type AuthVariables } from '../../middleware/auth.js';
import {
  adminMiddleware,
  isAdmin,
  isSuperAdmin,
  superAdminMiddleware,
} from '../../middleware/admin-auth.js';
import { rateLimit } from '../../middleware/rate-limit.js';
import {
  listAdminBetaSignups,
  listAdminUsers,
  readAdminStats,
  readAdminUserDetail,
  readUserLedger,
  setUserRole,
} from '../../admin/storage.js';
import {
  listAllCommunitiesAdmin,
  softDeleteCommunity,
} from '../../community/communities.js';
import {
  deleteCategory,
  deleteFeaturedVideo,
  insertCategory,
  insertFeaturedVideo,
  updateCategory,
  updateFeaturedVideo,
} from '../../community/categories.js';
import {
  CreateCategoryRequest,
  CreateFeaturedVideoRequest,
  UpdateCategoryRequest,
  UpdateFeaturedVideoRequest,
} from '../../schemas/community.js';
import {
  deleteRelease,
  insertRelease,
  listReleases,
} from '../../releases/storage.js';
import { appendAudit, listAudit } from '../../admin/audit.js';
import { resolveNicknames } from '../../messaging/nickname.js';
import type { Bindings } from '../../bindings.js';

const SetRoleRequest = z.object({ role: z.enum(['user', 'admin']) }).strict();
const CreateReleaseRequest = z
  .object({
    component: z.string().trim().min(1).max(40),
    version: z.string().trim().min(1).max(60),
    notes: z.string().trim().min(1).max(4000),
  })
  .strict();

const MODEL_VERSION = 'admin-v0.1.0';

export const adminRoute = new Hono<{
  Bindings: Bindings;
  Variables: AuthVariables;
}>();

// 관리자 권한 검증만 (실제 데이터 노출 없음) — 로그인 후 admin 여부 클라이언트 측 판단용.
adminRoute.get('/whoami', authMiddleware, rateLimit(200), async (c) => {
  const pseudonymId = c.get('userPseudonymId');
  const admin = await isAdmin(c.env, pseudonymId);
  const superAdmin = admin ? await isSuperAdmin(c.env, pseudonymId) : false;
  return c.json({
    userPseudonymId: pseudonymId,
    isAdmin: admin,
    isSuperAdmin: superAdmin,
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

// 회원별 코인(CHRO) 적립/사용 내역 — 관리자.
adminRoute.get(
  '/users/:id/ledger',
  authMiddleware,
  adminMiddleware,
  rateLimit(120),
  async (c) => {
    const targetId = c.req.param('id');
    const entries = await readUserLedger(c.env.DB, targetId, 100);
    return c.json({ entries, modelVersion: MODEL_VERSION });
  },
);

// 관리자 임명/해제 — 슈퍼관리자 전용. (superadmin 행은 storage 에서 변경 거부.)
adminRoute.post(
  '/users/:id/role',
  authMiddleware,
  superAdminMiddleware,
  rateLimit(30),
  async (c) => {
    const targetId = c.req.param('id');
    let raw: unknown;
    try {
      raw = await c.req.json();
    } catch {
      return c.json({ error: { code: 'INVALID_JSON' } }, 400);
    }
    const parsed = SetRoleRequest.safeParse(raw);
    if (!parsed.success) return c.json({ error: { code: 'INVALID_INPUT' } }, 400);
    const ok = await setUserRole(c.env.IDENTITY_DB, targetId, parsed.data.role);
    if (!ok) {
      // 대상 없음 또는 superadmin(변경 불가).
      return c.json({ error: { code: 'ROLE_UNCHANGED' } }, 409);
    }
    await appendAudit(c.env.DB, {
      actorPseudonymId: c.get('userPseudonymId'),
      action: 'user.role',
      target: targetId,
      detail: parsed.data.role,
    });
    return c.json({ ok: true, role: parsed.data.role, modelVersion: MODEL_VERSION });
  },
);

// 개발 로그(releases) — 관리자 조회/추가/삭제.
adminRoute.get('/releases', authMiddleware, adminMiddleware, rateLimit(120), async (c) => {
  const releases = await listReleases(c.env.DB, 200);
  return c.json({ releases, modelVersion: MODEL_VERSION });
});

adminRoute.post('/releases', authMiddleware, adminMiddleware, rateLimit(60), async (c) => {
  const me = c.get('userPseudonymId');
  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    return c.json({ error: { code: 'INVALID_JSON' } }, 400);
  }
  const parsed = CreateReleaseRequest.safeParse(raw);
  if (!parsed.success) return c.json({ error: { code: 'INVALID_INPUT' } }, 400);
  const id = crypto.randomUUID();
  await insertRelease(c.env.DB, {
    id,
    component: parsed.data.component,
    version: parsed.data.version,
    notes: parsed.data.notes,
    createdByPseudonymId: me,
  });
  await appendAudit(c.env.DB, {
    actorPseudonymId: me,
    action: 'release.create',
    target: id,
    detail: `${parsed.data.component} ${parsed.data.version}`,
  });
  return c.json({ id, modelVersion: MODEL_VERSION }, 201);
});

adminRoute.delete('/releases/:id', authMiddleware, adminMiddleware, rateLimit(30), async (c) => {
  const rid = c.req.param('id');
  const ok = await deleteRelease(c.env.DB, rid);
  if (!ok) return c.json({ error: { code: 'NOT_FOUND' } }, 404);
  await appendAudit(c.env.DB, {
    actorPseudonymId: c.get('userPseudonymId'),
    action: 'release.delete',
    target: rid,
  });
  return c.json({ deleted: true, modelVersion: MODEL_VERSION });
});

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
    await appendAudit(c.env.DB, {
      actorPseudonymId: c.get('userPseudonymId'),
      action: 'community.delete',
      target: id,
    });
    return c.json({ deleted: true, modelVersion: MODEL_VERSION });
  },
);

// ── 커뮤니티 하위 카테고리 관리(관리자 전용) ───────────────────────────────
adminRoute.post('/community-categories', authMiddleware, adminMiddleware, rateLimit(30), async (c) => {
  const raw = await c.req.json().catch(() => null);
  const parsed = CreateCategoryRequest.safeParse(raw);
  if (!parsed.success) return c.json({ error: { code: 'INVALID_INPUT' } }, 400);
  const id = `cat_${crypto.randomUUID().slice(0, 12)}`;
  await insertCategory(c.env.DB, {
    id,
    groupKey: parsed.data.groupKey,
    name: parsed.data.name,
    sortOrder: parsed.data.sortOrder,
  });
  await appendAudit(c.env.DB, {
    actorPseudonymId: c.get('userPseudonymId'),
    action: 'community.category.create',
    target: id,
    detail: `${parsed.data.groupKey}/${parsed.data.name}`,
  });
  return c.json({ id, modelVersion: MODEL_VERSION }, 201);
});

adminRoute.patch('/community-categories/:id', authMiddleware, adminMiddleware, rateLimit(60), async (c) => {
  const id = c.req.param('id');
  const raw = await c.req.json().catch(() => null);
  const parsed = UpdateCategoryRequest.safeParse(raw);
  if (!parsed.success) return c.json({ error: { code: 'INVALID_INPUT' } }, 400);
  const ok = await updateCategory(c.env.DB, id, parsed.data);
  if (!ok) return c.json({ error: { code: 'NOT_FOUND' } }, 404);
  await appendAudit(c.env.DB, {
    actorPseudonymId: c.get('userPseudonymId'),
    action: 'community.category.update',
    target: id,
    detail: Object.keys(parsed.data).join(', '),
  });
  return c.json({ ok: true, modelVersion: MODEL_VERSION });
});

adminRoute.delete('/community-categories/:id', authMiddleware, adminMiddleware, rateLimit(30), async (c) => {
  const id = c.req.param('id');
  const ok = await deleteCategory(c.env.DB, id);
  if (!ok) return c.json({ error: { code: 'NOT_FOUND' } }, 404);
  await appendAudit(c.env.DB, {
    actorPseudonymId: c.get('userPseudonymId'),
    action: 'community.category.delete',
    target: id,
  });
  return c.json({ deleted: true, modelVersion: MODEL_VERSION });
});

// ── 커뮤니티 큐레이션 동영상 관리(관리자 전용) ─────────────────────────────
adminRoute.post('/community-videos', authMiddleware, adminMiddleware, rateLimit(30), async (c) => {
  const raw = await c.req.json().catch(() => null);
  const parsed = CreateFeaturedVideoRequest.safeParse(raw);
  if (!parsed.success) return c.json({ error: { code: 'INVALID_INPUT' } }, 400);
  const id = `vid_${crypto.randomUUID().slice(0, 12)}`;
  await insertFeaturedVideo(c.env.DB, {
    id,
    groupKey: parsed.data.groupKey,
    categoryId: parsed.data.categoryId,
    title: parsed.data.title,
    videoUrl: parsed.data.videoUrl,
    sortOrder: parsed.data.sortOrder,
    createdByPseudonymId: c.get('userPseudonymId'),
  });
  await appendAudit(c.env.DB, {
    actorPseudonymId: c.get('userPseudonymId'),
    action: 'community.video.create',
    target: id,
    detail: parsed.data.title,
  });
  return c.json({ id, modelVersion: MODEL_VERSION }, 201);
});

adminRoute.patch('/community-videos/:id', authMiddleware, adminMiddleware, rateLimit(60), async (c) => {
  const id = c.req.param('id');
  const raw = await c.req.json().catch(() => null);
  const parsed = UpdateFeaturedVideoRequest.safeParse(raw);
  if (!parsed.success) return c.json({ error: { code: 'INVALID_INPUT' } }, 400);
  const ok = await updateFeaturedVideo(c.env.DB, id, parsed.data);
  if (!ok) return c.json({ error: { code: 'NOT_FOUND' } }, 404);
  await appendAudit(c.env.DB, {
    actorPseudonymId: c.get('userPseudonymId'),
    action: 'community.video.update',
    target: id,
    detail: Object.keys(parsed.data).join(', '),
  });
  return c.json({ ok: true, modelVersion: MODEL_VERSION });
});

adminRoute.delete('/community-videos/:id', authMiddleware, adminMiddleware, rateLimit(30), async (c) => {
  const id = c.req.param('id');
  const ok = await deleteFeaturedVideo(c.env.DB, id);
  if (!ok) return c.json({ error: { code: 'NOT_FOUND' } }, 404);
  await appendAudit(c.env.DB, {
    actorPseudonymId: c.get('userPseudonymId'),
    action: 'community.video.delete',
    target: id,
  });
  return c.json({ deleted: true, modelVersion: MODEL_VERSION });
});

// 관리자 감사 로그 조회 — 최신순, 변경자 닉네임 해석.
adminRoute.get('/audit-log', authMiddleware, adminMiddleware, rateLimit(60), async (c) => {
  const limit = clampInt(c.req.query('limit'), 100, 1, 200);
  const before = c.req.query('before') ?? null;
  const entries = await listAudit(c.env.DB, { limit, before });
  const nicks = await resolveNicknames(
    c.env.IDENTITY_DB,
    entries.map((e) => e.actorPseudonymId),
  );
  const rows = entries.map((e) => ({
    id: e.id,
    actorNickname: nicks.get(e.actorPseudonymId) ?? null,
    action: e.action,
    target: e.target,
    detail: e.detail,
    createdAt: e.createdAt,
  }));
  return c.json({ entries: rows, hasMore: entries.length === limit, modelVersion: MODEL_VERSION });
});

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
