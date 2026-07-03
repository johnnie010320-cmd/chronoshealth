export type CommunityVisibility = 'public' | 'private';
export type FollowerStatus = 'active' | 'pending';

export type CommunityRow = {
  id: string;
  ownerPseudonymId: string;
  name: string;
  description: string;
  visibility: CommunityVisibility;
  allowLikesDefault: boolean;
  allowCommentsDefault: boolean;
  categoryId: string | null;
  createdAt: string;
  deletedAt: string | null;
  followerCount: number;
  postCount: number;
};

export type FollowerRow = {
  communityId: string;
  followerPseudonymId: string;
  status: FollowerStatus;
  createdAt: string;
};

type RawCommunity = {
  id: string;
  owner_pseudonym_id: string;
  name: string;
  description: string;
  visibility: string;
  allow_likes_default: number;
  allow_comments_default: number;
  category_id: string | null;
  created_at: string;
  deleted_at: string | null;
  follower_count: number;
  post_count: number;
};

function mapRow(row: RawCommunity): CommunityRow {
  return {
    id: row.id,
    ownerPseudonymId: row.owner_pseudonym_id,
    name: row.name,
    description: row.description,
    visibility: row.visibility as CommunityVisibility,
    allowLikesDefault: row.allow_likes_default === 1,
    allowCommentsDefault: row.allow_comments_default === 1,
    categoryId: row.category_id ?? null,
    createdAt: row.created_at,
    deletedAt: row.deleted_at,
    followerCount: row.follower_count,
    postCount: row.post_count,
  };
}

const SELECT_COMMUNITY = `
  SELECT
    c.id, c.owner_pseudonym_id, c.name, c.description, c.visibility,
    c.allow_likes_default, c.allow_comments_default, c.category_id, c.created_at, c.deleted_at,
    (SELECT COUNT(*) FROM community_followers f
       WHERE f.community_id = c.id AND f.status = 'active') AS follower_count,
    (SELECT COUNT(*) FROM community_posts p
       WHERE p.community_id = c.id AND p.deleted_at IS NULL) AS post_count
  FROM communities c
`;

export async function insertCommunity(
  db: D1Database,
  row: {
    id: string;
    ownerPseudonymId: string;
    name: string;
    description: string;
    visibility: CommunityVisibility;
    allowLikesDefault: boolean;
    allowCommentsDefault: boolean;
    categoryId: string | null;
  },
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO communities
         (id, owner_pseudonym_id, name, description, visibility,
          allow_likes_default, allow_comments_default, category_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      row.id,
      row.ownerPseudonymId,
      row.name,
      row.description,
      row.visibility,
      row.allowLikesDefault ? 1 : 0,
      row.allowCommentsDefault ? 1 : 0,
      row.categoryId,
    )
    .run();
  // owner 는 즉시 active follower 로 등록.
  await db
    .prepare(
      `INSERT INTO community_followers (community_id, follower_pseudonym_id, status)
       VALUES (?, ?, 'active')`,
    )
    .bind(row.id, row.ownerPseudonymId)
    .run();
}

export async function readCommunity(
  db: D1Database,
  id: string,
): Promise<CommunityRow | null> {
  const row = await db
    .prepare(`${SELECT_COMMUNITY} WHERE c.id = ? AND c.deleted_at IS NULL LIMIT 1`)
    .bind(id)
    .first<RawCommunity>();
  return row ? mapRow(row) : null;
}

// 공개 라운지를 제외한 공개 커뮤니티 발견 목록.
export async function listPublicCommunities(
  db: D1Database,
  limit: number,
): Promise<CommunityRow[]> {
  const result = await db
    .prepare(
      `${SELECT_COMMUNITY}
        WHERE c.visibility = 'public' AND c.deleted_at IS NULL AND c.id != '_lounge'
        ORDER BY follower_count DESC, c.created_at DESC
        LIMIT ?`,
    )
    .bind(limit)
    .all<RawCommunity>();
  return (result.results ?? []).map(mapRow);
}

