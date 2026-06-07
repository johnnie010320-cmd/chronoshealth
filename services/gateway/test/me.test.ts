import { describe, it, expect, beforeEach } from 'vitest';
import app from '../src/index.js';
import { __clearRateLimit } from '../src/middleware/rate-limit.js';
import {
  makeMockIdentityDb,
  makeMockAnalysisDb,
  issueTestToken,
} from './helpers/mock-d1.js';

describe('GET /api/v1/me', () => {
  let identityMock: ReturnType<typeof makeMockIdentityDb>;

  beforeEach(() => {
    identityMock = makeMockIdentityDb();
    __clearRateLimit();
  });

  const env = () => ({
    IDENTITY_DB: identityMock.db,
    DB: makeMockAnalysisDb().db,
    BETA_SIGNUP_HMAC_SALT: 'test',
    ENVIRONMENT: 'dev' as const,
  });

  const getMe = (token: string, reveal = false) =>
    app.request(
      `/api/v1/me${reveal ? '?reveal=1' : ''}`,
      { method: 'GET', headers: { Authorization: `Bearer ${token}` } },
      env(),
    );

  function seedUser() {
    const tok = issueTestToken(identityMock.state);
    identityMock.state.users.push({
      user_pseudonym_id: tok.pseudonym,
      name: '홍길동',
      email: 'gildong@example.com',
      phone: '010-1234-5678',
      birth_year: 1990,
      sex: 'male',
      created_at: '2026-05-30T12:00:00Z',
      nationality: 'KR',
      consent_terms_version: 'v1.0',
      consent_privacy_version: 'v1.0',
      consent_recorded_at: '2026-05-30T12:00:00Z',
    });
    return tok;
  }

  it('200 — 마스킹 기본', async () => {
    const tok = seedUser();
    const res = await getMe(tok.token);
    expect(res.status).toBe(200);
    const data = (await res.json()) as { profile: { name: string; email: string; phone: string; revealed: boolean } };
    expect(data.profile.name).not.toBe('홍길동');
    expect(data.profile.name).toMatch(/\*/);
    expect(data.profile.email).toMatch(/\*/);
    expect(data.profile.phone).toMatch(/\*/);
    expect(data.profile.revealed).toBe(false);
  });

  it('200 reveal=1 — 평문', async () => {
    const tok = seedUser();
    const res = await getMe(tok.token, true);
    const data = (await res.json()) as { profile: { name: string; email: string; phone: string; revealed: boolean } };
    expect(data.profile.name).toBe('홍길동');
    expect(data.profile.email).toBe('gildong@example.com');
    expect(data.profile.phone).toBe('010-1234-5678');
    expect(data.profile.revealed).toBe(true);
  });

  it('200 — 기본 정보 (국적·가입일·동의 버전)', async () => {
    const tok = seedUser();
    const res = await getMe(tok.token, true);
    const data = (await res.json()) as {
      profile: {
        birthYear: number;
        sex: string;
        nationality: string | null;
        createdAt: string;
        consentTermsVersion: string | null;
        consentPrivacyVersion: string | null;
      };
    };
    expect(data.profile.birthYear).toBe(1990);
    expect(data.profile.sex).toBe('male');
    expect(data.profile.nationality).toBe('KR');
    expect(data.profile.consentTermsVersion).toBe('v1.0');
    expect(data.profile.consentPrivacyVersion).toBe('v1.0');
  });

  it('401 UNAUTHORIZED — 토큰 없음', async () => {
    const res = await app.request('/api/v1/me', { method: 'GET' }, env());
    expect(res.status).toBe(401);
  });

  it('404 NOT_FOUND — 토큰은 유효하지만 users 행 없음', async () => {
    const tok = issueTestToken(identityMock.state);
    const res = await getMe(tok.token);
    expect(res.status).toBe(404);
  });

  it('회귀 — reveal=0 응답에 평문 PII 0', async () => {
    const tok = seedUser();
    const res = await getMe(tok.token);
    const text = await res.text();
    expect(text).not.toContain('홍길동');
    expect(text).not.toContain('gildong@example.com');
    expect(text).not.toContain('010-1234-5678');
  });
});
