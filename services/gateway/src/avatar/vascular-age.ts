// 혈관 나이 (vascular age) — D'Agostino RB Sr et al. Circulation 2008, §"Vascular Age".
// https://www.ahajournals.org/doi/10.1161/CIRCULATIONAHA.107.699579
//
// 정의: 같은 성별에서 **모든 위험인자가 정상 수준**인 사람이 사용자와 동일한
// 10년 CVD 위험을 갖게 되는 나이. 위험인자가 나쁠수록 실제 나이보다 높게 나온다.
//
// 기존 구현은 fiveAges.vascular 에 bioAge 를 그대로 복사했다(자리표시자).
// 본 모듈은 이미 산출된 Framingham 10년 위험만으로 해석적으로 역산한다 — 재설문 불필요.
//
// ⚠️ 의료 행위 아님. "혈관 나이 추정"이며 진단·처방이 아니다 (apps/web 규칙 1).

// framingham.ts 와 동일한 계수. 두 모듈이 어긋나면 혈관 나이가 조용히 틀어지므로
// 값이 바뀔 땐 반드시 함께 갱신한다.
const MEN = {
  ageB: 3.06117,
  totalCholB: 1.12370,
  hdlB: -0.93263,
  sbpUntreatedB: 1.93303,
  meanLP: 23.9802,
  baselineS0_10y: 0.88936,
  hdlNormal: 45,
};

const WOMEN = {
  ageB: 2.32888,
  totalCholB: 1.20904,
  hdlB: -0.70833,
  sbpUntreatedB: 2.76157,
  meanLP: 26.1931,
  baselineS0_10y: 0.95012,
  hdlNormal: 55,
};

// 논문의 "normal" 참조 수준 — 총콜레스테롤 180, SBP 125(미치료), 비흡연, 비당뇨.
// HDL 만 성별로 다르다 (남 45 / 여 55).
const NORMAL_TOTAL_CHOL = 180;
const NORMAL_SBP = 125;

// 산출 범위. 논문의 vascular age 표는 30세에서 시작하고 상한을 ">80" 으로만 보고한다.
// 특히 여성은 정상 프로필 기저 위험이 낮아 고위험 입력이 쉽게 80을 넘어가는데,
// 그 구간의 외삽값(예: 90세)을 단정적으로 표시하면 과잉 주장이 된다 → capped 로 알린다.
const MIN_VASCULAR_AGE = 30;
const MAX_VASCULAR_AGE = 80;

export const VASCULAR_AGE_MODEL_VERSION = 'vascular-age-v0.1.0';

export type VascularAge = {
  value: number;
  /** 상한(80) 에 걸렸다 — UI 는 "80+" 로 표시해야 한다. */
  capped: boolean;
};

/**
 * 10년 CVD 위험 → 혈관 나이.
 *
 * 정상 위험인자 프로필의 선형예측자에서 나이 항만 미지수로 두고 역산한다.
 *   r10 = 1 − S0^exp(lp − meanLP)
 *   ⇒ lp = meanLP + ln( ln(1 − r10) / ln(S0) )
 *   ⇒ ln(age) = (lp − 비-나이 항 합) / ageB
 */
export function vascularAgeFromRisk10y(
  sex: 'male' | 'female' | 'other',
  probability10y: number,
): VascularAge {
  const c = sex === 'female' ? WOMEN : MEN;

  // 경계: r10 = 0 이면 ln(1−0) = 0 → ln(0) 이 −∞. r10 → 1 도 발산.
  // 실제 계산 전에 유한 구간으로 좁힌다.
  const r10 = Math.max(1e-6, Math.min(0.99, probability10y));

  const survivalRatio = Math.log(1 - r10) / Math.log(c.baselineS0_10y);
  const lp = c.meanLP + Math.log(survivalRatio);

  const nonAgeTerms =
    c.totalCholB * Math.log(NORMAL_TOTAL_CHOL) +
    c.hdlB * Math.log(c.hdlNormal) +
    c.sbpUntreatedB * Math.log(NORMAL_SBP);
  // 비흡연·비당뇨이므로 해당 항은 0.

  const raw = Math.exp((lp - nonAgeTerms) / c.ageB);
  if (!Number.isFinite(raw)) return { value: MIN_VASCULAR_AGE, capped: false };

  const value = Math.round(
    Math.max(MIN_VASCULAR_AGE, Math.min(MAX_VASCULAR_AGE, raw)),
  );
  return { value, capped: raw >= MAX_VASCULAR_AGE };
}

/**
 * 리포트에는 5년 위험만 저장된다. framingham.ts 가 쓴 근사
 *   r5 = 1 − sqrt(1 − r10)
 * 의 정확한 역함수로 10년 위험을 복원한다.
 */
export function risk10yFromRisk5y(probability5y: number): number {
  const r5 = Math.max(0, Math.min(0.99, probability5y));
  return 1 - (1 - r5) ** 2;
}
