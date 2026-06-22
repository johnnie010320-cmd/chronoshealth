import { Hono, type Context } from 'hono';
import { authMiddleware, type AuthVariables } from '../../middleware/auth.js';
import { rateLimit } from '../../middleware/rate-limit.js';
import {
  CreateRoomRequest,
  InviteMemberRequest,
  ListMessagesQuery,
  OpenDmRequest,
  SendMessageRequest,
} from '../../schemas/messaging.js';
import {
  addMember,
  deleteConversation,
  dmConversationId,
  getMessageAttachment,
  insertConversation,
  insertMessage,
  isMember,
  lastMessage,
  leaveConversation,
  listConversationsForMember,
  listMembers,
  listMessages,
  markRead,
  readConversation,
  unreadCount,
  unreadTotal,
  type ConversationRow,
  type MemberRow,
} from '../../messaging/storage.js';
import {
  findPseudonymByNickname,
  resolveNicknames,
} from '../../messaging/nickname.js';
import {
  ATTACHMENT_TTL_DAYS,
  MAX_ATTACHMENT_BYTES,
  attachmentKey,
  resolveAttachmentType,
  safeFileName,
} from '../../messaging/files.js';
import { moderateText } from '../../community/moderation.js';
import type { Bindings } from '../../bindings.js';

const MODEL_VERSION = 'messaging-v0.1.0';

export const messagingRoute = new Hono<{
  Bindings: Bindings;
  Variables: AuthVariables;
}>();

// DM 상대 표시명 = 나를 제외한 멤버의 닉네임. 대화방 = title.
function displayNameFor(
  conv: ConversationRow,
  members: MemberRow[],
  me: string,
  nicks: Map<string, string | null>,
): string | null {
  if (conv.kind === 'room') return conv.title;
  const other = members.find((m) => m.memberPseudonymId !== me);
  return other ? (nicks.get(other.memberPseudonymId) ?? null) : null;
}

async function parseJson(c: Context): Promise<unknown | null> {
  try {
    return await c.req.json();
  } catch {
    return null;
  }
}

// ── DM 열기 (닉네임으로) ──────────────────────────────────────────────────
messagingRoute.post('/dm', authMiddleware, rateLimit(50), async (c) => {
  const me = c.get('userPseudonymId');
  const raw = await parseJson(c);
  if (raw === null) return c.json({ error: { code: 'INVALID_JSON' } }, 400);
  const parsed = OpenDmRequest.safeParse(raw);
  if (!parsed.success) return c.json({ error: { code: 'INVALID_INPUT' } }, 400);

  const targetId = await findPseudonymByNickname(c.env.IDENTITY_DB, parsed.data.nickname);
  if (!targetId) return c.json({ error: { code: 'USER_NOT_FOUND' } }, 404);
  if (targetId === me) return c.json({ error: { code: 'CANNOT_DM_SELF' } }, 400);

  const id = dmConversationId(me, targetId);
  await insertConversation(c.env.DB, { id, kind: 'dm', title: null, ownerPseudonymId: null });
  await addMember(c.env.DB, id, me, 'member');
  await addMember(c.env.DB, id, targetId, 'member');

  const conv = await readConversation(c.env.DB, id);
  const members = await listMembers(c.env.DB, id);
  const nicks = await resolveNicknames(
    c.env.IDENTITY_DB,
    members.map((m) => m.memberPseudonymId),
  );
  return c.json({
    conversation: conv && {
      id: conv.id,
      kind: conv.kind,
      title: conv.title,
      displayName: displayNameFor(conv, members, me, nicks),
      createdAt: conv.createdAt,
    },
    modelVersion: MODEL_VERSION,
  });
});

