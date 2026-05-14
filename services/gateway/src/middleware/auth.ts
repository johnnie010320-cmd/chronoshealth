import { createMiddleware } from 'hono/factory';
import type { Bindings } from '../bindings.js';

export type AuthVariables = {
  userPseudonymId: string;
};

// spec docs/spec/identity.md 4.3 정합.
// IDENTITY_DB.session_tokens 조회 → pseudonym 추출.
// PII는 c 컨텍스트에 절대 넣지 않음 (ADR 0003).
export const authMiddleware = createMiddleware<{
  Bindings: Bindings;
  Variables: AuthVariables;
}>(async (c, next) => {
  const auth = c.req.header('Authorization');
  if (!auth || !auth.startsWith('Bearer ')) {
    return c.json({ error: { code: 'UNAUTHORIZED' } }, 401);
  }
  const token = auth.slice('Bearer '.length).trim();
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
