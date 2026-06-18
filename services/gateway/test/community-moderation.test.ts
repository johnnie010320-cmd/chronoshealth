import { describe, it, expect, beforeEach } from 'vitest';
import app from '../src/index.js';
import {
  makeMockIdentityDb,
  makeMockAnalysisDb,
  issueTestToken,
  type MockD1State,
} from './helpers/mock-d1.js';
import { __clearIpRateLimit } from '../src/middleware/ip-rate-limit.js';

// R-Community owner 권한 — 공개/비공개, 관리자 위임, 댓글·글 모더레이션.
describe('R-Community owner 권한', () => {
  let identity: ReturnType<typeof makeMockIdentityDb>;
  let analysis: ReturnType<typeof makeMockAnalysisDb>;
  let ownerToken: string;
  let memberToken: string;
  let communityId: string;

  function seedUser(state: MockD1State, pseudo: string, nickname: string): void {
    state.users.push({
      user_pseudonym_id: pseudo,
      name: null, email: `${nickname}@x.dev`, phone: null, birth_year: null, sex: null,
      nickname, role: 'user',
    });
  }

  const env = () => ({
    IDENTITY_DB: identity.db,
    DB: analysis.db,
    BETA_SIGNUP_HMAC_SALT: 'test',
    ENVIRONMENT: 'dev' as const,
  });
  const bearer = (token: string) => ({
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  });

  beforeEach(async () => {
    identity = makeMockIdentityDb();
    analysis = makeMockAnalysisDb();
    __clearIpRateLimit();
    seedUser(identity.state, 'owner-1', 'owner');
    seedUser(identity.state, 'member-1', 'member');
    ownerToken = issueTestToken(identity.state, { pseudonym: 'owner-1' }).token;
    memberToken = issueTestToken(identity.state, { pseudonym: 'member-1' }).token;

    const create = await app.request(
      '/api/v1/community/communities',
      {
        method: 'POST',
        headers: bearer(ownerToken),
        body: JSON.stringify({ name: '건강 모임', description: '설명', visibility: 'public' }),
      },
      env(),
    );
    communityId = ((await create.json()) as { community: { id: string } }).community.id;
  });

  it('owner 가 공개→비공개 전환', async () => {
    const r = await app.request(
      `/api/v1/community/communities/${communityId}`,
      { method: 'PATCH', headers: bearer(ownerToken), body: JSON.stringify({ visibility: 'private' }) },
      env(),
    );
    expect(r.status).toBe(200);
    const data = (await r.json()) as { community: { visibility: string } };
    expect(data.community.visibility).toBe('private');
  });

  it('비-owner 의 PATCH 는 403', async () => {
    const r = await app.request(
      `/api/v1/community/communities/${communityId}`,
      { method: 'PATCH', headers: bearer(memberToken), body: JSON.stringify({ visibility: 'private' }) },
      env(),
    );
    expect(r.status).toBe(403);
  });

  it('owner 가 닉네임으로 커뮤니티 관리자 지정 → 목록 노출', async () => {
    const add = await app.request(
      `/api/v1/community/communities/${communityId}/admins`,
      { method: 'POST', headers: bearer(ownerToken), body: JSON.stringify({ nickname: 'member' }) },
      env(),
    );
    expect(add.status).toBe(200);
    const list = await app.request(
      `/api/v1/community/communities/${communityId}/admins`,
      { headers: bearer(ownerToken) },
      env(),
    );
    const data = (await list.json()) as { admins: Array<{ nickname: string }> };
    expect(data.admins.length).toBe(1);
    expect(data.admins[0]!.nickname).toBe('member');
  });

  it('커뮤니티 관리자가 타 회원 댓글 삭제', async () => {
    // member 를 커뮤니티 관리자로 지정.
    await app.request(
      `/api/v1/community/communities/${communityId}/admins`,
      { method: 'POST', headers: bearer(ownerToken), body: JSON.stringify({ nickname: 'member' }) },
      env(),
    );
    // owner 가 글 작성.
    const post = await app.request(
      '/api/v1/community/posts',
      {
        method: 'POST',
        headers: bearer(ownerToken),
        body: JSON.stringify({ communityId, title: '글 제목', body: '본문', videoUrl: null }),
      },
      env(),
    );
    const postId = ((await post.json()) as { post: { id: string } }).post.id;
    // member 가 댓글 작성.
    const cmt = await app.request(
      `/api/v1/community/posts/${postId}/comments`,
      { method: 'POST', headers: bearer(memberToken), body: JSON.stringify({ body: '댓글입니다' }) },
      env(),
    );
    const commentId = ((await cmt.json()) as { id: string }).id;
    // 커뮤니티 관리자(member)가 댓글 삭제.
    const del = await app.request(
      `/api/v1/community/communities/${communityId}/comments/${commentId}`,
      { method: 'DELETE', headers: bearer(memberToken) },
      env(),
    );
    expect(del.status).toBe(200);
    // 삭제 확인.
    const detail = await app.request(`/api/v1/community/posts/${postId}`, { headers: bearer(ownerToken) }, env());
    const data = (await detail.json()) as { comments: unknown[] };
    expect(data.comments.length).toBe(0);
  });

  it('권한 없는 회원의 글 모더레이션 삭제는 403', async () => {
    const post = await app.request(
      '/api/v1/community/posts',
      {
        method: 'POST',
        headers: bearer(ownerToken),
        body: JSON.stringify({ communityId, title: '글 제목', body: '본문', videoUrl: null }),
      },
      env(),
    );
    const postId = ((await post.json()) as { post: { id: string } }).post.id;
    const del = await app.request(
      `/api/v1/community/communities/${communityId}/posts/${postId}`,
      { method: 'DELETE', headers: bearer(memberToken) },
      env(),
    );
    expect(del.status).toBe(403);
  });
});
