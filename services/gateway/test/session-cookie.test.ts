import { describe, it, expect, beforeEach } from 'vitest';
import app from '../src/index.js';
import { makeMockIdentityDb, makeMockAnalysisDb } from './helpers/mock-d1.js';
import { __clearIpRateLimit } from '../src/middleware/ip-rate-limit.js';

// ADR 0014 — httpOnly 세션 쿠키 발급 + 쿠키 기반 인증 + 로그아웃 revoke.
describe('ADR 0014 — 세션 쿠키', () => {
  let identityMock: ReturnType<typeof makeMockIdentityDb>;

  beforeEach(() => {
    identityMock = makeMockIdentityDb();
    __clearIpRateLimit();
  });

  const env = () => ({
    IDENTITY_DB: identityMock.db,
    DB: makeMockAnalysisDb().db,
    BETA_SIGNUP_HMAC_SALT: 'test',
    ENVIRONMENT: 'dev' as const,
  });

  const signup = () =>
    app.request(
      '/api/v1/auth/signup',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'cookie-test@example.com',
          password: 'StrongPass123!',
          consentMedical: true,
          consentTerms: true,
          consentPrivacy: true,
          consentTermsVersion: 'v1.0',
          consentPrivacyVersion: 'v1.0',
        }),
      },
      env(),
    );

  it('signup 시 chronos_session(HttpOnly) + chronos_uid 쿠키 발급', async () => {
    const r = await signup();
    expect(r.status).toBe(201);
    const cookies = r.headers.getSetCookie();
    const session = cookies.find((c) => c.startsWith('chronos_session='));
    const uid = cookies.find((c) => c.startsWith('chronos_uid='));
    expect(session).toBeDefined();
    expect(session!).toMatch(/HttpOnly/i);
    expect(session!).toMatch(/Secure/i);
    expect(session!).toMatch(/SameSite=Lax/i);
    expect(uid).toBeDefined();
    // 마커 쿠키는 JS 접근 가능해야 하므로 HttpOnly 아님.
    expect(uid!).not.toMatch(/HttpOnly/i);
  });

  it('쿠키만으로 보호 라우트(/me) 인증 — Authorization 헤더 없음', async () => {
    const r = await signup();
    const token = ((await r.json()) as { sessionToken: string }).sessionToken;

    const me = await app.request(
      '/api/v1/me',
      { headers: { Cookie: `chronos_session=${token}` } },
      env(),
    );
    expect(me.status).toBe(200);
    const data = (await me.json()) as { profile: { email: string } };
    expect(data.profile.email).toContain('@');
  });

  it('logout → 토큰 revoke → 이후 동일 쿠키 401', async () => {
    const r = await signup();
    const token = ((await r.json()) as { sessionToken: string }).sessionToken;

    const lo = await app.request(
      '/api/v1/auth/logout',
      { method: 'POST', headers: { Cookie: `chronos_session=${token}` } },
      env(),
    );
    expect(lo.status).toBe(200);
    const cleared = lo.headers.getSetCookie();
    expect(cleared.some((c) => c.startsWith('chronos_session='))).toBe(true);

    const me = await app.request(
      '/api/v1/me',
      { headers: { Cookie: `chronos_session=${token}` } },
      env(),
    );
    expect(me.status).toBe(401);
  });

  it('login 시에도 세션 쿠키 발급', async () => {
    await signup();
    const login = await app.request(
      '/api/v1/auth/login',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'cookie-test@example.com',
          password: 'StrongPass123!',
        }),
      },
      env(),
    );
    expect(login.status).toBe(200);
    const cookies = login.headers.getSetCookie();
    expect(cookies.some((c) => c.startsWith('chronos_session=') && /HttpOnly/i.test(c))).toBe(true);
  });
});
