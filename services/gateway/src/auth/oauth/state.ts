// OAuth CSRF state + PKCE — 무상태(서명 쿠키) 방식.
// /start 에서 서명한 state 를 httpOnly 쿠키(oauth_state)로 저장하고,
// 동일 nonce 를 provider 로 보낸 뒤 /callback 에서 대조·검증한다. DB 불필요.
//
// PKCE(code_verifier)도 이 서명 쿠키 안에 넣어 왕복시킨다(구글·애플 S256).
// 서명 키 = OAUTH_STATE_SECRET(wrangler secret). SSO 토큰(sso/token.ts)과 동일한 HMAC 패턴.

import type { OAuthProvider } from './providers.js';

export type OAuthState = {
  p: OAuthProvider; // provider
  n: string; // nonce (= provider 로 보내는 state 파라미터)
  r: string; // return path (로그인 성공 후 이동, 앱 내부 경로만)
  v: string; // PKCE code_verifier
  exp: number; // epoch ms 만료
  i?: 's'; // intent — 's'=회원가입 플로우(이미 가입된 계정이면 선택 화면). 없으면 로그인.
};

// 서명 쿠키 유효기간 — 사용자가 provider 로그인 화면에 머무는 시간 여유.
export const OAUTH_STATE_TTL_MS = 10 * 60 * 1000; // 10분
export const OAUTH_STATE_COOKIE = 'oauth_state';

function b64urlFromBytes(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlFromString(s: string): string {
  return b64urlFromBytes(new TextEncoder().encode(s));
}

function stringFromB64url(s: string): string {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + pad;
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

function randomBytes(n: number): Uint8Array {
  const buf = new Uint8Array(n);
  crypto.getRandomValues(buf);
  return buf;
}

export function randomToken(bytes = 32): string {
  return b64urlFromBytes(randomBytes(bytes));
}

// PKCE code_verifier: 43~128자 unreserved. 32바이트 base64url = 43자.
export function generateCodeVerifier(): string {
  return b64urlFromBytes(randomBytes(32));
}

export async function codeChallengeS256(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return b64urlFromBytes(new Uint8Array(digest));
}

async function hmacSign(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  return b64urlFromBytes(new Uint8Array(sig));
}

// 상수시간 비교 — 서명 검증 타이밍 누설 방지.
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// `<b64url(json)>.<b64url(hmac)>`
export async function signState(secret: string, state: OAuthState): Promise<string> {
  const body = b64urlFromString(JSON.stringify(state));
  const sig = await hmacSign(secret, body);
  return `${body}.${sig}`;
}

export async function verifyState(secret: string, token: string): Promise<OAuthState | null> {
  const dot = token.indexOf('.');
  if (dot <= 0) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = await hmacSign(secret, body);
  if (!timingSafeEqual(sig, expected)) return null;
  let parsed: OAuthState;
  try {
    parsed = JSON.parse(stringFromB64url(body)) as OAuthState;
  } catch {
    return null;
  }
  if (typeof parsed.exp !== 'number' || parsed.exp < Date.now()) return null;
  return parsed;
}

// 로그인 후 이동 경로 정규화 — 오픈 리다이렉트 차단(앱 내부 상대경로만 허용).
export function sanitizeReturnPath(raw: string | undefined | null): string {
  if (!raw) return '/';
  // 반드시 '/'로 시작하고 '//'(프로토콜 상대 URL)·'/\\' 은 거부.
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) return '/';
  return raw;
}
