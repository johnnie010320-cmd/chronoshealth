// 다이어리(오늘의 루틴) 개인 첨부 — 본인 pseudonym 소유. analysis DB.

export type DiaryAttachment = {
  id: string;
  entryDate: string;
  kind: 'image' | 'file';
  name: string;
  mime: string;
  byteSize: number;
  createdAt: string;
};

export type DiaryAttachmentFull = DiaryAttachment & { r2Key: string; ownerPseudonymId: string };

export async function insertDiaryAttachment(
  db: D1Database,
  row: {
    id: string;
    userPseudonymId: string;
    entryDate: string;
    kind: 'image' | 'file';
    r2Key: string;
    name: string;
    mime: string;
    byteSize: number;
  },
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO diary_attachments
         (id, user_pseudonym_id, entry_date, kind, r2_key, name, mime, byte_size)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      row.id,
      row.userPseudonymId,
      row.entryDate,
      row.kind,
      row.r2Key,
      row.name,
      row.mime,
      row.byteSize,
    )
    .run();
}

export async function listDiaryAttachments(
  db: D1Database,
  userPseudonymId: string,
  fromDate: string,
  toDate: string,
): Promise<DiaryAttachment[]> {
  const { results } = await db
    .prepare(
      `SELECT id, entry_date, kind, name, mime, byte_size, created_at
         FROM diary_attachments
        WHERE user_pseudonym_id = ? AND entry_date >= ? AND entry_date <= ?
        ORDER BY entry_date DESC, created_at ASC`,
    )
    .bind(userPseudonymId, fromDate, toDate)
    .all<{
      id: string;
      entry_date: string;
      kind: string;
      name: string;
      mime: string;
      byte_size: number;
      created_at: string;
    }>();
  return (results ?? []).map((r) => ({
    id: r.id,
    entryDate: r.entry_date,
    kind: r.kind === 'image' ? 'image' : 'file',
    name: r.name,
    mime: r.mime,
    byteSize: r.byte_size,
    createdAt: r.created_at,
  }));
}

// 소유자 검증 포함 단건 조회(스트림/삭제용).
export async function readDiaryAttachment(
  db: D1Database,
  id: string,
): Promise<DiaryAttachmentFull | null> {
  const r = await db
    .prepare(
      `SELECT id, user_pseudonym_id, entry_date, kind, r2_key, name, mime, byte_size, created_at
         FROM diary_attachments WHERE id = ? LIMIT 1`,
    )
    .bind(id)
    .first<{
      id: string;
      user_pseudonym_id: string;
      entry_date: string;
      kind: string;
      r2_key: string;
      name: string;
      mime: string;
      byte_size: number;
      created_at: string;
    }>();
  if (!r) return null;
  return {
    id: r.id,
    ownerPseudonymId: r.user_pseudonym_id,
    entryDate: r.entry_date,
    kind: r.kind === 'image' ? 'image' : 'file',
    r2Key: r.r2_key,
    name: r.name,
    mime: r.mime,
    byteSize: r.byte_size,
    createdAt: r.created_at,
  };
}

export async function deleteDiaryAttachmentRow(db: D1Database, id: string): Promise<void> {
  await db.prepare('DELETE FROM diary_attachments WHERE id = ?').bind(id).run();
}
