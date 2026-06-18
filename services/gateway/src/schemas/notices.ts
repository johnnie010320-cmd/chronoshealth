import { z } from 'zod';

// R-Admin 공지사항 입력 검증.

export const CreateNoticeRequest = z
  .object({
    title: z.string().trim().min(2).max(120),
    body: z.string().trim().min(1).max(5000),
    pinned: z.boolean().default(false),
    published: z.boolean().default(true),
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
  })
  .strict();
export type UpdateNoticeRequest = z.infer<typeof UpdateNoticeRequest>;
