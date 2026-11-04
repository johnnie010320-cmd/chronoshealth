-- identity DB — 비밀번호 재설정 링크 토큰 (이메일 링크 방식, 2026-10-18).
-- 배경: 기존 P1 재설정은 '가입 이메일 + 전화번호' 지식기반 확인이라 두 값을 아는 제3자가 비밀번호를
--       바꿀 수 있었다. 이메일 소유 확인(링크)으로 교체한다. 계정 PII 와 같은 identity-vault 에 둔다(ADR 0003).
--
-- 저장 원칙:
--   - 토큰 원문은 메일 링크에만 존재. DB 에는 SHA-256 hex(token_hash)만 저장 → DB 유출 시에도 링크 재구성 불가.
--   - 1회용(used_at), 단기 만료(expires_at, 코드 기본 30분).
--   - 시각 컬럼은 전부 코드가 넣는 ISO-8601 UTC 문자열('2026-10-18T03:00:00.000Z').
--     datetime('now')(공백 구분 형식)와 섞으면 문자열 비교가 틀어지므로 DEFAULT 를 두지 않는다.
--   - 회원 탈퇴(users 삭제) 시 함께 삭제(ON DELETE CASCADE).

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  token_hash        TEXT PRIMARY KEY,
  user_pseudonym_id TEXT NOT NULL
    REFERENCES users(user_pseudonym_id) ON DELETE CASCADE,
  created_at        TEXT NOT NULL,
  expires_at        TEXT NOT NULL,
  used_at           TEXT
);

-- 사용자별 최근 발급 수 집계(이메일당 발급 제한) + 미사용 토큰 일괄 무효화.
CREATE INDEX IF NOT EXISTS idx_password_reset_user_created
  ON password_reset_tokens(user_pseudonym_id, created_at);

-- 만료 토큰 정리용.
CREATE INDEX IF NOT EXISTS idx_password_reset_expires
  ON password_reset_tokens(expires_at);
