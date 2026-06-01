import { createMiddleware } from 'hono/factory';
import type { Bindings } from '../bindings.js';
import type { AuthVariables } from './auth.js';

// 관리자 인증 — authMiddleware 통과 후 적용.
// 환경변수 ADMIN_PSEUDONYM_IDS (콤마 구분) 화이트리스트 검증.
// 본인 인증(ADR 0010) 도입 전 임시 매커니즘.

function parseAdminList(value: string | undefined): Set<string> {
  if (!value) return new Set();
  return new Set(
    value
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0),
  );
}

export const adminMiddleware = createMiddleware<{
  Bindings: Bindings;
  Variables: AuthVariables;
}>(async (c, next) => {
  const pseudonymId = c.get('userPseudonymId');
  const admins = parseAdminList(c.env.ADMIN_PSEUDONYM_IDS);
  if (!admins.has(pseudonymId)) {
    return c.json({ error: { code: 'FORBIDDEN' } }, 403);
  }
  await next();
  return;
});

export function isAdmin(
  env: Bindings,
  pseudonymId: string,
): boolean {
  return parseAdminList(env.ADMIN_PSEUDONYM_IDS).has(pseudonymId);
}
