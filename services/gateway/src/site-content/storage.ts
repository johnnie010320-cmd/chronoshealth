// 회사 홍보 사이트(vitalabsinc.com) 편집 콘텐츠 — 자유 키-값. 0045 migration.

export type SiteContentRow = {
  key: string;
  value: string;
  updatedAt: string;
};

type Raw = {
  key: string;
  value: string;
  updated_at: string;
};

export async function listSiteContent(db: D1Database): Promise<SiteContentRow[]> {
  const res = await db
    .prepare('SELECT key, value, updated_at FROM site_content ORDER BY key ASC')
    .all<Raw>();
  return (res.results ?? []).map((r) => ({ key: r.key, value: r.value, updatedAt: r.updated_at }));
}

export async function upsertSiteContent(
  db: D1Database,
  key: string,
  value: string,
  byPseudonymId: string,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO site_content (key, value, updated_by_pseudonym_id, updated_at)
       VALUES (?, ?, ?, datetime('now'))
       ON CONFLICT(key) DO UPDATE SET
         value = excluded.value,
         updated_by_pseudonym_id = excluded.updated_by_pseudonym_id,
         updated_at = excluded.updated_at`,
    )
    .bind(key, value, byPseudonymId)
    .run();
}
