import { describe, it, expect, beforeEach } from 'vitest';
import app from '../src/index.js';
import { __clearRateLimit } from '../src/middleware/rate-limit.js';
import { __clearIpRateLimit } from '../src/middleware/ip-rate-limit.js';
import { MODEL_VERSION } from '../src/risk/index.js';
import {
  makeMockIdentityDb,
  makeMockAnalysisDb,
  issueTestToken,
} from './helpers/mock-d1.js';

type SurveyBody = {
  birthYear: number;
  sex: 'male' | 'female' | 'other';
  heightCm: number;
  weightKg: number;
  smoking: 'never' | 'former' | 'current';
  alcoholDrinksPerWeek: number;
  exerciseMinutesPerWeek: number;
  sleepHoursPerNight: number;
  systolicBp: number | null;
  diastolicBp: number | null;
  fastingGlucose: number | null;
  ldlCholesterol: number | null;
  hdlCholesterol: number | null;
  familyHistoryDiabetes: boolean;
  familyHistoryHypertension: boolean;
  familyHistoryCardiovascular: boolean;
  stressLevel: 'low' | 'medium' | 'high';
  selfRatedHealth: 'excellent' | 'good' | 'fair' | 'poor';
  consentToStore: boolean;
  consentToResearch: boolean;
};

const healthyMale30: SurveyBody = {
  birthYear: 1990,
  sex: 'male',
  heightCm: 175,
  weightKg: 70,
  smoking: 'never',
  alcoholDrinksPerWeek: 2,
  exerciseMinutesPerWeek: 200,
  sleepHoursPerNight: 7.5,
  systolicBp: 118,
  diastolicBp: 75,
  fastingGlucose: 88,
  ldlCholesterol: 100,
  hdlCholesterol: 60,
  familyHistoryDiabetes: false,
  familyHistoryHypertension: false,
  familyHistoryCardiovascular: false,
  stressLevel: 'low',
  selfRatedHealth: 'excellent',
  consentToStore: true,
  consentToResearch: false,
};

const riskyMale60: SurveyBody = {
  birthYear: 1960,
  sex: 'male',
  heightCm: 170,
  weightKg: 95,
  smoking: 'current',
  alcoholDrinksPerWeek: 18,
  exerciseMinutesPerWeek: 20,
  sleepHoursPerNight: 5.5,
  systolicBp: 158,
  diastolicBp: 96,
  fastingGlucose: 130,
  ldlCholesterol: 170,
  hdlCholesterol: 32,
  familyHistoryDiabetes: true,
  familyHistoryHypertension: true,
  familyHistoryCardiovascular: true,
  stressLevel: 'high',
  selfRatedHealth: 'poor',
  consentToStore: true,
  consentToResearch: false,
};

type ResponseShape = {
  reportId: string;
  generatedAt: string;
  modelVersion: string;
  bioAge: {
    value: number;
    chronologicalAge: number;
    ci95: [number, number];
    topContributors: Array<{
      factor: string;
      direction: 'accelerate' | 'decelerate';
      magnitude: number;
    }>;
  };
  diseaseRisk: Array<{
    code: string;
    label: string;
    probability5y: number;
    riskCategory: 'low' | 'moderate' | 'high';
    modifiableFactors: string[];
  }>;
  improvement: Array<{
    action: string;
    expectedBioAgeDeltaYears: number;
    confidence: 'low' | 'medium' | 'high';
  }>;
  disclaimer: string;
  hotlines: {
    suicidePrevention: string | null;
    mentalHealthCrisis: string | null;
  };
};

