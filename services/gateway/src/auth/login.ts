import type { LoginRequest, LoginResponse } from '../schemas/signup.js';
import {
  generateSessionToken,
  sessionExpiresAt,
} from './tokens.js';
import { verifyPassword } from './password.js';

export class LoginError extends Error {
  constructor(
    public code:
      | 'INVALID_CREDENTIALS'
      | 'PASSWORD_REQUIRED'
      | 'DB_ERROR',
  ) {
    super(code);
  }
}

type UserRow = {
  user_pseudonym_id: string;
  password_hash: string | null;
  password_salt: string | null;
  password_algo: string | null;
};

export async function loginUser(
  db: D1Database,
  input: LoginRequest,
): Promise<LoginResponse> {
  const row = await db
    .prepare(
      `SELECT user_pseudonym_id, password_hash, password_salt, password_algo
         FROM users WHERE email = ? LIMIT 1`,
    )
    .bind(input.email)
    .first<UserRow>();

  if (!row) {
    // 이메일 존재 여부 누설 차단 — INVALID_CREDENTIALS 단일 코드.
    throw new LoginError('INVALID_CREDENTIALS');
  }

  if (!row.password_hash || !row.password_salt || !row.password_algo) {
    // 기존 가입자 (ADR 0010 시점) — 비밀번호 설정 미완료.
    throw new LoginError('PASSWORD_REQUIRED');
  }

  const ok = await verifyPassword(input.password, {
    hash: row.password_hash,
    salt: row.password_salt,
    algo: row.password_algo,
  });
  if (!ok) throw new LoginError('INVALID_CREDENTIALS');

  const sessionToken = generateSessionToken();
  const expiresAt = sessionExpiresAt();

  try {
    await db
      .prepare(
        `INSERT INTO session_tokens (token, user_pseudonym_id, expires_at)
         VALUES (?, ?, ?)`,
      )
      .bind(sessionToken, row.user_pseudonym_id, expiresAt)
      .run();
  } catch {
    throw new LoginError('DB_ERROR');
  }

  return {
    userPseudonymId: row.user_pseudonym_id,
    sessionToken,
    expiresAt,
  };
}
