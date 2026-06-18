import { z } from 'zod';

export const CommunityIdSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-zA-Z0-9_-]+$/);

export const PostTag = z.enum(['diet', 'exercise', 'sleep', 'medical', 'general']);
export type PostTag = z.infer<typeof PostTag>;

export const CreatePostRequest = z
  .object({
    communityId: CommunityIdSchema.default('_lounge'),
    title: z.string().min(2).max(120),
    body: z.string().min(2).max(2000),
    videoUrl: z.string().url().max(500).nullable(),
    allowLikes: z.boolean().default(true),
    allowComments: z.boolean().default(true),
    tag: PostTag.nullable().default(null),
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
    communityId: CommunityIdSchema.optional(),
    tag: PostTag.optional(),
    mine: z.coerce.boolean().optional(),
  })
  .strict();
export type ListPostsQuery = z.infer<typeof ListPostsQuery>;

// owner 전용 — 공개/비공개 전환.
export const UpdateCommunityRequest = z
  .object({
    visibility: z.enum(['public', 'private']),
  })
  .strict();
export type UpdateCommunityRequest = z.infer<typeof UpdateCommunityRequest>;

// owner 전용 — 커뮤니티 관리자 지정(닉네임).
export const AddCommunityAdminRequest = z
  .object({
    nickname: z.string().trim().min(2).max(8),
  })
  .strict();
export type AddCommunityAdminRequest = z.infer<typeof AddCommunityAdminRequest>;

export const CreateCommunityRequest = z
  .object({
    name: z.string().min(2).max(60),
    description: z.string().max(500).default(''),
    visibility: z.enum(['public', 'private']),
    allowLikesDefault: z.boolean().default(true),
    allowCommentsDefault: z.boolean().default(true),
  })
  .strict();
export type CreateCommunityRequest = z.infer<typeof CreateCommunityRequest>;
