// 2nd Data — 의료 이력.
// 스토리보드 p17 만성질환·중증질환 체크박스, p13 가족력·수술기록.

export type ConditionCategory = 'chronic' | 'critical' | 'family';

// 스토리보드 p17 만성질환 10종.
export const CHRONIC_CODES = [
  'diabetes',
  'hypertension',
  'hyperlipidemia',
  'myocardial_infarction',
  'stroke',
  'copd',
  'ckd',
  'asthma',
  'thyroid',
  'insomnia',
] as const;

// 스토리보드 p17 중증질환 4종.
export const CRITICAL_CODES = [
  'cancer',
  'heart_disease',
  'cerebrovascular',
  'rare_intractable',
] as const;

// 가족력 — risk-survey 와 별개로 회원 본인이 직접 체크.
export const FAMILY_CODES = [
  'diabetes',
  'hypertension',
  'cancer',
  'stroke',
  'heart_disease',
  'dementia',
] as const;

export type ConditionRow = {
  code: string;
  category: ConditionCategory;
  granted: boolean;
  updatedAt: string;
};

export type SurgeryRow = {
  id: string;
  surgeryName: string;
  surgeryYear: number | null;
  note: string | null;
  createdAt: string;
};

export async function listConditions(
  db: D1Database,
  userPseudonymId: string,
): Promise<ConditionRow[]> {
  const result = await db
    .prepare(
      `SELECT code, category, granted, updated_at
         FROM medical_conditions
        WHERE user_pseudonym_id = ? AND granted = 1
        ORDER BY category, code`,
    )
    .bind(userPseudonymId)
    .all<{ code: string; category: string; granted: number; updated_at: string }>();
  return (result.results ?? []).map((row) => ({
    code: row.code,
    category: row.category as ConditionCategory,
    granted: row.granted === 1,
    updatedAt: row.updated_at,
  }));
}

export async function upsertConditions(
  db: D1Database,
  userPseudonymId: string,
  category: ConditionCategory,
  codes: string[],
): Promise<void> {
  // 카테고리 전체 reset → granted=0 처리 후 새 코드 granted=1.
  await db
    .prepare(
      `UPDATE medical_conditions SET granted = 0, updated_at = datetime('now')
        WHERE user_pseudonym_id = ? AND category = ?`,
    )
    .bind(userPseudonymId, category)
    .run();
  for (const code of codes) {
    await db
      .prepare(
        `INSERT INTO medical_conditions (user_pseudonym_id, code, category, granted)
           VALUES (?, ?, ?, 1)
         ON CONFLICT (user_pseudonym_id, category, code) DO UPDATE SET
           granted = 1, updated_at = datetime('now')`,
      )
      .bind(userPseudonymId, code, category)
      .run();
  }
}

export async function listSurgeries(
  db: D1Database,
  userPseudonymId: string,
): Promise<SurgeryRow[]> {
  const result = await db
    .prepare(
      `SELECT id, surgery_name, surgery_year, note, created_at
         FROM surgery_records
        WHERE user_pseudonym_id = ? AND deleted_at IS NULL
        ORDER BY COALESCE(surgery_year, 9999) DESC, created_at DESC`,
    )
    .bind(userPseudonymId)
    .all<{
      id: string;
      surgery_name: string;
      surgery_year: number | null;
      note: string | null;
      created_at: string;
    }>();
  return (result.results ?? []).map((row) => ({
    id: row.id,
    surgeryName: row.surgery_name,
    surgeryYear: row.surgery_year,
    note: row.note,
    createdAt: row.created_at,
  }));
}

export async function insertSurgery(
  db: D1Database,
  userPseudonymId: string,
  row: { id: string; surgeryName: string; surgeryYear: number | null; note: string | null },
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO surgery_records (id, user_pseudonym_id, surgery_name, surgery_year, note)
         VALUES (?, ?, ?, ?, ?)`,
    )
    .bind(row.id, userPseudonymId, row.surgeryName, row.surgeryYear, row.note)
    .run();
}

export async function softDeleteSurgery(
  db: D1Database,
  userPseudonymId: string,
  id: string,
): Promise<boolean> {
  const res = await db
    .prepare(
      `UPDATE surgery_records SET deleted_at = datetime('now')
        WHERE id = ? AND user_pseudonym_id = ? AND deleted_at IS NULL`,
    )
    .bind(id, userPseudonymId)
    .run();
  return (res.meta?.changes ?? 0) > 0;
}
