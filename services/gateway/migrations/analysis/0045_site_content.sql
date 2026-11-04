-- 0045 — 회사 홍보 사이트(vitalabsinc.com) 편집 콘텐츠.
-- 자유 키-값(미션/비전/가치/소개 등 카피 블록). 관리자가 재배포 없이 즉시 수정.
-- 회사 사이트 프론트는 기본값을 내장하고, 여기 값이 있으면 override.
-- 공개 마케팅 카피이므로 PII 아님(analysis DB). content_pages(약관/개인정보)와 분리.

CREATE TABLE IF NOT EXISTS site_content (
  key         TEXT PRIMARY KEY,            -- 예: 'company_mission', 'hero_title'
  value       TEXT NOT NULL DEFAULT '',
  updated_by_pseudonym_id TEXT,
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