// ── 대화방 생성 ────────────────────────────────────────────────────────────
messagingRoute.post('/rooms', authMiddleware, rateLimit(20), async (c) => {
  const me = c.get('userPseudonymId');
  const raw = await parseJson(c);
  if (raw === null) return c.json({ error: { code: 'INVALID_JSON' } }, 400);
  const parsed = CreateRoomRequest.safeParse(raw);
  if (!parsed.success) return c.json({ error: { code: 'INVALID_INPUT' } }, 400);

  const textCheck = moderateText(parsed.data.title);
  if (!textCheck.allowed) return c.json({ error: { code: textCheck.reason } }, 400);

  const id = crypto.randomUUID();
  await insertConversation(c.env.DB, {
    id,
    kind: 'room',
    title: parsed.data.title,
    ownerPseudonymId: me,
  });
  await addMember(c.env.DB, id, me, 'owner');

  // 초대 닉네임 → pseudonym 해석. 없는 닉네임은 조용히 건너뜀(부분 성공).
  for (const nick of parsed.data.inviteNicknames) {
    const pid = await findPseudonymByNickname(c.env.IDENTITY_DB, nick);
    if (pid && pid !== me) await addMember(c.env.DB, id, pid, 'member');
  }

  const conv = await readConversation(c.env.DB, id);
  return c.json({
    conversation: conv && {
      id: conv.id,
      kind: conv.kind,
      title: conv.title,
      displayName: conv.title,
      createdAt: conv.createdAt,
    },
    modelVersion: MODEL_VERSION,
  });
});

// ── 내 대화 목록 ──────────────────────────────────────────────────────────
messagingRoute.get('/conversations', authMiddleware, rateLimit(200), async (c) => {
  const me = c.get('userPseudonymId');
  const convs = await listConversationsForMember(c.env.DB, me);

  const items = await Promise.all(
    convs.map(async (conv) => {
      const members = await listMembers(c.env.DB, conv.id);
      const last = await lastMessage(c.env.DB, conv.id);
      const unread = await unreadCount(c.env.DB, conv.id, conv.lastReadAt, me);
      return { conv, members, last, unread };
    }),
  );

  // 표시에 필요한 모든 pseudonym(DM 상대 + last sender) 닉네임 일괄 해석.
  const needed: string[] = [];
  for (const it of items) {
    for (const m of it.members) needed.push(m.memberPseudonymId);
    if (it.last) needed.push(it.last.senderPseudonymId);
  }
  const nicks = await resolveNicknames(c.env.IDENTITY_DB, needed);

  const conversations = items.map((it) => ({
    id: it.conv.id,
    kind: it.conv.kind,
    title: it.conv.title,
    displayName: displayNameFor(it.conv, it.members, me, nicks),
    memberCount: it.members.length,
    unreadCount: it.unread,
    lastMessage: it.last
      ? {
          // 파일 메시지(본문 비어있음)는 첨부 파일명을 미리보기로.
          body: it.last.body || (it.last.attachment ? `📎 ${it.last.attachment.name}` : ''),
          createdAt: it.last.createdAt,
          senderNickname: nicks.get(it.last.senderPseudonymId) ?? null,
        }
      : null,
    createdAt: it.conv.createdAt,
  }));
  return c.json({ conversations, modelVersion: MODEL_VERSION });
});

// ── 대화 상세(멤버) ───────────────────────────────────────────────────────
messagingRoute.get('/conversations/:id', authMiddleware, rateLimit(200), async (c) => {
  const me = c.get('userPseudonymId');
  const id = c.req.param('id');
  const conv = await readConversation(c.env.DB, id);
  if (!conv) return c.json({ error: { code: 'NOT_FOUND' } }, 404);
  if (!(await isMember(c.env.DB, id, me))) {
    return c.json({ error: { code: 'NOT_A_MEMBER' } }, 403);
  }
  const members = await listMembers(c.env.DB, id);
  const nicks = await resolveNicknames(
    c.env.IDENTITY_DB,
    members.map((m) => m.memberPseudonymId),
  );
  return c.json({
    conversation: {
      id: conv.id,
      kind: conv.kind,
      title: conv.title,
      displayName: displayNameFor(conv, members, me, nicks),
      isOwner: conv.ownerPseudonymId === me,
      createdAt: conv.createdAt,
    },
    members: members.map((m) => ({
      nickname: nicks.get(m.memberPseudonymId) ?? null,
      role: m.role,
      isMe: m.memberPseudonymId === me,
    })),
    modelVersion: MODEL_VERSION,
  });
});

