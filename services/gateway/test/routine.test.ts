import { describe, it, expect, beforeEach } from 'vitest';
import app from '../src/index.js';
import { __clearRateLimit } from '../src/middleware/rate-limit.js';
import {
  makeMockIdentityDb,
  makeMockAnalysisDb,
  issueTestToken,
} from './helpers/mock-d1.js';

type RoutineEntryWire = {
  entryDate: string;
  caloriesKcal: number | null;
  exerciseMinutes: number | null;
  sleepHours: number | null;
  note: string | null;
};

type RangeResponse = {
  entries: RoutineEntryWire[];
  summary: {
    from: string;
    to: string;
    days: number;
    totals: { calories: number; exerciseMinutes: number; sleepHours: number };
    averages: { calories: number; exerciseMinutes: number; sleepHours: number };
    streakDays: number;
  };
  modelVersion: string;
};

function isoDateOffset(daysFromToday: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + daysFromToday);
  return d.toISOString().slice(0, 10);
}

describe('Routine API', () => {
  let identityMock: ReturnType<typeof makeMockIdentityDb>;
  let analysisMock: ReturnType<typeof makeMockAnalysisDb>;

  beforeEach(() => {
    identityMock = makeMockIdentityDb();
    analysisMock = makeMockAnalysisDb();
    __clearRateLimit();
  });

  const env = () => ({
    IDENTITY_DB: identityMock.db,
    DB: analysisMock.db,
    BETA_SIGNUP_HMAC_SALT: 'test',
    ENVIRONMENT: 'dev' as const,
  });

  const postDaily = (token: string, body: unknown) =>
    app.request(
      '/api/v1/routine/daily',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
      env(),
    );

  const getRange = (token: string, from: string, to: string) =>
    app.request(
      `/api/v1/routine/range?from=${from}&to=${to}`,
      { method: 'GET', headers: { Authorization: `Bearer ${token}` } },
      env(),
    );

  const getToday = (token: string) =>
    app.request(
      '/api/v1/routine/today',
      { method: 'GET', headers: { Authorization: `Bearer ${token}` } },
      env(),
    );

  it('POST /daily 200 — upsert + return saved', async () => {
    const { token } = issueTestToken(identityMock.state);
    const res = await postDaily(token, {
      entryDate: isoDateOffset(0),
      caloriesKcal: 2100,
      exerciseMinutes: 30,
      sleepHours: 7.5,
      note: null,
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as { entry: RoutineEntryWire; modelVersion: string };
    expect(data.entry.caloriesKcal).toBe(2100);
    expect(data.entry.exerciseMinutes).toBe(30);
    expect(data.entry.sleepHours).toBe(7.5);
    expect(data.modelVersion).toBe('routine-v0.1.0');
  });

  it('POST /daily 200 — upsert overwrites previous values for same date', async () => {
    const { token } = issueTestToken(identityMock.state);
    const date = isoDateOffset(0);
    await postDaily(token, { entryDate: date, caloriesKcal: 1500, exerciseMinutes: 0, sleepHours: 6, note: null });
    const res = await postDaily(token, { entryDate: date, caloriesKcal: 2000, exerciseMinutes: 45, sleepHours: 8, note: null });
    expect(res.status).toBe(200);
    expect(analysisMock.state.routine.length).toBe(1);
    expect(analysisMock.state.routine[0].calories_kcal).toBe(2000);
  });

  it('POST /daily 400 INVALID_INPUT — entryDate 미래', async () => {
    const { token } = issueTestToken(identityMock.state);
    const res = await postDaily(token, {
      entryDate: isoDateOffset(7),
      caloriesKcal: 2000,
      exerciseMinutes: null,
      sleepHours: null,
      note: null,
    });
    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: { code: string } };
    expect(data.error.code).toBe('INVALID_INPUT');
  });

  it('POST /daily 400 INVALID_INPUT — 모든 필드 null', async () => {
    const { token } = issueTestToken(identityMock.state);
    const res = await postDaily(token, {
      entryDate: isoDateOffset(0),
      caloriesKcal: null,
      exerciseMinutes: null,
      sleepHours: null,
      note: null,
    });
    expect(res.status).toBe(400);
  });

  it('POST /daily 400 INVALID_INPUT — 범위 초과 (calories > 20000)', async () => {
    const { token } = issueTestToken(identityMock.state);
    const res = await postDaily(token, {
      entryDate: isoDateOffset(0),
      caloriesKcal: 50000,
      exerciseMinutes: null,
      sleepHours: null,
      note: null,
    });
    expect(res.status).toBe(400);
  });

  it('POST /daily 400 INVALID_JSON', async () => {
    const { token } = issueTestToken(identityMock.state);
    const res = await app.request(
      '/api/v1/routine/daily',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: '{not json',
      },
      env(),
    );
    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: { code: string } };
    expect(data.error.code).toBe('INVALID_JSON');
  });

  it('POST /daily 401 UNAUTHORIZED', async () => {
    const res = await app.request(
      '/api/v1/routine/daily',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entryDate: isoDateOffset(0), caloriesKcal: 2000, exerciseMinutes: null, sleepHours: null, note: null }),
      },
      env(),
    );
    expect(res.status).toBe(401);
  });

  it('GET /today 200 — entry null when no record', async () => {
    const { token } = issueTestToken(identityMock.state);
    const res = await getToday(token);
    expect(res.status).toBe(200);
    const data = (await res.json()) as { entry: RoutineEntryWire | null; today: string };
    expect(data.entry).toBeNull();
    expect(data.today).toBe(isoDateOffset(0));
  });

  it('GET /today 200 — returns today\'s record after upsert', async () => {
    const { token } = issueTestToken(identityMock.state);
    await postDaily(token, { entryDate: isoDateOffset(0), caloriesKcal: 1800, exerciseMinutes: 25, sleepHours: 7, note: 'good' });
    const res = await getToday(token);
    const data = (await res.json()) as { entry: RoutineEntryWire | null };
    expect(data.entry?.caloriesKcal).toBe(1800);
    expect(data.entry?.note).toBe('good');
  });

  it('GET /range 200 — 7-day window summary + streak=3', async () => {
    const { token } = issueTestToken(identityMock.state);
    await postDaily(token, { entryDate: isoDateOffset(-2), caloriesKcal: 2000, exerciseMinutes: 30, sleepHours: 7, note: null });
    await postDaily(token, { entryDate: isoDateOffset(-1), caloriesKcal: 2100, exerciseMinutes: 40, sleepHours: 8, note: null });
    await postDaily(token, { entryDate: isoDateOffset(0), caloriesKcal: 1900, exerciseMinutes: 35, sleepHours: 7.5, note: null });
    const res = await getRange(token, isoDateOffset(-6), isoDateOffset(0));
    expect(res.status).toBe(200);
    const data = (await res.json()) as RangeResponse;
    expect(data.entries.length).toBe(3);
    expect(data.summary.totals.exerciseMinutes).toBe(105);
    expect(data.summary.averages.sleepHours).toBeCloseTo(7.5, 1);
    expect(data.summary.streakDays).toBe(3);
  });

  it('GET /range 400 INVALID_INPUT — from > to', async () => {
    const { token } = issueTestToken(identityMock.state);
    const res = await getRange(token, isoDateOffset(0), isoDateOffset(-5));
    expect(res.status).toBe(400);
  });

  it('회귀 — routine 응답에 금지 표현 미포함', async () => {
    const { token } = issueTestToken(identityMock.state);
    await postDaily(token, { entryDate: isoDateOffset(0), caloriesKcal: 2000, exerciseMinutes: 30, sleepHours: 7, note: 'ok' });
    const res = await getRange(token, isoDateOffset(-6), isoDateOffset(0));
    const text = await res.text();
    for (const w of ['진단', '처방', '치료', '여명', '사망일', '죽음', 'D-day', 'diagnose']) {
      expect(text.includes(w), `forbidden word: ${w}`).toBe(false);
    }
  });
});
