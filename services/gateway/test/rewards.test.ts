import { describe, it, expect, beforeEach } from 'vitest';
import app from '../src/index.js';
import { __clearRateLimit } from '../src/middleware/rate-limit.js';
import {
  makeMockIdentityDb,
  makeMockAnalysisDb,
  issueTestToken,
} from './helpers/mock-d1.js';

type RewardsMeResponse = {
  balance: number;
  history: { txnId: string; amount: number; kind: string; sourceRef: string | null }[];
  spendCatalog: { slug: string; cost: number; partner: string; title: string }[];
  earnRules: Record<string, number>;
  modelVersion: string;
  disclaimer: string;
};

describe('Rewards API', () => {
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

  const getMe = (token: string, locale?: string) =>
    app.request(
      `/api/v1/rewards/me${locale ? `?locale=${locale}` : ''}`,
      { method: 'GET', headers: { Authorization: `Bearer ${token}` } },
      env(),
    );

  const spend = (token: string, slug: string) =>
    app.request(
      '/api/v1/rewards/spend',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug }),
      },
      env(),
    );

  const createPost = (token: string) =>
    app.request(
      '/api/v1/community/posts',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: '오늘의 운동',
          body: '30분 조깅',
          videoUrl: null,
        }),
      },
      env(),
    );

  const addComment = (token: string, postId: string) =>
    app.request(
      `/api/v1/community/posts/${postId}/comments`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: '좋은 글이네요' }),
      },
      env(),
    );

  const like = (token: string, postId: string) =>
    app.request(
      `/api/v1/community/posts/${postId}/like`,
      { method: 'POST', headers: { Authorization: `Bearer ${token}` } },
      env(),
    );

  it('GET /me 200 — empty balance for new user', async () => {
    const { token } = issueTestToken(identityMock.state);
    const res = await getMe(token);
    expect(res.status).toBe(200);
    const data = (await res.json()) as RewardsMeResponse;
    expect(data.balance).toBe(0);
    expect(data.history).toEqual([]);
    expect(data.spendCatalog.length).toBeGreaterThan(0);
    expect(data.modelVersion).toBe('rewards-v0.1.0');
  });

  it('GET /me 401 UNAUTHORIZED', async () => {
    const res = await app.request(
      '/api/v1/rewards/me',
      { method: 'GET' },
      env(),
    );
    expect(res.status).toBe(401);
  });

  it('community_post 적립 +10', async () => {
    const { token } = issueTestToken(identityMock.state);
    await createPost(token);
    const me = await getMe(token);
    const data = (await me.json()) as RewardsMeResponse;
    expect(data.balance).toBe(10);
    expect(data.history[0].kind).toBe('community_post');
  });

  it('community_comment 적립 +2', async () => {
    const a = issueTestToken(identityMock.state);
    const b = issueTestToken(identityMock.state);
    const r = await createPost(a.token);
    const { post } = (await r.json()) as { post: { id: string } };
    await addComment(b.token, post.id);
    const me = await getMe(b.token);
    const data = (await me.json()) as RewardsMeResponse;
    expect(data.balance).toBe(2);
    expect(data.history[0].kind).toBe('community_comment');
  });

  it('community_like_received 적립 +1 (게시자 본인 like 제외)', async () => {
    const author = issueTestToken(identityMock.state);
    const liker = issueTestToken(identityMock.state);
    const r = await createPost(author.token);
    const { post } = (await r.json()) as { post: { id: string } };
    // author 본인 like → 0 적립
    await like(author.token, post.id);
    let authorMe = await getMe(author.token);
    let aData = (await authorMe.json()) as RewardsMeResponse;
    expect(aData.balance).toBe(10); // post +10 only
    // liker like → author에 +1 적립
    await like(liker.token, post.id);
    authorMe = await getMe(author.token);
    aData = (await authorMe.json()) as RewardsMeResponse;
    expect(aData.balance).toBe(11);
  });

  it('like 중복 적립 방지 — 같은 liker × 같은 post = 1회만', async () => {
    const author = issueTestToken(identityMock.state);
    const liker = issueTestToken(identityMock.state);
    const r = await createPost(author.token);
    const { post } = (await r.json()) as { post: { id: string } };
    await like(liker.token, post.id);
    await like(liker.token, post.id); // unlike
    await like(liker.token, post.id); // re-like
    const me = await getMe(author.token);
    const data = (await me.json()) as RewardsMeResponse;
    // post +10 + like_received +1 (한 번만)
    expect(data.balance).toBe(11);
  });

  it('POST /spend 200 — diet 쿠폰 차감', async () => {
    const { token } = issueTestToken(identityMock.state);
    // 잔액 1000 manual seed
    analysisMock.state.ledger.push({
      id: 1,
      user_pseudonym_id: issueTestToken(identityMock.state).pseudonym,
      txn_id: 'seed-other',
      amount: 0,
      kind: 'admin_adjust',
      source_ref: null,
      created_at: new Date().toISOString(),
    });
    // 실제 본 사용자 잔액
    const meTok = identityMock.state.tokens[0];
    analysisMock.state.ledger.push({
      id: 2,
      user_pseudonym_id: meTok.user_pseudonym_id,
      txn_id: 'seed',
      amount: 200,
      kind: 'admin_adjust',
      source_ref: null,
      created_at: new Date().toISOString(),
    });
    const res = await spend(token, 'diet-mediterranean-discount');
    expect(res.status).toBe(200);
    const data = (await res.json()) as { spent: number; newBalance: number };
    expect(data.spent).toBe(100);
    expect(data.newBalance).toBe(100);
  });

  it('POST /spend 400 INSUFFICIENT_BALANCE', async () => {
    const { token } = issueTestToken(identityMock.state);
    const res = await spend(token, 'medical-checkup-discount');
    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: { code: string } };
    expect(data.error.code).toBe('INSUFFICIENT_BALANCE');
  });

  it('POST /spend 400 INVALID_ITEM', async () => {
    const { token } = issueTestToken(identityMock.state);
    const res = await spend(token, 'no-such-slug');
    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: { code: string } };
    expect(data.error.code).toBe('INVALID_ITEM');
  });

  it('POST /spend 401 UNAUTHORIZED', async () => {
    const res = await app.request(
      '/api/v1/rewards/spend',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: 'diet-mediterranean-discount' }),
      },
      env(),
    );
    expect(res.status).toBe(401);
  });

  it('GET /me locale=en — 영어 카탈로그', async () => {
    const { token } = issueTestToken(identityMock.state);
    const res = await getMe(token, 'en');
    const data = (await res.json()) as RewardsMeResponse;
    const titles = data.spendCatalog.map((s) => s.title).join(' ');
    expect(titles).toMatch(/[A-Za-z]/);
    expect(titles).not.toMatch(/[가-힣]/);
  });

  it('회귀 — rewards 응답에 금지 표현 미포함', async () => {
    const { token } = issueTestToken(identityMock.state);
    await createPost(token);
    const res = await getMe(token);
    const text = await res.text();
    for (const w of ['진단', '처방', '치료', '여명', '사망일', '죽음', 'D-day', 'diagnose']) {
      expect(text.includes(w), `forbidden word: ${w}`).toBe(false);
    }
  });

  it('append-only — history 순서 최신순', async () => {
    const a = issueTestToken(identityMock.state);
    await createPost(a.token); // +10
    await new Promise((r) => setTimeout(r, 5));
    const r2 = await createPost(a.token); // +10
    expect(r2.status).toBe(200);
    const me = await getMe(a.token);
    const data = (await me.json()) as RewardsMeResponse;
    expect(data.balance).toBe(20);
    expect(data.history.length).toBe(2);
  });

  it('earn rules — 응답에 5종 정상 포함', async () => {
    const { token } = issueTestToken(identityMock.state);
    const me = await getMe(token);
    const data = (await me.json()) as RewardsMeResponse;
    expect(data.earnRules.survey_complete).toBe(5);
    expect(data.earnRules.routine_streak_7).toBe(50);
    expect(data.earnRules.community_post).toBe(10);
    expect(data.earnRules.community_comment).toBe(2);
    expect(data.earnRules.community_like_received).toBe(1);
  });
});
