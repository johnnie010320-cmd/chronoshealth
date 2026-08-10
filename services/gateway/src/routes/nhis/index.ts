import { Hono } from 'hono';
import { authMiddleware, type AuthVariables } from '../../middleware/auth.js';
import { rateLimit } from '../../middleware/rate-limit.js';
import type { Bindings } from '../../bindings.js';

// 국민건강보험공단(건강보험25시) 검진 데이터 연동 — 백엔드 인터페이스 + MOCK.
// 실연동은 인증중개사(CODEF/Tilko 등) 간편인증 경유가 필요(계약·키·개인정보 처리위탁).
// 아래는 인터페이스 스캐폴드로, source='mock' 표본을 반환한다. 실연동 시 이 라우트 내부만 교체.
//
// ⚠️ 실데이터 연동 시: 공단 검진값은 건강 PII → ADR 0003에 따라 services/identity 경계에서만
//    원본 보관, analysis 응답에는 파생 지표만. 현재 mock 은 PII 아님.

const MODEL_VERSION = 'nhis-mock-v0.1.0';

export const nhisRoute = new Hono<{
  Bindings: Bindings;
  Variables: AuthVariables;
}>();

// 최근 건강검진 결과(표본). 실연동 전까지 고정 mock.
nhisRoute.get('/checkup', authMiddleware, rateLimit(60), async (c) => {
  return c.json({
    source: 'mock',
    modelVersion: MODEL_VERSION,
    checkup: {
      examDate: '2025-11-14',
      heightCm: 172,
      weightKg: 71,
      bmi: 24.0,
      waistCm: 84,
      systolicBp: 124,
      diastolicBp: 79,
      fastingGlucose: 101,
      totalCholesterol: 205,
      hdl: 52,
      ldl: 128,
      triglyceride: 142,
      hemoglobin: 15.1,
      ast: 26,
      alt: 30,
      gtp: 34,
      urineProtein: '음성',
      smoking: '비흡연',
      drinking: '주 1회 이하',
    },
  });
});
