import { z } from 'zod';

// spec docs/spec/identity.md 4.1 / ADR 0010 + 0012 정합.
//
// phone 형식:
// - 국제 E.164: '+' + 국가코드(1~3) + 6~14자리. 예: '+821012345678'
// - 한국 표기: '010-XXXX-XXXX' / '0XX-XXXX-XXXX' (3-3,4-4 자리)
// 둘 중 하나 허용.
const PHONE_REGEX = /^(\+\d{7,17}|0\d{1,2}-\d{3,4}-\d{4})$/;

export const Nationality = z.enum(['KR', 'US', 'JP', 'ES', 'OTHER']);
export type Nationality = z.infer<typeof Nationality>;

export const SignupRequest = z
  .object({
    name: z.string().trim().min(1).max(40),
    email: z.string().email().max(254),
    phone: z.string().regex(PHONE_REGEX),
    birthYear: z.number().int().min(1900),
    sex: z.enum(['male', 'female', 'other']),
    // ADR 0012 — P1 비밀번호 도입. 자세한 정책 검증은 service 레이어에서 수행
    // (PASSWORD_TOO_SHORT / PASSWORD_KOREAN_NOT_ALLOWED 등 구체 코드 반환).
    password: z.string().min(1).max(128),
    nationality: Nationality,
    consentMedical: z.boolean(),
    consentTerms: z.boolean(),
    consentPrivacy: z.boolean(),
    consentTermsVersion: z.string().min(1).max(20),
    consentPrivacyVersion: z.string().min(1).max(20),
  })
  .refine(
    (v) => new Date().getFullYear() - v.birthYear >= 19,
    { path: ['birthYear'], message: 'AGE_RESTRICTED' },
  );

export type SignupRequest = z.infer<typeof SignupRequest>;

export type SignupResponse = {
  userPseudonymId: string;
  sessionToken: string;
  expiresAt: string;
};

// 로그인 요청
export const LoginRequest = z
  .object({
    email: z.string().email().max(254),
    password: z.string().min(1).max(128),
  })
  .strict();
export type LoginRequest = z.infer<typeof LoginRequest>;

export type LoginResponse = {
  userPseudonymId: string;
  sessionToken: string;
  expiresAt: string;
};

// ADR 0012 마이그레이션 — 기존 가입자가 비밀번호 설정.
export const SetPasswordRequest = z
  .object({
    email: z.string().email().max(254),
    password: z.string().min(1).max(128),
    // 신원 재확인 (P1 한정 — P2 본인 인증 ADR 도입 후 강화)
    phone: z.string().regex(PHONE_REGEX),
  })
  .strict();
export type SetPasswordRequest = z.infer<typeof SetPasswordRequest>;
