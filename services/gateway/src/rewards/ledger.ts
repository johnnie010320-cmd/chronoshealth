export type LedgerKind =
  | 'survey_complete'
  | 'routine_daily'
  | 'routine_streak_7'
  | 'community_post'
  | 'community_comment'
  | 'community_like_received'
  | 'onboarding_data1'
  | 'onboarding_data2'
  | 'onboarding_data3'
  | 'community_trending'
  | 'spend_coupon'
  | 'admin_adjust';

export type LedgerEntry = {
  txnId: string;
  amount: number;
  kind: LedgerKind;
  sourceRef: string | null;
  createdAt: string;
};

// 적립 룰 (P1 시범 운영, P5 mainnet 진입 시 $CHRO 1:1 전환).
export const EARN_AMOUNTS: Record<Exclude<LedgerKind, 'spend_coupon' | 'admin_adjust'>, number> = {
  survey_complete: 5,
  // 오늘의 루틴 기록(입력·저장) 시 하루 1회 적립.
  routine_daily: 2,
  routine_streak_7: 50,
  community_post: 10,
  community_comment: 2,
  community_like_received: 1,
  // 스토리보드 p11/p13/p19/p32 — 단계별 Data 입력 보상 (각 200 coin).
  onboarding_data1: 200,
  onboarding_data2: 200,
  onboarding_data3: 200,
  // 스토리보드 p32 — 인기글(트렌딩 진입) 1회 보상.
  community_trending: 500,
};

export async function appendLedger(
  db: D1Database,
  userPseudonymId: string,
  entry: { kind: LedgerKind; amount: number; sourceRef?: string | null; txnId?: string },
): Promise<{ txnId: string }> {
  const txnId = entry.txnId ?? crypto.randomUUID();
  try {
    await db
      .prepare(
        `INSERT INTO chr_ledger (user_pseudonym_id, txn_id, amount, kind, source_ref)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .bind(userPseudonymId, txnId, entry.amount, entry.kind, entry.sourceRef ?? null)
      .run();
  } catch (err) {
    // UNIQUE conflict on txn_id → idempotent; return existing id.
    const msg = err instanceof Error ? err.message : '';
    if (!msg.includes('UNIQUE')) throw err;
  }
  return { txnId };
}

export async function readBalance(
  db: D1Database,
  userPseudonymId: string,
): Promise<number> {
  const row = await db
    .prepare(
      `SELECT COALESCE(SUM(amount), 0) AS balance
         FROM chr_ledger
        WHERE user_pseudonym_id = ?`,
    )
    .bind(userPseudonymId)
    .first<{ balance: number }>();
  return row?.balance ?? 0;
}

export async function readHistory(
  db: D1Database,
  userPseudonymId: string,
  limit = 50,
): Promise<LedgerEntry[]> {
  const result = await db
    .prepare(
      `SELECT txn_id, amount, kind, source_ref, created_at
         FROM chr_ledger
        WHERE user_pseudonym_id = ?
        ORDER BY created_at DESC
        LIMIT ?`,
    )
    .bind(userPseudonymId, limit)
    .all<{
      txn_id: string;
      amount: number;
      kind: LedgerKind;
      source_ref: string | null;
      created_at: string;
    }>();
  return (result.results ?? []).map((row) => ({
    txnId: row.txn_id,
    amount: row.amount,
    kind: row.kind,
    sourceRef: row.source_ref,
    createdAt: row.created_at,
  }));
}

export async function hasEarnedFor(
  db: D1Database,
  userPseudonymId: string,
  kind: LedgerKind,
  sourceRef: string,
): Promise<boolean> {
  const row = await db
    .prepare(
      `SELECT 1 FROM chr_ledger
        WHERE user_pseudonym_id = ?
          AND kind = ?
          AND source_ref = ?
        LIMIT 1`,
    )
    .bind(userPseudonymId, kind, sourceRef)
    .first<{ '1': number }>();
  return row !== null;
}
