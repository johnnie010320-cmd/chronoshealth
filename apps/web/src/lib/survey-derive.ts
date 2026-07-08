// 설문 세부 입력 → 위험 계산용 coarse 값 파생.
// 계산 모듈(framingham/bio-age/disease-risks)은 여전히 coarse 값만 사용하므로,
// 세부 입력(주종·주량, 운동 종류/강도/시간)을 여기서 표준화된 단일 값으로 환산해 함께 전송한다.

export type AlcoholType = 'beer' | 'soju' | 'wine' | 'spirits' | 'makgeolli' | 'other';
export type AlcoholEntry = { type: AlcoholType; amountPerWeek: number };
export type ExerciseKind = 'aerobic' | 'strength' | 'other';
export type ExerciseIntensity = 'high' | 'medium' | 'low';
export type ExerciseEntry = {
  kind: ExerciseKind;
  intensity: ExerciseIntensity;
  minutesPerWeek: number;
};

// 주종별 표준잔 환산 계수(1잔 기준). 표준잔 ≈ 순알코올 14g. 아래 ALCOHOL_GLASS_ML 용량 가정과 정합.
// beer 355ml·5% ≈ 1.0 / soju 50ml·17% ≈ 0.5 / wine 150ml·12% ≈ 1.0 /
// spirits 40ml·40% ≈ 0.9 / makgeolli 200ml·6% ≈ 0.7 / other 중립 1.0.
export const ALCOHOL_STD_FACTOR: Record<AlcoholType, number> = {
  beer: 1.0,
  soju: 0.5,
  wine: 1.0,
  spirits: 0.9,
  makgeolli: 0.7,
  other: 1.0,
};

// 주종별 "1잔" 기준 용량(ml) — 사용자에게 잔의 양을 표시. other 는 0(표시 안 함).
export const ALCOHOL_GLASS_ML: Record<AlcoholType, number> = {
  beer: 355,
  soju: 50,
  wine: 150,
  spirits: 40,
  makgeolli: 200,
  other: 0,
};

// 여러 주종의 (주종·주량) 목록 → 표준잔/주 합계(위험 계산 입력). 0~100 클램프.
export function deriveAlcoholDrinksPerWeek(entries: AlcoholEntry[]): number {
  const std = entries.reduce(
    (sum, e) => sum + (e.amountPerWeek || 0) * (ALCOHOL_STD_FACTOR[e.type] ?? 1),
    0,
  );
  return Math.max(0, Math.min(100, Math.round(std)));
}

// 운동 강도 가중(중강도 유효분 환산). WHO: 고강도 1분 ≈ 중강도 2분.
export const EXERCISE_INTENSITY_WEIGHT: Record<ExerciseIntensity, number> = {
  high: 2.0,
  medium: 1.0,
  low: 0.5,
};

// 운동 목록 → 강도가중 유효 운동분/주(위험 계산 입력). 0~2000 클램프.
export function deriveExerciseMinutesPerWeek(exercises: ExerciseEntry[]): number {
  const eff = exercises.reduce(
    (sum, e) => sum + (e.minutesPerWeek || 0) * (EXERCISE_INTENSITY_WEIGHT[e.intensity] ?? 1),
    0,
  );
  return Math.max(0, Math.min(2000, Math.round(eff)));
}
