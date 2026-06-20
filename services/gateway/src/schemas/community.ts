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
    // SNS 링크 — Instagram/X/Facebook/블로그 등 임의 http(s) URL.
    snsUrl: z.string().url().max(500).nullable().default(null),
    // 이미지 직접 업로드 — base64(데이터URL 접두 제외), 클라 압축 후 ≤ ~700KB. 동영상은 video_url 링크만.
    imageB64: z.string().max(700 * 1024).nullable().default(null),
    imageMime: z.enum(['image/jpeg', 'image/png', 'image/webp']).nullable().default(null),
    allowLikes: z.boolean().default(true),
    allowComments: z.boolean().default(true),
    tag: PostTag.nullable().default(null),
  })
  .strict();
export type CreatePostRequest = z.infer<typeof CreatePostRequest>;

export const CreateCommentRequest = z
  .object({
    body: z.string().min(1).max(500),
    // 1:1 대화 수용 여부 — 작성자가 다른 회원의 DM 시도를 허용할지 선택.
    acceptsDm: z.boolean().default(false),
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
