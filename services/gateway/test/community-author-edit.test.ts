import { describe, it, expect, beforeEach } from 'vitest';
import app from '../src/index.js';
import { __clearRateLimit } from '../src/middleware/rate-limit.js';
import { makeMockIdentityDb, makeMockAnalysisDb, issueTestToken } from './helpers/mock-d1.js';

// 작성자 본문/댓글 수정·삭제 권한 (2026-06-20).
describe('커뮤니티 작성자 수정/삭제', () => {
  let identity: ReturnType<typeof makeMockIdentityDb>;
  let analysis: ReturnType<typeof makeMockAnalysisDb>;
  let authorToken: string;
  let otherToken: string;

  beforeEach(() => {
    identity = makeMockIdentityDb();
    analysis = makeMockAnalysisDb();
    __clearRateLimit();
    authorToken = issueTestToken(identity.state, { pseudonym: 'author-x' }).token;
    otherToken = issueTestToken(identity.state, { pseudonym: 'other-y' }).token;
  });

  const env = () => ({
    IDENTITY_DB: identity.db,
    DB: analysis.db,
    BETA_SIGNUP_HMAC_SALT: 'test',
    ENVIRONMENT: 'dev' as const,
  });

  const createPost = (token: string) =>
    app.request(
      '/api/v1/community/posts',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: '원본 제목', body: '원본 본문', videoUrl: null }),
      },
      env(),
    );

  const getPost = (token: string, id: string) =>
    app.request(`/api/v1/community/posts/${id}`, { headers: { Authorization: `Bearer ${token}` } }, env());

  const patchPost = (token: string, id: string, body: Record<string, unknown>) =>
    app.request(
      `/api/v1/community/posts/${id}`,
      {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: '원본 제목', body: '원본 본문', videoUrl: null, ...body }),
      },
      env(),
    );

  const addComment = (token: string, postId: string, body = '내 댓글') =>
    app.request(
      `/api/v1/community/posts/${postId}/comments`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ body }),
      },
      env(),
    );

  async function newPostId(): Promise<string> {
    const res = await createPost(authorToken);
    return ((await res.json()) as { post: { id: string } }).post.id;
  }

  it('GET 상세에 작성자 본인 여부(isAuthor) 노출', async () => {
    const pid = await newPostId();
    const mine = (await (await getPost(authorToken, pid)).json()) as { isAuthor: boolean };
    const theirs = (await (await getPost(otherToken, pid)).json()) as { isAuthor: boolean };
    expect(mine.isAuthor).toBe(true);
    expect(theirs.isAuthor).toBe(false);
  });

  it('작성자 본문 수정 → 200, 내용 반영', async () => {
    const pid = await newPostId();
    const res = await patchPost(authorToken, pid, { title: '수정된 제목', body: '수정된 본문' });
    expect(res.status).toBe(200);
    const detail = (await (await getPost(authorToken, pid)).json()) as { post: { title: string; body: string } };
    expect(detail.post.title).toBe('수정된 제목');
    expect(detail.post.body).toBe('수정된 본문');
  });

  it('타인 본문 수정 → 404', async () => {
    const pid = await newPostId();
    const res = await patchPost(otherToken, pid, { title: '침입' });
    expect(res.status).toBe(404);
  });

  it('작성자 본문 삭제 → 200, 이후 404', async () => {
    const pid = await newPostId();
    const del = await app.request(
      `/api/v1/community/posts/${pid}`,
      { method: 'DELETE', headers: { Authorization: `Bearer ${authorToken}` } },
      env(),
    );
    expect(del.status).toBe(200);
    const after = await getPost(authorToken, pid);
    expect(after.status).toBe(404);
  });

  it('타인 본문 삭제 → 404', async () => {
    const pid = await newPostId();
    const del = await app.request(
      `/api/v1/community/posts/${pid}`,
      { method: 'DELETE', headers: { Authorization: `Bearer ${otherToken}` } },
      env(),
    );
    expect(del.status).toBe(404);
  });

  it('작성자 댓글 수정 → 200, 내용 반영', async () => {
    const pid = await newPostId();
    const cid = ((await (await addComment(authorToken, pid)).json()) as { id: string }).id;
    const res = await app.request(
      `/api/v1/community/posts/${pid}/comments/${cid}`,
      {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${authorToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: '수정된 댓글' }),
      },
      env(),
    );
    expect(res.status).toBe(200);
    const detail = (await (await getPost(authorToken, pid)).json()) as { comments: Array<{ body: string }> };
    expect(detail.comments[0].body).toBe('수정된 댓글');
  });

  it('타인 댓글 수정 → 404', async () => {
    const pid = await newPostId();
    const cid = ((await (await addComment(authorToken, pid)).json()) as { id: string }).id;
    const res = await app.request(
      `/api/v1/community/posts/${pid}/comments/${cid}`,
      {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${otherToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: '침입 댓글' }),
      },
      env(),
    );
    expect(res.status).toBe(404);
  });

  it('작성자 댓글 삭제 → 200, 목록에서 제거', async () => {
    const pid = await newPostId();
    const cid = ((await (await addComment(authorToken, pid)).json()) as { id: string }).id;
    const del = await app.request(
      `/api/v1/community/posts/${pid}/comments/${cid}`,
      { method: 'DELETE', headers: { Authorization: `Bearer ${authorToken}` } },
      env(),
    );
    expect(del.status).toBe(200);
    const detail = (await (await getPost(authorToken, pid)).json()) as { comments: unknown[] };
    expect(detail.comments).toHaveLength(0);
  });

  it('타인 댓글 삭제 → 404', async () => {
    const pid = await newPostId();
    const cid = ((await (await addComment(authorToken, pid)).json()) as { id: string }).id;
    const del = await app.request(
      `/api/v1/community/posts/${pid}/comments/${cid}`,
      { method: 'DELETE', headers: { Authorization: `Bearer ${otherToken}` } },
      env(),
    );
    expect(del.status).toBe(404);
  });
});
