// In-memory D1 mock — vitest용. 정공법은 @cloudflare/vitest-pool-workers (miniflare D1)이지만
// 의존성 최소화를 위해 SQL 패턴 매칭 방식 채택. SQL 패턴이 변하면 본 mock 갱신 필요.

type UserRow = {
  user_pseudonym_id: string;
  name: string;
  email: string;
  phone: string;
  birth_year: number;
  sex: 'male' | 'female' | 'other';
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

  function runStmt(sql: string, args: unknown[]): { success: true } {
    const trimmed = sql.trim();

    if (trimmed.startsWith('INSERT INTO users')) {
      const [user_pseudonym_id, name, email, phone, birth_year, sex] = args as [
        string,
        string,
        string,
        string,
        number,
        UserRow['sex'],
      ];
      if (state.users.some((u) => u.email === email || u.phone === phone)) {
        throw new Error('UNIQUE constraint failed: users.email or users.phone');
      }
      state.users.push({ user_pseudonym_id, name, email, phone, birth_year, sex });
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

    if (trimmed.includes('FROM users WHERE email = ? OR phone = ?')) {
      const [email, phone] = args as [string, string];
      const hit = state.users.find((u) => u.email === email || u.phone === phone);
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

    if (trimmed.includes('FROM users WHERE user_pseudonym_id = ?')) {
      const [pseudo] = args as [string];
      const u = state.users.find((x) => x.user_pseudonym_id === pseudo);
      return u ? { name: u.name } : null;
    }

    throw new Error(`mock-d1 unknown first(): ${trimmed.substring(0, 80)}`);
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
  sleep_hours: number | null;
  note: string | null;
  updated_at: string;
};

type CommunityPostRow = {
  id: string;
  user_pseudonym_id: string;
  title: string;
  body: string;
  video_url: string | null;
  created_at: string;
  deleted_at: string | null;
};

type CommunityCommentRow = {
  id: string;
  post_id: string;
  user_pseudonym_id: string;
  body: string;
  created_at: string;
  deleted_at: string | null;
};

type CommunityLikeRow = {
  user_pseudonym_id: string;
  post_id: string;
  created_at: string;
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
};

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
  };
  let nextResponseId = 1;

  function runStmt(sql: string, args: unknown[]): {
    success: true;
    meta: { last_row_id?: number };
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

    if (trimmed.startsWith('INSERT INTO community_posts')) {
      const [id, user_pseudonym_id, title, body, video_url] = args as [
        string, string, string, string, string | null,
      ];
      state.posts.push({
        id,
        user_pseudonym_id,
        title,
        body,
        video_url,
        created_at: new Date().toISOString(),
        deleted_at: null,
      });
      return { success: true, meta: {} };
    }

    if (trimmed.startsWith('INSERT INTO community_comments')) {
      const [id, post_id, user_pseudonym_id, body] = args as [
        string, string, string, string,
      ];
      state.comments.push({
        id,
        post_id,
        user_pseudonym_id,
        body,
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
      const [postId, userPseudonymId] = args as [string, string];
      const post = state.posts.find(
        (p) => p.id === postId && p.user_pseudonym_id === userPseudonymId && p.deleted_at === null,
      );
      if (!post) return { success: true, meta: { changes: 0 } };
      post.deleted_at = new Date().toISOString();
      return { success: true, meta: { changes: 1 } };
    }

    if (trimmed.startsWith('INSERT INTO routine_entries')) {
      const [
        user_pseudonym_id,
        entry_date,
        calories_kcal,
        exercise_minutes,
        sleep_hours,
        note,
      ] = args as [
        string,
        string,
        number | null,
        number | null,
        number | null,
        string | null,
      ];
      const existing = state.routine.find(
        (r) => r.user_pseudonym_id === user_pseudonym_id && r.entry_date === entry_date,
      );
      if (existing) {
        existing.calories_kcal = calories_kcal;
        existing.exercise_minutes = exercise_minutes;
        existing.sleep_hours = sleep_hours;
        existing.note = note;
        existing.updated_at = new Date().toISOString();
      } else {
        state.routine.push({
          user_pseudonym_id,
          entry_date,
          calories_kcal,
          exercise_minutes,
          sleep_hours,
          note,
          updated_at: new Date().toISOString(),
        });
      }
      return { success: true, meta: {} };
    }

    throw new Error(`mock-analysis-d1 unknown statement: ${trimmed.substring(0, 80)}`);
  }

  function firstStmtAnalysis(sql: string, args: unknown[]): unknown {
    const trimmed = sql.trim();
    if (trimmed.includes('FROM beta_signups WHERE email_pseudonym = ?')) {
      const [pseudonym] = args as [string];
      return state.betaSignups.find((r) => r.email_pseudonym === pseudonym)
        ? { '1': 1 }
        : null;
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
    if (trimmed.startsWith('SELECT p.id, p.user_pseudonym_id, p.title, p.body, p.video_url, p.created_at,') && trimmed.includes('WHERE p.id = ?')) {
      const [postId] = args as [string];
      const post = state.posts.find((p) => p.id === postId && p.deleted_at === null);
      if (!post) return null;
      const likeCount = state.likes.filter((l) => l.post_id === postId).length;
      const commentCount = state.comments.filter(
        (c) => c.post_id === postId && c.deleted_at === null,
      ).length;
      return {
        id: post.id,
        user_pseudonym_id: post.user_pseudonym_id,
        title: post.title,
        body: post.body,
        video_url: post.video_url,
        created_at: post.created_at,
        like_count: likeCount,
        comment_count: commentCount,
      };
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
        sleep_hours: r.sleep_hours,
        note: r.note,
      };
    }
    throw new Error(`mock-analysis-d1 first() unknown: ${trimmed.substring(0, 80)}`);
  }

  function allStmtAnalysis(sql: string, args: unknown[]): { results: unknown[] } {
    const trimmed = sql.trim();

    const postRowToWire = (post: CommunityPostRow, recentOnly: boolean) => {
      const likeFilter = (l: CommunityLikeRow) => {
        if (l.post_id !== post.id) return false;
        if (!recentOnly) return true;
        const ageMs = Date.now() - new Date(l.created_at).getTime();
        return ageMs <= 86400000;
      };
      return {
        id: post.id,
        user_pseudonym_id: post.user_pseudonym_id,
        title: post.title,
        body: post.body,
        video_url: post.video_url,
        created_at: post.created_at,
        like_count: state.likes.filter(likeFilter).length,
        comment_count: state.comments.filter(
          (c) => c.post_id === post.id && c.deleted_at === null,
        ).length,
      };
    };

    if (
      trimmed.startsWith('SELECT p.id, p.user_pseudonym_id, p.title, p.body, p.video_url, p.created_at,') &&
      trimmed.includes('FROM community_posts p') &&
      trimmed.includes("ORDER BY p.created_at DESC") &&
      !trimmed.includes('like_count DESC')
    ) {
      const limit = args[args.length - 1] as number;
      const cursor = args.length > 1 ? (args[0] as string) : null;
      const rows = state.posts
        .filter((p) => p.deleted_at === null && (!cursor || p.created_at < cursor))
        .sort((a, b) => (a.created_at > b.created_at ? -1 : 1))
        .slice(0, limit)
        .map((p) => postRowToWire(p, false));
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
          sleep_hours: r.sleep_hours,
          note: r.note,
        }));
      return { results: rows };
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
