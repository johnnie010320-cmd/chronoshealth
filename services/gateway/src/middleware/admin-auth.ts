import { createMiddleware } from 'hono/factory';
import type { Bindings } from '../bindings.js';
import type { AuthVariables } from './auth.js';

// 관리자 인증 — authMiddleware 통과 후 적용.
// 두 화이트리스트가 OR 결합:
//   1) ADMIN_EMAILS  : identity DB users.email 조회 후 매칭 (가입 후 자동 admin 부여)
//   2) ADMIN_PSEUDONYM_IDS : pseudonym 직접 매칭 (테스트 / D1 직접 등록 용)
// 본인 인증(ADR 0010) 도입 전 임시 매커니즘.
// PII 조회는 identity DB 내부 (응답에 노출 0).

function parseList(value: string | undefined): Set<string> {
  if (!value) return new Set();
  return new Set(
    value
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter((s) => s.length > 0),
  );
}

async function emailOf(
  identityDb: D1Database,
  pseudonymId: string,
): Promise<string | null> {
  const row = await identityDb
    .prepare('SELECT email FROM users WHERE user_pseudonym_id = ? LIMIT 1')
    .bind(pseudonymId)
    .first<{ email: string }>();
  return row?.email?.toLowerCase() ?? null;
}

export async function isAdmin(
  env: Bindings,
  pseudonymId: string,
): Promise<boolean> {
  const pseudonyms = parseList(env.ADMIN_PSEUDONYM_IDS);
  if (pseudonyms.has(pseudonymId.toLowerCase())) return true;

  const emails = parseList(env.ADMIN_EMAILS);
  if (emails.size === 0) return false;

  const email = await emailOf(env.IDENTITY_DB, pseudonymId);
  if (!email) return false;
  return emails.has(email);
}

export const adminMiddleware = createMiddleware<{
  Bindings: Bindings;
  Variables: AuthVariables;
}>(async (c, next) => {
  const pseudonymId = c.get('userPseudonymId');
  const allowed = await isAdmin(c.env, pseudonymId);
  if (!allowed) {
    return c.json({ error: { code: 'FORBIDDEN' } }, 403);
  }
  await next();
  return;
});
