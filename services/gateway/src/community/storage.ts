export type PostRow = {
  id: string;
  communityId: string;
  userPseudonymId: string;
  title: string;
  body: string;
  videoUrl: string | null;
  snsUrl: string | null;
  imageMime: string | null;
  hasImage: boolean;
  // imageData 는 상세 조회(readPost)에서만 채워짐. 목록(listPosts)에서는 undefined.
  imageData?: string | null;
  createdAt: string;
  likeCount: number;
  commentCount: number;
  allowLikes: boolean;
  allowComments: boolean;
  tag: string | null;
};

export type CommentRow = {
  id: string;
  postId: string;
  userPseudonymId: string;
  body: string;
  acceptsDm: boolean;
  createdAt: string;
};

export async function insertPost(
  db: D1Database,
  row: {
    id: string;
    communityId: string;
    userPseudonymId: string;
    title: string;
    body: string;
    videoUrl: string | null;
    snsUrl: string | null;
    imageData: string | null;
    imageMime: string | null;
    allowLikes: boolean;
    allowComments: boolean;
    tag: string | null;
  },
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO community_posts
         (id, community_id, user_pseudonym_id, title, body, video_url, sns_url, image_data, image_mime, allow_likes, allow_comments, tag)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      row.id,
      row.communityId,
      row.userPseudonymId,
      row.title,
      row.body,
      row.videoUrl,
      row.snsUrl,
      row.imageData,
      row.imageMime,
      row.allowLikes ? 1 : 0,
      row.allowComments ? 1 : 0,
      row.tag,
    )
    .run();
}

export async function softDeletePost(
  db: D1Database,
  postId: string,
  userPseudonymId: string,
): Promise<boolean> {
  const res = await db
    .prepare(
      `UPDATE community_posts SET deleted_at = datetime('now')
        WHERE id = ? AND user_pseudonym_id = ? AND deleted_at IS NULL`,
    )
    .bind(postId, userPseudonymId)
    .run();
  return (res.meta?.changes ?? 0) > 0;
}

type PostRawRow = {
  id: string;
  community_id: string;
  user_pseudonym_id: string;
  title: string;
  body: string;
  video_url: string | null;
  sns_url: string | null;
  image_mime: string | null;
  has_image: number;
  image_data?: string | null;
  created_at: string;
  like_count: number;
  comment_count: number;
  allow_likes: number;
  allow_comments: number;
  tag: string | null;
};

function mapPost(row: PostRawRow): PostRow {
  const post: PostRow = {
    id: row.id,
    communityId: row.community_id,
    userPseudonymId: row.user_pseudonym_id,
    title: row.title,
    body: row.body,
    videoUrl: row.video_url,
    snsUrl: row.sns_url,
    imageMime: row.image_mime,
    hasImage: row.has_image === 1,
    createdAt: row.created_at,
    likeCount: row.like_count,
    commentCount: row.comment_count,
    allowLikes: row.allow_likes === 1,
    allowComments: row.allow_comments === 1,
    tag: row.tag,
  };
  // image_data 는 상세 조회 시에만 SELECT 됨.
  if (row.image_data !== undefined) post.imageData = row.image_data;
  return post;
}

// 목록/피드용 — image_data 본문은 제외(피드 경량화), 존재 여부(has_image)만.
const POST_SELECT = `
  SELECT p.id, p.community_id, p.user_pseudonym_id, p.title, p.body, p.video_url,
         p.sns_url, p.image_mime,
         CASE WHEN p.image_data IS NOT NULL THEN 1 ELSE 0 END AS has_image,
         p.created_at, p.allow_likes, p.allow_comments, p.tag,
         (SELECT COUNT(*) FROM community_likes l WHERE l.post_id = p.id) AS like_count,
         (SELECT COUNT(*) FROM community_comments c
            WHERE c.post_id = p.id AND c.deleted_at IS NULL) AS comment_count
    FROM community_posts p
`;

export async function readPost(db: D1Database, postId: string): Promise<PostRow | null> {
  // 상세 조회는 image_data(base64) 본문까지 포함.
  const row = await db
    .prepare(
      `SELECT p.id, p.community_id, p.user_pseudonym_id, p.title, p.body, p.video_url,
              p.sns_url, p.image_mime, p.image_data,
              CASE WHEN p.image_data IS NOT NULL THEN 1 ELSE 0 END AS has_image,
              p.created_at, p.allow_likes, p.allow_comments, p.tag,
              (SELECT COUNT(*) FROM community_likes l WHERE l.post_id = p.id) AS like_count,
              (SELECT COUNT(*) FROM community_comments c
                 WHERE c.post_id = p.id AND c.deleted_at IS NULL) AS comment_count
         FROM community_posts p
        WHERE p.id = ? AND p.deleted_at IS NULL`,
    )
    .bind(postId)
    .first<PostRawRow>();
  return row ? mapPost(row) : null;
}

export async function listPosts(
  db: D1Database,
  opts: {
    limit: number;
    cursor: string | null;
    communityId?: string | null;
    tag?: string | null;
    userPseudonymId?: string | null;
  },
): Promise<PostRow[]> {
  const filters: string[] = ['p.deleted_at IS NULL'];
  const args: unknown[] = [];
  if (opts.communityId) {
    filters.push('p.community_id = ?');
    args.push(opts.communityId);
  }
  if (opts.tag) {
    filters.push('p.tag = ?');
    args.push(opts.tag);
  }
  if (opts.userPseudonymId) {
    filters.push('p.user_pseudonym_id = ?');
    args.push(opts.userPseudonymId);
  }
  if (opts.cursor) {
    filters.push('p.created_at < ?');
    args.push(opts.cursor);
  }
  args.push(opts.limit);
  const stmt = db.prepare(
    `${POST_SELECT} WHERE ${filters.join(' AND ')}
      ORDER BY p.created_at DESC
      LIMIT ?`,
  );
  const result = await stmt.bind(...args).all<PostRawRow>();
  return (result.results ?? []).map(mapPost);
}

