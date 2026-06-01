import { z } from 'zod';

// services/gateway/src/schemas/signup.ts와 동기. P1 후반 packages/types로 이동 예정.

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

// 클라이언트 측 비밀번호 정책 검증 (BE와 동일)
export type PasswordPolicyError =
  | 'PASSWORD_TOO_SHORT'
  | 'PASSWORD_TOO_LONG'
  | 'PASSWORD_KOREAN_NOT_ALLOWED'
  | 'PASSWORD_NOT_COMPLEX';

export function validatePasswordPolicy(value: string): PasswordPolicyError | null {
  if (value.length < 8) return 'PASSWORD_TOO_SHORT';
  if (value.length > 128) return 'PASSWORD_TOO_LONG';
  if (/[가-힣ㄱ-ㅎㅏ-ㅣ]/.test(value)) return 'PASSWORD_KOREAN_NOT_ALLOWED';
  const classes =
    Number(/[A-Z]/.test(value)) +
    Number(/[a-z]/.test(value)) +
    Number(/\d/.test(value)) +
    Number(/[^A-Za-z0-9]/.test(value));
  if (classes < 3) return 'PASSWORD_NOT_COMPLEX';
  return null;
}

// 로그인
export type LoginRequest = {
  email: string;
  password: string;
};

export type LoginResponse = {
  userPseudonymId: string;
  sessionToken: string;
  expiresAt: string;
};

// 비밀번호 설정 (legacy 사용자)
export type SetPasswordRequest = {
  email: string;
  password: string;
  phone: string;
};
