// 관리자 페이지 전용 집계 / 조회 헬퍼.
// ADR 0003 PII 격리 유지 — 분석 DB(D1 `DB`)는 pseudonym만, 이름/이메일은 identity DB에서 별도 조회.

export type AdminStats = {
  totalUsers: number;
  totalBetaSignups: number;
  totalRiskReports: number;
  totalCommunityPosts: number;
  totalCommunityComments: number;
  totalLikes: number;
  totalLedgerEntries: number;
  totalLedgerSum: number;
};

async function scalarCount(db: D1Database, sql: string): Promise<number> {
  const row = await db.prepare(sql).first<{ c: number }>();
  return row?.c ?? 0;
}

export async function readAdminStats(
  identityDb: D1Database,
  analysisDb: D1Database,
): Promise<AdminStats> {
  const [
    totalUsers,
    totalBetaSignups,
    totalRiskReports,
    totalCommunityPosts,
    totalCommunityComments,
    totalLikes,
    totalLedgerEntries,
    ledgerSumRow,
  ] = await Promise.all([
    scalarCount(identityDb, 'SELECT COUNT(*) AS c FROM users'),
    scalarCount(analysisDb, 'SELECT COUNT(*) AS c FROM beta_signups'),
    scalarCount(analysisDb, 'SELECT COUNT(*) AS c FROM risk_survey_reports'),
    scalarCount(
      analysisDb,
      'SELECT COUNT(*) AS c FROM community_posts WHERE deleted_at IS NULL',
    ),
    scalarCount(
      analysisDb,
      'SELECT COUNT(*) AS c FROM community_comments WHERE deleted_at IS NULL',
    ),
    scalarCount(analysisDb, 'SELECT COUNT(*) AS c FROM community_likes'),
    scalarCount(analysisDb, 'SELECT COUNT(*) AS c FROM chr_ledger'),
    analysisDb
      .prepare('SELECT COALESCE(SUM(amount), 0) AS c FROM chr_ledger')
      .first<{ c: number }>(),
  ]);

  return {
    totalUsers,
    totalBetaSignups,
    totalRiskReports,
    totalCommunityPosts,
    totalCommunityComments,
    totalLikes,
    totalLedgerEntries,
    totalLedgerSum: ledgerSumRow?.c ?? 0,
  };
}

export type AdminRole = 'user' | 'partner' | 'admin';

export type AdminUserRow = {
  userPseudonymId: string;
  // ADR 0003 — admin 전용 라우트(adminMiddleware)에서만 노출. 항상 평문(2026-06-17 죠니 승인).
  // 정보가 없으면 null — UI 는 항목을 항상 표시(빈 값은 '—').
  name: string | null;
  nickname: string | null;
  email: string;
  phone: string | null;
  role: AdminRole;
  isSuperAdmin: boolean;
  createdAt: string;
  reportCount: number;
  ledgerBalance: number;
};

export async function listAdminUsers(
  identityDb: D1Database,
  analysisDb: D1Database,
  opts: { limit: number; cursor: string | null; search: string | null },
): Promise<AdminUserRow[]> {
  let sql =
    'SELECT user_pseudonym_id, name, nickname, email, phone, role, is_super_admin, created_at FROM users WHERE 1=1';
  const args: unknown[] = [];
  if (opts.cursor) {
    sql += ' AND created_at < ?';
    args.push(opts.cursor);
  }
  if (opts.search) {
    sql += ' AND (user_pseudonym_id LIKE ? OR email LIKE ? OR nickname LIKE ? OR name LIKE ?)';
    args.push(`%${opts.search}%`, `%${opts.search}%`, `%${opts.search}%`, `%${opts.search}%`);
  }
  sql += ' ORDER BY created_at DESC LIMIT ?';
  args.push(opts.limit);

  const result = await identityDb
    .prepare(sql)
    .bind(...args)
    .all<{
      user_pseudonym_id: string;
      name: string | null;
      nickname: string | null;
      email: string;
      phone: string | null;
      role: string;
      is_super_admin: number;
      created_at: string;
    }>();

  const rows = result.results ?? [];
  if (rows.length === 0) return [];

  const reportCounts = new Map<string, number>();
  const ledgerSums = new Map<string, number>();

  await Promise.all(
    rows.map(async (row) => {
      const [reportRow, ledgerRow] = await Promise.all([
        analysisDb
          .prepare(
            'SELECT COUNT(*) AS c FROM risk_survey_reports WHERE user_pseudonym_id = ?',
          )
          .bind(row.user_pseudonym_id)
          .first<{ c: number }>(),
        analysisDb
          .prepare(
            'SELECT COALESCE(SUM(amount), 0) AS c FROM chr_ledger WHERE user_pseudonym_id = ?',
          )
          .bind(row.user_pseudonym_id)
          .first<{ c: number }>(),
      ]);
      reportCounts.set(row.user_pseudonym_id, reportRow?.c ?? 0);
      ledgerSums.set(row.user_pseudonym_id, ledgerRow?.c ?? 0);
    }),
  );

  return rows.map((row) => ({
    userPseudonymId: row.user_pseudonym_id,
    name: row.name,
    nickname: row.nickname,
    email: row.email,
    phone: row.phone,
    role: (row.role === 'admin' || row.role === 'partner' ? row.role : 'user') as AdminRole,
    isSuperAdmin: row.is_super_admin === 1,
    createdAt: row.created_at,
    reportCount: reportCounts.get(row.user_pseudonym_id) ?? 0,
    ledgerBalance: ledgerSums.get(row.user_pseudonym_id) ?? 0,
  }));
}

