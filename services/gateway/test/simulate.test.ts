import { describe, it, expect, beforeEach } from 'vitest';
import app from '../src/index.js';
import { __clearRateLimit } from '../src/middleware/rate-limit.js';
import { __clearIpRateLimit } from '../src/middleware/ip-rate-limit.js';
import {
  makeMockIdentityDb,
  makeMockAnalysisDb,
  issueTestToken,
} from './helpers/mock-d1.js';

const baseRequest = {
  birthYear: 1980,
  sex: 'male' as const,
  heightCm: 175,
  weightKg: 88,
  smoking: 'current' as const,
  alcoholDrinksPerWeek: 15,
  exerciseMinutesPerWeek: 30,
  sleepHoursPerNight: 6,
  systolicBp: 140,
  diastolicBp: 90,
  fastingGlucose: 110,
  ldlCholesterol: 150,
  hdlCholesterol: 38,
  familyHistoryDiabetes: false,
  familyHistoryHypertension: true,
  familyHistoryCardiovascular: false,
  stressLevel: 'high' as const,
  selfRatedHealth: 'fair' as const,
  consentToStore: false,
  consentToResearch: false,
};

describe('POST /api/v1/simulate', () => {
  let identityMock: ReturnType<typeof makeMockIdentityDb>;
  let analysisMock: ReturnType<typeof makeMockAnalysisDb>;
  let token: string;

  beforeEach(() => {
    identityMock = makeMockIdentityDb();
    analysisMock = makeMockAnalysisDb();
    __clearRateLimit();
    __clearIpRateLimit();
    token = issueTestToken(identityMock.state).token;
  });

  const post = (body: unknown) =>
    app.request(
      '/api/v1/simulate',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: typeof body === 'string' ? body : JSON.stringify(body),
      },
      {
        IDENTITY_DB: identityMock.db,
        DB: analysisMock.db,
        BETA_SIGNUP_HMAC_SALT: 'test-salt-1234567890',
        ENVIRONMENT: 'dev',
      },
    );

  it('200 — overrides 적용 + delta 계산 (긍정 변경)', async () => {
    const res = await post({
      base: baseRequest,
      overrides: {
        smoking: 'never',
        exerciseMinutesPerWeek: 300,
        sleepHoursPerNight: 8,
        alcoholDrinksPerWeek: 2,
      },
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as {
      delta: { bioAgeYears: number; diseaseRiskPctPoints: { cvd: number } };
      baseline: unknown;
      simulated: unknown;
    };
    expect(data.baseline).toBeDefined();
    expect(data.simulated).toBeDefined();
    expect(data.delta.bioAgeYears).toBeLessThanOrEqual(0); // 더 젊어짐
  });

  it('200 — overrides 빈 객체 → baseline ≈ simulated, delta ≈ 0', async () => {
    const res = await post({ base: baseRequest, overrides: {} });
    expect(res.status).toBe(200);
    const data = (await res.json()) as { delta: { bioAgeYears: number } };
    expect(Math.abs(data.delta.bioAgeYears)).toBeLessThanOrEqual(0.1);
  });

  it('403 SMOKING_REGRESSION — never → current 금지', async () => {
    const res = await post({
      base: { ...baseRequest, smoking: 'never' as const },
      overrides: { smoking: 'current' as const },
    });
    expect(res.status).toBe(403);
    const data = (await res.json()) as { error: { code: string } };
    expect(data.error.code).toBe('SMOKING_REGRESSION');
  });

  it('403 AGE_RESTRICTED — 만 18세 미만', async () => {
    const young = {
      ...baseRequest,
      birthYear: new Date().getFullYear() - 17,
    };
    const res = await post({ base: young, overrides: {} });
    expect(res.status).toBe(403);
    const data = (await res.json()) as { error: { code: string } };
    expect(data.error.code).toBe('AGE_RESTRICTED');
  });

  it('400 INVALID_INPUT — overrides 범위 밖', async () => {
    const res = await post({
      base: baseRequest,
      overrides: { sleepHoursPerNight: 30 },
    });
    expect(res.status).toBe(400);
  });

  it('400 INVALID_JSON', async () => {
    const res = await post('not-json');
    expect(res.status).toBe(400);
  });

  it('401 UNAUTHORIZED — 토큰 누락', async () => {
    const res = await app.request(
      '/api/v1/simulate',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base: baseRequest, overrides: {} }),
      },
      {
        IDENTITY_DB: identityMock.db,
        DB: analysisMock.db,
        BETA_SIGNUP_HMAC_SALT: 'test',
        ENVIRONMENT: 'dev',
      },
    );
    expect(res.status).toBe(401);
  });

  it('회귀 — 응답에 의료 금지 표현 미포함', async () => {
    const res = await post({ base: baseRequest, overrides: { smoking: 'never' } });
    const text = await res.text();
    const forbidden = ['진단', '처방', '치료', '사망', '여명', 'D-day'];
    for (const w of forbidden) {
      expect(text.includes(w), `forbidden word: ${w}`).toBe(false);
    }
  });

  it('200 — delta.predictedYearsRemaining median + CI 산출', async () => {
    const res = await post({
      base: baseRequest,
      overrides: { exerciseMinutesPerWeek: 300, smoking: 'former' },
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as {
      delta: { predictedYearsRemaining: { median: number; ci95: [number, number] } };
    };
    expect(typeof data.delta.predictedYearsRemaining.median).toBe('number');
    expect(data.delta.predictedYearsRemaining.ci95).toHaveLength(2);
  });

  it('modelVersion = rs-v0.1.0', async () => {
    const res = await post({ base: baseRequest, overrides: {} });
    const data = (await res.json()) as { modelVersion: string };
    expect(data.modelVersion).toBe('rs-v0.1.0');
  });
});
