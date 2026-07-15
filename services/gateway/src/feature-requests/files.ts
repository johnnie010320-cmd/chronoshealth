// 기능 요청/버그 리포트 첨부 — 이미지(png/jpg/webp, 인라인) + 파일(pdf, 다운로드). 최대 10MB.
// 검증 로직은 공지(notices)와 동일하므로 재사용한다. R2 키만 feature-requests/<id>/... 로 분리.

export {
  MAX_NOTICE_BYTES as MAX_FEATURE_BYTES,
  resolveNoticeImageType as resolveFeatureImageType,
  isPdf,
} from '../notices/files.js';

function imageExt(type: string): string {
  return type === 'image/png' ? 'png' : type === 'image/webp' ? 'webp' : 'jpg';
}

// 추가 첨부(0039).
export function featureImageKey(id: string, type: string): string {
  return `feature-requests/${id}/image.${imageExt(type)}`;
}

export function featureFileKey(id: string): string {
  return `feature-requests/${id}/file.pdf`;
}

// 본문 미디어(0040) — 본문 자체를 이미지/PDF로 채울 때.
export function featureBodyImageKey(id: string, type: string): string {
  return `feature-requests/${id}/body-image.${imageExt(type)}`;
}

export function featureBodyFileKey(id: string): string {
  return `feature-requests/${id}/body-file.pdf`;
}
