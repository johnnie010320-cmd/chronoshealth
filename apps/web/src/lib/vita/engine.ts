// VITA CODE V8 — 통합 신체 대사 & 라이프스타일 자가 진단 엔진.
// 10개 영역(영역당 20문항, 문항당 0~5점, 영역 만점 100) → 4대 축 스펙트럼 판정 → 16 대사 아키타입 코드.
//
// V8 4대 축 / 8대 엔진 스펙트럼(원문 VITA CODE V8 설명서):
//   1축 대사·에너지   V (Vitality-Flex)   ↔ F (Fuel-Saver)      : energy, glucose
//   2축 심혈관·순환   I (Inner-Flow)      ↔ G (Glyco-Vessel)    : circulation
//   3축 장·간·해독    T (Tidy-Filter)     ↔ L (Lymphatic-Cleanser): gut, inflammation, detox
//   4축 호르몬·리듬   A (Adaptive-Rhythm) ↔ S (Serene-Sleeper)   : hormone, sleep, musculoskeletal, neuro
// 코드 순서 = [1축][2축][3축][4축]. 전 영역 최적이면 'VITA'.
//
// 의료·윤리(apps/web CLAUDE.md): 본 결과는 "건강 위험 추정/생활습관 코칭"이며 의학적 진단이 아니다.
// V/I/T/A(주 엔진)·F/G/L/S(보존 엔진)는 우열이 아닌 대사 성향 스펙트럼으로 제시한다.
// 원저작권: VITA healthcare(VITA CODE V8). 인용 시 출처 표기.

import { vitaArchetype } from './archetypes';

export type VitaAxis = 'metabolic' | 'circulation' | 'gutliver' | 'hormonal';
export type VitaBand = 'optimal' | 'caution' | 'warning' | 'danger';

// 영역 1~10 식별자. 각 영역은 하나의 축에 속한다.
export type VitaSectionId =
  | 'energy'
  | 'glucose'
  | 'gut'
  | 'inflammation'
  | 'detox'
  | 'circulation'
  | 'hormone'
  | 'sleep'
  | 'musculoskeletal'
  | 'neuro';

export type VitaSection = {
  id: VitaSectionId;
  no: number; // 1~10 표시 번호
  axis: VitaAxis;
  titleKo: string;
  titleEn: string;
};

export const VITA_QUESTIONS_PER_SECTION = 20;
export const VITA_MAX_PER_SECTION = 100; // 20문항 × 5점
export const VITA_TOTAL_MAX = 1000; // 10영역 × 100
export const VITA_OPTIMAL_MAX = 20; // 0~20 최적(Optimal) — 밴드 경계
// 스펙트럼 슬라이더 중앙(50:50). 축 증상 부하가 이보다 낮으면 주 엔진(V/I/T/A),
// 높으면 보존 엔진(F/G/L/S)이 '주도적'(원문 V8 설명서 "스펙트럼 슬라이더 해석": 중앙 편향 50:50 = 균형).
export const VITA_SPECTRUM_MIDPOINT = 50;

// 4단계 평가 밴드(영역별, 0~100). 원문 영역별 점수 판정 기준.
//  0~20 최적 · 21~45 주의 · 46~70 경고 · 71~100 위험.
export function vitaBand(sectionScore: number): VitaBand {
  if (sectionScore <= 20) return 'optimal';
  if (sectionScore <= 45) return 'caution';
  if (sectionScore <= 70) return 'warning';
  return 'danger';
}

export const VITA_SECTIONS: VitaSection[] = [
  { id: 'energy', no: 1, axis: 'metabolic', titleKo: '세포 에너지 및 활력', titleEn: 'Cellular Energy & Vitality' },
  { id: 'glucose', no: 2, axis: 'metabolic', titleKo: '인슐린 조절 및 당 대사', titleEn: 'Glucose & Metabolic Balance' },
  { id: 'gut', no: 3, axis: 'gutliver', titleKo: '장내 환경 및 소화 기능', titleEn: 'Gut Health & Microbiome' },
  { id: 'inflammation', no: 4, axis: 'gutliver', titleKo: '만성 염증 및 면역 반응', titleEn: 'Inflammation & Immune System' },
  { id: 'detox', no: 5, axis: 'gutliver', titleKo: '해독 및 간 대사 기능', titleEn: 'Detoxification & Liver Health' },
  { id: 'circulation', no: 6, axis: 'circulation', titleKo: '심혈관 및 순환계', titleEn: 'Cardiovascular & Circulation' },
  { id: 'hormone', no: 7, axis: 'hormonal', titleKo: '호르몬 및 부신 내분비계', titleEn: 'Hormonal & Endocrine System' },
  { id: 'sleep', no: 8, axis: 'hormonal', titleKo: '수면 및 생체 리듬', titleEn: 'Sleep Quality & Circadian Rhythm' },
  { id: 'musculoskeletal', no: 9, axis: 'hormonal', titleKo: '근골격 및 신체 구조 균형', titleEn: 'Musculoskeletal Health & Biomechanics' },
  { id: 'neuro', no: 10, axis: 'hormonal', titleKo: '스트레스 및 뇌 신경 건강', titleEn: 'Neuro-Mental Health & Stress' },
];

