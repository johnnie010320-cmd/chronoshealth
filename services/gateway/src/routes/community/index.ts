import { Hono } from 'hono';
import { authMiddleware, type AuthVariables } from '../../middleware/auth.js';
import { rateLimit } from '../../middleware/rate-limit.js';
import {
  AddCommunityAdminRequest,
  CreateCommentRequest,
  CreateCommunityRequest,
  CreatePostRequest,
  ListPostsQuery,
  UpdateCommunityRequest,
  UpdatePostRequest,
} from '../../schemas/community.js';
import {
  insertComment,
  insertPost,
  listComments,
  listMyComments,
  listPosts,
  listTrending,
  moderatorDeleteComment,
  moderatorDeletePost,
  readCommentCommunity,
  readPost,
  softDeleteComment,
  softDeletePost,
  toggleLike,
  updateComment,
  updatePost,
} from '../../community/storage.js';
import {
  addCommunityAdmin,
  insertCommunity,
  isCommunityAdmin,
  listCommunityAdmins,
  listMyCommunities,
  listPublicCommunities,
  readCommunity,
  readFollower,
  removeCommunityAdmin,
  toggleFollow,
  updateCommunityVisibility,
  type CommunityRow,
} from '../../community/communities.js';
import {
  moderateText,
  moderateVideoUrl,
} from '../../community/moderation.js';
import { findPseudonymByNickname, resolveNicknames } from '../../messaging/nickname.js';
import { isAdmin } from '../../middleware/admin-auth.js';
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
  // 동영상 링크 — 단일 videoUrl(역호환) + videoUrls 배열 병합. 각 링크는 허용 호스트 검증.
  const videoUrls =
    parsed.data.videoUrls.length > 0
      ? parsed.data.videoUrls
      : parsed.data.videoUrl
      ? [parsed.data.videoUrl]
      : [];
  for (const v of videoUrls) {
    const urlCheck = moderateVideoUrl(v);
    if (!urlCheck.allowed) {
      return c.json({ error: { code: urlCheck.reason } }, 400);
    }
  }
  // SNS 링크 — 단일 snsUrl(역호환) + snsUrls 배열 병합(zod 가 URL 형식 검증).
  const snsUrls =
    parsed.data.snsUrls.length > 0
      ? parsed.data.snsUrls
      : parsed.data.snsUrl
      ? [parsed.data.snsUrl]
      : [];
  // 이미지 업로드 시 데이터와 MIME 은 함께 있어야 함.
  if ((parsed.data.imageB64 === null) !== (parsed.data.imageMime === null)) {
    return c.json({ error: { code: 'INVALID_INPUT' } }, 400);
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
    videoUrl: videoUrls[0] ?? null,
    snsUrl: snsUrls[0] ?? null,
    videoUrls,
    snsUrls,
    imageData: parsed.data.imageB64,
    imageMime: parsed.data.imageMime,
    imagePosition: parsed.data.imagePosition,
    bodyRich: parsed.data.bodyRich,
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
  const me = c.get('userPseudonymId');
  const post = await readPost(c.env.DB, id);
  if (!post) {
    return c.json({ error: { code: 'NOT_FOUND' } }, 404);
  }
  const comments = await listComments(c.env.DB, id);
  // 1:1 대화 버튼용 — 작성자 닉네임(공개 핸들) + 수용 여부 + 본인 여부.
  const authorIds = [...new Set(comments.map((cm) => cm.userPseudonymId))];
  const nicks = await resolveNicknames(c.env.IDENTITY_DB, authorIds);
  const enriched = comments.map((cm) => ({
    id: cm.id,
    postId: cm.postId,
    userPseudonymId: cm.userPseudonymId,
    body: cm.body,
    createdAt: cm.createdAt,
    acceptsDm: cm.acceptsDm,
    authorNickname: nicks.get(cm.userPseudonymId) ?? null,
    isSelf: cm.userPseudonymId === me,
  }));
  return c.json({
    post,
    isAuthor: post.userPseudonymId === me,
    comments: enriched,
    modelVersion: MODEL_VERSION,
  });
});

