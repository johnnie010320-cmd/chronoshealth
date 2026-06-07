// 본인이 자기 PII 조회 — ADR 0003 정합 (자신의 PII 열람은 가능, 타인 PII는 admin만).

export type MeProfile = {
  userPseudonymId: string;
  name: string;
  email: string;
  phone: string;
  birthYear: number;
  sex: 'male' | 'female' | 'other';
  nationality: string | null;
  createdAt: string;
  consentTermsVersion: string | null;
  consentPrivacyVersion: string | null;
  consentRecordedAt: string | null;
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
      name: string;
      email: string;
      phone: string;
      birth_year: number;
      sex: string;
      nationality: string | null;
      created_at: string;
      consent_terms_version: string | null;
      consent_privacy_version: string | null;
      consent_recorded_at: string | null;
    }>();

  if (!row) return null;

  const sex: MeProfile['sex'] =
    row.sex === 'male' || row.sex === 'female' ? row.sex : 'other';

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
  };
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
