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
  state: ReturnType<typeof makeMockAnalysisDb>['state'],
  pseudonym: string,
  bioAge = 35,
  chronologicalAge = 40,
  sex: 'male' | 'female' | 'other' = 'male',
) {
  const responseId = state.responses.length + 1;
  state.responses.push({
    id: responseId,
    user_pseudonym_id: pseudonym,
    purpose_code: 'risk_estimate',
    raw: {
      birth_year: new Date().getFullYear() - chronologicalAge,
      sex,
      stress_level: 'medium',
    },
  });
  const payload: RiskSurveyResponse = {
    reportId: crypto.randomUUID(),
    generatedAt: new Date().toISOString(),
    modelVersion: 'rs-v0.1.0',
    bioAge: { value: bioAge, chronologicalAge, ci95: [bioAge - 2, bioAge + 2], topContributors: [] },
    diseaseRisk: [
      { code: 'cvd', label: '', probability5y: 0.04, riskCategory: 'low', modifiableFactors: [] },
      { code: 'diabetes', label: '', probability5y: 0.03, riskCategory: 'low', modifiableFactors: [] },
      { code: 'ckd', label: '', probability5y: 0.02, riskCategory: 'low', modifiableFactors: [] },
      { code: 'dementia', label: '', probability5y: 0.01, riskCategory: 'low', modifiableFactors: [] },
      { code: 'cancer', label: '', probability5y: 0.03, riskCategory: 'low', modifiableFactors: [] },
    ],
    improvement: [],
    disclaimer: '본 리포트는 의료 행위를 대체할 수 없으며 건강 증진 참고용입니다.',
    hotlines: { suicidePrevention: null, mentalHealthCrisis: null },
  };
  state.reports.push({
    report_id: payload.reportId,
    response_id: responseId,
    user_pseudonym_id: pseudonym,
    purpose_code: 'risk_estimate',
    model_version: 'rs-v0.1.0',
    payload: JSON.stringify(payload),
    generated_at: payload.generatedAt,
  });
}

describe('GET /api/v1/leaderboard/me', () => {
  let identityMock: ReturnType<typeof makeMockIdentityDb>;
  let analysisMock: ReturnType<typeof makeMockAnalysisDb>;

  beforeEach(() => {
    identityMock = makeMockIdentityDb();
    analysisMock = makeMockAnalysisDb();
    __clearRateLimit();
  });

  const get = (q: string, token: string) =>
    app.request(
      `/api/v1/leaderboard/me?${q}`,
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

  it('200 — scope=world + 5종 등급 분포', async () => {
    const { token, pseudonym } = issueTestToken(identityMock.state);
    seedReport(analysisMock.state, pseudonym, 30, 35);
    const res = await get('scope=world', token);
    expect(res.status).toBe(200);
    const data = (await res.json()) as {
      scope: string;
      percentile: number;
      rankWithin: { value: number; total: number };
      tierDistribution: { excellent: number; good: number; fair: number; attention: number };
      modelVersion: string;
    };
    expect(data.scope).toBe('world');
    expect(data.percentile).toBeGreaterThan(0);
    expect(data.percentile).toBeLessThanOrEqual(100);
    expect(data.rankWithin.value).toBeGreaterThan(0);
    expect(data.modelVersion).toBe('lb-v0.1.0');
    const sum =
      data.tierDistribution.excellent +
      data.tierDistribution.good +
      data.tierDistribution.fair +
      data.tierDistribution.attention;
    expect(sum).toBe(data.rankWithin.total);
  });

  it('200 — scope=country&country=KR', async () => {
    const { token, pseudonym } = issueTestToken(identityMock.state);
    seedReport(analysisMock.state, pseudonym, 30, 35);
    const res = await get('scope=country&country=KR', token);
    expect(res.status).toBe(200);
    const data = (await res.json()) as { scope: string; country: string };
    expect(data.scope).toBe('country');
    expect(data.country).toBe('KR');
  });

  it('400 INVALID_SCOPE', async () => {
    const { token, pseudonym } = issueTestToken(identityMock.state);
    seedReport(analysisMock.state, pseudonym);
    const res = await get('scope=universe', token);
    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: { code: string } };
    expect(data.error.code).toBe('INVALID_SCOPE');
  });

  it('400 INVALID_COUNTRY — country 누락 + scope=country', async () => {
    const { token, pseudonym } = issueTestToken(identityMock.state);
    seedReport(analysisMock.state, pseudonym);
    const res = await get('scope=country', token);
    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: { code: string } };
    expect(data.error.code).toBe('INVALID_COUNTRY');
  });

  it('404 NO_REPORT', async () => {
    const { token } = issueTestToken(identityMock.state);
    const res = await get('scope=world', token);
    expect(res.status).toBe(404);
  });

  it('401 UNAUTHORIZED', async () => {
    const res = await app.request(
      '/api/v1/leaderboard/me?scope=world',
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

  it('회귀 — 의료 금지 표현 미포함', async () => {
    const { token, pseudonym } = issueTestToken(identityMock.state);
    seedReport(analysisMock.state, pseudonym);
    const res = await get('scope=world', token);
    const text = await res.text();
    for (const w of ['진단', '처방', '치료', 'D-day', '사망', '여명']) {
      expect(text.includes(w), `forbidden word: ${w}`).toBe(false);
    }
  });

  it('퍼센타일 — 낮은 bioAge (35 vs 40) → 상위 퍼센타일', async () => {
    const { token, pseudonym } = issueTestToken(identityMock.state);
    seedReport(analysisMock.state, pseudonym, 32, 40);
    const res = await get('scope=world', token);
    const data = (await res.json()) as { percentile: number; userVitalityScore: number };
    expect(data.userVitalityScore).toBeGreaterThan(70);
    expect(data.percentile).toBeGreaterThan(50);
  });
});
