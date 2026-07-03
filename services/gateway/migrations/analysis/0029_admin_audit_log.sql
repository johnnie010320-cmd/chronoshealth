-- 관리자 변경 감사 로그 — 모든 관리자 변경작업 기록(날짜/시간/변경자/행위/상세).
-- PII 0: 변경자는 pseudonym_id(닉네임은 조회 시 IDENTITY_DB에서 해석).
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id TEXT PRIMARY KEY,
  actor_pseudonym_id TEXT NOT NULL,
  action TEXT NOT NULL,        -- 예: notice.create / content.update / user.role / community.delete
  target TEXT,                 -- 대상 식별자(공지 id, slug/locale, userId 등)
  detail TEXT,                 -- 변경 요약(제목·버전·역할 등)
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_admin_audit_created ON admin_audit_log(created_at DESC);
