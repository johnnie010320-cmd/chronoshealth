import { describe, it, expect, beforeEach } from 'vitest';
import app from '../src/index.js';
import { makeMockIdentityDb, makeMockAnalysisDb } from './helpers/mock-d1.js';
import { __clearIpRateLimit } from '../src/middleware/ip-rate-limit.js';

// 앱 업데이트 안내 — 비로그인 공개, releases 의 'android' / 'android-min' 최신 기록, 내부 테스트 기록은 무시.
describe('GET /api/v1/app/version', () => {
  let identity: ReturnType<typeof makeMockIdentityDb>;
  let analysis: ReturnType<typeof makeMockAnalysisDb>;

  beforeEach(() => {
    identity = makeMockIdentityDb();
    analysis = makeMockAnalysisDb();
    __clearIpRateLimit();
  });

  const env = () => ({
    IDENTITY_DB: identity.db,
    DB: analysis.db,
    BETA_SIGNUP_HMAC_SALT: 'test',
    ENVIRONMENT: 'dev' as const,
  });
  const get = (q: string) => app.request(`/api/v1/app/version${q}`, {}, env());
  const seed = (component: string, version: string) =>
    analysis.db
      .prepare(
        `INSERT INTO releases (id, component, version, notes, created_by_pseudonym_id)
       VALUES (?, ?, ?, ?, ?)`,
      )
      .bind(crypto.randomUUID(), component, version, 'n', 'system')
      .run();

  it('기록이 없으면 latest·minSupported 모두 null', async () => {
    const r = await get('?platform=android');
    expect(r.status).toBe(200);
    const d = (await r.json()) as { latest: string | null; minSupported: string | null };
    expect(d.latest).toBeNull();
    expect(d.minSupported).toBeNull();
  });

  it('가장 최근 android 기록이 latest, android-min 이 minSupported, 내부 테스트는 무시', async () => {
    await seed('android', '0.1.0');
    await seed('android-internal', '0.9.9');
    await seed('android', '0.2.0');
    await seed('android-min', '0.1.0');
    const d = (await (await get('?platform=android')).json()) as { latest: string; minSupported: string };
    expect(d.latest).toBe('0.2.0');
    expect(d.minSupported).toBe('0.1.0');
  });

  it('platform 이 없거나 다르면 400', async () => {
    expect((await get('')).status).toBe(400);
    expect((await get('?platform=ios')).status).toBe(400);
  });
});
