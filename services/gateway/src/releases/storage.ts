// 개발 로그(releases) D1 접근 — analysis DB. PII 0.

export type ReleaseRow = {
  id: string;
  component: string;
  version: string;
  notes: string;
  createdAt: string;
};

type RawRelease = {
  id: string;
  component: string;
  version: string;
  notes: string;
  created_at: string;
};

export async function insertRelease(
  db: D1Database,
  row: { id: string; component: string; version: string; notes: string; createdByPseudonymId: string },
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO releases (id, component, version, notes, created_by_pseudonym_id)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .bind(row.id, row.component, row.version, row.notes, row.createdByPseudonymId)
    .run();
}

export async function listReleases(db: D1Database, limit: number): Promise<ReleaseRow[]> {
  const { results } = await db
    .prepare(
      `SELECT id, component, version, notes, created_at FROM releases
        ORDER BY created_at DESC LIMIT ?`,
    )
    .bind(limit)
    .all<RawRelease>();
  return (results ?? []).map((r) => ({
    id: r.id,
    component: r.component,
    version: r.version,
    notes: r.notes,
    createdAt: r.created_at,
  }));
}

export async function deleteRelease(db: D1Database, id: string): Promise<boolean> {
  const res = await db.prepare('DELETE FROM releases WHERE id = ?').bind(id).run();
  return (res.meta?.changes ?? 0) > 0;
}
