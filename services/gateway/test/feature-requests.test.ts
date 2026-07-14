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
  hasImage?: boolean;
  imageType?: string | null;
  fileName?: string | null;
  linkUrl?: string | null;
  authorNickname?: string | null;
};

// 최소 인메모리 R2 — 라우트가 쓰는 put/get/delete 만 구현.
function makeMockR2() {
  const store = new Map<string, ArrayBuffer>();
  return {
    async put(key: string, value: ArrayBuffer) {
      store.set(key, value);
      return {};
    },
    async get(key: string) {
      const v = store.get(key);
      if (!v) return null;
      return { body: v };
    },
    async delete(key: string) {
      store.delete(key);
    },
    _store: store,
  };
}

describe('기능 요청 및 버그 리포트', () => {
  let identity: ReturnType<typeof makeMockIdentityDb>;
  let analysis: ReturnType<typeof makeMockAnalysisDb>;
  let adminToken: string;
  let userToken: string;
  let otherToken: string;
  let r2: ReturnType<typeof makeMockR2>;

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
    r2 = makeMockR2();
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
    ATTACHMENTS: r2 as unknown as R2Bucket,
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

  // ── 첨부: 링크 · 이미지 · 파일 ─────────────────────────────────────────────

  it('생성 시 링크 첨부 → 라운드트립', async () => {
    const res = await create(userToken, {
      title: '링크 포함',
      body: '참고',
      linkUrl: 'https://example.com/bug',
    });
    expect(res.status).toBe(201);
    const item = ((await res.json()) as { item: Item }).item;
    expect(item.linkUrl).toBe('https://example.com/bug');
  });

  it('잘못된 링크(http/https 아님) → 400', async () => {
    const res = await create(userToken, {
      title: '나쁜 링크',
      body: 'x',
      linkUrl: 'javascript:alert(1)',
    });
    expect(res.status).toBe(400);
  });

  const uploadImage = (token: string, id: string) => {
    const form = new FormData();
    form.append('file', new File([new Uint8Array([1, 2, 3])], 'shot.png', { type: 'image/png' }));
    return app.request(
      `/api/v1/me/feature-requests/${id}/image`,
      { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form },
      env(),
    );
  };

  it('이미지 업로드 → hasImage/imageType 설정, 소유자 스트림 200', async () => {
    const id = await newId(userToken, { title: '이미지', body: '스크린샷 첨부' });
    const up = await uploadImage(userToken, id);
    expect(up.status).toBe(200);
    const item = ((await up.json()) as { item: Item }).item;
    expect(item.hasImage).toBe(true);
    expect(item.imageType).toBe('image/png');

    const stream = await app.request(
      `/api/v1/me/feature-requests/${id}/image`,
      { method: 'GET', headers: { Authorization: `Bearer ${userToken}` } },
      env(),
    );
    expect(stream.status).toBe(200);
    expect(stream.headers.get('Content-Type')).toBe('image/png');
  });

  it('타인은 이미지 업로드/스트림 불가 → 404', async () => {
    const id = await newId(userToken, { title: '이미지', body: 'x' });
    const up = await uploadImage(otherToken, id);
    expect(up.status).toBe(404);
    await uploadImage(userToken, id);
    const stream = await app.request(
      `/api/v1/me/feature-requests/${id}/image`,
      { method: 'GET', headers: { Authorization: `Bearer ${otherToken}` } },
      env(),
    );
    expect(stream.status).toBe(404);
  });

  it('png/pdf 아닌 이미지 형식 → 415', async () => {
    const id = await newId(userToken, { title: '이미지', body: 'x' });
    const form = new FormData();
    form.append('file', new File([new Uint8Array([1])], 'a.gif', { type: 'image/gif' }));
    const up = await app.request(
      `/api/v1/me/feature-requests/${id}/image`,
      { method: 'POST', headers: { Authorization: `Bearer ${userToken}` }, body: form },
      env(),
    );
    expect(up.status).toBe(400);
    const data = (await up.json()) as { error: { code: string } };
    expect(data.error.code).toBe('UNSUPPORTED_FILE_TYPE');
  });

  it('PDF 파일 업로드 → fileName 설정, 스트림 200(pdf), 삭제 후 해제', async () => {
    const id = await newId(userToken, { title: '파일', body: '로그 첨부' });
    const form = new FormData();
    form.append('file', new File([new Uint8Array([37, 80, 68, 70])], 'log.pdf', { type: 'application/pdf' }));
    const up = await app.request(
      `/api/v1/me/feature-requests/${id}/file`,
      { method: 'POST', headers: { Authorization: `Bearer ${userToken}` }, body: form },
      env(),
    );
    expect(up.status).toBe(200);
    expect(((await up.json()) as { item: Item }).item.fileName).toBe('log.pdf');

    const stream = await app.request(
      `/api/v1/me/feature-requests/${id}/file`,
      { method: 'GET', headers: { Authorization: `Bearer ${userToken}` } },
      env(),
    );
    expect(stream.status).toBe(200);
    expect(stream.headers.get('Content-Type')).toBe('application/pdf');

    const del = await app.request(
      `/api/v1/me/feature-requests/${id}/file`,
      { method: 'DELETE', headers: { Authorization: `Bearer ${userToken}` } },
      env(),
    );
    expect(del.status).toBe(200);
    expect(((await del.json()) as { item: Item }).item.fileName).toBeNull();
  });

  it('관리자도 첨부 스트림 조회 가능 + 목록에 첨부 플래그', async () => {
    const id = await newId(userToken, { title: '관리자 조회', body: 'x', linkUrl: 'https://ex.com' });
    await uploadImage(userToken, id);

    const stream = await app.request(
      `/api/v1/admin/feature-requests/${id}/image`,
      { method: 'GET', headers: { Authorization: `Bearer ${adminToken}` } },
      env(),
    );
    expect(stream.status).toBe(200);

    const list = await adminList(adminToken);
    const item = ((await list.json()) as { items: Item[] }).items[0]!;
    expect(item.hasImage).toBe(true);
    expect(item.linkUrl).toBe('https://ex.com');
  });
});
