// VITA test — 통합 신체 대사 & 라이프스타일 자가 진단 엔진.
// 10개 영역(영역당 20문항, 문항당 0~3점, 영역 만점 60) → 4대 축 판정 → 16유형 코드.
//
// 의료·윤리(apps/web CLAUDE.md): 본 결과는 "건강 위험 추정 리포트"이며 의학적 진단이 아니다.
// 첨부 원문(VITA test/VITA code)의 단정형 질병 시점 표현은 "추정/신뢰구간" 프레이밍으로 반영한다.
// 원저작권: VITA healthcare (인용 시 출처 표기).

export type VitaAxis = 'metabolic' | 'detox' | 'circulation' | 'neuro';
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
export const VITA_MAX_PER_SECTION = 60; // 20문항 × 3점
export const VITA_TOTAL_MAX = 600; // 10영역 × 60
export const VITA_OPTIMAL_MAX = 12; // 0~12 최적(Good)

// 4단계 평가 밴드(영역별, 0~60). 원문 진단 결과 종합 집계표 기준.
export function vitaBand(sectionScore: number): VitaBand {
  if (sectionScore <= 12) return 'optimal';
  if (sectionScore <= 25) return 'caution';
  if (sectionScore <= 42) return 'warning';
  return 'danger';
}

export const VITA_SECTIONS: VitaSection[] = [
  { id: 'energy', no: 1, axis: 'metabolic', titleKo: '세포 에너지 및 활력', titleEn: 'Cellular Energy & Vitality' },
  { id: 'glucose', no: 2, axis: 'metabolic', titleKo: '인슐린 조절 및 당 대사', titleEn: 'Glucose & Metabolic Balance' },
  { id: 'gut', no: 3, axis: 'detox', titleKo: '장내 환경 및 소화 기능', titleEn: 'Gut Health & Microbiome' },
  { id: 'inflammation', no: 4, axis: 'detox', titleKo: '만성 염증 및 면역 반응', titleEn: 'Inflammation & Immune System' },
  { id: 'detox', no: 5, axis: 'detox', titleKo: '해독 및 간 대사 기능', titleEn: 'Detoxification & Liver Health' },
  { id: 'circulation', no: 6, axis: 'circulation', titleKo: '심혈관 및 순환계', titleEn: 'Cardiovascular & Circulation' },
  { id: 'hormone', no: 7, axis: 'circulation', titleKo: '호르몬 및 부신 내분비계', titleEn: 'Hormonal & Endocrine System' },
  { id: 'sleep', no: 8, axis: 'circulation', titleKo: '수면 및 생체 리듬', titleEn: 'Sleep Quality & Circadian Rhythm' },
  { id: 'musculoskeletal', no: 9, axis: 'neuro', titleKo: '근골격 및 신체 구조 균형', titleEn: 'Musculoskeletal Health & Biomechanics' },
  { id: 'neuro', no: 10, axis: 'neuro', titleKo: '스트레스 및 뇌 신경 건강', titleEn: 'Neuro-Mental Health & Stress' },
];

// 축별 문자: 최적(축 소속 영역이 모두 ≤12)이면 Good 문자, 하나라도 ≥13이면 Impaired 문자.
// metabolic E/M · detox G/D · circulation C/H · neuro S/N. 코드 순서 = [대사][정화][순환][신경].
const AXIS_LETTER: Record<VitaAxis, { good: string; impaired: string }> = {
  metabolic: { good: 'E', impaired: 'M' },
  detox: { good: 'G', impaired: 'D' },
  circulation: { good: 'C', impaired: 'H' },
  neuro: { good: 'S', impaired: 'N' },
};
const AXIS_ORDER: VitaAxis[] = ['metabolic', 'detox', 'circulation', 'neuro'];

export type VitaResult = {
  sectionScores: Record<VitaSectionId, number>;
  axisImpaired: Record<VitaAxis, boolean>;
  code: string; // 4글자 코드(예: EGCS)
  totalScore: number;
};

// 영역별 점수 → 축 판정 → 16유형 코드.
export function classifyVita(sectionScores: Record<VitaSectionId, number>): VitaResult {
  const axisImpaired: Record<VitaAxis, boolean> = {
    metabolic: false,
    detox: false,
    circulation: false,
    neuro: false,
  };
  for (const s of VITA_SECTIONS) {
    if ((sectionScores[s.id] ?? 0) > VITA_OPTIMAL_MAX) axisImpaired[s.axis] = true;
  }
  const code = AXIS_ORDER.map((ax) =>
    axisImpaired[ax] ? AXIS_LETTER[ax].impaired : AXIS_LETTER[ax].good,
  ).join('');
  const totalScore = VITA_SECTIONS.reduce((sum, s) => sum + (sectionScores[s.id] ?? 0), 0);
  return { sectionScores, axisImpaired, code, totalScore };
}

// 16유형 헤드라인(원문 'VITA Classification' 표 기반). 상세 본문 리포트는 별도 모듈에서 제공.
export type VitaTypeHeadline = {
  code: string;
  group: 'E' | 'ED' | 'MG' | 'MD';
  nicknameKo: string;
  nicknameEn: string;
  coreStateKo: string;
  keySymptomsKo: string;
};

