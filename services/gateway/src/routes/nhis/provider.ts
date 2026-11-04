// 국민건강보험공단 검진 연동 — 공급자 추상화.
// 간편인증(틸코 등 중개사)은 2단계 흐름: ① 인증 요청(사용자 인증앱 승인) → ② 결과 조회.
// NHIS_PROVIDER 로 mock(기본·표본) / tilko(실연동) 선택. 실연동은 키 + 실서버 검증 후 활성화.

import type { Bindings } from '../../bindings.js';
import { TilkoProvider } from './tilko.js';

export type CheckupData = {
  source: string;
  examDate: string;
  heightCm: number | null;
  weightKg: number | null;
  bmi: number | null;
  waistCm: number | null;
  systolicBp: number | null;
  diastolicBp: number | null;
  fastingGlucose: number | null;
  hba1c: number | null;
  totalCholesterol: number | null;
  hdl: number | null;
  ldl: number | null;
  triglyceride: number | null;
  hemoglobin: number | null;
  ast: number | null;
  alt: number | null;
  gtp: number | null;
  creatinine: number | null;
  egfr: number | null;
  urineProtein: string;
  smoking: string;
  drinking: string;
  // 원본 항목명/단위(매핑 확인용, 값 제외). 여러 회차 중 해당 회차의 항목 목록.
  debugItems?: { name: string; unit: string }[];
};

export type AuthProviderKind =
  | 'kakao'
  | 'naver'
  | 'pass'
  | 'samsung'
  | 'kb'
  | 'shinhan'
  | 'payco';

export type AuthRequestInput = {
  provider: AuthProviderKind;
  name: string;
  birthDate: string; // YYYYMMDD
  phone: string; // 숫자만
};

// 1단계 → 2단계로 전달되는 불투명 토큰 묶음(간편인증 트랜잭션). 서버 보관 없이 왕복한다.
export type AuthHandle = Record<string, string>;

export interface NhisProvider {
  readonly id: string;
  readonly live: boolean;
  requestAuth(input: AuthRequestInput): Promise<AuthHandle>;
  // 검진 회차 전체(최신순). 사용자가 날짜로 선택.
  fetchCheckup(handle: AuthHandle): Promise<CheckupData[]>;
}

// 표본(mock) — 외부 호출 없이 고정 검진 표본을 반환. 2단계 흐름만 그대로 재현.
class MockProvider implements NhisProvider {
  readonly id = 'mock';
  readonly live = false;
  async requestAuth(input: AuthRequestInput): Promise<AuthHandle> {
    return { txId: crypto.randomUUID(), provider: input.provider, name: input.name };
  }
  async fetchCheckup(_handle: AuthHandle): Promise<CheckupData[]> {
    return [{
      source: '국민건강보험공단',
      examDate: '2025-11-14',
      heightCm: 172,
      weightKg: 71,
      bmi: 24.0,
      waistCm: 84,
      systolicBp: 124,
      diastolicBp: 79,
      fastingGlucose: 101,
      hba1c: 5.6,
      totalCholesterol: 205,
      hdl: 52,
      ldl: 128,
      triglyceride: 142,
      hemoglobin: 15.1,
      ast: 26,
      alt: 30,
      gtp: 34,
      creatinine: 0.9,
      egfr: 95,
      urineProtein: '음성',
      smoking: '비흡연',
      drinking: '주 1회 이하',
    }];
  }
}

// 키 미설정 — 표본을 돌려주지 않고 명확히 '미설정'을 알린다(표본 단계 제거, 죠니 2026-10-14).
class NotConfiguredProvider implements NhisProvider {
  readonly id = 'none';
  readonly live = false;
  async requestAuth(): Promise<AuthHandle> {
    throw new Error('NHIS_NOT_CONFIGURED');
  }
  async fetchCheckup(): Promise<CheckupData[]> {
    throw new Error('NHIS_NOT_CONFIGURED');
  }
}

export function getNhisProvider(env: Bindings): NhisProvider {
  // 명시적 개발용 표본만 'mock'. 그 외: 키/플래그 있으면 tilko, 없으면 미설정(표본 금지).
  if (env.NHIS_PROVIDER === 'mock') return new MockProvider();
  if (env.NHIS_PROVIDER === 'tilko' || env.TILKO_API_KEY) return new TilkoProvider(env);
  return new NotConfiguredProvider();
}
