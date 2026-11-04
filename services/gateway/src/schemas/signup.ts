import { z } from 'zod';
import { COUNTRY_CODES } from './countries.js';

// ADR 0010 + 0012 + 0013 정합.
//
// phone 형식(국제 수용): 선택적 '+' 국가코드 + 숫자/공백/하이픈/괄호/점. 앞뒤는 숫자, 총 7~20.
// 예: '010-1234-5678', '+82 10 1234 5678', '+1 (234) 567-8900', '03-1234-5678', '2345678900'
const PHONE_REGEX = /^\+?[0-9][0-9\s().-]{5,18}[0-9]$/;

// ISO 3166-1 alpha-2 전 국가 + 'OTHER'(2026-10-20 죠니: 전 세계 국가 노출. 기존 KR/US/JP/ES/OTHER 값은 그대로 유효).
export const Nationality = z.enum([...COUNTRY_CODES, 'OTHER']);
export type Nationality = z.infer<typeof Nationality>;

// 스토리보드 p12 — 한글/영문/숫자/특수문자, 2~8자.
export const NICKNAME_REGEX = /^[A-Za-z0-9가-힣ぁ-んァ-ヶ一-龯_\-.]{2,8}$/;
export const NicknameSchema = z.string().regex(NICKNAME_REGEX);

// ADR 0013 — Step 1 회원가입 (계정 생성).
// 본인정보 (이름·전화·생년·성별·국적)는 Step 2에서 별도 PUT.
export const SignupRequest = z
  .object({
    email: z.string().email().max(254),
    password: z.string().min(1).max(128),
    consentMedical: z.boolean(),
    consentTerms: z.boolean(),
    consentPrivacy: z.boolean(),
    consentTermsVersion: z.string().min(1).max(20),
    consentPrivacyVersion: z.string().min(1).max(20),
    marketingOptIn: z.boolean().default(false),
  })
  .strict();
export type SignupRequest = z.infer<typeof SignupRequest>;

export type SignupResponse = {
  userPseudonymId: string;
  sessionToken: string;
  expiresAt: string;
};

// ADR 0013 — Step 2 본인정보 입력 (가입 후).
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
    nickname: NicknameSchema.optional(),
    // 소셜 신규 가입자의 최초 온보딩 동의(가입 폼을 거치지 않으므로 여기서 수집).
    // 기존 회원(이미 동의 기록 있음)은 생략. 서버가 미동의 상태면 필수로 강제(CONSENT_REQUIRED).
    consentMedical: z.boolean().optional(),
    consentTerms: z.boolean().optional(),
    consentPrivacy: z.boolean().optional(),
    consentTermsVersion: z.string().min(1).max(20).optional(),
    consentPrivacyVersion: z.string().min(1).max(20).optional(),
    marketingOptIn: z.boolean().optional(),
  })
  .strict();
export type ProfileUpdateRequest = z.infer<typeof ProfileUpdateRequest>;

export const CheckNicknameQuery = z
  .object({ nickname: NicknameSchema })
  .strict();
export type CheckNicknameQuery = z.infer<typeof CheckNicknameQuery>;

// 로그인 (변경 없음)
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

// 비밀번호 설정 (변경 없음)
export const SetPasswordRequest = z
  .object({
    email: z.string().email().max(254),
    password: z.string().min(1).max(128),
    phone: z.string().regex(PHONE_REGEX),
  })
  .strict();
export type SetPasswordRequest = z.infer<typeof SetPasswordRequest>;

// 이메일 중복 확인 (회원가입 폼 전용)
export const CheckEmailQuery = z
  .object({
    email: z.string().email().max(254),
  })
  .strict();
export type CheckEmailQuery = z.infer<typeof CheckEmailQuery>;
