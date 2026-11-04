import { describe, it, expect, beforeEach } from 'vitest';
import app from '../src/index.js';
import {
  makeMockIdentityDb,
  makeMockAnalysisDb,
  issueTestToken,
  type MockD1State,
} from './helpers/mock-d1.js';
import { __clearIpRateLimit } from '../src/middleware/ip-rate-limit.js';
import { escapeLike } from '../src/messaging/storage.js';

// 대화 내 검색 — 멤버만, 본문·첨부명, 삭제 제외, 와일드카드는 글자 그대로, 입력 검증.
describe('메시지 검색', () => {
  let identity: ReturnType<typeof makeMockIdentityDb>;
  let analysis: ReturnType<typeof makeMockAnalysisDb>;
  let aliceToken: string;
  let carolToken: string;

  function seedUser(state: MockD1State, pseudo: string, nickname: string): void {
    state.users.push({
      user_pseudonym_id: pseudo,
      name: null,
      email: `${nickname}@example.com`,
      phone: null,
      birth_year: null,
      sex: null,
      nickname,
      role: 'user',
    });
  }

  beforeEach(() => {
    identity = makeMockIdentityDb();
    analysis = makeMockAnalysisDb();
    __clearIpRateLimit();
    seedUser(identity.state, 'pseudo-alice', 'alice');
    seedUser(identity.state, 'pseudo-bob', 'bob');
    seedUser(identity.state, 'pseudo-carol', 'carol');
    aliceToken = issueTestToken(identity.state, { pseudonym: 'pseudo-alice' }).token;
    carolToken = issueTestToken(identity.state, { pseudonym: 'pseudo-carol' }).token;
  });

  const env = () => ({
    IDENTITY_DB: identity.db,
    DB: analysis.db,
    BETA_SIGNUP_HMAC_SALT: 'test',
    ENVIRONMENT: 'dev' as const,
  });
  const req = (path: string, token: string, init?: RequestInit) =>
    app.request(
      path,
      { ...init, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } },
      env(),
    );

  type Result = { id: string; body: string; senderNickname: string | null; isMine: boolean };

  async function openDmWithMessages(bodies: string[]): Promise<{ convId: string; ids: string[] }> {
    const open = await req('/api/v1/messages/dm', aliceToken, {
      method: 'POST',
      body: JSON.stringify({ nickname: 'bob' }),
    });
    const convId = ((await open.json()) as { conversation: { id: string } }).conversation.id;
    const ids: string[] = [];
    for (const body of bodies) {
      const r = await req(`/api/v1/messages/conversations/${convId}/messages`, aliceToken, {
        method: 'POST',
        body: JSON.stringify({ body }),
      });
      expect(r.status).toBe(200);
      ids.push(((await r.json()) as { message: { id: string } }).message.id);
    }
    return { convId, ids };
  }

  const search = async (convId: string, q: string, token = aliceToken) =>
    req(`/api/v1/messages/conversations/${convId}/search?q=${encodeURIComponent(q)}`, token);

  it('본문에 검색어가 든 메시지만 돌려준다(한글·영문 대소문자 무시)', async () => {
    const { convId } = await openDmWithMessages(['내일 점심 먹자', '회의는 3시', 'Lunch at noon', '점심 메뉴 추천']);
    const r1 = await search(convId, '점심');
    expect(r1.status).toBe(200);
    const d1 = (await r1.json()) as { results: Result[]; truncated: boolean };
    expect(d1.results.map((x) => x.body).sort()).toEqual(['내일 점심 먹자', '점심 메뉴 추천']);
    expect(d1.results[0]?.senderNickname).toBe('alice');
    expect(d1.results[0]?.isMine).toBe(true);
    expect(d1.truncated).toBe(false);

    const r2 = await search(convId, 'LUNCH');
    expect(((await r2.json()) as { results: Result[] }).results.map((x) => x.body)).toEqual(['Lunch at noon']);
  });

  it('삭제된 메시지는 검색되지 않는다', async () => {
    const { convId, ids } = await openDmWithMessages(['비밀 번호는 1234', '비밀 아님']);
    const del = await req(`/api/v1/messages/conversations/${convId}/messages/${ids[0]}`, aliceToken, {
      method: 'DELETE',
    });
    expect(del.status).toBeLessThan(300);
    const d = (await (await search(convId, '비밀')).json()) as { results: Result[] };
    expect(d.results.map((x) => x.body)).toEqual(['비밀 아님']);
  });

  it('%·_ 는 와일드카드가 아니라 글자 그대로 찾는다', async () => {
    const { convId } = await openDmWithMessages(['할인 50% 쿠폰', '할인 쿠폰', 'file_name 확인']);
    const d1 = (await (await search(convId, '%')).json()) as { results: Result[] };
    expect(d1.results.map((x) => x.body)).toEqual(['할인 50% 쿠폰']);
    const d2 = (await (await search(convId, '_')).json()) as { results: Result[] };
    expect(d2.results.map((x) => x.body)).toEqual(['file_name 확인']);
    expect(escapeLike('a%b_c\\d')).toBe('a\\%b\\_c\\\\d');
  });

  it('대화 멤버가 아니면 403', async () => {
    const { convId } = await openDmWithMessages(['안녕']);
    const r = await search(convId, '안녕', carolToken);
    expect(r.status).toBe(403);
  });

  it('빈 검색어·51자 이상은 400', async () => {
    const { convId } = await openDmWithMessages(['안녕']);
    expect((await search(convId, '   ')).status).toBe(400);
    expect((await search(convId, 'x'.repeat(51))).status).toBe(400);
  });

  it('결과가 없으면 빈 목록', async () => {
    const { convId } = await openDmWithMessages(['안녕']);
    const d = (await (await search(convId, '없는말')).json()) as { results: Result[] };
    expect(d.results).toEqual([]);
  });
});
