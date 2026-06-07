import { describe, it, expect, beforeEach } from 'vitest';
import app from '../src/index.js';
import {
  makeMockIdentityDb,
  makeMockAnalysisDb,
} from './helpers/mock-d1.js';
import { __clearIpRateLimit } from '../src/middleware/ip-rate-limit.js';

describe('POST /api/v1/auth/login + set-password', () => {
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

  const signup = (body: Record<string, unknown>) =>
    app.request(
      '/api/v1/auth/signup',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
      env(),
    );

  const login = (email: string, password: string) =>
    app.request(
      '/api/v1/auth/login',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      },
      env(),
    );

  const setPassword = (email: string, password: string, phone: string) =>
    app.request(
      '/api/v1/auth/set-password',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, phone }),
      },
      env(),
    );

  const baseSignup = {
    email: 'login-test@example.com',
    password: 'StrongPass123!',
    consentMedical: true,
    consentTerms: true,
    consentPrivacy: true,
    consentTermsVersion: 'v1.0',
    consentPrivacyVersion: 'v1.0',
  };

  it('login 200 — 가입 후 동일 비밀번호로 로그인', async () => {
    const r = await signup(baseSignup);
    expect(r.status).toBe(201);
    const res = await login(baseSignup.email, baseSignup.password);
    expect(res.status).toBe(200);
    const data = (await res.json()) as { sessionToken: string };
    expect(data.sessionToken).toMatch(/^[A-Za-z0-9_-]{40,}$/);
  });

  it('login 401 INVALID_CREDENTIALS — 잘못된 비밀번호', async () => {
    await signup(baseSignup);
    const res = await login(baseSignup.email, 'WrongPass456!');
    expect(res.status).toBe(401);
    const data = (await res.json()) as { error: { code: string } };
    expect(data.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('login 401 INVALID_CREDENTIALS — 미가입 이메일 (존재 누설 차단)', async () => {
    const res = await login('nobody@example.com', 'AnyPass123!');
    expect(res.status).toBe(401);
  });

  it('login 409 PASSWORD_REQUIRED — 비밀번호 미설정 사용자', async () => {
    // 직접 push (legacy ADR 0010 사용자 시뮬레이션 — password_hash NULL)
    identityMock.state.users.push({
      user_pseudonym_id: 'legacy-pseudo',
      name: '구사용자',
      email: 'legacy@example.com',
      phone: '010-5555-1234',
      birth_year: 1985,
      sex: 'male',
      created_at: new Date().toISOString(),
      password_hash: null,
      password_salt: null,
      password_algo: null,
    });
    const res = await login('legacy@example.com', 'AnyPass123!');
    expect(res.status).toBe(409);
    const data = (await res.json()) as { error: { code: string } };
    expect(data.error.code).toBe('PASSWORD_REQUIRED');
  });

  it('login 400 INVALID_INPUT — 형식 오류', async () => {
    const res = await login('not-an-email', '');
    expect(res.status).toBe(400);
  });

  it('login 400 INVALID_JSON', async () => {
    const res = await app.request(
      '/api/v1/auth/login',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{not json',
      },
      env(),
    );
    expect(res.status).toBe(400);
  });

  it('signup → login → 회귀 — 응답에 평문 비밀번호 누출 0', async () => {
    await signup(baseSignup);
    const res = await login(baseSignup.email, baseSignup.password);
    const text = await res.text();
    expect(text).not.toContain(baseSignup.password);
  });

  it('signup 400 PASSWORD_TOO_SHORT', async () => {
    const res = await signup({ ...baseSignup, email: 'short@example.com', password: 'A1!' });
    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: { code: string } };
    expect(data.error.code).toBe('PASSWORD_TOO_SHORT');
  });

  it('signup 400 PASSWORD_KOREAN_NOT_ALLOWED', async () => {
    const res = await signup({ ...baseSignup, email: 'kor@example.com', password: '한글비밀번호1!' });
    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: { code: string } };
    expect(data.error.code).toBe('PASSWORD_KOREAN_NOT_ALLOWED');
  });

  it('signup 400 PASSWORD_NOT_COMPLEX — 2종만', async () => {
    const res = await signup({ ...baseSignup, email: 'simple@example.com', password: 'onlylowercase' });
    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: { code: string } };
    expect(data.error.code).toBe('PASSWORD_NOT_COMPLEX');
  });

  it('set-password 200 — legacy 사용자 비밀번호 설정', async () => {
    identityMock.state.users.push({
      user_pseudonym_id: 'legacy-2',
      name: '구사용자2',
      email: 'legacy2@example.com',
      phone: '010-7777-1234',
      birth_year: 1980,
      sex: 'female',
      created_at: new Date().toISOString(),
      password_hash: null,
      password_salt: null,
      password_algo: null,
    });
    const res = await setPassword('legacy2@example.com', 'NewPass456@', '010-7777-1234');
    expect(res.status).toBe(200);
    const data = (await res.json()) as { sessionToken: string };
    expect(data.sessionToken).toMatch(/^[A-Za-z0-9_-]{40,}$/);
    // 이후 로그인 가능
    const login2 = await login('legacy2@example.com', 'NewPass456@');
    expect(login2.status).toBe(200);
  });

  it('set-password 404 NOT_FOUND — email/phone 미일치', async () => {
    identityMock.state.users.push({
      user_pseudonym_id: 'legacy-3',
      name: '구사용자3',
      email: 'legacy3@example.com',
      phone: '010-8888-1234',
      birth_year: 1980,
      sex: 'female',
      created_at: new Date().toISOString(),
      password_hash: null,
      password_salt: null,
      password_algo: null,
    });
    const res = await setPassword('legacy3@example.com', 'NewPass456@', '010-0000-0000');
    expect(res.status).toBe(404);
  });

  it('set-password 409 ALREADY_SET — 이미 비밀번호 있는 사용자', async () => {
    await signup({ ...baseSignup, email: 'already@example.com' });
    // ADR 0013 후 signup은 phone 없음 → 본인정보 PUT 으로 phone 채우기
    const meRow = identityMock.state.users.find((u) => u.email === 'already@example.com');
    if (meRow) meRow.phone = '010-9999-9999';
    const res = await setPassword('already@example.com', 'NewPass456@', '010-9999-9999');
    expect(res.status).toBe(409);
  });
});
