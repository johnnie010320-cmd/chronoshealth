import { describe, it, expect, beforeEach } from 'vitest';
import app from '../src/index.js';
import { makeMockIdentityDb, makeMockAnalysisDb } from './helpers/mock-d1.js';
import { __clearIpRateLimit } from '../src/middleware/ip-rate-limit.js';

type SignupBody = {
  name: string;
  email: string;
  phone: string;
  birthYear: number;
  sex: 'male' | 'female' | 'other';
  consentMedical: boolean;
  consentTerms: boolean;
};

const validBody = (): SignupBody => ({
  name: '홍길동',
  email: 'gildong@example.com',
  phone: '010-1234-5678',
  birthYear: 1990,
  sex: 'male',
  consentMedical: true,
  consentTerms: true,
});

type SignupOk = {
  userPseudonymId: string;
  sessionToken: string;
  expiresAt: string;
};

describe('POST /api/v1/auth/signup', () => {
  let mock: ReturnType<typeof makeMockIdentityDb>;

  beforeEach(() => {
    mock = makeMockIdentityDb();
    __clearIpRateLimit();
  });

  const post = (body: unknown, headers: Record<string, string> = {}) =>
    app.request(
      '/api/v1/auth/signup',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: typeof body === 'string' ? body : JSON.stringify(body),
      },
      { IDENTITY_DB: mock.db, DB: makeMockAnalysisDb().db, ENVIRONMENT: 'dev' },
    );

  describe('정상 흐름', () => {
    it('valid 입력 → 201 + pseudonym + token + expiresAt', async () => {
      const res = await post(validBody());
      expect(res.status).toBe(201);
      const data = (await res.json()) as SignupOk;
      expect(data.userPseudonymId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
      expect(data.sessionToken).toMatch(/^[A-Za-z0-9_-]{40,}$/);
      expect(new Date(data.expiresAt).getTime()).toBeGreaterThan(Date.now());
    });

    it('DB에 users + session_tokens + consent_log(medical+terms) 기록', async () => {
      const res = await post(validBody());
      expect(res.status).toBe(201);
      expect(mock.state.users).toHaveLength(1);
      expect(mock.state.tokens).toHaveLength(1);
      expect(mock.state.consents).toHaveLength(2);
      const kinds = mock.state.consents.map((c) => c.consent_kind).sort();
      expect(kinds).toEqual(['medical', 'terms']);
    });

    it('응답에 PII(name/email/phone/birthYear) 노출 없음', async () => {
      const res = await post(validBody());
      const text = await res.text();
      expect(text).not.toMatch(/홍길동|gildong@example\.com|010-1234-5678|1990/);
    });
  });

  describe('연령 / 동의 검증', () => {
    it('17세 → 403 AGE_RESTRICTED', async () => {
      const young = {
        ...validBody(),
        birthYear: new Date().getFullYear() - 17,
      };
      const res = await post(young);
      expect(res.status).toBe(403);
      const data = (await res.json()) as { error: { code: string } };
      expect(data.error.code).toBe('AGE_RESTRICTED');
    });

    it('consentMedical false → 403 CONSENT_REQUIRED', async () => {
      const res = await post({ ...validBody(), consentMedical: false });
      expect(res.status).toBe(403);
      const data = (await res.json()) as { error: { code: string } };
      expect(data.error.code).toBe('CONSENT_REQUIRED');
    });

    it('consentTerms false → 403 CONSENT_REQUIRED', async () => {
      const res = await post({ ...validBody(), consentTerms: false });
      expect(res.status).toBe(403);
      const data = (await res.json()) as { error: { code: string } };
      expect(data.error.code).toBe('CONSENT_REQUIRED');
    });
  });

  describe('형식 검증', () => {
    it('잘못된 email → 400', async () => {
      const res = await post({ ...validBody(), email: 'not-an-email' });
      expect(res.status).toBe(400);
    });

    it('잘못된 phone → 400', async () => {
      const res = await post({ ...validBody(), phone: '0101234' });
      expect(res.status).toBe(400);
    });

    it('이름 41자 → 400', async () => {
      const res = await post({ ...validBody(), name: 'a'.repeat(41) });
      expect(res.status).toBe(400);
    });

    it('이름 공백만 → 400', async () => {
      const res = await post({ ...validBody(), name: '   ' });
      expect(res.status).toBe(400);
    });

    it('INVALID_JSON → 400', async () => {
      const res = await post('not-json');
      expect(res.status).toBe(400);
    });

    it('국제 E.164 phone(+821012345678) → 201', async () => {
      const res = await post({ ...validBody(), phone: '+821012345678' });
      expect(res.status).toBe(201);
    });
  });

  describe('중복 처리', () => {
    it('동일 email 재가입 → 409 IDENTITY_EXISTS', async () => {
      await post(validBody());
      const res = await post({
        ...validBody(),
        phone: '010-9999-8888',
      });
      expect(res.status).toBe(409);
      const data = (await res.json()) as { error: { code: string } };
      expect(data.error.code).toBe('IDENTITY_EXISTS');
    });

    it('동일 phone 재가입 → 409 IDENTITY_EXISTS', async () => {
      await post(validBody());
      const res = await post({
        ...validBody(),
        email: 'other@example.com',
      });
      expect(res.status).toBe(409);
    });

    it('중복 거부 시 DB 부수효과 0 (롤백)', async () => {
      await post(validBody());
      const beforeUsers = mock.state.users.length;
      const beforeTokens = mock.state.tokens.length;
      const beforeConsents = mock.state.consents.length;
      const res = await post({
        ...validBody(),
        phone: '010-9999-8888',
      });
      expect(res.status).toBe(409);
      expect(mock.state.users).toHaveLength(beforeUsers);
      expect(mock.state.tokens).toHaveLength(beforeTokens);
      expect(mock.state.consents).toHaveLength(beforeConsents);
    });
  });

  describe('IP rate limit', () => {
    it('동일 IP 11회 → 429', async () => {
      const headers = { 'CF-Connecting-IP': '203.0.113.7' };
      for (let i = 0; i < 10; i++) {
        const r = await post(
          { ...validBody(), email: `user${i}@example.com`, phone: `010-1000-${1000 + i}` },
          headers,
        );
        expect([201, 409]).toContain(r.status);
      }
      const r = await post(validBody(), headers);
      expect(r.status).toBe(429);
    });
  });
});

