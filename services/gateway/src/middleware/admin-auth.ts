import { createMiddleware } from 'hono/factory';
import type { Bindings } from '../bindings.js';
import type { AuthVariables } from './auth.js';

// 관리자 인증 — authMiddleware 통과 후 적용.
// 권한 판정(OR 결합):
//   1) users.role = 'admin'  (UI 에서 superadmin 이 임명/해제)  ← 단일 진실원천
//   2) is_super_admin = 1     (창업자 — 절대 권한)
//   3) ADMIN_EMAILS / ADMIN_PSEUDONYM_IDS env  (부트스트랩 폴백)
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

type RoleRow = { email: string; role: string; is_super_admin: number };

async function roleRowOf(
  identityDb: D1Database,
  pseudonymId: string,
): Promise<RoleRow | null> {
  return identityDb
    .prepare(
      'SELECT email, role, is_super_admin FROM users WHERE user_pseudonym_id = ? LIMIT 1',
    )
    .bind(pseudonymId)
    .first<RoleRow>();
}

export async function isAdmin(
  env: Bindings,
  pseudonymId: string,
): Promise<boolean> {
  // env 폴백 (pseudonym 직접 매칭)
  if (parseList(env.ADMIN_PSEUDONYM_IDS).has(pseudonymId.toLowerCase())) return true;

  const row = await roleRowOf(env.IDENTITY_DB, pseudonymId);
  if (!row) return false;
  if (row.role === 'admin' || row.is_super_admin === 1) return true;

  const emails = parseList(env.ADMIN_EMAILS);
  if (emails.size > 0 && row.email && emails.has(row.email.toLowerCase())) return true;
  return false;
}

export async function isSuperAdmin(
  env: Bindings,
  pseudonymId: string,
): Promise<boolean> {
  if (parseList(env.SUPERADMIN_PSEUDONYM_IDS).has(pseudonymId.toLowerCase())) return true;
  const row = await roleRowOf(env.IDENTITY_DB, pseudonymId);
  if (!row) return false;
  if (row.is_super_admin === 1) return true;
  const emails = parseList(env.SUPERADMIN_EMAILS);
  if (emails.size > 0 && row.email && emails.has(row.email.toLowerCase())) return true;
  return false;
}

export const adminMiddleware = createMiddleware<{
  Bindings: Bindings;
  Variables: AuthVariables;
}>(async (c, next) => {
  const pseudonymId = c.get('userPseudonymId');
  if (!(await isAdmin(c.env, pseudonymId))) {
    return c.json({ error: { code: 'FORBIDDEN' } }, 403);
  }
  await next();
  return;
});

export const superAdminMiddleware = createMiddleware<{
  Bindings: Bindings;
  Variables: AuthVariables;
}>(async (c, next) => {
  const pseudonymId = c.get('userPseudonymId');
  if (!(await isSuperAdmin(c.env, pseudonymId))) {
    return c.json({ error: { code: 'FORBIDDEN' } }, 403);
  }
  await next();
  return;
});
