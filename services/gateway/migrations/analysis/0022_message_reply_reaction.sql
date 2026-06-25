-- analysis DB R9 — 메시지 답장(reply) + 이모티콘 반응(reaction). 카카오톡식 인터랙션.
-- spec: 2026-06-25 죠니 요청 (1:1·대화방 메시지 우클릭/롱프레스 → 답장·반응).
-- reply_to_message_id: 답장 대상 메시지 id(같은 대화 내). 표시는 인용 미리보기.
-- message_reactions: (메시지, 사용자, 이모지) 유니크. 같은 이모지 토글(추가/제거).

ALTER TABLE messages ADD COLUMN reply_to_message_id TEXT;
CREATE INDEX idx_msg_reply_to ON messages(reply_to_message_id);

CREATE TABLE message_reactions (
  message_id TEXT NOT NULL,
  conversation_id TEXT NOT NULL,
  user_pseudonym_id TEXT NOT NULL,
  emoji TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (message_id, user_pseudonym_id, emoji),
  FOREIGN KEY (message_id) REFERENCES messages(id)
);
CREATE INDEX idx_reaction_msg ON message_reactions(message_id);
CREATE INDEX idx_reaction_conv ON message_reactions(conversation_id);
