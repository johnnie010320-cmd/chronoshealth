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
    expect(data.modelVersion).toBe('lb-v0.2.0');
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

  // ── 실측 분포(ECDF) 전환 — spec docs/spec/leaderboard.md §3 ──────────────

  // chronologicalAge 35 → bandFor(35) = '35-39'
  const BAND = '35-39';

  function seedSnapshots(
    state: ReturnType<typeof makeMockAnalysisDb>['state'],
    count: number,
    score: number,
    sex: 'male' | 'female' | 'other' = 'male',
    band = BAND,
  ) {
    for (let i = 0; i < count; i += 1) {
      state.vitalitySnapshots.push({
        user_pseudonym_id: `peer-${band}-${sex}-${i}`,
        vitality_score: score,
        age_band: band,
        sex,
        updated_at: new Date().toISOString(),
      });
    }
  }

  it('표본 미달 (본인 1명) → basis=modeled, sampleSize=null', async () => {
    const { token, pseudonym } = issueTestToken(identityMock.state);
    seedReport(analysisMock.state, pseudonym, 30, 35);
    const res = await get('scope=world', token);
    const data = (await res.json()) as { basis: string; sampleSize: number | null };
    expect(data.basis).toBe('modeled');
    expect(data.sampleSize).toBeNull();
  });

  it('표본 충족 (동일 셀 30+) → basis=empirical, 순위·분포가 표본 기준', async () => {
    const { token, pseudonym } = issueTestToken(identityMock.state);
    seedReport(analysisMock.state, pseudonym, 30, 35); // 본인: 활력 점수 높음
    // 같은 (35-39 × male) 셀에 낮은 점수 34명 → 본인이 1위여야 한다.
    seedSnapshots(analysisMock.state, 34, 40);

    const res = await get('scope=world', token);
    const data = (await res.json()) as {
      basis: string;
      sampleSize: number;
      percentile: number;
      rankWithin: { value: number; total: number };
      tierDistribution: { excellent: number; good: number; fair: number; attention: number };
    };
    expect(data.basis).toBe('empirical');
    expect(data.sampleSize).toBe(35); // 34 peers + 본인 upsert
    expect(data.rankWithin.total).toBe(35);
    expect(data.rankWithin.value).toBe(1); // 최고점
    expect(data.percentile).toBeGreaterThan(95);
    const sum =
      data.tierDistribution.excellent +
      data.tierDistribution.good +
      data.tierDistribution.fair +
      data.tierDistribution.attention;
    expect(sum).toBe(35);
  });

  it('표본 충족이라도 다른 셀(성별 상이)이면 집계에 포함되지 않는다', async () => {
    const { token, pseudonym } = issueTestToken(identityMock.state);
    seedReport(analysisMock.state, pseudonym, 30, 35, 'male');
    seedSnapshots(analysisMock.state, 50, 40, 'female'); // 다른 성별 셀
    const res = await get('scope=world', token);
    const data = (await res.json()) as { basis: string };
    expect(data.basis).toBe('modeled'); // male 셀 표본 = 본인 1명뿐
  });

  it('scope=country 는 표본이 충분해도 modeled (국가 미수집)', async () => {
    const { token, pseudonym } = issueTestToken(identityMock.state);
    seedReport(analysisMock.state, pseudonym, 30, 35);
    seedSnapshots(analysisMock.state, 40, 40);
    const res = await get('scope=country&country=KR', token);
    const data = (await res.json()) as { basis: string; sampleSize: number | null };
    expect(data.basis).toBe('modeled');
    expect(data.sampleSize).toBeNull();
  });

  it('upsert 멱등 — 두 번 조회해도 본인 표본은 1행', async () => {
    const { token, pseudonym } = issueTestToken(identityMock.state);
    seedReport(analysisMock.state, pseudonym, 30, 35);
    await get('scope=world', token);
    await get('scope=world', token);
    const mine = analysisMock.state.vitalitySnapshots.filter(
      (r) => r.user_pseudonym_id === pseudonym,
    );
    expect(mine).toHaveLength(1);
  });

  it('PII 회귀 — vitality_snapshots 는 pseudonym 외 식별자를 담지 않는다 (ADR 0003)', async () => {
    const { token, pseudonym } = issueTestToken(identityMock.state);
    seedReport(analysisMock.state, pseudonym, 30, 35);
    await get('scope=world', token);
    const row = analysisMock.state.vitalitySnapshots.find(
      (r) => r.user_pseudonym_id === pseudonym,
    );
    expect(row).toBeDefined();
    expect(Object.keys(row ?? {}).sort()).toEqual(
      ['age_band', 'sex', 'updated_at', 'user_pseudonym_id', 'vitality_score'].sort(),
    );
  });
});
