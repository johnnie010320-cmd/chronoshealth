// R9 대화 파일 첨부 — 허용 유형/용량 검증 + R2 키 생성.
// 허용: jpg/jpeg, pdf, ppt, pptx. 최대 20MB. 비공개(게이트웨이 인증 후 스트림).

export const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024; // 20MB
// 첨부(R2 실물) 보관 기간 90일. 만료 시 파일 바이트만 삭제하고 메시지 기록은 보존.
// 대화 기록(텍스트·첨부 기록)은 채팅방 삭제 전까지 영구 보관.
export const ATTACHMENT_TTL_DAYS = 90;

const EXT_TO_MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  pdf: 'application/pdf',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
};
const ALLOWED_MIMES = new Set(Object.values(EXT_TO_MIME));

export function attachmentExt(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot >= 0 ? name.slice(dot + 1).toLowerCase() : '';
}

// 확장자 우선, MIME 보조. 허용되면 정규 MIME 반환, 아니면 null.
export function resolveAttachmentType(name: string, mime: string): string | null {
  const ext = attachmentExt(name);
  if (EXT_TO_MIME[ext]) return EXT_TO_MIME[ext];
  if (mime && ALLOWED_MIMES.has(mime)) return mime;
  return null;
}

export function attachmentKey(conversationId: string, id: string, name: string): string {
  const ext = attachmentExt(name);
  const safeExt = EXT_TO_MIME[ext] ? ext : 'bin';
  return `att/${conversationId}/${id}.${safeExt}`;
}

// 다운로드 헤더용 — 파일명 sanitize(경로/따옴표/제어문자 제거, 길이 제한).
export function safeFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? 'file';
  const noQuotes = base.replace(/["\r\n\\]/g, '');
  // 제어문자(0x00-0x1F) 제거.
  let out = '';
  for (const ch of noQuotes) {
    if (ch.charCodeAt(0) >= 0x20) out += ch;
  }
  out = out.trim().slice(0, 120);
  return out || 'file';
}
