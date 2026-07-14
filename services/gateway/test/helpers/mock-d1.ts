// In-memory D1 mock — vitest용. 정공법은 @cloudflare/vitest-pool-workers (miniflare D1)이지만
// 의존성 최소화를 위해 SQL 패턴 매칭 방식 채택. SQL 패턴이 변하면 본 mock 갱신 필요.

type UserRow = {
  user_pseudonym_id: string;
  name: string | null;
  email: string;
  phone: string | null;
  birth_year: number | null;
  sex: 'male' | 'female' | 'other' | null;
  created_at?: string;
  nationality?: string | null;
  password_hash?: string | null;
  password_salt?: string | null;
  password_algo?: string | null;
  consent_terms_version?: string | null;
  consent_privacy_version?: string | null;
  consent_recorded_at?: string | null;
  nickname?: string | null;
  marketing_opt_in?: number;
  role?: string;
  is_super_admin?: number;
};

type ContentPageRow = {
  slug: string;
  locale: string;
  title: string;
  body_md: string;
  version: string;
  updated_by_pseudonym_id: string;
  updated_at: string;
};

type SessionRow = {
  token: string;
  user_pseudonym_id: string;
  issued_at: string;
  expires_at: string;
  revoked_at: string | null;
};

type ConsentRow = {
  user_pseudonym_id: string;
  consent_kind: string;
  granted: number;
  source: string;
  recorded_at: string;
};

type BetaIdentityRow = {
  id: string;
  email: string;
  ip_hash: string;
  user_agent: string | null;
  consent_pii: 1;
  consent_medical_disclaimer: 1;
  consent_token_review: 1;
  created_at: string;
};

export type MockD1State = {
  users: UserRow[];
  tokens: SessionRow[];
  consents: ConsentRow[];
  betaIdentity: BetaIdentityRow[];
};

export function makeMockIdentityDb(initial?: Partial<MockD1State>): {
  db: D1Database;
  state: MockD1State;
} {
  const state: MockD1State = {
    users: initial?.users ?? [],
    tokens: initial?.tokens ?? [],
    consents: initial?.consents ?? [],
    betaIdentity: initial?.betaIdentity ?? [],
  };

  function runStmt(sql: string, args: unknown[]): {
    success: true;
    meta?: { changes?: number };
  } {
    const trimmed = sql.trim();

    if (trimmed.startsWith('INSERT INTO users')) {
      // ADR 0013 + 0006 — Step 1 가입 9 컬럼 (email + password 3 + consent 3 + pseudonym + marketing).
      const [
        user_pseudonym_id, email,
        password_hash, password_salt, password_algo,
        consent_terms_version, consent_privacy_version, consent_recorded_at,
        marketing_opt_in,
      ] = args as [
        string, string,
        string | null, string | null, string | null,
        string | null, string | null, string | null,
        number,
      ];
      if (state.users.some((u) => u.email === email)) {
        throw new Error('UNIQUE constraint failed: users.email');
      }
      state.users.push({
        user_pseudonym_id,
        name: null,
        email,
        phone: null,
        birth_year: null,
        sex: null,
        created_at: new Date().toISOString(),
        nationality: null,
        password_hash,
        password_salt,
        password_algo,
        marketing_opt_in: marketing_opt_in ?? 0,
        nickname: null,
        consent_terms_version,
        consent_privacy_version,
        consent_recorded_at,
      });
      return { success: true };
    }

    if (trimmed.startsWith('UPDATE users SET role = ?')) {
      const [role, user_pseudonym_id] = args as [string, string];
      const user = state.users.find((u) => u.user_pseudonym_id === user_pseudonym_id);
      // is_super_admin = 0 인 경우에만 변경 (superadmin 보호).
      if (!user || (user.is_super_admin ?? 0) === 1) {
        return { success: true, meta: { changes: 0 } };
      }
      user.role = role;
      return { success: true, meta: { changes: 1 } };
    }

    if (trimmed.startsWith('UPDATE users SET password_hash')) {
      const [password_hash, password_salt, password_algo, user_pseudonym_id] = args as [
        string, string, string, string,
      ];
      const user = state.users.find((u) => u.user_pseudonym_id === user_pseudonym_id);
      if (user) {
        user.password_hash = password_hash;
        user.password_salt = password_salt;
        user.password_algo = password_algo;
      }
      return { success: true };
    }

    if (trimmed.startsWith('UPDATE users SET') && trimmed.includes('name = ?, phone = ?')) {
      const [name, phone, birth_year, sex, nationality, user_pseudonym_id] = args as [
        string, string, number, UserRow['sex'], string, string,
      ];
      // 전화 UNIQUE 확인
      if (state.users.some((u) => u.user_pseudonym_id !== user_pseudonym_id && u.phone === phone)) {
        throw new Error('UNIQUE constraint failed: users.phone');
      }
      const user = state.users.find((u) => u.user_pseudonym_id === user_pseudonym_id);
      if (user) {
        user.name = name;
        user.phone = phone;
        user.birth_year = birth_year;
        user.sex = sex;
        user.nationality = nationality;
      }
      return { success: true };
    }

    if (trimmed.startsWith('INSERT INTO session_tokens')) {
      const [token, user_pseudonym_id, expires_at] = args as [string, string, string];
      state.tokens.push({
        token,
        user_pseudonym_id,
        issued_at: new Date().toISOString(),
        expires_at,
        revoked_at: null,
      });
      return { success: true };
    }

    if (trimmed.startsWith('UPDATE session_tokens SET revoked_at')) {
      const [revoked_at, token] = args as [string, string];
      const t = state.tokens.find((x) => x.token === token);
      if (t) t.revoked_at = revoked_at;
      return { success: true };
    }

    if (trimmed.startsWith('INSERT INTO consent_log')) {
      // signup.ts는 kind/granted/source를 SQL 리터럴로 인라인 — pseudonym만 바인딩.
      const [user_pseudonym_id] = args as [string];
      const kindMatch = sql.match(/'(medical|terms|research)'/);
      state.consents.push({
        user_pseudonym_id,
        consent_kind: kindMatch?.[1] ?? 'unknown',
        granted: 1,
        source: 'signup',
        recorded_at: new Date().toISOString(),
      });
      return { success: true };
    }

    if (trimmed.startsWith('INSERT INTO beta_signup_identity')) {
      const [id, email, ip_hash, user_agent] = args as [
        string,
        string,
        string,
        string | null,
      ];
      if (state.betaIdentity.some((r) => r.email === email)) {
        throw new Error('UNIQUE constraint failed: beta_signup_identity.email');
      }
      state.betaIdentity.push({
        id,
        email,
        ip_hash,
        user_agent,
        consent_pii: 1,
        consent_medical_disclaimer: 1,
        consent_token_review: 1,
        created_at: new Date().toISOString(),
      });
      return { success: true };
    }

    if (trimmed.startsWith('DELETE FROM beta_signup_identity WHERE id = ?')) {
      const [id] = args as [string];
      const idx = state.betaIdentity.findIndex((r) => r.id === id);
      if (idx >= 0) state.betaIdentity.splice(idx, 1);
      return { success: true };
    }

    throw new Error(`mock-d1 unknown statement: ${trimmed.substring(0, 80)}`);
  }

  function firstStmt(sql: string, args: unknown[]): unknown {
    const trimmed = sql.trim();

    // 권한 — role/is_super_admin 조회 (generic user_pseudonym_id 핸들러보다 먼저).
    if (trimmed.startsWith('SELECT email, role, is_super_admin FROM users')) {
      const [pseudo] = args as [string];
      const u = state.users.find((x) => x.user_pseudonym_id === pseudo);
      return u
        ? {
            email: u.email,
            role: (u as { role?: string }).role ?? 'user',
            is_super_admin: (u as { is_super_admin?: number }).is_super_admin ?? 0,
          }
        : null;
    }
    // R9 메시징 — 닉네임↔pseudonym 해석 (generic user_pseudonym_id 핸들러보다 먼저).
    if (trimmed.startsWith('SELECT user_pseudonym_id FROM users WHERE nickname')) {
      const [nickname] = args as [string];
      const u = state.users.find((x) => x.nickname === nickname);
      return u ? { user_pseudonym_id: u.user_pseudonym_id } : null;
    }
    if (trimmed.startsWith('SELECT nickname FROM users WHERE user_pseudonym_id')) {
      const [pseudo] = args as [string];
      const u = state.users.find((x) => x.user_pseudonym_id === pseudo);
      return u ? { nickname: u.nickname ?? null } : null;
    }

    if (trimmed.includes('FROM users WHERE email = ? OR phone = ?')) {
      const [email, phone] = args as [string, string];
      const hit = state.users.find((u) => u.email === email || u.phone === phone);
      return hit ? { '1': 1 } : null;
    }

    if (trimmed.includes('FROM users WHERE phone = ? AND user_pseudonym_id != ?')) {
      const [phone, pseudo] = args as [string, string];
      const hit = state.users.find(
        (u) => u.phone === phone && u.user_pseudonym_id !== pseudo,
      );
      return hit ? { '1': 1 } : null;
    }

    if (
      (trimmed.startsWith('SELECT 1 FROM users WHERE lower(email) = ?') ||
        trimmed.startsWith('SELECT 1 FROM users WHERE email = ?')) &&
      !trimmed.includes('OR phone')
    ) {
      const [email] = args as [string];
      const needle = String(email).toLowerCase();
      const hit = state.users.find((u) => u.email.toLowerCase() === needle);
      return hit ? { '1': 1 } : null;
    }

    if (trimmed.includes('FROM session_tokens WHERE token = ?')) {
      const [token] = args as [string];
      const t = state.tokens.find((x) => x.token === token);
      if (!t) return null;
      return {
        user_pseudonym_id: t.user_pseudonym_id,
        expires_at: t.expires_at,
        revoked_at: t.revoked_at,
      };
    }

    if (trimmed.startsWith('SELECT email FROM users WHERE user_pseudonym_id = ?')) {
      const [pseudo] = args as [string];
      const u = state.users.find((x) => x.user_pseudonym_id === pseudo);
      return u ? { email: u.email } : null;
    }

    if (
      (trimmed.includes('FROM users WHERE lower(email) = ?') ||
        trimmed.includes('FROM users WHERE email = ?')) &&
      trimmed.includes('password_hash')
    ) {
      const [email] = args as [string];
      const needle = String(email).toLowerCase();
      const u = state.users.find((x) => x.email.toLowerCase() === needle);
      if (!u) return null;
      if (trimmed.includes('phone, password_hash')) {
        return {
          user_pseudonym_id: u.user_pseudonym_id,
          phone: u.phone,
          password_hash: u.password_hash ?? null,
        };
      }
      return {
        user_pseudonym_id: u.user_pseudonym_id,
        password_hash: u.password_hash ?? null,
        password_salt: u.password_salt ?? null,
        password_algo: u.password_algo ?? null,
      };
    }

    if (
      trimmed.includes('FROM users WHERE user_pseudonym_id = ?') &&
      trimmed.includes('nationality') &&
      trimmed.includes('consent_terms_version')
    ) {
      const [pseudo] = args as [string];
      const u = state.users.find((x) => x.user_pseudonym_id === pseudo);
      return u
        ? {
            user_pseudonym_id: u.user_pseudonym_id,
            name: u.name,
            nickname: (u as { nickname?: string | null }).nickname ?? null,
            email: u.email,
            phone: u.phone,
            birth_year: u.birth_year,
            sex: u.sex,
            nationality: u.nationality ?? null,
            created_at: u.created_at ?? new Date().toISOString(),
            consent_terms_version: u.consent_terms_version ?? null,
            consent_privacy_version: u.consent_privacy_version ?? null,
            consent_recorded_at: u.consent_recorded_at ?? null,
            marketing_opt_in: (u as { marketing_opt_in?: number }).marketing_opt_in ?? 0,
            role: (u as { role?: string }).role ?? 'user',
          }
        : null;
    }

    if (trimmed.includes('FROM users WHERE user_pseudonym_id = ?') && trimmed.includes('name, email, phone')) {
      const [pseudo] = args as [string];
      const u = state.users.find((x) => x.user_pseudonym_id === pseudo);
      return u
        ? {
            user_pseudonym_id: u.user_pseudonym_id,
            created_at: new Date().toISOString(),
            name: u.name,
            email: u.email,
            phone: u.phone,
          }
        : null;
    }

    if (trimmed.includes('FROM users WHERE user_pseudonym_id = ?')) {
      const [pseudo] = args as [string];
      const u = state.users.find((x) => x.user_pseudonym_id === pseudo);
      return u ? { name: u.name } : null;
    }

    if (trimmed.includes('FROM user_avatars WHERE user_pseudonym_id')) {
      // tests 에서는 아바타 없음.
      return null;
    }
    if (trimmed.includes('FROM users WHERE phone =') || trimmed.includes('FROM users WHERE nickname =')) {
      // PUT /profile 의 중복 체크 — 빈 결과 반환 (테스트가 phone/nickname 충돌을 의도하지 않으면).
      return null;
    }
    if (trimmed.startsWith('SELECT nickname FROM users')) {
      const [pseudo] = args as [string];
      const u = state.users.find((x) => x.user_pseudonym_id === pseudo);
      return u ? { nickname: u.nickname ?? null } : null;
    }

    if (trimmed.startsWith('SELECT COUNT(*) AS c FROM users')) {
      return { c: state.users.length };
    }

    throw new Error(`mock-d1 unknown first(): ${trimmed.substring(0, 80)}`);
  }

  function allStmt(sql: string, args: unknown[]): { results: unknown[] } {
    const trimmed = sql.trim();
    if (trimmed.startsWith('SELECT nickname FROM users') && trimmed.includes('nickname LIKE ?')) {
      const [pattern, excludeId, limit] = args as [string, string, number];
      const prefix = pattern.replace(/%$/, '');
      const rows = state.users
        .filter(
          (u) =>
            u.nickname != null &&
            u.nickname.startsWith(prefix) &&
            u.user_pseudonym_id !== excludeId,
        )
        .sort((a, b) => ((a.nickname ?? '') > (b.nickname ?? '') ? 1 : -1))
        .slice(0, limit)
        .map((u) => ({ nickname: u.nickname }));
      return { results: rows };
    }
    if (
      trimmed.startsWith('SELECT user_pseudonym_id, name, nickname, email, phone, role, is_super_admin, created_at FROM users') &&
      trimmed.includes('ORDER BY created_at DESC')
    ) {
      const limit = args[args.length - 1] as number;
      let pool = [...state.users];
      let argIdx = 0;
      if (trimmed.includes('AND created_at < ?')) {
        const cursor = args[argIdx++] as string;
        pool = pool.filter((u) => (u.created_at ?? '') < cursor);
      }
      if (trimmed.includes('user_pseudonym_id LIKE ?')) {
        const needle = (args[argIdx++] as string).replace(/^%|%$/g, '');
        argIdx += 3; // skip email/nickname/name bindings
        pool = pool.filter(
          (u) =>
            u.user_pseudonym_id.includes(needle) ||
            u.email.includes(needle) ||
            (u.nickname ?? '').includes(needle) ||
            (u.name ?? '').includes(needle),
        );
      }
      const rows = pool
        .sort((a, b) => ((a.created_at ?? '') > (b.created_at ?? '') ? -1 : 1))
        .slice(0, limit)
        .map((u) => ({
          user_pseudonym_id: u.user_pseudonym_id,
          name: u.name,
          nickname: u.nickname ?? null,
          email: u.email,
          phone: u.phone,
          role: (u as { role?: string }).role ?? 'user',
          is_super_admin: (u as { is_super_admin?: number }).is_super_admin ?? 0,
          created_at: u.created_at ?? new Date().toISOString(),
        }));
      return { results: rows };
    }
    throw new Error(`mock-identity-d1 all() unknown: ${trimmed.substring(0, 80)}`);
  }

  const makeStmt = (sql: string) => {
    const stmt = {
      _args: [] as unknown[],
      bind(...args: unknown[]) {
        stmt._args = args;
        return stmt;
      },
      async first<T>(): Promise<T | null> {
        return firstStmt(sql, stmt._args) as T | null;
      },
      async all<T>(): Promise<{ results: T[] }> {
        return allStmt(sql, stmt._args) as { results: T[] };
      },
      async run() {
        return runStmt(sql, stmt._args);
      },
    };
    return stmt;
  };

  const db = {
    prepare(sql: string) {
      return makeStmt(sql);
    },
    async batch(stmts: Array<{ run: () => Promise<unknown> }>) {
      const snapshot: MockD1State = {
        users: [...state.users],
        tokens: [...state.tokens],
        consents: [...state.consents],
        betaIdentity: [...state.betaIdentity],
      };
      try {
        const results = [];
        for (const s of stmts) {
          results.push(await s.run());
        }
        return results;
      } catch (e) {
        state.users = snapshot.users;
        state.tokens = snapshot.tokens;
        state.consents = snapshot.consents;
        state.betaIdentity = snapshot.betaIdentity;
        throw e;
      }
    },
    exec() {
      throw new Error('mock-d1 exec() not implemented');
    },
    dump() {
      throw new Error('mock-d1 dump() not implemented');
    },
    withSession() {
      return db;
    },
  } as unknown as D1Database;

  return { db, state };
}

