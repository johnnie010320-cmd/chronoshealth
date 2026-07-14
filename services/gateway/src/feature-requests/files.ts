// 기능 요청/버그 리포트 첨부 — 이미지(png/jpg/webp, 인라인) + 파일(pdf, 다운로드). 최대 10MB.
// 검증 로직은 공지(notices)와 동일하므로 재사용한다. R2 키만 feature-requests/<id>/... 로 분리.

export {
  MAX_NOTICE_BYTES as MAX_FEATURE_BYTES,
  resolveNoticeImageType as resolveFeatureImageType,
  isPdf,
} from '../notices/files.js';

export function featureImageKey(id: string, type: string): string {
  const e = type === 'image/png' ? 'png' : type === 'image/webp' ? 'webp' : 'jpg';
  return `feature-requests/${id}/image.${e}`;
}

export function featureFileKey(id: string): string {
  return `feature-requests/${id}/file.pdf`;
}