export const VITA_TYPES: VitaTypeHeadline[] = [
  { code: 'EGCS', group: 'E', nicknameKo: '만능 열정가', nicknameEn: 'Super-Achiever', coreStateKo: '완벽한 최적화(엔진·해독·호르몬·신경 무결점)', keySymptomsKo: '피로를 모름, 밤샘 후 새벽 운동 가능, 먹는 족족 에너지화, 멘탈 갑' },
  { code: 'EGCN', group: 'E', nicknameKo: '심야의 아이디어 연구원', nicknameEn: 'The Night Brain', coreStateKo: '뇌 신경망 과각성(에너지는 넘치나 스위치가 안 꺼짐)', keySymptomsKo: '밤새 몰입, 야간 과각성으로 입면 장애, 머릿속 아이디어 폭발, 낮엔 기운참' },
  { code: 'EGHS', group: 'E', nicknameKo: '지친 챔피언', nicknameEn: 'Exhausted Hero', coreStateKo: '번아웃 초입(기본 스펙은 좋으나 배터리 방전)', keySymptomsKo: '다크서클, 카페인으로 버팀, 아침 기상 곤란, 주말 내내 잠, 기력 부진' },
  { code: 'EGHN', group: 'E', nicknameKo: '폭주하는 레이서', nicknameEn: 'Hyper-focused Sprinter', coreStateKo: '열정 과부하(추진력은 최상이나 수면·신경 고갈)', keySymptomsKo: '커피 3잔 필수, 단기간 미친 퍼포먼스, 짜증 증가, 수면 장애' },
  { code: 'EDCS', group: 'ED', nicknameKo: '속 깊은 은둔가', nicknameEn: 'Quiet Storer', coreStateKo: '무증상 독소 적체(겉은 멀쩡하나 장·간 해독 정체)', keySymptomsKo: '외견상 건강, 식후 은근한 더부룩함, 가스, 만성적 가벼운 피부 트러블' },
  { code: 'EDCN', group: 'ED', nicknameKo: '안개 속의 전략가', nicknameEn: 'Foggy Thinker', coreStateKo: '신경 염증/브레인 포그(해독 독소가 BBB를 통과해 뇌 자극)', keySymptomsKo: '머리가 멍함, 방금 하려던 일 깜빡, 집중력 저하, 인지 피로, 만성 두통' },
  { code: 'EDHS', group: 'ED', nicknameKo: '야근하는 청소부', nicknameEn: 'Midnight Worker', coreStateKo: '야간 해독 멈춤(수면 분절로 자가포식·해독 중단)', keySymptomsKo: '낮엔 멀쩡, 아침에 온몸이 무거움, 야간 스마트폰 과다, 자고 나도 개운치 않음' },
  { code: 'EDHN', group: 'ED', nicknameKo: '가시 돋친 완벽주의자', nicknameEn: 'Tense Overachiever', coreStateKo: '3중 과부하(해독 저하+부신 고갈+신경 과각성)', keySymptomsKo: '어깨 굳음, 오기로 버팀, 작은 자극에도 폭발' },
  { code: 'MGCS', group: 'MG', nicknameKo: '식후 15분의 느림보', nicknameEn: 'Easygoing Snoozer', coreStateKo: '당대사 마비 초기(세포 미토콘드리아 에너지 생산 저하)', keySymptomsKo: '밥만 먹으면 졸림(식곤증), 점심 후 급격한 나른함, 무던한 성격' },
  { code: 'MGCN', group: 'MG', nicknameKo: '예민한 초감각가', nicknameEn: 'Hypersensitive Observer', coreStateKo: '에너지 고갈+신경 과각성(연료는 부족한데 안테나만 켜짐)', keySymptomsKo: '작은 소리에도 놀람, 금방 지침, 만성 피로와 예민함 공존, 불안감' },
  { code: 'MGHS', group: 'MG', nicknameKo: '방전된 멘토', nicknameEn: 'Burnout Veteran', coreStateKo: '만성 피로 체질(당대사 마비+부신 호르몬 고갈 중첩)', keySymptomsKo: '아침에 눈뜨기 힘듦, 하루 종일 기력 없음, 일상 활동 곤란, 식후 피로 극심' },
  { code: 'MGHN', group: 'MG', nicknameKo: '불안한 경비원', nicknameEn: 'Anxious Guardian', coreStateKo: '완전 방전+불안 사이렌(호르몬 고갈, 신경계 비상 신호)', keySymptomsKo: '에너지는 0, 마음은 불안, 24시간 비상 경계, 극심한 인지 피로' },
  { code: 'MDCS', group: 'MD', nicknameKo: '속이 답답한 탱커', nicknameEn: 'Sensitive Protector', coreStateKo: '장 누수+만성 염증(당대사 저하+장 장벽 손상으로 염증 유입)', keySymptomsKo: '늘 뱃속에 가스 차고 더부룩, 편한 옷 선호, 피부 염증' },
  { code: 'MDCN', group: 'MD', nicknameKo: '길 잃은 방랑자', nicknameEn: 'Confused Wanderer', coreStateKo: '뇌-장-대사 3중 위기(저혈당+장 내독소+뇌 신경 염증 복합)', keySymptomsKo: '소화제·두통약 필수, 만성 두통, 심각한 브레인 포그, 만성 소화불량' },
  { code: 'MDHS', group: 'MD', nicknameKo: '동면 중인 휴식가', nicknameEn: 'Hibernating Restorer', coreStateKo: '3중 다중 에너지 고갈(대사·해독·부신 호르몬 침체)', keySymptomsKo: '손가락 하나 움직이기 힘듦, 온몸이 쑤시고 아픔(만성 통증)' },
  { code: 'MDHN', group: 'MD', nicknameKo: '집중 케어가 필요한 회복 대상', nicknameEn: 'Recovery Candidate', coreStateKo: '전신 사중 완전 침체(대사·해독·호르몬·신경 전체 저하)', keySymptomsKo: '모든 일 버거움, 완전한 휴식 필요, 기초부터 재정비 권장' },
];

export function vitaTypeByCode(code: string): VitaTypeHeadline | undefined {
  return VITA_TYPES.find((t) => t.code === code);
}
