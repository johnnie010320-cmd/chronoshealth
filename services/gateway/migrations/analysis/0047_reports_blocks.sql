-- 0047 — 신고·차단 (2026-11-08 죠니 — Google Play 사용자 제작 콘텐츠 정책: 앱 안 신고·사용자 차단 필수).
-- 회원끼리 글·댓글·메시지를 주고받으므로, 받는 쪽이 신고하고 상대를 차단할 수 있어야 한다.
-- pseudonym 만 저장(PII 없음). 관리자는 /api/v1/admin/reports 로 처리(내리기·문제없음).

CREATE TABLE IF NOT EXISTS content_reports (
  id                          TEXT PRIMARY KEY,
  reporter_pseudonym_id       TEXT NOT NULL,
  target_type                 TEXT NOT NULL,   -- post | comment | message
  target_id                   TEXT NOT NULL,
  target_owner_pseudonym_id   TEXT NOT NULL,   -- 신고 시점의 작성자(서버가 찾아 넣음)
  reason                      TEXT NOT NULL,   -- spam | abuse | sexual | violence | self_harm | misinfo | other
  detail                      TEXT,
  status                      TEXT NOT NULL DEFAULT 'open',  -- open | removed | dismissed
  created_at                  TEXT NOT NULL DEFAULT (datetime('now')),
  resolved_at                 TEXT,
  resolved_by_pseudonym_id    TEXT,
  UNIQUE (reporter_pseudonym_id, target_type, target_id)
);
CREATE INDEX IF NOT EXISTS content_reports_status_created ON content_reports (status, created_at);
CREATE INDEX IF NOT EXISTS content_reports_target ON content_reports (target_type, target_id);

CREATE TABLE IF NOT EXISTS user_blocks (
  blocker_pseudonym_id  TEXT NOT NULL,
  blocked_pseudonym_id  TEXT NOT NULL,
  created_at            TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (blocker_pseudonym_id, blocked_pseudonym_id)
);
CREATE INDEX IF NOT EXISTS user_blocks_blocked ON user_blocks (blocked_pseudonym_id);
