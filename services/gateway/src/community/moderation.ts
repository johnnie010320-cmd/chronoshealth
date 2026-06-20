// R7a 키워드 차단 모더레이션.
// R7b (P2) 에서 Workers AI 분류기 추가 예정.
// 2026-06-20 죠니 지시: 사용자 게시물의 의료 표현(진단/처방/치료 등) substring 차단을 제거.
//   - 이유: 헬스 커뮤니티의 정상적인 교육·경험 공유 글("진단은 의료기관에서" 등)이 오탐 차단됨.
//   - 본 필터는 앱 자체 출력이 아니라 사용자 입력에만 적용되므로, 의료 표현 토큰을 걷어냄.
//   - 욕설/의약품 직접판매(약사법 리스크) 토큰은 의료 표현과 무관하여 유지.
const FORBIDDEN_TOKENS = [
  // 욕설 (예시 — 최소 셋, P2에서 확장)
  '시발', 'fuck',
  // 광고성 (의약품 직접 판매 금지 — 약사법)
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
