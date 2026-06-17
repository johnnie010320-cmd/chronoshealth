// ADR 0014 — 세션을 httpOnly 쿠키로. same-origin Pages Function 프록시 경유라
// Domain 미지정(host-only) → chronoshealth.ever-day.com first-party 쿠키가 됨.

import { setCookie, deleteCookie } from 'hono/cookie';
import type { Context } from 'hono';
import { SESSION_TTL_MS } from './tokens.js';

// 실제 인증 토큰 — 스크립트 접근 불가(httpOnly).
export const SESSION_COOKIE = 'chronos_session';
// 비-httpOnly 마커 — 클라이언트가 로그인 상태 판별. 토큰 아님, pseudonym은 비-PII(ADR 0003).
export const UID_COOKIE = 'chronos_uid';

const MAX_AGE_S = Math.floor(SESSION_TTL_MS / 1000);

export function setSessionCookies(
  c: Context,
  token: string,
  pseudonymId: string,
): void {
  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    path: '/',
    maxAge: MAX_AGE_S,
  });
  setCookie(c, UID_COOKIE, pseudonymId, {
    httpOnly: false,
    secure: true,
    sameSite: 'Lax',
    path: '/',
    maxAge: MAX_AGE_S,
  });
}

export function clearSessionCookies(c: Context): void {
  deleteCookie(c, SESSION_COOKIE, { path: '/' });
  deleteCookie(c, UID_COOKIE, { path: '/' });
}
