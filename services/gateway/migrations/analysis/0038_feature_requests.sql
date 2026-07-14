-- 0038 — 기능 요청 및 버그 리포트.
-- 사용자가 마이페이지에서 추가 기능 요청/버그 리포트를 작성(submit)하면
-- 관리자 콘솔 "기능 요청 및 버그 리포트"에서 노출·검색·삭제·피드백.
--
-- 사용자: 본인 글 수정/삭제 + 관리자 피드백 확인.
-- 관리자: 전체 조회/검색 + 삭제 + 피드백 전송(상태 변경 포함).
--
-- PII 없음 — 작성자는 user_pseudonym_id 만 저장(ADR 0003). 관리자 화면의 작성자 표시는
-- 응답 시점에 identity DB 의 비-PII 닉네임(ADR 0015)으로만 해석한다.

CREATE TABLE IF NOT EXISTS feature_requests (
  id                             TEXT PRIMARY KEY,
  user_pseudonym_id              TEXT NOT NULL,
  kind                           TEXT NOT NULL DEFAULT 'feature', -- 'feature' | 'bug'
  title                          TEXT NOT NULL,
  body                           TEXT NOT NULL,
  status                         TEXT NOT NULL DEFAULT 'open',     -- open|planned|in_progress|done|declined
  admin_feedback                 TEXT,                             -- 관리자 답변(없으면 NULL)
  admin_feedback_at              TEXT,
  admin_feedback_by_pseudonym_id TEXT,
  created_at                     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at                     TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at                     TEXT
);

-- 본인 목록 조회(마이페이지) — 최신순.
CREATE INDEX IF NOT EXISTS idx_feature_requests_user
  ON feature_requests (user_pseudonym_id, deleted_at, created_at);

-- 관리자 전체 목록/검색 — 최신순.
CREATE INDEX IF NOT EXISTS idx_feature_requests_recent
  ON feature_requests (deleted_at, created_at);
