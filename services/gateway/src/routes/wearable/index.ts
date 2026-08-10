import { Hono } from 'hono';
import { authMiddleware, type AuthVariables } from '../../middleware/auth.js';
import { rateLimit } from '../../middleware/rate-limit.js';
import type { Bindings } from '../../bindings.js';

// 웨어러블 연동 — 백엔드 인터페이스 + MOCK.
// 실연동은 집계 플랫폼(Terra/Vital 등) 계약·API키 + 사용자 OAuth 동의 경유가 필요.
// 아래는 인터페이스 스캐폴드로 source='mock' 집계 표본을 반환한다. 실연동 시 이 라우트 내부만 교체.
//
// ⚠️ 실데이터 연동 시: 수면·심박 등은 건강 PII → ADR 0003에 따라 원본은 identity 경계,
//    analysis 응답에는 파생 지표만. 제조사/집계사 토큰은 암호화 시크릿 보관(.env 커밋 금지).
//    실연동 흐름: connect(OAuth URL) → callback(토큰 저장) → webhook(신규 데이터 push) → summary.

const MODEL_VERSION = 'wearable-mock-v0.1.0';

export const wearableRoute = new Hono<{
  Bindings: Bindings;
  Variables: AuthVariables;
}>();

// 연동 개시(실연동 시 집계사 OAuth URL 반환). mock 은 즉시 성공 상태를 돌려준다.
wearableRoute.post('/connect', authMiddleware, rateLimit(30), async (c) => {
  return c.json({
    source: 'mock',
    modelVersion: MODEL_VERSION,
    // 실연동: authUrl 로 리다이렉트. mock 은 바로 연결됨 상태.
    status: 'connected',
    provider: 'mock-aggregator',
    authUrl: null,
  });
});

// 최근 집계 지표(표본). 실연동 전까지 고정 mock.
wearableRoute.get('/summary', authMiddleware, rateLimit(60), async (c) => {
  return c.json({
    source: 'mock',
    modelVersion: MODEL_VERSION,
    provider: 'mock-aggregator',
    lastSyncAt: '2025-12-18T07:20:00Z',
    metrics: {
      sleepDurationH: 6.8,
      sleepDeepH: 1.2,
      sleepRemH: 1.5,
      sleepScore: 74,
      hrvMs: 48, // rMSSD
      restingHr: 61,
      avgHr: 74,
      steps: 8420,
      activeEnergyKcal: 520,
      spo2: 97,
      respiratoryRate: 15.2,
      skinTempDeltaC: -0.1,
    },
  });
});
