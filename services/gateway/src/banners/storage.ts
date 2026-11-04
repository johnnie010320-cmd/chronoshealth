import type { BannerKind } from './files.js';

// 배너 노출 위치 — 'app'(VITAcode 앱 홈) | 'vitalabs'(회사 홍보 사이트). 0044 migration.
export type BannerPlacement = 'app' | 'vitalabs';

export function parsePlacement(v: unknown): BannerPlacement {
  return v === 'vitalabs' ? 'vitalabs' : 'app';
}

export type BannerRow = {
  id: string;
  kind: BannerKind;
  contentType: string;
  name: string | null;
  sortOrder: number;
  active: boolean;
  placement: BannerPlacement;
  createdAt: string;
};

type Raw = {
  id: string;
  kind: string;
  content_type: string;
  name: string | null;
  sort_order: number;
  active: number;
  placement: string | null;
  created_at: string;
};

function toRow(r: Raw): BannerRow {
  return {
    id: r.id,
    kind: r.kind === 'video' ? 'video' : 'image',
    contentType: r.content_type,
    name: r.name,
    sortOrder: r.sort_order,
    active: r.active === 1,
    placement: parsePlacement(r.placement),
    createdAt: r.created_at,
  };
}

export async function insertBanner(
  db: D1Database,
  b: {
    id: string;
    kind: BannerKind;
    r2Key: string;
    contentType: string;
    name: string | null;
    sortOrder: number;
    placement: BannerPlacement;
    createdByPseudonymId: string;
  },
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO banners (id, kind, r2_key, content_type, name, sort_order, active, placement, created_by_pseudonym_id)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`,
    )
    .bind(b.id, b.kind, b.r2Key, b.contentType, b.name, b.sortOrder, b.placement, b.createdByPseudonymId)
    .run();
}

// 다음 순서값은 placement 별로 독립(각 위치가 0,1,2… 자체 순서).
export async function nextSortOrder(db: D1Database, placement: BannerPlacement): Promise<number> {
  const r = await db
    .prepare('SELECT COALESCE(MAX(sort_order), -1) AS m FROM banners WHERE placement = ?')
    .bind(placement)
    .first<{ m: number }>();
  return (r?.m ?? -1) + 1;
}

export async function listActiveBanners(
  db: D1Database,
  placement: BannerPlacement,
): Promise<BannerRow[]> {
  const res = await db
    .prepare(
      `SELECT id, kind, content_type, name, sort_order, active, placement, created_at
         FROM banners WHERE active = 1 AND placement = ? ORDER BY sort_order ASC, created_at ASC`,
    )
    .bind(placement)
    .all<Raw>();
  return (res.results ?? []).map(toRow);
}

export async function listAllBanners(
  db: D1Database,
  placement: BannerPlacement,
): Promise<BannerRow[]> {
  const res = await db
    .prepare(
      `SELECT id, kind, content_type, name, sort_order, active, placement, created_at
         FROM banners WHERE placement = ? ORDER BY sort_order ASC, created_at ASC`,
    )
    .bind(placement)
    .all<Raw>();
  return (res.results ?? []).map(toRow);
}

export async function readBannerMedia(
  db: D1Database,
  id: string,
): Promise<{ r2Key: string; contentType: string } | null> {
  const r = await db
    .prepare('SELECT r2_key, content_type FROM banners WHERE id = ?')
    .bind(id)
    .first<{ r2_key: string; content_type: string }>();
  return r ? { r2Key: r.r2_key, contentType: r.content_type } : null;
}

export async function deleteBanner(db: D1Database, id: string): Promise<boolean> {
  const res = await db.prepare('DELETE FROM banners WHERE id = ?').bind(id).run();
  return (res.meta?.changes ?? 0) > 0;
}

export async function setBannerActive(db: D1Database, id: string, active: boolean): Promise<boolean> {
  const res = await db
    .prepare('UPDATE banners SET active = ? WHERE id = ?')
    .bind(active ? 1 : 0, id)
    .run();
  return (res.meta?.changes ?? 0) > 0;
}

// 순서 이동 — 같은 placement 내 인접 배너와 sort_order 교환.
export async function moveBanner(
  db: D1Database,
  id: string,
  dir: 'up' | 'down',
  placement: BannerPlacement,
): Promise<boolean> {
  const all = await listAllBanners(db, placement);
  const idx = all.findIndex((b) => b.id === id);
  if (idx < 0) return false;
  const swapIdx = dir === 'up' ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= all.length) return false;
  const a = all[idx];
  const b = all[swapIdx];
  if (!a || !b) return false;
  await db.batch([
    db.prepare('UPDATE banners SET sort_order = ? WHERE id = ?').bind(b.sortOrder, a.id),
    db.prepare('UPDATE banners SET sort_order = ? WHERE id = ?').bind(a.sortOrder, b.id),
  ]);
  return true;
}
