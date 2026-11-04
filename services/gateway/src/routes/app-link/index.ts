import { Hono } from 'hono';
import { authMiddleware, type AuthVariables } from '../../middleware/auth.js';
import { adminMiddleware } from '../../middleware/admin-auth.js';
import { rateLimit } from '../../middleware/rate-limit.js';
import type { Bindings } from '../../bindings.js';

const MODEL_VERSION = 'app-link-v0.1.0';

// SNS·메신저로 공유한 글의 앱 받기 링크 (2026-11-04 죠니 — FormCoach /app/get 과 같은 방식).
// vitacodeapp.com/get?from=<곳> → Pages Function → 여기.
// 안드로이드 = Play 스토어, 아이폰·아이패드 = App Store(관리 'app_store_ios_url' 이 비면 웹), 그 밖 = 웹.
// 미리보기 로봇(카톡·페북 등)은 웹(og)으로 보내고 세지 않는다.
export const STORE_ANDROID = 'https://play.google.com/store/apps/details?id=com.chronoshealth.app';
const WEB_ORIGIN = 'https://vitacodeapp.com/';
const PREVIEW_BOT =
  /bot|crawler|spider|facebookexternalhit|kakaotalk-scrap|WhatsApp\/|preview|Embedly|Slack|Discord/i;

export type LinkOs = 'android' | 'ios' | 'other' | 'bot';

export function detectOs(ua: string, forced?: string): LinkOs {
  if (PREVIEW_BOT.test(ua)) return 'bot';
  if (forced === 'android' || forced === 'ios') return forced;
  if (/Android/i.test(ua)) return 'android';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
  return 'other';
}

export function cleanSource(from: string | undefined): string | null {
  return (from ?? '').replace(/[^a-z0-9_-]/gi, '').slice(0, 30) || null;
}

async function iosStoreUrl(db: D1Database): Promise<string | null> {
  try {
    const row = await db
      .prepare("SELECT value FROM site_content WHERE key = 'app_store_ios_url'")
      .first<{ value: string }>();
    const v = (row?.value ?? '').trim();
    return v.startsWith('https://apps.apple.com/') ? v : null;
  } catch {
    return null;
  }
}

export const appLinkRoute = new Hono<{ Bindings: Bindings }>();

// 호출 제한을 걸지 않는다 — 비로그인 rateLimit 은 키가 사용자 하나로 묶여 하루 한도에 닿으면 링크 전체가 막힌다.
appLinkRoute.get('/get', async (c) => {
  const os = detectOs(c.req.header('User-Agent') ?? '', c.req.query('to'));
  const source = cleanSource(c.req.query('from'));
  const to =
    os === 'android' ? STORE_ANDROID : os === 'ios' ? ((await iosStoreUrl(c.env.DB)) ?? WEB_ORIGIN) : WEB_ORIGIN;
  if (os !== 'bot') {
    const write = c.env.DB.prepare('INSERT INTO app_link_opens (source, os) VALUES (?, ?)')
      .bind(source, os)
      .run()
      .catch((e: unknown) => console.error('app_link_opens insert', e instanceof Error ? e.message : e));
    try {
      c.executionCtx.waitUntil(write);
    } catch {
      await write; // 테스트(app.request)에는 executionCtx 가 없다
    }
  }
  return new Response(null, { status: 302, headers: { Location: to, 'Cache-Control': 'no-store' } });
});

// ── 관리자 — 들어온 수 합계 ────────────────────────────────────────────────
export const appLinkAdminRoute = new Hono<{ Bindings: Bindings; Variables: AuthVariables }>();

appLinkAdminRoute.get('/stats', authMiddleware, adminMiddleware, rateLimit(120), async (c) => {
  const db = c.env.DB;
  const [total, week, bySource, byOs] = await Promise.all([
    db.prepare('SELECT COUNT(*) AS n FROM app_link_opens').first<{ n: number }>(),
    db
      .prepare("SELECT COUNT(*) AS n FROM app_link_opens WHERE created_at > datetime('now', '-7 days')")
      .first<{ n: number }>(),
    db
      .prepare("SELECT COALESCE(source, '-') AS k, COUNT(*) AS n FROM app_link_opens GROUP BY 1 ORDER BY n DESC")
      .all<{ k: string; n: number }>(),
    db.prepare('SELECT os AS k, COUNT(*) AS n FROM app_link_opens GROUP BY 1 ORDER BY n DESC').all<{ k: string; n: number }>(),
  ]);
  const toMap = (rows: { k: string; n: number }[] | undefined) =>
    Object.fromEntries((rows ?? []).map((r) => [r.k, r.n]));
  return c.json({
    total: total?.n ?? 0,
    week: week?.n ?? 0,
    bySource: toMap(bySource.results),
    byOs: toMap(byOs.results),
    modelVersion: MODEL_VERSION,
  });
});
