-- ADR 0013 — 2단계 회원가입 도입.
-- users 테이블의 본인정보 필드 (name/phone/birth_year/sex) NULL 허용.
-- SQLite는 ALTER COLUMN NOT NULL 변경 불가 → 테이블 재생성 패턴.
-- 기존 가입자 데이터는 그대로 복사.

PRAGMA foreign_keys = OFF;

CREATE TABLE users_new (
  user_pseudonym_id TEXT PRIMARY KEY NOT NULL,
  name TEXT,
  email TEXT NOT NULL UNIQUE,
  phone TEXT UNIQUE,
  birth_year INTEGER,
  sex TEXT CHECK (sex IN ('male','female','other')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  password_hash TEXT,
  password_salt TEXT,
  password_algo TEXT,
  nationality TEXT,
  consent_terms_version TEXT,
  consent_privacy_version TEXT,
  consent_recorded_at TEXT,
  CHECK (length(name) IS NULL OR length(name) BETWEEN 1 AND 40),
  CHECK (email LIKE '%@%')
);

INSERT INTO users_new (
  user_pseudonym_id, name, email, phone, birth_year, sex, created_at,
  password_hash, password_salt, password_algo, nationality,
  consent_terms_version, consent_privacy_version, consent_recorded_at
)
SELECT
  user_pseudonym_id, name, email, phone, birth_year, sex, created_at,
  password_hash, password_salt, password_algo, nationality,
  consent_terms_version, consent_privacy_version, consent_recorded_at
FROM users;

DROP TABLE users;
ALTER TABLE users_new RENAME TO users;

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone);

PRAGMA foreign_keys = ON;
