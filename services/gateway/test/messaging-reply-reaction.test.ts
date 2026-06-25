import { describe, it, expect, beforeEach } from 'vitest';
import app from '../src/index.js';
import {
  makeMockIdentityDb,
  makeMockAnalysisDb,
  issueTestToken,
  type MockD1State,
} from './helpers/mock-d1.js';
import { __clearIpRateLimit } from '../src/middleware/ip-rate-limit.js';

// R9 메시징 — 답장(reply) + 이모티콘 반응(reaction). 2026-06-25 죠니 요청.
describe('R9 메시징 — 답장 + 반응', () => {
  let identity: ReturnType<typeof makeMockIdentityDb>;
  let analysis: ReturnType<typeof makeMockAnalysisDb>;
  let aliceToken: string;
  let bobToken: string;
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
    bobToken = issueTestToken(identity.state, { pseudonym: 'pseudo-bob' }).token;
    carolToken = issueTestToken(identity.state, { pseudonym: 'pseudo-carol' }).token;
  });

  const env = () => ({
    IDENTITY_DB: identity.db,
    DB: analysis.db,
    BETA_SIGNUP_HMAC_SALT: 'test',
    ENVIRONMENT: 'dev' as const,
  });

  const auth = (token: string) => ({
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  });

  function req(path: string, token: string, init?: RequestInit) {
    return app.request(
      path,
      { ...init, headers: { ...auth(token), ...(init?.headers ?? {}) } },
      env(),
    );
  }

  // alice→bob DM 개설 + alice 메시지 1건 → { convId, msgId } 반환.
  async function setupDmWithMessage(): Promise<{ convId: string; msgId: string }> {
    const dm = await req('/api/v1/messages/dm', aliceToken, {
      method: 'POST',
      body: JSON.stringify({ nickname: 'bob' }),
    });
    const convId = ((await dm.json()) as { conversation: { id: string } }).conversation.id;
    const sent = await req(`/api/v1/messages/conversations/${convId}/messages`, aliceToken, {
      method: 'POST',
      body: JSON.stringify({ body: '안녕 bob' }),
    });
    const msgId = ((await sent.json()) as { message: { id: string } }).message.id;
    return { convId, msgId };
  }

  it('답장 전송 → 목록에 replyTo 인용(원본 발신자+본문) 포함', async () => {
    const { convId, msgId } = await setupDmWithMessage();
    const reply = await req(`/api/v1/messages/conversations/${convId}/messages`, bobToken, {
      method: 'POST',
      body: JSON.stringify({ body: '응 안녕!', replyToMessageId: msgId }),
    });
    expect(reply.status).toBe(200);

    const list = await req(`/api/v1/messages/conversations/${convId}/messages`, bobToken);
    const { messages } = (await list.json()) as {
      messages: {
        body: string;
        replyTo: { id: string; senderNickname: string | null; bodyPreview: string } | null;
      }[];
    };
    const replyMsg = messages.find((m) => m.body === '응 안녕!');
    expect(replyMsg?.replyTo?.id).toBe(msgId);
    expect(replyMsg?.replyTo?.senderNickname).toBe('alice');
    expect(replyMsg?.replyTo?.bodyPreview).toBe('안녕 bob');
  });

  it('존재하지 않는 메시지에 답장 → 400 REPLY_TARGET_NOT_FOUND', async () => {
    const { convId } = await setupDmWithMessage();
    const reply = await req(`/api/v1/messages/conversations/${convId}/messages`, bobToken, {
      method: 'POST',
      body: JSON.stringify({ body: 'x', replyToMessageId: 'no-such-id' }),
    });
    expect(reply.status).toBe(400);
    const data = (await reply.json()) as { error: { code: string } };
    expect(data.error.code).toBe('REPLY_TARGET_NOT_FOUND');
  });

  it('반응 추가 → 목록에 emoji/count/mine 집계', async () => {
    const { convId, msgId } = await setupDmWithMessage();
    const r = await req(
      `/api/v1/messages/conversations/${convId}/messages/${msgId}/reactions`,
      bobToken,
      { method: 'POST', body: JSON.stringify({ emoji: '👍' }) },
    );
    expect(r.status).toBe(200);

    const list = await req(`/api/v1/messages/conversations/${convId}/messages`, bobToken);
    const { messages } = (await list.json()) as {
      messages: { id: string; reactions: { emoji: string; count: number; mine: boolean }[] }[];
    };
    const target = messages.find((m) => m.id === msgId);
    expect(target?.reactions).toEqual([{ emoji: '👍', count: 1, mine: true }]);
  });

  it('같은 반응 중복 추가 → 멱등(count 1 유지)', async () => {
    const { convId, msgId } = await setupDmWithMessage();
    const url = `/api/v1/messages/conversations/${convId}/messages/${msgId}/reactions`;
    await req(url, bobToken, { method: 'POST', body: JSON.stringify({ emoji: '❤️' }) });
    await req(url, bobToken, { method: 'POST', body: JSON.stringify({ emoji: '❤️' }) });

    const list = await req(`/api/v1/messages/conversations/${convId}/messages`, bobToken);
    const { messages } = (await list.json()) as {
      messages: { id: string; reactions: { emoji: string; count: number }[] }[];
    };
    const target = messages.find((m) => m.id === msgId);
    expect(target?.reactions).toEqual([{ emoji: '❤️', count: 1, mine: true }]);
  });

  it('반응 제거(토글 OFF) → 목록에서 사라짐', async () => {
    const { convId, msgId } = await setupDmWithMessage();
    const base = `/api/v1/messages/conversations/${convId}/messages/${msgId}/reactions`;
    await req(base, bobToken, { method: 'POST', body: JSON.stringify({ emoji: '😂' }) });
    const del = await req(`${base}/${encodeURIComponent('😂')}`, bobToken, { method: 'DELETE' });
    expect(del.status).toBe(200);

    const list = await req(`/api/v1/messages/conversations/${convId}/messages`, bobToken);
    const { messages } = (await list.json()) as {
      messages: { id: string; reactions: unknown[] }[];
    };
    expect(messages.find((m) => m.id === msgId)?.reactions).toEqual([]);
  });

  it('두 사용자가 같은 이모지 → count 2, 본인 것만 mine=true', async () => {
    const { convId, msgId } = await setupDmWithMessage();
    const url = `/api/v1/messages/conversations/${convId}/messages/${msgId}/reactions`;
    await req(url, aliceToken, { method: 'POST', body: JSON.stringify({ emoji: '🙏' }) });
    await req(url, bobToken, { method: 'POST', body: JSON.stringify({ emoji: '🙏' }) });

    const list = await req(`/api/v1/messages/conversations/${convId}/messages`, aliceToken);
    const { messages } = (await list.json()) as {
      messages: { id: string; reactions: { emoji: string; count: number; mine: boolean }[] }[];
    };
    const target = messages.find((m) => m.id === msgId);
    expect(target?.reactions).toEqual([{ emoji: '🙏', count: 2, mine: true }]);
  });

  it('허용되지 않은 이모지 → 400 INVALID_INPUT', async () => {
    const { convId, msgId } = await setupDmWithMessage();
    const r = await req(
      `/api/v1/messages/conversations/${convId}/messages/${msgId}/reactions`,
      bobToken,
      { method: 'POST', body: JSON.stringify({ emoji: '💩' }) },
    );
    expect(r.status).toBe(400);
  });

  it('대화 비참여자 반응 → 403 NOT_A_MEMBER', async () => {
    const { convId, msgId } = await setupDmWithMessage();
    const r = await req(
      `/api/v1/messages/conversations/${convId}/messages/${msgId}/reactions`,
      carolToken,
      { method: 'POST', body: JSON.stringify({ emoji: '👍' }) },
    );
    expect(r.status).toBe(403);
  });
});