// 내가 소유했거나 active 팔로워인 커뮤니티 (라운지 제외).
export async function listMyCommunities(
  db: D1Database,
  pseudonymId: string,
): Promise<CommunityRow[]> {
  const result = await db
    .prepare(
      `${SELECT_COMMUNITY}
        WHERE c.deleted_at IS NULL AND c.id != '_lounge'
          AND (
            c.owner_pseudonym_id = ?
            OR EXISTS (
              SELECT 1 FROM community_followers f
               WHERE f.community_id = c.id
                 AND f.follower_pseudonym_id = ?
                 AND f.status = 'active'
            )
          )
        ORDER BY c.created_at DESC`,
    )
    .bind(pseudonymId, pseudonymId)
    .all<RawCommunity>();
  return (result.results ?? []).map(mapRow);
}

export async function listAllCommunitiesAdmin(
  db: D1Database,
  includeDeleted: boolean,
): Promise<CommunityRow[]> {
  const where = includeDeleted ? '' : 'WHERE c.deleted_at IS NULL';
  const result = await db
    .prepare(`${SELECT_COMMUNITY} ${where} ORDER BY c.created_at DESC LIMIT 500`)
    .all<RawCommunity>();
  return (result.results ?? []).map(mapRow);
}

export async function softDeleteCommunity(
  db: D1Database,
  id: string,
): Promise<boolean> {
  if (id === '_lounge') return false;
  const res = await db
    .prepare(
      `UPDATE communities SET deleted_at = datetime('now')
        WHERE id = ? AND deleted_at IS NULL`,
    )
    .bind(id)
    .run();
  return (res.meta?.changes ?? 0) > 0;
}

// owner 가 공개/비공개 전환.
export async function updateCommunityVisibility(
  db: D1Database,
  id: string,
  visibility: CommunityVisibility,
): Promise<boolean> {
  const res = await db
    .prepare(
      `UPDATE communities SET visibility = ?
        WHERE id = ? AND deleted_at IS NULL`,
    )
    .bind(visibility, id)
    .run();
  return (res.meta?.changes ?? 0) > 0;
}

// 커뮤니티 관리자(owner 위임) — 모더레이션 권한.
export async function isCommunityAdmin(
  db: D1Database,
  communityId: string,
  pseudonymId: string,
): Promise<boolean> {
  const row = await db
    .prepare(
      `SELECT 1 FROM community_admins
        WHERE community_id = ? AND admin_pseudonym_id = ? LIMIT 1`,
    )
    .bind(communityId, pseudonymId)
    .first<{ '1': number }>();
  return row !== null;
}

export async function addCommunityAdmin(
  db: D1Database,
  communityId: string,
  pseudonymId: string,
): Promise<void> {
  await db
    .prepare(
      `INSERT OR IGNORE INTO community_admins (community_id, admin_pseudonym_id)
       VALUES (?, ?)`,
    )
    .bind(communityId, pseudonymId)
    .run();
  // 관리자는 active 팔로워로도 등록.
  await db
    .prepare(
      `INSERT OR IGNORE INTO community_followers (community_id, follower_pseudonym_id, status)
       VALUES (?, ?, 'active')`,
    )
    .bind(communityId, pseudonymId)
    .run();
}

export async function removeCommunityAdmin(
  db: D1Database,
  communityId: string,
  pseudonymId: string,
): Promise<boolean> {
  const res = await db
    .prepare(
      `DELETE FROM community_admins
        WHERE community_id = ? AND admin_pseudonym_id = ?`,
    )
    .bind(communityId, pseudonymId)
    .run();
  return (res.meta?.changes ?? 0) > 0;
}

