-- identity-vault — ADR 0012 비밀번호 도입 + 국적 + 약관 동의 버전 기록
-- spec: docs/spec/identity.md v2 (예정)
-- ADR: 0003 (PII 격리), 0010 보강, 0012 (비밀번호)

-- users 테이블 확장.
-- 기존 가입자(이미 D1에 있는 row)는 NULL 허용 → 다음 로그인 시 비밀번호 설정 강제.
ALTER TABLE users ADD COLUMN password_hash TEXT;
ALTER TABLE users ADD COLUMN password_salt TEXT;
ALTER TABLE users ADD COLUMN password_algo TEXT;
ALTER TABLE users ADD COLUMN nationality TEXT;
ALTER TABLE users ADD COLUMN consent_terms_version TEXT;
ALTER TABLE users ADD COLUMN consent_privacy_version TEXT;
ALTER TABLE users ADD COLUMN consent_recorded_at TEXT;