// ── 메시지 목록 ───────────────────────────────────────────────────────────
messagingRoute.get('/conversations/:id/messages', authMiddleware, rateLimit(600), async (c) => {
  const me = c.get('userPseudonymId');
  const id = c.req.param('id');
  if (!(await isMember(c.env.DB, id, me))) {
    return c.json({ error: { code: 'NOT_A_MEMBER' } }, 403);
  }
  const parsed = ListMessagesQuery.safeParse({
    limit: c.req.query('limit'),
    before: c.req.query('before') ?? null,
  });
  if (!parsed.success) return c.json({ error: { code: 'INVALID_INPUT' } }, 400);

  const rows = await listMessages(c.env.DB, id, {
    limit: parsed.data.limit,
    before: parsed.data.before,
  });
  const nicks = await resolveNicknames(
    c.env.IDENTITY_DB,
    rows.map((r) => r.senderPseudonymId),
  );
  // 최신순으로 조회 → 화면 표시는 오래된→최신이 자연스러우므로 reverse.
  const messages = rows
    .slice()
    .reverse()
    .map((r) => ({
      id: r.id,
      body: r.body,
      createdAt: r.createdAt,
      senderNickname: nicks.get(r.senderPseudonymId) ?? null,
      isMine: r.senderPseudonymId === me,
      attachment: r.attachment,
    }));
  return c.json({
    messages,
    hasMore: rows.length === parsed.data.limit,
    modelVersion: MODEL_VERSION,
  });
});

// ── 메시지 전송 ───────────────────────────────────────────────────────────
messagingRoute.post('/conversations/:id/messages', authMiddleware, rateLimit(120), async (c) => {
  const me = c.get('userPseudonymId');
  const id = c.req.param('id');
  if (!(await isMember(c.env.DB, id, me))) {
    return c.json({ error: { code: 'NOT_A_MEMBER' } }, 403);
  }
  const raw = await parseJson(c);
  if (raw === null) return c.json({ error: { code: 'INVALID_JSON' } }, 400);
  const parsed = SendMessageRequest.safeParse(raw);
  if (!parsed.success) return c.json({ error: { code: 'INVALID_INPUT' } }, 400);

  const check = moderateText(parsed.data.body);
  if (!check.allowed) return c.json({ error: { code: check.reason } }, 400);

  const msgId = crypto.randomUUID();
  await insertMessage(c.env.DB, {
    id: msgId,
    conversationId: id,
    senderPseudonymId: me,
    body: parsed.data.body,
  });
  await markRead(c.env.DB, id, me);
  return c.json({
    message: { id: msgId, body: parsed.data.body, isMine: true },
    modelVersion: MODEL_VERSION,
  });
});

// ── 파일 첨부 업로드(jpg/pdf/ppt) → R2 + 메시지 생성 ──────────────────────
messagingRoute.post('/conversations/:id/files', authMiddleware, rateLimit(30), async (c) => {
  const me = c.get('userPseudonymId');
  const id = c.req.param('id');
  if (!(await isMember(c.env.DB, id, me))) {
    return c.json({ error: { code: 'NOT_A_MEMBER' } }, 403);
  }
  let form: FormData;
  try {
    form = await c.req.formData();
  } catch {
    return c.json({ error: { code: 'INVALID_INPUT' } }, 400);
  }
  const file = form.get('file');
  if (!(file instanceof File)) {
    return c.json({ error: { code: 'INVALID_INPUT' } }, 400);
  }
  const type = resolveAttachmentType(file.name, file.type);
  if (!type) {
    return c.json({ error: { code: 'UNSUPPORTED_FILE_TYPE' } }, 400);
  }
  if (file.size <= 0 || file.size > MAX_ATTACHMENT_BYTES) {
    return c.json({ error: { code: 'FILE_TOO_LARGE' } }, 400);
  }
  const msgId = crypto.randomUUID();
  const key = attachmentKey(id, msgId, file.name);
  const expiresAt = new Date(Date.now() + ATTACHMENT_TTL_DAYS * 86400_000).toISOString();
  const name = safeFileName(file.name);
  try {
    // 고정 길이 ArrayBuffer 로 업로드 — R2 는 길이 불명 스트림을 거부할 수 있음.
    const bytes = await file.arrayBuffer();
    await c.env.ATTACHMENTS.put(key, bytes, {
      httpMetadata: { contentType: type },
    });
  } catch (err) {
    console.error('R2 put failed', err);
    return c.json({ error: { code: 'UPLOAD_FAILED' } }, 502);
  }
  await insertMessage(c.env.DB, {
    id: msgId,
    conversationId: id,
    senderPseudonymId: me,
    body: '',
    attachment: { key, name, type, size: file.size, expiresAt },
  });
  await markRead(c.env.DB, id, me);
  return c.json({
    message: {
      id: msgId,
      body: '',
      isMine: true,
      attachment: { name, type, size: file.size, expiresAt },
    },
    modelVersion: MODEL_VERSION,
  });
});

