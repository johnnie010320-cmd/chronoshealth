import { describe, it, expect, beforeEach } from 'vitest';
import app from '../src/index.js';
import {
  makeMockIdentityDb,
  makeMockAnalysisDb,
  issueTestToken,
  type MockD1State,
} from './helpers/mock-d1.js';
import { __clearIpRateLimit } from '../src/middleware/ip-rate-limit.js';

// R9 메시징 — DM / 대화방 / 메시지 / 미읽음 / 모더레이션.
describe('R9 메시징', () => {
  let identity: ReturnType<typeof makeMockIdentityDb>;
  let analysis: ReturnType<typeof makeMockAnalysisDb>;
  let aliceToken: string;
  let bobToken: string;
  let aliceId: string;
  let bobId: string;

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
    aliceId = 'pseudo-alice';
    bobId = 'pseudo-bob';
    seedUser(identity.state, aliceId, 'alice');
    seedUser(identity.state, bobId, 'bob');
    aliceToken = issueTestToken(identity.state, { pseudonym: aliceId }).token;
    bobToken = issueTestToken(identity.state, { pseudonym: bobId }).token;
  });

  const env = () => ({
    IDENTITY_DB: identity.db,
    DB: analysis.db,
    BETA_SIGNUP_HMAC_SALT: 'test',
    ENVIRONMENT: 'dev' as const,
  });

  const auth = (token: string) => ({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' });

  function req(path: string, token: string, init?: RequestInit) {
    return app.request(
      path,
      { ...init, headers: { ...auth(token), ...(init?.headers ?? {}) } },
      env(),
    );
  }

  it('닉네임으로 DM 열기 → kind=dm, displayName=상대 닉네임', async () => {
    const r = await req('/api/v1/messages/dm', aliceToken, {
      method: 'POST',
      body: JSON.stringify({ nickname: 'bob' }),
    });
    expect(r.status).toBe(200);
    const data = (await r.json()) as { conversation: { kind: string; displayName: string } };
    expect(data.conversation.kind).toBe('dm');
    expect(data.conversation.displayName).toBe('bob');
  });

  it('존재하지 않는 닉네임 DM → 404 USER_NOT_FOUND', async () => {
    const r = await req('/api/v1/messages/dm', aliceToken, {
      method: 'POST',
      body: JSON.stringify({ nickname: 'nobody' }),
    });
    expect(r.status).toBe(404);
  });

  it('자기 자신 DM → 400 CANNOT_DM_SELF', async () => {
    const r = await req('/api/v1/messages/dm', aliceToken, {
      method: 'POST',
      body: JSON.stringify({ nickname: 'alice' }),
    });
    expect(r.status).toBe(400);
    const data = (await r.json()) as { error: { code: string } };
    expect(data.error.code).toBe('CANNOT_DM_SELF');
  });

  it('DM 메시지 전송 → 상대 목록에 미읽음 1 + lastMessage, 읽으면 0', async () => {
    const open = await req('/api/v1/messages/dm', aliceToken, {
      method: 'POST',
      body: JSON.stringify({ nickname: 'bob' }),
    });
    const convId = ((await open.json()) as { conversation: { id: string } }).conversation.id;

    const send = await req(`/api/v1/messages/conversations/${convId}/messages`, aliceToken, {
      method: 'POST',
      body: JSON.stringify({ body: '안녕 bob!' }),
    });
    expect(send.status).toBe(200);

    // bob 의 대화 목록 — 미읽음 1.
    const list1 = await req('/api/v1/messages/conversations', bobToken);
    const conv1 = ((await list1.json()) as {
      conversations: Array<{ id: string; unreadCount: number; lastMessage: { body: string; senderNickname: string } | null }>;
    }).conversations.find((x) => x.id === convId);
    expect(conv1).toBeDefined();
    expect(conv1!.unreadCount).toBe(1);
    expect(conv1!.lastMessage?.body).toBe('안녕 bob!');
    expect(conv1!.lastMessage?.senderNickname).toBe('alice');

    // bob 이 읽음 처리 → 미읽음 0.
    const read = await req(`/api/v1/messages/conversations/${convId}/read`, bobToken, { method: 'POST' });
    expect(read.status).toBe(200);
    const list2 = await req('/api/v1/messages/conversations', bobToken);
    const conv2 = ((await list2.json()) as {
      conversations: Array<{ id: string; unreadCount: number }>;
    }).conversations.find((x) => x.id === convId);
    expect(conv2!.unreadCount).toBe(0);
  });

  it('메시지 목록 — isMine + senderNickname, 오래된→최신 순', async () => {
    const open = await req('/api/v1/messages/dm', aliceToken, {
      method: 'POST',
      body: JSON.stringify({ nickname: 'bob' }),
    });
    const convId = ((await open.json()) as { conversation: { id: string } }).conversation.id;
    await req(`/api/v1/messages/conversations/${convId}/messages`, aliceToken, {
      method: 'POST',
      body: JSON.stringify({ body: 'first' }),
    });
    await req(`/api/v1/messages/conversations/${convId}/messages`, bobToken, {
      method: 'POST',
      body: JSON.stringify({ body: 'second' }),
    });

    const r = await req(`/api/v1/messages/conversations/${convId}/messages`, aliceToken);
    const msgs = ((await r.json()) as {
      messages: Array<{ body: string; isMine: boolean; senderNickname: string }>;
    }).messages;
    expect(msgs.map((m) => m.body)).toEqual(['first', 'second']);
    expect(msgs[0]!.isMine).toBe(true); // alice
    expect(msgs[1]!.isMine).toBe(false); // bob
    expect(msgs[1]!.senderNickname).toBe('bob');
  });

  it('대화방 생성 + 초대 → 초대받은 멤버 목록에 표시', async () => {
    const r = await req('/api/v1/messages/rooms', aliceToken, {
      method: 'POST',
      body: JSON.stringify({ title: '건강 모임', inviteNicknames: ['bob'] }),
    });
    expect(r.status).toBe(200);
    const convId = ((await r.json()) as { conversation: { id: string; displayName: string } }).conversation.id;

    const list = await req('/api/v1/messages/conversations', bobToken);
    const conv = ((await list.json()) as {
      conversations: Array<{ id: string; kind: string; displayName: string; memberCount: number }>;
    }).conversations.find((x) => x.id === convId);
    expect(conv).toBeDefined();
    expect(conv!.kind).toBe('room');
    expect(conv!.displayName).toBe('건강 모임');
    expect(conv!.memberCount).toBe(2);
  });

  it('멤버 아닌 대화 메시지 조회 → 403 NOT_A_MEMBER', async () => {
    // alice 단독 방 생성(초대 없음).
    const r = await req('/api/v1/messages/rooms', aliceToken, {
      method: 'POST',
      body: JSON.stringify({ title: 'alice solo' }),
    });
    const convId = ((await r.json()) as { conversation: { id: string } }).conversation.id;

    const bobTry = await req(`/api/v1/messages/conversations/${convId}/messages`, bobToken);
    expect(bobTry.status).toBe(403);
  });

  it('금지 키워드 메시지 → 400 FORBIDDEN_KEYWORD', async () => {
    const open = await req('/api/v1/messages/dm', aliceToken, {
      method: 'POST',
      body: JSON.stringify({ nickname: 'bob' }),
    });
    const convId = ((await open.json()) as { conversation: { id: string } }).conversation.id;
    const r = await req(`/api/v1/messages/conversations/${convId}/messages`, aliceToken, {
      method: 'POST',
      body: JSON.stringify({ body: '이건 진단입니다' }),
    });
    expect(r.status).toBe(400);
    const data = (await r.json()) as { error: { code: string } };
    expect(data.error.code).toBe('FORBIDDEN_KEYWORD');
  });

  it('비로그인 → 401', async () => {
    const r = await app.request(
      '/api/v1/messages/conversations',
      { method: 'GET' },
      env(),
    );
    expect(r.status).toBe(401);
  });
});
