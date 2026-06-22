// CF Workers 바인딩 + 환경 변수 타입 (wrangler.toml과 동기화).
// ADR 0003 / 0010 / spec docs/spec/identity.md 5.1 정합.

// Workers AI 응답 형태 (필요 최소 필드만). model 별로 response 형태가 달라
// 본 타입은 chat-style llama 계열 (response: string) 기준.
type WorkersAiRunResult = { response?: string } & Record<string, unknown>;
type WorkersAiBinding = {
  run: (model: string, input: Record<string, unknown>) => Promise<WorkersAiRunResult>;
};

export type Bindings = {
  ENVIRONMENT: 'dev' | 'staging' | 'prod';
  IDENTITY_DB: D1Database;
  DB: D1Database;
  // Cloudflare Workers AI — wrangler.toml `[ai]` 바인딩.
  AI: WorkersAiBinding;
  // R2 — 대화 파일 첨부(jpg/pdf/ppt) 저장. wrangler.toml `[[r2_buckets]]` 바인딩.
  ATTACHMENTS: R2Bucket;
  // ADR 0011 — HMAC-SHA256 키 (베타 등록 이메일 가명화). wrangler secret 으로 주입.
  BETA_SIGNUP_HMAC_SALT: string;
  // R-Admin-1 — 관리자 화이트리스트.
  // 본인 인증(ADR 0010) 도입 전 임시 매커니즘. wrangler secret 으로 주입.
  //   ADMIN_EMAILS: 콤마 구분 이메일 목록 (대소문자 무시). identity DB users.email 조회로 검증.
  //   ADMIN_PSEUDONYM_IDS: 콤마 구분 pseudonym 목록 (이메일 기반과 OR 결합, 테스트/직접 지정용).
  ADMIN_EMAILS?: string;
  ADMIN_PSEUDONYM_IDS?: string;
  // 슈퍼관리자(창업자) 부트스트랩 폴백 — 평소엔 is_super_admin 컬럼이 진실원천.
  SUPERADMIN_EMAILS?: string;
  SUPERADMIN_PSEUDONYM_IDS?: string;
};
