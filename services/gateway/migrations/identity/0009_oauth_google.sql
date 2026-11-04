-- SNS 로그인 실구현 — provider 목록에 'google' 추가.
-- 0007은 스토리보드 p9(kakao/facebook/naver/apple) 기준이었으나, 실제 구현 대상은
-- kakao/google/naver/apple. facebook은 CHECK에 남겨 하위호환 유지(미사용).
-- oauth_accounts는 아직 미사용(빈 테이블) → CHECK 확장 위해 테이블 재생성.
-- SQLite는 CHECK 제약 ALTER 불가 → users 0004와 동일한 재생성 패턴.

PRAGMA foreign_keys = OFF;

CREATE TABLE oauth_accounts_new (
  provider TEXT NOT NULL
    CHECK (provider IN ('kakao','google','naver','apple','facebook')),
  external_id TEXT NOT NULL,
  user_pseudonym_id TEXT NOT NULL
    REFERENCES users(user_pseudonym_id) ON DELETE CASCADE,
  email TEXT,
  linked_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (provider, external_id)
);

INSERT INTO oauth_accounts_new (provider, external_id, user_pseudonym_id, email, linked_at)
SELECT provider, external_id, user_pseudonym_id, email, linked_at
FROM oauth_accounts;

DROP TABLE oauth_accounts;
ALTER TABLE oauth_accounts_new RENAME TO oauth_accounts;

CREATE INDEX idx_oauth_user ON oauth_accounts(user_pseudonym_id);

PRAGMA foreign_keys = ON;
