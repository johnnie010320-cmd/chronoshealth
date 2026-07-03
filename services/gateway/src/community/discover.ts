// 커뮤니티 검색(공개 한정) + 오늘의 핫피플(주간 인기 크리에이터).

export type SearchCommunityRow = {
  id: string;
  name: string;
  description: string;
};

export type SearchPostRow = {
  id: string;
  communityId: string;
  communityName: string;
  authorPseudonymId: string;
  title: string;
  body: string;
  createdAt: string;
};

export type HotPersonRow = {
  authorPseudonymId: string;
  postCount: number;
  likeCount: number;
};

// LIKE 와일드카드 이스케이프.
function likeTerm(q: string): string {
  return `%${q.replace(/[\\%_]/g, (m) => `\\${m}`)}%`;
}

export async function searchCommunities(
  db: D1Database,
  q: string,
  limit: number,
): Promise<SearchCommunityRow[]> {
  const term = likeTerm(q);
  const { results } = await db
    .prepare(
      `SELECT id, name, description
         FROM communities
        WHERE deleted_at IS NULL AND visibility = 'public' AND id != '_lounge'
          AND (name LIKE ?1 ESCAPE '\\' OR description LIKE ?1 ESCAPE '\\')
        ORDER BY
          (SELECT COUNT(*) FROM community_followers f
            WHERE f.community_id = communities.id AND f.status = 'active') DESC,
          created_at DESC
        LIMIT ?2`,
    )
    .bind(term, limit)
    .all<{ id: string; name: string; description: string }>();
  return results ?? [];
}

export async function searchPosts(
  db: D1Database,
  q: string,
  limit: number,
): Promise<SearchPostRow[]> {
  const term = likeTerm(q);
  const { results } = await db
    .prepare(
      `SELECT p.id, p.community_id, p.user_pseudonym_id, p.title,
              substr(p.body, 1, 240) AS body, p.created_at, co.name AS community_name
         FROM community_posts p
         JOIN communities co ON co.id = p.community_id
        WHERE p.deleted_at IS NULL AND co.deleted_at IS NULL AND co.visibility = 'public'
          AND (p.title LIKE ?1 ESCAPE '\\' OR p.body LIKE ?1 ESCAPE '\\')
        ORDER BY p.created_at DESC
        LIMIT ?2`,
    )
    .bind(term, limit)
    .all<{
      id: string;
      community_id: string;
      user_pseudonym_id: string;
      title: string;
      body: string;
      created_at: string;
      community_name: string;
    }>();
  return (results ?? []).map((r) => ({
    id: r.id,
    communityId: r.community_id,
    communityName: r.community_name,
    authorPseudonymId: r.user_pseudonym_id,
    title: r.title,
    body: r.body,
    createdAt: r.created_at,
  }));
}

// 주간(기준 시각 이후) 게시물 수 + 받은 좋아요 수로 랭킹. system-seed 제외.
export async function hotPeople(
  db: D1Database,
  sinceIso: string,
  limit: number,
): Promise<HotPersonRow[]> {
  const { results } = await db
    .prepare(
      `SELECT p.user_pseudonym_id AS author,
              COUNT(DISTINCT p.id) AS post_count,
              COUNT(l.post_id) AS like_count
         FROM community_posts p
         JOIN communities co ON co.id = p.community_id
         LEFT JOIN community_likes l ON l.post_id = p.id AND l.created_at >= ?1
        WHERE p.deleted_at IS NULL AND co.visibility = 'public'
          AND p.created_at >= ?1
          AND p.user_pseudonym_id != 'system-seed'
        GROUP BY p.user_pseudonym_id
        ORDER BY like_count DESC, post_count DESC
        LIMIT ?2`,
    )
    .bind(sinceIso, limit)
    .all<{ author: string; post_count: number; like_count: number }>();
  return (results ?? []).map((r) => ({
    authorPseudonymId: r.author,
    postCount: r.post_count,
    likeCount: r.like_count,
  }));
}
