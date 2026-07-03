import { z } from 'zod';

// R-Admin 공지사항 입력 검증.

// 외부 링크 — http/https URL 또는 null(빈 문자열은 null 로 정규화).
const LINK_URL = z
  .string()
  .trim()
  .max(500)
  .url()
  .refine((u) => u.startsWith('http://') || u.startsWith('https://'), 'link must be http(s)')
  .nullable();

export const CreateNoticeRequest = z
  .object({
    title: z.string().trim().min(2).max(120),
    body: z.string().trim().min(1).max(5000),
    pinned: z.boolean().default(false),
    published: z.boolean().default(true),
    linkUrl: z.preprocess((v) => (v === '' ? null : v), LINK_URL).default(null),
  })
  .strict();
export type CreateNoticeRequest = z.infer<typeof CreateNoticeRequest>;

// 부분 수정 — 제공된 필드만 갱신.
export const UpdateNoticeRequest = z
  .object({
    title: z.string().trim().min(2).max(120).optional(),
    body: z.string().trim().min(1).max(5000).optional(),
    pinned: z.boolean().optional(),
    published: z.boolean().optional(),
    linkUrl: z.preprocess((v) => (v === '' ? null : v), LINK_URL).optional(),
  })
  .strict();
export type UpdateNoticeRequest = z.infer<typeof UpdateNoticeRequest>;
