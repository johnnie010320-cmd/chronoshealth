import { z } from 'zod';
import { COUNTRY_CODES } from './countries';

// services/gateway/src/schemas/signup.ts와 동기. ADR 0013 — 2단계 가입.

// 국제 전화번호 수용 — 선택적 '+' 국가코드 + 숫자/공백/하이픈/괄호/점.
// 앞뒤는 숫자, 총 길이 7~20(E.164 최대 15자리 + 구분자 여유).
// 예: 010-1234-5678 · +82 10 1234 5678 · +1 (234) 567-8900 · 03-1234-5678 · 2345678900
const PHONE_REGEX = /^\+?[0-9][0-9\s().-]{5,18}[0-9]$/;

// ISO 3166-1 alpha-2 전 국가 + 'OTHER'. 선택지·국가명은 lib/countries.ts.
export const Nationality = z.enum([...COUNTRY_CODES, 'OTHER']);
export type Nationality = z.infer<typeof Nationality>;

// Step 1 — 계정 생성
export const SignupRequest = z
  .object({
    email: z.string().email().max(254),
    password: z.string().min(1).max(128),
    consentMedical: z.boolean(),
    consentTerms: z.boolean(),
    consentPrivacy: z.boolean(),
    consentTermsVersion: z.string().min(1).max(20),
    consentPrivacyVersion: z.string().min(1).max(20),
  })
  .strict();
export type SignupRequest = z.infer<typeof SignupRequest>;

export type SignupResponse = {
  userPseudonymId: string;
  sessionToken: string;
  expiresAt: string;
};

// Step 2 — 본인정보 입력
export const ProfileUpdateRequest = z
  .object({
    name: z.string().trim().min(1).max(40),
    phone: z.string().regex(PHONE_REGEX),
    birthYear: z
      .number()
      .int()
      .min(1900)
      .refine((y) => new Date().getFullYear() - y >= 19, {
        message: 'AGE_RESTRICTED',
      }),
    sex: z.enum(['male', 'female', 'other']),
    nationality: Nationality,
  })
  .strict();
export type ProfileUpdateRequest = z.infer<typeof ProfileUpdateRequest>;

// 클라이언트 측 비밀번호 정책 검증
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
