// 신고·차단 (2026-11-08 죠니 — Google Play 사용자 제작 콘텐츠 정책).
//  회원: POST /api/v1/safety/reports · GET/POST /api/v1/safety/blocks · DELETE /api/v1/safety/blocks/:pseudonymId
//  관리자: GET /api/v1/admin/reports · POST /api/v1/admin/reports/:id { action: 'remove' | 'dismiss' }
import { Hono } from 'hono';
import { z } from 'zod';
import { authMiddleware, type AuthVariables } from '../../middleware/auth.js';
import { adminMiddleware } from '../../middleware/admin-auth.js';
import { rateLimit } from '../../middleware/rate-limit.js';
import { appendAudit } from '../../admin/audit.js';
import { resolveNicknames } from '../../messaging/nickname.js';
import {
  addBlock,
  countOpenReports,
  insertReport,
  listMyBlocks,
  listReports,
  readReport,
  readTargetOwner,
  removeBlock,
  removeTarget,
  REPORT_REASONS,
  REPORT_TARGETS,
  resolveReportsForTarget,
} from '../../safety/store.js';
import type { Bindings } from '../../bindings.js';

const ReportRequest = z.object({
  targetType: z.enum(REPORT_TARGETS),
  targetId: z.string().min(1).max(100),
  reason: z.enum(REPORT_REASONS),
  detail: z.string().trim().max(1000).optional(),
  alsoBlock: z.boolean().optional(),
});
const BlockRequest = z.object({
  targetType: z.enum(REPORT_TARGETS),
  targetId: z.string().min(1).max(100),
});
const ResolveRequest = z.object({ action: z.enum(['remove', 'dismiss']) });

async function json(c: { req: { json: () => Promise<unknown> } }): Promise<unknown> {
  try {
    return await c.req.json();
  } catch {
    return null;
  }
}

export const safetyRoute = new Hono<{ Bindings: Bindings; Variables: AuthVariables }>();

// 신고 — 대상 작성자는 서버가 찾는다. 원하면 같이 차단.
safetyRoute.post('/reports', authMiddleware, rateLimit(30), async (c) => {
  const me = c.get('userPseudonymId');
  const parsed = ReportRequest.safeParse(await json(c));
  if (!parsed.success) return c.json({ error: { code: 'INVALID_INPUT' } }, 400);
  const { targetType, targetId, reason, detail, alsoBlock } = parsed.data;
  const target = await readTargetOwner(c.env.DB, targetType, targetId, me);
  if (!target) return c.json({ error: { code: 'NOT_FOUND' } }, 404);
  if (target.owner === me) return c.json({ error: { code: 'CANNOT_REPORT_SELF' } }, 400);
  await insertReport(c.env.DB, { reporter: me, type: targetType, targetId, owner: target.owner, reason, detail: detail || null });
  if (alsoBlock) await addBlock(c.env.DB, me, target.owner);
  return c.json({ ok: true, blocked: alsoBlock === true });
});

// 내가 차단한 사람 목록 (닉네임 = 공개 핸들)
safetyRoute.get('/blocks', authMiddleware, rateLimit(120), async (c) => {
  const me = c.get('userPseudonymId');
  const rows = await listMyBlocks(c.env.DB, me);
  const nicks = await resolveNicknames(c.env.IDENTITY_DB, rows.map((r) => r.pseudonymId));
  return c.json({
    blocks: rows.map((r) => ({ pseudonymId: r.pseudonymId, nickname: nicks.get(r.pseudonymId) ?? null, createdAt: r.createdAt })),
  });
});

// 차단 — 글·댓글·메시지의 작성자를 차단
safetyRoute.post('/blocks', authMiddleware, rateLimit(60), async (c) => {
  const me = c.get('userPseudonymId');
  const parsed = BlockRequest.safeParse(await json(c));
  if (!parsed.success) return c.json({ error: { code: 'INVALID_INPUT' } }, 400);
  const target = await readTargetOwner(c.env.DB, parsed.data.targetType, parsed.data.targetId, me);
  if (!target) return c.json({ error: { code: 'NOT_FOUND' } }, 404);
  if (target.owner === me) return c.json({ error: { code: 'CANNOT_BLOCK_SELF' } }, 400);
  await addBlock(c.env.DB, me, target.owner);
  return c.json({ ok: true });
});

// 차단 풀기
safetyRoute.delete('/blocks/:pseudonymId', authMiddleware, rateLimit(60), async (c) => {
  const me = c.get('userPseudonymId');
  const removed = await removeBlock(c.env.DB, me, c.req.param('pseudonymId'));
  return c.json({ ok: true, removed });
});

export const safetyAdminRoute = new Hono<{ Bindings: Bindings; Variables: AuthVariables }>();

safetyAdminRoute.get('/', authMiddleware, adminMiddleware, rateLimit(120), async (c) => {
  const s = c.req.query('status') ?? 'open';
  const status = s === 'removed' || s === 'dismissed' || s === 'all' ? s : 'open';
  const [reports, openCount] = await Promise.all([listReports(c.env.DB, status, 200), countOpenReports(c.env.DB)]);
  const nicks = await resolveNicknames(c.env.IDENTITY_DB, [
    ...new Set(reports.flatMap((r) => [r.targetOwnerPseudonymId, r.reporterPseudonymId])),
  ]);
  return c.json({
    openCount,
    reports: reports.map((r) => ({
      ...r,
      targetOwnerNickname: nicks.get(r.targetOwnerPseudonymId) ?? null,
      reporterNickname: nicks.get(r.reporterPseudonymId) ?? null,
    })),
  });
});

// 처리 — 'remove' = 내용 내리기, 'dismiss' = 문제없음. 같은 대상의 다른 신고도 함께 닫는다.
safetyAdminRoute.post('/:id', authMiddleware, adminMiddleware, rateLimit(120), async (c) => {
  const me = c.get('userPseudonymId');
  const parsed = ResolveRequest.safeParse(await json(c));
  if (!parsed.success) return c.json({ error: { code: 'INVALID_INPUT' } }, 400);
  const report = await readReport(c.env.DB, c.req.param('id'));
  if (!report) return c.json({ error: { code: 'NOT_FOUND' } }, 404);
  if (parsed.data.action === 'remove') await removeTarget(c.env.DB, report.targetType, report.targetId);
  const closed = await resolveReportsForTarget(
    c.env.DB,
    report.targetType,
    report.targetId,
    parsed.data.action === 'remove' ? 'removed' : 'dismissed',
    me,
  );
  await appendAudit(c.env.DB, {
    actorPseudonymId: me,
    action: parsed.data.action === 'remove' ? 'report.remove' : 'report.dismiss',
    target: `${report.targetType}:${report.targetId}`,
    detail: `closed=${closed}`,
  });
  return c.json({ ok: true, closed });
});
