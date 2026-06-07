-- 프로필 사진 — identity-vault 내부 (ADR 0003 PII 격리).
-- 별도 테이블 분리 이유:
--   1) users 행 SELECT 시 매번 수십~수백 KB BLOB 끌어오지 않도록.
--   2) 사진 삭제/교체 시 users 행 영향 없도록.
-- 저장 방식: base64 TEXT (D1 BLOB 미지원 회피). 한도 256KB base64 = ~190KB 원본.
-- 클라이언트가 업로드 전 256x256 JPEG 로 리사이즈하므로 일반적으로 30~80KB.

CREATE TABLE user_avatars (
  user_pseudonym_id TEXT PRIMARY KEY NOT NULL
    REFERENCES users(user_pseudonym_id) ON DELETE CASCADE,
  mime_type TEXT NOT NULL CHECK (mime_type IN ('image/jpeg', 'image/png', 'image/webp')),
  data_b64 TEXT NOT NULL,
  byte_size INTEGER NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
