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
  // 본문 미디어 — 본문 자체를 이미지/PDF로 채운 경우(둘 다 없으면 텍스트 본문). R2 키는 노출하지 않음.
  hasBodyImage: boolean;
  bodyImageType: string | null;
  bodyFileName: string | null;
  // 추가 첨부 — 이미지(인라인), 파일(PDF), 외부 링크. R2 키는 노출하지 않음.
  hasImage: boolean;
  imageType: string | null;
  fileName: string | null;
  linkUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

// 첨부 스트림용 — R2 키 포함(내부 전용) + 소유자(인가 판정). 본문·추가첨부 슬롯 모두.
export type FeatureRequestMedia = {
  ownerPseudonymId: string;
  bodyImageKey: string | null;
  bodyImageType: string | null;
  bodyFileKey: string | null;
  bodyFileName: string | null;
  imageKey: string | null;
  imageType: string | null;
  fileKey: string | null;
  fileName: string | null;
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
  body_image_key: string | null;
  body_image_type: string | null;
  body_file_name: string | null;
  image_key: string | null;
  image_type: string | null;
  file_name: string | null;
  link_url: string | null;
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
    hasBodyImage: r.body_image_key != null,
    bodyImageType: r.body_image_type,
    bodyFileName: r.body_file_name,
    hasImage: r.image_key != null,
    imageType: r.image_type,
    fileName: r.file_name,
    linkUrl: r.link_url,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

const SELECT = `SELECT id, user_pseudonym_id, kind, title, body, status,
                       admin_feedback, admin_feedback_at,
                       body_image_key, body_image_type, body_file_name,
                       image_key, image_type, file_name, link_url,
                       created_at, updated_at
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
    linkUrl: string | null;
  },
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO feature_requests (id, user_pseudonym_id, kind, title, body, status, link_url)
         VALUES (?, ?, ?, ?, ?, 'open', ?)`,
    )
    .bind(row.id, row.userPseudonymId, row.kind, row.title, row.body, row.linkUrl)
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

// 첨부 스트림 인가용 — R2 키 + 소유자. deleted 여부 무시(삭제 후 정리 목적).
export async function readFeatureRequestMedia(
  db: D1Database,
  id: string,
): Promise<FeatureRequestMedia | null> {
  const r = await db
    .prepare(
      `SELECT user_pseudonym_id,
              body_image_key, body_image_type, body_file_key, body_file_name,
              image_key, image_type, file_key, file_name
         FROM feature_requests WHERE id = ? LIMIT 1`,
    )
    .bind(id)
    .first<{
      user_pseudonym_id: string;
      body_image_key: string | null;
      body_image_type: string | null;
      body_file_key: string | null;
      body_file_name: string | null;
      image_key: string | null;
      image_type: string | null;
      file_key: string | null;
      file_name: string | null;
    }>();
  if (!r) return null;
  return {
    ownerPseudonymId: r.user_pseudonym_id,
    bodyImageKey: r.body_image_key,
    bodyImageType: r.body_image_type,
    bodyFileKey: r.body_file_key,
    bodyFileName: r.body_file_name,
    imageKey: r.image_key,
    imageType: r.image_type,
    fileKey: r.file_key,
    fileName: r.file_name,
  };
}

export async function setFeatureImage(
  db: D1Database,
  id: string,
  key: string | null,
  type: string | null,
): Promise<boolean> {
  const res = await db
    .prepare(
      "UPDATE feature_requests SET image_key = ?, image_type = ?, updated_at = datetime('now') WHERE id = ? AND deleted_at IS NULL",
    )
    .bind(key, type, id)
    .run();
  return (res.meta?.changes ?? 0) > 0;
}

export async function setFeatureFile(
  db: D1Database,
  id: string,
  key: string | null,
  name: string | null,
): Promise<boolean> {
  const res = await db
    .prepare(
      "UPDATE feature_requests SET file_key = ?, file_name = ?, updated_at = datetime('now') WHERE id = ? AND deleted_at IS NULL",
    )
    .bind(key, name, id)
    .run();
  return (res.meta?.changes ?? 0) > 0;
}

// ── 본문 미디어(0040) — 이미지 XOR PDF. 한쪽 설정 시 반대쪽 컬럼은 비운다. ──────
// 반대쪽 R2 객체 삭제는 라우트가 담당(교체 전 media 로 이전 키 확보).

export async function setBodyImage(
  db: D1Database,
  id: string,
  key: string | null,
  type: string | null,
): Promise<boolean> {
  const res = await db
    .prepare(
      "UPDATE feature_requests SET body_image_key = ?, body_image_type = ?, body_file_key = NULL, body_file_name = NULL, updated_at = datetime('now') WHERE id = ? AND deleted_at IS NULL",
    )
    .bind(key, type, id)
    .run();
  return (res.meta?.changes ?? 0) > 0;
}

export async function setBodyFile(
  db: D1Database,
  id: string,
  key: string | null,
  name: string | null,
): Promise<boolean> {
  const res = await db
    .prepare(
      "UPDATE feature_requests SET body_file_key = ?, body_file_name = ?, body_image_key = NULL, body_image_type = NULL, updated_at = datetime('now') WHERE id = ? AND deleted_at IS NULL",
    )
    .bind(key, name, id)
    .run();
  return (res.meta?.changes ?? 0) > 0;
}

// 본인 글만 수정 — 소유자 불일치/삭제됨이면 0 changes → false.
export async function updateMyFeatureRequest(
  db: D1Database,
  id: string,
  userPseudonymId: string,
  patch: {
    kind?: FeatureRequestKind;
    title?: string;
    body?: string;
    linkUrl?: string | null;
  },
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
  if (patch.linkUrl !== undefined) {
    sets.push('link_url = ?');
    binds.push(patch.linkUrl);
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