// 축 메타(표시용). primary=주 엔진(V/I/T/A·저증상), secondary=보존 엔진(F/G/L/S·고증상 보상).
export type VitaAxisMeta = {
  axis: VitaAxis;
  no: number;
  labelKo: string; // 축 짧은 이름(대사/순환/해독/리듬)
  titleKo: string; // 축 풀네임
  primary: { letter: string; name: string };
  secondary: { letter: string; name: string };
};

export const VITA_AXIS_META: VitaAxisMeta[] = [
  {
    axis: 'metabolic', no: 1, labelKo: '대사', titleKo: '대사·에너지',
    primary: { letter: 'V', name: 'Vitality-Flex' },
    secondary: { letter: 'F', name: 'Fuel-Saver' },
  },
  {
    axis: 'circulation', no: 2, labelKo: '순환', titleKo: '심혈관·순환',
    primary: { letter: 'I', name: 'Inner-Flow' },
    secondary: { letter: 'G', name: 'Glyco-Vessel' },
  },
  {
    axis: 'gutliver', no: 3, labelKo: '해독', titleKo: '장·간·해독',
    primary: { letter: 'T', name: 'Tidy-Filter' },
    secondary: { letter: 'L', name: 'Lymphatic-Cleanser' },
  },
  {
    axis: 'hormonal', no: 4, labelKo: '리듬', titleKo: '호르몬·리듬',
    primary: { letter: 'A', name: 'Adaptive-Rhythm' },
    secondary: { letter: 'S', name: 'Serene-Sleeper' },
  },
];

export const VITA_AXIS_ORDER: VitaAxis[] = ['metabolic', 'circulation', 'gutliver', 'hormonal'];

const AXIS_SECTIONS: Record<VitaAxis, VitaSectionId[]> = {
  metabolic: ['energy', 'glucose'],
  circulation: ['circulation'],
  gutliver: ['gut', 'inflammation', 'detox'],
  hormonal: ['hormone', 'sleep', 'musculoskeletal', 'neuro'],
};

// 축 평균 증상 부하(0~100)가 스펙트럼 중앙(50) 이하 → 주 엔진(V/I/T/A)이 주도적,
// 초과 → 보존 엔진(F/G/L/S)이 주도적. (원문 V8 설명서 "4개 축의 점수 비율에 따라 주된 대사
// 프로필 코드를 부여" + 슬라이더 50:50 중앙 기준.) 이전엔 최적 경계(20)로 과도하게 쏠렸음.
function axisIsSecondary(load: number): boolean {
  return load > VITA_SPECTRUM_MIDPOINT;
}

export type VitaResult = {
  sectionScores: Record<VitaSectionId, number>;
  axisLoad: Record<VitaAxis, number>; // 축별 평균 증상 부하(0~100)
  axisSecondary: Record<VitaAxis, boolean>; // true=보존 엔진(F/G/L/S)
  code: string; // 4글자 코드(예: VITA)
  totalScore: number; // 0~1000
};

// 영역별 점수 → 축 스펙트럼 판정 → 16 아키타입 코드.
export function classifyVita(sectionScores: Record<VitaSectionId, number>): VitaResult {
  const axisLoad = {} as Record<VitaAxis, number>;
  const axisSecondary = {} as Record<VitaAxis, boolean>;
  for (const meta of VITA_AXIS_META) {
    const ids = AXIS_SECTIONS[meta.axis];
    const sum = ids.reduce((acc, id) => acc + (sectionScores[id] ?? 0), 0);
    const load = Math.round(sum / ids.length); // 축 평균(0~100)
    axisLoad[meta.axis] = load;
    axisSecondary[meta.axis] = axisIsSecondary(load);
  }
  const code = VITA_AXIS_META.map((m) =>
    axisSecondary[m.axis] ? m.secondary.letter : m.primary.letter,
  ).join('');
  const totalScore = VITA_SECTIONS.reduce((sum, s) => sum + (sectionScores[s.id] ?? 0), 0);
  return { sectionScores, axisLoad, axisSecondary, code, totalScore };
}

// 축별 주 엔진 강도(%) — 스펙트럼 슬라이더용. 100=완전 주 엔진(V/I/T/A), 0=완전 보존 엔진(F/G/L/S).
export function axisPrimaryPercent(load: number): number {
  return Math.max(0, Math.min(100, 100 - load));
}

// 16 유형 헤드라인(아키타입 데이터에서 파생).
export type VitaTypeHeadline = {
  code: string;
  nicknameKo: string;
  nicknameEn: string;
  coreStateKo: string;
};

export function vitaTypeByCode(code: string): VitaTypeHeadline | undefined {
  const a = vitaArchetype(code);
  if (!a) return undefined;
  return { code: a.code, nicknameKo: a.nicknameKo, nicknameEn: a.nicknameEn, coreStateKo: a.coreStateKo };
}
