// 관리자 감사 로그 — 변경작업 append + 조회. analysis DB(PII 0, actor는 pseudonym).

export type AuditEntry = {
  id: string;
  actorPseudonymId: string;
  action: string;
  target: string | null;
  detail: string | null;
  createdAt: string;
};

// 기록. 감사 실패가 본 작업을 깨지 않도록 내부에서 예외를 삼킨다.
export async function appendAudit(
  db: D1Database,
  e: { actorPseudonymId: string; action: string; target?: string | null; detail?: string | null },
): Promise<void> {
  try {
    await db
      .prepare(
        `INSERT INTO admin_audit_log (id, actor_pseudonym_id, action, target, detail)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .bind(
        crypto.randomUUID(),
        e.actorPseudonymId,
        e.action,
        e.target ?? null,
        e.detail == null ? null : e.detail.slice(0, 500),
      )
      .run();
  } catch (err) {
    console.error('appendAudit failed', err);
  }
}

export async function listAudit(
  db: D1Database,
  opts: { limit: number; before: string | null },
): Promise<AuditEntry[]> {
  const sql = opts.before
    ? `SELECT id, actor_pseudonym_id, action, target, detail, created_at
         FROM admin_audit_log WHERE created_at < ?
        ORDER BY created_at DESC LIMIT ?`
    : `SELECT id, actor_pseudonym_id, action, target, detail, created_at
         FROM admin_audit_log
        ORDER BY created_at DESC LIMIT ?`;
  const stmt = db.prepare(sql);
  const bound = opts.before ? stmt.bind(opts.before, opts.limit) : stmt.bind(opts.limit);
  const { results } = await bound.all<{
    id: string;
    actor_pseudonym_id: string;
    action: string;
    target: string | null;
    detail: string | null;
    created_at: string;
  }>();
  return (results ?? []).map((r) => ({
    id: r.id,
    actorPseudonymId: r.actor_pseudonym_id,
    action: r.action,
    target: r.target,
    detail: r.detail,
    createdAt: r.created_at,
  }));
}
