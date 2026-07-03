// R-Admin 공지사항 D1 접근 — analysis DB(notices). PII 0(작성자 pseudonym).

export type NoticeRow = {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  published: boolean;
  createdAt: string;
  updatedAt: string;
  // 첨부 — 이미지(인라인), 파일(PDF 다운로드), 외부 링크. R2 키는 노출하지 않음.
  hasImage: boolean;
  imageType: string | null;
  fileName: string | null;
  linkUrl: string | null;
};

// 첨부 스트림용 — R2 키 포함(내부 전용).
export type NoticeMedia = {
  imageKey: string | null;
  imageType: string | null;
  fileKey: string | null;
  fileName: string | null;
};

type RawNotice = {
  id: string;
  title: string;
  body: string;
  pinned: number;
  published: number;
  created_at: string;
  updated_at: string;
  image_key: string | null;
  image_type: string | null;
  file_key: string | null;
  file_name: string | null;
  link_url: string | null;
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
    hasImage: r.image_key != null,
    imageType: r.image_type,
    fileName: r.file_name,
    linkUrl: r.link_url,
  };
}

const SELECT = `SELECT id, title, body, pinned, published, created_at, updated_at,
                       image_key, image_type, file_key, file_name, link_url
                  FROM notices`;

export async function insertNotice(
  db: D1Database,
  row: {
    id: string;
    title: string;
    body: string;
    pinned: boolean;
    published: boolean;
    linkUrl: string | null;
    createdByPseudonymId: string;
  },
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO notices (id, title, body, pinned, published, link_url, created_by_pseudonym_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      row.id,
      row.title,
      row.body,
      row.pinned ? 1 : 0,
      row.published ? 1 : 0,
      row.linkUrl,
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

// 첨부 스트림용 — R2 키 조회.
export async function readNoticeMedia(db: D1Database, id: string): Promise<NoticeMedia | null> {
  const r = await db
    .prepare('SELECT image_key, image_type, file_key, file_name FROM notices WHERE id = ? LIMIT 1')
    .bind(id)
    .first<{
      image_key: string | null;
      image_type: string | null;
      file_key: string | null;
      file_name: string | null;
    }>();
  if (!r) return null;
  return {
    imageKey: r.image_key,
    imageType: r.image_type,
    fileKey: r.file_key,
    fileName: r.file_name,
  };
}

export async function setNoticeImage(
  db: D1Database,
  id: string,
  key: string | null,
  type: string | null,
): Promise<boolean> {
  const res = await db
    .prepare("UPDATE notices SET image_key = ?, image_type = ?, updated_at = datetime('now') WHERE id = ?")
    .bind(key, type, id)
    .run();
  return (res.meta?.changes ?? 0) > 0;
}

export async function setNoticeFile(
  db: D1Database,
  id: string,
  key: string | null,
  name: string | null,
): Promise<boolean> {
  const res = await db
    .prepare("UPDATE notices SET file_key = ?, file_name = ?, updated_at = datetime('now') WHERE id = ?")
    .bind(key, name, id)
    .run();
  return (res.meta?.changes ?? 0) > 0;
}

export async function updateNotice(
  db: D1Database,
  id: string,
  patch: {
    title?: string | undefined;
    body?: string | undefined;
    pinned?: boolean | undefined;
    published?: boolean | undefined;
    linkUrl?: string | null | undefined;
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
  if (patch.linkUrl !== undefined) {
    sets.push('link_url = ?');
    args.push(patch.linkUrl);
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