// 작성자 본문 수정 — 본인 글만.
communityRoute.patch('/posts/:id', authMiddleware, rateLimit(50), async (c) => {
  const pseudonymId = c.get('userPseudonymId');
  const postId = c.req.param('id');
  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    return c.json({ error: { code: 'INVALID_JSON' } }, 400);
  }
  const parsed = UpdatePostRequest.safeParse(raw);
  if (!parsed.success) {
    return c.json({ error: { code: 'INVALID_INPUT' } }, 400);
  }
  const textCheck = moderateText(`${parsed.data.title}\n${parsed.data.body}`);
  if (!textCheck.allowed) {
    return c.json({ error: { code: textCheck.reason } }, 400);
  }
  const videoUrls =
    parsed.data.videoUrls.length > 0
      ? parsed.data.videoUrls
      : parsed.data.videoUrl
      ? [parsed.data.videoUrl]
      : [];
  for (const v of videoUrls) {
    const urlCheck = moderateVideoUrl(v);
    if (!urlCheck.allowed) {
      return c.json({ error: { code: urlCheck.reason } }, 400);
    }
  }
  const snsUrls =
    parsed.data.snsUrls.length > 0
      ? parsed.data.snsUrls
      : parsed.data.snsUrl
      ? [parsed.data.snsUrl]
      : [];
  if ((parsed.data.imageB64 === null) !== (parsed.data.imageMime === null)) {
    return c.json({ error: { code: 'INVALID_INPUT' } }, 400);
  }
  const ok = await updatePost(c.env.DB, postId, pseudonymId, {
    title: parsed.data.title,
    body: parsed.data.body,
    videoUrl: videoUrls[0] ?? null,
    snsUrl: snsUrls[0] ?? null,
    videoUrls,
    snsUrls,
    imageData: parsed.data.imageB64,
    imageMime: parsed.data.imageMime,
    imagePosition: parsed.data.imagePosition,
    bodyRich: parsed.data.bodyRich,
    allowLikes: parsed.data.allowLikes,
    allowComments: parsed.data.allowComments,
  });
  if (!ok) {
    return c.json({ error: { code: 'NOT_FOUND' } }, 404);
  }
  const post = await readPost(c.env.DB, postId);
  return c.json({ post, modelVersion: MODEL_VERSION });
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
    acceptsDm: parsed.data.acceptsDm,
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

// 작성자 댓글 수정 — 본인 댓글만.
communityRoute.patch('/posts/:id/comments/:commentId', authMiddleware, rateLimit(100), async (c) => {
  const pseudonymId = c.get('userPseudonymId');
  const commentId = c.req.param('commentId');
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
  const check = moderateText(parsed.data.body);
  if (!check.allowed) {
    return c.json({ error: { code: check.reason } }, 400);
  }
  const ok = await updateComment(c.env.DB, commentId, pseudonymId, parsed.data.body, parsed.data.acceptsDm);
  if (!ok) {
    return c.json({ error: { code: 'NOT_FOUND' } }, 404);
  }
  return c.json({ updated: true, modelVersion: MODEL_VERSION });
});

// 작성자 댓글 삭제 — 본인 댓글만.
communityRoute.delete('/posts/:id/comments/:commentId', authMiddleware, rateLimit(100), async (c) => {
  const pseudonymId = c.get('userPseudonymId');
  const commentId = c.req.param('commentId');
  const ok = await softDeleteComment(c.env.DB, commentId, pseudonymId);
  if (!ok) {
    return c.json({ error: { code: 'NOT_FOUND' } }, 404);
  }
  return c.json({ deleted: true });
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
  const isOwner = community.ownerPseudonymId === pseudonymId;
  const moderator = isOwner || (await canModerate(c.env, community, pseudonymId));
  return c.json({
    community,
    isOwner,
    isModerator: moderator,
    myStatus: follower?.status ?? null,
    modelVersion: MODEL_VERSION,
  });
});

// 모더레이션 권한: owner | 커뮤니티 관리자 | 사이트 관리자.
async function canModerate(
  env: Bindings,
  community: CommunityRow,
  pseudonymId: string,
): Promise<boolean> {
  if (community.ownerPseudonymId === pseudonymId) return true;
  if (await isCommunityAdmin(env.DB, community.id, pseudonymId)) return true;
  return isAdmin(env, pseudonymId);
}

// ── owner 전용: 공개/비공개 전환 ─────────────────────────────────────────
communityRoute.patch('/communities/:id', authMiddleware, rateLimit(30), async (c) => {
  const pseudonymId = c.get('userPseudonymId');
  const id = c.req.param('id');
  const community = await readCommunity(c.env.DB, id);
  if (!community) return c.json({ error: { code: 'NOT_FOUND' } }, 404);
  if (community.ownerPseudonymId !== pseudonymId) {
    return c.json({ error: { code: 'FORBIDDEN' } }, 403);
  }
  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    return c.json({ error: { code: 'INVALID_JSON' } }, 400);
  }
  const parsed = UpdateCommunityRequest.safeParse(raw);
  if (!parsed.success) return c.json({ error: { code: 'INVALID_INPUT' } }, 400);
  await updateCommunityVisibility(c.env.DB, id, parsed.data.visibility);
  const updated = await readCommunity(c.env.DB, id);
  return c.json({ community: updated, modelVersion: MODEL_VERSION });
});

