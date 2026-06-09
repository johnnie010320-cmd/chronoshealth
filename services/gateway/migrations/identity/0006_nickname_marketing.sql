-- Twin 닉네임 + 마케팅 수신 동의.
-- 스토리보드 p11/p12: Twin 닉네임 2~8자, UNIQUE, 변경 불가.
-- 스토리보드 p10: 이벤트 등 안내 수신 (선택).

ALTER TABLE users ADD COLUMN nickname TEXT;
ALTER TABLE users ADD COLUMN marketing_opt_in INTEGER NOT NULL DEFAULT 0
  CHECK (marketing_opt_in IN (0,1));

CREATE UNIQUE INDEX idx_users_nickname ON users(nickname) WHERE nickname IS NOT NULL;
