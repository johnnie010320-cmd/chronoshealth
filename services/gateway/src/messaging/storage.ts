// R9 메시징 D1 접근 — analysis DB(conversations/conversation_members/messages).
// 모든 식별자는 pseudonym. 발신자 표시명은 nickname.ts 가 IDENTITY_DB 에서 별도 해석.

export type ConversationKind = 'dm' | 'room';
export type MemberRole = 'owner' | 'member';

export type ConversationRow = {
  id: string;
  kind: ConversationKind;
  title: string | null;
  ownerPseudonymId: string | null;
  createdAt: string;
};

export type MemberRow = {
  memberPseudonymId: string;
  role: MemberRole;
  lastReadAt: string;
};

export type MessageAttachment = {
  name: string;
  type: string;
  size: number;
  expiresAt: string | null;
};

export type MessageRow = {
  id: string;
  senderPseudonymId: string;
  body: string;
  createdAt: string;
  // 파일 첨부(있으면). R2 키는 내부 전용이라 노출하지 않음 — 다운로드는 messageId 로.
  attachment: MessageAttachment | null;
};

// DM 대화의 결정적 id — 두 pseudonym 을 정렬·조합. 중복 생성 방지(INSERT OR IGNORE).
export function dmConversationId(a: string, b: string): string {
  const [x, y] = [a, b].sort();
  return `dm_${x}_${y}`;
}

type RawConversation = {
  id: string;
  kind: string;
  title: string | null;
  owner_pseudonym_id: string | null;
  created_at: string;
};

function toConversation(r: RawConversation): ConversationRow {
  return {
    id: r.id,
    kind: r.kind === 'room' ? 'room' : 'dm',
    title: r.title,
    ownerPseudonymId: r.owner_pseudonym_id,
    createdAt: r.created_at,
  };
}

export async function insertConversation(
  db: D1Database,
  row: {
    id: string;
    kind: ConversationKind;
    title: string | null;
    ownerPseudonymId: string | null;
  },
): Promise<void> {
  await db
    .prepare(
      `INSERT OR IGNORE INTO conversations (id, kind, title, owner_pseudonym_id)
       VALUES (?, ?, ?, ?)`,
    )
    .bind(row.id, row.kind, row.title, row.ownerPseudonymId)
    .run();
}

export async function addMember(
  db: D1Database,
  conversationId: string,
  memberPseudonymId: string,
  role: MemberRole,
): Promise<void> {
  await db
    .prepare(
      `INSERT OR IGNORE INTO conversation_members
         (conversation_id, member_pseudonym_id, role)
       VALUES (?, ?, ?)`,
    )
    .bind(conversationId, memberPseudonymId, role)
    .run();
}

export async function readConversation(
  db: D1Database,
  id: string,
): Promise<ConversationRow | null> {
  const r = await db
    .prepare(
      `SELECT id, kind, title, owner_pseudonym_id, created_at
         FROM conversations WHERE id = ? AND deleted_at IS NULL LIMIT 1`,
    )
    .bind(id)
    .first<RawConversation>();
  return r ? toConversation(r) : null;
}

export async function isMember(
  db: D1Database,
  conversationId: string,
  pseudonymId: string,
): Promise<boolean> {
  const r = await db
    .prepare(
      `SELECT 1 FROM conversation_members
         WHERE conversation_id = ? AND member_pseudonym_id = ? LIMIT 1`,
    )
    .bind(conversationId, pseudonymId)
    .first<{ '1': number }>();
  return r !== null;
}

export async function listMembers(
  db: D1Database,
  conversationId: string,
): Promise<MemberRow[]> {
  const { results } = await db
    .prepare(
      `SELECT member_pseudonym_id, role, last_read_at
         FROM conversation_members WHERE conversation_id = ?`,
    )
    .bind(conversationId)
    .all<{ member_pseudonym_id: string; role: string; last_read_at: string }>();
  return results.map((r) => ({
    memberPseudonymId: r.member_pseudonym_id,
    role: r.role === 'owner' ? 'owner' : 'member',
    lastReadAt: r.last_read_at,
  }));
}

export type ConversationForMember = ConversationRow & { lastReadAt: string };

