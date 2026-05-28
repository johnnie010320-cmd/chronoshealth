import { z } from 'zod';

// spec docs/spec/roadmap-ui.md Slice R3 / ADR 0011 정합.
//
// 베타 출시 대기자 등록 — 정식 가입(ADR 0010)과 별개의 마케팅 풀.
// 이메일 평문은 identity 도메인에만, analysis 도메인에는 HMAC pseudonym만.

export const AGE_GROUPS = ['19-29', '30-39', '40-49', '50-59', '60+'] as const;
export type AgeGroup = (typeof AGE_GROUPS)[number];

export const LOCALES = ['ko', 'en', 'ja', 'es'] as const;
export type BetaLocale = (typeof LOCALES)[number];

// M1~M11 + DID. roadmap-ui.md 와 동일.
export const MODULE_CODES = [
  'm1',
  'm2',
  'm3',
  'm4',
  'm5',
  'm6',
  'm7',
  'm8',
  'm9',
  'm10',
  'm11',
  'mdid',
] as const;
export type ModuleCode = (typeof MODULE_CODES)[number];

// ISO 3166-1 alpha-2 (2 letter uppercase). 화이트리스트 없이 형식만 검증.
const COUNTRY_REGEX = /^[A-Z]{2}$/;

export const BetaSignupRequest = z.object({
  email: z.string().email().max(254),
  country: z.string().regex(COUNTRY_REGEX, 'INVALID_COUNTRY'),
  ageGroup: z.enum(AGE_GROUPS),
  interestedModules: z.array(z.enum(MODULE_CODES)).max(MODULE_CODES.length),
  locale: z.enum(LOCALES),
  consentPii: z.boolean(),
  consentMedicalDisclaimer: z.boolean(),
  consentTokenReview: z.boolean(),
});

export type BetaSignupRequest = z.infer<typeof BetaSignupRequest>;

export type BetaSignupResponse = {
  id: string;
  registeredAt: string;
};
