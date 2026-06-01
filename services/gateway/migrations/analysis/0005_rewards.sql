-- analysis DB R8 — Reward Coin off-chain ledger (M10 partial)
-- spec: docs/spec/rewards-chro.md (R8 — off-chain) / P5 mainnet에서 $CHRO 1:1 전환 예정.
-- ADR 0003 (PII 격리), 0004 (Polygon), 0008 (D1)
-- purpose_code = 'reward_ledger'.

CREATE TABLE chr_ledger (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_pseudonym_id TEXT NOT NULL,
  txn_id TEXT NOT NULL UNIQUE,
  amount INTEGER NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN (
    'survey_complete',
    'routine_streak_7',
    'community_post',
    'community_comment',
    'community_like_received',
    'spend_coupon',
    'admin_adjust'
  )),
  source_ref TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_chr_user ON chr_ledger(user_pseudonym_id);
CREATE INDEX idx_chr_created ON chr_ledger(created_at);
CREATE INDEX idx_chr_kind ON chr_ledger(kind);

-- append-only — ledger 무결성
CREATE TRIGGER chr_ledger_no_update
  BEFORE UPDATE ON chr_ledger
  BEGIN
    SELECT RAISE(ABORT, 'chr_ledger is append-only');
  END;

CREATE TRIGGER chr_ledger_no_delete
  BEFORE DELETE ON chr_ledger
  BEGIN
    SELECT RAISE(ABORT, 'chr_ledger is append-only');
  END;
