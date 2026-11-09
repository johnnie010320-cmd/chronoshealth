import { Hono } from 'hono';
import { z } from 'zod';
import { rateLimit } from '../../middleware/rate-limit.js';
import { latestReleaseVersion } from '../../releases/storage.js';
import type { Bindings } from '../../bindings.js';

const MODEL_VERSION = 'app-version-v0.1.0';

const Query = z.object({ platform: z.enum(['android', 'ios']) }).strict();

// ── 공개 — 모바일 앱이 시작할 때 최신·최소 지원 버전을 받아 업데이트 안내 ─────────
// 정본 = 개발 로그(releases): component 'android' / 'ios' = 스토어 공개 최신, '<platform>-min' = 최소 지원(미만이면 앱이 막힘).
// 내부 테스트·TestFlight 빌드는 'android-internal' / 'ios-testflight' 로 기록해 여기에 잡히지 않게 한다.
// ios 는 2026-11-09 App Store 앱 번호(6832693211)가 나와 열었다.
export const appVersionRoute = new Hono<{ Bindings: Bindings }>();

appVersionRoute.get('/version', rateLimit(600), async (c) => {
  const parsed = Query.safeParse(c.req.query());
  if (!parsed.success) return c.json({ error: { code: 'INVALID_INPUT' } }, 400);
  const p = parsed.data.platform;
  const [latest, minSupported] = await Promise.all([
    latestReleaseVersion(c.env.DB, p),
    latestReleaseVersion(c.env.DB, `${p}-min`),
  ]);
  return c.json({ platform: p, latest, minSupported, modelVersion: MODEL_VERSION });
});
