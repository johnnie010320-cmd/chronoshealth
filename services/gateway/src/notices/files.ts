// 공지 첨부 — 이미지(png/jpg/webp, 인라인), 파일(pdf, 다운로드). 최대 10MB.
// 공지는 공개라 인증 없이 스트림. R2 키는 notices/<id>/... 로 고정(공지당 1개씩 덮어쓰기).

export const MAX_NOTICE_BYTES = 10 * 1024 * 1024; // 10MB

const IMAGE_EXT_TO_MIME: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
};
const IMAGE_MIMES = new Set(Object.values(IMAGE_EXT_TO_MIME));

function ext(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot >= 0 ? name.slice(dot + 1).toLowerCase() : '';
}

// 이미지 허용 시 정규 MIME, 아니면 null.
export function resolveNoticeImageType(name: string, mime: string): string | null {
  const e = ext(name);
  if (IMAGE_EXT_TO_MIME[e]) return IMAGE_EXT_TO_MIME[e];
  if (mime && IMAGE_MIMES.has(mime)) return mime;
  return null;
}

export function isPdf(name: string, mime: string): boolean {
  return ext(name) === 'pdf' || mime === 'application/pdf';
}

export function noticeImageKey(id: string, type: string): string {
  const e = type === 'image/png' ? 'png' : type === 'image/webp' ? 'webp' : 'jpg';
  return `notices/${id}/image.${e}`;
}

export function noticeFileKey(id: string): string {
  return `notices/${id}/file.pdf`;
}
