-- 0044 — 배너를 "노출 위치(placement)"별로 분리.
--   'app'      = VITAcode 앱 홈 히어로(vitacodeapp.com) — 기존 동작(기본값)
--   'vitalabs' = 회사 홍보 사이트(vitalabsinc.com) 홈 배너
-- 기존 배너는 전부 'app'으로 유지(무변화). 회사 사이트 배너는 별도로 쌓인다.
-- 공개 노출(로그인 무관)이라 PII 아님(analysis DB). 스키마 확장(ADD COLUMN).

ALTER TABLE banners ADD COLUMN placement TEXT NOT NULL DEFAULT 'app';

-- placement 우선 조회 인덱스(기존 idx_banners_sort 는 유지).
CREATE INDEX IF NOT EXISTS idx_banners_placement
  ON banners (placement, active, sort_order, created_at);
