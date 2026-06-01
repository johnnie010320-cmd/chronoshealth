import { describe, it, expect, beforeEach } from 'vitest';
import app from '../src/index.js';
import { __clearRateLimit } from '../src/middleware/rate-limit.js';
import {
  makeMockIdentityDb,
  makeMockAnalysisDb,
  issueTestToken,
} from './helpers/mock-d1.js';

type PostWire = {
  id: string;
  userPseudonymId: string;
  title: string;
  body: string;
  videoUrl: string | null;
  createdAt: string;
  likeCount: number;
  commentCount: number;
};

describe('Community API', () => {
  let identityMock: ReturnType<typeof makeMockIdentityDb>;
  let analysisMock: ReturnType<typeof makeMockAnalysisDb>;

  beforeEach(() => {
    identityMock = makeMockIdentityDb();
    analysisMock = makeMockAnalysisDb();
    __clearRateLimit();
  });

  const env = () => ({
    IDENTITY_DB: identityMock.db,
    DB: analysisMock.db,
    BETA_SIGNUP_HMAC_SALT: 'test',
    ENVIRONMENT: 'dev' as const,
  });

  const createPost = (
    token: string,
    body: Partial<{ title: string; body: string; videoUrl: string | null }> = {},
  ) =>
    app.request(
      '/api/v1/community/posts',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: '오늘의 운동 기록',
          body: '오늘은 30분 조깅했습니다.',
          videoUrl: null,
          ...body,
        }),
      },
      env(),
    );

  const listPosts = (token: string) =>
    app.request('/api/v1/community/posts', { headers: { Authorization: `Bearer ${token}` } }, env());

  const getPost = (token: string, id: string) =>
    app.request(
      `/api/v1/community/posts/${id}`,
      { headers: { Authorization: `Bearer ${token}` } },
      env(),
    );

  const addComment = (token: string, postId: string, body = '좋은 글이네요') =>
    app.request(
      `/api/v1/community/posts/${postId}/comments`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ body }),
      },
      env(),
    );

  const toggleLike = (token: string, postId: string) =>
    app.request(
      `/api/v1/community/posts/${postId}/like`,
      { method: 'POST', headers: { Authorization: `Bearer ${token}` } },
      env(),
    );

  const getTrending = (token: string) =>
    app.request('/api/v1/community/trending', { headers: { Authorization: `Bearer ${token}` } }, env());

  const deletePost = (token: string, postId: string) =>
    app.request(
      `/api/v1/community/posts/${postId}`,
      { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } },
      env(),
    );

  it('POST /posts 200 — 텍스트만', async () => {
    const { token } = issueTestToken(identityMock.state);
    const res = await createPost(token);
    expect(res.status).toBe(200);
    const data = (await res.json()) as { post: PostWire };
    expect(data.post.title).toBe('오늘의 운동 기록');
    expect(data.post.videoUrl).toBeNull();
    expect(data.post.likeCount).toBe(0);
  });

  it('POST /posts 200 — YouTube URL 허용', async () => {
    const { token } = issueTestToken(identityMock.state);
    const res = await createPost(token, {
      videoUrl: 'https://www.youtube.com/watch?v=abc123',
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as { post: PostWire };
    expect(data.post.videoUrl).toContain('youtube.com');
  });

  it('POST /posts 400 INVALID_VIDEO_URL — 임의 도메인 차단', async () => {
    const { token } = issueTestToken(identityMock.state);
    const res = await createPost(token, {
      videoUrl: 'https://example.com/video.mp4',
    });
    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: { code: string } };
    expect(data.error.code).toBe('INVALID_VIDEO_URL');
  });

  it('POST /posts 400 FORBIDDEN_KEYWORD — 금지 단어 본문', async () => {
    const { token } = issueTestToken(identityMock.state);
    const res = await createPost(token, { body: '진단을 받아야 합니다' });
    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: { code: string } };
    expect(data.error.code).toBe('FORBIDDEN_KEYWORD');
  });

  it('POST /posts 400 INVALID_INPUT — title 너무 짧음', async () => {
    const { token } = issueTestToken(identityMock.state);
    const res = await createPost(token, { title: 'A' });
    expect(res.status).toBe(400);
  });

  it('POST /posts 401 UNAUTHORIZED', async () => {
    const res = await app.request(
      '/api/v1/community/posts',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'x', body: 'y', videoUrl: null }),
      },
      env(),
    );
    expect(res.status).toBe(401);
  });

  it('GET /posts 200 — 최신순 정렬', async () => {
    const { token } = issueTestToken(identityMock.state);
    await createPost(token, { title: '첫 글' });
    await new Promise((r) => setTimeout(r, 5));
    await createPost(token, { title: '둘째 글' });
    const res = await listPosts(token);
    const data = (await res.json()) as { posts: PostWire[] };
    expect(data.posts[0].title).toBe('둘째 글');
    expect(data.posts[1].title).toBe('첫 글');
  });

  it('GET /posts/:id 404 NOT_FOUND', async () => {
    const { token } = issueTestToken(identityMock.state);
    const res = await getPost(token, 'no-such-id');
    expect(res.status).toBe(404);
  });

  it('GET /posts/:id 200 — 게시물 + 댓글 목록', async () => {
    const { token } = issueTestToken(identityMock.state);
    const r = await createPost(token);
    const { post } = (await r.json()) as { post: PostWire };
    await addComment(token, post.id);
    await addComment(token, post.id, '저도 시작해야겠어요');
    const res = await getPost(token, post.id);
    const data = (await res.json()) as { post: PostWire; comments: { body: string }[] };
    expect(data.post.commentCount).toBe(2);
    expect(data.comments.length).toBe(2);
  });

  it('POST /posts/:id/comments 400 FORBIDDEN_KEYWORD', async () => {
    const { token } = issueTestToken(identityMock.state);
    const r = await createPost(token);
    const { post } = (await r.json()) as { post: PostWire };
    const res = await addComment(token, post.id, '치료법을 알려주세요');
    expect(res.status).toBe(400);
  });

  it('POST /posts/:id/like 200 — toggle on/off', async () => {
    const { token } = issueTestToken(identityMock.state);
    const r = await createPost(token);
    const { post } = (await r.json()) as { post: PostWire };
    const on = await toggleLike(token, post.id);
    expect(on.status).toBe(200);
    expect((await on.json()).liked).toBe(true);
    const off = await toggleLike(token, post.id);
    expect((await off.json()).liked).toBe(false);
  });

  it('POST /posts/:id/like 404 — 없는 게시물', async () => {
    const { token } = issueTestToken(identityMock.state);
    const res = await toggleLike(token, 'no-such-id');
    expect(res.status).toBe(404);
  });

  it('GET /trending 200 — 좋아요 많은 게시물 우선', async () => {
    const a = issueTestToken(identityMock.state);
    const b = issueTestToken(identityMock.state);
    const c = issueTestToken(identityMock.state);
    const r1 = await createPost(a.token, { title: 'A 게시물' });
    const r2 = await createPost(a.token, { title: 'B 게시물' });
    const p1 = ((await r1.json()) as { post: PostWire }).post;
    const p2 = ((await r2.json()) as { post: PostWire }).post;
    await toggleLike(b.token, p2.id);
    await toggleLike(c.token, p2.id);
    await toggleLike(b.token, p1.id);
    const res = await getTrending(a.token);
    const data = (await res.json()) as { posts: PostWire[] };
    expect(data.posts[0].id).toBe(p2.id);
    expect(data.posts[0].likeCount).toBe(2);
  });

  it('DELETE /posts/:id 200 — 본인 게시물', async () => {
    const { token } = issueTestToken(identityMock.state);
    const r = await createPost(token);
    const { post } = (await r.json()) as { post: PostWire };
    const del = await deletePost(token, post.id);
    expect(del.status).toBe(200);
    const get = await getPost(token, post.id);
    expect(get.status).toBe(404);
  });

  it('DELETE /posts/:id 404 — 타인 게시물', async () => {
    const a = issueTestToken(identityMock.state);
    const b = issueTestToken(identityMock.state);
    const r = await createPost(a.token);
    const { post } = (await r.json()) as { post: PostWire };
    const res = await deletePost(b.token, post.id);
    expect(res.status).toBe(404);
  });

  it('회귀 — 게시물 응답에 PII 미노출', async () => {
    const { token, pseudonym } = issueTestToken(identityMock.state);
    identityMock.state.users.push({
      user_pseudonym_id: pseudonym,
      name: '홍길동',
      email: 'h@example.com',
      phone: '010-1234-5678',
      birth_year: 1990,
      sex: 'male',
    });
    const r = await createPost(token);
    const text = await r.text();
    expect(text).not.toContain('홍길동');
    expect(text).not.toContain('h@example.com');
    expect(text).not.toContain('010-1234-5678');
  });

  it('회귀 — 금지 표현 응답 누출 0', async () => {
    const { token } = issueTestToken(identityMock.state);
    await createPost(token);
    const r = await listPosts(token);
    const text = await r.text();
    for (const w of ['진단', '처방', '치료', '여명', '사망일', '죽음', 'D-day', 'diagnose']) {
      expect(text.includes(w), `forbidden word: ${w}`).toBe(false);
    }
  });
});
