import type { SignupRequest, SignupResponse } from '../schemas/signup.js';
import {
  generatePseudonymId,
  generateSessionToken,
  sessionExpiresAt,
} from './tokens.js';

export class SignupError extends Error {
  constructor(public code: 'IDENTITY_EXISTS' | 'CONSENT_REQUIRED' | 'DB_ERROR') {
    super(code);
  }
}

// spec docs/spec/identity.md 4 / ADR 0010 정합.
// 회원가입 1회 = users 1 row + session_tokens 1 row + consent_log 2~3 row.
// D1은 단일 batch로 원자성 보장 (모두 성공하거나 모두 실패).
export async function signupUser(
  db: D1Database,
  input: SignupRequest,
): Promise<SignupResponse> {
  if (!input.consentMedical || !input.consentTerms) {
    throw new SignupError('CONSENT_REQUIRED');
  }

  // 중복 확인 — email OR phone 일치 시 IDENTITY_EXISTS.
  const existing = await db
    .prepare('SELECT 1 FROM users WHERE email = ? OR phone = ? LIMIT 1')
    .bind(input.email, input.phone)
    .first<{ '1': number } | null>();

  if (existing) {
    throw new SignupError('IDENTITY_EXISTS');
  }

  const userPseudonymId = generatePseudonymId();
  const sessionToken = generateSessionToken();
  const expiresAt = sessionExpiresAt();

  const stmts = [
    db
      .prepare(
        `INSERT INTO users (user_pseudonym_id, name, email, phone, birth_year, sex)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        userPseudonymId,
        input.name,
        input.email,
        input.phone,
        input.birthYear,
        input.sex,
      ),
    db
      .prepare(
        `INSERT INTO session_tokens (token, user_pseudonym_id, expires_at)
         VALUES (?, ?, ?)`,
      )
      .bind(sessionToken, userPseudonymId, expiresAt),
    db
      .prepare(
        `INSERT INTO consent_log (user_pseudonym_id, consent_kind, granted, source)
         VALUES (?, 'medical', 1, 'signup')`,
      )
      .bind(userPseudonymId),
    db
      .prepare(
        `INSERT INTO consent_log (user_pseudonym_id, consent_kind, granted, source)
         VALUES (?, 'terms', 1, 'signup')`,
      )
      .bind(userPseudonymId),
  ];

  try {
    await db.batch(stmts);
  } catch (err) {
    // D1 UNIQUE 위반은 batch 단계 에러로 표면화. race 조건에서만 발생.
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('UNIQUE') || msg.includes('constraint')) {
      throw new SignupError('IDENTITY_EXISTS');
    }
    throw new SignupError('DB_ERROR');
  }

  return { userPseudonymId, sessionToken, expiresAt };
}
