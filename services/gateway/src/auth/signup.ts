import type { SignupRequest, SignupResponse } from '../schemas/signup.js';
import {
  generatePseudonymId,
  generateSessionToken,
  sessionExpiresAt,
} from './tokens.js';
import { hashPassword, validatePasswordPolicy } from './password.js';

export class SignupError extends Error {
  constructor(
    public code:
      | 'IDENTITY_EXISTS'
      | 'CONSENT_REQUIRED'
      | 'DB_ERROR'
      | 'PASSWORD_TOO_SHORT'
      | 'PASSWORD_TOO_LONG'
      | 'PASSWORD_KOREAN_NOT_ALLOWED'
      | 'PASSWORD_NOT_COMPLEX',
  ) {
    super(code);
  }
}

// ADR 0013 — Step 1 회원가입.
// 입력: email + password + 약관 3종 동의. 본인정보 (이름·전화·생년·성별·국적)는 Step 2.
// users row 생성 시 본인정보 필드 NULL.
export async function signupUser(
  db: D1Database,
  input: SignupRequest,
): Promise<SignupResponse> {
  if (!input.consentMedical || !input.consentTerms || !input.consentPrivacy) {
    throw new SignupError('CONSENT_REQUIRED');
  }

  const policy = validatePasswordPolicy(input.password);
  if (!policy.ok) {
    throw new SignupError(policy.reason ?? 'PASSWORD_NOT_COMPLEX');
  }

  // 중복 확인 — email 일치 시 IDENTITY_EXISTS.
  const existing = await db
    .prepare('SELECT 1 FROM users WHERE email = ? LIMIT 1')
    .bind(input.email)
    .first<{ '1': number } | null>();

  if (existing) {
    throw new SignupError('IDENTITY_EXISTS');
  }

  const userPseudonymId = generatePseudonymId();
  const sessionToken = generateSessionToken();
  const expiresAt = sessionExpiresAt();
  const hashed = await hashPassword(input.password);
  const recordedAt = new Date().toISOString();

  const stmts = [
    db
      .prepare(
        `INSERT INTO users (
          user_pseudonym_id, email,
          password_hash, password_salt, password_algo,
          consent_terms_version, consent_privacy_version, consent_recorded_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        userPseudonymId,
        input.email,
        hashed.hash,
        hashed.salt,
        hashed.algo,
        input.consentTermsVersion,
        input.consentPrivacyVersion,
        recordedAt,
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
    db
      .prepare(
        `INSERT INTO consent_log (user_pseudonym_id, consent_kind, granted, source)
         VALUES (?, 'research', 1, 'signup_privacy')`,
      )
      .bind(userPseudonymId),
  ];

  try {
    await db.batch(stmts);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('UNIQUE') || msg.includes('constraint')) {
      throw new SignupError('IDENTITY_EXISTS');
    }
    throw new SignupError('DB_ERROR');
  }

  return { userPseudonymId, sessionToken, expiresAt };
}