// superadmin 전용 — 일반↔관리자 임명/해제. superadmin 행은 변경 거부.
export async function setUserRole(
  identityDb: D1Database,
  pseudonymId: string,
  role: AdminRole,
): Promise<boolean> {
  const res = await identityDb
    .prepare(
      'UPDATE users SET role = ? WHERE user_pseudonym_id = ? AND is_super_admin = 0',
    )
    .bind(role, pseudonymId)
    .run();
  return (res.meta?.changes ?? 0) > 0;
}

export type AdminLedgerEntry = {
  txnId: string;
  amount: number;
  kind: string;
  sourceRef: string | null;
  createdAt: string;
};

// 회원별 코인(CHRO) 적립/사용 내역 — 관리자 조회.
export async function readUserLedger(
  analysisDb: D1Database,
  pseudonymId: string,
  limit: number,
): Promise<AdminLedgerEntry[]> {
  const { results } = await analysisDb
    .prepare(
      `SELECT txn_id, amount, kind, source_ref, created_at FROM chr_ledger
        WHERE user_pseudonym_id = ? ORDER BY created_at DESC LIMIT ?`,
    )
    .bind(pseudonymId, limit)
    .all<{ txn_id: string; amount: number; kind: string; source_ref: string | null; created_at: string }>();
  return (results ?? []).map((r) => ({
    txnId: r.txn_id,
    amount: r.amount,
    kind: r.kind,
    sourceRef: r.source_ref,
    createdAt: r.created_at,
  }));
}

export type AdminUserDetail = {
  userPseudonymId: string;
  createdAt: string;
  // PII — unmask=true 일 때만 채워짐.
  name: string | null;
  emailMasked: string | null;
  phoneMasked: string | null;
};

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return '***';
  const head = local.slice(0, 2);
  return `${head}***@${domain}`;
}

function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return '***';
  return `***-****-${digits.slice(-4)}`;
}

export async function readAdminUserDetail(
  identityDb: D1Database,
  pseudonymId: string,
  unmask: boolean,
): Promise<AdminUserDetail | null> {
  const row = await identityDb
    .prepare(
      'SELECT user_pseudonym_id, created_at, name, email, phone FROM users WHERE user_pseudonym_id = ? LIMIT 1',
    )
    .bind(pseudonymId)
    .first<{
      user_pseudonym_id: string;
      created_at: string;
      name: string;
      email: string;
      phone: string;
    }>();
  if (!row) return null;

  if (!unmask) {
    return {
      userPseudonymId: row.user_pseudonym_id,
      createdAt: row.created_at,
      name: null,
      emailMasked: maskEmail(row.email),
      phoneMasked: maskPhone(row.phone),
    };
  }
  return {
    userPseudonymId: row.user_pseudonym_id,
    createdAt: row.created_at,
    name: row.name,
    emailMasked: row.email,
    phoneMasked: row.phone,
  };
}

export type AdminBetaSignupRow = {
  id: string;
  emailPseudonym: string;
  country: string;
  ageGroup: string;
  interestedModules: string;
  locale: string;
  createdAt: string;
};

export async function listAdminBetaSignups(
  analysisDb: D1Database,
  opts: { limit: number; cursor: string | null },
): Promise<AdminBetaSignupRow[]> {
  let sql =
    'SELECT id, email_pseudonym, country, age_group, interested_modules, locale, created_at FROM beta_signups WHERE 1=1';
  const args: unknown[] = [];
  if (opts.cursor) {
    sql += ' AND created_at < ?';
    args.push(opts.cursor);
  }
  sql += ' ORDER BY created_at DESC LIMIT ?';
  args.push(opts.limit);

  const result = await analysisDb
    .prepare(sql)
    .bind(...args)
    .all<{
      id: string;
      email_pseudonym: string;
      country: string;
      age_group: string;
      interested_modules: string;
      locale: string;
      created_at: string;
    }>();

  return (result.results ?? []).map((row) => ({
    id: row.id,
    emailPseudonym: row.email_pseudonym,
    country: row.country,
    ageGroup: row.age_group,
    interestedModules: row.interested_modules,
    locale: row.locale,
    createdAt: row.created_at,
  }));
}
