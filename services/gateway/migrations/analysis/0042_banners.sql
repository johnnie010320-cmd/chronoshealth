-- 메인 배너(홈 히어로) — 관리자 업로드 이미지/동영상. 다중 + 순서. R2 = banners/<id>.<ext>.
-- 공개 노출(로그인 무관)이므로 PII 아님(analysis DB).
CREATE TABLE IF NOT EXISTS banners (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,            -- 'image' | 'video'
  r2_key TEXT NOT NULL,
  content_type TEXT NOT NULL,
  name TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  created_by_pseudonym_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_banners_sort ON banners(active, sort_order, created_at);
