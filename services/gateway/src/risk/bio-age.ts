import { chronologicalAge, fillDefaults, type FilledInput } from './defaults.js';
import type { RiskSurveyRequest } from '../schemas/risk-survey.js';

// 생체 나이 추정 (공개 역학 메타분석 계수 기반 결정형 모델).
//
// 본 모델은 정통 Levine 2018 PhenoAge가 요구하는 혈액 바이오마커
// (알부민·크레아티닌·CRP·림프구·MCV·RDW·ALP·WBC)를 본 23문항이 수집하지
// 않으므로, 동일 목표(수정 가능 요인 기반 생체 나이 추정)를 위한 휴리스틱.
//
// 참고문헌:
// - Doll R et al. BMJ 2004 — 흡연자 평균 ~10년 단축
// - Wen CP et al. Lancet 2011 — 일일 15분 운동 ≈ +3년
// - Prospective Studies Collaboration. Lancet 2009 — BMI vs all-cause mortality
// - Cappuccio FP et al. Sleep 2010 — 수면 시간 U-shape
// - Lewington S et al. Lancet 2002 — SBP vs vascular mortality
// - Rehm J et al. Lancet 2009 — 알코올 dose-response
// - Singh-Manoux A et al. CMAJ 2007 — Self-rated health 예측력
//
// 신뢰구간: ±3년 (heuristic). P3 ML 단계에서 bootstrap 도입 예정.

export type BioAgeContributor = {
  factor: string;
  direction: 'accelerate' | 'decelerate';
  magnitude: number; // 0~1 정규화
  deltaYears: number;
};

export type BioAgeResult = {
  value: number;
  chronologicalAge: number;
  ci95: [number, number];
  contributors: BioAgeContributor[];
};

type Adjustment = { factor: string; delta: number };

function computeAdjustments(f: FilledInput): Adjustment[] {
  const adj: Adjustment[] = [];

  // 흡연
  if (f.smoking === 'current') adj.push({ factor: '현재 흡연', delta: 5.0 });
  else if (f.smoking === 'former') adj.push({ factor: '과거 흡연 (회복기)', delta: 1.5 });
  else adj.push({ factor: '비흡연', delta: -0.5 });

  // 운동 (주당 분)
  const ex = f.exerciseMinutesPerWeek;
  if (ex >= 300) adj.push({ factor: '활발한 운동 (주 300분+)', delta: -3.0 });
  else if (ex >= 150) adj.push({ factor: '적절한 운동 (주 150분+)', delta: -1.5 });
  else if (ex >= 60) adj.push({ factor: '낮은 운동량', delta: 0.5 });
  else adj.push({ factor: '운동 부족', delta: 2.5 });

  // BMI
  if (f.bmi < 18.5) adj.push({ factor: '저체중 (BMI<18.5)', delta: 1.0 });
  else if (f.bmi < 23) adj.push({ factor: '정상 체중', delta: -0.5 });
  else if (f.bmi < 25) adj.push({ factor: '과체중 경계 (BMI 23~25)', delta: 0.5 });
  else if (f.bmi < 30) adj.push({ factor: '과체중 (BMI 25~30)', delta: 2.0 });
  else adj.push({ factor: '비만 (BMI≥30)', delta: 4.0 });

  // 수면 (시간/일)
  const s = f.sleepHoursPerNight;
  if (s >= 7 && s <= 8.5) adj.push({ factor: '적절한 수면 (7~8.5h)', delta: -0.5 });
  else if (s < 6 || s > 9) adj.push({ factor: '비정상 수면 (<6h 또는 >9h)', delta: 1.5 });

  // 스트레스
  if (f.stressLevel === 'high') adj.push({ factor: '높은 스트레스', delta: 1.5 });
  else if (f.stressLevel === 'low') adj.push({ factor: '낮은 스트레스', delta: -0.5 });

  // 혈압 (수축기)
  if (f.systolicBp >= 160) adj.push({ factor: '심한 고혈압 (SBP≥160)', delta: 3.5 });
  else if (f.systolicBp >= 140) adj.push({ factor: '고혈압 2단계 (SBP 140~159)', delta: 2.0 });
  else if (f.systolicBp >= 130) adj.push({ factor: '고혈압 1단계 (SBP 130~139)', delta: 1.0 });

  // 음주
  if (f.alcoholDrinksPerWeek > 21) adj.push({ factor: '과다 음주 (>21잔/주)', delta: 3.0 });
  else if (f.alcoholDrinksPerWeek > 14) adj.push({ factor: '음주 권고량 초과', delta: 1.5 });

  // 공복 혈당
  if (f.fastingGlucose >= 126) adj.push({ factor: '높은 공복혈당 (≥126)', delta: 2.5 });
  else if (f.fastingGlucose >= 100) adj.push({ factor: '경계 공복혈당 (100~125)', delta: 1.0 });

  // 콜레스테롤
  if (f.ldlCholesterol >= 160) adj.push({ factor: '높은 LDL (≥160)', delta: 1.5 });
  if (f.hdlCholesterol < 40 && f.sex === 'male') adj.push({ factor: '낮은 HDL (남성<40)', delta: 1.0 });
  if (f.hdlCholesterol < 50 && f.sex === 'female') adj.push({ factor: '낮은 HDL (여성<50)', delta: 1.0 });

  // 가족력
  let fam = 0;
  if (f.familyHistoryCardiovascular) fam += 1.0;
  if (f.familyHistoryDiabetes) fam += 0.5;
  if (f.familyHistoryHypertension) fam += 0.5;
  if (fam > 0) adj.push({ factor: '주요 가족력', delta: fam });

  // 자가 평가
  if (f.selfRatedHealth === 'poor') adj.push({ factor: '자가 평가 나쁨', delta: 1.5 });
  else if (f.selfRatedHealth === 'excellent') adj.push({ factor: '자가 평가 매우 좋음', delta: -1.0 });

  return adj;
}

export function estimateBioAge(input: RiskSurveyRequest): BioAgeResult {
  const f = fillDefaults(input);
  const chrono = chronologicalAge(f.birthYear);
  const adj = computeAdjustments(f);
  const totalDelta = adj.reduce((s, a) => s + a.delta, 0);
  const bioAge = Math.max(20, Math.round(chrono + totalDelta));

  // 상위 3개 기여 요인 (절대값 큰 순)
  const sorted = [...adj].sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  const maxAbs = Math.max(...adj.map((a) => Math.abs(a.delta)), 1);
  const contributors: BioAgeContributor[] = sorted.slice(0, 3).map((a) => ({
    factor: a.factor,
    direction: a.delta >= 0 ? 'accelerate' : 'decelerate',
    magnitude: Math.min(1, Math.abs(a.delta) / maxAbs),
    deltaYears: a.delta,
  }));

  return {
    value: bioAge,
    chronologicalAge: chrono,
    ci95: [Math.max(20, bioAge - 3), bioAge + 3],
    contributors,
  };
}
