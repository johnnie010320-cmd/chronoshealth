import { describe, it, expect, beforeEach } from 'vitest';
import app from '../src/index.js';
import { __clearRateLimit } from '../src/middleware/rate-limit.js';
import {
  makeMockIdentityDb,
  makeMockAnalysisDb,
  issueTestToken,
} from './helpers/mock-d1.js';
import type {
  RiskSurveyRequest,
  RiskSurveyResponse,
} from '../src/schemas/risk-survey.js';

type Severity = 'info' | 'recommend' | 'attention';

type CareCategoryResponse = {
  rules: { ruleId: string; severity: Severity }[];
  affiliates: { slug: string; title: string; ctaUrl: string }[];
};

type CareResponse = {
  diet: CareCategoryResponse;
  exercise: CareCategoryResponse;
  medical: CareCategoryResponse;
  context: {
    bmi: number | null;
    age: number;
    exerciseMinutesPerWeek: number;
    alcoholDrinksPerWeek: number;
    smoking: 'never' | 'former' | 'current';
    sleepHoursPerNight: number;
    stressLevel: 'low' | 'medium' | 'high';
  };
  modelVersion: string;
  disclaimer: string;
};

function defaultSurvey(over: Partial<RiskSurveyRequest> = {}): RiskSurveyRequest {
  return {
    birthYear: 1985,
    sex: 'male',
    heightCm: 175,
    weightKg: 75,
    smoking: 'never',
    alcoholDrinksPerWeek: 3,
    exerciseMinutesPerWeek: 180,
    sleepHoursPerNight: 7.5,
    systolicBp: 118,
    diastolicBp: 76,
    fastingGlucose: 92,
    ldlCholesterol: 108,
    hdlCholesterol: 55,
    familyHistoryDiabetes: false,
    familyHistoryHypertension: false,
    familyHistoryCardiovascular: false,
    stressLevel: 'medium',
    selfRatedHealth: 'good',
    consentToStore: true,
    consentToResearch: false,
    ...over,
  };
}

function seedReportWithSurvey(
  analysisState: ReturnType<typeof makeMockAnalysisDb>['state'],
  pseudonym: string,
  survey: RiskSurveyRequest,
  bioAge = 36,
) {
  const responseId = analysisState.responses.length + 1;
  analysisState.responses.push({
    id: responseId,
    user_pseudonym_id: pseudonym,
    purpose_code: 'risk_estimate',
    raw: {
      birth_year: survey.birthYear,
      sex: survey.sex,
      height_cm: survey.heightCm,
      weight_kg: survey.weightKg,
      smoking: survey.smoking,
      alcohol_drinks_per_week: survey.alcoholDrinksPerWeek,
      exercise_minutes_per_week: survey.exerciseMinutesPerWeek,
      sleep_hours_per_night: survey.sleepHoursPerNight,
      systolic_bp: survey.systolicBp,
      diastolic_bp: survey.diastolicBp,
      fasting_glucose: survey.fastingGlucose,
      ldl_cholesterol: survey.ldlCholesterol,
      hdl_cholesterol: survey.hdlCholesterol,
      family_history_diabetes: survey.familyHistoryDiabetes ? 1 : 0,
      family_history_hypertension: survey.familyHistoryHypertension ? 1 : 0,
      family_history_cardiovascular: survey.familyHistoryCardiovascular ? 1 : 0,
      stress_level: survey.stressLevel,
      self_rated_health: survey.selfRatedHealth,
    },
  });

  const chronologicalAge = new Date().getFullYear() - survey.birthYear;
  const payload: RiskSurveyResponse = {
    reportId: crypto.randomUUID(),
    generatedAt: new Date().toISOString(),
    modelVersion: 'rs-v0.1.0',
    bioAge: {
      value: bioAge,
      chronologicalAge,
      ci95: [bioAge - 2, bioAge + 2],
      topContributors: [],
    },
    diseaseRisk: [
      { code: 'cvd', label: 'CVD', probability5y: 0.04, riskCategory: 'low', modifiableFactors: [] },
      { code: 'diabetes', label: 'DM', probability5y: 0.03, riskCategory: 'low', modifiableFactors: [] },
      { code: 'ckd', label: 'CKD', probability5y: 0.02, riskCategory: 'low', modifiableFactors: [] },
      { code: 'dementia', label: 'Dementia', probability5y: 0.01, riskCategory: 'low', modifiableFactors: [] },
      { code: 'cancer', label: 'Cancer', probability5y: 0.03, riskCategory: 'low', modifiableFactors: [] },
    ],
    improvement: [],
    disclaimer: '본 리포트는 의료 행위를 대체할 수 없으며 건강 증진 참고용입니다.',
    hotlines: { suicidePrevention: null, mentalHealthCrisis: null },
  };

  analysisState.reports.push({
    report_id: payload.reportId,
    response_id: responseId,
    user_pseudonym_id: pseudonym,
    purpose_code: 'risk_estimate',
    model_version: 'rs-v0.1.0',
    payload: JSON.stringify(payload),
    generated_at: payload.generatedAt,
  });
}

