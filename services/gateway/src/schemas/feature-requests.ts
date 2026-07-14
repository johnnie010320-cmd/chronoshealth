import { z } from 'zod';
import {
  FEATURE_REQUEST_KINDS,
  FEATURE_REQUEST_STATUSES,
} from '../feature-requests/storage.js';

// 기능 요청 및 버그 리포트 입력 검증 (절대규칙 1 — 모든 입력 Zod).

const Kind = z.enum(
  FEATURE_REQUEST_KINDS as unknown as [string, ...string[]],
);
const Status = z.enum(
  FEATURE_REQUEST_STATUSES as unknown as [string, ...string[]],
);

// 외부 링크 — http/https URL 또는 null(빈 문자열은 null 로 정규화).
const LINK_URL = z
  .string()
  .trim()
  .max(500)
  .url()
  .refine((u) => u.startsWith('http://') || u.startsWith('https://'), 'link must be http(s)')
  .nullable();

// 사용자 — 생성.
export const CreateFeatureRequest = z
  .object({
    kind: Kind.default('feature'),
    title: z.string().trim().min(2).max(120),
    body: z.string().trim().min(1).max(4000),
    linkUrl: z.preprocess((v) => (v === '' ? null : v), LINK_URL).default(null),
  })
  .strict();
export type CreateFeatureRequest = z.infer<typeof CreateFeatureRequest>;

// 사용자 — 본인 글 부분 수정.
export const UpdateFeatureRequest = z
  .object({
    kind: Kind.optional(),
    title: z.string().trim().min(2).max(120).optional(),
    body: z.string().trim().min(1).max(4000).optional(),
    linkUrl: z.preprocess((v) => (v === '' ? null : v), LINK_URL).optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, 'at least one field required');
export type UpdateFeatureRequest = z.infer<typeof UpdateFeatureRequest>;

// 관리자 — 피드백/상태. 빈 문자열 피드백은 null(피드백 해제)로 정규화.
export const AdminFeatureFeedback = z
  .object({
    feedback: z
      .preprocess(
        (v) => (v === '' ? null : v),
        z.string().trim().max(4000).nullable(),
      )
      .optional(),
    status: Status.optional(),
  })
  .strict()
  .refine(
    (v) => v.feedback !== undefined || v.status !== undefined,
    'feedback or status required',
  );
export type AdminFeatureFeedback = z.infer<typeof AdminFeatureFeedback>;
