import { Hono } from 'hono';
import { authMiddleware, type AuthVariables } from '../../middleware/auth.js';
import { rateLimit } from '../../middleware/rate-limit.js';
import {
  CreateCommentRequest,
  CreateCommunityRequest,
  CreatePostRequest,
  ListPostsQuery,
} from '../../schemas/community.js';
import {
  insertComment,
  insertPost,
  listComments,
  listMyComments,
  listPosts,
  listTrending,
  readPost,
  softDeletePost,
  toggleLike,
} from '../../community/storage.js';
import {
  insertCommunity,
  listMyCommunities,
  listPublicCommunities,
  readCommunity,
  readFollower,
  toggleFollow,
} from '../../community/communities.js';
import {
  moderateText,
  moderateVideoUrl,
} from '../../community/moderation.js';
import { appendLedger, EARN_AMOUNTS, hasEarnedFor } from '../../rewards/ledger.js';
import type { Bindings } from '../../bindings.js';

const MODEL_VERSION = 'community-v0.2.0';

export const communityRoute = new Hono<{
  Bindings: Bindings;
  Variables: AuthVariables;
}>();

communityRoute.post('/posts', authMiddleware, rateLimit(50), async (c) => {
  const pseudonymId = c.get('userPseudonymId');
  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    return c.json({ error: { code: 'INVALID_JSON' } }, 400);
  }
  const parsed = CreatePostRequest.safeParse(raw);
  if (!parsed.success) {
    return c.json({ error: { code: 'INVALID_INPUT' } }, 400);
  }

  const textCheck = moderateText(`${parsed.data.title}\n${parsed.data.body}`);
  if (!textCheck.allowed) {
    return c.json({ error: { code: textCheck.reason } }, 400);
  }
  const urlCheck = moderateVideoUrl(parsed.data.videoUrl);
  if (!urlCheck.allowed) {
    return c.json({ error: { code: urlCheck.reason } }, 400);
  }

  const community = await readCommunity(c.env.DB, parsed.data.communityId);
  if (!community) {
    return c.json({ error: { code: 'COMMUNITY_NOT_FOUND' } }, 404);
  }
  // 라운지는 자유, 그 외 커뮤니티는 owner 또는 active follower 만 게시.
  if (community.id !== '_lounge' && community.ownerPseudonymId !== pseudonymId) {
    const follower = await readFollower(c.env.DB, community.id, pseudonymId);
    if (!follower || follower.status !== 'active') {
      return c.json({ error: { code: 'NOT_A_MEMBER' } }, 403);
    }
  }

  const id = crypto.randomUUID();
  await insertPost(c.env.DB, {
    id,
    communityId: community.id,
    userPseudonymId: pseudonymId,
    title: parsed.data.title,
    body: parsed.data.body,
    videoUrl: parsed.data.videoUrl,
    allowLikes: parsed.data.allowLikes,
    allowComments: parsed.data.allowComments,
    tag: parsed.data.tag,
  });
  try {
    await appendLedger(c.env.DB, pseudonymId, {
      kind: 'community_post',
      amount: EARN_AMOUNTS.community_post,
      sourceRef: id,
    });
  } catch (err) {
    console.error('appendLedger community_post failed', err);
  }
  const post = await readPost(c.env.DB, id);
  return c.json({ post, modelVersion: MODEL_VERSION });
});

communityRoute.get('/posts', authMiddleware, rateLimit(200), async (c) => {
  const pseudonymId = c.get('userPseudonymId');
  const parsed = ListPostsQuery.safeParse({
    limit: c.req.query('limit'),
    cursor: c.req.query('cursor') ?? null,
    communityId: c.req.query('communityId') ?? undefined,
    tag: c.req.query('tag') ?? undefined,
    mine: c.req.query('mine') ?? undefined,
  });
  if (!parsed.success) {
    return c.json({ error: { code: 'INVALID_INPUT' } }, 400);
  }
  const posts = await listPosts(c.env.DB, {
    limit: parsed.data.limit,
    cursor: parsed.data.cursor,
    communityId: parsed.data.communityId ?? null,
    tag: parsed.data.tag ?? null,
    userPseudonymId: parsed.data.mine ? pseudonymId : null,
  });
  return c.json({ posts, modelVersion: MODEL_VERSION });
});

communityRoute.get('/my-comments', authMiddleware, rateLimit(120), async (c) => {
  const pseudonymId = c.get('userPseudonymId');
  const comments = await listMyComments(c.env.DB, pseudonymId, 50);
  return c.json({ comments, modelVersion: MODEL_VERSION });
});

communityRoute.get('/trending', authMiddleware, rateLimit(200), async (c) => {
  const posts = await listTrending(c.env.DB, 10);
  return c.json({ posts, modelVersion: MODEL_VERSION });
});

communityRoute.get('/posts/:id', authMiddleware, rateLimit(200), async (c) => {
  const id = c.req.param('id');
  const post = await readPost(c.env.DB, id);
  if (!post) {
    return c.json({ error: { code: 'NOT_FOUND' } }, 404);
  }
  const comments = await listComments(c.env.DB, id);
  return c.json({ post, comments, modelVersion: MODEL_VERSION });
});

