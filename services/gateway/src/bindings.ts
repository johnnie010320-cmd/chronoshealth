// CF Workers 바인딩 + 환경 변수 타입 (wrangler.toml과 동기화).
// ADR 0003 / 0010 / spec docs/spec/identity.md 5.1 정합.

export type Bindings = {
  ENVIRONMENT: 'dev' | 'staging' | 'prod';
  IDENTITY_DB: D1Database;
  // DB: D1Database;  // 향후 analysis DB 추가 시 활성화 (ADR 0008)
};
