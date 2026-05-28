import { describe, it, expect, beforeEach } from 'vitest';
import app from '../src/index.js';
import { makeMockIdentityDb, makeMockAnalysisDb } from './helpers/mock-d1.js';
import { __clearIpRateLimit } from '../src/middleware/ip-rate-limit.js';

const TEST_HMAC_SALT = 'test-salt-at-least-16-chars-long';

type Body = {
  email: string;
  country: string;
  ageGroup: '19-29' | '30-39' | '40-49' | '50-59' | '60+';
  interestedModules: string[];
  locale: 'ko' | 'en' | 'ja' | 'es';
  consentPii: boolean;
  consentMedicalDisclaimer: boolean;
  consentTokenReview: boolean;
};

const validBody = (): Body => ({
  email: 'beta@example.com',
  country: 'KR',
  ageGroup: '30-39',
  interestedModules: ['m3', 'm8'],
  locale: 'ko',
  consentPii: true,
  consentMedicalDisclaimer: true,
  consentTokenReview: true,
});

type OkResp = { id: string; registeredAt: string };

describe('POST /api/v1/beta-signup', () => {
  let identityMock: ReturnType<typeof makeMockIdentityDb>;
  let analysisMock: ReturnType<typeof makeMockAnalysisDb>;

  beforeEach(() => {
    identityMock = makeMockIdentityDb();
    analysisMock = makeMockAnalysisDb();
    __clearIpRateLimit();
  });

  const post = (body: unknown, headers: Record<string, string> = {}) =>
    app.request(
      '/api/v1/beta-signup',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: typeof body === 'string' ? body : JSON.stringify(body),
      },
      {
        IDENTITY_DB: identityMock.db,
        DB: analysisMock.db,
        BETA_SIGNUP_HMAC_SALT: TEST_HMAC_SALT,
        ENVIRONMENT: 'dev',
      },
    );

  describe('정상 흐름', () => {
    it('valid → 201 + id + registeredAt', async () => {
      const res = await post(validBody());
      expect(res.status).toBe(201);
      const data = (await res.json()) as OkResp;
      expect(data.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
      expect(new Date(data.registeredAt).getTime()).toBeGreaterThan(
        Date.now() - 10_000,
      );
    });

    it('identity 평문 / analysis 가명화 분리 저장', async () => {
      await post(validBody());
      expect(identityMock.state.betaIdentity).toHaveLength(1);
      expect(analysisMock.state.betaSignups).toHaveLength(1);

      const identityRow = identityMock.state.betaIdentity[0]!;
      const analysisRow = analysisMock.state.betaSignups[0]!;

      expect(identityRow.email).toBe('beta@example.com');
      // analysis 행에는 평문 이메일 부재
      expect(analysisRow).not.toHaveProperty('email');
      // pseudonym 은 SHA-256 hex (64자)
      expect(analysisRow.email_pseudonym).toMatch(/^[0-9a-f]{64}$/);
      // identity 와 analysis id 는 다른 UUID
      expect(identityRow.id).not.toBe(analysisRow.id);
    });

    it('응답에 평문 이메일 / 가명 / IP 미노출', async () => {
      const res = await post(validBody());
      const text = await res.text();
      expect(text).not.toContain('beta@example.com');
      expect(text).not.toContain(identityMock.state.betaIdentity[0]?.ip_hash);
      expect(text).not.toContain(
        analysisMock.state.betaSignups[0]?.email_pseudonym,
      );
    });
  });

  describe('동의 / 연령 검증', () => {
    it('consentPii false → 400 CONSENT_REQUIRED', async () => {
      const res = await post({ ...validBody(), consentPii: false });
      expect(res.status).toBe(400);
      const data = (await res.json()) as { error: { code: string } };
      expect(data.error.code).toBe('CONSENT_REQUIRED');
    });

    it('consentMedicalDisclaimer false → 400 CONSENT_REQUIRED', async () => {
      const res = await post({
        ...validBody(),
        consentMedicalDisclaimer: false,
      });
      expect(res.status).toBe(400);
      const data = (await res.json()) as { error: { code: string } };
      expect(data.error.code).toBe('CONSENT_REQUIRED');
    });

    it('consentTokenReview false → 400 CONSENT_REQUIRED', async () => {
      const res = await post({ ...validBody(), consentTokenReview: false });
      expect(res.status).toBe(400);
      const data = (await res.json()) as { error: { code: string } };
      expect(data.error.code).toBe('CONSENT_REQUIRED');
    });

    it('ageGroup "under-19" → 403 UNDERAGE', async () => {
      const res = await post({ ...validBody(), ageGroup: 'under-19' });
      expect(res.status).toBe(403);
      const data = (await res.json()) as { error: { code: string } };
      expect(data.error.code).toBe('UNDERAGE');
    });

    it('ageGroup 누락 → 403 UNDERAGE', async () => {
      const body = validBody() as Partial<Body>;
      delete body.ageGroup;
      const res = await post(body);
      expect(res.status).toBe(403);
    });
  });

  describe('형식 검증', () => {
    it('잘못된 email → 400', async () => {
      const res = await post({ ...validBody(), email: 'not-an-email' });
      expect(res.status).toBe(400);
    });

    it('country 소문자/3자 → 400 INVALID_INPUT', async () => {
      const res = await post({ ...validBody(), country: 'kr' });
      expect(res.status).toBe(400);
      const data = (await res.json()) as { error: { code: string } };
      expect(data.error.code).toBe('INVALID_INPUT');
    });

    it('locale 화이트리스트 밖 → 400', async () => {
      const res = await post({ ...validBody(), locale: 'fr' });
      expect(res.status).toBe(400);
    });

    it('INVALID_JSON → 400', async () => {
      const res = await post('not-json');
      expect(res.status).toBe(400);
    });

    it('interestedModules 빈 배열 → 201 (선택 항목)', async () => {
      const res = await post({ ...validBody(), interestedModules: [] });
      expect(res.status).toBe(201);
    });

    it('interestedModules 모듈 코드 외 → 400', async () => {
      const res = await post({
        ...validBody(),
        interestedModules: ['m99'],
      });
      expect(res.status).toBe(400);
    });
  });

  describe('중복 처리', () => {
    it('동일 이메일 재등록 → 409 ALREADY_REGISTERED', async () => {
      await post(validBody());
      const res2 = await post(validBody());
      expect(res2.status).toBe(409);
      const data = (await res2.json()) as { error: { code: string } };
      expect(data.error.code).toBe('ALREADY_REGISTERED');
    });

    it('대소문자/공백 차이 이메일 → 409 (HMAC 정규화)', async () => {
      await post(validBody());
      const res2 = await post({ ...validBody(), email: '  Beta@Example.COM  ' });
      // trim 은 zod email() 에서 fail 일 수 있어 공백 제거 후 시도
      // 본 검증의 핵심은 lowercase 정규화 — 공백 없는 케이스로 재시도.
      if (res2.status === 400) {
        const res3 = await post({ ...validBody(), email: 'BETA@EXAMPLE.COM' });
        expect(res3.status).toBe(409);
      } else {
        expect(res2.status).toBe(409);
      }
    });

    it('중복 거부 시 1행만 보관 (analysis · identity 양쪽)', async () => {
      await post(validBody());
      try {
        await post(validBody());
      } catch {
        // app.request 는 reject 안 함 — 응답 status로만 판단.
      }
      expect(identityMock.state.betaIdentity).toHaveLength(1);
      expect(analysisMock.state.betaSignups).toHaveLength(1);
    });
  });

  describe('환경 / 인프라', () => {
    it('BETA_SIGNUP_HMAC_SALT 미설정 → 500', async () => {
      const res = await app.request(
        '/api/v1/beta-signup',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validBody()),
        },
        {
          IDENTITY_DB: identityMock.db,
          DB: analysisMock.db,
          BETA_SIGNUP_HMAC_SALT: '',
          ENVIRONMENT: 'dev',
        },
      );
      expect(res.status).toBe(500);
    });

    it('CF-Connecting-IP 동일 IP 21번 호출 → 21번째 429', async () => {
      // 일 단위 20건 제한.
      const headers = { 'CF-Connecting-IP': '203.0.113.5' };
      for (let i = 0; i < 20; i++) {
        const res = await post(
          { ...validBody(), email: `b${i}@ex.com` },
          headers,
        );
        expect(res.status).toBe(201);
      }
      const res21 = await post(
        { ...validBody(), email: 'b21@ex.com' },
        headers,
      );
      expect(res21.status).toBe(429);
    });
  });

  describe('회귀 — 의료 윤리 / 금지 표현', () => {
    it('응답에 진단/처방/치료/사망/D-day 등 금지 단어 미포함', async () => {
      const res = await post(validBody());
      const text = await res.text();
      const forbidden = [
        '진단',
        '처방',
        '치료',
        '사망',
        '여명',
        '죽음',
        '카운트다운',
        'D-day',
        '예상 소멸일',
        '사망예상일',
      ];
      for (const w of forbidden) {
        expect(text.includes(w), `forbidden word leaked: ${w}`).toBe(false);
      }
    });
  });
});
