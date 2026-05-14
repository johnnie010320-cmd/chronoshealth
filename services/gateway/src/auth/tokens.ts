// spec docs/spec/identity.md 4 / ADR 0010: 32바이트 random base64url, 30일 만료.
// 평문 저장 (P0/P1 단순화) — 향후 OTP/OAuth 도입 시 해싱 ADR로 보강.

const TOKEN_BYTES = 32;
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30일

const B64URL_PAD = /=+$/g;
const B64URL_PLUS = /\+/g;
const B64URL_SLASH = /\//g;

function bytesToBase64Url(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(B64URL_PLUS, '-').replace(B64URL_SLASH, '_').replace(B64URL_PAD, '');
}

export function generateSessionToken(): string {
  const buf = new Uint8Array(TOKEN_BYTES);
  crypto.getRandomValues(buf);
  return bytesToBase64Url(buf);
}

export function generatePseudonymId(): string {
  return crypto.randomUUID();
}

export function sessionExpiresAt(nowMs: number = Date.now()): string {
  return new Date(nowMs + SESSION_TTL_MS).toISOString();
}
