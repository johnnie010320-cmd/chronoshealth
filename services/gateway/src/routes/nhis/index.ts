import { Hono } from 'hono';
import { z } from 'zod';
import { authMiddleware, type AuthVariables } from '../../middleware/auth.js';
import { rateLimit } from '../../middleware/rate-limit.js';
import type { Bindings } from '../../bindings.js';
import { getNhisProvider, type AuthHandle } from './provider.js';
import { NHIS_NOT_CONFIGURED } from './tilko.js';

// 국민건강보험공단(건강검진) 연동 — 간편인증 2단계 흐름(인증 요청 → 결과 조회) + 공급자 추상화.
// 기본 공급자 mock(표본). 실연동은 틸코(간편인증 중개) 키 확보 + 실서버 검증 후 NHIS_PROVIDER=tilko.
//
// ⚠️ 검진값은 건강 PII → 서버에 저장하지 않고 응답으로만 전달(프론트는 기기 로컬에만 보관).
//    analysis DB 로는 어떤 원본도 적재하지 않는다(ADR 0003).

const MODEL_VERSION = 'nhis-v0.2.0';

export const nhisRoute = new Hono<{
  Bindings: Bindings;
  Variables: AuthVariables;
}>();

const AuthRequest = z
  .object({
    provider: z.enum(['kakao', 'naver', 'pass', 'samsung', 'kb', 'shinhan', 'payco']),
    name: z.string().trim().min(1).max(40),
    birthDate: z.string().regex(/^\d{8}$/), // YYYYMMDD
    phone: z.string().regex(/^\d{10,11}$/),
  })
  .strict();

const AuthComplete = z
  .object({
    handle: z.record(z.string()),
  })
  .strict();

function mapErr(e: unknown): { code: string; status: 400 | 501 | 502 | 503 } {
  const msg = e instanceof Error ? e.message : 'NHIS_ERROR';
  if (msg === NHIS_NOT_CONFIGURED) return { code: NHIS_NOT_CONFIGURED, status: 503 };
  if (msg.startsWith('NHIS_AUTH_FAILED')) return { code: 'NHIS_AUTH_FAILED', status: 502 };
  if (msg.startsWith('NHIS_FETCH_FAILED')) return { code: 'NHIS_FETCH_FAILED', status: 502 };
  return { code: 'NHIS_UPSTREAM_ERROR', status: 502 };
}

// STEP 1 — 간편인증 요청. 사용자는 인증앱에서 승인 후 /auth/complete 를 호출한다.
nhisRoute.post('/auth/request', authMiddleware, rateLimit(30), async (c) => {
  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    return c.json({ error: { code: 'INVALID_JSON' } }, 400);
  }
  const parsed = AuthRequest.safeParse(raw);
  if (!parsed.success) return c.json({ error: { code: 'INVALID_INPUT' } }, 400);
  const provider = getNhisProvider(c.env);
  try {
    const handle = await provider.requestAuth(parsed.data);
    return c.json({ provider: provider.id, live: provider.live, handle, modelVersion: MODEL_VERSION });
  } catch (e) {
    const { code, status } = mapErr(e);
    return c.json({ error: { code } }, status);
  }
});

// STEP 2 — 승인 완료 후 검진 결과 조회. (handle 은 STEP1 응답을 그대로 전달)
nhisRoute.post('/auth/complete', authMiddleware, rateLimit(30), async (c) => {
  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    return c.json({ error: { code: 'INVALID_JSON' } }, 400);
  }
  const parsed = AuthComplete.safeParse(raw);
  if (!parsed.success) return c.json({ error: { code: 'INVALID_INPUT' } }, 400);
  const provider = getNhisProvider(c.env);
  try {
    const checkups = await provider.fetchCheckup(parsed.data.handle as AuthHandle);
    return c.json({
      source: checkups[0]?.source ?? '국민건강보험공단',
      live: provider.live,
      checkups,
      modelVersion: MODEL_VERSION,
    });
  } catch (e) {
    const { code, status } = mapErr(e);
    return c.json({ error: { code } }, status);
  }
});

// 레거시 — 단건 조회(간편인증 없이). 미설정이면 503(표본 반환 안 함).
nhisRoute.get('/checkup', authMiddleware, rateLimit(60), async (c) => {
  const provider = getNhisProvider(c.env);
  try {
    const checkups = await provider.fetchCheckup({});
    return c.json({ source: checkups[0]?.source ?? 'mock', live: provider.live, modelVersion: MODEL_VERSION, checkup: checkups[0], checkups });
  } catch (e) {
    const { code, status } = mapErr(e);
    return c.json({ error: { code } }, status);
  }
});
