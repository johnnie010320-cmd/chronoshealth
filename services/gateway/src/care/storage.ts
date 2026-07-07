import type { RiskSurveyRequest } from '../schemas/risk-survey.js';

// Load the full RiskSurveyRequest payload associated with the user's latest
// report. Care endpoint needs every survey field (BMI, BP, glucose, etc.),
// not just the subset readLatestReport exposes for the avatar endpoint.
export async function readLatestSurveyInput(
  analysisDb: D1Database,
  userPseudonymId: string,
): Promise<RiskSurveyRequest | null> {
  const row = await analysisDb
    .prepare(
      `SELECT s.birth_year, s.sex, s.height_cm, s.weight_kg,
              s.smoking, s.alcohol_drinks_per_week, s.exercise_minutes_per_week, s.sleep_hours_per_night,
              s.systolic_bp, s.diastolic_bp, s.fasting_glucose, s.ldl_cholesterol, s.hdl_cholesterol,
              s.family_history_diabetes, s.family_history_hypertension, s.family_history_cardiovascular,
              s.stress_level, s.self_rated_health
         FROM risk_survey_responses s
         JOIN risk_survey_reports r ON r.response_id = s.id
        WHERE r.user_pseudonym_id = ?
        ORDER BY r.generated_at DESC
        LIMIT 1`,
    )
    .bind(userPseudonymId)
    .first<{
      birth_year: number;
      sex: string;
      height_cm: number;
      weight_kg: number;
      smoking: string;
      alcohol_drinks_per_week: number;
      exercise_minutes_per_week: number;
      sleep_hours_per_night: number;
      systolic_bp: number | null;
      diastolic_bp: number | null;
      fasting_glucose: number | null;
      ldl_cholesterol: number | null;
      hdl_cholesterol: number | null;
      family_history_diabetes: number;
      family_history_hypertension: number;
      family_history_cardiovascular: number;
      stress_level: string;
      self_rated_health: string;
    }>();

  if (!row) return null;

  const sex = row.sex === 'male' || row.sex === 'female' ? row.sex : 'other';
  const smoking =
    row.smoking === 'never' || row.smoking === 'former' || row.smoking === 'current'
      ? row.smoking
      : 'never';
  const stress =
    row.stress_level === 'low' || row.stress_level === 'medium' || row.stress_level === 'high'
      ? row.stress_level
      : 'medium';
  const selfRated =
    row.self_rated_health === 'excellent' ||
    row.self_rated_health === 'good' ||
    row.self_rated_health === 'fair' ||
    row.self_rated_health === 'poor'
      ? row.self_rated_health
      : 'fair';

  return {
    birthYear: row.birth_year,
    sex,
    heightCm: row.height_cm,
    weightKg: row.weight_kg,
    smoking,
    // 세분화 원자료는 care 휴리스틱에서 미사용 — 중립 기본값(계산은 coarse 컬럼 사용).
    smokingPacksPerWeek: null,
    alcoholType: 'none',
    alcoholAmountPerWeek: 0,
    alcoholDrinksPerWeek: row.alcohol_drinks_per_week,
    exercises: [],
    exerciseMinutesPerWeek: row.exercise_minutes_per_week,
    sleepHoursPerNight: row.sleep_hours_per_night,
    systolicBp: row.systolic_bp,
    diastolicBp: row.diastolic_bp,
    fastingGlucose: row.fasting_glucose,
    ldlCholesterol: row.ldl_cholesterol,
    hdlCholesterol: row.hdl_cholesterol,
    familyHistoryDiabetes: row.family_history_diabetes === 1,
    familyHistoryHypertension: row.family_history_hypertension === 1,
    familyHistoryCardiovascular: row.family_history_cardiovascular === 1,
    familyHistoryOther: [],
    stressLevel: stress,
    selfRatedHealth: selfRated,
    consentToStore: true,
    consentToResearch: false,
  };
}
