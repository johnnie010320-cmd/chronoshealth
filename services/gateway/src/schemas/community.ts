import { z } from 'zod';

export const CreatePostRequest = z
  .object({
    title: z.string().min(2).max(120),
    body: z.string().min(2).max(2000),
    videoUrl: z.string().url().max(500).nullable(),
  })
  .strict();
export type CreatePostRequest = z.infer<typeof CreatePostRequest>;

export const CreateCommentRequest = z
  .object({
    body: z.string().min(1).max(500),
  })
  .strict();
export type CreateCommentRequest = z.infer<typeof CreateCommentRequest>;

export const ListPostsQuery = z
  .object({
    limit: z.coerce.number().int().min(1).max(50).default(20),
    cursor: z.string().nullable().default(null),
  })
  .strict();
export type ListPostsQuery = z.infer<typeof ListPostsQuery>;
