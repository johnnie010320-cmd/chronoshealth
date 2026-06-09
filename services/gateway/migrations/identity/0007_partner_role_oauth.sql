-- 스토리보드 p4 — 회원 분류 3종 (admin/user/partner).
-- 스토리보드 p9 — SNS 로그인 4종 (kakao/facebook/naver/apple).
-- 본 마이그레이션: 컬럼·테이블 골격만 추가. 실제 OAuth 흐름 구현은
-- 각 제공사 클라이언트 키 등록 (kakao developers / naver developers / fb / apple developer console) 후 진행.

ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user'
  CHECK (role IN ('user','partner','admin'));

-- 제휴회원사 정보 (스토리보드 p4 — "사용자 계정 연동 필요").
CREATE TABLE partner_accounts (
  user_pseudonym_id TEXT PRIMARY KEY NOT NULL
    REFERENCES users(user_pseudonym_id) ON DELETE CASCADE,
  partner_code TEXT NOT NULL,
  partner_name TEXT NOT NULL,
  contact_email TEXT,
  approved_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_partner_code ON partner_accounts(partner_code);

-- SNS 로그인 연동 — 1 user ↔ N OAuth providers.
-- 본 슬라이스는 스키마만. 실제 redirect/callback/토큰 검증은 별도 PR.
CREATE TABLE oauth_accounts (
  provider TEXT NOT NULL CHECK (provider IN ('kakao','facebook','naver','apple')),
  external_id TEXT NOT NULL,
  user_pseudonym_id TEXT NOT NULL REFERENCES users(user_pseudonym_id) ON DELETE CASCADE,
  email TEXT,
  linked_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (provider, external_id)
);

CREATE INDEX idx_oauth_user ON oauth_accounts(user_pseudonym_id);
