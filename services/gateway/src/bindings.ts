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
  // 폼코치 SSO 핸드오프 서명 시크릿 — 폼코치 워커와 동일 값. wrangler secret 으로 주입.
  FORMCOACH_SSO_SECRET?: string;
  // 메일 발송(Resend) — 비밀번호 재설정 링크 등. 둘 다 없으면 발송 생략 + logger 기록.
  //   $ wrangler secret put RESEND_API_KEY
  //   $ wrangler secret put MAIL_FROM   # 예: VITAcode <no-reply@vitacodeapp.com> (Resend 검증 도메인)
  RESEND_API_KEY?: string;
  MAIL_FROM?: string;
  // 스토어 심사용 데모 계정 비밀번호 — cron 이 계정·비밀번호를 이 값으로 지킨다(review-account/ensure.ts).
  //   $ wrangler secret put REVIEW_ACCOUNT_PASSWORD
  REVIEW_ACCOUNT_PASSWORD?: string;

  // ── SNS 로그인(OAuth) ─────────────────────────────────────────────
  // 브라우저 실제 접속 오리진. 정상 경로는 프록시가 X-Forwarded-Host 로 넘기므로 선택.
  // 미전달 시 fallback(예: 'https://vitacodeapp.com').
  APP_PUBLIC_ORIGIN?: string;
  // OAuth state/PKCE 서명 HMAC 키. wrangler secret put OAUTH_STATE_SECRET.
  OAUTH_STATE_SECRET?: string;
  // 카카오 — REST API 키(=client_id) + (선택)Client Secret.
  KAKAO_REST_API_KEY?: string;
  KAKAO_CLIENT_SECRET?: string;
  // 구글 — OAuth 2.0 Client ID / Secret.
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  // 네이버 — 애플리케이션 Client ID / Secret.
  NAVER_CLIENT_ID?: string;
  NAVER_CLIENT_SECRET?: string;
  // 애플 — Sign in with Apple(web). client_secret은 아래 값들로 ES256 JWT를 코드가 생성.
  APPLE_TEAM_ID?: string;
  APPLE_SERVICE_ID?: string; // Services ID = client_id
  APPLE_KEY_ID?: string;
  APPLE_PRIVATE_KEY?: string; // .p8 PEM 전체(멀티라인)

  // ── 국민건강보험공단 검진 연동(간편인증 중개: Tilko) ─────────────────────
  // NHIS_PROVIDER: 'mock'(기본·표본) | 'tilko'(실연동). tilko 선택 시 아래 키 필요.
  //   $ wrangler secret put TILKO_API_KEY     # 틸코 발급 API 키
  //   TILKO_API_HOST 는 [vars] 또는 secret (기본 https://api.tilko.net)
  // 실연동 크립토는 키 확보 후 실서버 대조 검증하여 활성화(project 메모 참조).
  NHIS_PROVIDER?: 'mock' | 'tilko';
  TILKO_API_KEY?: string;
  TILKO_API_HOST?: string;
};
