import { describe, it, expect, beforeEach } from 'vitest';
import app from '../src/index.js';
import { __clearRateLimit } from '../src/middleware/rate-limit.js';
import {
  makeMockIdentityDb,
  makeMockAnalysisDb,
  issueTestToken,
  type MockD1State,
} from './helpers/mock-d1.js';

// 신고·차단 (2026-11-08, migration 0047) — Google Play 사용자 제작 콘텐츠 정책.
describe('신고·차단', () => {
  let identity: ReturnType<typeof makeMockIdentityDb>;
  let analysis: ReturnType<typeof makeMockAnalysisDb>;
  let authorToken: string;
  let viewerToken: string;
  const authorId = 'pseudo-author';
  const viewerId = 'pseudo-viewer';

  function seedUser(state: MockD1State, pseudo: string, nickname: string): void {
    state.users.push({
      user_pseudonym_id: pseudo,
      name: null,
      email: `${nickname}@example.com`,
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
    seedUser(identity.state, authorId, 'author');
    seedUser(identity.state, viewerId, 'viewer');
    authorToken = issueTestToken(identity.state, { pseudonym: authorId }).token;
    viewerToken = issueTestToken(identity.state, { pseudonym: viewerId }).token;
  });

  const env = () => ({
    IDENTITY_DB: identity.db,
    DB: analysis.db,
    BETA_SIGNUP_HMAC_SALT: 'test',
    ENVIRONMENT: 'dev' as const,
  });

  const req = (token: string, path: string, method = 'GET', body?: unknown) =>
    app.request(
      path,
      {
        method,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      },
      env(),
    );

  async function createPost(): Promise<string> {
    const res = await req(authorToken, '/api/v1/community/posts', 'POST', {
      title: '테스트 글입니다',
      body: '본문 내용입니다.',
      videoUrl: null,
    });
    expect(res.status).toBe(200);
    return ((await res.json()) as { post: { id: string } }).post.id;
  }

  it('글 신고 — 저장되고 작성자는 서버가 채운다', async () => {
    const postId = await createPost();
    const res = await req(viewerToken, '/api/v1/safety/reports', 'POST', {
      targetType: 'post',
      targetId: postId,
      reason: 'spam',
    });
    expect(res.status).toBe(200);
    expect(analysis.state.contentReports).toHaveLength(1);
    expect(analysis.state.contentReports[0]?.owner).toBe(authorId);
    expect(analysis.state.contentReports[0]?.status).toBe('open');
  });

  it('자기 글은 신고·차단할 수 없다', async () => {
    const postId = await createPost();
    const r1 = await req(authorToken, '/api/v1/safety/reports', 'POST', { targetType: 'post', targetId: postId, reason: 'spam' });
    expect(r1.status).toBe(400);
    const r2 = await req(authorToken, '/api/v1/safety/blocks', 'POST', { targetType: 'post', targetId: postId });
    expect(r2.status).toBe(400);
  });

  it('없는 대상·잘못된 사유는 거절', async () => {
    const r1 = await req(viewerToken, '/api/v1/safety/reports', 'POST', { targetType: 'post', targetId: 'nope', reason: 'spam' });
    expect(r1.status).toBe(404);
    const postId = await createPost();
    const r2 = await req(viewerToken, '/api/v1/safety/reports', 'POST', { targetType: 'post', targetId: postId, reason: 'whatever' });
    expect(r2.status).toBe(400);
  });

  it('신고하면서 차단 → 글이 목록·상세에서 사라지고, 풀면 다시 보인다', async () => {
    const postId = await createPost();
    const before = (await (await req(viewerToken, '/api/v1/community/posts')).json()) as { posts: Array<{ id: string }> };
    expect(before.posts.map((p) => p.id)).toContain(postId);

    const rep = await req(viewerToken, '/api/v1/safety/reports', 'POST', {
      targetType: 'post',
      targetId: postId,
      reason: 'abuse',
      alsoBlock: true,
    });
    expect(rep.status).toBe(200);

    const after = (await (await req(viewerToken, '/api/v1/community/posts')).json()) as { posts: Array<{ id: string }> };
    expect(after.posts.map((p) => p.id)).not.toContain(postId);
    expect((await req(viewerToken, `/api/v1/community/posts/${postId}`)).status).toBe(404);
    // 차단당한 쪽에서도 차단한 사람과는 서로 안 보인다 — 댓글 달기 막힘
    const cm = await req(viewerToken, `/api/v1/community/posts/${postId}/comments`, 'POST', { body: '댓글' });
    expect(cm.status).toBe(403);

    const list = (await (await req(viewerToken, '/api/v1/safety/blocks')).json()) as {
      blocks: Array<{ pseudonymId: string; nickname: string | null }>;
    };
    expect(list.blocks).toEqual([expect.objectContaining({ pseudonymId: authorId, nickname: 'author' })]);

    expect((await req(viewerToken, `/api/v1/safety/blocks/${authorId}`, 'DELETE')).status).toBe(200);
    expect((await req(viewerToken, `/api/v1/community/posts/${postId}`)).status).toBe(200);
  });

  it('차단하면 1:1 대화를 열 수 없다', async () => {
    const postId = await createPost();
    await req(viewerToken, '/api/v1/safety/blocks', 'POST', { targetType: 'post', targetId: postId });
    const dm1 = await req(viewerToken, '/api/v1/messages/dm', 'POST', { nickname: 'author' });
    expect(dm1.status).toBe(403);
    const dm2 = await req(authorToken, '/api/v1/messages/dm', 'POST', { nickname: 'viewer' });
    expect(dm2.status).toBe(403);
  });

  it('관리자 신고 목록은 일반 회원에게 막혀 있다', async () => {
    const res = await req(viewerToken, '/api/v1/admin/reports');
    expect(res.status).toBe(403);
  });
});
