-- 공지사항 첨부: 이미지(PNG/JPG/WEBP, 인라인), 파일(PDF, 다운로드), 외부 링크.
-- 이미지/파일 본체는 R2(ATTACHMENTS)에 저장하고 키만 보관. 공지는 공개라 인증 없이 스트림.
ALTER TABLE notices ADD COLUMN image_key TEXT;
ALTER TABLE notices ADD COLUMN image_type TEXT;
ALTER TABLE notices ADD COLUMN file_key TEXT;
ALTER TABLE notices ADD COLUMN file_name TEXT;
ALTER TABLE notices ADD COLUMN link_url TEXT;
