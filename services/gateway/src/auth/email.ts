// 이메일 정규화 — 인증 경로(가입·로그인·비밀번호설정·중복확인) 전체에서
// 대소문자/공백 차이로 인한 로그인 실패를 방지한다.
//
// 배경: 모바일 키보드(예: Android Chrome)는 이메일 입력 첫 글자를 자동 대문자화하는
// 경우가 있어 PC(소문자)와 다른 케이스가 들어온다. 저장은 소문자로 정규화하고,
// 조회는 lower(email) = ? 로 대소문자 무관 매칭하여 어떤 기기에서도 동일하게 로그인된다.
export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}
