-- identity DB — 슈퍼관리자 계층 + 창업자 2인 지정.
-- spec: 2026-06-18 죠니 지시. 창업자(강은정·박재하) = 크로노스헬스 절대 권한.
-- role CHECK(user/partner/admin)는 유지하고 is_super_admin 플래그를 가산.
--   admin = 관리자 권한(대시보드/사용자/공지/커뮤니티 모더레이션)
--   superadmin = admin + is_super_admin=1 (관리자 임명/해제 등 절대 권한)

ALTER TABLE users ADD COLUMN is_super_admin INTEGER NOT NULL DEFAULT 0
  CHECK (is_super_admin IN (0,1));

-- 창업자 2인을 superadmin 으로 지정 (이메일 대소문자 무시).
UPDATE users
   SET role = 'admin', is_super_admin = 1
 WHERE lower(email) IN ('l2pamerica@gmail.com', 'tiffany3ct@gmail.com');
