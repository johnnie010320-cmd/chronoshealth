// 식단 점수(0~100) = 칼로리(30) + 영양성분/탄단지(30) + 초가공식품 UPF(40).
// 비의료 "참고용" 점수. 데이터가 없는 항목은 0점 + 미집계 플래그로 투명하게 표기.
// 생활 점수에서 음식 50점 슬롯으로 환산(×0.5)해 사용한다.

import type { RoutineEntry, UpfTier } from './api-client';
import type { StableHealthProfile } from './health-profile';

export type DietScore = {
  total: number; // 0~100
  calorie: number; // 0~30
  macro: number; // 0~30
  upf: number; // 0~40
  hasCalorie: boolean; // 칼로리 입력 존재
  hasTarget: boolean; // 권장 칼로리(인적사항) 기반 — false면 기본값(2000)으로 추정
  hasMacro: boolean; // 탄단지 데이터 존재
  hasUpf: boolean; // 초가공식품 등급 존재
  targetKcal: number; // 사용한 하루 권장 칼로리
};

const DEFAULT_TDEE = 2000; // 인적사항 없을 때 하루 기본 권장값
const ACTIVITY = 1.375; // 가벼운 활동 가정

// Mifflin-St Jeor → 하루 권장 칼로리(TDEE). 인적사항 부족 시 null.
export function dailyTargetKcal(p: StableHealthProfile | null): number | null {
  if (!p || p.birthYear == null || p.heightCm == null || p.weightKg == null) return null;
  const age = new Date().getFullYear() - p.birthYear;
  if (age < 5 || age > 120) return null;
  // 성별 상수: 남 +5 / 여 −161 / 기타·미상 중간값 −78.
  const sexConst = p.sex === 'male' ? 5 : p.sex === 'female' ? -161 : -78;
  const bmr = 10 * p.weightKg + 6.25 * p.heightCm - 5 * age + sexConst;
  if (!Number.isFinite(bmr) || bmr <= 0) return null;
  return Math.round(bmr * ACTIVITY);
}

function calorieScore(cal: number, target: number): number {
  const dev = Math.abs(cal - target) / target;
  if (dev <= 0.1) return 30;
  if (dev <= 0.2) return 20;
  return 10; // 기록은 했으나 과다/과소
}

// 탄단지 칼로리 비율이 목표(탄50:단30:지20)에 얼마나 가까운지.
function macroScore(proteinG: number, carbG: number, fatG: number): number {
  const carbCal = carbG * 4;
  const protCal = proteinG * 4;
  const fatCal = fatG * 9;
  const sum = carbCal + protCal + fatCal;
  if (sum <= 0) return 0;
  const dev =
    Math.abs(carbCal / sum - 0.5) +
    Math.abs(protCal / sum - 0.3) +
    Math.abs(fatCal / sum - 0.2);
  if (dev <= 0.15) return 30;
  if (dev <= 0.35) return 20;
  return 10;
}

const UPF_SCORE: Record<UpfTier, number> = { clean: 40, processed: 20, ultra: 0 };

export function dietScore(
  entry: Pick<RoutineEntry, 'caloriesKcal' | 'proteinG' | 'carbG' | 'fatG' | 'upfTier'>,
  profile: StableHealthProfile | null,
): DietScore {
  const target = dailyTargetKcal(profile);
  const hasTarget = target != null;
  const targetKcal = target ?? DEFAULT_TDEE;

  const cal = entry.caloriesKcal;
  const hasCalorie = cal != null && cal > 0;
  const calorie = hasCalorie ? calorieScore(cal, targetKcal) : 0;

  const hasMacro =
    entry.proteinG != null && entry.carbG != null && entry.fatG != null &&
    (entry.proteinG + entry.carbG + entry.fatG) > 0;
  const macro = hasMacro ? macroScore(entry.proteinG!, entry.carbG!, entry.fatG!) : 0;

  const hasUpf = entry.upfTier != null;
  const upf = hasUpf ? UPF_SCORE[entry.upfTier as UpfTier] : 0;

  return {
    total: calorie + macro + upf,
    calorie,
    macro,
    upf,
    hasCalorie,
    hasTarget,
    hasMacro,
    hasUpf,
    targetKcal,
  };
}

// 그날 여러 음식의 등급 중 최악(보수적). ultra > processed > clean.
export function worstUpf(tiers: (UpfTier | undefined)[]): UpfTier | null {
  let worst: UpfTier | null = null;
  const rank: Record<UpfTier, number> = { clean: 0, processed: 1, ultra: 2 };
  for (const t of tiers) {
    if (!t) continue;
    if (worst == null || rank[t] > rank[worst]) worst = t;
  }
  return worst;
}
