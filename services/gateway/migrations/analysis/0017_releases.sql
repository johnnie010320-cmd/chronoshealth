-- analysis DB — 개발 로그(releases). 빌드/배포 시 버전+빌드노트 누적.
-- spec: 2026-06-18 죠니 작업 규범 — 모든 새 빌드 시 관리자 개발 로그 갱신 필수.
-- PII 0 — 작성자 pseudonym 만.

CREATE TABLE releases (
  id TEXT PRIMARY KEY NOT NULL,
  component TEXT NOT NULL,          -- gateway | web | full 등
  version TEXT NOT NULL,            -- semver 또는 배포 식별자
  notes TEXT NOT NULL,             -- 빌드 노트(변경 요약)
  created_by_pseudonym_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_releases_created ON releases(created_at);
