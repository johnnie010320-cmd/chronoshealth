import { Hono } from 'hono';
import { authMiddleware, type AuthVariables } from '../../middleware/auth.js';
import { rateLimit } from '../../middleware/rate-limit.js';
import {
  CreateCommentRequest,
  CreatePostRequest,
  ListPostsQuery,
} from '../../schemas/community.js';
import {
  insertComment,
  insertPost,
  listComments,
  listPosts,
  listTrending,
  readPost,
  softDeletePost,
  toggleLike,
} from '../../community/storage.js';
import {
  moderateText,
  moderateVideoUrl,
} from '../../community/moderation.js';
import { appendLedger, EARN_AMOUNTS, hasEarnedFor } from '../../rewards/ledger.js';
import type { Bindings } from '../../bindings.js';

const MODEL_VERSION = 'community-v0.1.0';

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

  const id = crypto.randomUUID();
  await insertPost(c.env.DB, {
    id,
    userPseudonymId: pseudonymId,
    title: parsed.data.title,
    body: parsed.data.body,
    videoUrl: parsed.data.videoUrl,
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
  const parsed = ListPostsQuery.safeParse({
    limit: c.req.query('limit'),
    cursor: c.req.query('cursor') ?? null,
  });
  if (!parsed.success) {
    return c.json({ error: { code: 'INVALID_INPUT' } }, 400);
  }
  const posts = await listPosts(c.env.DB, parsed.data);
  return c.json({ posts, modelVersion: MODEL_VERSION });
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
