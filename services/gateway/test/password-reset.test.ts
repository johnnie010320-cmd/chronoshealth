import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import app from '../src/index.js';
import { makeMockIdentityDb, makeMockAnalysisDb, issueTestToken } from './helpers/mock-d1.js';
import { __clearIpRateLimit } from '../src/middleware/ip-rate-limit.js';
import { hashResetToken } from '../src/auth/password-reset.js';

// 비밀번호 재설정(이메일 링크) — /api/v1/auth/password-reset/*
describe('POST /api/v1/auth/password-reset/*', () => {
  let identityMock: ReturnType<typeof makeMockIdentityDb>;
  let fetchMock: ReturnType<typeof vi.fn>;
  let mailEnv: { RESEND_API_KEY?: string; MAIL_FROM?: string };

  beforeEach(() => {
    identityMock = makeMockIdentityDb();
    __clearIpRateLimit();
    mailEnv = { RESEND_API_KEY: 're_test_key', MAIL_FROM: 'VITAcode <no-reply@vitacodeapp.com>' };
    fetchMock = vi.fn(async () => new Response(JSON.stringify({ id: 'mail_1' }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  const env = () => ({
    IDENTITY_DB: identityMock.db,
    DB: makeMockAnalysisDb().db,
    BETA_SIGNUP_HMAC_SALT: 'test',
    ENVIRONMENT: 'dev' as const,
    ...mailEnv,
  });

  const post = (path: string, body: unknown, headers: Record<string, string> = {}) =>
    app.request(
      path,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(body),
      },
      env(),
    );

  const EMAIL = 'reset-user@example.com';
  const OLD_PW = 'StrongPass123!';
  const NEW_PW = 'NewStrong456#';

  async function signup(email = EMAIL): Promise<string> {
    const r = await post('/api/v1/auth/signup', {
      email,
      password: OLD_PW,
      consentMedical: true,
      consentTerms: true,
      consentPrivacy: true,
      consentTermsVersion: 'v1.0',
      consentPrivacyVersion: 'v1.0',
    });
    expect(r.status).toBe(201);
    const data = (await r.json()) as { userPseudonymId: string };
    return data.userPseudonymId;
  }

  const requestReset = (email: string, headers?: Record<string, string>) =>
    post('/api/v1/auth/password-reset/request', { email, locale: 'ko' }, headers);

  // Resend 로 보낸 메일 본문에서 링크 토큰을 꺼낸다(DB 엔 해시만 있으므로 유일한 원문 경로).
  function sentLink(callIndex = 0): string {
    const call = fetchMock.mock.calls[callIndex] as [string, RequestInit];
    const body = JSON.parse(String(call[1].body)) as { text: string };
    const m = body.text.match(/https?:\/\/\S+\/reset-password\?token=[A-Za-z0-9_-]+/);
    if (!m) throw new Error('link not found');
    return m[0];
  }
  const tokenOf = (link: string) => new URL(link).searchParams.get('token') ?? '';

  it('알 수 없는 이메일 → 200 동일 응답, 토큰·메일 없음', async () => {
    const r = await requestReset('nobody@example.com');
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ ok: true });
    expect(identityMock.state.resetTokens).toHaveLength(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('가입 이메일 → 200 동일 응답, 해시만 저장, Resend 호출에 링크 포함', async () => {
    const pseudo = await signup();
    const r = await requestReset('Reset-User@Example.com'); // 대소문자 무관
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ ok: true });

    expect(identityMock.state.resetTokens).toHaveLength(1);
    const row = identityMock.state.resetTokens[0]!;
    expect(row.user_pseudonym_id).toBe(pseudo);
    expect(row.token_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(row.used_at).toBeNull();
    const ttl = Date.parse(row.expires_at) - Date.parse(row.created_at);
    expect(ttl).toBe(30 * 60 * 1000);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.resend.com/emails');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer re_test_key');
    const sent = JSON.parse(String(init.body)) as { to: string[]; from: string; html: string };
    expect(sent.to).toEqual([EMAIL]);
    expect(sent.from).toBe('VITAcode <no-reply@vitacodeapp.com>');

    const link = sentLink();
    expect(link.startsWith('https://vitacodeapp.com/reset-password?token=')).toBe(true);
    const token = tokenOf(link);
    // 원문은 DB 어디에도 없고, 해시만 일치.
    expect(JSON.stringify(identityMock.state.resetTokens)).not.toContain(token);
    expect(await hashResetToken(token)).toBe(row.token_hash);
  });

  it('Host 위조 — X-Forwarded-Host 가 허용 목록 밖이면 운영 도메인 링크', async () => {
    await signup();
    await requestReset(EMAIL, { 'X-Forwarded-Host': 'evil.example' });
    expect(sentLink().startsWith('https://vitacodeapp.com/')).toBe(true);
  });

  it('RESEND_API_KEY 없음 → 그래도 200 동일 응답 + logger 기록, 발송 없음', async () => {
    await signup();
    mailEnv = {};
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const r = await requestReset(EMAIL);
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ ok: true });
    expect(fetchMock).not.toHaveBeenCalled();
    const logged = errSpy.mock.calls.map((c) => String(c[0])).join('\n');
    expect(logged).toContain('password_reset.mail_failed');
    expect(logged).toContain('NOT_CONFIGURED');
    expect(logged).not.toContain(EMAIL); // PII 미기록
  });

  it('verify — 유효 토큰 200, 소모하지 않음 / 엉뚱한 토큰 400 RESET_TOKEN_INVALID', async () => {
    await signup();
    await requestReset(EMAIL);
    const token = tokenOf(sentLink());

    const ok = await post('/api/v1/auth/password-reset/verify', { token });
    expect(ok.status).toBe(200);
    expect(await ok.json()).toEqual({ valid: true });
    expect(identityMock.state.resetTokens[0]!.used_at).toBeNull();

    const bad = await post('/api/v1/auth/password-reset/verify', { token: 'x'.repeat(43) });
    expect(bad.status).toBe(400);
    expect(((await bad.json()) as { error: { code: string } }).error.code).toBe(
      'RESET_TOKEN_INVALID',
    );
  });

  it('confirm — 비밀번호 교체 + 기존 세션 전부 무효화 + 토큰 소모, 재사용은 RESET_TOKEN_USED', async () => {
    const pseudo = await signup();
    // 다른 기기 세션 2개 추가.
    issueTestToken(identityMock.state, { pseudonym: pseudo, token: 'other-device-1' });
    issueTestToken(identityMock.state, { pseudonym: pseudo, token: 'other-device-2' });
    expect(identityMock.state.tokens.filter((t) => t.user_pseudonym_id === pseudo).length).toBe(3);

    await requestReset(EMAIL);
    const token = tokenOf(sentLink());

    const r = await post('/api/v1/auth/password-reset/confirm', { token, password: NEW_PW });
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ ok: true });
    // 세션 쿠키 정리.
    expect(r.headers.get('set-cookie') ?? '').toContain('chronos_session=;');

    expect(identityMock.state.tokens.filter((t) => t.user_pseudonym_id === pseudo)).toHaveLength(0);
    expect(identityMock.state.resetTokens[0]!.used_at).not.toBeNull();

    const oldLogin = await post('/api/v1/auth/login', { email: EMAIL, password: OLD_PW });
    expect(oldLogin.status).toBe(401);
    const newLogin = await post('/api/v1/auth/login', { email: EMAIL, password: NEW_PW });
    expect(newLogin.status).toBe(200);

    const again = await post('/api/v1/auth/password-reset/confirm', {
      token,
      password: 'Another789$x',
    });
    expect(again.status).toBe(400);
    expect(((await again.json()) as { error: { code: string } }).error.code).toBe(
      'RESET_TOKEN_USED',
    );
    const stillNew = await post('/api/v1/auth/login', { email: EMAIL, password: NEW_PW });
    expect(stillNew.status).toBe(200);
  });

  it('만료 토큰 → verify·confirm 모두 RESET_TOKEN_EXPIRED, 비밀번호 유지', async () => {
    await signup();
    await requestReset(EMAIL);
    const token = tokenOf(sentLink());
    identityMock.state.resetTokens[0]!.expires_at = new Date(Date.now() - 1000).toISOString();

    const v = await post('/api/v1/auth/password-reset/verify', { token });
    expect(((await v.json()) as { error: { code: string } }).error.code).toBe(
      'RESET_TOKEN_EXPIRED',
    );
    const c = await post('/api/v1/auth/password-reset/confirm', { token, password: NEW_PW });
    expect(c.status).toBe(400);
    expect(((await c.json()) as { error: { code: string } }).error.code).toBe(
      'RESET_TOKEN_EXPIRED',
    );
    const login = await post('/api/v1/auth/login', { email: EMAIL, password: OLD_PW });
    expect(login.status).toBe(200);
  });

  it('약한 비밀번호 → 400 PASSWORD_NOT_COMPLEX, 토큰은 소모되지 않음', async () => {
    await signup();
    await requestReset(EMAIL);
    const token = tokenOf(sentLink());
    const r = await post('/api/v1/auth/password-reset/confirm', { token, password: 'abcdefgh' });
    expect(r.status).toBe(400);
    expect(((await r.json()) as { error: { code: string } }).error.code).toBe(
      'PASSWORD_NOT_COMPLEX',
    );
    expect(identityMock.state.resetTokens[0]!.used_at).toBeNull();
  });

  it('새 링크를 요청하면 이전 링크는 무효(RESET_TOKEN_USED)', async () => {
    await signup();
    await requestReset(EMAIL);
    const first = tokenOf(sentLink(0));
    await requestReset(EMAIL);
    const second = tokenOf(sentLink(1));
    expect(first).not.toBe(second);

    const v1 = await post('/api/v1/auth/password-reset/verify', { token: first });
    expect(((await v1.json()) as { error: { code: string } }).error.code).toBe('RESET_TOKEN_USED');
    const v2 = await post('/api/v1/auth/password-reset/verify', { token: second });
    expect(v2.status).toBe(200);
  });

  it('계정당 발급 한도 — 1시간 3회 초과분은 200 동일 응답이지만 발급·발송 없음', async () => {
    await signup();
    for (let i = 0; i < 4; i++) {
      const r = await requestReset(EMAIL);
      expect(r.status).toBe(200);
      expect(await r.json()).toEqual({ ok: true });
    }
    expect(identityMock.state.resetTokens).toHaveLength(3);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('이메일당 요청 한도 — 같은 이메일 6번째는 429 (계정 유무 무관)', async () => {
    for (let i = 0; i < 5; i++) {
      const r = await requestReset('ghost@example.com');
      expect(r.status).toBe(200);
    }
    const r = await requestReset('ghost@example.com');
    expect(r.status).toBe(429);
  });

  it('IP당 요청 한도 — 같은 IP 11번째는 429', async () => {
    const ip = { 'CF-Connecting-IP': '203.0.113.7' };
    for (let i = 0; i < 10; i++) {
      const r = await requestReset(`user${i}@example.com`, ip);
      expect(r.status).toBe(200);
    }
    const blocked = await requestReset('user99@example.com', ip);
    expect(blocked.status).toBe(429);
    // 다른 IP 는 영향 없음.
    const other = await requestReset('user99@example.com', { 'CF-Connecting-IP': '203.0.113.8' });
    expect(other.status).toBe(200);
  });

  it('구 지식기반 경로(/auth/reset-password)는 제거됨 → 404', async () => {
    await signup();
    const r = await post('/api/v1/auth/reset-password', {
      email: EMAIL,
      password: NEW_PW,
      phone: '010-1234-5678',
    });
    expect(r.status).toBe(404);
  });
});
