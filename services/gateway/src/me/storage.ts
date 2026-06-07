// 본인이 자기 PII 조회 — ADR 0003 정합 (자신의 PII 열람은 가능, 타인 PII는 admin만).
// ADR 0013 — 본인정보 (name/phone/birth_year/sex/nationality) NULL 허용.

import type { ProfileUpdateRequest } from '../schemas/signup.js';

export type MeProfile = {
  userPseudonymId: string;
  name: string | null;
  email: string;
  phone: string | null;
  birthYear: number | null;
  sex: 'male' | 'female' | 'other' | null;
  nationality: string | null;
  createdAt: string;
  consentTermsVersion: string | null;
  consentPrivacyVersion: string | null;
  consentRecordedAt: string | null;
  isProfileComplete: boolean;
};

export async function readMeProfile(
  identityDb: D1Database,
  userPseudonymId: string,
): Promise<MeProfile | null> {
  const row = await identityDb
    .prepare(
      `SELECT user_pseudonym_id, name, email, phone, birth_year, sex,
              nationality, created_at,
              consent_terms_version, consent_privacy_version, consent_recorded_at
         FROM users WHERE user_pseudonym_id = ? LIMIT 1`,
    )
    .bind(userPseudonymId)
    .first<{
      user_pseudonym_id: string;
      name: string | null;
      email: string;
      phone: string | null;
      birth_year: number | null;
      sex: string | null;
      nationality: string | null;
      created_at: string;
      consent_terms_version: string | null;
      consent_privacy_version: string | null;
      consent_recorded_at: string | null;
    }>();

  if (!row) return null;

  const sex: MeProfile['sex'] =
    row.sex === 'male' || row.sex === 'female' || row.sex === 'other'
      ? row.sex
      : null;

  const isProfileComplete = Boolean(
    row.name && row.phone && row.birth_year && sex && row.nationality,
  );

  return {
    userPseudonymId: row.user_pseudonym_id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    birthYear: row.birth_year,
    sex,
    nationality: row.nationality,
    createdAt: row.created_at,
    consentTermsVersion: row.consent_terms_version,
    consentPrivacyVersion: row.consent_privacy_version,
    consentRecordedAt: row.consent_recorded_at,
    isProfileComplete,
  };
}

// ADR 0013 — Step 2 본인정보 입력.
// 전화번호 UNIQUE 충돌 시 PHONE_EXISTS.
export class ProfileUpdateError extends Error {
  constructor(public code: 'PHONE_EXISTS' | 'DB_ERROR') {
    super(code);
  }
}

export async function updateMeProfile(
  identityDb: D1Database,
  userPseudonymId: string,
  input: ProfileUpdateRequest,
): Promise<void> {
  // 전화번호 중복 확인 — 본인 row 제외.
  const dup = await identityDb
    .prepare(
      'SELECT 1 FROM users WHERE phone = ? AND user_pseudonym_id != ? LIMIT 1',
    )
    .bind(input.phone, userPseudonymId)
    .first<{ '1': number } | null>();
  if (dup) {
    throw new ProfileUpdateError('PHONE_EXISTS');
  }

  try {
    await identityDb
      .prepare(
        `UPDATE users SET
           name = ?, phone = ?, birth_year = ?, sex = ?, nationality = ?
         WHERE user_pseudonym_id = ?`,
      )
      .bind(
        input.name,
        input.phone,
        input.birthYear,
        input.sex,
        input.nationality,
        userPseudonymId,
      )
      .run();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('UNIQUE') || msg.includes('constraint')) {
      throw new ProfileUpdateError('PHONE_EXISTS');
    }
    throw new ProfileUpdateError('DB_ERROR');
  }
}

export async function existsEmail(
  identityDb: D1Database,
  email: string,
): Promise<boolean> {
  const row = await identityDb
    .prepare('SELECT 1 FROM users WHERE email = ? LIMIT 1')
    .bind(email.toLowerCase())
    .first<{ '1': number }>();
  return row !== null;
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return '***';
  const head = local.slice(0, Math.min(2, local.length));
  return `${head}${'*'.repeat(Math.max(3, local.length - 2))}@${domain}`;
}

export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return '***';
  return `***-****-${digits.slice(-4)}`;
}

export function maskName(name: string): string {
  if (name.length <= 1) return name;
  if (name.length === 2) return `${name[0]}*`;
  return `${name[0]}${'*'.repeat(name.length - 2)}${name[name.length - 1]}`;
}
