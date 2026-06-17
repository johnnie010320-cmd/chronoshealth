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

export type MessageRow = {
  id: string;
  senderPseudonymId: string;
  body: string;
  createdAt: string;
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
  row: { id: string; conversationId: string; senderPseudonymId: string; body: string },
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO messages (id, conversation_id, sender_pseudonym_id, body)
       VALUES (?, ?, ?, ?)`,
    )
    .bind(row.id, row.conversationId, row.senderPseudonymId, row.body)
    .run();
}

// 최신순(DESC) 로 limit 만큼. before(커서) 미만 created_at 만. 표시 시 호출측에서 reverse.
export async function listMessages(
  db: D1Database,
  conversationId: string,
  opts: { limit: number; before: string | null },
): Promise<MessageRow[]> {
  const sql = opts.before
    ? `SELECT id, sender_pseudonym_id, body, created_at
         FROM messages
        WHERE conversation_id = ? AND deleted_at IS NULL AND created_at < ?
        ORDER BY created_at DESC LIMIT ?`
    : `SELECT id, sender_pseudonym_id, body, created_at
         FROM messages
        WHERE conversation_id = ? AND deleted_at IS NULL
        ORDER BY created_at DESC LIMIT ?`;
  const stmt = db.prepare(sql);
  const bound = opts.before
    ? stmt.bind(conversationId, opts.before, opts.limit)
    : stmt.bind(conversationId, opts.limit);
  const { results } = await bound.all<{
    id: string;
    sender_pseudonym_id: string;
    body: string;
    created_at: string;
  }>();
  return results.map((r) => ({
    id: r.id,
    senderPseudonymId: r.sender_pseudonym_id,
    body: r.body,
    createdAt: r.created_at,
  }));
}

export async function lastMessage(
  db: D1Database,
  conversationId: string,
): Promise<MessageRow | null> {
  const r = await db
    .prepare(
      `SELECT id, sender_pseudonym_id, body, created_at
         FROM messages
        WHERE conversation_id = ? AND deleted_at IS NULL
        ORDER BY created_at DESC LIMIT 1`,
    )
    .bind(conversationId)
    .first<{ id: string; sender_pseudonym_id: string; body: string; created_at: string }>();
  return r
    ? { id: r.id, senderPseudonymId: r.sender_pseudonym_id, body: r.body, createdAt: r.created_at }
    : null;
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
