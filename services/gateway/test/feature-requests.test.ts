import { describe, it, expect, beforeEach } from 'vitest';
import app from '../src/index.js';
import { __clearRateLimit } from '../src/middleware/rate-limit.js';
import {
  makeMockIdentityDb,
  makeMockAnalysisDb,
  issueTestToken,
  type MockD1State,
} from './helpers/mock-d1.js';

// 기능 요청 및 버그 리포트 — 사용자 CRUD + 관리자 조회/검색/삭제/피드백.

type Item = {
  id: string;
  kind: 'feature' | 'bug';
  title: string;
  body: string;
  status: string;
  adminFeedback: string | null;
  authorNickname?: string | null;
};

describe('기능 요청 및 버그 리포트', () => {
  let identity: ReturnType<typeof makeMockIdentityDb>;
  let analysis: ReturnType<typeof makeMockAnalysisDb>;
  let adminToken: string;
  let userToken: string;
  let otherToken: string;

  function seedUser(
    state: MockD1State,
    pseudo: string,
    email: string,
    nickname: string | null,
  ): void {
    state.users.push({
      user_pseudonym_id: pseudo,
      name: null,
      email,
      phone: null,
      birth_year: null,
      sex: null,
      nickname,
      role: 'user',
    });
  }

  beforeEach(() => {
    identity = makeMockIdentityDb();
    analysis = makeMockAnalysisDb();
    __clearRateLimit();
    seedUser(identity.state, 'admin-1', 'admin@chronoshealth.dev', null);
    seedUser(identity.state, 'user-1', 'user@chronoshealth.dev', '홍길동');
    seedUser(identity.state, 'user-2', 'user2@chronoshealth.dev', null);
    adminToken = issueTestToken(identity.state, { pseudonym: 'admin-1' }).token;
    userToken = issueTestToken(identity.state, { pseudonym: 'user-1' }).token;
    otherToken = issueTestToken(identity.state, { pseudonym: 'user-2' }).token;
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

  const create = (token: string, body: unknown) =>
    app.request(
      '/api/v1/me/feature-requests',
      { method: 'POST', headers: bearer(token), body: JSON.stringify(body) },
      env(),
    );

  const listMine = (token: string) =>
    app.request(
      '/api/v1/me/feature-requests',
      { method: 'GET', headers: bearer(token) },
      env(),
    );

  const adminList = (token: string, query = '') =>
    app.request(
      `/api/v1/admin/feature-requests${query}`,
      { method: 'GET', headers: bearer(token) },
      env(),
    );

  async function newId(token: string, body: unknown): Promise<string> {
    const res = await create(token, body);
    expect(res.status).toBe(201);
    return ((await res.json()) as { item: Item }).item.id;
  }

  it('사용자가 기능 요청 생성 → 본인 목록에 노출', async () => {
    const res = await create(userToken, {
      kind: 'feature',
      title: '다크 모드 지원',
      body: '야간에 눈부심이 있어요.',
    });
    expect(res.status).toBe(201);
    const list = await listMine(userToken);
    const data = (await list.json()) as { items: Item[] };
    expect(data.items).toHaveLength(1);
    expect(data.items[0]!.title).toBe('다크 모드 지원');
    expect(data.items[0]!.status).toBe('open');
  });

  it('제목 2자 미만 → 400 INVALID_INPUT', async () => {
    const res = await create(userToken, { title: 'x', body: 'hi' });
    expect(res.status).toBe(400);
  });

  it('본인 글 수정 반영', async () => {
    const id = await newId(userToken, { title: '초안 제목', body: '초안' });
    const res = await app.request(
      `/api/v1/me/feature-requests/${id}`,
      {
        method: 'PATCH',
        headers: bearer(userToken),
        body: JSON.stringify({ title: '수정된 제목', kind: 'bug' }),
      },
      env(),
    );
    expect(res.status).toBe(200);
    const data = (await res.json()) as { item: Item };
    expect(data.item.title).toBe('수정된 제목');
    expect(data.item.kind).toBe('bug');
  });

  it('타인 글은 수정 불가 → 404', async () => {
    const id = await newId(userToken, { title: '내 글', body: '본문' });
    const res = await app.request(
      `/api/v1/me/feature-requests/${id}`,
      {
        method: 'PATCH',
        headers: bearer(otherToken),
        body: JSON.stringify({ title: '가로채기 시도' }),
      },
      env(),
    );
    expect(res.status).toBe(404);
  });

  it('본인 글 삭제 → 목록에서 사라짐', async () => {
    const id = await newId(userToken, { title: '삭제할 글', body: '본문' });
    const del = await app.request(
      `/api/v1/me/feature-requests/${id}`,
      { method: 'DELETE', headers: bearer(userToken) },
      env(),
    );
    expect(del.status).toBe(200);
    const list = await listMine(userToken);
    const data = (await list.json()) as { items: Item[] };
    expect(data.items).toHaveLength(0);
  });

  it('관리자 전체 조회 — 여러 사용자 글 + 작성자 닉네임(비-PII)', async () => {
    await newId(userToken, { title: '기능 A', body: 'aaa' });
    await newId(otherToken, { title: '버그 B', body: 'bbb', kind: 'bug' });
    const res = await adminList(adminToken);
    expect(res.status).toBe(200);
    const data = (await res.json()) as { items: Item[] };
    expect(data.items).toHaveLength(2);
    const mine = data.items.find((i) => i.title === '기능 A');
    expect(mine!.authorNickname).toBe('홍길동'); // user-1 닉네임 해석
    const other = data.items.find((i) => i.title === '버그 B');
    expect(other!.authorNickname).toBeNull(); // user-2 닉네임 없음
  });

  it('관리자 검색(q) — 제목/본문 부분일치', async () => {
    await newId(userToken, { title: '다크 모드', body: '야간' });
    await newId(userToken, { title: '알림 설정', body: '푸시' });
    const res = await adminList(adminToken, '?q=다크');
    const data = (await res.json()) as { items: Item[] };
    expect(data.items).toHaveLength(1);
    expect(data.items[0]!.title).toBe('다크 모드');
  });

  it('관리자 종류 필터(kind=bug)', async () => {
    await newId(userToken, { title: '기능요청', body: 'f', kind: 'feature' });
    await newId(userToken, { title: '버그리포트', body: 'b', kind: 'bug' });
    const res = await adminList(adminToken, '?kind=bug');
    const data = (await res.json()) as { items: Item[] };
    expect(data.items).toHaveLength(1);
    expect(data.items[0]!.kind).toBe('bug');
  });

  it('관리자 피드백 전송 → 사용자 목록에 반영', async () => {
    const id = await newId(userToken, { title: '요청', body: '본문' });
    const res = await app.request(
      `/api/v1/admin/feature-requests/${id}`,
      {
        method: 'PATCH',
        headers: bearer(adminToken),
        body: JSON.stringify({ feedback: '다음 릴리스에 반영 예정입니다.', status: 'planned' }),
      },
      env(),
    );
    expect(res.status).toBe(200);
    const list = await listMine(userToken);
    const data = (await list.json()) as { items: Item[] };
    expect(data.items[0]!.adminFeedback).toBe('다음 릴리스에 반영 예정입니다.');
    expect(data.items[0]!.status).toBe('planned');
  });

  it('관리자 삭제 → 사용자·관리자 목록에서 제거', async () => {
    const id = await newId(userToken, { title: '스팸글', body: 'x' });
    const del = await app.request(
      `/api/v1/admin/feature-requests/${id}`,
      { method: 'DELETE', headers: bearer(adminToken) },
      env(),
    );
    expect(del.status).toBe(200);
    const list = await adminList(adminToken);
    const data = (await list.json()) as { items: Item[] };
    expect(data.items).toHaveLength(0);
  });

  it('비관리자는 관리자 라우트 접근 불가 → 403', async () => {
    const res = await adminList(userToken);
    expect(res.status).toBe(403);
  });
});
