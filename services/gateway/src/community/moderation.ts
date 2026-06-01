// R7a 키워드 차단 모더레이션.
// R7b (P2) 에서 Workers AI 분류기 추가 예정.
// 본 차단 리스트는 의료 금지 표현 + 노골 욕설 위주.

const FORBIDDEN_TOKENS = [
  // 의료 금지 (한국어)
  '진단', '처방', '치료', '여명', '사망일', '죽음',
  // 의료 금지 (영문)
  'diagnose', 'diagnosis', 'prescribe', 'prescription',
  'treatment', 'treat ', // word boundary handled in caller
  'death', 'mortality',
  // 카운트다운 단정 표현
  'D-day', 'D-DAY',
  // 욕설 (예시 — 최소 셋, P2에서 확장)
  '시발', 'fuck',
  // 광고성 (의약품 직접 판매 금지)
  '복제약', '제네릭 판매',
];

const ALLOWED_VIDEO_HOSTS = [
  'youtube.com',
  'www.youtube.com',
  'youtu.be',
  'vimeo.com',
  'www.vimeo.com',
  'player.vimeo.com',
];

export type ModerationResult =
  | { allowed: true }
  | { allowed: false; reason: 'FORBIDDEN_KEYWORD' | 'INVALID_VIDEO_URL' };

export function moderateText(value: string): ModerationResult {
  const lower = value.toLowerCase();
  for (const token of FORBIDDEN_TOKENS) {
    const needle = token.toLowerCase().trim();
    if (lower.includes(needle)) {
      return { allowed: false, reason: 'FORBIDDEN_KEYWORD' };
    }
  }
  return { allowed: true };
}

export function moderateVideoUrl(url: string | null): ModerationResult {
  if (url === null || url === '') return { allowed: true };
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { allowed: false, reason: 'INVALID_VIDEO_URL' };
  }
  if (parsed.protocol !== 'https:') {
    return { allowed: false, reason: 'INVALID_VIDEO_URL' };
  }
  if (!ALLOWED_VIDEO_HOSTS.includes(parsed.hostname.toLowerCase())) {
    return { allowed: false, reason: 'INVALID_VIDEO_URL' };
  }
  return { allowed: true };
}
