// 메인 배너 미디어 — 이미지(png/jpg/webp) 또는 동영상(mp4/webm/mov). 최대 50MB.
// 공개 노출이므로 인증 없이 스트림. R2 키 = banners/<id>.<ext>.

export const MAX_BANNER_BYTES = 50 * 1024 * 1024; // 50MB

export type BannerKind = 'image' | 'video';

const IMAGE_EXT_TO_MIME: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
};
const VIDEO_EXT_TO_MIME: Record<string, string> = {
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
};

function ext(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot >= 0 ? name.slice(dot + 1).toLowerCase() : '';
}

// 허용 시 { kind, contentType }, 아니면 null. 확장자 우선, MIME 보조.
export function resolveBannerType(
  name: string,
  mime: string,
): { kind: BannerKind; contentType: string } | null {
  const e = ext(name);
  if (IMAGE_EXT_TO_MIME[e]) return { kind: 'image', contentType: IMAGE_EXT_TO_MIME[e] };
  if (VIDEO_EXT_TO_MIME[e]) return { kind: 'video', contentType: VIDEO_EXT_TO_MIME[e] };
  if (mime.startsWith('image/')) return { kind: 'image', contentType: mime };
  if (mime.startsWith('video/')) return { kind: 'video', contentType: mime };
  return null;
}

function extFromContentType(contentType: string): string {
  switch (contentType) {
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'image/jpeg':
      return 'jpg';
    case 'video/mp4':
      return 'mp4';
    case 'video/webm':
      return 'webm';
    case 'video/quicktime':
      return 'mov';
    default:
      return 'bin';
  }
}

export function bannerKey(id: string, contentType: string): string {
  return `banners/${id}.${extFromContentType(contentType)}`;
}