// Test 토큰 발급 헬퍼 — mock DB에 직접 INSERT.
export function issueTestToken(
  state: MockD1State,
  opts?: { pseudonym?: string; token?: string; expiresInMs?: number },
): { token: string; pseudonym: string } {
  const pseudonym = opts?.pseudonym ?? crypto.randomUUID();
  const token = opts?.token ?? `test-token-${crypto.randomUUID()}`;
  state.tokens.push({
    token,
    user_pseudonym_id: pseudonym,
    issued_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + (opts?.expiresInMs ?? 30 * 24 * 60 * 60 * 1000)).toISOString(),
    revoked_at: null,
  });
  return { token, pseudonym };
}

// ─────────────────────────────────────────────────────────────────────────
// analysis DB mock (chronoshealth-analysis 바인딩 DB)
// spec docs/spec/risk-survey/05-storage-consent.md

type ResponseRow = {
  id: number;
  user_pseudonym_id: string;
  purpose_code: string;
  // 나머지 필드는 raw로 보관 (검증용 inspect만)
  raw: Record<string, unknown>;
};

type ReportRow = {
  report_id: string;
  response_id: number;
  user_pseudonym_id: string;
  purpose_code: string;
  model_version: string;
  payload: string;
  generated_at: string;
};

type AnalysisConsentRow = {
  user_pseudonym_id: string;
  purpose_code: string;
  consent_kind: 'store' | 'research';
  granted: number;
  source: string;
  recorded_at: string;
};

type BetaSignupRow = {
  id: string;
  email_pseudonym: string;
  country: string;
  age_group: string;
  interested_modules: string;
  locale: string;
  created_at: string;
};

type RoutineRow = {
  user_pseudonym_id: string;
  entry_date: string;
  calories_kcal: number | null;
  exercise_minutes: number | null;
  exercise_intensity?: string | null;
  sleep_hours: number | null;
  note: string | null;
  updated_at: string;
};

type CommunityPostRow = {
  id: string;
  community_id: string;
  user_pseudonym_id: string;
  title: string;
  body: string;
  video_url: string | null;
  sns_url: string | null;
  video_urls: string | null;
  sns_urls: string | null;
  image_data: string | null;
  image_mime: string | null;
  image_position: string;
  body_rich: string | null;
  created_at: string;
  deleted_at: string | null;
  allow_likes: number;
  allow_comments: number;
};

type CommunityRow = {
  id: string;
  owner_pseudonym_id: string;
  name: string;
  description: string;
  visibility: string;
  allow_likes_default: number;
  allow_comments_default: number;
  created_at: string;
  deleted_at: string | null;
};

type CommunityFollowerRow = {
  community_id: string;
  follower_pseudonym_id: string;
  status: string;
  created_at: string;
};

type CommunityAdminMockRow = {
  community_id: string;
  admin_pseudonym_id: string;
  created_at: string;
};

type CommunityCommentRow = {
  id: string;
  post_id: string;
  user_pseudonym_id: string;
  body: string;
  accepts_dm: number;
  created_at: string;
  deleted_at: string | null;
};

type CommunityLikeRow = {
  user_pseudonym_id: string;
  post_id: string;
  created_at: string;
};

type LedgerRow = {
  id: number;
  user_pseudonym_id: string;
  txn_id: string;
  amount: number;
  kind: string;
  source_ref: string | null;
  created_at: string;
};

type ConversationMockRow = {
  id: string;
  kind: string;
  title: string | null;
  owner_pseudonym_id: string | null;
  created_at: string;
  deleted_at: string | null;
};

type ConversationMemberMockRow = {
  conversation_id: string;
  member_pseudonym_id: string;
  role: string;
  joined_at: string;
  last_read_at: string;
};

type MessageMockRow = {
  id: string;
  conversation_id: string;
  sender_pseudonym_id: string;
  body: string;
  created_at: string;
  deleted_at: string | null;
  reply_to_message_id: string | null;
  attachment_key: string | null;
  attachment_name: string | null;
  attachment_type: string | null;
  attachment_size: number | null;
  attachment_expires_at: string | null;
};

type ReactionMockRow = {
  message_id: string;
  conversation_id: string;
  user_pseudonym_id: string;
  emoji: string;
};

type NoticeMockRow = {
  id: string;
  title: string;
  body: string;
  pinned: number;
  published: number;
  created_by_pseudonym_id: string;
  created_at: string;
  updated_at: string;
};

type ReleaseMockRow = {
  id: string;
  component: string;
  version: string;
  notes: string;
  created_by_pseudonym_id: string;
  created_at: string;
};

// migration 0037 — 케어 제휴 카드 (코드 SEED → D1 이관).
type CareAffiliateMockRow = {
  slug: string;
  category: string;
  partner: string;
  cta_url: string;
  coming_soon: number;
  sort_order: number;
  active: number;
  i18n_json: string;
  updated_at: string;
  updated_by_pseudonym_id: string | null;
};

// migration 0036 — 리더보드 실측 ECDF 표본 (사용자당 1행).
type VitalitySnapshotMockRow = {
  user_pseudonym_id: string;
  vitality_score: number;
  age_band: string;
  sex: string;
  updated_at: string;
};

// 2nd Data — 의료 이력 조건 (사용자×카테고리×코드, granted 토글).
type MedicalConditionMockRow = {
  user_pseudonym_id: string;
  code: string;
  category: string;
  granted: number;
  updated_at: string;
};

