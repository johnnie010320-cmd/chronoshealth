export type ContentSlug = 'terms' | 'privacy' | 'medical_disclaimer' | 'operator_info';
export type ContentLocale = 'ko' | 'en' | 'ja' | 'es';

export type ContentPage = {
  slug: ContentSlug;
  locale: ContentLocale;
  title: string;
  bodyMd: string;
  version: string;
  updatedByPseudonymId: string;
  updatedAt: string;
};

export async function readContentPage(
  db: D1Database,
  slug: ContentSlug,
  locale: ContentLocale,
): Promise<ContentPage | null> {
  const row = await db
    .prepare(
      `SELECT slug, locale, title, body_md, version, updated_by_pseudonym_id, updated_at
         FROM content_pages WHERE slug = ? AND locale = ? LIMIT 1`,
    )
    .bind(slug, locale)
    .first<{
      slug: string;
      locale: string;
      title: string;
      body_md: string;
      version: string;
      updated_by_pseudonym_id: string;
      updated_at: string;
    }>();
  if (!row) return null;
  return {
    slug: row.slug as ContentSlug,
    locale: row.locale as ContentLocale,
    title: row.title,
    bodyMd: row.body_md,
    version: row.version,
    updatedByPseudonymId: row.updated_by_pseudonym_id,
    updatedAt: row.updated_at,
  };
}

export async function upsertContentPage(
  db: D1Database,
  page: {
    slug: ContentSlug;
    locale: ContentLocale;
    title: string;
    bodyMd: string;
    version: string;
    updatedByPseudonymId: string;
  },
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO content_pages (slug, locale, title, body_md, version, updated_by_pseudonym_id)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT (slug, locale) DO UPDATE SET
         title = excluded.title,
         body_md = excluded.body_md,
         version = excluded.version,
         updated_by_pseudonym_id = excluded.updated_by_pseudonym_id,
         updated_at = datetime('now')`,
    )
    .bind(
      page.slug,
      page.locale,
      page.title,
      page.bodyMd,
      page.version,
      page.updatedByPseudonymId,
    )
    .run();
}

export async function listContentPages(
  db: D1Database,
): Promise<ContentPage[]> {
  const result = await db
    .prepare(
      `SELECT slug, locale, title, body_md, version, updated_by_pseudonym_id, updated_at
         FROM content_pages ORDER BY slug ASC`,
    )
    .all<{
      slug: string;
      locale: string;
      title: string;
      body_md: string;
      version: string;
      updated_by_pseudonym_id: string;
      updated_at: string;
    }>();
  return (result.results ?? []).map((row) => ({
    slug: row.slug as ContentSlug,
    locale: row.locale as ContentLocale,
    title: row.title,
    bodyMd: row.body_md,
    version: row.version,
    updatedByPseudonymId: row.updated_by_pseudonym_id,
    updatedAt: row.updated_at,
  }));
}
