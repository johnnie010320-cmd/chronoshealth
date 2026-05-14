import { fillDefaults } from './defaults.js';
import type { RiskSurveyRequest } from '../schemas/risk-survey.js';

// 개선 행동 제안 (규칙 기반).
// 각 제안의 expectedBioAgeDeltaYears는 메타분석 추정치를 보수적으로 인용.

export type ImprovementItem = {
  action: string;
  expectedBioAgeDeltaYears: number;
  confidence: 'low' | 'medium' | 'high';
};

export function generateImprovements(
  input: RiskSurveyRequest,
): ImprovementItem[] {
  const f = fillDefaults(input);
  const items: ImprovementItem[] = [];

  // 금연
  if (f.smoking === 'current') {
    items.push({
      action: '금연을 시작하면 5년 내 생체 나이 가속이 절반 이하로 감소합니다',
      expectedBioAgeDeltaYears: -3.5,
      confidence: 'high',
    });
  } else if (f.smoking === 'former') {
    items.push({
      action: '비흡연 상태를 5년 유지하면 비흡연자 수준에 근접합니다',
      expectedBioAgeDeltaYears: -1.5,
      confidence: 'high',
    });
  }

  // 운동
  if (f.exerciseMinutesPerWeek < 150) {
    const target = f.exerciseMinutesPerWeek < 60 ? 150 : 300;
    items.push({
      action: `주당 ${target}분 이상 중강도 운동 (걷기·자전거·수영 등)`,
      expectedBioAgeDeltaYears: f.exerciseMinutesPerWeek < 60 ? -2.0 : -1.0,
      confidence: 'high',
    });
  }

  // 체중
  if (f.bmi >= 25) {
    const targetKg = f.heightCm * f.heightCm * 0.000024 * 100; // BMI 24 환산
    const deltaKg = Math.round(f.weightKg - targetKg);
    if (deltaKg > 0) {
      items.push({
        action: `체중 ${deltaKg}kg 감량 (정상 BMI 범위 진입)`,
        expectedBioAgeDeltaYears: f.bmi >= 30 ? -2.5 : -1.0,
        confidence: 'medium',
      });
    }
  } else if (f.bmi < 18.5) {
    items.push({
      action: '근력 운동 + 단백질 섭취로 정상 체중 회복',
      expectedBioAgeDeltaYears: -0.8,
      confidence: 'medium',
    });
  }

  // 수면
  if (f.sleepHoursPerNight < 7 || f.sleepHoursPerNight > 8.5) {
    items.push({
      action: '매일 7~8시간 규칙적 수면',
      expectedBioAgeDeltaYears: -1.0,
      confidence: 'medium',
    });
  }

  // 혈압
  if (f.systolicBp >= 130) {
    items.push({
      action: 'DASH 식단 + 나트륨 감량 (수축기 -5~10mmHg 기대)',
      expectedBioAgeDeltaYears: f.systolicBp >= 140 ? -2.0 : -1.0,
      confidence: 'medium',
    });
  }

  // 음주
  if (f.alcoholDrinksPerWeek > 14) {
    items.push({
      action: `주당 음주 14잔 이하로 감량 (현재 ${f.alcoholDrinksPerWeek}잔)`,
      expectedBioAgeDeltaYears: -1.5,
      confidence: 'medium',
    });
  }

  // 스트레스
  if (f.stressLevel === 'high') {
    items.push({
      action: '명상·심호흡·운동 등 스트레스 완화 루틴 도입',
      expectedBioAgeDeltaYears: -0.8,
      confidence: 'low',
    });
  }

  // 혈당
  if (f.fastingGlucose >= 100 && f.fastingGlucose < 126) {
    items.push({
      action: '정제 탄수화물 감량 + 식후 산책으로 공복혈당 정상화',
      expectedBioAgeDeltaYears: -1.2,
      confidence: 'medium',
    });
  }

  // 상위 5개만 반환 (효과 큰 순)
  return items
    .sort(
      (a, b) =>
        Math.abs(b.expectedBioAgeDeltaYears) -
        Math.abs(a.expectedBioAgeDeltaYears),
    )
    .slice(0, 5);
}
