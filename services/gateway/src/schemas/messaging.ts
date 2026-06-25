import { z } from 'zod';

// R9 메시징 — 입력 검증. 모든 라우트는 Zod parse 실패 시 400.
// 닉네임 규칙은 스토리보드 p11/p12 (2~8자) 정합.

export const NicknameSchema = z
  .string()
  .trim()
  .min(2)
  .max(8);

// 1:1 DM 열기 — 상대를 twin 닉네임으로 지정(ADR 0015 공개 핸들).
export const OpenDmRequest = z
  .object({
    nickname: NicknameSchema,
  })
  .strict();
export type OpenDmRequest = z.infer<typeof OpenDmRequest>;

// 대화방 생성 — 제목 + (선택) 초대할 닉네임 목록.
export const CreateRoomRequest = z
  .object({
    title: z.string().trim().min(2).max(60),
    inviteNicknames: z.array(NicknameSchema).max(20).default([]),
  })
  .strict();
export type CreateRoomRequest = z.infer<typeof CreateRoomRequest>;

// 메시지 전송. replyToMessageId 가 있으면 해당 메시지에 대한 답장.
export const SendMessageRequest = z
  .object({
    body: z.string().trim().min(1).max(2000),
    replyToMessageId: z.string().min(1).max(64).nullable().default(null),
  })
  .strict();
export type SendMessageRequest = z.infer<typeof SendMessageRequest>;

// 이모티콘 반응 — 카카오톡식 고정 6종(클라이언트·서버 동일 집합).
export const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'] as const;
export const ReactionRequest = z
  .object({
    emoji: z.enum(REACTION_EMOJIS),
  })
  .strict();
export type ReactionRequest = z.infer<typeof ReactionRequest>;

// 대화방 초대(추가 멤버).
export const InviteMemberRequest = z
  .object({
    nickname: NicknameSchema,
  })
  .strict();
export type InviteMemberRequest = z.infer<typeof InviteMemberRequest>;

// 메시지 목록 페이지네이션.
export const ListMessagesQuery = z
  .object({
    limit: z.coerce.number().int().min(1).max(50).default(30),
    before: z.string().nullable().default(null),
  })
  .strict();
export type ListMessagesQuery = z.infer<typeof ListMessagesQuery>;
