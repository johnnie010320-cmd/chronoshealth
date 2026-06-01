import type { SetPasswordRequest } from '../schemas/signup.js';
import { hashPassword, validatePasswordPolicy } from './password.js';
import {
  generateSessionToken,
  sessionExpiresAt,
} from './tokens.js';

export class SetPasswordError extends Error {
  constructor(
    public code:
      | 'NOT_FOUND'
      | 'ALREADY_SET'
      | 'PASSWORD_TOO_SHORT'
      | 'PASSWORD_TOO_LONG'
      | 'PASSWORD_KOREAN_NOT_ALLOWED'
      | 'PASSWORD_NOT_COMPLEX'
      | 'DB_ERROR',
  ) {
    super(code);
  }
}

type Row = {
  user_pseudonym_id: string;
  phone: string;
  password_hash: string | null;
};

// ADR 0012 마이그레이션 — 기존 가입자 (password_hash IS NULL) 만 비밀번호 설정.
// 신원 재확인: email + phone 일치 강제 (P1 한정 — P2 본인 인증 강화).
export async function setPasswordForLegacy(
  db: D1Database,
  input: SetPasswordRequest,
): Promise<{ userPseudonymId: string; sessionToken: string; expiresAt: string }> {
  const policy = validatePasswordPolicy(input.password);
  if (!policy.ok) {
    throw new SetPasswordError(policy.reason ?? 'PASSWORD_NOT_COMPLEX');
  }

  const row = await db
    .prepare('SELECT user_pseudonym_id, phone, password_hash FROM users WHERE email = ? LIMIT 1')
    .bind(input.email)
    .first<Row>();

  if (!row || row.phone !== input.phone) {
    throw new SetPasswordError('NOT_FOUND');
  }
  if (row.password_hash) {
    // 이미 설정 완료 — 일반 로그인 흐름으로.
    throw new SetPasswordError('ALREADY_SET');
  }

  const hashed = await hashPassword(input.password);
  const sessionToken = generateSessionToken();
  const expiresAt = sessionExpiresAt();

  try {
    await db.batch([
      db
        .prepare(
          `UPDATE users SET password_hash = ?, password_salt = ?, password_algo = ?
            WHERE user_pseudonym_id = ?`,
        )
        .bind(hashed.hash, hashed.salt, hashed.algo, row.user_pseudonym_id),
      db
        .prepare(
          `INSERT INTO session_tokens (token, user_pseudonym_id, expires_at)
           VALUES (?, ?, ?)`,
        )
        .bind(sessionToken, row.user_pseudonym_id, expiresAt),
    ]);
  } catch {
    throw new SetPasswordError('DB_ERROR');
  }

  return {
    userPseudonymId: row.user_pseudonym_id,
    sessionToken,
    expiresAt,
  };
}
