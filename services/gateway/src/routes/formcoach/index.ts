import { Hono } from 'hono';
import { authMiddleware, type AuthVariables } from '../../middleware/auth.js';
import { rateLimit, MINUTE_MS } from '../../middleware/rate-limit.js';
import { readMeProfile } from '../../me/storage.js';
import { signSsoToken } from '../../sso/token.js';
import type { Bindings } from '../../bindings.js';

// 크로노스 → 폼코치 SSO 핸드오프.
// 사용자가 운동 처방에서 폼코치로 이동할 때, 크로노스 로그인 정보(전화번호 기준)로
// 폼코치(Supabase Auth, 전화기반 계정)에 자동 로그인되도록 1회용 서명토큰을 발급.
// 실제 세션 발급은 폼코치 워커가 자신의 service_role 로 수행(크로노스는 비밀키 미보유).

const MODEL_VERSION = 'formcoach-sso-v0.1.0';

// 폼코치 워커(formcoach-stream-api) SSO 엔드포인트 — 동일 CF 계정.
const FORMCOACH_SSO_BASE = 'https://formcoach-stream-api.l2pamerica.workers.dev/sso';

// care 운동 처방과 동일한 허용 종목(오픈 리다이렉트 방지).
const ALLOWED_SPORTS = ['running', 'swimming', 'yoga', 'pilates', 'crossfit', 'hiking'];

export const formcoachRoute = new Hono<{
  Bindings: Bindings;
  Variables: AuthVariables;
}>();

formcoachRoute.get('/sso', authMiddleware, rateLimit(60, MINUTE_MS), async (c) => {
  const me = c.get('userPseudonymId');
  const sport = c.req.query('sport') ?? '';
  if (!ALLOWED_SPORTS.includes(sport)) {
    return c.json({ error: { code: 'INVALID_INPUT' } }, 400);
  }

  const profile = await readMeProfile(c.env.IDENTITY_DB, me);
  const phone = profile?.phone?.trim();
  // 전화번호 미등록 → 클라이언트가 2옵션(폼코치 로그인/전화 등록 안내) 노출.
  if (!phone) {
    return c.json({ status: 'NO_PHONE', sport, modelVersion: MODEL_VERSION });
  }

  const secret = c.env.FORMCOACH_SSO_SECRET;
  if (!secret) {
    // 시크릿 미주입 — 설정 누락. 클라이언트는 일반 딥링크로 폴백 가능.
    return c.json({ error: { code: 'SSO_NOT_CONFIGURED' } }, 503);
  }

  const token = await signSsoToken(secret, {
    phone,
    name: profile?.name ?? '',
    sport,
    exp: Date.now() + 120_000, // 2분
  });
  const url = `${FORMCOACH_SSO_BASE}?sport=${encodeURIComponent(sport)}&t=${encodeURIComponent(token)}`;
  return c.json({ status: 'OK', url, modelVersion: MODEL_VERSION });
});
