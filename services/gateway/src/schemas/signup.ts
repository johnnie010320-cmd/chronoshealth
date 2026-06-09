import { z } from 'zod';

// ADR 0010 + 0012 + 0013 정합.
//
// phone 형식:
// - 국제 E.164: '+' + 국가코드(1~3) + 6~14자리. 예: '+821012345678'
// - 한국 표기: '010-XXXX-XXXX' / '0XX-XXXX-XXXX' (3-3,4-4 자리)
const PHONE_REGEX = /^(\+\d{7,17}|0\d{1,2}-\d{3,4}-\d{4})$/;

export const Nationality = z.enum(['KR', 'US', 'JP', 'ES', 'OTHER']);
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
