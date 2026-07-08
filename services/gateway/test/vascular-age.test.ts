import { describe, it, expect } from 'vitest';
import {
  risk10yFromRisk5y,
  vascularAgeFromRisk10y,
} from '../src/avatar/vascular-age.js';
import { framinghamCvdRisk } from '../src/risk/framingham.js';
import { estimateLifetimeCost } from '../src/avatar/medical_cost.js';
import type { RiskSurveyRequest } from '../src/schemas/risk-survey.js';

// 혈관 나이 — D'Agostino 2008 §Vascular Age.
// fiveAges.vascular 가 bioAge 복사본이던 자리표시자를 실계산으로 대체.

const YEAR = new Date().getFullYear();

function survey(over: Partial<RiskSurveyRequest> = {}): RiskSurveyRequest {
  return {
    birthYear: YEAR - 50,
    sex: 'male',
    heightCm: 175,
    weightKg: 72,
    smoking: 'never',
    alcoholDrinksPerWeek: 2,
    exerciseMinutesPerWeek: 150,
    sleepHoursPerNight: 7,
    systolicBp: 120,
    diastolicBp: 78,
    fastingGlucose: 90,
    ldlCholesterol: 100,
    hdlCholesterol: 55,
    familyHistoryDiabetes: false,
    familyHistoryHypertension: false,
    familyHistoryCardiovascular: false,
    stressLevel: 'medium',
    selfRatedHealth: 'good',
    consentPii: true,
    consentMedicalDisclaimer: true,
    consentToResearch: false,
    ...over,
  } as RiskSurveyRequest;
}

describe('vascular age', () => {
  it('5년 → 10년 위험 역변환은 framingham 근사의 정확한 역함수', () => {
    const r = framinghamCvdRisk(survey());
    expect(risk10yFromRisk5y(r.probability5y)).toBeCloseTo(r.probability10y, 10);
  });

  it('위험인자가 나쁘면 혈관 나이 > 실제 나이', () => {
    const bad = survey({
      smoking: 'current',
      systolicBp: 165,
      hdlCholesterol: 32,
      ldlCholesterol: 190,
      fastingGlucose: 140,
    });
    const r = framinghamCvdRisk(bad);
    const vAge = vascularAgeFromRisk10y('male', r.probability10y);
    expect(vAge.value).toBeGreaterThan(50);
    expect(vAge.capped).toBe(true); // 극단 위험 → 상한 80 도달
  });

  it('위험인자가 정상이면 혈관 나이 ≈ 실제 나이 (±6세)', () => {
    // 논문 참조 프로필: TC 180, HDL 45(남), SBP 125, 비흡연, 비당뇨.
    // 우리 설문은 LDL 입력이므로 총콜레스테롤이 근사된다 → 오차 허용.
    const r = framinghamCvdRisk(
      survey({ hdlCholesterol: 45, ldlCholesterol: 110, systolicBp: 125 }),
    );
    const vAge = vascularAgeFromRisk10y('male', r.probability10y);
    expect(Math.abs(vAge.value - 50)).toBeLessThanOrEqual(6);
    expect(vAge.capped).toBe(false);
  });

  it('위험이 커질수록 혈관 나이는 단조 증가', () => {
    const ages = [0.02, 0.05, 0.1, 0.2, 0.4].map(
      (r) => vascularAgeFromRisk10y('male', r).value,
    );
    for (let i = 1; i < ages.length; i += 1) {
      expect(ages[i]!).toBeGreaterThanOrEqual(ages[i - 1]!);
    }
  });

  it('성별 분리 — 같은 위험이면 여성의 혈관 나이가 더 높다', () => {
    // 같은 10년 위험을 갖는다면, 여성은 기저 위험이 낮으므로 더 고령이어야 한다.
    const male = vascularAgeFromRisk10y('male', 0.1);
    const female = vascularAgeFromRisk10y('female', 0.1);
    expect(female.value).toBeGreaterThan(male.value);
  });

  it('경계 — r10 = 0 / 1 에서 발산하지 않고 클램프', () => {
    expect(Number.isFinite(vascularAgeFromRisk10y('male', 0).value)).toBe(true);
    expect(Number.isFinite(vascularAgeFromRisk10y('male', 1).value)).toBe(true);
    expect(vascularAgeFromRisk10y('male', 0).value).toBeGreaterThanOrEqual(30);
    expect(vascularAgeFromRisk10y('male', 1).value).toBe(80);
    expect(vascularAgeFromRisk10y('male', 1).capped).toBe(true);
  });

  it("'other' 성별은 남성 계수로 처리 (framingham.ts 와 동일 규칙)", () => {
    expect(vascularAgeFromRisk10y('other', 0.12)).toEqual(
      vascularAgeFromRisk10y('male', 0.12),
    );
  });
});

describe('생애 예상 의료비 — 총액 정합 (v0.1.0 결함 회귀)', () => {
  it('totalKrw 는 perDecadeKrw 합과 정확히 일치한다', () => {
    for (const age of [30, 45, 58, 65, 72, 81]) {
      const cost = estimateLifetimeCost({
        chronologicalAge: age,
        predictedRemainingYears: 40,
        bioAgePenalty: 3,
        risks: { cvd: 0.05, diabetes: 0.03 },
      });
      const sum = cost.perDecadeKrw.reduce((a, b) => a + b, 0);
      expect(cost.totalKrw).toBe(sum);
    }
  });

  it('연령 배수가 총액에 반영된다 — 고령일수록 같은 잔여연수 대비 총액 증가', () => {
    const young = estimateLifetimeCost({
      chronologicalAge: 40,
      predictedRemainingYears: 20,
    });
    const old = estimateLifetimeCost({
      chronologicalAge: 70,
      predictedRemainingYears: 20,
    });
    expect(old.totalKrw).toBeGreaterThan(young.totalKrw);
  });

  it('60/70/80 을 구간 중간에 넘어가는 해도 배수를 받는다', () => {
    // 55세 + 10년 → 55~59 는 1.0, 60~64 는 1.2. v0.1.0 은 10년 전체를 1.0 으로 계산했다.
    const cost = estimateLifetimeCost({
      chronologicalAge: 55,
      predictedRemainingYears: 10,
    });
    const flat = estimateLifetimeCost({
      chronologicalAge: 45,
      predictedRemainingYears: 10,
    });
    expect(cost.totalKrw).toBeGreaterThan(flat.totalKrw);
  });

  it('잔여 연수 0 → 총액 0, 분해 빈 배열', () => {
    const cost = estimateLifetimeCost({
      chronologicalAge: 90,
      predictedRemainingYears: 0,
    });
    expect(cost.totalKrw).toBe(0);
    expect(cost.perDecadeKrw).toHaveLength(0);
  });

  it('modelVersion 이 v0.2.0 으로 갱신됐다', () => {
    const cost = estimateLifetimeCost({
      chronologicalAge: 40,
      predictedRemainingYears: 10,
    });
    expect(cost.modelVersion).toBe('lifetime-cost-v0.2.0');
  });
});
