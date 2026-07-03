// 커뮤니티 3계층 — 고정 그룹(overcome/manage/talk) + 관리자 편집 하위 카테고리 + 큐레이션 동영상.

export type GroupKey = 'overcome' | 'manage' | 'talk';
export const GROUP_KEYS: GroupKey[] = ['overcome', 'manage', 'talk'];

export function isGroupKey(v: unknown): v is GroupKey {
  return v === 'overcome' || v === 'manage' || v === 'talk';
}

export type CommunityCategory = {
  id: string;
  groupKey: GroupKey;
  name: string;
  sortOrder: number;
};

export type FeaturedVideo = {
  id: string;
  groupKey: GroupKey | null;
  categoryId: string | null;
  title: string;
  videoUrl: string;
  sortOrder: number;
  createdAt: string;
};

// ── 카테고리 ───────────────────────────────────────────────────────────────
export async function listCategories(db: D1Database): Promise<CommunityCategory[]> {
  const { results } = await db
    .prepare(
      `SELECT id, group_key, name, sort_order
         FROM community_categories
        ORDER BY group_key ASC, sort_order ASC, name ASC`,
    )
    .all<{ id: string; group_key: string; name: string; sort_order: number }>();
  return (results ?? []).map((r) => ({
    id: r.id,
    groupKey: r.group_key as GroupKey,
    name: r.name,
    sortOrder: r.sort_order,
  }));
}

export async function insertCategory(
  db: D1Database,
  row: { id: string; groupKey: GroupKey; name: string; sortOrder: number },
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO community_categories (id, group_key, name, sort_order)
       VALUES (?, ?, ?, ?)`,
    )
    .bind(row.id, row.groupKey, row.name, row.sortOrder)
    .run();
}

export async function updateCategory(
  db: D1Database,
  id: string,
  patch: { name?: string | undefined; sortOrder?: number | undefined },
): Promise<boolean> {
  const sets: string[] = [];
  const args: unknown[] = [];
  if (patch.name !== undefined) {
    sets.push('name = ?');
    args.push(patch.name);
  }
  if (patch.sortOrder !== undefined) {
    sets.push('sort_order = ?');
    args.push(patch.sortOrder);
  }
  if (sets.length === 0) return false;
  args.push(id);
  const res = await db
    .prepare(`UPDATE community_categories SET ${sets.join(', ')} WHERE id = ?`)
    .bind(...args)
    .run();
  return (res.meta?.changes ?? 0) > 0;
}

// 카테고리 삭제 — 해당 커뮤니티는 미분류(NULL)로, 연결된 큐레이션 동영상도 삭제.
export async function deleteCategory(db: D1Database, id: string): Promise<boolean> {
  await db.prepare('UPDATE communities SET category_id = NULL WHERE category_id = ?').bind(id).run();
  await db.prepare('DELETE FROM community_featured_videos WHERE category_id = ?').bind(id).run();
  const res = await db.prepare('DELETE FROM community_categories WHERE id = ?').bind(id).run();
  return (res.meta?.changes ?? 0) > 0;
}

// ── 큐레이션 동영상 ─────────────────────────────────────────────────────────
function mapVideo(r: {
  id: string;
  group_key: string | null;
  category_id: string | null;
  title: string;
  video_url: string;
  sort_order: number;
  created_at: string;
}): FeaturedVideo {
  return {
    id: r.id,
    groupKey: (r.group_key as GroupKey | null) ?? null,
    categoryId: r.category_id,
    title: r.title,
    videoUrl: r.video_url,
    sortOrder: r.sort_order,
    createdAt: r.created_at,
  };
}

export async function listFeaturedVideos(db: D1Database): Promise<FeaturedVideo[]> {
  const { results } = await db
    .prepare(
      `SELECT id, group_key, category_id, title, video_url, sort_order, created_at
         FROM community_featured_videos
        ORDER BY sort_order ASC, created_at DESC`,
    )
    .all<{
      id: string;
      group_key: string | null;
      category_id: string | null;
      title: string;
      video_url: string;
      sort_order: number;
      created_at: string;
    }>();
  return (results ?? []).map(mapVideo);
}

export async function insertFeaturedVideo(
  db: D1Database,
  row: {
    id: string;
    groupKey: GroupKey | null;
    categoryId: string | null;
    title: string;
    videoUrl: string;
    sortOrder: number;
    createdByPseudonymId: string;
  },
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO community_featured_videos
         (id, group_key, category_id, title, video_url, sort_order, created_by_pseudonym_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      row.id,
      row.groupKey,
      row.categoryId,
      row.title,
      row.videoUrl,
      row.sortOrder,
      row.createdByPseudonymId,
    )
    .run();
}

export async function updateFeaturedVideo(
  db: D1Database,
  id: string,
  patch: {
    title?: string | undefined;
    videoUrl?: string | undefined;
    groupKey?: GroupKey | null | undefined;
    categoryId?: string | null | undefined;
    sortOrder?: number | undefined;
  },
): Promise<boolean> {
  const sets: string[] = [];
  const args: unknown[] = [];
  if (patch.title !== undefined) {
    sets.push('title = ?');
    args.push(patch.title);
  }
  if (patch.videoUrl !== undefined) {
    sets.push('video_url = ?');
    args.push(patch.videoUrl);
  }
  if (patch.groupKey !== undefined) {
    sets.push('group_key = ?');
    args.push(patch.groupKey);
  }
  if (patch.categoryId !== undefined) {
    sets.push('category_id = ?');
    args.push(patch.categoryId);
  }
  if (patch.sortOrder !== undefined) {
    sets.push('sort_order = ?');
    args.push(patch.sortOrder);
  }
  if (sets.length === 0) return false;
  args.push(id);
  const res = await db
    .prepare(`UPDATE community_featured_videos SET ${sets.join(', ')} WHERE id = ?`)
    .bind(...args)
    .run();
  return (res.meta?.changes ?? 0) > 0;
}

export async function deleteFeaturedVideo(db: D1Database, id: string): Promise<boolean> {
  const res = await db.prepare('DELETE FROM community_featured_videos WHERE id = ?').bind(id).run();
  return (res.meta?.changes ?? 0) > 0;
}

export async function categoryExists(db: D1Database, id: string): Promise<boolean> {
  const r = await db
    .prepare('SELECT 1 FROM community_categories WHERE id = ? LIMIT 1')
    .bind(id)
    .first<{ '1': number }>();
  return r !== null;
}
