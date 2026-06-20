import { describe, it, expect, beforeEach } from 'vitest';
import app from '../src/index.js';
import { __clearRateLimit } from '../src/middleware/rate-limit.js';
import {
  makeMockIdentityDb,
  makeMockAnalysisDb,
  issueTestToken,
  type MockD1State,
} from './helpers/mock-d1.js';

// 댓글 1:1 대화 옵트인 (2026-06-20) — accepts_dm + 작성자 닉네임/본인 여부 노출.
describe('커뮤니티 댓글 1:1 대화 옵트인', () => {
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

  const createPost = (token: string) =>
    app.request(
      '/api/v1/community/posts',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: '테스트 글입니다', body: '본문 내용입니다.', videoUrl: null }),
      },
      env(),
    );

  const addComment = (token: string, postId: string, body: string, acceptsDm?: boolean) =>
    app.request(
      `/api/v1/community/posts/${postId}/comments`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(acceptsDm === undefined ? { body } : { body, acceptsDm }),
      },
      env(),
    );

  const getPost = (token: string, id: string) =>
    app.request(`/api/v1/community/posts/${id}`, { headers: { Authorization: `Bearer ${token}` } }, env());

  type CommentWire = {
    id: string;
    body: string;
    acceptsDm: boolean;
    authorNickname: string | null;
    isSelf: boolean;
  };

  async function postIdOf(token: string): Promise<string> {
    const res = await createPost(token);
    const data = (await res.json()) as { post: { id: string } };
    return data.post.id;
  }

  it('댓글 작성 시 acceptsDm 누락 → 기본 false', async () => {
    const pid = await postIdOf(authorToken);
    await addComment(authorToken, pid, '옵트인 미지정 댓글');
    const res = await getPost(viewerToken, pid);
    const data = (await res.json()) as { comments: CommentWire[] };
    expect(data.comments).toHaveLength(1);
    expect(data.comments[0].acceptsDm).toBe(false);
  });

  it('acceptsDm:true 댓글 → 다른 회원에게 닉네임·수용·비본인 노출', async () => {
    const pid = await postIdOf(authorToken);
    await addComment(authorToken, pid, '1:1 허용 댓글', true);
    const res = await getPost(viewerToken, pid);
    const data = (await res.json()) as { comments: CommentWire[] };
    const c = data.comments[0];
    expect(c.acceptsDm).toBe(true);
    expect(c.authorNickname).toBe('author');
    expect(c.isSelf).toBe(false);
  });

  it('작성자 본인이 조회하면 isSelf true (자기 댓글엔 대화 버튼 미노출)', async () => {
    const pid = await postIdOf(authorToken);
    await addComment(authorToken, pid, '내 댓글', true);
    const res = await getPost(authorToken, pid);
    const data = (await res.json()) as { comments: CommentWire[] };
    expect(data.comments[0].isSelf).toBe(true);
  });

  it('viewer 가 작성자 닉네임으로 DM 열기 → 200', async () => {
    const pid = await postIdOf(authorToken);
    await addComment(authorToken, pid, '대화 환영', true);
    const dm = await app.request(
      '/api/v1/messages/dm',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${viewerToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: 'author' }),
      },
      env(),
    );
    expect(dm.status).toBe(200);
  });
});
