-- analysis DB R9 — 대화 파일 첨부(jpg/pdf/ppt). 본문은 R2 에 저장, D1 에는 메타데이터만.
-- spec: 2026-06-21 죠니 요청 (1:1·대화방 파일 공유 + 다운로드 + 7일 후 자동 삭제).
-- attachment_key: R2 오브젝트 키(비공개, 게이트웨이 인증 후 스트림).
-- attachment_expires_at: 업로드 +7일. cron 이 경과분의 R2 객체 삭제 + 메시지 soft delete.

ALTER TABLE messages ADD COLUMN attachment_key TEXT;
ALTER TABLE messages ADD COLUMN attachment_name TEXT;
ALTER TABLE messages ADD COLUMN attachment_type TEXT;
ALTER TABLE messages ADD COLUMN attachment_size INTEGER;
ALTER TABLE messages ADD COLUMN attachment_expires_at TEXT;

CREATE INDEX idx_msg_attach_expires ON messages(attachment_expires_at);
