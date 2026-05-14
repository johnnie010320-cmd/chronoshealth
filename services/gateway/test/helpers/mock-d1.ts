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

export type MockD1State = {
  users: UserRow[];
  tokens: SessionRow[];
  consents: ConsentRow[];
};

export function makeMockIdentityDb(initial?: Partial<MockD1State>): {
  db: D1Database;
  state: MockD1State;
} {
  const state: MockD1State = {
    users: initial?.users ?? [],
    tokens: initial?.tokens ?? [],
    consents: initial?.consents ?? [],
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
