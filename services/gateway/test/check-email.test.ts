import { describe, it, expect, beforeEach } from 'vitest';
import app from '../src/index.js';
import { __clearIpRateLimit } from '../src/middleware/ip-rate-limit.js';
import { makeMockIdentityDb, makeMockAnalysisDb } from './helpers/mock-d1.js';

describe('GET /api/v1/auth/check-email', () => {
  let identityMock: ReturnType<typeof makeMockIdentityDb>;

  beforeEach(() => {
    identityMock = makeMockIdentityDb();
    __clearIpRateLimit();
  });

  const env = () => ({
    IDENTITY_DB: identityMock.db,
    DB: makeMockAnalysisDb().db,
    BETA_SIGNUP_HMAC_SALT: 'test',
    ENVIRONMENT: 'dev' as const,
  });

  const get = (email: string) =>
    app.request(
      `/api/v1/auth/check-email?email=${encodeURIComponent(email)}`,
      { method: 'GET' },
      env(),
    );

  it('200 available=true — 미사용 이메일', async () => {
    const res = await get('new@example.com');
    expect(res.status).toBe(200);
    const data = (await res.json()) as { available: boolean };
    expect(data.available).toBe(true);
  });

  it('200 available=false — 이미 가입된 이메일', async () => {
    identityMock.state.users.push({
      user_pseudonym_id: 'existing',
      name: null,
      email: 'used@example.com',
      phone: null,
      birth_year: null,
      sex: null,
      created_at: new Date().toISOString(),
    });
    const res = await get('used@example.com');
    expect(res.status).toBe(200);
    const data = (await res.json()) as { available: boolean };
    expect(data.available).toBe(false);
  });

  it('400 — 잘못된 이메일 형식', async () => {
    const res = await get('not-an-email');
    expect(res.status).toBe(400);
  });
});