describe('POST /api/v1/risk-estimate (Slice 03 real model)', () => {
  let mock: ReturnType<typeof makeMockIdentityDb>;
  let analysis: ReturnType<typeof makeMockAnalysisDb>;
  let token: string;

  beforeEach(() => {
    __clearRateLimit();
    __clearIpRateLimit();
    mock = makeMockIdentityDb();
    analysis = makeMockAnalysisDb();
    token = issueTestToken(mock.state).token;
  });

  const post = async (
    body: unknown,
    overrideHeaders?: Record<string, string>,
  ): Promise<Response> =>
    app.request(
      '/api/v1/risk-estimate',
      {
        method: 'POST',
        headers: overrideHeaders ?? {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: typeof body === 'string' ? body : JSON.stringify(body),
      },
      { IDENTITY_DB: mock.db, DB: analysis.db, ENVIRONMENT: 'dev' },
    );

  describe('정상 흐름', () => {
    it('valid 입력 → 200 + modelVersion rs-v0.1.0', async () => {
      const res = await post(healthyMale30);
      expect(res.status).toBe(200);
      const data = (await res.json()) as ResponseShape;
      expect(data.modelVersion).toBe(MODEL_VERSION);
      expect(data.modelVersion).toBe('rs-v0.1.0');
      expect(data.disclaimer).toContain('의료 행위');
    });

    it('disease risk 5개 반환', async () => {
      const res = await post(healthyMale30);
      const data = (await res.json()) as ResponseShape;
      expect(data.diseaseRisk).toHaveLength(5);
      expect(
        data.diseaseRisk.every(
          (r) => r.probability5y >= 0 && r.probability5y <= 1,
        ),
      ).toBe(true);
    });

    it('bio age contributors 최대 3개, magnitude 0~1', async () => {
      const res = await post(healthyMale30);
      const data = (await res.json()) as ResponseShape;
      expect(data.bioAge.topContributors.length).toBeLessThanOrEqual(3);
      data.bioAge.topContributors.forEach((c) => {
        expect(c.magnitude).toBeGreaterThanOrEqual(0);
        expect(c.magnitude).toBeLessThanOrEqual(1);
        expect(['accelerate', 'decelerate']).toContain(c.direction);
      });
    });
  });

  describe('페르소나: 건강한 30대 남성', () => {
    it('bioAge ≤ chronological + 2년', async () => {
      const res = await post(healthyMale30);
      const data = (await res.json()) as ResponseShape;
      expect(data.bioAge.chronologicalAge).toBe(
        new Date().getFullYear() - 1990,
      );
      expect(data.bioAge.value).toBeLessThanOrEqual(
        data.bioAge.chronologicalAge + 2,
      );
    });

    it('CVD 위험 low + hotlines 미노출', async () => {
      const res = await post(healthyMale30);
      const data = (await res.json()) as ResponseShape;
      const cvd = data.diseaseRisk.find((r) => r.code === 'I20-I25');
      expect(cvd?.riskCategory).toBe('low');
      expect(data.hotlines.suicidePrevention).toBeNull();
      expect(data.hotlines.mentalHealthCrisis).toBeNull();
    });
  });

  describe('페르소나: 60대 남성 다중 위험', () => {
    it('bioAge > chronological 큰 폭', async () => {
      const res = await post(riskyMale60);
      const data = (await res.json()) as ResponseShape;
      expect(data.bioAge.value).toBeGreaterThan(
        data.bioAge.chronologicalAge + 5,
      );
    });

    it('CVD 위험 moderate 또는 high', async () => {
      const res = await post(riskyMale60);
      const data = (await res.json()) as ResponseShape;
      const cvd = data.diseaseRisk.find((r) => r.code === 'I20-I25');
      expect(['moderate', 'high']).toContain(cvd?.riskCategory ?? 'low');
    });

    it('금연 권고가 improvement에 포함', async () => {
      const res = await post(riskyMale60);
      const data = (await res.json()) as ResponseShape;
      expect(data.improvement.some((i) => i.action.includes('금연'))).toBe(true);
    });
  });

  describe('결정형 재현성', () => {
    it('동일 입력 5회 → bioAge / disease risk 동일', async () => {
      const results: ResponseShape[] = [];
      for (let i = 0; i < 5; i++) {
        __clearRateLimit();
        const res = await post(healthyMale30);
        results.push((await res.json()) as ResponseShape);
      }
      const first = results[0]!;
      results.slice(1).forEach((r) => {
        expect(r.bioAge.value).toBe(first.bioAge.value);
        expect(r.diseaseRisk.map((d) => d.probability5y)).toEqual(
          first.diseaseRisk.map((d) => d.probability5y),
        );
      });
    });
  });

  describe('누락 측정값 처리', () => {
    it('혈압 / 콜레스테롤 / 혈당 null → 보정 후 정상 응답', async () => {
      const missing: SurveyBody = {
        ...healthyMale30,
        systolicBp: null,
        diastolicBp: null,
        ldlCholesterol: null,
        hdlCholesterol: null,
        fastingGlucose: null,
      };
      const res = await post(missing);
      expect(res.status).toBe(200);
      const data = (await res.json()) as ResponseShape;
      expect(data.diseaseRisk).toHaveLength(5);
    });
  });

  describe('인증 / 연령 / 검증 (Slice 02 회귀)', () => {
    it('401 no auth', async () => {
      const res = await post(healthyMale30, {
        'Content-Type': 'application/json',
      });
      expect(res.status).toBe(401);
    });

    it('401 invalid token', async () => {
      const res = await post(healthyMale30, {
        'Content-Type': 'application/json',
        Authorization: 'Bearer not-a-real-token',
      });
      expect(res.status).toBe(401);
    });

    it('403 under 19', async () => {
      const tooYoung = {
        ...healthyMale30,
        birthYear: new Date().getFullYear() - 17,
      };
      const res = await post(tooYoung);
      expect(res.status).toBe(403);
    });

    it('400 invalid input', async () => {
      const res = await post({ ...healthyMale30, heightCm: 50 });
      expect(res.status).toBe(400);
    });

    it('400 future birthYear', async () => {
      const res = await post({ ...healthyMale30, birthYear: 2099 });
      expect(res.status).toBe(400);
    });

    it('400 invalid JSON', async () => {
      const res = await post('not-json');
      expect(res.status).toBe(400);
    });

    it('429 rate limit after 5', async () => {
      for (let i = 0; i < 5; i++) {
        const r = await post(healthyMale30);
        expect(r.status).toBe(200);
      }
      const r = await post(healthyMale30);
      expect(r.status).toBe(429);
    });
  });

  describe('규제 회귀 가드', () => {
    it('응답에 의료 금지 단어 없음', async () => {
      const res = await post(riskyMale60);
      const text = await res.text();
      expect(text).not.toMatch(
        /진단|처방|치료|여명|사망일|deathday|diagnose|prescribe/i,
      );
    });

    it('disclaimer 항상 포함', async () => {
      const res = await post(healthyMale30);
      const data = (await res.json()) as ResponseShape;
      expect(data.disclaimer.length).toBeGreaterThan(20);
    });
  });

  describe('Slice 05 — 저장 + 동의', () => {
    it('consentToStore=true → responses 1 + reports 1 + consent_log(store) 1', async () => {
      const res = await post({ ...healthyMale30, consentToStore: true, consentToResearch: false });
      expect(res.status).toBe(200);
      expect(analysis.state.responses).toHaveLength(1);
      expect(analysis.state.reports).toHaveLength(1);
      expect(analysis.state.consents).toHaveLength(1);
      expect(analysis.state.consents[0]!.consent_kind).toBe('store');
    });

    it('consentToStore=false → 분석 DB 부수효과 0', async () => {
      const res = await post({ ...healthyMale30, consentToStore: false, consentToResearch: false });
      expect(res.status).toBe(200);
      expect(analysis.state.responses).toHaveLength(0);
      expect(analysis.state.reports).toHaveLength(0);
      expect(analysis.state.consents).toHaveLength(0);
    });

    it('consentToResearch=true → consent_log에 store + research 2건', async () => {
      const res = await post({ ...healthyMale30, consentToStore: true, consentToResearch: true });
      expect(res.status).toBe(200);
      expect(analysis.state.consents).toHaveLength(2);
      const kinds = analysis.state.consents.map((c) => c.consent_kind).sort();
      expect(kinds).toEqual(['research', 'store']);
    });

    it('저장된 row는 모두 purpose_code=risk_estimate', async () => {
      await post({ ...healthyMale30, consentToStore: true, consentToResearch: true });
      expect(analysis.state.responses.every((r) => r.purpose_code === 'risk_estimate')).toBe(true);
      expect(analysis.state.reports.every((r) => r.purpose_code === 'risk_estimate')).toBe(true);
      expect(analysis.state.consents.every((c) => c.purpose_code === 'risk_estimate')).toBe(true);
    });

    it('reports.payload는 응답 JSON 전체 + reportId / generatedAt / modelVersion 매칭', async () => {
      const res = await post({ ...healthyMale30, consentToStore: true });
      const body = (await res.json()) as ResponseShape;
      const row = analysis.state.reports[0]!;
      expect(row.report_id).toBe(body.reportId);
      expect(row.generated_at).toBe(body.generatedAt);
      expect(row.model_version).toBe(body.modelVersion);
      const parsed = JSON.parse(row.payload) as ResponseShape;
      expect(parsed.bioAge.value).toBe(body.bioAge.value);
    });

    it('reports.response_id는 같은 트랜잭션의 responses.id 참조', async () => {
      await post({ ...healthyMale30, consentToStore: true });
      const respId = analysis.state.responses[0]!.id;
      expect(analysis.state.reports[0]!.response_id).toBe(respId);
    });

    it('저장된 row의 user_pseudonym_id = 토큰 발급 시 pseudonym', async () => {
      const pseudonym = mock.state.tokens[0]!.user_pseudonym_id;
      await post({ ...healthyMale30, consentToStore: true });
      expect(analysis.state.responses[0]!.user_pseudonym_id).toBe(pseudonym);
      expect(analysis.state.reports[0]!.user_pseudonym_id).toBe(pseudonym);
      expect(analysis.state.consents[0]!.user_pseudonym_id).toBe(pseudonym);
    });
  });
});

describe('GET /health', () => {
  it('200 ok', async () => {
    const res = await app.request('/health');
    expect(res.status).toBe(200);
  });
});

describe('CORS', () => {
  it('OPTIONS preflight allowed origin → 헤더 정상', async () => {
    const res = await app.request('/api/v1/risk-estimate', {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://chronoshealth.ever-day.com',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type,Authorization',
      },
    });
    expect(res.status).toBeLessThan(400);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(
      'https://chronoshealth.ever-day.com',
    );
  });

  it('unknown origin → CORS 헤더 없음', async () => {
    const res = await app.request('/api/v1/risk-estimate', {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://evil.example.com',
        'Access-Control-Request-Method': 'POST',
      },
    });
    expect(res.headers.get('Access-Control-Allow-Origin')).not.toBe(
      'https://evil.example.com',
    );
  });
});