// 기능 요청 및 버그 리포트 (migration 0038 + 0039 첨부).
type FeatureRequestMockRow = {
  id: string;
  user_pseudonym_id: string;
  kind: string;
  title: string;
  body: string;
  status: string;
  admin_feedback: string | null;
  admin_feedback_at: string | null;
  admin_feedback_by_pseudonym_id: string | null;
  image_key: string | null;
  image_type: string | null;
  file_key: string | null;
  file_name: string | null;
  link_url: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type MockAnalysisState = {
  responses: ResponseRow[];
  reports: ReportRow[];
  consents: AnalysisConsentRow[];
  betaSignups: BetaSignupRow[];
  routine: RoutineRow[];
  posts: CommunityPostRow[];
  comments: CommunityCommentRow[];
  likes: CommunityLikeRow[];
  ledger: LedgerRow[];
  contentPages: ContentPageRow[];
  communities: CommunityRow[];
  followers: CommunityFollowerRow[];
  communityAdmins: CommunityAdminMockRow[];
  conversations: ConversationMockRow[];
  conversationMembers: ConversationMemberMockRow[];
  messages: MessageMockRow[];
  messageReactions: ReactionMockRow[];
  notices: NoticeMockRow[];
  releases: ReleaseMockRow[];
  vitalitySnapshots: VitalitySnapshotMockRow[];
  careAffiliates: CareAffiliateMockRow[];
  medicalConditions: MedicalConditionMockRow[];
  featureRequests: FeatureRequestMockRow[];
};

// migration 0037 시드와 동일한 6건. 프로덕션에 마이그레이션이 적용된 상태를 재현한다.
// (실제 제휴 미연동 → cta_url 은 자기 도메인 자리표시자, coming_soon = 1)
function seedCareAffiliates(): CareAffiliateMockRow[] {
  const at = '2026-07-08T00:00:00.000Z';
  const card = (
    slug: string,
    category: string,
    partner: string,
    hash: string,
    sort: number,
    ko: string,
    en: string,
    ja: string,
    es: string,
  ): CareAffiliateMockRow => ({
    slug,
    category,
    partner,
    cta_url: `https://chronoshealth.ever-day.com/care#${hash}`,
    coming_soon: 1,
    sort_order: sort,
    active: 1,
    i18n_json: JSON.stringify({
      ko: { title: ko, body: `${ko} 안내`, ctaLabel: '자세히 보기' },
      en: { title: en, body: `${en} details`, ctaLabel: 'Details' },
      ja: { title: ja, body: `${ja} の案内`, ctaLabel: '詳細を見る' },
      es: { title: es, body: `${es} detalles`, ctaLabel: 'Detalles' },
    }),
    updated_at: at,
    updated_by_pseudonym_id: null,
  });
  return [
    card('diet-mediterranean-plan', 'diet', 'Chronos Lab', 'diet-med', 0,
      '지중해식 식단 7일 플랜', 'Mediterranean 7-day plan', '地中海食 7日プラン', 'Plan mediterraneo de 7 dias'),
    card('diet-low-glycemic-pack', 'diet', 'Glucose-Friendly Kitchen', 'diet-gi', 1,
      '저GI 도시락', 'Low-GI meal box', '低GI弁当', 'Comida bajo IG'),
    card('exercise-home-cardio-30', 'exercise', 'Chronos Move', 'exercise-cardio', 0,
      '집에서 30분 유산소 루틴', '30-min home cardio routine', '自宅で30分有酸素ルーティン', 'Rutina cardio en casa 30 min'),
    card('exercise-strength-bands', 'exercise', 'Chronos Move', 'exercise-strength', 1,
      '관절 친화 저강도 근력', 'Joint-friendly band strength', '関節にやさしい低強度筋力', 'Fuerza con bandas'),
    card('medical-annual-checkup-kr', 'medical', 'Health Screening Partner', 'medical-checkup', 0,
      '연 1회 건강검진 예약', 'Annual health screening', '年1回の健康診断予約', 'Chequeo anual'),
    card('medical-smoking-cessation', 'medical', 'Chronos Lab', 'medical-quit-smoking', 1,
      '금연 보조 프로그램', 'Smoking-cessation support', '禁煙サポートプログラム', 'Programa de cese tabaquico'),
  ];
}

export function makeMockAnalysisDb(): {
  db: D1Database;
  state: MockAnalysisState;
} {
  const state: MockAnalysisState = {
    responses: [],
    reports: [],
    consents: [],
    betaSignups: [],
    routine: [],
    posts: [],
    comments: [],
    likes: [],
    ledger: [],
    contentPages: [],
    communities: [
      {
        id: '_lounge',
        owner_pseudonym_id: 'system-seed',
        name: 'Public Lounge',
        description: 'Default community for legacy posts.',
        visibility: 'public',
        allow_likes_default: 1,
        allow_comments_default: 1,
        created_at: new Date().toISOString(),
        deleted_at: null,
      },
    ],
    followers: [],
    communityAdmins: [],
    conversations: [],
    conversationMembers: [],
    messages: [],
    messageReactions: [],
    notices: [],
    releases: [],
    vitalitySnapshots: [],
    careAffiliates: seedCareAffiliates(),
    medicalConditions: [],
    featureRequests: [],
  };
  let nextResponseId = 1;
  let nextLedgerId = 1;
  // R9 메시징 — 단조 증가 시계(ms). datetime('now') 초 해상도 충돌을 피해 테스트에서
  // 메시지/읽음 순서를 결정적으로 보장한다.
  let msgClock = Date.now();
  const nextTs = (): string => new Date(msgClock++).toISOString();

  function runStmt(sql: string, args: unknown[]): {
    success: true;
    meta: { last_row_id?: number; changes?: number };
  } {
    const trimmed = sql.trim();

    if (trimmed.startsWith('INSERT INTO risk_survey_responses')) {
      const [
        user_pseudonym_id,
        purpose_code,
        birth_year,
        sex,
        height_cm,
        weight_kg,
        smoking,
        alcohol_drinks_per_week,
        exercise_minutes_per_week,
        sleep_hours_per_night,
        systolic_bp,
        diastolic_bp,
        fasting_glucose,
        ldl_cholesterol,
        hdl_cholesterol,
        family_history_diabetes,
        family_history_hypertension,
        family_history_cardiovascular,
        stress_level,
        self_rated_health,
      ] = args as [
        string, string, number, string, number, number,
        string, number, number, number,
        number | null, number | null, number | null, number | null, number | null,
        number, number, number,
        string, string,
      ];
      const id = nextResponseId++;
      state.responses.push({
        id,
        user_pseudonym_id,
        purpose_code,
        raw: {
          birth_year, sex, height_cm, weight_kg,
          smoking, alcohol_drinks_per_week, exercise_minutes_per_week, sleep_hours_per_night,
          systolic_bp, diastolic_bp, fasting_glucose, ldl_cholesterol, hdl_cholesterol,
          family_history_diabetes, family_history_hypertension, family_history_cardiovascular,
          stress_level, self_rated_health,
        },
      });
      return { success: true, meta: { last_row_id: id } };
    }

    // migration 0037 — care_affiliates CRUD.
    if (trimmed.startsWith('INSERT INTO care_affiliates')) {
      const [
        slug, category, partner, cta_url, coming_soon,
        sort_order, active, i18n_json, updated_at, updated_by_pseudonym_id,
      ] = args as [
        string, string, string, string, number,
        number, number, string, string, string | null,
      ];
      if (state.careAffiliates.some((r) => r.slug === slug)) {
        return { success: true, meta: { changes: 0 } };
      }
      state.careAffiliates.push({
        slug, category, partner, cta_url, coming_soon,
        sort_order, active, i18n_json, updated_at, updated_by_pseudonym_id,
      });
      return { success: true, meta: { changes: 1 } };
    }

    if (trimmed.startsWith('UPDATE care_affiliates')) {
      const [
        category, partner, cta_url, coming_soon,
        sort_order, active, i18n_json, updated_at, updated_by_pseudonym_id, slug,
      ] = args as [
        string, string, string, number,
        number, number, string, string, string | null, string,
      ];
      const row = state.careAffiliates.find((r) => r.slug === slug);
      if (!row) return { success: true, meta: { changes: 0 } };
      Object.assign(row, {
        category, partner, cta_url, coming_soon,
        sort_order, active, i18n_json, updated_at, updated_by_pseudonym_id,
      });
      return { success: true, meta: { changes: 1 } };
    }

    if (trimmed.startsWith('DELETE FROM care_affiliates')) {
      const [slug] = args as [string];
      const before = state.careAffiliates.length;
      state.careAffiliates = state.careAffiliates.filter((r) => r.slug !== slug);
      return { success: true, meta: { changes: before - state.careAffiliates.length } };
    }

    // migration 0036 — vitality_snapshots upsert (사용자당 1행).
    // 2nd Data — 카테고리 전체 granted=0 리셋 후 코드별 granted=1 upsert.
    if (trimmed.startsWith('UPDATE medical_conditions SET granted = 0')) {
      const [user_pseudonym_id, category] = args as [string, string];
      let changes = 0;
      for (const row of state.medicalConditions) {
        if (row.user_pseudonym_id === user_pseudonym_id && row.category === category) {
          row.granted = 0;
          changes += 1;
        }
      }
      return { success: true, meta: { changes } };
    }
    if (trimmed.startsWith('INSERT INTO medical_conditions')) {
      const [user_pseudonym_id, code, category] = args as [string, string, string];
      const existing = state.medicalConditions.find(
        (r) =>
          r.user_pseudonym_id === user_pseudonym_id &&
          r.category === category &&
          r.code === code,
      );
      if (existing) {
        existing.granted = 1;
        existing.updated_at = new Date().toISOString();
      } else {
        state.medicalConditions.push({
          user_pseudonym_id,
          code,
          category,
          granted: 1,
          updated_at: new Date().toISOString(),
        });
      }
      return { success: true, meta: { changes: 1 } };
    }

    // 관리자 감사 로그 — 본 작업 성공 여부만 검증하면 되므로 no-op 로 수용.
    if (trimmed.startsWith('INSERT INTO admin_audit_log')) {
      return { success: true, meta: { changes: 1 } };
    }

    // ── 기능 요청 및 버그 리포트 (feature_requests) ──────────────────────────
    if (trimmed.startsWith('INSERT INTO feature_requests')) {
      const [id, user_pseudonym_id, kind, title, body, link_url] = args as [
        string,
        string,
        string,
        string,
        string,
        string | null,
      ];
      state.featureRequests.push({
        id,
        user_pseudonym_id,
        kind,
        title,
        body,
        status: 'open',
        admin_feedback: null,
        admin_feedback_at: null,
        admin_feedback_by_pseudonym_id: null,
        image_key: null,
        image_type: null,
        file_key: null,
        file_name: null,
        link_url: link_url ?? null,
        created_at: nextTs(),
        updated_at: nextTs(),
        deleted_at: null,
      });
      return { success: true, meta: { changes: 1 } };
    }
    if (trimmed.startsWith('UPDATE feature_requests SET image_key')) {
      const [key, type, id] = args as [string | null, string | null, string];
      const row = state.featureRequests.find(
        (r) => r.id === id && r.deleted_at === null,
      );
      if (!row) return { success: true, meta: { changes: 0 } };
      row.image_key = key;
      row.image_type = type;
      row.updated_at = nextTs();
      return { success: true, meta: { changes: 1 } };
    }
    if (trimmed.startsWith('UPDATE feature_requests SET file_key')) {
      const [key, name, id] = args as [string | null, string | null, string];
      const row = state.featureRequests.find(
        (r) => r.id === id && r.deleted_at === null,
      );
      if (!row) return { success: true, meta: { changes: 0 } };
      row.file_key = key;
      row.file_name = name;
      row.updated_at = nextTs();
      return { success: true, meta: { changes: 1 } };
    }
    if (trimmed.startsWith('UPDATE feature_requests SET deleted_at')) {
      // soft delete — 소유자 스코프면 pseudonym 도 일치해야 한다.
      const ownerScoped = trimmed.includes('user_pseudonym_id = ?');
      let changes = 0;
      if (ownerScoped) {
        const [id, pseudonym] = args as [string, string];
        const row = state.featureRequests.find(
          (r) => r.id === id && r.user_pseudonym_id === pseudonym && r.deleted_at === null,
        );
        if (row) {
          row.deleted_at = nextTs();
          changes = 1;
        }
      } else {
        const [id] = args as [string];
        const row = state.featureRequests.find(
          (r) => r.id === id && r.deleted_at === null,
        );
        if (row) {
          row.deleted_at = nextTs();
          changes = 1;
        }
      }
      return { success: true, meta: { changes } };
    }
    if (trimmed.startsWith('UPDATE feature_requests SET')) {
      // SET 열은 storage 가 push 하는 순서대로 bind 를 소비한다.
      const ownerScoped = trimmed.includes('user_pseudonym_id = ?');
      const vals = [...args];
      if (ownerScoped) {
        const pseudonym = vals.pop() as string;
        const id = vals.pop() as string;
        const row = state.featureRequests.find(
          (r) => r.id === id && r.user_pseudonym_id === pseudonym && r.deleted_at === null,
        );
        if (!row) return { success: true, meta: { changes: 0 } };
        let i = 0;
        if (trimmed.includes('kind = ?')) row.kind = vals[i++] as string;
        if (trimmed.includes('title = ?')) row.title = vals[i++] as string;
        if (trimmed.includes('body = ?')) row.body = vals[i++] as string;
        if (trimmed.includes('link_url = ?')) row.link_url = vals[i++] as string | null;
        row.updated_at = nextTs();
        return { success: true, meta: { changes: 1 } };
      }
      // 관리자 피드백/상태.
      const id = vals.pop() as string;
      const row = state.featureRequests.find(
        (r) => r.id === id && r.deleted_at === null,
      );
      if (!row) return { success: true, meta: { changes: 0 } };
      let i = 0;
      if (trimmed.includes('admin_feedback = ?')) {
        row.admin_feedback = vals[i++] as string | null;
        row.admin_feedback_at = nextTs();
        row.admin_feedback_by_pseudonym_id = vals[i++] as string;
      }
      if (trimmed.includes('status = ?')) row.status = vals[i++] as string;
      row.updated_at = nextTs();
      return { success: true, meta: { changes: 1 } };
    }

    if (trimmed.startsWith('INSERT INTO vitality_snapshots')) {
      const [user_pseudonym_id, vitality_score, age_band, sex, updated_at] =
        args as [string, number, string, string, string];
      const existing = state.vitalitySnapshots.find(
        (r) => r.user_pseudonym_id === user_pseudonym_id,
      );
      if (existing) {
        existing.vitality_score = vitality_score;
        existing.age_band = age_band;
        existing.sex = sex;
        existing.updated_at = updated_at;
      } else {
        state.vitalitySnapshots.push({
          user_pseudonym_id,
          vitality_score,
          age_band,
          sex,
          updated_at,
        });
      }
      return { success: true, meta: { changes: 1 } };
    }

    if (trimmed.startsWith('INSERT INTO risk_survey_reports')) {
      const [
        report_id,
        response_id,
        user_pseudonym_id,
        purpose_code,
        model_version,
        payload,
        generated_at,
      ] = args as [string, number, string, string, string, string, string];
      state.reports.push({
        report_id,
        response_id,
        user_pseudonym_id,
        purpose_code,
        model_version,
        payload,
        generated_at,
      });
      return { success: true, meta: {} };
    }

    if (trimmed.startsWith('INSERT INTO consent_log')) {
      const [user_pseudonym_id, purpose_code] = args as [string, string];
      const kindMatch = sql.match(/'(store|research)'/);
      state.consents.push({
        user_pseudonym_id,
        purpose_code,
        consent_kind: (kindMatch?.[1] as 'store' | 'research') ?? 'store',
        granted: 1,
        source: 'risk_estimate_api',
        recorded_at: new Date().toISOString(),
      });
      return { success: true, meta: {} };
    }

    if (trimmed.startsWith('INSERT INTO beta_signups')) {
      const [
        id,
        email_pseudonym,
        country,
        age_group,
        interested_modules,
        locale,
      ] = args as [string, string, string, string, string, string];
      if (state.betaSignups.some((r) => r.email_pseudonym === email_pseudonym)) {
        throw new Error('UNIQUE constraint failed: beta_signups.email_pseudonym');
      }
      state.betaSignups.push({
        id,
        email_pseudonym,
        country,
        age_group,
        interested_modules,
        locale,
        created_at: new Date().toISOString(),
      });
      return { success: true, meta: {} };
    }

    if (trimmed.startsWith('INSERT INTO content_pages')) {
      const [slug, locale, title, body_md, version, updated_by_pseudonym_id] = args as [
        string, string, string, string, string, string,
      ];
      const existing = state.contentPages.find(
        (c) => c.slug === slug && c.locale === locale,
      );
      if (existing) {
        existing.title = title;
        existing.body_md = body_md;
        existing.version = version;
        existing.updated_by_pseudonym_id = updated_by_pseudonym_id;
        existing.updated_at = new Date().toISOString();
      } else {
        state.contentPages.push({
          slug, locale, title, body_md, version, updated_by_pseudonym_id,
          updated_at: new Date().toISOString(),
        });
      }
      return { success: true, meta: {} };
    }

    if (trimmed.startsWith('INSERT INTO chr_ledger')) {
      const [user_pseudonym_id, txn_id, amount, kind, source_ref] = args as [
        string, string, number, string, string | null,
      ];
      if (state.ledger.some((l) => l.txn_id === txn_id)) {
        throw new Error('UNIQUE constraint failed: chr_ledger.txn_id');
      }
      state.ledger.push({
        id: nextLedgerId++,
        user_pseudonym_id,
        txn_id,
        amount,
        kind,
        source_ref,
        created_at: new Date().toISOString(),
      });
      return { success: true, meta: {} };
    }

    if (trimmed.startsWith('INSERT INTO community_posts')) {
      // 컬럼 순서: id, community_id, user_pseudonym_id, title, body, video_url, sns_url,
      //   image_data, image_mime, allow_likes, allow_comments, tag, body_rich, image_position, video_urls, sns_urls
      const a = args as unknown[];
      state.posts.push({
        id: a[0] as string,
        community_id: a[1] as string,
        user_pseudonym_id: a[2] as string,
        title: a[3] as string,
        body: a[4] as string,
        video_url: (a[5] as string | null) ?? null,
        sns_url: (a[6] as string | null) ?? null,
        image_data: (a[7] as string | null) ?? null,
        image_mime: (a[8] as string | null) ?? null,
        body_rich: (a[12] as string | null) ?? null,
        image_position: (a[13] as string | null) ?? 'top',
        video_urls: (a[14] as string | null) ?? null,
        sns_urls: (a[15] as string | null) ?? null,
        created_at: new Date().toISOString(),
        deleted_at: null,
        allow_likes: a[9] as number,
        allow_comments: a[10] as number,
      });
      return { success: true, meta: {} };
    }

    if (trimmed.startsWith('INSERT INTO communities')) {
      const [id, owner_pseudonym_id, name, description, visibility, allow_likes_default, allow_comments_default] = args as [
        string, string, string, string, string, number, number,
      ];
      state.communities.push({
        id,
        owner_pseudonym_id,
        name,
        description,
        visibility,
        allow_likes_default,
        allow_comments_default,
        created_at: new Date().toISOString(),
        deleted_at: null,
      });
      return { success: true, meta: {} };
    }

    if (trimmed.startsWith("UPDATE communities SET deleted_at")) {
      const [id] = args as [string];
      const c = state.communities.find((x) => x.id === id && x.deleted_at === null);
      if (!c) return { success: true, meta: { changes: 0 } };
      c.deleted_at = new Date().toISOString();
      return { success: true, meta: { changes: 1 } };
    }

    if (trimmed.startsWith('INSERT INTO community_followers')) {
      const [community_id, follower_pseudonym_id, status] = args as [
        string, string, string,
      ];
      const exists = state.followers.find(
        (f) => f.community_id === community_id && f.follower_pseudonym_id === follower_pseudonym_id,
      );
      if (exists) {
        exists.status = status;
      } else {
        state.followers.push({
          community_id,
          follower_pseudonym_id,
          status,
          created_at: new Date().toISOString(),
        });
      }
      return { success: true, meta: {} };
    }

    if (trimmed.startsWith('DELETE FROM community_followers')) {
      const [community_id, follower_pseudonym_id] = args as [string, string];
      const idx = state.followers.findIndex(
        (f) => f.community_id === community_id && f.follower_pseudonym_id === follower_pseudonym_id,
      );
      if (idx < 0) return { success: true, meta: { changes: 0 } };
      state.followers.splice(idx, 1);
      return { success: true, meta: { changes: 1 } };
    }

    if (trimmed.startsWith('UPDATE community_followers SET status')) {
      const [community_id, follower_pseudonym_id] = args as [string, string];
      const f = state.followers.find(
        (x) => x.community_id === community_id && x.follower_pseudonym_id === follower_pseudonym_id && x.status === 'pending',
      );
      if (!f) return { success: true, meta: { changes: 0 } };
      f.status = 'active';
      return { success: true, meta: { changes: 1 } };
    }

    if (trimmed.startsWith('INSERT INTO community_comments')) {
      const [id, post_id, user_pseudonym_id, body, accepts_dm] = args as [
        string, string, string, string, number | undefined,
      ];
      state.comments.push({
        id,
        post_id,
        user_pseudonym_id,
        body,
        accepts_dm: accepts_dm === 1 ? 1 : 0,
        created_at: new Date().toISOString(),
        deleted_at: null,
      });
      return { success: true, meta: {} };
    }

    if (trimmed.startsWith('INSERT INTO community_likes')) {
      const [user_pseudonym_id, post_id] = args as [string, string];
      if (!state.likes.some((l) => l.user_pseudonym_id === user_pseudonym_id && l.post_id === post_id)) {
        state.likes.push({
          user_pseudonym_id,
          post_id,
          created_at: new Date().toISOString(),
        });
      }
      return { success: true, meta: {} };
    }

    if (trimmed.startsWith('DELETE FROM community_likes')) {
      const [user_pseudonym_id, post_id] = args as [string, string];
      const idx = state.likes.findIndex(
        (l) => l.user_pseudonym_id === user_pseudonym_id && l.post_id === post_id,
      );
      if (idx >= 0) state.likes.splice(idx, 1);
      return { success: true, meta: { changes: idx >= 0 ? 1 : 0 } };
    }

    if (trimmed.startsWith('UPDATE community_posts SET deleted_at')) {
      // 작성자 삭제(user_pseudonym_id 검사 포함) vs 모더레이터 삭제(id 만) 분기.
      if (trimmed.includes('user_pseudonym_id = ?')) {
        const [postId, userPseudonymId] = args as [string, string];
        const post = state.posts.find(
          (p) => p.id === postId && p.user_pseudonym_id === userPseudonymId && p.deleted_at === null,
        );
        if (!post) return { success: true, meta: { changes: 0 } };
        post.deleted_at = new Date().toISOString();
        return { success: true, meta: { changes: 1 } };
      }
      const [postId] = args as [string];
      const post = state.posts.find((p) => p.id === postId && p.deleted_at === null);
      if (!post) return { success: true, meta: { changes: 0 } };
      post.deleted_at = new Date().toISOString();
      return { success: true, meta: { changes: 1 } };
    }

    if (trimmed.startsWith('UPDATE community_posts SET') && trimmed.includes('title = ?')) {
      // 작성자 본문 수정. 바인딩: title, body, video_url, sns_url, image_data, image_mime,
      //   allow_likes, allow_comments, body_rich, image_position, video_urls, sns_urls, postId, userPseudonymId
      const a = args as unknown[];
      const postId = a[12] as string;
      const userPseudonymId = a[13] as string;
      const post = state.posts.find(
        (p) => p.id === postId && p.user_pseudonym_id === userPseudonymId && p.deleted_at === null,
      );
      if (!post) return { success: true, meta: { changes: 0 } };
      post.title = a[0] as string;
      post.body = a[1] as string;
      post.video_url = (a[2] as string | null) ?? null;
      post.sns_url = (a[3] as string | null) ?? null;
      post.image_data = (a[4] as string | null) ?? null;
      post.image_mime = (a[5] as string | null) ?? null;
      post.allow_likes = a[6] as number;
      post.allow_comments = a[7] as number;
      post.body_rich = (a[8] as string | null) ?? null;
      post.image_position = (a[9] as string | null) ?? 'top';
      post.video_urls = (a[10] as string | null) ?? null;
      post.sns_urls = (a[11] as string | null) ?? null;
      return { success: true, meta: { changes: 1 } };
    }

    if (trimmed.startsWith('UPDATE community_comments SET body')) {
      const [body, accepts_dm, commentId, userPseudonymId] = args as [string, number, string, string];
      const cmt = state.comments.find(
        (cc) => cc.id === commentId && cc.user_pseudonym_id === userPseudonymId && cc.deleted_at === null,
      );
      if (!cmt) return { success: true, meta: { changes: 0 } };
      cmt.body = body;
      cmt.accepts_dm = accepts_dm === 1 ? 1 : 0;
      return { success: true, meta: { changes: 1 } };
    }

    if (trimmed.startsWith('UPDATE community_comments SET deleted_at')) {
      // 작성자 삭제(user_pseudonym_id 포함) vs 모더레이터 삭제(id 만) 분기.
      if (trimmed.includes('user_pseudonym_id = ?')) {
        const [commentId, userPseudonymId] = args as [string, string];
        const cmt = state.comments.find(
          (cc) => cc.id === commentId && cc.user_pseudonym_id === userPseudonymId && cc.deleted_at === null,
        );
        if (!cmt) return { success: true, meta: { changes: 0 } };
        cmt.deleted_at = new Date().toISOString();
        return { success: true, meta: { changes: 1 } };
      }
      const [commentId] = args as [string];
      const cmt = state.comments.find((cc) => cc.id === commentId && cc.deleted_at === null);
      if (!cmt) return { success: true, meta: { changes: 0 } };
      cmt.deleted_at = new Date().toISOString();
      return { success: true, meta: { changes: 1 } };
    }

    if (trimmed.startsWith('UPDATE communities SET visibility')) {
      const [visibility, id] = args as [string, string];
      const com = state.communities.find((x) => x.id === id && x.deleted_at === null);
      if (!com) return { success: true, meta: { changes: 0 } };
      com.visibility = visibility;
      return { success: true, meta: { changes: 1 } };
    }

    if (trimmed.startsWith('INSERT OR IGNORE INTO community_admins')) {
      const [community_id, admin_pseudonym_id] = args as [string, string];
      if (
        !state.communityAdmins.some(
          (a) => a.community_id === community_id && a.admin_pseudonym_id === admin_pseudonym_id,
        )
      ) {
        state.communityAdmins.push({
          community_id, admin_pseudonym_id, created_at: new Date().toISOString(),
        });
      }
      return { success: true, meta: {} };
    }

    if (trimmed.startsWith('INSERT OR IGNORE INTO community_followers')) {
      const [community_id, follower_pseudonym_id, status] = args as [string, string, string];
      if (
        !state.followers.some(
          (f) => f.community_id === community_id && f.follower_pseudonym_id === follower_pseudonym_id,
        )
      ) {
        state.followers.push({
          community_id, follower_pseudonym_id, status, created_at: new Date().toISOString(),
        });
      }
      return { success: true, meta: {} };
    }

    if (trimmed.startsWith('DELETE FROM community_admins')) {
      const [community_id, admin_pseudonym_id] = args as [string, string];
      const idx = state.communityAdmins.findIndex(
        (a) => a.community_id === community_id && a.admin_pseudonym_id === admin_pseudonym_id,
      );
      if (idx < 0) return { success: true, meta: { changes: 0 } };
      state.communityAdmins.splice(idx, 1);
      return { success: true, meta: { changes: 1 } };
    }

    if (trimmed.startsWith('INSERT INTO routine_entries')) {
      const [
        user_pseudonym_id,
        entry_date,
        calories_kcal,
        exercise_minutes,
        exercise_intensity,
        sleep_hours,
        note,
      ] = args as [
        string,
        string,
        number | null,
        number | null,
        string | null,
        number | null,
        string | null,
      ];
      const existing = state.routine.find(
        (r) => r.user_pseudonym_id === user_pseudonym_id && r.entry_date === entry_date,
      );
      if (existing) {
        existing.calories_kcal = calories_kcal;
        existing.exercise_minutes = exercise_minutes;
        existing.exercise_intensity = exercise_intensity;
        existing.sleep_hours = sleep_hours;
        existing.note = note;
        existing.updated_at = new Date().toISOString();
      } else {
        state.routine.push({
          user_pseudonym_id,
          entry_date,
          calories_kcal,
          exercise_minutes,
          exercise_intensity,
          sleep_hours,
          note,
          updated_at: new Date().toISOString(),
        });
      }
      return { success: true, meta: {} };
    }

    if (trimmed.startsWith('INSERT OR IGNORE INTO conversations')) {
      const [id, kind, title, owner_pseudonym_id] = args as [
        string, string, string | null, string | null,
      ];
      if (!state.conversations.some((x) => x.id === id)) {
        state.conversations.push({
          id, kind, title, owner_pseudonym_id,
          created_at: nextTs(),
          deleted_at: null,
        });
      }
      return { success: true, meta: {} };
    }

    if (trimmed.startsWith('UPDATE conversations SET deleted_at')) {
      const [id] = args as [string];
      const conv = state.conversations.find((x) => x.id === id);
      if (conv) conv.deleted_at = nextTs();
      return { success: true, meta: { changes: conv ? 1 : 0 } };
    }

    if (trimmed.startsWith('INSERT OR IGNORE INTO conversation_members')) {
      const [conversation_id, member_pseudonym_id, role] = args as [
        string, string, string,
      ];
      const exists = state.conversationMembers.some(
        (m) => m.conversation_id === conversation_id && m.member_pseudonym_id === member_pseudonym_id,
      );
      if (!exists) {
        const ts = nextTs();
        state.conversationMembers.push({
          conversation_id, member_pseudonym_id, role,
          joined_at: ts, last_read_at: ts,
        });
      }
      return { success: true, meta: {} };
    }

    if (trimmed.startsWith('INSERT INTO messages')) {
      // 컬럼: id, conversation_id, sender_pseudonym_id, body, reply_to_message_id,
      //   attachment_key, attachment_name, attachment_type, attachment_size, attachment_expires_at
      const a = args as unknown[];
      state.messages.push({
        id: a[0] as string,
        conversation_id: a[1] as string,
        sender_pseudonym_id: a[2] as string,
        body: a[3] as string,
        reply_to_message_id: (a[4] as string | null) ?? null,
        attachment_key: (a[5] as string | null) ?? null,
        attachment_name: (a[6] as string | null) ?? null,
        attachment_type: (a[7] as string | null) ?? null,
        attachment_size: (a[8] as number | null) ?? null,
        attachment_expires_at: (a[9] as string | null) ?? null,
        created_at: nextTs(),
        deleted_at: null,
      });
      return { success: true, meta: {} };
    }

    if (trimmed.startsWith('UPDATE messages')) {
      if (trimmed.includes('sender_pseudonym_id = ?')) {
        // softDeleteMessage — 발신자 본인만.
        const [messageId, sender] = args as [string, string];
        const m = state.messages.find(
          (x) => x.id === messageId && x.sender_pseudonym_id === sender && x.deleted_at === null,
        );
        if (m) m.deleted_at = nextTs();
        return { success: true, meta: { changes: m ? 1 : 0 } };
      }
      // expireAttachment — soft delete + 키 제거(id 만).
      const [messageId] = args as [string];
      const m = state.messages.find((x) => x.id === messageId);
      if (m) {
        m.deleted_at = nextTs();
        m.attachment_key = null;
      }
      return { success: true, meta: { changes: m ? 1 : 0 } };
    }

    if (trimmed.startsWith('UPDATE conversation_members SET last_read_at')) {
      const [conversation_id, member_pseudonym_id] = args as [string, string];
      const m = state.conversationMembers.find(
        (x) => x.conversation_id === conversation_id && x.member_pseudonym_id === member_pseudonym_id,
      );
      if (m) m.last_read_at = nextTs();
      return { success: true, meta: { changes: m ? 1 : 0 } };
    }

    if (trimmed.startsWith('DELETE FROM conversation_members')) {
      const [conversation_id, member_pseudonym_id] = args as [string, string];
      const idx = state.conversationMembers.findIndex(
        (x) => x.conversation_id === conversation_id && x.member_pseudonym_id === member_pseudonym_id,
      );
      if (idx < 0) return { success: true, meta: { changes: 0 } };
      state.conversationMembers.splice(idx, 1);
      return { success: true, meta: { changes: 1 } };
    }

    if (trimmed.startsWith('INSERT OR IGNORE INTO message_reactions')) {
      const [message_id, conversation_id, user_pseudonym_id, emoji] = args as [
        string, string, string, string,
      ];
      const exists = state.messageReactions.some(
        (r) =>
          r.message_id === message_id &&
          r.user_pseudonym_id === user_pseudonym_id &&
          r.emoji === emoji,
      );
      if (!exists) {
        state.messageReactions.push({ message_id, conversation_id, user_pseudonym_id, emoji });
      }
      return { success: true, meta: {} };
    }

    if (trimmed.startsWith('DELETE FROM message_reactions')) {
      const [message_id, user_pseudonym_id, emoji] = args as [string, string, string];
      const before = state.messageReactions.length;
      state.messageReactions = state.messageReactions.filter(
        (r) =>
          !(
            r.message_id === message_id &&
            r.user_pseudonym_id === user_pseudonym_id &&
            r.emoji === emoji
          ),
      );
      return { success: true, meta: { changes: before - state.messageReactions.length } };
    }

    if (trimmed.startsWith('INSERT INTO notices')) {
      const [id, title, body, pinned, published, created_by_pseudonym_id] = args as [
        string, string, string, number, number, string,
      ];
      const ts = nextTs();
      state.notices.push({
        id, title, body, pinned, published, created_by_pseudonym_id,
        created_at: ts, updated_at: ts,
      });
      return { success: true, meta: {} };
    }

    if (trimmed.startsWith('UPDATE notices SET')) {
      const id = args[args.length - 1] as string;
      const n = state.notices.find((x) => x.id === id);
      if (!n) return { success: true, meta: { changes: 0 } };
      let i = 0;
      if (trimmed.includes('title = ?')) n.title = args[i++] as string;
      if (trimmed.includes('body = ?')) n.body = args[i++] as string;
      if (trimmed.includes('pinned = ?')) n.pinned = args[i++] as number;
      if (trimmed.includes('published = ?')) n.published = args[i++] as number;
      n.updated_at = nextTs();
      return { success: true, meta: { changes: 1 } };
    }

    if (trimmed.startsWith('DELETE FROM notices')) {
      const [id] = args as [string];
      const idx = state.notices.findIndex((x) => x.id === id);
      if (idx < 0) return { success: true, meta: { changes: 0 } };
      state.notices.splice(idx, 1);
      return { success: true, meta: { changes: 1 } };
    }

    if (trimmed.startsWith('INSERT INTO releases')) {
      const [id, component, version, notes, created_by_pseudonym_id] = args as [
        string, string, string, string, string,
      ];
      state.releases.push({
        id, component, version, notes, created_by_pseudonym_id, created_at: nextTs(),
      });
      return { success: true, meta: {} };
    }

    if (trimmed.startsWith('DELETE FROM releases')) {
      const [id] = args as [string];
      const idx = state.releases.findIndex((x) => x.id === id);
      if (idx < 0) return { success: true, meta: { changes: 0 } };
      state.releases.splice(idx, 1);
      return { success: true, meta: { changes: 1 } };
    }

    throw new Error(`mock-analysis-d1 unknown statement: ${trimmed.substring(0, 80)}`);
  }

  function firstStmtAnalysis(sql: string, args: unknown[]): unknown {
    const trimmed = sql.trim();

    // R9 메시징 ─────────────────────────────────────────────────────────
    if (trimmed.includes('FROM conversations WHERE id = ?')) {
      const [id] = args as [string];
      const c = state.conversations.find((x) => x.id === id && x.deleted_at === null);
      return c
        ? {
            id: c.id,
            kind: c.kind,
            title: c.title,
            owner_pseudonym_id: c.owner_pseudonym_id,
            created_at: c.created_at,
          }
        : null;
    }
    if (trimmed.startsWith('SELECT 1 FROM conversation_members')) {
      const [conversationId, memberPseudonymId] = args as [string, string];
      const exists = state.conversationMembers.some(
        (m) => m.conversation_id === conversationId && m.member_pseudonym_id === memberPseudonymId,
      );
      return exists ? { '1': 1 } : null;
    }
    // 전체 미읽음 합계(알림) — JOIN conversation_members.
    if (
      trimmed.includes('FROM messages m') &&
      trimmed.includes('JOIN conversation_members')
    ) {
      const [pseudonymId] = args as [string];
      const myConvs = new Map(
        state.conversationMembers
          .filter((cm) => cm.member_pseudonym_id === pseudonymId)
          .map((cm) => [cm.conversation_id, cm.last_read_at]),
      );
      const count = state.messages.filter(
        (m) =>
          m.deleted_at === null &&
          myConvs.has(m.conversation_id) &&
          m.created_at > (myConvs.get(m.conversation_id) as string) &&
          m.sender_pseudonym_id !== pseudonymId,
      ).length;
      return { c: count };
    }
    if (trimmed.startsWith('SELECT COUNT(*) AS c FROM messages')) {
      const [conversationId, lastReadAt, senderExcl] = args as [string, string, string];
      const count = state.messages.filter(
        (m) =>
          m.conversation_id === conversationId &&
          m.deleted_at === null &&
          m.created_at > lastReadAt &&
          m.sender_pseudonym_id !== senderExcl,
      ).length;
      return { c: count };
    }
    // 만료 첨부 목록 — cron 정리용.
    if (trimmed.includes('FROM messages') && trimmed.includes('attachment_expires_at < ?')) {
      const nowIso = args[0] as string;
      const limit = args[args.length - 1] as number;
      const rows = state.messages
        .filter(
          (m) =>
            m.attachment_key !== null &&
            m.attachment_expires_at !== null &&
            m.attachment_expires_at < nowIso &&
            m.deleted_at === null,
        )
        .slice(0, limit)
        .map((m) => ({ id: m.id, attachment_key: m.attachment_key }));
      return { results: rows };
    }
    // 첨부 다운로드 메타 — WHERE id AND attachment_key IS NOT NULL.
    if (
      trimmed.includes('FROM messages') &&
      trimmed.includes('attachment_key IS NOT NULL') &&
      trimmed.includes('WHERE id = ?')
    ) {
      const [messageId] = args as [string];
      const m = state.messages.find(
        (x) => x.id === messageId && x.deleted_at === null && x.attachment_key !== null,
      );
      return m
        ? {
            conversation_id: m.conversation_id,
            attachment_key: m.attachment_key,
            attachment_name: m.attachment_name,
            attachment_type: m.attachment_type,
          }
        : null;
    }
    // 답장 대상 존재 확인 — SELECT 1 FROM messages WHERE id = ? AND conversation_id = ? AND deleted_at IS NULL
    if (trimmed.startsWith('SELECT 1 FROM messages')) {
      const [messageId, conversationId] = args as [string, string];
      const hit = state.messages.some(
        (m) => m.id === messageId && m.conversation_id === conversationId && m.deleted_at === null,
      );
      return hit ? { '1': 1 } : null;
    }
    if (trimmed.includes('FROM messages') && trimmed.includes('LIMIT 1')) {
      const [conversationId] = args as [string];
      const rows = state.messages
        .filter((m) => m.conversation_id === conversationId && m.deleted_at === null)
        .sort((a, b) => (a.created_at > b.created_at ? -1 : 1));
      const last = rows[0];
      return last
        ? {
            id: last.id,
            sender_pseudonym_id: last.sender_pseudonym_id,
            body: last.body,
            created_at: last.created_at,
            attachment_name: last.attachment_name,
            attachment_type: last.attachment_type,
            attachment_size: last.attachment_size,
            attachment_expires_at: last.attachment_expires_at,
          }
        : null;
    }
    if (trimmed.startsWith('SELECT 1 FROM community_admins')) {
      const [communityId, adminId] = args as [string, string];
      const exists = state.communityAdmins.some(
        (a) => a.community_id === communityId && a.admin_pseudonym_id === adminId,
      );
      return exists ? { '1': 1 } : null;
    }
    if (trimmed.includes('FROM community_comments c') && trimmed.includes('JOIN community_posts p')) {
      const [commentId] = args as [string];
      const cmt = state.comments.find((cc) => cc.id === commentId && cc.deleted_at === null);
      if (!cmt) return null;
      const post = state.posts.find((p) => p.id === cmt.post_id);
      if (!post) return null;
      return { comment_id: cmt.id, community_id: post.community_id };
    }
    if (trimmed.includes('FROM notices WHERE id = ?')) {
      const [id] = args as [string];
      const n = state.notices.find((x) => x.id === id);
      return n
        ? {
            id: n.id, title: n.title, body: n.body,
            pinned: n.pinned, published: n.published,
            created_at: n.created_at, updated_at: n.updated_at,
          }
        : null;
    }

    if (trimmed.includes('FROM beta_signups WHERE email_pseudonym = ?')) {
      const [pseudonym] = args as [string];
      return state.betaSignups.find((r) => r.email_pseudonym === pseudonym)
        ? { '1': 1 }
        : null;
    }
    // migration 0037 — care_affiliates 단건 조회.
    if (
      trimmed.includes('FROM care_affiliates') &&
      trimmed.includes('WHERE slug = ?')
    ) {
      const [slug] = args as [string];
      return state.careAffiliates.find((r) => r.slug === slug) ?? null;
    }

    // migration 0036 — ECDF 셀 집계 (연령대 × 성별).
    // bind 순서: score, score, excellent, good, excellent, fair, good, fair, age_band, sex
    if (trimmed.includes('FROM vitality_snapshots')) {
      const [
        score,
        ,
        cutExcellent,
        cutGood,
        ,
        cutFair,
        ,
        ,
        age_band,
        sex,
      ] = args as [
        number, number,
        number, number, number, number, number, number,
        string, string,
      ];
      const rows = state.vitalitySnapshots.filter(
        (r) => r.age_band === age_band && r.sex === sex,
      );
      const count = (pred: (v: number) => boolean): number =>
        rows.filter((r) => pred(r.vitality_score)).length;
      return {
        sample_size: rows.length,
        below: count((v) => v < score),
        ties: count((v) => v === score),
        t_excellent: count((v) => v >= cutExcellent),
        t_good: count((v) => v >= cutGood && v < cutExcellent),
        t_fair: count((v) => v >= cutFair && v < cutGood),
        t_attention: count((v) => v < cutFair),
      };
    }

    if (
      trimmed.includes('FROM risk_survey_reports r') &&
      trimmed.includes('WHERE r.user_pseudonym_id = ?')
    ) {
      const [pseudonym] = args as [string];
      const reports = state.reports
        .filter((r) => r.user_pseudonym_id === pseudonym)
        .sort((a, b) => (a.generated_at < b.generated_at ? 1 : -1));
      const latest = reports[0];
      if (!latest) return null;
      const resp = state.responses.find((r) => r.id === latest.response_id);
      return {
        payload: latest.payload,
        generated_at: latest.generated_at,
        stress_level: (resp?.raw?.stress_level as string) ?? null,
        sex: (resp?.raw?.sex as string) ?? 'other',
        birth_year: (resp?.raw?.birth_year as number) ?? 1990,
      };
    }
    if (
      trimmed.includes('FROM risk_survey_responses s') &&
      trimmed.includes('JOIN risk_survey_reports r')
    ) {
      const [pseudonym] = args as [string];
      const reports = state.reports
        .filter((r) => r.user_pseudonym_id === pseudonym)
        .sort((a, b) => (a.generated_at < b.generated_at ? 1 : -1));
      const latest = reports[0];
      if (!latest) return null;
      const resp = state.responses.find((r) => r.id === latest.response_id);
      if (!resp) return null;
      const raw = resp.raw as Record<string, unknown>;
      return {
        birth_year: raw.birth_year,
        sex: raw.sex,
        height_cm: raw.height_cm,
        weight_kg: raw.weight_kg,
        smoking: raw.smoking,
        alcohol_drinks_per_week: raw.alcohol_drinks_per_week,
        exercise_minutes_per_week: raw.exercise_minutes_per_week,
        sleep_hours_per_night: raw.sleep_hours_per_night,
        systolic_bp: raw.systolic_bp,
        diastolic_bp: raw.diastolic_bp,
        fasting_glucose: raw.fasting_glucose,
        ldl_cholesterol: raw.ldl_cholesterol,
        hdl_cholesterol: raw.hdl_cholesterol,
        family_history_diabetes: raw.family_history_diabetes,
        family_history_hypertension: raw.family_history_hypertension,
        family_history_cardiovascular: raw.family_history_cardiovascular,
        stress_level: raw.stress_level,
        self_rated_health: raw.self_rated_health,
      };
    }
    if (trimmed.includes('FROM community_posts p') && trimmed.includes('WHERE p.id = ?')) {
      const [postId] = args as [string];
      const post = state.posts.find((p) => p.id === postId && p.deleted_at === null);
      if (!post) return null;
      const likeCount = state.likes.filter((l) => l.post_id === postId).length;
      const commentCount = state.comments.filter(
        (c) => c.post_id === postId && c.deleted_at === null,
      ).length;
      const includeImageData = trimmed.includes('p.image_data');
      const includeBodyRich = trimmed.includes('p.body_rich');
      return {
        id: post.id,
        community_id: post.community_id,
        user_pseudonym_id: post.user_pseudonym_id,
        title: post.title,
        body: post.body,
        video_url: post.video_url,
        sns_url: post.sns_url ?? null,
        video_urls: post.video_urls ?? null,
        sns_urls: post.sns_urls ?? null,
        image_mime: post.image_mime ?? null,
        image_position: post.image_position ?? 'top',
        has_image: post.image_data ? 1 : 0,
        ...(includeImageData ? { image_data: post.image_data ?? null } : {}),
        ...(includeBodyRich ? { body_rich: post.body_rich ?? null } : {}),
        created_at: post.created_at,
        like_count: likeCount,
        comment_count: commentCount,
        allow_likes: post.allow_likes,
        allow_comments: post.allow_comments,
      };
    }

    if (trimmed.startsWith('SELECT') && trimmed.includes('FROM communities c') && trimmed.includes('WHERE c.id = ?')) {
      const [id] = args as [string];
      const c = state.communities.find((x) => x.id === id && x.deleted_at === null);
      if (!c) return null;
      return {
        id: c.id,
        owner_pseudonym_id: c.owner_pseudonym_id,
        name: c.name,
        description: c.description,
        visibility: c.visibility,
        allow_likes_default: c.allow_likes_default,
        allow_comments_default: c.allow_comments_default,
        created_at: c.created_at,
        deleted_at: c.deleted_at,
        follower_count: state.followers.filter(
          (f) => f.community_id === c.id && f.status === 'active',
        ).length,
        post_count: state.posts.filter(
          (p) => p.community_id === c.id && p.deleted_at === null,
        ).length,
      };
    }

    if (trimmed.startsWith('SELECT community_id, follower_pseudonym_id, status, created_at')
        && trimmed.includes('FROM community_followers')
        && trimmed.includes('WHERE community_id = ? AND follower_pseudonym_id = ?')) {
      const [communityId, followerPseudonymId] = args as [string, string];
      const f = state.followers.find(
        (x) => x.community_id === communityId && x.follower_pseudonym_id === followerPseudonymId,
      );
      return f ?? null;
    }

    if (trimmed.startsWith('SELECT COUNT(*) AS c FROM beta_signups')) {
      return { c: state.betaSignups.length };
    }
    if (trimmed.startsWith('SELECT COUNT(*) AS c FROM risk_survey_reports')) {
      if (trimmed.includes('user_pseudonym_id = ?')) {
        const [pseudonym] = args as [string];
        return {
          c: state.reports.filter((r) => r.user_pseudonym_id === pseudonym).length,
        };
      }
      return { c: state.reports.length };
    }
    if (trimmed.startsWith('SELECT COUNT(*) AS c FROM community_posts')) {
      return {
        c: state.posts.filter((p) => p.deleted_at === null).length,
      };
    }
    if (trimmed.startsWith('SELECT COUNT(*) AS c FROM community_comments')) {
      return {
        c: state.comments.filter((cc) => cc.deleted_at === null).length,
      };
    }
    if (trimmed.startsWith('SELECT COUNT(*) AS c FROM community_likes')) {
      return { c: state.likes.length };
    }
    if (trimmed.startsWith('SELECT COUNT(*) AS c FROM chr_ledger')) {
      return { c: state.ledger.length };
    }
    if (
      trimmed.startsWith('SELECT COALESCE(SUM(amount), 0) AS c FROM chr_ledger') &&
      trimmed.includes('user_pseudonym_id = ?')
    ) {
      const [pseudonym] = args as [string];
      const sum = state.ledger
        .filter((l) => l.user_pseudonym_id === pseudonym)
        .reduce((acc, l) => acc + l.amount, 0);
      return { c: sum };
    }
    if (trimmed.startsWith('SELECT COALESCE(SUM(amount), 0) AS c FROM chr_ledger')) {
      const sum = state.ledger.reduce((acc, l) => acc + l.amount, 0);
      return { c: sum };
    }

    if (trimmed.startsWith('SELECT COALESCE(SUM(amount), 0) AS balance')) {
      const [pseudonym] = args as [string];
      const sum = state.ledger
        .filter((l) => l.user_pseudonym_id === pseudonym)
        .reduce((acc, l) => acc + l.amount, 0);
      return { balance: sum };
    }

    if (
      trimmed.includes('FROM content_pages') &&
      trimmed.includes('WHERE slug = ? AND locale = ?')
    ) {
      const [slug, locale] = args as [string, string];
      const c = state.contentPages.find((p) => p.slug === slug && p.locale === locale);
      return c ?? null;
    }

    if (trimmed.startsWith('SELECT 1 FROM chr_ledger')) {
      const [pseudonym, kind, sourceRef] = args as [string, string, string];
      const hit = state.ledger.find(
        (l) =>
          l.user_pseudonym_id === pseudonym &&
          l.kind === kind &&
          l.source_ref === sourceRef,
      );
      return hit ? { '1': 1 } : null;
    }

    if (trimmed.startsWith('SELECT 1 FROM community_likes')) {
      const [userPseudonymId, postId] = args as [string, string];
      const exists = state.likes.some(
        (l) => l.user_pseudonym_id === userPseudonymId && l.post_id === postId,
      );
      return exists ? { '1': 1 } : null;
    }

    if (trimmed.includes('FROM routine_entries') && trimmed.includes('AND entry_date = ?')) {
      const [pseudonym, entryDate] = args as [string, string];
      const r = state.routine.find(
        (x) => x.user_pseudonym_id === pseudonym && x.entry_date === entryDate,
      );
      if (!r) return null;
      return {
        entry_date: r.entry_date,
        calories_kcal: r.calories_kcal,
        exercise_minutes: r.exercise_minutes,
        exercise_intensity: r.exercise_intensity ?? null,
        sleep_hours: r.sleep_hours,
        note: r.note,
      };
    }
    if (trimmed.includes('FROM feature_requests') && trimmed.includes('WHERE id = ?')) {
      const [id] = args as [string];
      // readFeatureRequestMedia — file_key 포함, deleted 무관(정리 목적).
      if (trimmed.includes('file_key')) {
        const r = state.featureRequests.find((x) => x.id === id);
        if (!r) return null;
        return {
          user_pseudonym_id: r.user_pseudonym_id,
          image_key: r.image_key,
          image_type: r.image_type,
          file_key: r.file_key,
          file_name: r.file_name,
        };
      }
      // readFeatureRequest — 활성 행만.
      const r = state.featureRequests.find(
        (x) => x.id === id && x.deleted_at === null,
      );
      if (!r) return null;
      return {
        id: r.id,
        user_pseudonym_id: r.user_pseudonym_id,
        kind: r.kind,
        title: r.title,
        body: r.body,
        status: r.status,
        admin_feedback: r.admin_feedback,
        admin_feedback_at: r.admin_feedback_at,
        image_key: r.image_key,
        image_type: r.image_type,
        file_name: r.file_name,
        link_url: r.link_url,
        created_at: r.created_at,
        updated_at: r.updated_at,
      };
    }
    throw new Error(`mock-analysis-d1 first() unknown: ${trimmed.substring(0, 80)}`);
  }

  function allStmtAnalysis(sql: string, args: unknown[]): { results: unknown[] } {
    const trimmed = sql.trim();

    // migration 0037 — care_affiliates 목록 (공개=active만 / 관리자=전체).
    if (trimmed.includes('FROM care_affiliates')) {
      const activeOnly = trimmed.includes('WHERE active = 1');
      const rows = state.careAffiliates
        .filter((r) => (activeOnly ? r.active === 1 : true))
        .sort(
          (a, b) =>
            a.category.localeCompare(b.category) ||
            a.sort_order - b.sort_order ||
            a.slug.localeCompare(b.slug),
        );
      return { results: rows };
    }

    const postRowToWire = (post: CommunityPostRow, recentOnly: boolean) => {
      const likeFilter = (l: CommunityLikeRow) => {
        if (l.post_id !== post.id) return false;
        if (!recentOnly) return true;
        const ageMs = Date.now() - new Date(l.created_at).getTime();
        return ageMs <= 86400000;
      };
      return {
        id: post.id,
        community_id: post.community_id,
        user_pseudonym_id: post.user_pseudonym_id,
        title: post.title,
        body: post.body,
        video_url: post.video_url,
        sns_url: post.sns_url ?? null,
        video_urls: post.video_urls ?? null,
        sns_urls: post.sns_urls ?? null,
        image_mime: post.image_mime ?? null,
        image_position: post.image_position ?? 'top',
        has_image: post.image_data ? 1 : 0,
        created_at: post.created_at,
        allow_likes: post.allow_likes,
        allow_comments: post.allow_comments,
        like_count: state.likes.filter(likeFilter).length,
        comment_count: state.comments.filter(
          (c) => c.post_id === post.id && c.deleted_at === null,
        ).length,
      };
    };

    // R9 메시징 ─────────────────────────────────────────────────────────
    if (trimmed.startsWith('SELECT member_pseudonym_id, role, last_read_at')) {
      const [conversationId] = args as [string];
      const rows = state.conversationMembers
        .filter((m) => m.conversation_id === conversationId)
        .map((m) => ({
          member_pseudonym_id: m.member_pseudonym_id,
          role: m.role,
          last_read_at: m.last_read_at,
        }));
      return { results: rows };
    }
    if (trimmed.includes('FROM conversations c') && trimmed.includes('JOIN conversation_members')) {
      const [pseudonym] = args as [string];
      const myConvIds = state.conversationMembers
        .filter((m) => m.member_pseudonym_id === pseudonym)
        .map((m) => m.conversation_id);
      const rows = state.conversations
        .filter((c) => myConvIds.includes(c.id) && c.deleted_at === null)
        .sort((a, b) => (a.created_at > b.created_at ? -1 : 1))
        .map((c) => {
          const m = state.conversationMembers.find(
            (x) => x.conversation_id === c.id && x.member_pseudonym_id === pseudonym,
          );
          return {
            id: c.id,
            kind: c.kind,
            title: c.title,
            owner_pseudonym_id: c.owner_pseudonym_id,
            created_at: c.created_at,
            last_read_at: m?.last_read_at ?? c.created_at,
          };
        });
      return { results: rows };
    }
    if (trimmed.includes('FROM releases') && trimmed.includes('ORDER BY created_at DESC')) {
      const limit = args[args.length - 1] as number;
      const rows = state.releases
        .slice()
        .sort((a, b) => (a.created_at > b.created_at ? -1 : 1))
        .slice(0, limit)
        .map((r) => ({
          id: r.id, component: r.component, version: r.version,
          notes: r.notes, created_at: r.created_at,
        }));
      return { results: rows };
    }
    if (trimmed.includes('FROM notices') && trimmed.includes('ORDER BY pinned DESC')) {
      const limit = args[args.length - 1] as number;
      const publishedOnly = trimmed.includes('WHERE published = 1');
      const rows = state.notices
        .filter((n) => (publishedOnly ? n.published === 1 : true))
        .sort((a, b) => {
          if (a.pinned !== b.pinned) return b.pinned - a.pinned;
          return a.created_at > b.created_at ? -1 : 1;
        })
        .slice(0, limit)
        .map((n) => ({
          id: n.id, title: n.title, body: n.body,
          pinned: n.pinned, published: n.published,
          created_at: n.created_at, updated_at: n.updated_at,
        }));
      return { results: rows };
    }
    // 만료 첨부 목록(cron 정리) — .all() 경로.
    if (trimmed.includes('FROM messages') && trimmed.includes('attachment_expires_at < ?')) {
      const nowIso = args[0] as string;
      const limit = args[args.length - 1] as number;
      const rows = state.messages
        .filter(
          (m) =>
            m.attachment_key !== null &&
            m.attachment_expires_at !== null &&
            m.attachment_expires_at < nowIso &&
            m.deleted_at === null,
        )
        .slice(0, limit)
        .map((m) => ({ id: m.id, attachment_key: m.attachment_key }));
      return { results: rows };
    }
    if (trimmed.includes('FROM messages') && trimmed.includes('ORDER BY created_at DESC')) {
      const limit = args[args.length - 1] as number;
      const conversationId = args[0] as string;
      const before = trimmed.includes('created_at < ?') ? (args[1] as string) : null;
      const rows = state.messages
        .filter(
          (m) =>
            m.conversation_id === conversationId &&
            m.deleted_at === null &&
            (!before || m.created_at < before),
        )
        .sort((a, b) => (a.created_at > b.created_at ? -1 : 1))
        .slice(0, limit)
        .map((m) => ({
          id: m.id,
          sender_pseudonym_id: m.sender_pseudonym_id,
          body: m.body,
          created_at: m.created_at,
          reply_to_message_id: m.reply_to_message_id,
          attachment_name: m.attachment_name,
          attachment_type: m.attachment_type,
          attachment_size: m.attachment_size,
          attachment_expires_at: m.attachment_expires_at,
        }));
      return { results: rows };
    }

    // 답장 인용 미리보기 — SELECT id, sender_pseudonym_id, body FROM messages WHERE id IN (...) AND deleted_at IS NULL
    if (
      trimmed.includes('FROM messages') &&
      trimmed.includes('IN (') &&
      trimmed.includes('sender_pseudonym_id, body')
    ) {
      const ids = args as string[];
      const rows = state.messages
        .filter((m) => ids.includes(m.id) && m.deleted_at === null)
        .map((m) => ({
          id: m.id,
          sender_pseudonym_id: m.sender_pseudonym_id,
          body: m.body,
        }));
      return { results: rows };
    }

    // 메시지 반응 일괄 조회 — SELECT message_id, emoji, user_pseudonym_id FROM message_reactions WHERE message_id IN (...)
    if (trimmed.includes('FROM message_reactions')) {
      const ids = args as string[];
      const rows = state.messageReactions
        .filter((r) => ids.includes(r.message_id))
        .map((r) => ({
          message_id: r.message_id,
          emoji: r.emoji,
          user_pseudonym_id: r.user_pseudonym_id,
        }));
      return { results: rows };
    }

    if (
      trimmed.includes('FROM community_posts p') &&
      trimmed.includes("ORDER BY p.created_at DESC") &&
      !trimmed.includes('like_count DESC')
    ) {
      const limit = args[args.length - 1] as number;
      // 마지막 LIMIT 인자 전 모든 인자는 필터 — community_id 와 cursor 가 순서대로 들어옴.
      const filterArgs = args.slice(0, -1);
      let communityId: string | null = null;
      let cursor: string | null = null;
      if (trimmed.includes('p.community_id = ?')) {
        communityId = filterArgs.shift() as string;
      }
      if (trimmed.includes('p.created_at < ?')) {
        cursor = filterArgs.shift() as string;
      }
      const rows = state.posts
        .filter((p) =>
          p.deleted_at === null
          && (!communityId || p.community_id === communityId)
          && (!cursor || p.created_at < cursor)
        )
        .sort((a, b) => (a.created_at > b.created_at ? -1 : 1))
        .slice(0, limit)
        .map((p) => postRowToWire(p, false));
      return { results: rows };
    }

    if (
      trimmed.startsWith('SELECT')
      && trimmed.includes('FROM communities c')
      && trimmed.includes('ORDER BY')
    ) {
      const rows = state.communities
        .filter((c) => {
          if (trimmed.includes('AND c.id != ') && c.id === '_lounge') return false;
          if (trimmed.includes("WHERE c.deleted_at IS NULL") && c.deleted_at !== null) return false;
          if (trimmed.includes("c.visibility = 'public'") && c.visibility !== 'public') return false;
          return true;
        })
        .map((c) => ({
          id: c.id,
          owner_pseudonym_id: c.owner_pseudonym_id,
          name: c.name,
          description: c.description,
          visibility: c.visibility,
          allow_likes_default: c.allow_likes_default,
          allow_comments_default: c.allow_comments_default,
          created_at: c.created_at,
          deleted_at: c.deleted_at,
          follower_count: state.followers.filter(
            (f) => f.community_id === c.id && f.status === 'active',
          ).length,
          post_count: state.posts.filter(
            (p) => p.community_id === c.id && p.deleted_at === null,
          ).length,
        }));
      return { results: rows };
    }

    if (trimmed.startsWith('SELECT admin_pseudonym_id FROM community_admins')) {
      const [communityId] = args as [string];
      const rows = state.communityAdmins
        .filter((a) => a.community_id === communityId)
        .sort((a, b) => (a.created_at > b.created_at ? 1 : -1))
        .map((a) => ({ admin_pseudonym_id: a.admin_pseudonym_id }));
      return { results: rows };
    }
    if (trimmed.includes('FROM community_followers') && trimmed.includes('WHERE community_id = ?')) {
      const [communityId] = args as [string];
      const rows = state.followers
        .filter((f) => f.community_id === communityId)
        .map((f) => ({
          community_id: f.community_id,
          follower_pseudonym_id: f.follower_pseudonym_id,
          status: f.status,
          created_at: f.created_at,
        }));
      return { results: rows };
    }

    if (
      trimmed.includes('FROM community_posts p') &&
      trimmed.includes('like_count DESC')
    ) {
      const [limit] = args as [number];
      const sevenDaysAgo = Date.now() - 7 * 86400000;
      const rows = state.posts
        .filter(
          (p) =>
            p.deleted_at === null &&
            new Date(p.created_at).getTime() > sevenDaysAgo,
        )
        .map((p) => postRowToWire(p, true))
        .sort((a, b) => {
          if (a.like_count !== b.like_count) return b.like_count - a.like_count;
          return a.created_at > b.created_at ? -1 : 1;
        })
        .slice(0, limit);
      return { results: rows };
    }

    if (
      trimmed.startsWith('SELECT txn_id, amount, kind, source_ref, created_at') &&
      trimmed.includes('FROM chr_ledger')
    ) {
      const [pseudonym, limit] = args as [string, number];
      const rows = state.ledger
        .filter((l) => l.user_pseudonym_id === pseudonym)
        .sort((a, b) => (a.created_at > b.created_at ? -1 : 1))
        .slice(0, limit)
        .map((l) => ({
          txn_id: l.txn_id,
          amount: l.amount,
          kind: l.kind,
          source_ref: l.source_ref,
          created_at: l.created_at,
        }));
      return { results: rows };
    }

    if (trimmed.startsWith('SELECT id, email_pseudonym, country, age_group')) {
      const limit = args[args.length - 1] as number;
      let pool = [...state.betaSignups];
      if (trimmed.includes('AND created_at < ?')) {
        const cursor = args[0] as string;
        pool = pool.filter((b) => b.created_at < cursor);
      }
      const rows = pool
        .sort((a, b) => (a.created_at > b.created_at ? -1 : 1))
        .slice(0, limit);
      return { results: rows };
    }

    if (trimmed.includes('FROM content_pages') && trimmed.includes('ORDER BY slug')) {
      const rows = [...state.contentPages].sort((a, b) => (a.slug > b.slug ? 1 : -1));
      return { results: rows };
    }

    if (trimmed.includes('FROM community_comments') && trimmed.includes('WHERE post_id = ?')) {
      const [postId] = args as [string];
      const rows = state.comments
        .filter((c) => c.post_id === postId && c.deleted_at === null)
        .sort((a, b) => (a.created_at > b.created_at ? 1 : -1))
        .map((c) => ({
          id: c.id,
          post_id: c.post_id,
          user_pseudonym_id: c.user_pseudonym_id,
          body: c.body,
          accepts_dm: c.accepts_dm,
          created_at: c.created_at,
        }));
      return { results: rows };
    }

    if (
      trimmed.includes('FROM routine_entries') &&
      trimmed.includes('entry_date >= ?') &&
      trimmed.includes('entry_date <= ?')
    ) {
      const [pseudonym, fromDate, toDate] = args as [string, string, string];
      const rows = state.routine
        .filter(
          (r) =>
            r.user_pseudonym_id === pseudonym &&
            r.entry_date >= fromDate &&
            r.entry_date <= toDate,
        )
        .sort((a, b) => (a.entry_date > b.entry_date ? 1 : -1))
        .map((r) => ({
          entry_date: r.entry_date,
          calories_kcal: r.calories_kcal,
          exercise_minutes: r.exercise_minutes,
          exercise_intensity: r.exercise_intensity ?? null,
          sleep_hours: r.sleep_hours,
          note: r.note,
        }));
      return { results: rows };
    }
    if (trimmed.includes('FROM medical_conditions')) {
      const [user_pseudonym_id] = args as [string];
      const rows = state.medicalConditions
        .filter((r) => r.user_pseudonym_id === user_pseudonym_id && r.granted === 1)
        .sort((a, b) =>
          a.category === b.category
            ? a.code.localeCompare(b.code)
            : a.category.localeCompare(b.category),
        )
        .map((r) => ({
          code: r.code,
          category: r.category,
          granted: r.granted,
          updated_at: r.updated_at,
        }));
      return { results: rows };
    }
    if (trimmed.includes('FROM surgery_records')) {
      return { results: [] };
    }
    if (trimmed.includes('FROM feature_requests')) {
      const ownerScoped = trimmed.includes('user_pseudonym_id = ?');
      let rows = state.featureRequests.filter((r) => r.deleted_at === null);
      const binds = [...args];
      if (ownerScoped) {
        const pseudonym = binds[0] as string;
        rows = rows.filter((r) => r.user_pseudonym_id === pseudonym);
      } else {
        // 관리자 목록 — 선택적 검색(title/body LIKE)·종류 필터, 마지막 bind 는 limit.
        let bi = 0;
        if (trimmed.includes('title LIKE ?')) {
          const needle = String(binds[bi]).replace(/%/g, '');
          bi += 2; // 동일 like 를 title/body 에 각각 bind.
          rows = rows.filter(
            (r) => r.title.includes(needle) || r.body.includes(needle),
          );
        }
        if (trimmed.includes('kind = ?')) {
          const kind = binds[bi++] as string;
          rows = rows.filter((r) => r.kind === kind);
        }
      }
      rows = rows.slice().sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
      return {
        results: rows.map((r) => ({
          id: r.id,
          user_pseudonym_id: r.user_pseudonym_id,
          kind: r.kind,
          title: r.title,
          body: r.body,
          status: r.status,
          admin_feedback: r.admin_feedback,
          admin_feedback_at: r.admin_feedback_at,
          image_key: r.image_key,
          image_type: r.image_type,
          file_name: r.file_name,
          link_url: r.link_url,
          created_at: r.created_at,
          updated_at: r.updated_at,
        })),
      };
    }
    throw new Error(`mock-analysis-d1 all() unknown: ${trimmed.substring(0, 80)}`);
  }

  const makeStmt = (sql: string) => {
    const stmt = {
      _args: [] as unknown[],
      bind(...args: unknown[]) {
        stmt._args = args;
        return stmt;
      },
      async first<T>(): Promise<T | null> {
        return firstStmtAnalysis(sql, stmt._args) as T | null;
      },
      async all<T>(): Promise<{ results: T[] }> {
        return allStmtAnalysis(sql, stmt._args) as { results: T[] };
      },
      async run() {
        return runStmt(sql, stmt._args);
      },
    };
    return stmt;
  };

  const db = {
    prepare(sql: string) {
      return makeStmt(sql);
    },
    async batch(stmts: Array<{ run: () => Promise<unknown> }>) {
      const results = [];
      for (const s of stmts) {
        results.push(await s.run());
      }
      return results;
    },
    exec() {
      throw new Error('mock-analysis-d1 exec() not implemented');
    },
    dump() {
      throw new Error('mock-analysis-d1 dump() not implemented');
    },
    withSession() {
      return db;
    },
  } as unknown as D1Database;

  return { db, state };
}
