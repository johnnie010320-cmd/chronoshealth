export type UpfTier = 'clean' | 'processed' | 'ultra';

export type RoutineEntry = {
  entryDate: string;
  caloriesKcal: number | null;
  exerciseMinutes: number | null;
  exerciseIntensity?: 'low' | 'medium' | 'high' | null;
  sleepHours: number | null;
  note: string | null;
  // 식단 점수용 영양 데이터(하루 합계). null = 미집계.
  proteinG?: number | null;
  carbG?: number | null;
  fatG?: number | null;
  upfTier?: UpfTier | null;
  // 스토리보드 p20 추가 카테고리 (확장).
  weightKg?: number | null;
  waistCm?: number | null;
  bloodGlucoseMgDl?: number | null;
  bloodPressureSystolic?: number | null;
  bloodPressureDiastolic?: number | null;
  medicationTaken?: boolean;
  stressLevel?: 'low' | 'medium' | 'high' | null;
};

export async function upsertRoutineEntry(
  db: D1Database,
  userPseudonymId: string,
  entry: RoutineEntry,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO routine_entries (
        user_pseudonym_id, purpose_code, entry_date,
        calories_kcal, exercise_minutes, exercise_intensity, sleep_hours, note,
        protein_g, carb_g, fat_g, upf_tier,
        weight_kg, waist_cm, blood_glucose_mg_dl,
        blood_pressure_systolic, blood_pressure_diastolic,
        medication_taken, stress_level
      ) VALUES (?, 'routine_log', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT (user_pseudonym_id, entry_date) DO UPDATE SET
        calories_kcal = excluded.calories_kcal,
        exercise_minutes = excluded.exercise_minutes,
        exercise_intensity = excluded.exercise_intensity,
        sleep_hours = excluded.sleep_hours,
        note = excluded.note,
        protein_g = excluded.protein_g,
        carb_g = excluded.carb_g,
        fat_g = excluded.fat_g,
        upf_tier = excluded.upf_tier,
        weight_kg = excluded.weight_kg,
        waist_cm = excluded.waist_cm,
        blood_glucose_mg_dl = excluded.blood_glucose_mg_dl,
        blood_pressure_systolic = excluded.blood_pressure_systolic,
        blood_pressure_diastolic = excluded.blood_pressure_diastolic,
        medication_taken = excluded.medication_taken,
        stress_level = excluded.stress_level,
        updated_at = datetime('now')`,
    )
    .bind(
      userPseudonymId,
      entry.entryDate,
      entry.caloriesKcal,
      entry.exerciseMinutes,
      entry.exerciseIntensity ?? null,
      entry.sleepHours,
      entry.note,
      entry.proteinG ?? null,
      entry.carbG ?? null,
      entry.fatG ?? null,
      entry.upfTier ?? null,
      entry.weightKg ?? null,
      entry.waistCm ?? null,
      entry.bloodGlucoseMgDl ?? null,
      entry.bloodPressureSystolic ?? null,
      entry.bloodPressureDiastolic ?? null,
      entry.medicationTaken ? 1 : 0,
      entry.stressLevel ?? null,
    )
    .run();
}

export async function readRoutineByDate(
  db: D1Database,
  userPseudonymId: string,
  entryDate: string,
): Promise<RoutineEntry | null> {
  const row = await db
    .prepare(
      `SELECT entry_date, calories_kcal, exercise_minutes, exercise_intensity, sleep_hours, note,
              protein_g, carb_g, fat_g, upf_tier
         FROM routine_entries
        WHERE user_pseudonym_id = ? AND entry_date = ?`,
    )
    .bind(userPseudonymId, entryDate)
    .first<NutritionRow>();

  if (!row) return null;
  return mapRow(row);
}

type NutritionRow = {
  entry_date: string;
  calories_kcal: number | null;
  exercise_minutes: number | null;
  exercise_intensity: string | null;
  sleep_hours: number | null;
  note: string | null;
  protein_g: number | null;
  carb_g: number | null;
  fat_g: number | null;
  upf_tier: string | null;
};

function mapRow(row: NutritionRow): RoutineEntry {
  return {
    entryDate: row.entry_date,
    caloriesKcal: row.calories_kcal,
    exerciseMinutes: row.exercise_minutes,
    exerciseIntensity: normIntensity(row.exercise_intensity),
    sleepHours: row.sleep_hours,
    note: row.note,
    proteinG: row.protein_g,
    carbG: row.carb_g,
    fatG: row.fat_g,
    upfTier: normUpf(row.upf_tier),
  };
}

function normIntensity(v: string | null | undefined): 'low' | 'medium' | 'high' | null {
  return v === 'low' || v === 'medium' || v === 'high' ? v : null;
}

function normUpf(v: string | null | undefined): UpfTier | null {
  return v === 'clean' || v === 'processed' || v === 'ultra' ? v : null;
}

export async function readRoutineRange(
  db: D1Database,
  userPseudonymId: string,
  fromDate: string,
  toDate: string,
): Promise<RoutineEntry[]> {
  const result = await db
    .prepare(
      `SELECT entry_date, calories_kcal, exercise_minutes, exercise_intensity, sleep_hours, note,
              protein_g, carb_g, fat_g, upf_tier
         FROM routine_entries
        WHERE user_pseudonym_id = ?
          AND entry_date >= ?
          AND entry_date <= ?
        ORDER BY entry_date ASC`,
    )
    .bind(userPseudonymId, fromDate, toDate)
    .all<NutritionRow>();

  return (result.results ?? []).map(mapRow);
}
