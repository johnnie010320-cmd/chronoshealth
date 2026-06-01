-- analysis DB R-Admin-2 일부 선행 활성화 — 약관 / 개인정보처리방침 / 의료 면책 콘텐츠.
-- spec: docs/legal/{terms,privacy}-ko-v1.md
-- ADR 0003 PII 격리 — 본 테이블에는 PII 0, 콘텐츠 텍스트만.

CREATE TABLE content_pages (
  slug TEXT PRIMARY KEY NOT NULL CHECK (slug IN ('terms','privacy','medical_disclaimer','operator_info')),
  locale TEXT NOT NULL DEFAULT 'ko' CHECK (locale IN ('ko','en','ja','es')),
  title TEXT NOT NULL,
  body_md TEXT NOT NULL,
  version TEXT NOT NULL,
  updated_by_pseudonym_id TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_content_pages_slug_locale ON content_pages(slug, locale);
