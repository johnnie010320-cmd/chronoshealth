-- analysis DB R9 — 회원간 1:1 다이렉트 메시지(DM) + 다인원 대화방.
-- spec: docs/spec/messaging.md (R9), ADR 0015 (메시징 모델·폴링·닉네임 공개 핸들).
-- ADR 0003 (PII 격리), 0008 (D1).
-- 모든 식별자는 pseudonym_id 만 보유. 이메일·이름 등 PII 0.
-- 발신자 표시명(twin 닉네임)은 게이트웨이가 IDENTITY_DB 에서 조회해 응답에만 포함(ADR 0015).

-- 1) conversations — DM(2인) 또는 대화방(다인원) 공통.
--    kind='dm' 인 경우 id 는 두 pseudonym 을 정렬해 조합한 결정적 키('dm_<a>_<b>') → 중복 생성 방지.
--    kind='room' 인 경우 id 는 UUID, title/owner 보유.
CREATE TABLE conversations (
  id TEXT PRIMARY KEY NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('dm','room')),
  title TEXT,
  owner_pseudonym_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT
);

CREATE INDEX idx_conv_owner ON conversations(owner_pseudonym_id);

-- 2) conversation_members — 참여자. last_read_at 으로 미읽음 계산.
CREATE TABLE conversation_members (
  conversation_id TEXT NOT NULL,
  member_pseudonym_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner','member')),
  joined_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_read_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (conversation_id, member_pseudonym_id),
  FOREIGN KEY (conversation_id) REFERENCES conversations(id)
);

CREATE INDEX idx_cm_member ON conversation_members(member_pseudonym_id);

-- 3) messages — 대화 메시지(텍스트). soft delete 미적용(MVP), deleted_at 예약.
CREATE TABLE messages (
  id TEXT PRIMARY KEY NOT NULL,
  conversation_id TEXT NOT NULL,
  sender_pseudonym_id TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id)
);

CREATE INDEX idx_msg_conv_created ON messages(conversation_id, created_at);
