import type { RiskSurveyRequest, RiskSurveyResponse } from '../schemas/risk-survey.js';

// 사용자의 가장 최근 risk_survey_reports 행을 조회.
// 본 함수는 PII 미접근 (analysis DB만).

export type LatestReport = {
  payload: RiskSurveyResponse;
  generatedAt: string;
  stressLevel: RiskSurveyRequest['stressLevel'] | null;
  sex: RiskSurveyRequest['sex'];
  birthYear: number;
};

export async function readLatestReport(
  analysisDb: D1Database,
  userPseudonymId: string,
): Promise<LatestReport | null> {
  const row = await analysisDb
    .prepare(
      `SELECT r.payload, r.generated_at AS generated_at,
              s.stress_level, s.sex, s.birth_year
         FROM risk_survey_reports r
         JOIN risk_survey_responses s ON s.id = r.response_id
        WHERE r.user_pseudonym_id = ?
        ORDER BY r.generated_at DESC
        LIMIT 1`,
    )
    .bind(userPseudonymId)
    .first<{
      payload: string;
      generated_at: string;
      stress_level: string | null;
      sex: string;
      birth_year: number;
    }>();

  if (!row) return null;

  return {
    payload: JSON.parse(row.payload) as RiskSurveyResponse,
    generatedAt: row.generated_at,
    stressLevel:
      row.stress_level === 'low' ||
      row.stress_level === 'medium' ||
      row.stress_level === 'high'
        ? row.stress_level
        : null,
    sex:
      row.sex === 'male' || row.sex === 'female' || row.sex === 'other'
        ? row.sex
        : 'other',
    birthYear: row.birth_year,
  };
}

export async function readUserName(
  identityDb: D1Database,
  userPseudonymId: string,
): Promise<string | null> {
  const row = await identityDb
    .prepare('SELECT name FROM users WHERE user_pseudonym_id = ? LIMIT 1')
    .bind(userPseudonymId)
    .first<{ name: string }>();
  return row?.name ?? null;
}
