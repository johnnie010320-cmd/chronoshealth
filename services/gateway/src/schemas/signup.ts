import { z } from 'zod';

// spec docs/spec/identity.md 4.1 / ADR 0010 결정 사항 #1 정합.
//
// phone 형식:
// - 국제 E.164: '+' + 국가코드(1~3) + 6~14자리. 예: '+821012345678'
// - 한국 표기: '010-XXXX-XXXX' / '0XX-XXXX-XXXX' (3-3,4-4 자리)
// 둘 중 하나 허용.
const PHONE_REGEX = /^(\+\d{7,17}|0\d{1,2}-\d{3,4}-\d{4})$/;

export const SignupRequest = z
  .object({
    name: z.string().trim().min(1).max(40),
    email: z.string().email().max(254),
    phone: z.string().regex(PHONE_REGEX),
    birthYear: z.number().int().min(1900),
    sex: z.enum(['male', 'female', 'other']),
    consentMedical: z.boolean(),
    consentTerms: z.boolean(),
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
