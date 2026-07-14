import { describe, it, expect, beforeEach } from 'vitest';
import app from '../src/index.js';
import { __clearRateLimit } from '../src/middleware/rate-limit.js';
import {
  makeMockIdentityDb,
  makeMockAnalysisDb,
  issueTestToken,
} from './helpers/mock-d1.js';

// Twin 만들기 — 만성/중증/가족력 조건 저장.
// 신규: '해당 없음'(none) 센티넬 + 직접입력(custom:) 코드 지원.

type ConditionsResponse = {
  conditions: { code: string; category: string; granted: boolean }[];
  modelVersion?: string;
};

describe('PUT /api/v1/me/medical/conditions — none + custom', () => {
  let identityMock: ReturnType<typeof makeMockIdentityDb>;
  let analysisMock: ReturnType<typeof makeMockAnalysisDb>;

  beforeEach(() => {
    identityMock = makeMockIdentityDb();
    analysisMock = makeMockAnalysisDb();
    __clearRateLimit();
  });

  const put = (token: string, body: unknown) =>
    app.request(
      '/api/v1/me/medical/conditions',
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      },
      {
        IDENTITY_DB: identityMock.db,
        DB: analysisMock.db,
        BETA_SIGNUP_HMAC_SALT: 'test',
        ENVIRONMENT: 'dev',
      },
    );

  it('200 — 카탈로그 코드 저장', async () => {
    const { token } = issueTestToken(identityMock.state);
    const res = await put(token, { category: 'chronic', codes: ['diabetes'] });
    expect(res.status).toBe(200);
    const data = (await res.json()) as ConditionsResponse;
    expect(data.conditions.map((c) => c.code)).toContain('diabetes');
  });

  it("200 — '해당 없음' 단독 저장", async () => {
    const { token } = issueTestToken(identityMock.state);
    const res = await put(token, { category: 'chronic', codes: ['none'] });
    expect(res.status).toBe(200);
    const data = (await res.json()) as ConditionsResponse;
    expect(data.conditions.map((c) => c.code)).toEqual(['none']);
  });

  it('200 — 직접입력(custom:) 코드 저장', async () => {
    const { token } = issueTestToken(identityMock.state);
    const res = await put(token, {
      category: 'critical',
      codes: ['cancer', 'custom:천포창'],
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as ConditionsResponse;
    const codes = data.conditions.map((c) => c.code);
    expect(codes).toContain('cancer');
    expect(codes).toContain('custom:천포창');
  });

  it("400 INVALID_INPUT — '해당 없음'과 실제 코드 공존 불가", async () => {
    const { token } = issueTestToken(identityMock.state);
    const res = await put(token, {
      category: 'chronic',
      codes: ['none', 'diabetes'],
    });
    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: { code: string } };
    expect(data.error.code).toBe('INVALID_INPUT');
  });

  it('400 UNKNOWN_CODE — 카탈로그·custom·none 아닌 코드', async () => {
    const { token } = issueTestToken(identityMock.state);
    const res = await put(token, {
      category: 'chronic',
      codes: ['not_a_real_code'],
    });
    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: { code: string } };
    expect(data.error.code).toBe('UNKNOWN_CODE');
  });

  it('400 UNKNOWN_CODE — 빈 custom: 텍스트 거부', async () => {
    const { token } = issueTestToken(identityMock.state);
    const res = await put(token, { category: 'family', codes: ['custom:   '] });
    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: { code: string } };
    expect(data.error.code).toBe('UNKNOWN_CODE');
  });

  it('재저장 시 이전 선택은 granted=0 으로 대체된다', async () => {
    const { token } = issueTestToken(identityMock.state);
    await put(token, { category: 'chronic', codes: ['diabetes', 'asthma'] });
    const res = await put(token, { category: 'chronic', codes: ['none'] });
    expect(res.status).toBe(200);
    const data = (await res.json()) as ConditionsResponse;
    // granted=1 만 반환 — 이전 diabetes/asthma 는 사라지고 none 만 남는다.
    expect(data.conditions.map((c) => c.code)).toEqual(['none']);
  });
});
