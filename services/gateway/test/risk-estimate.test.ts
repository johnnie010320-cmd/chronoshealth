import { describe, it, expect, beforeEach } from 'vitest';
import app from '../src/index.js';
import { __clearRateLimit } from '../src/middleware/rate-limit.js';

const validBody = {
  birthYear: 1990,
  sex: 'male',
  heightCm: 175,
  weightKg: 70,
  smoking: 'never',
  alcoholDrinksPerWeek: 0,
  exerciseMinutesPerWeek: 150,
  sleepHoursPerNight: 7,
  systolicBp: null,
  diastolicBp: null,
  fastingGlucose: null,
  ldlCholesterol: null,
  hdlCholesterol: null,
  familyHistoryDiabetes: false,
  familyHistoryHypertension: false,
  familyHistoryCardiovascular: false,
  stressLevel: 'low',
  selfRatedHealth: 'good',
  consentToStore: true,
  consentToResearch: false,
} as const;

const authHeaders = {
  'Content-Type': 'application/json',
  Authorization: 'Bearer test-token-123',
};

const post = async (
  body: unknown,
  headers: Record<string, string> = authHeaders,
): Promise<Response> =>
  app.request('/api/v1/risk-estimate', {
    method: 'POST',
    headers,
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });

describe('POST /api/v1/risk-estimate', () => {
  beforeEach(() => {
    __clearRateLimit();
  });

  describe('정상 흐름 (Positive)', () => {
    it('유효 입력 시 200 + mock 응답 구조', async () => {
      const res = await post(validBody);
      expect(res.status).toBe(200);
      const data = (await res.json()) as Record<string, unknown>;
      expect(data['modelVersion']).toBe('rs-mock-v0');
      expect(data['disclaimer']).toEqual(expect.stringContaining('의료 행위'));
      expect(data['reportId']).toEqual(expect.any(String));
      expect(data['diseaseRisk']).toBeInstanceOf(Array);
      expect(data['hotlines']).toMatchObject({
        suicidePrevention: null,
        mentalHealthCrisis: null,
      });
    });

    it('bioAge.chronologicalAge는 (현재년 - birthYear)와 일치', async () => {
      const res = await post(validBody);
      const data = (await res.json()) as {
        bioAge: { chronologicalAge: number };
      };
      const expected = new Date().getFullYear() - validBody.birthYear;
      expect(data.bioAge.chronologicalAge).toBe(expected);
    });
  });

  describe('인증 (401)', () => {
    it('Authorization 헤더 누락 시 401 UNAUTHORIZED', async () => {
      const res = await post(validBody, { 'Content-Type': 'application/json' });
      expect(res.status).toBe(401);
      const data = (await res.json()) as { error: { code: string } };
      expect(data.error.code).toBe('UNAUTHORIZED');
    });

    it('Bearer 접두사 누락 시 401', async () => {
      const res = await post(validBody, {
        'Content-Type': 'application/json',
        Authorization: 'test-token-123',
      });
      expect(res.status).toBe(401);
    });

    it('빈 토큰 시 401', async () => {
      const res = await post(validBody, {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ',
      });
      expect(res.status).toBe(401);
    });
  });

  describe('연령 차단 (403)', () => {
    it('만 19세 미만 → 403 AGE_RESTRICTED', async () => {
      const tooYoung = { ...validBody, birthYear: new Date().getFullYear() - 17 };
      const res = await post(tooYoung);
      expect(res.status).toBe(403);
      const data = (await res.json()) as { error: { code: string } };
      expect(data.error.code).toBe('AGE_RESTRICTED');
    });

    it('만 19세 경계값 (정확히 19세) → 200', async () => {
      const justAge = { ...validBody, birthYear: new Date().getFullYear() - 19 };
      const res = await post(justAge);
      expect(res.status).toBe(200);
    });
  });

  describe('입력 검증 (400)', () => {
    it('필수 필드 누락 시 400 INVALID_INPUT', async () => {
      const { birthYear: _b, ...rest } = validBody;
      const res = await post(rest);
      expect(res.status).toBe(400);
      const data = (await res.json()) as { error: { code: string } };
      expect(data.error.code).toBe('INVALID_INPUT');
    });

    it('범위 외 값 (heightCm 50) → 400', async () => {
      const res = await post({ ...validBody, heightCm: 50 });
      expect(res.status).toBe(400);
    });

    it('미래 연도 birthYear → 400 (CF Workers epoch 평가 타이밍 회귀 가드)', async () => {
      const future = { ...validBody, birthYear: 2099 };
      const res = await post(future);
      expect(res.status).toBe(400);
      const data = (await res.json()) as {
        error: { code: string; details?: unknown };
      };
      expect(data.error.code).toBe('INVALID_INPUT');
    });

    it('잘못된 JSON → 400 INVALID_JSON', async () => {
      const res = await post('not-json-at-all');
      expect(res.status).toBe(400);
      const data = (await res.json()) as { error: { code: string } };
      expect(data.error.code).toBe('INVALID_JSON');
    });
  });

  describe('호출 제한 (429)', () => {
    it('일 5회 통과 → 6번째에서 429 RATE_LIMITED', async () => {
      for (let i = 0; i < 5; i++) {
        const res = await post(validBody);
        expect(res.status).toBe(200);
      }
      const res = await post(validBody);
      expect(res.status).toBe(429);
      const data = (await res.json()) as { error: { code: string } };
      expect(data.error.code).toBe('RATE_LIMITED');
    });
  });

  describe('규제 회귀 가드', () => {
    it('응답에 의료 금지 단어가 포함되지 않음', async () => {
      const res = await post(validBody);
      const text = await res.text();
      expect(text).not.toMatch(
        /진단|처방|치료|여명|사망일|deathday|diagnose|prescribe/i,
      );
    });

    it('응답에 disclaimer 항상 포함', async () => {
      const res = await post(validBody);
      const data = (await res.json()) as { disclaimer?: string };
      expect(data.disclaimer).toBeTruthy();
      expect((data.disclaimer ?? '').length).toBeGreaterThan(20);
    });
  });
});

describe('GET /health', () => {
  it('200 ok', async () => {
    const res = await app.request('/health');
    expect(res.status).toBe(200);
    const data = (await res.json()) as { ok: boolean };
    expect(data.ok).toBe(true);
  });
});

describe('GET unknown', () => {
  it('404 NOT_FOUND', async () => {
    const res = await app.request('/no-such-path');
    expect(res.status).toBe(404);
    const data = (await res.json()) as { error: { code: string } };
    expect(data.error.code).toBe('NOT_FOUND');
  });
});