export async function listCommunityAdmins(
  db: D1Database,
  communityId: string,
): Promise<string[]> {
  const { results } = await db
    .prepare(
      `SELECT admin_pseudonym_id FROM community_admins
        WHERE community_id = ? ORDER BY created_at ASC`,
    )
    .bind(communityId)
    .all<{ admin_pseudonym_id: string }>();
  return (results ?? []).map((r) => r.admin_pseudonym_id);
}

export async function readFollower(
  db: D1Database,
  communityId: string,
  pseudonymId: string,
): Promise<FollowerRow | null> {
  const row = await db
    .prepare(
      `SELECT community_id, follower_pseudonym_id, status, created_at
         FROM community_followers
        WHERE community_id = ? AND follower_pseudonym_id = ? LIMIT 1`,
    )
    .bind(communityId, pseudonymId)
    .first<{
      community_id: string;
      follower_pseudonym_id: string;
      status: string;
      created_at: string;
    }>();
  if (!row) return null;
  return {
    communityId: row.community_id,
    followerPseudonymId: row.follower_pseudonym_id,
    status: row.status as FollowerStatus,
    createdAt: row.created_at,
  };
}

// 팔로우 토글: 없으면 추가 (공개=active, 비공개=pending), 있으면 제거.
// owner 본인은 unfollow 거부.
export async function toggleFollow(
  db: D1Database,
  community: CommunityRow,
  pseudonymId: string,
): Promise<{ following: boolean; status: FollowerStatus | null }> {
  if (community.ownerPseudonymId === pseudonymId) {
    return { following: true, status: 'active' };
  }
  const existing = await readFollower(db, community.id, pseudonymId);
  if (existing) {
    await db
      .prepare(
        `DELETE FROM community_followers
          WHERE community_id = ? AND follower_pseudonym_id = ?`,
      )
      .bind(community.id, pseudonymId)
      .run();
    return { following: false, status: null };
  }
  const status: FollowerStatus = community.visibility === 'public' ? 'active' : 'pending';
  await db
    .prepare(
      `INSERT INTO community_followers (community_id, follower_pseudonym_id, status)
       VALUES (?, ?, ?)`,
    )
    .bind(community.id, pseudonymId, status)
    .run();
  return { following: status === 'active', status };
}

export async function listFollowers(
  db: D1Database,
  communityId: string,
  status: FollowerStatus | 'all',
): Promise<FollowerRow[]> {
  const where = status === 'all' ? '' : 'AND status = ?';
  const stmt = db.prepare(
    `SELECT community_id, follower_pseudonym_id, status, created_at
       FROM community_followers
      WHERE community_id = ? ${where}
      ORDER BY created_at ASC
      LIMIT 500`,
  );
  const bound = status === 'all' ? stmt.bind(communityId) : stmt.bind(communityId, status);
  const result = await bound.all<{
    community_id: string;
    follower_pseudonym_id: string;
    status: string;
    created_at: string;
  }>();
  return (result.results ?? []).map((row) => ({
    communityId: row.community_id,
    followerPseudonymId: row.follower_pseudonym_id,
    status: row.status as FollowerStatus,
    createdAt: row.created_at,
  }));
}

// 비공개 커뮤니티 owner 가 pending 팔로워를 승인.
export async function approveFollower(
  db: D1Database,
  communityId: string,
  pseudonymId: string,
): Promise<boolean> {
  const res = await db
    .prepare(
      `UPDATE community_followers SET status = 'active'
        WHERE community_id = ? AND follower_pseudonym_id = ? AND status = 'pending'`,
    )
    .bind(communityId, pseudonymId)
    .run();
  return (res.meta?.changes ?? 0) > 0;
}

export async function rejectFollower(
  db: D1Database,
  communityId: string,
  pseudonymId: string,
): Promise<boolean> {
  const res = await db
    .prepare(
      `DELETE FROM community_followers
        WHERE community_id = ? AND follower_pseudonym_id = ? AND status = 'pending'`,
    )
    .bind(communityId, pseudonymId)
    .run();
  return (res.meta?.changes ?? 0) > 0;
}
