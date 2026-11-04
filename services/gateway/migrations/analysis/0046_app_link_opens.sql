-- 0046 — 앱 받기 링크로 들어온 수 (2026-11-04, FormCoach v65 와 같은 방식).
-- SNS·메신저 공유 글에 붙는 vitacodeapp.com/get?from=<곳> 을 누른 수. 개인 식별 정보 없음(곳·OS 만).
-- 게이트웨이 GET /api/v1/app/get 만 쓴다. 관리자는 /api/v1/admin/app-link/stats 로 합계만 본다.

CREATE TABLE IF NOT EXISTS app_link_opens (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  source      TEXT,            -- vita_code | ... (공유한 곳, 웹이 붙인 from)
  os          TEXT NOT NULL    -- android | ios | other
);
CREATE INDEX IF NOT EXISTS app_link_opens_created_at ON app_link_opens (created_at);