communityRoute.post('/posts/:id/comments', authMiddleware, rateLimit(100), async (c) => {
  const pseudonymId = c.get('userPseudonymId');
  const postId = c.req.param('id');

  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    return c.json({ error: { code: 'INVALID_JSON' } }, 400);
  }
  const parsed = CreateCommentRequest.safeParse(raw);
  if (!parsed.success) {
    return c.json({ error: { code: 'INVALID_INPUT' } }, 400);
  }
  const post = await readPost(c.env.DB, postId);
  if (!post) {
    return c.json({ error: { code: 'NOT_FOUND' } }, 404);
  }
  const check = moderateText(parsed.data.body);
  if (!check.allowed) {
    return c.json({ error: { code: check.reason } }, 400);
  }

  const id = crypto.randomUUID();
  await insertComment(c.env.DB, {
    id,
    postId,
    userPseudonymId: pseudonymId,
    body: parsed.data.body,
  });
  try {
    await appendLedger(c.env.DB, pseudonymId, {
      kind: 'community_comment',
      amount: EARN_AMOUNTS.community_comment,
      sourceRef: id,
    });
  } catch (err) {
    console.error('appendLedger community_comment failed', err);
  }
  return c.json({ id, postId, body: parsed.data.body, modelVersion: MODEL_VERSION });
});

communityRoute.post('/posts/:id/like', authMiddleware, rateLimit(200), async (c) => {
  const pseudonymId = c.get('userPseudonymId');
  const postId = c.req.param('id');
  const post = await readPost(c.env.DB, postId);
  if (!post) {
    return c.json({ error: { code: 'NOT_FOUND' } }, 404);
  }
  const result = await toggleLike(c.env.DB, postId, pseudonymId);
  // R8: like-received 적립 (게시자 본인이 아닐 때만, 첫 좋아요 1회).
  if (result.liked && post.userPseudonymId !== pseudonymId) {
    try {
      const sourceRef = `${postId}:${pseudonymId}`;
      const already = await hasEarnedFor(
        c.env.DB,
        post.userPseudonymId,
        'community_like_received',
        sourceRef,
      );
      if (!already) {
        await appendLedger(c.env.DB, post.userPseudonymId, {
          kind: 'community_like_received',
          amount: EARN_AMOUNTS.community_like_received,
          sourceRef,
        });
      }
    } catch (err) {
      console.error('appendLedger community_like_received failed', err);
    }
  }
  return c.json({ ...result, modelVersion: MODEL_VERSION });
});

communityRoute.delete('/posts/:id', authMiddleware, rateLimit(50), async (c) => {
  const pseudonymId = c.get('userPseudonymId');
  const postId = c.req.param('id');
  const ok = await softDeletePost(c.env.DB, postId, pseudonymId);
  if (!ok) {
    return c.json({ error: { code: 'NOT_FOUND' } }, 404);
  }
  return c.json({ deleted: true });
});

// ---- communities ----------------------------------------------------------

communityRoute.post('/communities', authMiddleware, rateLimit(20), async (c) => {
  const pseudonymId = c.get('userPseudonymId');
  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    return c.json({ error: { code: 'INVALID_JSON' } }, 400);
  }
  const parsed = CreateCommunityRequest.safeParse(raw);
  if (!parsed.success) {
    return c.json({ error: { code: 'INVALID_INPUT' } }, 400);
  }
  const textCheck = moderateText(`${parsed.data.name}\n${parsed.data.description}`);
  if (!textCheck.allowed) {
    return c.json({ error: { code: textCheck.reason } }, 400);
  }
  const id = crypto.randomUUID();
  await insertCommunity(c.env.DB, {
    id,
    ownerPseudonymId: pseudonymId,
    name: parsed.data.name,
    description: parsed.data.description,
    visibility: parsed.data.visibility,
    allowLikesDefault: parsed.data.allowLikesDefault,
    allowCommentsDefault: parsed.data.allowCommentsDefault,
  });
  const community = await readCommunity(c.env.DB, id);
  return c.json({ community, modelVersion: MODEL_VERSION });
});

communityRoute.get('/communities', authMiddleware, rateLimit(200), async (c) => {
  const pseudonymId = c.get('userPseudonymId');
  const [mine, discover] = await Promise.all([
    listMyCommunities(c.env.DB, pseudonymId),
    listPublicCommunities(c.env.DB, 30),
  ]);
  const joinedIds = new Set(mine.map((m) => m.id));
  const discoverFiltered = discover.filter((d) => !joinedIds.has(d.id));
  return c.json({ mine, discover: discoverFiltered, modelVersion: MODEL_VERSION });
});

communityRoute.get('/communities/:id', authMiddleware, rateLimit(200), async (c) => {
  const pseudonymId = c.get('userPseudonymId');
  const id = c.req.param('id');
  const community = await readCommunity(c.env.DB, id);
  if (!community) {
    return c.json({ error: { code: 'NOT_FOUND' } }, 404);
  }
  const follower = await readFollower(c.env.DB, id, pseudonymId);
  return c.json({
    community,
    isOwner: community.ownerPseudonymId === pseudonymId,
    myStatus: follower?.status ?? null,
    modelVersion: MODEL_VERSION,
  });
});

communityRoute.post(
  '/communities/:id/follow',
  authMiddleware,
  rateLimit(50),
  async (c) => {
    const pseudonymId = c.get('userPseudonymId');
    const id = c.req.param('id');
    const community = await readCommunity(c.env.DB, id);
    if (!community) {
      return c.json({ error: { code: 'NOT_FOUND' } }, 404);
    }
    const result = await toggleFollow(c.env.DB, community, pseudonymId);
    return c.json({ ...result, modelVersion: MODEL_VERSION });
  },
);
