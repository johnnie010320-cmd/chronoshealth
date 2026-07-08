import type { CareCategory } from './heuristics.js';
import type {
  CardI18n,
  UpdateCareAffiliateInput,
} from '../schemas/care-affiliates.js';

export type Locale = 'ko' | 'en' | 'ja' | 'es';

export type AffiliateCard = {
  slug: string;
  category: CareCategory;
  partner: string;
  title: string;
  body: string;
  ctaLabel: string;
  ctaUrl: string;
  // 실제 제휴 미연동 여부 — UI 가 "준비중" 안내로 처리하고 링크를 열지 않는다.
  comingSoon: boolean;
};

/** 관리자 화면용 원본 행 (로케일 미적용). */
export type AffiliateRow = {
  slug: string;
  category: CareCategory;
  partner: string;
  ctaUrl: string;
  /** 실제 노출에 쓰이는 값 = 저장값 OR 자리표시자 URL 강제 */
  comingSoon: boolean;
  /** DB 에 저장된 값 그대로 (관리자 토글 상태) */
  comingSoonStored: boolean;
  sortOrder: number;
  active: boolean;
  i18n: CardI18n;
  updatedAt: string;
};

// 자기 도메인(/care) 을 가리키면 아직 실제 제휴처가 연결되지 않은 자리표시자다.
// 관리자가 comingSoon=false 로 바꿔도 URL 이 자리표시자면 게이트웨이가 준비중으로 강제한다.
const PLACEHOLDER_URL = 'https://chronoshealth.ever-day.com/care';

function isPlaceholder(url: string): boolean {
  return url.startsWith(PLACEHOLDER_URL);
}

type DbRow = {
  slug: string;
  category: string;
  partner: string;
  cta_url: string;
  coming_soon: number;
  sort_order: number;
  active: number;
  i18n_json: string;
  updated_at: string;
};

function toCategory(v: string): CareCategory {
  return v === 'diet' || v === 'exercise' || v === 'medical' ? v : 'diet';
}

function toRow(r: DbRow): AffiliateRow {
  return {
    slug: r.slug,
    category: toCategory(r.category),
    partner: r.partner,
    ctaUrl: r.cta_url,
    comingSoon: r.coming_soon === 1 || isPlaceholder(r.cta_url),
    comingSoonStored: r.coming_soon === 1,
    sortOrder: r.sort_order,
    active: r.active === 1,
    i18n: JSON.parse(r.i18n_json) as CardI18n,
    updatedAt: r.updated_at,
  };
}

function localize(row: AffiliateRow, locale: Locale): AffiliateCard {
  const i = row.i18n[locale] ?? row.i18n.ko;
  return {
    slug: row.slug,
    category: row.category,
    partner: row.partner,
    title: i.title,
    body: i.body,
    ctaLabel: i.ctaLabel,
    ctaUrl: row.ctaUrl,
    comingSoon: row.comingSoon,
  };
}

/**
 * 공개 조회 — 활성 카드를 카테고리별로 묶어 반환. 1회 질의.
 * migration 0037 이전(테이블 부재/빈 상태)이면 빈 목록을 반환한다.
 */
export async function listAffiliatesByCategory(
  analysisDb: D1Database,
  locale: Locale,
): Promise<Record<CareCategory, AffiliateCard[]>> {
  const grouped: Record<CareCategory, AffiliateCard[]> = {
    diet: [],
    exercise: [],
    medical: [],
  };

  const { results } = await analysisDb
    .prepare(
      `SELECT slug, category, partner, cta_url, coming_soon, sort_order, active, i18n_json, updated_at
         FROM care_affiliates
        WHERE active = 1
        ORDER BY category ASC, sort_order ASC, slug ASC`,
    )
    .all<DbRow>();

  for (const r of results ?? []) {
    const row = toRow(r);
    grouped[row.category].push(localize(row, locale));
  }
  return grouped;
}