describe('signup → risk-estimate 통합', () => {
  let mock: ReturnType<typeof makeMockIdentityDb>;

  beforeEach(() => {
    mock = makeMockIdentityDb();
    __clearIpRateLimit();
  });

  it('가입 발급 토큰 → /api/v1/risk-estimate 200', async () => {
    const signupRes = await app.request(
      '/api/v1/auth/signup',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validBody()),
      },
      { IDENTITY_DB: mock.db, DB: makeMockAnalysisDb().db, ENVIRONMENT: 'dev' },
    );
    expect(signupRes.status).toBe(201);
    const { sessionToken } = (await signupRes.json()) as SignupOk;

    const surveyBody = {
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

    const res = await app.request(
      '/api/v1/risk-estimate',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify(surveyBody),
      },
      { IDENTITY_DB: mock.db, DB: makeMockAnalysisDb().db, ENVIRONMENT: 'dev' },
    );
    expect(res.status).toBe(200);
  });

  it('mock 토큰("test-token-123") → 401 (mock auth 폐기 확인)', async () => {
    const surveyBody = { birthYear: 1990 };
    const res = await app.request(
      '/api/v1/risk-estimate',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token-123',
        },
        body: JSON.stringify(surveyBody),
      },
      { IDENTITY_DB: mock.db, DB: makeMockAnalysisDb().db, ENVIRONMENT: 'dev' },
    );
    expect(res.status).toBe(401);
  });
});
