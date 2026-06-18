import { describe, it, expect, beforeEach } from 'vitest';
import app from '../src/index.js';
import {
  makeMockIdentityDb,
  makeMockAnalysisDb,
  issueTestToken,
  type MockD1State,
} from './helpers/mock-d1.js';
import { __clearIpRateLimit } from '../src/middleware/ip-rate-limit.js';

// R-Admin 공지사항 — 공개 조회 + 관리자 CRUD.
describe('R-Admin 공지사항', () => {
  let identity: ReturnType<typeof makeMockIdentityDb>;
  let analysis: ReturnType<typeof makeMockAnalysisDb>;
  let adminToken: string;
  let userToken: string;

  function seedUser(state: MockD1State, pseudo: string, email: string): void {
    state.users.push({
      user_pseudonym_id: pseudo,
      name: null, email, phone: null, birth_year: null, sex: null,
      nickname: null, role: 'user',
    });
  }

  beforeEach(() => {
    identity = makeMockIdentityDb();
    analysis = makeMockAnalysisDb();
    __clearIpRateLimit();
    seedUser(identity.state, 'admin-1', 'admin@chronoshealth.dev');
    seedUser(identity.state, 'user-1', 'user@chronoshealth.dev');
    adminToken = issueTestToken(identity.state, { pseudonym: 'admin-1' }).token;
    userToken = issueTestToken(identity.state, { pseudonym: 'user-1' }).token;
  });

  const env = () => ({
    IDENTITY_DB: identity.db,
    DB: analysis.db,
    BETA_SIGNUP_HMAC_SALT: 'test',
    ENVIRONMENT: 'dev' as const,
    ADMIN_PSEUDONYM_IDS: 'admin-1',
  });

  const bearer = (token: string) => ({
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  });

  it('관리자가 공지 생성 → 공개 목록에 노출', async () => {
    const create = await app.request(
      '/api/v1/admin/notices',
      {
        method: 'POST',
        headers: bearer(adminToken),
        body: JSON.stringify({ title: '점검 안내', body: '오늘 23시 점검', pinned: true, published: true }),
      },
      env(),
    );
    expect(create.status).toBe(201);

    const pub = await app.request('/api/v1/notices', { method: 'GET' }, env());
    expect(pub.status).toBe(200);
    const data = (await pub.json()) as { notices: Array<{ title: string; pinned: boolean }> };
    expect(data.notices.length).toBe(1);
    expect(data.notices[0]!.title).toBe('점검 안내');
    expect(data.notices[0]!.pinned).toBe(true);
  });

  it('미게시(published=false) 공지는 공개 목록에서 숨김', async () => {
    await app.request(
      '/api/v1/admin/notices',
      {
        method: 'POST',
        headers: bearer(adminToken),
        body: JSON.stringify({ title: '초안', body: '비공개', pinned: false, published: false }),
      },
      env(),
    );
    const pub = await app.request('/api/v1/notices', { method: 'GET' }, env());
    const data = (await pub.json()) as { notices: unknown[] };
    expect(data.notices.length).toBe(0);
  });

  it('비관리자는 공지 생성 403', async () => {
    const r = await app.request(
      '/api/v1/admin/notices',
      {
        method: 'POST',
        headers: bearer(userToken),
        body: JSON.stringify({ title: '제목', body: '본문', pinned: false, published: true }),
      },
      env(),
    );
    expect(r.status).toBe(403);
  });

  it('관리자 PATCH 로 게시 토글 → 공개 목록 반영', async () => {
    const create = await app.request(
      '/api/v1/admin/notices',
      {
        method: 'POST',
        headers: bearer(adminToken),
        body: JSON.stringify({ title: '공지 제목', body: '본문 내용', pinned: false, published: true }),
      },
      env(),
    );
    const id = ((await create.json()) as { notice: { id: string } }).notice.id;

    await app.request(
      `/api/v1/admin/notices/${id}`,
      { method: 'PATCH', headers: bearer(adminToken), body: JSON.stringify({ published: false }) },
      env(),
    );
    const pub = await app.request('/api/v1/notices', { method: 'GET' }, env());
    expect(((await pub.json()) as { notices: unknown[] }).notices.length).toBe(0);
  });

  it('관리자 DELETE', async () => {
    const create = await app.request(
      '/api/v1/admin/notices',
      {
        method: 'POST',
        headers: bearer(adminToken),
        body: JSON.stringify({ title: '공지 제목', body: '본문 내용', pinned: false, published: true }),
      },
      env(),
    );
    const id = ((await create.json()) as { notice: { id: string } }).notice.id;
    const del = await app.request(
      `/api/v1/admin/notices/${id}`,
      { method: 'DELETE', headers: bearer(adminToken) },
      env(),
    );
    expect(del.status).toBe(200);
    const pub = await app.request('/api/v1/notices', { method: 'GET' }, env());
    expect(((await pub.json()) as { notices: unknown[] }).notices.length).toBe(0);
  });
});
