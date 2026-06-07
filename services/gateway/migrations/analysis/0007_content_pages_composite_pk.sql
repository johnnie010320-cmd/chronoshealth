-- content_pages 의 PRIMARY KEY 를 slug 단독 → (slug, locale) 복합으로 변경.
-- 사유: 0006 시점에는 ko 만 시드했으나 en/ja/es 다국어 약관·개인정보 시드를 위해
-- 동일 slug 의 locale 별 행이 필요. SQLite 는 PK 변경을 ALTER 로 지원하지 않으므로
-- 재생성 + 데이터 복사 패턴 사용.
-- spec: docs/legal/{terms,privacy}-*-v1.md

CREATE TABLE content_pages_new (
  slug TEXT NOT NULL CHECK (slug IN ('terms','privacy','medical_disclaimer','operator_info')),
  locale TEXT NOT NULL DEFAULT 'ko' CHECK (locale IN ('ko','en','ja','es')),
  title TEXT NOT NULL,
  body_md TEXT NOT NULL,
  version TEXT NOT NULL,
  updated_by_pseudonym_id TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (slug, locale)
);

INSERT INTO content_pages_new (slug, locale, title, body_md, version, updated_by_pseudonym_id, updated_at)
SELECT slug, locale, title, body_md, version, updated_by_pseudonym_id, updated_at FROM content_pages;

DROP INDEX IF EXISTS idx_content_pages_slug_locale;
DROP TABLE content_pages;

ALTER TABLE content_pages_new RENAME TO content_pages;

CREATE INDEX idx_content_pages_slug_locale ON content_pages(slug, locale);
