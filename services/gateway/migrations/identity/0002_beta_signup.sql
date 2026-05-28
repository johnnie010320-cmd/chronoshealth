-- identity-vault Slice R3 / ADR 0011 정합.
-- 평문 PII (이메일 + IP 해시 + UA + 동의 3종) 보관.
-- D1 인스턴스: chronoshealth-identity (binding IDENTITY_DB)

CREATE TABLE beta_signup_identity (
  id TEXT PRIMARY KEY NOT NULL,
  email TEXT NOT NULL,
  ip_hash TEXT NOT NULL,
  user_agent TEXT,
  consent_pii INTEGER NOT NULL CHECK (consent_pii = 1),
  consent_medical_disclaimer INTEGER NOT NULL CHECK (consent_medical_disclaimer = 1),
  consent_token_review INTEGER NOT NULL CHECK (consent_token_review = 1),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK (email LIKE '%@%'),
  CHECK (length(email) <= 254)
);

CREATE UNIQUE INDEX idx_beta_signup_identity_email ON beta_signup_identity(email);
CREATE INDEX idx_beta_signup_identity_created ON beta_signup_identity(created_at);