export async function listConversationsForMember(
  db: D1Database,
  pseudonymId: string,
): Promise<ConversationForMember[]> {
  const { results } = await db
    .prepare(
      `SELECT c.id, c.kind, c.title, c.owner_pseudonym_id, c.created_at, m.last_read_at
         FROM conversations c
         JOIN conversation_members m ON m.conversation_id = c.id
        WHERE m.member_pseudonym_id = ? AND c.deleted_at IS NULL
        ORDER BY c.created_at DESC`,
    )
    .bind(pseudonymId)
    .all<RawConversation & { last_read_at: string }>();
  return results.map((r) => ({ ...toConversation(r), lastReadAt: r.last_read_at }));
}

export async function insertMessage(
  db: D1Database,
  row: {
    id: string;
    conversationId: string;
    senderPseudonymId: string;
    body: string;
    attachment?: {
      key: string;
      name: string;
      type: string;
      size: number;
      expiresAt: string;
    } | null;
  },
): Promise<void> {
  const a = row.attachment ?? null;
  await db
    .prepare(
      `INSERT INTO messages
         (id, conversation_id, sender_pseudonym_id, body,
          attachment_key, attachment_name, attachment_type, attachment_size, attachment_expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      row.id,
      row.conversationId,
      row.senderPseudonymId,
      row.body,
      a?.key ?? null,
      a?.name ?? null,
      a?.type ?? null,
      a?.size ?? null,
      a?.expiresAt ?? null,
    )
    .run();
}

type MessageRawRow = {
  id: string;
  sender_pseudonym_id: string;
  body: string;
  created_at: string;
  attachment_name: string | null;
  attachment_type: string | null;
  attachment_size: number | null;
  attachment_expires_at: string | null;
};

function mapMessage(r: MessageRawRow): MessageRow {
  return {
    id: r.id,
    senderPseudonymId: r.sender_pseudonym_id,
    body: r.body,
    createdAt: r.created_at,
    attachment:
      r.attachment_name && r.attachment_type
        ? {
            name: r.attachment_name,
            type: r.attachment_type,
            size: r.attachment_size ?? 0,
            expiresAt: r.attachment_expires_at,
          }
        : null,
  };
}

// 다운로드용 — 첨부 메타 + R2 키(내부). 멤버십 검사는 호출측.
export async function getMessageAttachment(
  db: D1Database,
  messageId: string,
): Promise<{ conversationId: string; key: string; name: string; type: string } | null> {
  const r = await db
    .prepare(
      `SELECT conversation_id, attachment_key, attachment_name, attachment_type
         FROM messages
        WHERE id = ? AND deleted_at IS NULL AND attachment_key IS NOT NULL`,
    )
    .bind(messageId)
    .first<{
      conversation_id: string;
      attachment_key: string;
      attachment_name: string | null;
      attachment_type: string | null;
    }>();
  if (!r) return null;
  return {
    conversationId: r.conversation_id,
    key: r.attachment_key,
    name: r.attachment_name ?? 'file',
    type: r.attachment_type ?? 'application/octet-stream',
  };
}

// 전체 미읽음 합계(알림용) — 내가 참여한 모든 대화에서 last_read_at 이후 타인 메시지 수.
export async function unreadTotal(db: D1Database, pseudonymId: string): Promise<number> {
  const r = await db
    .prepare(
      `SELECT COUNT(*) AS c
         FROM messages m
         JOIN conversation_members cm
           ON cm.conversation_id = m.conversation_id
          AND cm.member_pseudonym_id = ?
        WHERE m.deleted_at IS NULL
          AND m.created_at > cm.last_read_at
          AND m.sender_pseudonym_id != ?`,
    )
    .bind(pseudonymId, pseudonymId)
    .first<{ c: number }>();
  return r?.c ?? 0;
}

// 만료(7일 경과) 첨부 목록 — cron 정리용.
export async function listExpiredAttachments(
  db: D1Database,
  nowIso: string,
  limit: number,
): Promise<{ id: string; key: string }[]> {
  const { results } = await db
    .prepare(
      `SELECT id, attachment_key
         FROM messages
        WHERE attachment_key IS NOT NULL
          AND attachment_expires_at IS NOT NULL
          AND attachment_expires_at < ?
          AND deleted_at IS NULL
        LIMIT ?`,
    )
    .bind(nowIso, limit)
    .all<{ id: string; attachment_key: string }>();
  return (results ?? []).map((r) => ({ id: r.id, key: r.attachment_key }));
}

// 만료 첨부 정리 — 메시지 soft delete + 키 제거(다운로드 404).
export async function expireAttachment(db: D1Database, messageId: string): Promise<void> {
  await db
    .prepare(
      `UPDATE messages
          SET deleted_at = datetime('now'), attachment_key = NULL
        WHERE id = ?`,
    )
    .bind(messageId)
    .run();
}

// 최신순(DESC) 로 limit 만큼. before(커서) 미만 created_at 만. 표시 시 호출측에서 reverse.
export async function listMessages(
  db: D1Database,
  conversationId: string,
  opts: { limit: number; before: string | null },
): Promise<MessageRow[]> {
  const cols = `id, sender_pseudonym_id, body, created_at,
                attachment_name, attachment_type, attachment_size, attachment_expires_at`;
  const sql = opts.before
    ? `SELECT ${cols}
         FROM messages
        WHERE conversation_id = ? AND deleted_at IS NULL AND created_at < ?
        ORDER BY created_at DESC LIMIT ?`
    : `SELECT ${cols}
         FROM messages
        WHERE conversation_id = ? AND deleted_at IS NULL
        ORDER BY created_at DESC LIMIT ?`;
  const stmt = db.prepare(sql);
  const bound = opts.before
    ? stmt.bind(conversationId, opts.before, opts.limit)
    : stmt.bind(conversationId, opts.limit);
  const { results } = await bound.all<MessageRawRow>();
  return results.map(mapMessage);
}

export async function lastMessage(
  db: D1Database,
  conversationId: string,
): Promise<MessageRow | null> {
  const r = await db
    .prepare(
      `SELECT id, sender_pseudonym_id, body, created_at,
              attachment_name, attachment_type, attachment_size, attachment_expires_at
         FROM messages
        WHERE conversation_id = ? AND deleted_at IS NULL
        ORDER BY created_at DESC LIMIT 1`,
    )
    .bind(conversationId)
    .first<MessageRawRow>();
  return r ? mapMessage(r) : null;
}

export async function unreadCount(
  db: D1Database,
  conversationId: string,
  lastReadAt: string,
  pseudonymId: string,
): Promise<number> {
  const r = await db
    .prepare(
      `SELECT COUNT(*) AS c FROM messages
        WHERE conversation_id = ? AND deleted_at IS NULL
          AND created_at > ? AND sender_pseudonym_id != ?`,
    )
    .bind(conversationId, lastReadAt, pseudonymId)
    .first<{ c: number }>();
  return r?.c ?? 0;
}

export async function markRead(
  db: D1Database,
  conversationId: string,
  pseudonymId: string,
): Promise<void> {
  await db
    .prepare(
      `UPDATE conversation_members SET last_read_at = datetime('now')
        WHERE conversation_id = ? AND member_pseudonym_id = ?`,
    )
    .bind(conversationId, pseudonymId)
    .run();
}

export async function leaveConversation(
  db: D1Database,
  conversationId: string,
  pseudonymId: string,
): Promise<boolean> {
  const res = await db
    .prepare(
      `DELETE FROM conversation_members
        WHERE conversation_id = ? AND member_pseudonym_id = ?`,
    )
    .bind(conversationId, pseudonymId)
    .run();
  return (res.meta?.changes ?? 0) > 0;
}

// 본인이 보낸 메시지 삭제 — 발신자 본인만(sender 일치). soft delete.
export async function softDeleteMessage(
  db: D1Database,
  messageId: string,
  senderPseudonymId: string,
): Promise<boolean> {
  const res = await db
    .prepare(
      `UPDATE messages SET deleted_at = datetime('now')
        WHERE id = ? AND sender_pseudonym_id = ? AND deleted_at IS NULL`,
    )
    .bind(messageId, senderPseudonymId)
    .run();
  return (res.meta?.changes ?? 0) > 0;
}

// 대화방 삭제 — 생성자(owner) 전용. soft delete(모든 참여자 목록에서 사라짐).
export async function deleteConversation(db: D1Database, conversationId: string): Promise<void> {
  await db
    .prepare(`UPDATE conversations SET deleted_at = datetime('now') WHERE id = ?`)
    .bind(conversationId)
    .run();
}
