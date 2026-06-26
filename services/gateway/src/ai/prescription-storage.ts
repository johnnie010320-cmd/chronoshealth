// AI 처방 날짜별 저장/조회 (analysis DB, pseudonym 키). '나의 건강 일기' 용.
// payload 는 처방 JSON 문자열. 하루 1건(upsert).

export async function savePrescription(
  db: D1Database,
  pseudonymId: string,
  entryDate: string,
  payloadJson: string,
  modelVersion: string,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO ai_prescriptions (user_pseudonym_id, entry_date, payload, model_version)
       VALUES (?, ?, ?, ?)
       ON CONFLICT (user_pseudonym_id, entry_date) DO UPDATE SET
         payload = excluded.payload,
         model_version = excluded.model_version,
         created_at = datetime('now')`,
    )
    .bind(pseudonymId, entryDate, payloadJson, modelVersion)
    .run();
}

export type StoredPrescription = { entryDate: string; payload: string };

export async function listPrescriptions(
  db: D1Database,
  pseudonymId: string,
  fromDate: string,
  toDate: string,
): Promise<StoredPrescription[]> {
  const { results } = await db
    .prepare(
      `SELECT entry_date, payload FROM ai_prescriptions
        WHERE user_pseudonym_id = ? AND entry_date >= ? AND entry_date <= ?
        ORDER BY entry_date DESC`,
    )
    .bind(pseudonymId, fromDate, toDate)
    .all<{ entry_date: string; payload: string }>();
  return (results ?? []).map((r) => ({ entryDate: r.entry_date, payload: r.payload }));
}
