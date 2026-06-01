// CF Workers 바인딩 + 환경 변수 타입 (wrangler.toml과 동기화).
// ADR 0003 / 0010 / spec docs/spec/identity.md 5.1 정합.

export type Bindings = {
  ENVIRONMENT: 'dev' | 'staging' | 'prod';
  IDENTITY_DB: D1Database;
  DB: D1Database;
  // ADR 0011 — HMAC-SHA256 키 (베타 등록 이메일 가명화). wrangler secret 으로 주입.
  BETA_SIGNUP_HMAC_SALT: string;
  // R-Admin-1 — 관리자 화이트리스트.
  // 본인 인증(ADR 0010) 도입 전 임시 매커니즘. wrangler secret 으로 주입.
  //   ADMIN_EMAILS: 콤마 구분 이메일 목록 (대소문자 무시). identity DB users.email 조회로 검증.
  //   ADMIN_PSEUDONYM_IDS: 콤마 구분 pseudonym 목록 (이메일 기반과 OR 결합, 테스트/직접 지정용).
  ADMIN_EMAILS?: string;
  ADMIN_PSEUDONYM_IDS?: string;
};
