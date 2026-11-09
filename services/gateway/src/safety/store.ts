// 신고·차단 저장소 (2026-11-08, migration 0047).
// Google Play 사용자 제작 콘텐츠 정책 — 앱 안에서 글·댓글·메시지를 신고하고 사용자를 차단할 수 있어야 한다.

export const REPORT_TARGETS = ['post', 'comment', 'message'] as const;
export type ReportTarget = (typeof REPORT_TARGETS)[number];
export const REPORT_REASONS = ['spam', 'abuse', 'sexual', 'violence', 'self_harm', 'misinfo', 'other'] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];
export type ReportStatus = 'open' | 'removed' | 'dismissed';

/** 신고·차단 대상의 작성자와 미리보기 (살아 있는 것만). 메시지는 신고자가 그 대화방 멤버여야 한다. */
export async function readTargetOwner(
  db: D1Database,
  type: ReportTarget,
  id: string,
  viewer: string,
): Promise<{ owner: string; preview: string } | null> {
  if (type === 'post') {
    const r = await db
      .prepare('SELECT user_pseudonym_id AS o, title AS p FROM community_posts WHERE id = ? AND deleted_at IS NULL')
      .bind(id)
      .first<{ o: string; p: string }>();
    return r ? { owner: r.o, preview: r.p } : null;
  }
  if (type === 'comment') {
    const r = await db
      .prepare('SELECT user_pseudonym_id AS o, body AS p FROM community_comments WHERE id = ? AND deleted_at IS NULL')
      .bind(id)
      .first<{ o: string; p: string }>();
    return r ? { owner: r.o, preview: r.p } : null;
  }
  const r = await db
    .prepare(
      `SELECT m.sender_pseudonym_id AS o, m.body AS p FROM messages m
         JOIN conversation_members cm ON cm.conversation_id = m.conversation_id AND cm.member_pseudonym_id = ?
        WHERE m.id = ? AND m.deleted_at IS NULL`,
    )
    .bind(viewer, id)
    .first<{ o: string; p: string | null }>();
  return r ? { owner: r.o, preview: r.p ?? '' } : null;
}

export async function insertReport(
  db: D1Database,
  r: { reporter: string; type: ReportTarget; targetId: string; owner: string; reason: ReportReason; detail: string | null },
): Promise<void> {
  // 같은 사람이 같은 대상을 다시 신고하면 사유만 새로 고치고 다시 '처리 대기'로.
  await db
    .prepare(
      `INSERT INTO content_reports (id, reporter_pseudonym_id, target_type, target_id, target_owner_pseudonym_id, reason, detail)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (reporter_pseudonym_id, target_type, target_id)
       DO UPDATE SET reason = excluded.reason, detail = excluded.detail, status = 'open',
                     created_at = datetime('now'), resolved_at = NULL, resolved_by_pseudonym_id = NULL`,
    )
    .bind(crypto.randomUUID(), r.reporter, r.type, r.targetId, r.owner, r.reason, r.detail)
    .run();
}

export async function addBlock(db: D1Database, blocker: string, blocked: string): Promise<void> {
  await db
    .prepare('INSERT OR IGNORE INTO user_blocks (blocker_pseudonym_id, blocked_pseudonym_id) VALUES (?, ?)')
    .bind(blocker, blocked)
    .run();
}

export async function removeBlock(db: D1Database, blocker: string, blocked: string): Promise<boolean> {
  const res = await db
    .prepare('DELETE FROM user_blocks WHERE blocker_pseudonym_id = ? AND blocked_pseudonym_id = ?')
    .bind(blocker, blocked)
    .run();
  return (res.meta?.changes ?? 0) > 0;
}

export async function listMyBlocks(db: D1Database, blocker: string): Promise<Array<{ pseudonymId: string; createdAt: string }>> {
  const { results } = await db
    .prepare('SELECT blocked_pseudonym_id AS p, created_at AS c FROM user_blocks WHERE blocker_pseudonym_id = ? ORDER BY created_at DESC')
    .bind(blocker)
    .all<{ p: string; c: string }>();
  return (results ?? []).map((r) => ({ pseudonymId: r.p, createdAt: r.c }));
}

/** 내가 차단한 사람 + 나를 차단한 사람 — 서로 글·댓글·메시지가 보이지 않는다. */
export async function hiddenUsersFor(db: D1Database, me: string): Promise<Set<string>> {
  const { results } = await db
    .prepare(
      `SELECT blocked_pseudonym_id AS p FROM user_blocks WHERE blocker_pseudonym_id = ?
       UNION SELECT blocker_pseudonym_id AS p FROM user_blocks WHERE blocked_pseudonym_id = ?`,
    )
    .bind(me, me)
    .all<{ p: string }>();
  return new Set((results ?? []).map((r) => r.p));
}

