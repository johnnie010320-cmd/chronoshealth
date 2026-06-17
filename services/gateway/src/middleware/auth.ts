import { createMiddleware } from 'hono/factory';
import { getCookie } from 'hono/cookie';
import { SESSION_COOKIE } from '../auth/cookies.js';
import type { Bindings } from '../bindings.js';

export type AuthVariables = {
  userPseudonymId: string;
};

// spec docs/spec/identity.md 4.3 / ADR 0014 정합.
// 세션 토큰 출처: ① httpOnly 쿠키(chronos_session) 우선, ② Authorization: Bearer (과도기 호환).
// IDENTITY_DB.session_tokens 조회 → pseudonym 추출.
// PII는 c 컨텍스트에 절대 넣지 않음 (ADR 0003).
export const authMiddleware = createMiddleware<{
  Bindings: Bindings;
  Variables: AuthVariables;
}>(async (c, next) => {
  const cookieToken = getCookie(c, SESSION_COOKIE);
  const auth = c.req.header('Authorization');
  const bearer =
    auth && auth.startsWith('Bearer ') ? auth.slice('Bearer '.length).trim() : '';
  const token = (cookieToken && cookieToken.length > 0 ? cookieToken : bearer).trim();
  if (token.length === 0) {
    return c.json({ error: { code: 'UNAUTHORIZED' } }, 401);
  }

  const row = await c.env.IDENTITY_DB
    .prepare(
      `SELECT user_pseudonym_id, expires_at, revoked_at
       FROM session_tokens WHERE token = ? LIMIT 1`,
    )
    .bind(token)
    .first<{
      user_pseudonym_id: string;
      expires_at: string;
      revoked_at: string | null;
    }>();

  if (!row) {
    return c.json({ error: { code: 'UNAUTHORIZED' } }, 401);
  }
  if (row.revoked_at) {
    return c.json({ error: { code: 'UNAUTHORIZED' } }, 401);
  }
  if (new Date(row.expires_at).getTime() <= Date.now()) {
    return c.json({ error: { code: 'UNAUTHORIZED' } }, 401);
  }

  c.set('userPseudonymId', row.user_pseudonym_id);
  await next();
  return;
});
