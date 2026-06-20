import { describe, it, expect, beforeEach } from 'vitest';
import app from '../src/index.js';
import { __clearRateLimit } from '../src/middleware/rate-limit.js';
import { makeMockIdentityDb, makeMockAnalysisDb, issueTestToken } from './helpers/mock-d1.js';

// 게시글 미디어 확장 (2026-06-20) — SNS 링크 + 이미지 직접 업로드(base64), 동영상은 링크.
describe('커뮤니티 게시글 미디어(SNS 링크 + 이미지 업로드)', () => {
  let identity: ReturnType<typeof makeMockIdentityDb>;
  let analysis: ReturnType<typeof makeMockAnalysisDb>;

  beforeEach(() => {
    identity = makeMockIdentityDb();
    analysis = makeMockAnalysisDb();
    __clearRateLimit();
  });

  const env = () => ({
    IDENTITY_DB: identity.db,
    DB: analysis.db,
    BETA_SIGNUP_HMAC_SALT: 'test',
    ENVIRONMENT: 'dev' as const,
  });

  // 1x1 투명 PNG base64 (데이터URL 접두 제외) — 테스트용 소형 이미지.
  const IMG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

  const createPost = (token: string, extra: Record<string, unknown> = {}) =>
    app.request(
      '/api/v1/community/posts',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: '미디어 테스트 글',
          body: '본문 내용입니다.',
          videoUrl: null,
          ...extra,
        }),
      },
      env(),
    );

  const getPost = (token: string, id: string) =>
    app.request(`/api/v1/community/posts/${id}`, { headers: { Authorization: `Bearer ${token}` } }, env());

  const listPosts = (token: string) =>
    app.request('/api/v1/community/posts', { headers: { Authorization: `Bearer ${token}` } }, env());

  type PostWire = {
    id: string;
    snsUrl: string | null;
    imageMime: string | null;
    hasImage: boolean;
    imageData?: string | null;
  };

  it('SNS 링크 + 이미지 업로드 → 상세에서 snsUrl·hasImage·imageData 반환', async () => {
    const { token } = issueTestToken(identity.state);
    const res = await createPost(token, {
      snsUrl: 'https://instagram.com/example',
      imageB64: IMG,
      imageMime: 'image/png',
    });
    expect(res.status).toBe(200);
    const { post } = (await res.json()) as { post: PostWire };
    const detail = await getPost(token, post.id);
    const data = (await detail.json()) as { post: PostWire };
    expect(data.post.snsUrl).toBe('https://instagram.com/example');
    expect(data.post.hasImage).toBe(true);
    expect(data.post.imageMime).toBe('image/png');
    expect(data.post.imageData).toBe(IMG);
  });

  it('피드(목록)는 hasImage 만, imageData 본문은 제외(경량화)', async () => {
    const { token } = issueTestToken(identity.state);
    await createPost(token, { imageB64: IMG, imageMime: 'image/png' });
    const res = await listPosts(token);
    const data = (await res.json()) as { posts: PostWire[] };
    expect(data.posts[0].hasImage).toBe(true);
    expect(data.posts[0].imageData).toBeUndefined();
  });

  it('미디어 없는 글 → snsUrl null, hasImage false', async () => {
    const { token } = issueTestToken(identity.state);
    const res = await createPost(token);
    const { post } = (await res.json()) as { post: PostWire };
    const detail = await getPost(token, post.id);
    const data = (await detail.json()) as { post: PostWire };
    expect(data.post.snsUrl).toBeNull();
    expect(data.post.hasImage).toBe(false);
  });

  it('이미지 데이터만 있고 MIME 누락 → 400', async () => {
    const { token } = issueTestToken(identity.state);
    const res = await createPost(token, { imageB64: IMG });
    expect(res.status).toBe(400);
  });

  it('잘못된 SNS URL → 400', async () => {
    const { token } = issueTestToken(identity.state);
    const res = await createPost(token, { snsUrl: 'not-a-url' });
    expect(res.status).toBe(400);
  });

  // ── 2026-06-20 추가: 본문 서식 + 이미지 위치 + 멀티 링크 ──
  type FullPost = PostWire & {
    bodyRich?: Array<{ t: string; s?: string; c?: string; b?: boolean }>;
    imagePosition?: string;
    videoUrls?: string[];
    snsUrls?: string[];
    videoUrl?: string | null;
  };

  it('본문 서식 세그먼트(bodyRich) 저장·조회', async () => {
    const { token } = issueTestToken(identity.state);
    const bodyRich = [
      { t: '큰 제목', s: 'xl', c: '#1a73e8' },
      { t: '\n작은 본문', s: 'sm' },
    ];
    const res = await createPost(token, { body: '큰 제목\n작은 본문', bodyRich });
    expect(res.status).toBe(200);
    const { post } = (await res.json()) as { post: FullPost };
    const detail = await getPost(token, post.id);
    const data = (await detail.json()) as { post: FullPost };
    expect(data.post.bodyRich).toHaveLength(2);
    expect(data.post.bodyRich?.[0]).toMatchObject({ t: '큰 제목', s: 'xl', c: '#1a73e8' });
  });

  it('이미지 위치 middle 저장·조회', async () => {
    const { token } = issueTestToken(identity.state);
    const res = await createPost(token, { imageB64: IMG, imageMime: 'image/png', imagePosition: 'middle' });
    const { post } = (await res.json()) as { post: FullPost };
    const detail = await getPost(token, post.id);
    const data = (await detail.json()) as { post: FullPost };
    expect(data.post.imagePosition).toBe('middle');
    expect(data.post.hasImage).toBe(true);
  });

  it('유튜브·SNS 링크 멀티 저장·조회', async () => {
    const { token } = issueTestToken(identity.state);
    const res = await createPost(token, {
      videoUrls: ['https://youtu.be/aaa', 'https://www.youtube.com/watch?v=bbb'],
      snsUrls: ['https://instagram.com/x', 'https://twitter.com/y'],
    });
    expect(res.status).toBe(200);
    const { post } = (await res.json()) as { post: FullPost };
    const detail = await getPost(token, post.id);
    const data = (await detail.json()) as { post: FullPost };
    expect(data.post.videoUrls).toHaveLength(2);
    expect(data.post.snsUrls).toHaveLength(2);
  });

  it('멀티 동영상 중 허용 안 된 호스트 → 400', async () => {
    const { token } = issueTestToken(identity.state);
    const res = await createPost(token, {
      videoUrls: ['https://youtu.be/ok', 'https://evil.com/x'],
    });
    expect(res.status).toBe(400);
  });

  it('레거시 단일 videoUrl → videoUrls 배열로 노출', async () => {
    const { token } = issueTestToken(identity.state);
    const res = await createPost(token, { videoUrl: 'https://youtu.be/legacy' });
    const { post } = (await res.json()) as { post: FullPost };
    const detail = await getPost(token, post.id);
    const data = (await detail.json()) as { post: FullPost };
    expect(data.post.videoUrls).toEqual(['https://youtu.be/legacy']);
  });
});
