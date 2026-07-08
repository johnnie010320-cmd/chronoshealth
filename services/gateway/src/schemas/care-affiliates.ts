import { z } from 'zod';

// 케어 제휴 카드 — 관리자 CRUD 입력 스키마 (migration 0037).
// gateway CLAUDE.md 규칙 1 — 모든 사용자 입력은 Zod 검증.

export const CareCategoryEnum = z.union([
  z.literal('diet'),
  z.literal('exercise'),
  z.literal('medical'),
]);

const CardText = z.object({
  title: z.string().min(1).max(120),
  body: z.string().min(1).max(400),
  ctaLabel: z.string().min(1).max(40),
});

export const CardI18nSchema = z.object({
  ko: CardText,
  en: CardText,
  ja: CardText,
  es: CardText,
});

// 자기 도메인 자리표시자 또는 실제 제휴 URL. http(s) 만 허용 (javascript: 등 차단).
const HttpUrl = z
  .string()
  .url()
  .max(500)
  .refine((u) => u.startsWith('https://') || u.startsWith('http://'), {
    message: 'must be http(s)',
  });

export const CreateCareAffiliateRequest = z.object({
  slug: z
    .string()
    .min(3)
    .max(64)
    .regex(/^[a-z0-9-]+$/, 'lowercase, digits, hyphen only'),
  category: CareCategoryEnum,
  partner: z.string().min(1).max(80),
  ctaUrl: HttpUrl,
  comingSoon: z.boolean(),
  sortOrder: z.number().int().min(0).max(999),
  active: z.boolean(),
  i18n: CardI18nSchema,
});

export const UpdateCareAffiliateRequest = z
  .object({
    category: CareCategoryEnum,
    partner: z.string().min(1).max(80),
    ctaUrl: HttpUrl,
    comingSoon: z.boolean(),
    sortOrder: z.number().int().min(0).max(999),
    active: z.boolean(),
    i18n: CardI18nSchema,
  })
  .partial()
  .refine((o) => Object.keys(o).length > 0, { message: 'empty patch' });

export type CreateCareAffiliateInput = z.infer<typeof CreateCareAffiliateRequest>;
export type UpdateCareAffiliateInput = z.infer<typeof UpdateCareAffiliateRequest>;
export type CardI18n = z.infer<typeof CardI18nSchema>;
