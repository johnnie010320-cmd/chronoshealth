-- 0039 — 기능 요청/버그 리포트 첨부.
-- 본문에 이미지(png/jpg/webp, 인라인 미리보기) + 파일(pdf, 다운로드) + 외부 링크 첨부.
-- 공지(notices)와 동일 모델. 다만 기능요청은 비공개라 스트림에 인증 필요(소유자 또는 관리자).
--
-- R2 키는 응답에 노출하지 않는다(내부 전용). PII 0 유지.

ALTER TABLE feature_requests ADD COLUMN image_key TEXT;
ALTER TABLE feature_requests ADD COLUMN image_type TEXT;
ALTER TABLE feature_requests ADD COLUMN file_key TEXT;
ALTER TABLE feature_requests ADD COLUMN file_name TEXT;
ALTER TABLE feature_requests ADD COLUMN link_url TEXT;
