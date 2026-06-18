-- analysis DB R-Admin — 공지사항. 관리자 작성 → 전체 사용자 노출.
-- spec: 관리자 대시보드 공지 기능 활성화 (2026-06-17 죠니 요청).
-- PII 0 — 작성자는 pseudonym 만 보유.

CREATE TABLE notices (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  pinned INTEGER NOT NULL DEFAULT 0 CHECK (pinned IN (0,1)),
  published INTEGER NOT NULL DEFAULT 1 CHECK (published IN (0,1)),
  created_by_pseudonym_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 공개 목록: published=1, pinned 우선, 최신순.
CREATE INDEX idx_notices_feed ON notices(published, pinned, created_at);
