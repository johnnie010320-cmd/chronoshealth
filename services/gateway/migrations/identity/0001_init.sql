-- identity-vault Slice 01 init
-- spec: docs/spec/identity.md 5.1
-- ADR: 0003 (PII 격리), 0008 (D1), 0010 (단순 가입)
-- D1 인스턴스: chronoshealth-identity (binding IDENTITY_DB)

-- users: PII + pseudonym 매핑
CREATE TABLE users (
  user_pseudonym_id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL UNIQUE,
  birth_year INTEGER NOT NULL,
  sex TEXT NOT NULL CHECK (sex IN ('male','female','other')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK (length(name) BETWEEN 1 AND 40),
  CHECK (email LIKE '%@%')
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone);

-- session_tokens: 토큰 → pseudonym 매핑
CREATE TABLE session_tokens (
  token TEXT PRIMARY KEY NOT NULL,
  user_pseudonym_id TEXT NOT NULL,
  issued_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  FOREIGN KEY (user_pseudonym_id) REFERENCES users(user_pseudonym_id)
);

CREATE INDEX idx_session_tokens_user ON session_tokens(user_pseudonym_id);
CREATE INDEX idx_session_tokens_expires ON session_tokens(expires_at);

-- consent_log: 동의 변경 이력 (append-only)
CREATE TABLE consent_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_pseudonym_id TEXT NOT NULL,
  consent_kind TEXT NOT NULL CHECK (consent_kind IN ('medical','terms','research')),
  granted INTEGER NOT NULL CHECK (granted IN (0,1)),
  source TEXT NOT NULL,
  recorded_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_consent_log_user ON consent_log(user_pseudonym_id);

-- consent_log append-only 트리거
CREATE TRIGGER consent_log_no_update
  BEFORE UPDATE ON consent_log
  BEGIN
    SELECT RAISE(ABORT, 'consent_log is append-only');
  END;

CREATE TRIGGER consent_log_no_delete
  BEFORE DELETE ON consent_log
  BEGIN
    SELECT RAISE(ABORT, 'consent_log is append-only');
  END;