// ── 파일 다운로드 — 대화 참여자만, R2 스트림 ───────────────────────────────
messagingRoute.get('/files/:messageId', authMiddleware, rateLimit(120), async (c) => {
  const me = c.get('userPseudonymId');
  const messageId = c.req.param('messageId');
  const att = await getMessageAttachment(c.env.DB, messageId);
  if (!att) return c.json({ error: { code: 'NOT_FOUND' } }, 404);
  if (!(await isMember(c.env.DB, att.conversationId, me))) {
    return c.json({ error: { code: 'NOT_A_MEMBER' } }, 403);
  }
  const obj = await c.env.ATTACHMENTS.get(att.key);
  if (!obj) return c.json({ error: { code: 'NOT_FOUND' } }, 404);
  const headers = new Headers();
  headers.set('Content-Type', att.type);
  headers.set('Content-Disposition', `attachment; filename="${safeFileName(att.name)}"`);
  headers.set('Cache-Control', 'private, max-age=300');
  return new Response(obj.body, { headers });
});

// ── 전체 미읽음 합계(알림 배지) ────────────────────────────────────────────
messagingRoute.get('/unread-total', authMiddleware, rateLimit(300), async (c) => {
  const me = c.get('userPseudonymId');
  const total = await unreadTotal(c.env.DB, me);
  return c.json({ total, modelVersion: MODEL_VERSION });
});

// ── 읽음 처리 ─────────────────────────────────────────────────────────────
messagingRoute.post('/conversations/:id/read', authMiddleware, rateLimit(200), async (c) => {
  const me = c.get('userPseudonymId');
  const id = c.req.param('id');
  if (!(await isMember(c.env.DB, id, me))) {
    return c.json({ error: { code: 'NOT_A_MEMBER' } }, 403);
  }
  await markRead(c.env.DB, id, me);
  return c.json({ ok: true, modelVersion: MODEL_VERSION });
});

// ── 대화방 초대(owner 만) ─────────────────────────────────────────────────
messagingRoute.post('/conversations/:id/invite', authMiddleware, rateLimit(50), async (c) => {
  const me = c.get('userPseudonymId');
  const id = c.req.param('id');
  const conv = await readConversation(c.env.DB, id);
  if (!conv) return c.json({ error: { code: 'NOT_FOUND' } }, 404);
  if (conv.kind !== 'room' || conv.ownerPseudonymId !== me) {
    return c.json({ error: { code: 'FORBIDDEN' } }, 403);
  }
  const raw = await parseJson(c);
  if (raw === null) return c.json({ error: { code: 'INVALID_JSON' } }, 400);
  const parsed = InviteMemberRequest.safeParse(raw);
  if (!parsed.success) return c.json({ error: { code: 'INVALID_INPUT' } }, 400);

  const pid = await findPseudonymByNickname(c.env.IDENTITY_DB, parsed.data.nickname);
  if (!pid) return c.json({ error: { code: 'USER_NOT_FOUND' } }, 404);
  await addMember(c.env.DB, id, pid, 'member');
  return c.json({ ok: true, modelVersion: MODEL_VERSION });
});

// ── 나가기 ────────────────────────────────────────────────────────────────
messagingRoute.post('/conversations/:id/leave', authMiddleware, rateLimit(50), async (c) => {
  const me = c.get('userPseudonymId');
  const id = c.req.param('id');
  const ok = await leaveConversation(c.env.DB, id, me);
  if (!ok) return c.json({ error: { code: 'NOT_A_MEMBER' } }, 403);
  return c.json({ ok: true, modelVersion: MODEL_VERSION });
});

// ── 대화방 삭제(생성자 전용) ──────────────────────────────────────────────
messagingRoute.delete('/conversations/:id', authMiddleware, rateLimit(50), async (c) => {
  const me = c.get('userPseudonymId');
  const id = c.req.param('id');
  const conv = await readConversation(c.env.DB, id);
  if (!conv) return c.json({ error: { code: 'NOT_FOUND' } }, 404);
  // 대화방(room) 생성자만 삭제. DM 은 삭제 불가(나가기만).
  if (conv.kind !== 'room' || conv.ownerPseudonymId !== me) {
    return c.json({ error: { code: 'FORBIDDEN' } }, 403);
  }
  await deleteConversation(c.env.DB, id);
  return c.json({ deleted: true, modelVersion: MODEL_VERSION });
});
