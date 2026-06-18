// R-Admin 공지사항 D1 접근 — analysis DB(notices). PII 0(작성자 pseudonym).

export type NoticeRow = {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  published: boolean;
  createdAt: string;
  updatedAt: string;
};

type RawNotice = {
  id: string;
  title: string;
  body: string;
  pinned: number;
  published: number;
  created_at: string;
  updated_at: string;
};

function mapRow(r: RawNotice): NoticeRow {
  return {
    id: r.id,
    title: r.title,
    body: r.body,
    pinned: r.pinned === 1,
    published: r.published === 1,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

const SELECT = `SELECT id, title, body, pinned, published, created_at, updated_at FROM notices`;

export async function insertNotice(
  db: D1Database,
  row: {
    id: string;
    title: string;
    body: string;
    pinned: boolean;
    published: boolean;
    createdByPseudonymId: string;
  },
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO notices (id, title, body, pinned, published, created_by_pseudonym_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      row.id,
      row.title,
      row.body,
      row.pinned ? 1 : 0,
      row.published ? 1 : 0,
      row.createdByPseudonymId,
    )
    .run();
}

// 공개 목록 — published 만, 고정 우선 최신순.
export async function listPublishedNotices(
  db: D1Database,
  limit: number,
): Promise<NoticeRow[]> {
  const { results } = await db
    .prepare(
      `${SELECT} WHERE published = 1
        ORDER BY pinned DESC, created_at DESC LIMIT ?`,
    )
    .bind(limit)
    .all<RawNotice>();
  return (results ?? []).map(mapRow);
}

// 관리자 목록 — 미게시 포함 전체.
export async function listAllNotices(db: D1Database, limit: number): Promise<NoticeRow[]> {
  const { results } = await db
    .prepare(`${SELECT} ORDER BY pinned DESC, created_at DESC LIMIT ?`)
    .bind(limit)
    .all<RawNotice>();
  return (results ?? []).map(mapRow);
}

export async function readNotice(db: D1Database, id: string): Promise<NoticeRow | null> {
  const r = await db.prepare(`${SELECT} WHERE id = ? LIMIT 1`).bind(id).first<RawNotice>();
  return r ? mapRow(r) : null;
}

export async function updateNotice(
  db: D1Database,
  id: string,
  patch: {
    title?: string | undefined;
    body?: string | undefined;
    pinned?: boolean | undefined;
    published?: boolean | undefined;
  },
): Promise<boolean> {
  const sets: string[] = [];
  const args: unknown[] = [];
  if (patch.title !== undefined) {
    sets.push('title = ?');
    args.push(patch.title);
  }
  if (patch.body !== undefined) {
    sets.push('body = ?');
    args.push(patch.body);
  }
  if (patch.pinned !== undefined) {
    sets.push('pinned = ?');
    args.push(patch.pinned ? 1 : 0);
  }
  if (patch.published !== undefined) {
    sets.push('published = ?');
    args.push(patch.published ? 1 : 0);
  }
  if (sets.length === 0) return false;
  sets.push("updated_at = datetime('now')");
  args.push(id);
  const res = await db
    .prepare(`UPDATE notices SET ${sets.join(', ')} WHERE id = ?`)
    .bind(...args)
    .run();
  return (res.meta?.changes ?? 0) > 0;
}

export async function deleteNotice(db: D1Database, id: string): Promise<boolean> {
  const res = await db.prepare('DELETE FROM notices WHERE id = ?').bind(id).run();
  return (res.meta?.changes ?? 0) > 0;
}
