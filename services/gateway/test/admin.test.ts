import { describe, it, expect, beforeEach } from 'vitest';
import app from '../src/index.js';
import { __clearRateLimit } from '../src/middleware/rate-limit.js';
import {
  makeMockIdentityDb,
  makeMockAnalysisDb,
  issueTestToken,
} from './helpers/mock-d1.js';

describe('Admin API', () => {
  let identityMock: ReturnType<typeof makeMockIdentityDb>;
  let analysisMock: ReturnType<typeof makeMockAnalysisDb>;
  let adminPseudonym: string;

  beforeEach(() => {
    identityMock = makeMockIdentityDb();
    analysisMock = makeMockAnalysisDb();
    __clearRateLimit();
    adminPseudonym = '';
  });

  const env = (overrides?: {
    ADMIN_PSEUDONYM_IDS?: string;
    ADMIN_EMAILS?: string;
  }) => ({
    IDENTITY_DB: identityMock.db,
    DB: analysisMock.db,
    BETA_SIGNUP_HMAC_SALT: 'test',
    ENVIRONMENT: 'dev' as const,
    ADMIN_PSEUDONYM_IDS: overrides?.ADMIN_PSEUDONYM_IDS,
    ADMIN_EMAILS: overrides?.ADMIN_EMAILS,
  });

  function setupAdmin() {
    const tok = issueTestToken(identityMock.state);
    adminPseudonym = tok.pseudonym;
    identityMock.state.users.push({
      user_pseudonym_id: tok.pseudonym,
      name: '관리자',
      email: 'admin@chronos.test',
      phone: '010-9999-0000',
      birth_year: 1985,
      sex: 'male',
      created_at: new Date().toISOString(),
    });
    return tok;
  }

  const getStats = (token: string) =>
    app.request(
      '/api/v1/admin/stats',
      { method: 'GET', headers: { Authorization: `Bearer ${token}` } },
      env({ ADMIN_PSEUDONYM_IDS: adminPseudonym }),
    );

  const getUsers = (token: string, q = '') =>
    app.request(
      `/api/v1/admin/users${q}`,
      { method: 'GET', headers: { Authorization: `Bearer ${token}` } },
      env({ ADMIN_PSEUDONYM_IDS: adminPseudonym }),
    );

  const getUserDetail = (token: string, id: string, unmask = false) =>
    app.request(
      `/api/v1/admin/users/${id}${unmask ? '?unmask=1' : ''}`,
      { method: 'GET', headers: { Authorization: `Bearer ${token}` } },
      env({ ADMIN_PSEUDONYM_IDS: adminPseudonym }),
    );

  const getBetaSignups = (token: string) =>
    app.request(
      '/api/v1/admin/beta-signups',
      { method: 'GET', headers: { Authorization: `Bearer ${token}` } },
      env({ ADMIN_PSEUDONYM_IDS: adminPseudonym }),
    );

  const getWhoami = (token: string, adminList?: string) =>
    app.request(
      '/api/v1/admin/whoami',
      { method: 'GET', headers: { Authorization: `Bearer ${token}` } },
      env({ ADMIN_PSEUDONYM_IDS: adminList }),
    );

  it('whoami 200 — admin 미지정 사용자는 isAdmin=false', async () => {
    const { token } = issueTestToken(identityMock.state);
    const res = await getWhoami(token);
    expect(res.status).toBe(200);
    const data = (await res.json()) as { isAdmin: boolean };
    expect(data.isAdmin).toBe(false);
  });

  it('whoami 200 — pseudonym 화이트리스트 매칭 isAdmin=true', async () => {
    const { token, pseudonym } = issueTestToken(identityMock.state);
    const res = await getWhoami(token, pseudonym);
    const data = (await res.json()) as { isAdmin: boolean };
    expect(data.isAdmin).toBe(true);
  });

  it('whoami 200 — ADMIN_EMAILS 매칭 isAdmin=true', async () => {
    const { token, pseudonym } = issueTestToken(identityMock.state);
    identityMock.state.users.push({
      user_pseudonym_id: pseudonym,
      name: 'l2p',
      email: 'l2pamerica@gmail.com',
      phone: '010-1111-2222',
      birth_year: 1980,
      sex: 'male',
      created_at: new Date().toISOString(),
    });
    const res = await app.request(
      '/api/v1/admin/whoami',
      { method: 'GET', headers: { Authorization: `Bearer ${token}` } },
      env({ ADMIN_EMAILS: 'l2pamerica@gmail.com,tiffany3ct@gmail.com' }),
    );
    const data = (await res.json()) as { isAdmin: boolean };
    expect(data.isAdmin).toBe(true);
  });

  it('whoami 200 — ADMIN_EMAILS 대소문자 무시', async () => {
    const { token, pseudonym } = issueTestToken(identityMock.state);
    identityMock.state.users.push({
      user_pseudonym_id: pseudonym,
      name: 'tiffany',
      email: 'Tiffany3ct@Gmail.COM',
      phone: '010-3333-4444',
      birth_year: 1990,
      sex: 'female',
      created_at: new Date().toISOString(),
    });
    const res = await app.request(
      '/api/v1/admin/whoami',
      { method: 'GET', headers: { Authorization: `Bearer ${token}` } },
      env({ ADMIN_EMAILS: 'l2pamerica@gmail.com,tiffany3ct@gmail.com' }),
    );
    const data = (await res.json()) as { isAdmin: boolean };
    expect(data.isAdmin).toBe(true);
  });

  it('whoami 200 — ADMIN_EMAILS 미일치 isAdmin=false', async () => {
    const { token, pseudonym } = issueTestToken(identityMock.state);
    identityMock.state.users.push({
      user_pseudonym_id: pseudonym,
      name: 'other',
      email: 'other@example.com',
      phone: '010-5555-6666',
      birth_year: 1995,
      sex: 'other',
      created_at: new Date().toISOString(),
    });
    const res = await app.request(
      '/api/v1/admin/whoami',
      { method: 'GET', headers: { Authorization: `Bearer ${token}` } },
      env({ ADMIN_EMAILS: 'l2pamerica@gmail.com,tiffany3ct@gmail.com' }),
    );
    const data = (await res.json()) as { isAdmin: boolean };
    expect(data.isAdmin).toBe(false);
  });

  it('GET /stats 403 FORBIDDEN — 일반 사용자', async () => {
    const { token } = issueTestToken(identityMock.state);
    const res = await app.request(
      '/api/v1/admin/stats',
      { method: 'GET', headers: { Authorization: `Bearer ${token}` } },
      env({ ADMIN_PSEUDONYM_IDS: 'someone-else' }),
    );
    expect(res.status).toBe(403);
  });

  it('GET /stats 401 — 토큰 없음', async () => {
    const res = await app.request(
      '/api/v1/admin/stats',
      { method: 'GET' },
      env({ ADMIN_PSEUDONYM_IDS: 'whatever' }),
    );
    expect(res.status).toBe(401);
  });

  it('GET /stats 200 — 8 지표 반환', async () => {
    const adminTok = setupAdmin();
    const res = await getStats(adminTok.token);
    expect(res.status).toBe(200);
    const data = (await res.json()) as {
      stats: {
        totalUsers: number;
        totalBetaSignups: number;
        totalRiskReports: number;
        totalCommunityPosts: number;
        totalCommunityComments: number;
        totalLikes: number;
        totalLedgerEntries: number;
        totalLedgerSum: number;
      };
    };
    expect(data.stats.totalUsers).toBe(1);
    expect(data.stats.totalBetaSignups).toBe(0);
    expect(data.stats.totalLedgerSum).toBe(0);
  });

  it('GET /users 200 — 가입자 목록 (pseudonym + 가입일)', async () => {
    const adminTok = setupAdmin();
    // 추가 사용자
    const t2 = issueTestToken(identityMock.state);
    identityMock.state.users.push({
      user_pseudonym_id: t2.pseudonym,
      name: '홍길동',
      email: 'user@test',
      phone: '010-0000-1111',
      birth_year: 1990,
      sex: 'female',
      created_at: new Date().toISOString(),
    });
    const res = await getUsers(adminTok.token);
    expect(res.status).toBe(200);
    const data = (await res.json()) as {
      users: { userPseudonymId: string; createdAt: string }[];
    };
    expect(data.users.length).toBe(2);
  });

  it('GET /users 200 — search 필터 적용', async () => {
    const adminTok = setupAdmin();
    const t2 = issueTestToken(identityMock.state);
    identityMock.state.users.push({
      user_pseudonym_id: t2.pseudonym,
      name: 'X',
      email: 'x@x',
      phone: '010-0000-2222',
      birth_year: 1995,
      sex: 'other',
      created_at: new Date().toISOString(),
    });
    const res = await getUsers(adminTok.token, `?search=${t2.pseudonym.slice(0, 4)}`);
    const data = (await res.json()) as { users: { userPseudonymId: string }[] };
    expect(data.users.length).toBe(1);
    expect(data.users[0].userPseudonymId).toBe(t2.pseudonym);
  });

  it('GET /users/:id 200 unmask=0 — PII 마스킹', async () => {
    const adminTok = setupAdmin();
    const res = await getUserDetail(adminTok.token, adminPseudonym);
    expect(res.status).toBe(200);
    const data = (await res.json()) as {
      detail: { name: string | null; emailMasked: string | null; phoneMasked: string | null };
    };
    expect(data.detail.name).toBeNull();
    expect(data.detail.emailMasked).toMatch(/\*\*\*/);
    expect(data.detail.phoneMasked).toMatch(/\*\*\*/);
  });

  it('GET /users/:id 200 unmask=1 — PII 노출', async () => {
    const adminTok = setupAdmin();
    const res = await getUserDetail(adminTok.token, adminPseudonym, true);
    const data = (await res.json()) as {
      detail: { name: string | null; emailMasked: string | null };
    };
    expect(data.detail.name).toBe('관리자');
    expect(data.detail.emailMasked).toBe('admin@chronos.test');
  });

  it('GET /users/:id 404 NOT_FOUND', async () => {
    const adminTok = setupAdmin();
    const res = await getUserDetail(adminTok.token, 'no-such-id');
    expect(res.status).toBe(404);
  });

  it('GET /beta-signups 200 — 빈 목록', async () => {
    const adminTok = setupAdmin();
    const res = await getBetaSignups(adminTok.token);
    expect(res.status).toBe(200);
    const data = (await res.json()) as { signups: unknown[] };
    expect(data.signups).toEqual([]);
  });

  it('GET /beta-signups 200 — seed 베타 등록자 목록', async () => {
    const adminTok = setupAdmin();
    analysisMock.state.betaSignups.push({
      id: 'b1',
      email_pseudonym: 'hmac_abcdef',
      country: 'KR',
      age_group: '30-39',
      interested_modules: 'avatar,leaderboard',
      locale: 'ko',
      created_at: new Date().toISOString(),
    });
    const res = await getBetaSignups(adminTok.token);
    const data = (await res.json()) as {
      signups: { id: string; emailPseudonym: string; country: string }[];
    };
    expect(data.signups.length).toBe(1);
    expect(data.signups[0].emailPseudonym).toBe('hmac_abcdef');
  });

  // 2026-06-17 정책 변경(죠니 승인 / ADR 0003): admin 전용 목록은 회원 PII 를 평문 노출한다.
  // (admin 라우트는 adminMiddleware 로 보호되며, 비관리자/미인증은 별도 테스트에서 403/401 확인.)
  it('admin 사용자 목록은 평문 PII(이름·이메일·전화)를 포함한다', async () => {
    const adminTok = setupAdmin();
    const res = await getUsers(adminTok.token);
    const data = (await res.json()) as {
      users: Array<{
        name: string | null;
        nickname: string | null;
        email: string;
        phone: string | null;
        ledgerBalance: number;
      }>;
    };
    const me = data.users.find((u) => u.email === 'admin@chronos.test');
    expect(me).toBeDefined();
    expect(me!.email).toBe('admin@chronos.test');
    expect(me!.phone).toBe('010-9999-0000');
    expect(me!.name).toBe('관리자');
    expect(typeof me!.ledgerBalance).toBe('number');
  });
});
