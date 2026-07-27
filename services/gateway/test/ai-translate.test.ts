import { describe, it, expect, beforeEach } from 'vitest';
import app from '../src/index.js';
import {
  makeMockIdentityDb,
  makeMockAnalysisDb,
  issueTestToken,
  type MockD1State,
} from './helpers/mock-d1.js';
import { __clearIpRateLimit } from '../src/middleware/ip-rate-limit.js';

// AI 번역 — 온디맨드 번역 엔드포인트. env.AI 를 가짜 바인딩으로 주입해 결정적으로 검증.
describe('POST /api/v1/ai/translate', () => {
  let identity: ReturnType<typeof makeMockIdentityDb>;
  let analysis: ReturnType<typeof makeMockAnalysisDb>;
  let token: string;
  // 마지막으로 AI 에 전달된 프롬프트(system/user) 검증용.
  let lastRun: { model: string; messages: { role: string; content: string }[] } | null;

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
    lastRun = null;
    seedUser(identity.state, 'pseudo-alice', 'alice');
    token = issueTestToken(identity.state, { pseudonym: 'pseudo-alice' }).token;
  });

  // OpenAI 호환 형식({choices:[{message:{content}}]})으로 응답하는 가짜 AI 바인딩.
  const aiReturning = (content: string) => ({
    run: async (model: string, opts: { messages: { role: string; content: string }[] }) => {
      lastRun = { model, messages: opts.messages };
      return { choices: [{ message: { content } }] };
    },
  });

  const env = (ai: unknown) => ({
    IDENTITY_DB: identity.db,
    DB: analysis.db,
    BETA_SIGNUP_HMAC_SALT: 'test',
    ENVIRONMENT: 'dev' as const,
    AI: ai,
  });

  const post = (body: unknown, ai: unknown, withAuth = true) =>
    app.request(
      '/api/v1/ai/translate',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(withAuth ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      },
      env(ai),
    );

  it('200 — 번역문 반환 + target 반영', async () => {
    const res = await post({ text: '안녕하세요', target: 'en' }, aiReturning('Hello'));
    expect(res.status).toBe(200);
    const data = (await res.json()) as { translated: string; target: string };
    expect(data.translated).toBe('Hello');
    expect(data.target).toBe('en');
    // 대상 언어명이 시스템 프롬프트에 들어가고, 원문이 user 메시지로 전달돼야 함.
    expect(lastRun?.messages[0]?.content).toContain('English');
    expect(lastRun?.messages[1]?.content).toBe('안녕하세요');
  });

  it('200 — 코드펜스/따옴표로 감싼 응답을 정리해 반환', async () => {
    const res = await post({ text: 'hola', target: 'ko' }, aiReturning('```\n안녕\n```'));
    expect(res.status).toBe(200);
    const data = (await res.json()) as { translated: string };
    expect(data.translated).toBe('안녕');
  });

  it('401 — 인증 없음', async () => {
    const res = await post({ text: 'hi', target: 'ko' }, aiReturning('x'), false);
    expect(res.status).toBe(401);
  });

  it('400 — 빈 텍스트', async () => {
    const res = await post({ text: '   ', target: 'ko' }, aiReturning('x'));
    expect(res.status).toBe(400);
  });

  it('400 — 미지원 target 언어', async () => {
    const res = await post({ text: 'hi', target: 'fr' }, aiReturning('x'));
    expect(res.status).toBe(400);
  });

  it('502 — AI 가 빈 응답', async () => {
    const res = await post({ text: 'hi', target: 'ko' }, aiReturning(''));
    expect(res.status).toBe(502);
  });

  it('502 — AI 바인딩이 예외를 던짐', async () => {
    const throwingAi = {
      run: async () => {
        throw new Error('AI down');
      },
    };
    const res = await post({ text: 'hi', target: 'ko' }, throwingAi);
    expect(res.status).toBe(502);
  });
});