/** 관리자 목록 — 비활성 포함 전체. */
export async function listAllAffiliates(
  analysisDb: D1Database,
): Promise<AffiliateRow[]> {
  const { results } = await analysisDb
    .prepare(
      `SELECT slug, category, partner, cta_url, coming_soon, sort_order, active, i18n_json, updated_at
         FROM care_affiliates
        ORDER BY category ASC, sort_order ASC, slug ASC`,
    )
    .all<DbRow>();
  return (results ?? []).map(toRow);
}

export async function readAffiliate(
  analysisDb: D1Database,
  slug: string,
): Promise<AffiliateRow | null> {
  const row = await analysisDb
    .prepare(
      `SELECT slug, category, partner, cta_url, coming_soon, sort_order, active, i18n_json, updated_at
         FROM care_affiliates WHERE slug = ? LIMIT 1`,
    )
    .bind(slug)
    .first<DbRow>();
  return row ? toRow(row) : null;
}

export async function insertAffiliate(
  analysisDb: D1Database,
  args: {
    slug: string;
    category: CareCategory;
    partner: string;
    ctaUrl: string;
    comingSoon: boolean;
    sortOrder: number;
    active: boolean;
    i18n: CardI18n;
    updatedByPseudonymId: string;
  },
): Promise<void> {
  await analysisDb
    .prepare(
      `INSERT INTO care_affiliates
         (slug, category, partner, cta_url, coming_soon, sort_order, active, i18n_json, updated_at, updated_by_pseudonym_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      args.slug,
      args.category,
      args.partner,
      args.ctaUrl,
      args.comingSoon ? 1 : 0,
      args.sortOrder,
      args.active ? 1 : 0,
      JSON.stringify(args.i18n),
      new Date().toISOString(),
      args.updatedByPseudonymId,
    )
    .run();
}

export async function updateAffiliate(
  analysisDb: D1Database,
  slug: string,
  patch: UpdateCareAffiliateInput,
  updatedByPseudonymId: string,
): Promise<boolean> {
  const existing = await readAffiliate(analysisDb, slug);
  if (!existing) return false;

  const next = {
    category: patch.category ?? existing.category,
    partner: patch.partner ?? existing.partner,
    ctaUrl: patch.ctaUrl ?? existing.ctaUrl,
    // 명시 지정이 없으면 관리자 토글 "저장값"을 유지한다.
    // existing.comingSoon 은 자리표시자 강제가 섞인 파생값이라 그대로 쓰면
    // URL 을 실제 제휴처로 바꿔도 준비중이 풀리지 않는다.
    comingSoon: patch.comingSoon ?? existing.comingSoonStored,
    sortOrder: patch.sortOrder ?? existing.sortOrder,
    active: patch.active ?? existing.active,
    i18n: patch.i18n ?? existing.i18n,
  };

  const res = await analysisDb
    .prepare(
      `UPDATE care_affiliates
          SET category = ?, partner = ?, cta_url = ?, coming_soon = ?,
              sort_order = ?, active = ?, i18n_json = ?,
              updated_at = ?, updated_by_pseudonym_id = ?
        WHERE slug = ?`,
    )
    .bind(
      next.category,
      next.partner,
      next.ctaUrl,
      next.comingSoon ? 1 : 0,
      next.sortOrder,
      next.active ? 1 : 0,
      JSON.stringify(next.i18n),
      new Date().toISOString(),
      updatedByPseudonymId,
      slug,
    )
    .run();
  return (res.meta?.changes ?? 0) > 0;
}

export async function deleteAffiliate(
  analysisDb: D1Database,
  slug: string,
): Promise<boolean> {
  const res = await analysisDb
    .prepare('DELETE FROM care_affiliates WHERE slug = ?')
    .bind(slug)
    .run();
  return (res.meta?.changes ?? 0) > 0;
}

export const AFFILIATE_LOCALES: Locale[] = ['ko', 'en', 'ja', 'es'];
