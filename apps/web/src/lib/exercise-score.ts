// 운동 점수(0~100) = 강도&지속시간(40) + 운동 밸런스(30) + 리커버리(30).
// 비의료 "참고용" 점수. 생활 점수에서 운동 30점 슬롯의 원점수로 사용한다.
//
// 1) 강도 & 시간 (40): 심폐·지구력. 강도 가중 효과시간(effMin)이 30분에 수렴할수록 만점.
//    좌식(0분)은 10점 바닥. 짧고 강한 운동도 강도 가중으로 일부 반영.
// 2) 밸런스 (30): 유산소·근력 조화. 혼합=30, 한쪽=20, 좌식=10.
// 3) 리커버리 (30): 회복·지속가능성. 운동 후 스트레칭 + 충분한 수면(7~8h)을 종합.
//    ★ 실리콘밸리 헬스케어의 화두 — "얼마나 잘 쉬고 회복했는가".

import type { RoutineEntry, ExerciseType, ExerciseIntensity } from './api-client';

export type ExerciseScore = {
  total: number; // 0~100 (실질 하한 ~20)
  intensity: number; // 0~40 (강도 & 시간)
  balance: number; // 0~30 (유산소/근력 밸런스)
  recovery: number; // 0~30 (스트레칭 + 수면)
  hasType: boolean; // 운동 종류 입력 존재
  hasStretch: boolean; // 스트레칭 여부 입력 존재
  weakest: 'intensity' | 'balance' | 'recovery'; // 달성률 최저(AI 코멘트용)
};

// 운동 강도 가중치(강=호흡 가쁨, 약=걷기). 짧고 강한 운동도 적절히 반영.
export const INTENSITY_MULT: Record<ExerciseIntensity, number> = { low: 0.7, medium: 1, high: 1.4 };

// 강도 & 지속시간 (0~40). 좌식(effMin 0)=10, 효과시간 30분↑=40으로 선형.
function intensityScore(minutes: number, intensity: ExerciseIntensity | null): number {
  const mult = intensity ? INTENSITY_MULT[intensity] : 1;
  const effMin = Math.max(0, minutes) * mult;
  const s = 10 + Math.min(effMin / 30, 1) * 30;
  return Math.round(Math.max(10, Math.min(40, s)));
}

// 운동 밸런스 (0~30). 혼합=30, 단일(유산소/근력)=20, 종류 미입력이나 운동은 함=20, 좌식=10.
function balanceScore(minutes: number, type: ExerciseType | null): number {
  if (type === 'both') return 30;
  if (type === 'cardio' || type === 'strength') return 20;
  return minutes > 0 ? 20 : 10; // 종류 미입력: 움직였으면 단일로 간주, 아니면 좌식
}

// 리커버리 (0~30). 스트레칭 15 + 수면 15(7.5h 최적, ±4h에서 0으로 감쇠).
function recoveryScore(didStretch: boolean | null, sleepHours: number | null): number {
  const stretchPts = didStretch === true ? 15 : 0;
  const sleepPts =
    sleepHours != null ? 15 * (1 - Math.min(Math.abs(sleepHours - 7.5) / 4, 1)) : 0;
  return Math.round(Math.max(0, Math.min(30, stretchPts + sleepPts)));
}

export function exerciseScore(
  entry: Pick<
    RoutineEntry,
    'exerciseMinutes' | 'exerciseIntensity' | 'exerciseType' | 'didStretch' | 'sleepHours'
  >,
): ExerciseScore {
  const minutes = entry.exerciseMinutes ?? 0;
  const intensity = intensityScore(minutes, entry.exerciseIntensity ?? null);
  const balance = balanceScore(minutes, entry.exerciseType ?? null);
  const recovery = recoveryScore(entry.didStretch ?? null, entry.sleepHours ?? null);

  // 달성률(점수/만점) 최저 항목 — AI 코멘트가 짚어줄 약점.
  const ratios: { key: ExerciseScore['weakest']; r: number }[] = [
    { key: 'intensity', r: intensity / 40 },
    { key: 'balance', r: balance / 30 },
    { key: 'recovery', r: recovery / 30 },
  ];
  const weakest = ratios.reduce((low, c) => (c.r < low.r ? c : low)).key;

  return {
    total: intensity + balance + recovery,
    intensity,
    balance,
    recovery,
    hasType: entry.exerciseType != null,
    hasStretch: entry.didStretch != null,
    weakest,
  };
}
