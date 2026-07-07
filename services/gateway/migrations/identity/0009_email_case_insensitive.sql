-- identity DB — 이메일 대소문자 무관 강제.
-- 배경: users.email UNIQUE 가 SQLite 기본 대소문자 구분이라 'A@x.com' 과 'a@x.com' 이 공존 가능했다.
--       (l2pamerica 대/소문자 두 계정이 실제로 생겼던 원인. 2026-07-06 정리 완료.)
-- 가입/로그인 코드는 이미 normalizeEmail(소문자)로 저장·조회하지만, DB 차원 보장이 없었다.
-- 본 마이그레이션은 lower(email) 유니크 인덱스로 대소문자만 다른 중복 가입을 DB에서 원천 차단한다.
-- 선행조건: 기존 대소문자 중복 0건(정리 완료), 모든 email 소문자 정규화 완료.

CREATE UNIQUE INDEX IF NOT EXISTS ux_users_email_lower ON users(lower(email));
