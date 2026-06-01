export type PostRow = {
  id: string;
  userPseudonymId: string;
  title: string;
  body: string;
  videoUrl: string | null;
  createdAt: string;
  likeCount: number;
  commentCount: number;
};

export type CommentRow = {
  id: string;
  postId: string;
  userPseudonymId: string;
  body: string;
  createdAt: string;
};

export async function insertPost(
  db: D1Database,
  row: { id: string; userPseudonymId: string; title: string; body: string; videoUrl: string | null },
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO community_posts (id, user_pseudonym_id, title, body, video_url)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .bind(row.id, row.userPseudonymId, row.title, row.body, row.videoUrl)
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

export async function readPost(db: D1Database, postId: string): Promise<PostRow | null> {
  const row = await db
    .prepare(
      `SELECT p.id, p.user_pseudonym_id, p.title, p.body, p.video_url, p.created_at,
              (SELECT COUNT(*) FROM community_likes l WHERE l.post_id = p.id) AS like_count,
              (SELECT COUNT(*) FROM community_comments c WHERE c.post_id = p.id AND c.deleted_at IS NULL) AS comment_count
         FROM community_posts p
        WHERE p.id = ? AND p.deleted_at IS NULL`,
    )
    .bind(postId)
    .first<{
      id: string;
      user_pseudonym_id: string;
      title: string;
      body: string;
      video_url: string | null;
      created_at: string;
      like_count: number;
      comment_count: number;
    }>();
  if (!row) return null;
  return {
    id: row.id,
    userPseudonymId: row.user_pseudonym_id,
    title: row.title,
    body: row.body,
    videoUrl: row.video_url,
    createdAt: row.created_at,
    likeCount: row.like_count,
    commentCount: row.comment_count,
  };
}

export async function listPosts(
  db: D1Database,
  opts: { limit: number; cursor: string | null },
): Promise<PostRow[]> {
  const cursorSql = opts.cursor ? 'AND p.created_at < ?' : '';
  const stmt = db.prepare(
    `SELECT p.id, p.user_pseudonym_id, p.title, p.body, p.video_url, p.created_at,
            (SELECT COUNT(*) FROM community_likes l WHERE l.post_id = p.id) AS like_count,
            (SELECT COUNT(*) FROM community_comments c WHERE c.post_id = p.id AND c.deleted_at IS NULL) AS comment_count
       FROM community_posts p
      WHERE p.deleted_at IS NULL ${cursorSql}
      ORDER BY p.created_at DESC
      LIMIT ?`,
  );
  const bound = opts.cursor ? stmt.bind(opts.cursor, opts.limit) : stmt.bind(opts.limit);
  const result = await bound.all<{
    id: string;
    user_pseudonym_id: string;
    title: string;
    body: string;
    video_url: string | null;
    created_at: string;
    like_count: number;
    comment_count: number;
  }>();
  return (result.results ?? []).map((row) => ({
    id: row.id,
    userPseudonymId: row.user_pseudonym_id,
    title: row.title,
    body: row.body,
    videoUrl: row.video_url,
    createdAt: row.created_at,
    likeCount: row.like_count,
    commentCount: row.comment_count,
  }));
}

export async function listTrending(
  db: D1Database,
  limit: number,
): Promise<PostRow[]> {
  const result = await db
    .prepare(
      `SELECT p.id, p.user_pseudonym_id, p.title, p.body, p.video_url, p.created_at,
              (SELECT COUNT(*) FROM community_likes l
                WHERE l.post_id = p.id AND l.created_at > datetime('now','-1 day')) AS like_count,
              (SELECT COUNT(*) FROM community_comments c WHERE c.post_id = p.id AND c.deleted_at IS NULL) AS comment_count
         FROM community_posts p
        WHERE p.deleted_at IS NULL
          AND p.created_at > datetime('now','-7 day')
        ORDER BY like_count DESC, p.created_at DESC
        LIMIT ?`,
    )
    .bind(limit)
    .all<{
      id: string;
      user_pseudonym_id: string;
      title: string;
      body: string;
      video_url: string | null;
      created_at: string;
      like_count: number;
      comment_count: number;
    }>();
  return (result.results ?? []).map((row) => ({
    id: row.id,
    userPseudonymId: row.user_pseudonym_id,
    title: row.title,
    body: row.body,
    videoUrl: row.video_url,
    createdAt: row.created_at,
    likeCount: row.like_count,
    commentCount: row.comment_count,
  }));
}

export async function insertComment(
  db: D1Database,
  row: { id: string; postId: string; userPseudonymId: string; body: string },
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO community_comments (id, post_id, user_pseudonym_id, body)
       VALUES (?, ?, ?, ?)`,
    )
    .bind(row.id, row.postId, row.userPseudonymId, row.body)
    .run();
}

export async function listComments(db: D1Database, postId: string): Promise<CommentRow[]> {
  const result = await db
    .prepare(
      `SELECT id, post_id, user_pseudonym_id, body, created_at
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
      created_at: string;
    }>();
  return (result.results ?? []).map((row) => ({
    id: row.id,
    postId: row.post_id,
    userPseudonymId: row.user_pseudonym_id,
    body: row.body,
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
