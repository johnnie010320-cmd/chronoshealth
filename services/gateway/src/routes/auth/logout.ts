import { Hono } from 'hono';
import { getCookie } from 'hono/cookie';
import { SESSION_COOKIE, clearSessionCookies } from '../../auth/cookies.js';
import type { Bindings } from '../../bindings.js';

// ADR 0014 — 로그아웃. httpOnly 쿠키는 JS로 삭제 불가하므로 서버가 처리.
// 세션 토큰 revoke + 쿠키 2종 삭제. 토큰 출처는 쿠키 우선, Bearer 호환.
export const logoutRoute = new Hono<{ Bindings: Bindings }>();

logoutRoute.post('/', async (c) => {
  const cookieToken = getCookie(c, SESSION_COOKIE);
  const auth = c.req.header('Authorization');
  const bearer =
    auth && auth.startsWith('Bearer ') ? auth.slice('Bearer '.length).trim() : '';
  const token = (cookieToken && cookieToken.length > 0 ? cookieToken : bearer).trim();

  if (token.length > 0) {
    try {
      await c.env.IDENTITY_DB
        .prepare('UPDATE session_tokens SET revoked_at = ? WHERE token = ?')
        .bind(new Date().toISOString(), token)
        .run();
    } catch {
      // 토큰 미존재/이미 만료 — 멱등 처리, 무시.
    }
  }

  clearSessionCookies(c);
  return c.json({ ok: true });
});