describe('GET /api/v1/care/me', () => {
  let identityMock: ReturnType<typeof makeMockIdentityDb>;
  let analysisMock: ReturnType<typeof makeMockAnalysisDb>;

  beforeEach(() => {
    identityMock = makeMockIdentityDb();
    analysisMock = makeMockAnalysisDb();
    __clearRateLimit();
  });

  const getMe = (token: string, locale?: string) =>
    app.request(
      `/api/v1/care/me${locale ? `?locale=${locale}` : ''}`,
      { method: 'GET', headers: { Authorization: `Bearer ${token}` } },
      {
        IDENTITY_DB: identityMock.db,
        DB: analysisMock.db,
        BETA_SIGNUP_HMAC_SALT: 'test',
        ENVIRONMENT: 'dev',
      },
    );

  it('200 — 기본 surface (3 카테고리, 룰 + 제휴 카드)', async () => {
    const { token, pseudonym } = issueTestToken(identityMock.state);
    seedReportWithSurvey(analysisMock.state, pseudonym, defaultSurvey());
    const res = await getMe(token);
    expect(res.status).toBe(200);
    const data = (await res.json()) as CareResponse;
    expect(data.diet.rules.length).toBeGreaterThan(0);
    expect(data.exercise.rules.length).toBeGreaterThan(0);
    expect(data.diet.affiliates.length).toBeGreaterThan(0);
    expect(data.context.bmi).toBeGreaterThan(0);
    expect(data.modelVersion).toBe('care-v0.1.0');
  });

  it('404 NO_REPORT — 설문 없는 사용자', async () => {
    const { token } = issueTestToken(identityMock.state);
    const res = await getMe(token);
    expect(res.status).toBe(404);
    const data = (await res.json()) as { error: { code: string } };
    expect(data.error.code).toBe('NO_REPORT');
  });

  it('401 UNAUTHORIZED — 토큰 없음', async () => {
    const res = await app.request(
      '/api/v1/care/me',
      { method: 'GET' },
      {
        IDENTITY_DB: identityMock.db,
        DB: analysisMock.db,
        BETA_SIGNUP_HMAC_SALT: 'test',
        ENVIRONMENT: 'dev',
      },
    );
    expect(res.status).toBe(401);
  });

  it('diet.bmi.obese — BMI ≥ 30 attention', async () => {
    const { token, pseudonym } = issueTestToken(identityMock.state);
    seedReportWithSurvey(
      analysisMock.state,
      pseudonym,
      defaultSurvey({ heightCm: 170, weightKg: 100 }),
    );
    const res = await getMe(token);
    const data = (await res.json()) as CareResponse;
    const obese = data.diet.rules.find((r) => r.ruleId === 'diet.bmi.obese');
    expect(obese).toBeDefined();
    expect(obese?.severity).toBe('attention');
  });

  it('exercise.low — 주당 75분 미만 attention', async () => {
    const { token, pseudonym } = issueTestToken(identityMock.state);
    seedReportWithSurvey(
      analysisMock.state,
      pseudonym,
      defaultSurvey({ exerciseMinutesPerWeek: 30 }),
    );
    const res = await getMe(token);
    const data = (await res.json()) as CareResponse;
    const low = data.exercise.rules.find((r) => r.ruleId === 'exercise.low');
    expect(low).toBeDefined();
    expect(low?.severity).toBe('attention');
  });

  it('medical.smoking.current + medical.bp.high — 흡연 + 고혈압', async () => {
    const { token, pseudonym } = issueTestToken(identityMock.state);
    seedReportWithSurvey(
      analysisMock.state,
      pseudonym,
      defaultSurvey({ smoking: 'current', systolicBp: 150 }),
    );
    const res = await getMe(token);
    const data = (await res.json()) as CareResponse;
    expect(data.medical.rules.some((r) => r.ruleId === 'medical.smoking.current')).toBe(true);
    expect(data.medical.rules.some((r) => r.ruleId === 'medical.bp.high')).toBe(true);
  });

  it('medical.glucose.high — 공복 혈당 ≥ 126', async () => {
    const { token, pseudonym } = issueTestToken(identityMock.state);
    seedReportWithSurvey(
      analysisMock.state,
      pseudonym,
      defaultSurvey({ fastingGlucose: 140 }),
    );
    const res = await getMe(token);
    const data = (await res.json()) as CareResponse;
    expect(data.medical.rules.some((r) => r.ruleId === 'medical.glucose.high')).toBe(true);
  });

  it('locale 분기 — affiliates 제목이 영어로 반환', async () => {
    const { token, pseudonym } = issueTestToken(identityMock.state);
    seedReportWithSurvey(analysisMock.state, pseudonym, defaultSurvey());
    const res = await getMe(token, 'en');
    const data = (await res.json()) as CareResponse;
    const first = data.diet.affiliates[0];
    expect(first.title).toMatch(/[A-Za-z]/);
    expect(first.title).not.toMatch(/[가-힣]/);
  });

  it('회귀 — 금지 표현 미포함', async () => {
    const { token, pseudonym } = issueTestToken(identityMock.state);
    seedReportWithSurvey(analysisMock.state, pseudonym, defaultSurvey({ smoking: 'current', systolicBp: 150 }));
    const res = await getMe(token);
    const text = await res.text();
    for (const w of ['진단', '처방', '치료', '여명', '사망일', '죽음', 'D-day', 'diagnose', 'prescribe']) {
      expect(text.includes(w), `forbidden word: ${w}`).toBe(false);
    }
  });

  it('30대 건강 사용자 — medical.checkup.recommended 미포함', async () => {
    const { token, pseudonym } = issueTestToken(identityMock.state);
    seedReportWithSurvey(
      analysisMock.state,
      pseudonym,
      defaultSurvey({ birthYear: 1995 }),
    );
    const res = await getMe(token);
    const data = (await res.json()) as CareResponse;
    expect(data.medical.rules.some((r) => r.ruleId === 'medical.checkup.recommended')).toBe(false);
  });
});
