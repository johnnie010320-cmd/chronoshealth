import type {
  BetaSignupRequest,
  BetaSignupResponse,
} from '../schemas/beta-signup.js';
import { emailPseudonym, ipHash, utcDayStamp } from './pseudonym.js';

// spec docs/spec/roadmap-ui.md Slice R3 / ADR 0011 정합.

export class BetaSignupError extends Error {
  constructor(public code: 'CONSENT_REQUIRED' | 'ALREADY_REGISTERED' | 'DB_ERROR') {
    super(code);
  }
}

export type BetaSignupContext = {
  identityDb: D1Database;
  analysisDb: D1Database;
  hmacSalt: string;
  ip: string;
  userAgent: string | null;
};

// 베타 등록 = identity 1 row + analysis 1 row (서로 다른 D1).
// 두 DB에 batch 원자성 보장 불가 → identity 실패 시 analysis 미진입,
// analysis 실패 시 identity 정리(보상 트랜잭션).
export async function registerBetaSignup(
  ctx: BetaSignupContext,
  input: BetaSignupRequest,
): Promise<BetaSignupResponse> {
  if (
    !input.consentPii ||
    !input.consentMedicalDisclaimer ||
    !input.consentTokenReview
  ) {
    throw new BetaSignupError('CONSENT_REQUIRED');
  }

  const pseudonym = await emailPseudonym(ctx.hmacSalt, input.email);
  const dayStamp = utcDayStamp();
  const ipHashed = await ipHash(ctx.hmacSalt, ctx.ip, dayStamp);

  // 중복 확인 — analysis pseudonym 우선 (PII 미접근).
  const existingPseudonym = await ctx.analysisDb
    .prepare('SELECT 1 FROM beta_signups WHERE email_pseudonym = ? LIMIT 1')
    .bind(pseudonym)
    .first<{ '1': number } | null>();

  if (existingPseudonym) {
    throw new BetaSignupError('ALREADY_REGISTERED');
  }

  const identityId = crypto.randomUUID();
  const analysisId = crypto.randomUUID();
  const interestedModulesJson = JSON.stringify(input.interestedModules);

  // 1단계: identity 도메인 INSERT (평문 이메일 + IP 해시 + UA + 동의 3종)
  try {
    await ctx.identityDb
      .prepare(
        `INSERT INTO beta_signup_identity
           (id, email, ip_hash, user_agent,
            consent_pii, consent_medical_disclaimer, consent_token_review)
         VALUES (?, ?, ?, ?, 1, 1, 1)`,
      )
      .bind(identityId, input.email, ipHashed, ctx.userAgent)
      .run();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('UNIQUE') || msg.includes('constraint')) {
      throw new BetaSignupError('ALREADY_REGISTERED');
    }
    throw new BetaSignupError('DB_ERROR');
  }

  // 2단계: analysis 도메인 INSERT (가명화)
  try {
    await ctx.analysisDb
      .prepare(
        `INSERT INTO beta_signups
           (id, email_pseudonym, country, age_group, interested_modules, locale)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        analysisId,
        pseudonym,
        input.country,
        input.ageGroup,
        interestedModulesJson,
        input.locale,
      )
      .run();
  } catch (err) {
    // 보상: identity 1단계 INSERT 롤백.
    await ctx.identityDb
      .prepare('DELETE FROM beta_signup_identity WHERE id = ?')
      .bind(identityId)
      .run()
      .catch(() => undefined);
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('UNIQUE') || msg.includes('constraint')) {
      throw new BetaSignupError('ALREADY_REGISTERED');
    }
    throw new BetaSignupError('DB_ERROR');
  }

  return {
    id: analysisId,
    registeredAt: new Date().toISOString(),
  };
}
