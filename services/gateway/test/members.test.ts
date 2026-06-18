import { describe, it, expect, beforeEach } from 'vitest';
import app from '../src/index.js';
import {
  makeMockIdentityDb,
  makeMockAnalysisDb,
  issueTestToken,
  type MockD1State,
} from './helpers/mock-d1.js';
import { __clearIpRateLimit } from '../src/middleware/ip-rate-limit.js';

// 닉네임 자동검색 — prefix 매칭, 닉네임만 반환, 본인 제외.
describe('회원 닉네임 검색', () => {
  let identity: ReturnType<typeof makeMockIdentityDb>;
  let analysis: ReturnType<typeof makeMockAnalysisDb>;
  let meToken: string;

  function seedUser(state: MockD1State, pseudo: string, nickname: string | null): void {
    state.users.push({
      user_pseudonym_id: pseudo,
      name: null, email: `${pseudo}@x.dev`, phone: null, birth_year: null, sex: null,
      nickname, role: 'user',
    });
  }

  beforeEach(() => {
    identity = makeMockIdentityDb();
    analysis = makeMockAnalysisDb();
    __clearIpRateLimit();
    seedUser(identity.state, 'me-1', 'mealpha');
    seedUser(identity.state, 'u-1', 'alice');
    seedUser(identity.state, 'u-2', 'alex');
    seedUser(identity.state, 'u-3', 'bob');
    seedUser(identity.state, 'u-4', null);
    meToken = issueTestToken(identity.state, { pseudonym: 'me-1' }).token;
  });

  const env = () => ({
    IDENTITY_DB: identity.db,
    DB: analysis.db,
    BETA_SIGNUP_HMAC_SALT: 'test',
    ENVIRONMENT: 'dev' as const,
  });

  const search = (q: string) =>
    app.request(
      `/api/v1/members/search?q=${encodeURIComponent(q)}`,
      { headers: { Authorization: `Bearer ${meToken}` } },
      env(),
    );

  it('prefix 매칭 닉네임 반환', async () => {
    const r = await search('al');
    expect(r.status).toBe(200);
    const data = (await r.json()) as { nicknames: string[] };
    expect(data.nicknames.sort()).toEqual(['alex', 'alice']);
  });

  it('본인 닉네임은 제외', async () => {
    const r = await search('me');
    const data = (await r.json()) as { nicknames: string[] };
    expect(data.nicknames).toEqual([]);
  });

  it('빈 쿼리는 빈 배열', async () => {
    const r = await search('');
    const data = (await r.json()) as { nicknames: string[] };
    expect(data.nicknames).toEqual([]);
  });

  it('미인증 401', async () => {
    const r = await app.request('/api/v1/members/search?q=al', {}, env());
    expect(r.status).toBe(401);
  });
});
