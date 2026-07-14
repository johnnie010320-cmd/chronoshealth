// 기능 요청 및 버그 리포트 — analysis DB(feature_requests). PII 0(작성자 pseudonym).
// 사용자 본인 CRUD + 관리자 조회/검색/삭제/피드백.

export type FeatureRequestKind = 'feature' | 'bug';
export type FeatureRequestStatus =
  | 'open'
  | 'planned'
  | 'in_progress'
  | 'done'
  | 'declined';

export const FEATURE_REQUEST_KINDS: readonly FeatureRequestKind[] = [
  'feature',
  'bug',
];
export const FEATURE_REQUEST_STATUSES: readonly FeatureRequestStatus[] = [
  'open',
  'planned',
  'in_progress',
  'done',
  'declined',
];

export type FeatureRequestRow = {
  id: string;
  userPseudonymId: string;
  kind: FeatureRequestKind;
  title: string;
  body: string;
  status: FeatureRequestStatus;
  adminFeedback: string | null;
  adminFeedbackAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type RawRow = {
  id: string;
  user_pseudonym_id: string;
  kind: string;
  title: string;
  body: string;
  status: string;
  admin_feedback: string | null;
  admin_feedback_at: string | null;
  created_at: string;
  updated_at: string;
};

function mapRow(r: RawRow): FeatureRequestRow {
  return {
    id: r.id,
    userPseudonymId: r.user_pseudonym_id,
    kind: (r.kind as FeatureRequestKind) ?? 'feature',
    title: r.title,
    body: r.body,
    status: (r.status as FeatureRequestStatus) ?? 'open',
    adminFeedback: r.admin_feedback,
    adminFeedbackAt: r.admin_feedback_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

const SELECT = `SELECT id, user_pseudonym_id, kind, title, body, status,
                       admin_feedback, admin_feedback_at, created_at, updated_at
                  FROM feature_requests`;

// ── 사용자 본인 ────────────────────────────────────────────────────────────

export async function listMyFeatureRequests(
  db: D1Database,
  userPseudonymId: string,
): Promise<FeatureRequestRow[]> {
  const { results } = await db
    .prepare(
      `${SELECT} WHERE user_pseudonym_id = ? AND deleted_at IS NULL
        ORDER BY created_at DESC LIMIT 200`,
    )
    .bind(userPseudonymId)
    .all<RawRow>();
  return (results ?? []).map(mapRow);
}

export async function insertFeatureRequest(
  db: D1Database,
  row: {
    id: string;
    userPseudonymId: string;
    kind: FeatureRequestKind;
    title: string;
    body: string;
  },
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO feature_requests (id, user_pseudonym_id, kind, title, body, status)
         VALUES (?, ?, ?, ?, ?, 'open')`,
    )
    .bind(row.id, row.userPseudonymId, row.kind, row.title, row.body)
    .run();
}

export async function readFeatureRequest(
  db: D1Database,
  id: string,
): Promise<FeatureRequestRow | null> {
  const r = await db
    .prepare(`${SELECT} WHERE id = ? AND deleted_at IS NULL LIMIT 1`)
    .bind(id)
    .first<RawRow>();
  return r ? mapRow(r) : null;
}

// 본인 글만 수정 — 소유자 불일치/삭제됨이면 0 changes → false.
export async function updateMyFeatureRequest(
  db: D1Database,
  id: string,
  userPseudonymId: string,
  patch: { kind?: FeatureRequestKind; title?: string; body?: string },
): Promise<boolean> {
  const sets: string[] = [];
  const binds: unknown[] = [];
  if (patch.kind !== undefined) {
    sets.push('kind = ?');
    binds.push(patch.kind);
  }
  if (patch.title !== undefined) {
    sets.push('title = ?');
    binds.push(patch.title);
  }
  if (patch.body !== undefined) {
    sets.push('body = ?');
    binds.push(patch.body);
  }
  if (sets.length === 0) return true;
  sets.push("updated_at = datetime('now')");
  binds.push(id, userPseudonymId);
  const res = await db
    .prepare(
      `UPDATE feature_requests SET ${sets.join(', ')}
        WHERE id = ? AND user_pseudonym_id = ? AND deleted_at IS NULL`,
    )
    .bind(...binds)
    .run();
  return (res.meta?.changes ?? 0) > 0;
}

export async function softDeleteMyFeatureRequest(
  db: D1Database,
  id: string,
  userPseudonymId: string,
): Promise<boolean> {
  const res = await db
    .prepare(
      `UPDATE feature_requests SET deleted_at = datetime('now')
        WHERE id = ? AND user_pseudonym_id = ? AND deleted_at IS NULL`,
    )
    .bind(id, userPseudonymId)
    .run();
  return (res.meta?.changes ?? 0) > 0;
}

// ── 관리자 ─────────────────────────────────────────────────────────────────

// 전체 조회 + 검색(제목/본문 LIKE) + 종류 필터. 최신순.
export async function listAllFeatureRequests(
  db: D1Database,
  opts: { search: string | null; kind: FeatureRequestKind | null; limit: number },
): Promise<FeatureRequestRow[]> {
  const where: string[] = ['deleted_at IS NULL'];
  const binds: unknown[] = [];
  if (opts.search) {
    where.push('(title LIKE ? OR body LIKE ?)');
    const like = `%${opts.search}%`;
    binds.push(like, like);
  }
  if (opts.kind) {
    where.push('kind = ?');
    binds.push(opts.kind);
  }
  binds.push(opts.limit);
  const { results } = await db
    .prepare(
      `${SELECT} WHERE ${where.join(' AND ')}
        ORDER BY created_at DESC LIMIT ?`,
    )
    .bind(...binds)
    .all<RawRow>();
  return (results ?? []).map(mapRow);
}

// 관리자 피드백/상태 갱신. 둘 다 선택적이나 최소 하나는 호출측에서 보장.
export async function setAdminFeedback(
  db: D1Database,
  id: string,
  patch: {
    feedback?: string | null;
    status?: FeatureRequestStatus;
    adminPseudonymId: string;
  },
): Promise<boolean> {
  const sets: string[] = [];
  const binds: unknown[] = [];
  if (patch.feedback !== undefined) {
    sets.push('admin_feedback = ?', "admin_feedback_at = datetime('now')", 'admin_feedback_by_pseudonym_id = ?');
    binds.push(patch.feedback, patch.adminPseudonymId);
  }
  if (patch.status !== undefined) {
    sets.push('status = ?');
    binds.push(patch.status);
  }
  if (sets.length === 0) return true;
  sets.push("updated_at = datetime('now')");
  binds.push(id);
  const res = await db
    .prepare(
      `UPDATE feature_requests SET ${sets.join(', ')}
        WHERE id = ? AND deleted_at IS NULL`,
    )
    .bind(...binds)
    .run();
  return (res.meta?.changes ?? 0) > 0;
}

export async function adminSoftDeleteFeatureRequest(
  db: D1Database,
  id: string,
): Promise<boolean> {
  const res = await db
    .prepare(
      `UPDATE feature_requests SET deleted_at = datetime('now')
        WHERE id = ? AND deleted_at IS NULL`,
    )
    .bind(id)
    .run();
  return (res.meta?.changes ?? 0) > 0;
}
