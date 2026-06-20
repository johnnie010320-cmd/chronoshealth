import { z } from 'zod';

export const CommunityIdSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-zA-Z0-9_-]+$/);

export const PostTag = z.enum(['diet', 'exercise', 'sleep', 'medical', 'general']);
export type PostTag = z.infer<typeof PostTag>;

// 본문 서식 세그먼트 — 부분 선택 서식(크기/색상/굵게/기울임/밑줄). 임의 HTML 저장 없이 안전.
export const RichSegment = z
  .object({
    t: z.string().min(1).max(2000),
    b: z.literal(true).optional(),
    i: z.literal(true).optional(),
    u: z.literal(true).optional(),
    c: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    s: z.enum(['sm', 'lg', 'xl']).optional(),
  })
  .strict();
export type RichSegment = z.infer<typeof RichSegment>;

export const CreatePostRequest = z
  .object({
    communityId: CommunityIdSchema.default('_lounge'),
    title: z.string().min(2).max(120),
    body: z.string().min(2).max(2000),
    // 본문 서식 세그먼트(선택). 없으면 평문 body 렌더.
    bodyRich: z.array(RichSegment).max(400).nullable().default(null),
    // 첨부 이미지 노출 위치.
    imagePosition: z.enum(['top', 'middle', 'bottom']).default('top'),
    // 동영상 링크(YouTube·Vimeo) — 여러 개 가능. 단일 videoUrl 은 역호환용.
    videoUrl: z.string().url().max(500).nullable().default(null),
    videoUrls: z.array(z.string().url().max(500)).max(10).default([]),
    // SNS 링크 — Instagram/X/Facebook/블로그 등 임의 http(s) URL. 여러 개 가능.
    snsUrl: z.string().url().max(500).nullable().default(null),
    snsUrls: z.array(z.string().url().max(500)).max(10).default([]),
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