/** 두 사람 사이에 어느 쪽이든 차단이 있는지 */
export async function isBlockedBetween(db: D1Database, a: string, b: string): Promise<boolean> {
  const r = await db
    .prepare(
      `SELECT 1 AS x FROM user_blocks
        WHERE (blocker_pseudonym_id = ? AND blocked_pseudonym_id = ?)
           OR (blocker_pseudonym_id = ? AND blocked_pseudonym_id = ?) LIMIT 1`,
    )
    .bind(a, b, b, a)
    .first<{ x: number }>();
  return r !== null;
}

export type ReportRow = {
  id: string;
  targetType: ReportTarget;
  targetId: string;
  targetOwnerPseudonymId: string;
  reporterPseudonymId: string;
  reason: ReportReason;
  detail: string | null;
  status: ReportStatus;
  createdAt: string;
  resolvedAt: string | null;
  preview: string | null;
};

export async function listReports(db: D1Database, status: ReportStatus | 'all', limit: number): Promise<ReportRow[]> {
  const where = status === 'all' ? '' : 'WHERE r.status = ?';
  const stmt = db.prepare(
    `SELECT r.id, r.target_type, r.target_id, r.target_owner_pseudonym_id, r.reporter_pseudonym_id, r.reason, r.detail,
            r.status, r.created_at, r.resolved_at,
            CASE r.target_type
              WHEN 'post' THEN (SELECT title || char(10) || body FROM community_posts WHERE id = r.target_id)
              WHEN 'comment' THEN (SELECT body FROM community_comments WHERE id = r.target_id)
              ELSE (SELECT body FROM messages WHERE id = r.target_id)
            END AS preview
       FROM content_reports r ${where}
      ORDER BY r.created_at DESC LIMIT ?`,
  );
  const { results } = await (status === 'all' ? stmt.bind(limit) : stmt.bind(status, limit)).all<{
    id: string;
    target_type: ReportTarget;
    target_id: string;
    target_owner_pseudonym_id: string;
    reporter_pseudonym_id: string;
    reason: ReportReason;
    detail: string | null;
    status: ReportStatus;
    created_at: string;
    resolved_at: string | null;
    preview: string | null;
  }>();
  return (results ?? []).map((r) => ({
    id: r.id,
    targetType: r.target_type,
    targetId: r.target_id,
    targetOwnerPseudonymId: r.target_owner_pseudonym_id,
    reporterPseudonymId: r.reporter_pseudonym_id,
    reason: r.reason,
    detail: r.detail,
    status: r.status,
    createdAt: r.created_at,
    resolvedAt: r.resolved_at,
    preview: r.preview ? r.preview.slice(0, 300) : null,
  }));
}

export async function readReport(db: D1Database, id: string): Promise<{ targetType: ReportTarget; targetId: string } | null> {
  const r = await db
    .prepare('SELECT target_type AS t, target_id AS i FROM content_reports WHERE id = ?')
    .bind(id)
    .first<{ t: ReportTarget; i: string }>();
  return r ? { targetType: r.t, targetId: r.i } : null;
}

/** 같은 대상에 들어온 신고를 한꺼번에 처리 (여러 사람이 같은 글을 신고한 경우) */
export async function resolveReportsForTarget(
  db: D1Database,
  type: ReportTarget,
  targetId: string,
  status: 'removed' | 'dismissed',
  by: string,
): Promise<number> {
  const res = await db
    .prepare(
      `UPDATE content_reports SET status = ?, resolved_at = datetime('now'), resolved_by_pseudonym_id = ?
        WHERE target_type = ? AND target_id = ? AND status = 'open'`,
    )
    .bind(status, by, type, targetId)
    .run();
  return res.meta?.changes ?? 0;
}

/** 관리자 '내리기' — 글·댓글·메시지 soft delete */
export async function removeTarget(db: D1Database, type: ReportTarget, id: string): Promise<void> {
  const table = type === 'post' ? 'community_posts' : type === 'comment' ? 'community_comments' : 'messages';
  await db.prepare(`UPDATE ${table} SET deleted_at = datetime('now') WHERE id = ? AND deleted_at IS NULL`).bind(id).run();
}

export async function countOpenReports(db: D1Database): Promise<number> {
  const r = await db.prepare("SELECT COUNT(*) AS n FROM content_reports WHERE status = 'open'").first<{ n: number }>();
  return r?.n ?? 0;
}
