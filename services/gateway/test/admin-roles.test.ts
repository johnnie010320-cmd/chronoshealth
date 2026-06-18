import { describe, it, expect, beforeEach } from 'vitest';
import app from '../src/index.js';
import {
  makeMockIdentityDb,
  makeMockAnalysisDb,
  issueTestToken,
  type MockD1State,
} from './helpers/mock-d1.js';
import { __clearIpRateLimit } from '../src/middleware/ip-rate-limit.js';

// 권한 체계 — superadmin 만 관리자 임명/해제, 개발 로그, 코인 내역.
describe('관리자 권한·개발로그', () => {
  let identity: ReturnType<typeof makeMockIdentityDb>;
  let analysis: ReturnType<typeof makeMockAnalysisDb>;
  let superToken: string;
  let adminToken: string;
  let userToken: string;

  function seed(state: MockD1State, pseudo: string, role: string, isSuper: number): void {
    state.users.push({
      user_pseudonym_id: pseudo,
      name: null, email: `${pseudo}@x.dev`, phone: null, birth_year: null, sex: null,
      nickname: null, role, is_super_admin: isSuper,
    });
  }

  beforeEach(() => {
    identity = makeMockIdentityDb();
    analysis = makeMockAnalysisDb();
    __clearIpRateLimit();
    seed(identity.state, 'super-1', 'admin', 1);
    seed(identity.state, 'admin-1', 'admin', 0);
    seed(identity.state, 'user-1', 'user', 0);
    superToken = issueTestToken(identity.state, { pseudonym: 'super-1' }).token;
    adminToken = issueTestToken(identity.state, { pseudonym: 'admin-1' }).token;
    userToken = issueTestToken(identity.state, { pseudonym: 'user-1' }).token;
  });

  const env = () => ({
    IDENTITY_DB: identity.db,
    DB: analysis.db,
    BETA_SIGNUP_HMAC_SALT: 'test',
    ENVIRONMENT: 'dev' as const,
  });
  const bearer = (t: string) => ({ Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' });

  it('whoami — superadmin 플래그 노출', async () => {
    const r = await app.request('/api/v1/admin/whoami', { headers: bearer(superToken) }, env());
    const data = (await r.json()) as { isAdmin: boolean; isSuperAdmin: boolean };
    expect(data.isAdmin).toBe(true);
    expect(data.isSuperAdmin).toBe(true);
  });

  it('일반 admin 은 superadmin 아님', async () => {
    const r = await app.request('/api/v1/admin/whoami', { headers: bearer(adminToken) }, env());
    const data = (await r.json()) as { isAdmin: boolean; isSuperAdmin: boolean };
    expect(data.isAdmin).toBe(true);
    expect(data.isSuperAdmin).toBe(false);
  });

  it('superadmin 이 user→admin 임명', async () => {
    const r = await app.request(
      '/api/v1/admin/users/user-1/role',
      { method: 'POST', headers: bearer(superToken), body: JSON.stringify({ role: 'admin' }) },
      env(),
    );
    expect(r.status).toBe(200);
    expect(identity.state.users.find((u) => u.user_pseudonym_id === 'user-1')?.role).toBe('admin');
  });

  it('일반 admin 의 역할 변경 시도는 403', async () => {
    const r = await app.request(
      '/api/v1/admin/users/user-1/role',
      { method: 'POST', headers: bearer(adminToken), body: JSON.stringify({ role: 'admin' }) },
      env(),
    );
    expect(r.status).toBe(403);
  });

  it('superadmin 행은 역할 변경 거부(409)', async () => {
    const r = await app.request(
      '/api/v1/admin/users/super-1/role',
      { method: 'POST', headers: bearer(superToken), body: JSON.stringify({ role: 'user' }) },
      env(),
    );
    expect(r.status).toBe(409);
  });

  it('개발 로그 추가 → 목록 노출', async () => {
    const add = await app.request(
      '/api/v1/admin/releases',
      {
        method: 'POST',
        headers: bearer(adminToken),
        body: JSON.stringify({ component: 'gateway', version: 'v1.2.3', notes: '메시징 추가' }),
      },
      env(),
    );
    expect(add.status).toBe(201);
    const list = await app.request('/api/v1/admin/releases', { headers: bearer(adminToken) }, env());
    const data = (await list.json()) as { releases: Array<{ version: string }> };
    expect(data.releases.length).toBe(1);
    expect(data.releases[0]!.version).toBe('v1.2.3');
  });

  it('회원 코인 내역 조회', async () => {
    // user-1 에게 적립 1건.
    await app.request(
      '/api/v1/admin/releases', // no-op warmup not needed; use ledger seed via direct state
      { headers: bearer(adminToken) },
      env(),
    );
    analysis.state.ledger.push({
      id: 1, user_pseudonym_id: 'user-1', txn_id: 't1', amount: 50,
      kind: 'survey_complete', source_ref: null, created_at: new Date().toISOString(),
    });
    const r = await app.request('/api/v1/admin/users/user-1/ledger', { headers: bearer(adminToken) }, env());
    expect(r.status).toBe(200);
    const data = (await r.json()) as { entries: Array<{ amount: number; kind: string }> };
    expect(data.entries.length).toBe(1);
    expect(data.entries[0]!.amount).toBe(50);
  });
});
