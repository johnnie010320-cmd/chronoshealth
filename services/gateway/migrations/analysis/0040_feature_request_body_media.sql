-- 0040 — 기능 요청/버그 리포트: 본문 자체를 파일로 채우기.
-- 본문(body)은 직접 작성(텍스트) 또는 이미지(png/jpg/webp)·PDF로 대체할 수 있다.
-- 0039의 image_*/file_*/link_url 은 "추가 첨부"로 유지하고, 여기서는 "본문 미디어"를 별도 슬롯으로 추가한다.
-- 본문 모드는 별도 컬럼 없이 미디어 존재 여부로 파생한다:
--   body_image_key 있으면 이미지 본문, 없고 body_file_key 있으면 PDF 본문, 둘 다 없으면 텍스트 본문(body).
-- 한 글의 본문 미디어는 상호 배타(이미지 XOR PDF) — 코드에서 보장.
--
-- R2 키는 응답에 노출하지 않는다(내부 전용). PII 0 유지.

ALTER TABLE feature_requests ADD COLUMN body_image_key TEXT;
ALTER TABLE feature_requests ADD COLUMN body_image_type TEXT;
ALTER TABLE feature_requests ADD COLUMN body_file_key TEXT;
ALTER TABLE feature_requests ADD COLUMN body_file_name TEXT;
