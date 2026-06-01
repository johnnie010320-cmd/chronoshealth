export type RoutineEntry = {
  entryDate: string;
  caloriesKcal: number | null;
  exerciseMinutes: number | null;
  sleepHours: number | null;
  note: string | null;
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
        calories_kcal, exercise_minutes, sleep_hours, note
      ) VALUES (?, 'routine_log', ?, ?, ?, ?, ?)
      ON CONFLICT (user_pseudonym_id, entry_date) DO UPDATE SET
        calories_kcal = excluded.calories_kcal,
        exercise_minutes = excluded.exercise_minutes,
        sleep_hours = excluded.sleep_hours,
        note = excluded.note,
        updated_at = datetime('now')`,
    )
    .bind(
      userPseudonymId,
      entry.entryDate,
      entry.caloriesKcal,
      entry.exerciseMinutes,
      entry.sleepHours,
      entry.note,
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
      `SELECT entry_date, calories_kcal, exercise_minutes, sleep_hours, note
         FROM routine_entries
        WHERE user_pseudonym_id = ? AND entry_date = ?`,
    )
    .bind(userPseudonymId, entryDate)
    .first<{
      entry_date: string;
      calories_kcal: number | null;
      exercise_minutes: number | null;
      sleep_hours: number | null;
      note: string | null;
    }>();

  if (!row) return null;
  return {
    entryDate: row.entry_date,
    caloriesKcal: row.calories_kcal,
    exerciseMinutes: row.exercise_minutes,
    sleepHours: row.sleep_hours,
    note: row.note,
  };
}

export async function readRoutineRange(
  db: D1Database,
  userPseudonymId: string,
  fromDate: string,
  toDate: string,
): Promise<RoutineEntry[]> {
  const result = await db
    .prepare(
      `SELECT entry_date, calories_kcal, exercise_minutes, sleep_hours, note
         FROM routine_entries
        WHERE user_pseudonym_id = ?
          AND entry_date >= ?
          AND entry_date <= ?
        ORDER BY entry_date ASC`,
    )
    .bind(userPseudonymId, fromDate, toDate)
    .all<{
      entry_date: string;
      calories_kcal: number | null;
      exercise_minutes: number | null;
      sleep_hours: number | null;
      note: string | null;
    }>();

  return (result.results ?? []).map((row) => ({
    entryDate: row.entry_date,
    caloriesKcal: row.calories_kcal,
    exerciseMinutes: row.exercise_minutes,
    sleepHours: row.sleep_hours,
    note: row.note,
  }));
}