export type CommentWithPost = {
  id: string;
  postId: string;
  postTitle: string;
  body: string;
  createdAt: string;
};

export async function listMyComments(
  db: D1Database,
  userPseudonymId: string,
  limit: number,
): Promise<CommentWithPost[]> {
  const result = await db
    .prepare(
      `SELECT c.id, c.post_id, c.body, c.created_at, p.title AS post_title
         FROM community_comments c
         JOIN community_posts p ON p.id = c.post_id
        WHERE c.user_pseudonym_id = ? AND c.deleted_at IS NULL
        ORDER BY c.created_at DESC
        LIMIT ?`,
    )
    .bind(userPseudonymId, limit)
    .all<{
      id: string;
      post_id: string;
      body: string;
      created_at: string;
      post_title: string;
    }>();
  return (result.results ?? []).map((row) => ({
    id: row.id,
    postId: row.post_id,
    postTitle: row.post_title,
    body: row.body,
    createdAt: row.created_at,
  }));
}

export async function listTrending(
  db: D1Database,
  limit: number,
): Promise<PostRow[]> {
  const result = await db
    .prepare(
      `SELECT p.id, p.community_id, p.user_pseudonym_id, p.title, p.body, p.video_url,
              p.created_at, p.allow_likes, p.allow_comments, p.tag,
              (SELECT COUNT(*) FROM community_likes l
                WHERE l.post_id = p.id AND l.created_at > datetime('now','-1 day')) AS like_count,
              (SELECT COUNT(*) FROM community_comments c
                WHERE c.post_id = p.id AND c.deleted_at IS NULL) AS comment_count
         FROM community_posts p
        WHERE p.deleted_at IS NULL
          AND p.created_at > datetime('now','-7 day')
        ORDER BY like_count DESC, p.created_at DESC
        LIMIT ?`,
    )
    .bind(limit)
    .all<PostRawRow>();
  return (result.results ?? []).map(mapPost);
}

export async function insertComment(
  db: D1Database,
  row: { id: string; postId: string; userPseudonymId: string; body: string; acceptsDm: boolean },
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO community_comments (id, post_id, user_pseudonym_id, body, accepts_dm)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .bind(row.id, row.postId, row.userPseudonymId, row.body, row.acceptsDm ? 1 : 0)
    .run();
}

// 모더레이터(owner/커뮤니티 관리자/사이트 관리자) 가 임의의 글을 삭제 — 작성자 일치 검사 없음.
export async function moderatorDeletePost(db: D1Database, postId: string): Promise<boolean> {
  const res = await db
    .prepare(
      `UPDATE community_posts SET deleted_at = datetime('now')
        WHERE id = ? AND deleted_at IS NULL`,
    )
    .bind(postId)
    .run();
  return (res.meta?.changes ?? 0) > 0;
}

// 모더레이터가 임의의 댓글을 삭제(다른 회원 댓글 포함).
export async function moderatorDeleteComment(db: D1Database, commentId: string): Promise<boolean> {
  const res = await db
    .prepare(
      `UPDATE community_comments SET deleted_at = datetime('now')
        WHERE id = ? AND deleted_at IS NULL`,
    )
    .bind(commentId)
    .run();
  return (res.meta?.changes ?? 0) > 0;
}

// 댓글 1건 조회 — 모더레이션 시 소속 커뮤니티 확인용.
export async function readCommentCommunity(
  db: D1Database,
  commentId: string,
): Promise<{ commentId: string; communityId: string } | null> {
  const row = await db
    .prepare(
      `SELECT c.id AS comment_id, p.community_id AS community_id
         FROM community_comments c
         JOIN community_posts p ON p.id = c.post_id
        WHERE c.id = ? AND c.deleted_at IS NULL LIMIT 1`,
    )
    .bind(commentId)
    .first<{ comment_id: string; community_id: string }>();
  return row ? { commentId: row.comment_id, communityId: row.community_id } : null;
}

export async function listComments(db: D1Database, postId: string): Promise<CommentRow[]> {
  const result = await db
    .prepare(
      `SELECT id, post_id, user_pseudonym_id, body, accepts_dm, created_at
         FROM community_comments
        WHERE post_id = ? AND deleted_at IS NULL
        ORDER BY created_at ASC`,
    )
    .bind(postId)
    .all<{
      id: string;
      post_id: string;
      user_pseudonym_id: string;
      body: string;
      accepts_dm: number;
      created_at: string;
    }>();
  return (result.results ?? []).map((row) => ({
    id: row.id,
    postId: row.post_id,
    userPseudonymId: row.user_pseudonym_id,
    body: row.body,
    acceptsDm: row.accepts_dm === 1,
    createdAt: row.created_at,
  }));
}

export async function toggleLike(
  db: D1Database,
  postId: string,
  userPseudonymId: string,
): Promise<{ liked: boolean }> {
  const existing = await db
    .prepare(
      `SELECT 1 FROM community_likes WHERE user_pseudonym_id = ? AND post_id = ? LIMIT 1`,
    )
    .bind(userPseudonymId, postId)
    .first<{ '1': number }>();
  if (existing) {
    await db
      .prepare(`DELETE FROM community_likes WHERE user_pseudonym_id = ? AND post_id = ?`)
      .bind(userPseudonymId, postId)
      .run();
    return { liked: false };
  }
  await db
    .prepare(
      `INSERT INTO community_likes (user_pseudonym_id, post_id) VALUES (?, ?)`,
    )
    .bind(userPseudonymId, postId)
    .run();
  return { liked: true };
}