// ── owner 전용: 커뮤니티 관리자 목록/지정/해제 ─────────────────────────────
communityRoute.get('/communities/:id/admins', authMiddleware, rateLimit(100), async (c) => {
  const pseudonymId = c.get('userPseudonymId');
  const id = c.req.param('id');
  const community = await readCommunity(c.env.DB, id);
  if (!community) return c.json({ error: { code: 'NOT_FOUND' } }, 404);
  if (community.ownerPseudonymId !== pseudonymId) {
    return c.json({ error: { code: 'FORBIDDEN' } }, 403);
  }
  const ids = await listCommunityAdmins(c.env.DB, id);
  const nicks = await resolveNicknames(c.env.IDENTITY_DB, ids);
  const admins = ids.map((pid) => ({ pseudonymId: pid, nickname: nicks.get(pid) ?? null }));
  return c.json({ admins, modelVersion: MODEL_VERSION });
});

communityRoute.post('/communities/:id/admins', authMiddleware, rateLimit(30), async (c) => {
  const pseudonymId = c.get('userPseudonymId');
  const id = c.req.param('id');
  const community = await readCommunity(c.env.DB, id);
  if (!community) return c.json({ error: { code: 'NOT_FOUND' } }, 404);
  if (community.ownerPseudonymId !== pseudonymId) {
    return c.json({ error: { code: 'FORBIDDEN' } }, 403);
  }
  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    return c.json({ error: { code: 'INVALID_JSON' } }, 400);
  }
  const parsed = AddCommunityAdminRequest.safeParse(raw);
  if (!parsed.success) return c.json({ error: { code: 'INVALID_INPUT' } }, 400);
  const targetId = await findPseudonymByNickname(c.env.IDENTITY_DB, parsed.data.nickname);
  if (!targetId) return c.json({ error: { code: 'USER_NOT_FOUND' } }, 404);
  await addCommunityAdmin(c.env.DB, id, targetId);
  return c.json({ ok: true, modelVersion: MODEL_VERSION });
});

communityRoute.delete('/communities/:id/admins/:pseudonym', authMiddleware, rateLimit(30), async (c) => {
  const pseudonymId = c.get('userPseudonymId');
  const id = c.req.param('id');
  const target = c.req.param('pseudonym');
  const community = await readCommunity(c.env.DB, id);
  if (!community) return c.json({ error: { code: 'NOT_FOUND' } }, 404);
  if (community.ownerPseudonymId !== pseudonymId) {
    return c.json({ error: { code: 'FORBIDDEN' } }, 403);
  }
  const ok = await removeCommunityAdmin(c.env.DB, id, target);
  if (!ok) return c.json({ error: { code: 'NOT_FOUND' } }, 404);
  return c.json({ ok: true, modelVersion: MODEL_VERSION });
});

// ── 모더레이션: 글/댓글 삭제 (owner/커뮤니티 관리자/사이트 관리자) ─────────
communityRoute.delete('/communities/:id/posts/:postId', authMiddleware, rateLimit(60), async (c) => {
  const pseudonymId = c.get('userPseudonymId');
  const id = c.req.param('id');
  const postId = c.req.param('postId');
  const community = await readCommunity(c.env.DB, id);
  if (!community) return c.json({ error: { code: 'NOT_FOUND' } }, 404);
  const post = await readPost(c.env.DB, postId);
  if (!post || post.communityId !== id) {
    return c.json({ error: { code: 'NOT_FOUND' } }, 404);
  }
  if (!(await canModerate(c.env, community, pseudonymId))) {
    return c.json({ error: { code: 'FORBIDDEN' } }, 403);
  }
  await moderatorDeletePost(c.env.DB, postId);
  return c.json({ deleted: true, modelVersion: MODEL_VERSION });
});

communityRoute.delete('/communities/:id/comments/:commentId', authMiddleware, rateLimit(60), async (c) => {
  const pseudonymId = c.get('userPseudonymId');
  const id = c.req.param('id');
  const commentId = c.req.param('commentId');
  const community = await readCommunity(c.env.DB, id);
  if (!community) return c.json({ error: { code: 'NOT_FOUND' } }, 404);
  const link = await readCommentCommunity(c.env.DB, commentId);
  if (!link || link.communityId !== id) {
    return c.json({ error: { code: 'NOT_FOUND' } }, 404);
  }
  if (!(await canModerate(c.env, community, pseudonymId))) {
    return c.json({ error: { code: 'FORBIDDEN' } }, 403);
  }
  await moderatorDeleteComment(c.env.DB, commentId);
  return c.json({ deleted: true, modelVersion: MODEL_VERSION });
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
