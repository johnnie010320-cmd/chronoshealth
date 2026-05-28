-- analysis Slice R3 / ADR 0011 정합.
-- 가명화된 베타 등록자 — 이메일은 HMAC pseudonym 만, 평문 0.
-- D1 인스턴스: chronoshealth-analysis (binding DB)

CREATE TABLE beta_signups (
  id TEXT PRIMARY KEY NOT NULL,
  email_pseudonym TEXT NOT NULL,
  country TEXT NOT NULL,
  age_group TEXT NOT NULL CHECK (age_group IN ('19-29','30-39','40-49','50-59','60+')),
  interested_modules TEXT NOT NULL DEFAULT '[]',
  locale TEXT NOT NULL CHECK (locale IN ('ko','en','ja','es')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK (length(email_pseudonym) = 64), -- SHA-256 hex
  CHECK (length(country) = 2)
);

CREATE UNIQUE INDEX idx_beta_signups_pseudonym ON beta_signups(email_pseudonym);
CREATE INDEX idx_beta_signups_country_age ON beta_signups(country, age_group);
CREATE INDEX idx_beta_signups_created ON beta_signups(created_at);
