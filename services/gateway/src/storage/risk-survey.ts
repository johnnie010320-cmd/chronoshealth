import type { RiskSurveyRequest, RiskSurveyResponse } from '../schemas/risk-survey.js';

// spec docs/spec/risk-survey/05-storage-consent.md 정합.
// consentToStore=true 일 때만 DB 저장. false 시 메모리에서 즉시 휘발.
// 모든 행 purpose_code = 'risk_estimate'. user_pseudonym_id만, PII 0.

const PURPOSE = 'risk_estimate' as const;
const SOURCE = 'risk_estimate_api' as const;

export async function persistSurveyAndReport(
  db: D1Database,
  userPseudonymId: string,
  input: RiskSurveyRequest,
  report: RiskSurveyResponse,
): Promise<void> {
  if (!input.consentToStore) {
    // 저장 비동의 → 아무것도 저장하지 않음 (spec Positive #2).
    return;
  }

  // 1) 응답 INSERT (id 반환)
  const insertResp = await db
    .prepare(
      `INSERT INTO risk_survey_responses (
        user_pseudonym_id, purpose_code,
        birth_year, sex, height_cm, weight_kg,
        smoking, alcohol_drinks_per_week, exercise_minutes_per_week, sleep_hours_per_night,
        systolic_bp, diastolic_bp, fasting_glucose, ldl_cholesterol, hdl_cholesterol,
        family_history_diabetes, family_history_hypertension, family_history_cardiovascular,
        stress_level, self_rated_health
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      userPseudonymId,
      PURPOSE,
      input.birthYear,
      input.sex,
      input.heightCm,
      input.weightKg,
      input.smoking,
      input.alcoholDrinksPerWeek,
      input.exerciseMinutesPerWeek,
      input.sleepHoursPerNight,
      input.systolicBp,
      input.diastolicBp,
      input.fastingGlucose,
      input.ldlCholesterol,
      input.hdlCholesterol,
      input.familyHistoryDiabetes ? 1 : 0,
      input.familyHistoryHypertension ? 1 : 0,
      input.familyHistoryCardiovascular ? 1 : 0,
      input.stressLevel,
      input.selfRatedHealth,
    )
    .run();

  const responseId = insertResp.meta.last_row_id;
  if (typeof responseId !== 'number') {
    throw new Error('persistSurveyAndReport: failed to get response id');
  }

  // 2) 리포트 INSERT + consent_log INSERT — batch로 원자성.
  const stmts = [
    db
      .prepare(
        `INSERT INTO risk_survey_reports
          (report_id, response_id, user_pseudonym_id, purpose_code, model_version, payload, generated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        report.reportId,
        responseId,
        userPseudonymId,
        PURPOSE,
        report.modelVersion,
        JSON.stringify(report),
        report.generatedAt,
      ),
    db
      .prepare(
        `INSERT INTO consent_log (user_pseudonym_id, purpose_code, consent_kind, granted, source)
          VALUES (?, ?, 'store', 1, ?)`,
      )
      .bind(userPseudonymId, PURPOSE, SOURCE),
  ];

  if (input.consentToResearch) {
    stmts.push(
      db
        .prepare(
          `INSERT INTO consent_log (user_pseudonym_id, purpose_code, consent_kind, granted, source)
            VALUES (?, ?, 'research', 1, ?)`,
        )
        .bind(userPseudonymId, PURPOSE, SOURCE),
    );
  }

  await db.batch(stmts);
}
