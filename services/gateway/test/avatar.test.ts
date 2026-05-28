import { describe, it, expect, beforeEach } from 'vitest';
import app from '../src/index.js';
import { __clearRateLimit } from '../src/middleware/rate-limit.js';
import {
  makeMockIdentityDb,
  makeMockAnalysisDb,
  issueTestToken,
} from './helpers/mock-d1.js';
import type { RiskSurveyResponse } from '../src/schemas/risk-survey.js';

function seedReport(
  analysisState: ReturnType<typeof makeMockAnalysisDb>['state'],
  pseudonym: string,
  opts?: {
    bioAge?: number;
    chronologicalAge?: number;
    sex?: 'male' | 'female' | 'other';
    stressLevel?: 'low' | 'medium' | 'high';
  },
) {
  const bioAge = opts?.bioAge ?? 32;
  const chronologicalAge = opts?.chronologicalAge ?? 35;
  const birthYear = new Date().getFullYear() - chronologicalAge;
  const sex = opts?.sex ?? 'male';

  const responseId = analysisState.responses.length + 1;
  analysisState.responses.push({
    id: responseId,
    user_pseudonym_id: pseudonym,
    purpose_code: 'risk_estimate',
    raw: {
      birth_year: birthYear,
      sex,
      stress_level: opts?.stressLevel ?? 'medium',
    },
  });

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

describe('GET /api/v1/avatar/me', () => {
  let identityMock: ReturnType<typeof makeMockIdentityDb>;
  let analysisMock: ReturnType<typeof makeMockAnalysisDb>;

  beforeEach(() => {
    identityMock = makeMockIdentityDb();
    analysisMock = makeMockAnalysisDb();
    __clearRateLimit();
  });

  const getMe = (token: string) =>
    app.request(
      '/api/v1/avatar/me',
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      },
      {
        IDENTITY_DB: identityMock.db,
        DB: analysisMock.db,
        BETA_SIGNUP_HMAC_SALT: 'test',
        ENVIRONMENT: 'dev',
      },
    );

  it('200 — 활력 점수 + PYR + 5종 나이', async () => {
    const { token, pseudonym } = issueTestToken(identityMock.state);
    identityMock.state.users.push({
      user_pseudonym_id: pseudonym,
      name: '홍길동',
      email: 'h@example.com',
      phone: '010-1234-5678',
      birth_year: 1990,
      sex: 'male',
    });
    seedReport(analysisMock.state, pseudonym, { bioAge: 32, chronologicalAge: 35 });

    const res = await getMe(token);
    expect(res.status).toBe(200);
    const data = (await res.json()) as {
      name: string;
      vitalityScore: { value: number; tier: string };
      predictedYearsRemaining: { median: number; ci95: [number, number] };
      fiveAges: { life: number; vitality: number; skin: number; vascular: number; joint: number };
      modelVersion: string;
    };
    expect(data.name).toBe('홍길동');
    expect(data.vitalityScore.value).toBeGreaterThanOrEqual(0);
    expect(data.vitalityScore.value).toBeLessThanOrEqual(100);
    expect(['excellent', 'good', 'fair', 'attention']).toContain(data.vitalityScore.tier);
    expect(data.predictedYearsRemaining.ci95).toHaveLength(2);
    expect(data.fiveAges.life).toBeDefined();
    expect(data.modelVersion).toBe('rs-v0.1.0');
  });

  it('404 NO_REPORT — 리포트 없음', async () => {
    const { token } = issueTestToken(identityMock.state);
    const res = await getMe(token);
    expect(res.status).toBe(404);
    const data = (await res.json()) as { error: { code: string } };
    expect(data.error.code).toBe('NO_REPORT');
  });

  it('401 UNAUTHORIZED — 토큰 없음', async () => {
    const res = await app.request(
      '/api/v1/avatar/me',
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

  it('PII 격리 — name 외 PII 미노출', async () => {
    const { token, pseudonym } = issueTestToken(identityMock.state);
    identityMock.state.users.push({
      user_pseudonym_id: pseudonym,
      name: '홍길동',
      email: 'h@example.com',
      phone: '010-1234-5678',
      birth_year: 1990,
      sex: 'male',
    });
    seedReport(analysisMock.state, pseudonym);
    const res = await getMe(token);
    const text = await res.text();
    expect(text).not.toContain('h@example.com');
    expect(text).not.toContain('010-1234-5678');
  });

  it('회귀 — 응답에 의료 금지 표현 미포함', async () => {
    const { token, pseudonym } = issueTestToken(identityMock.state);
    identityMock.state.users.push({
      user_pseudonym_id: pseudonym,
      name: 'X',
      email: 'x@x.com',
      phone: '010-0000-0000',
      birth_year: 1990,
      sex: 'male',
    });
    seedReport(analysisMock.state, pseudonym);
    const res = await getMe(token);
    const text = await res.text();
    for (const w of ['진단', '처방', '치료', 'D-day', '사망일', '소멸일']) {
      expect(text.includes(w), `forbidden word: ${w}`).toBe(false);
    }
  });

  it('Vitality tier — excellent (낮은 바이오 나이 + 낮은 위험)', async () => {
    const { token, pseudonym } = issueTestToken(identityMock.state);
    identityMock.state.users.push({
      user_pseudonym_id: pseudonym,
      name: 'Y',
      email: 'y@y.com',
      phone: '010-1111-1111',
      birth_year: 1990,
      sex: 'female',
    });
    seedReport(analysisMock.state, pseudonym, {
      bioAge: 28,
      chronologicalAge: 35,
      stressLevel: 'low',
    });
    const res = await getMe(token);
    const data = (await res.json()) as { vitalityScore: { tier: string; value: number } };
    expect(data.vitalityScore.value).toBeGreaterThanOrEqual(70);
  });
});
