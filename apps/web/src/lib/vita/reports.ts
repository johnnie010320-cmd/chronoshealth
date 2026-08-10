// VITA 16유형 리포트 = 4대 축의 상태(Good/Impaired) 8종 빌딩블록 조합.
// 원문(VITA code)이 축 단위로 구성돼 있어 이를 정규화했다. 16유형 = 8블록의 4개 조합.
//
// 의료·윤리(apps/web CLAUDE.md): 본 리포트는 "건강 위험 추정"이며 의학적 진단이 아니다.
// 원문의 단정형 질병 시점("X년 내 발병")은 "장기 방치 시 ~ 경향(추정)"으로 완화 반영.
// 영양제 안내는 정보 제공 목적(참고용)이며 복용 전 전문가 상담 권장.

import {
  classifyVita,
  VITA_SECTIONS,
  vitaBand,
  vitaTypeByCode,
  type VitaAxis,
  type VitaBand,
  type VitaResult,
  type VitaSectionId,
  type VitaTypeHeadline,
} from './engine';

export type AxisStateKey = 'E' | 'M' | 'G' | 'D' | 'C' | 'H' | 'S' | 'N';

export type SupplementItem = { name: string; timing: string; role: string };

export type AxisStateBlock = {
  key: AxisStateKey;
  axis: VitaAxis;
  impaired: boolean;
  title: string; // 축 상태 요약 제목
  summary: string; // 기능의학적 해설(추정)
  note: string; // impaired=숨은 위험/장기경향, good=유지 포인트
  eat: string[]; // 도움이 되는 식품
  avoid: string[]; // 줄이면 좋은 식품
  supplements: SupplementItem[]; // 참고용 영양 성분
  tests: string[]; // 참고 정밀검사 항목
};

// 8개 축 상태 블록. good=최적 유지형, impaired=관리 필요형.
const AXIS_BLOCKS: Record<AxisStateKey, AxisStateBlock> = {
  E: {
    key: 'E', axis: 'metabolic', impaired: false,
    title: 'E · 세포 활력·당대사 양호',
    summary: '미토콘드리아 ATP 생산과 인슐린 감수성이 안정적이라 식후 혈당 널뛰기가 적고 기초 활력이 유지되는 경향입니다.',
    note: '유지 포인트: 정제 탄수화물 과다·식후 좌식 습관만 주의하면 현 상태를 오래 지킬 수 있습니다.',
    eat: ['다양한 색 채소·베리류', '양질의 단백질(계란·닭가슴살·생선)', '엑스트라버진 올리브유·아보카도'],
    avoid: ['액상과당·단 음료', '정제 탄수화물 단독 과식'],
    supplements: [
      { name: '코엔자임Q10', timing: '점심 식후', role: '미토콘드리아 에너지 대사 보조(참고)' },
      { name: '오메가-3(rTG)', timing: '저녁 식후', role: '세포막·미세혈관 상태 보조(참고)' },
    ],
    tests: ['공복 인슐린 · HOMA-IR', '당화혈색소(HbA1c)'],
  },
  M: {
    key: 'M', axis: 'metabolic', impaired: true,
    title: 'M · 대사·인슐린 저항 경향',
    summary: '세포 미토콘드리아 효율과 인슐린 수용체 감수성이 떨어져 식후 혈당 스파이크·식곤증·복부지방 축적 경향이 관찰됩니다.',
    note: '장기 방치 시 인슐린 저항 심화·복부비만·대사 지표 악화로 이어질 수 있는 경향(추정)입니다.',
    eat: ['수용성 식이섬유(차전자피·미역)', '식초수(식전)', '저혈당지수 복합 탄수화물(현미·귀리·퀴노아)'],
    avoid: ['액상과당·단 음료', '정제 탄수화물 단독 섭취', '고온 튀김류'],
    supplements: [
      { name: '베르베린 또는 크롬', timing: '점심 식후', role: 'AMPK·당대사 보조(참고)' },
      { name: '알파리포산', timing: '아침 공복', role: '당독소 형성 억제 보조(참고)' },
    ],
    tests: ['공복 인슐린 · HOMA-IR', '연속혈당측정(CGM)', '최종당화산물(AGEs)'],
  },
  G: {
    key: 'G', axis: 'detox', impaired: false,
    title: 'G · 장·간 정화 균형',
    summary: '장 상피 장벽이 견고하고 간 해독 경로가 원활해 더부룩함·잔변감·해독 관련 신호가 적은 경향입니다.',
    note: '유지 포인트: 초가공식품·과음만 조절하면 현재의 정화 균형을 유지할 수 있습니다.',
    eat: ['식이섬유(채소·버섯)', '발효 식품(적정량)', '충분한 수분'],
    avoid: ['초가공·배달 음식 잦은 섭취', '과음'],
    supplements: [
      { name: '프로바이오틱스', timing: '취침 전', role: '장내 유익균 균형 보조(참고)' },
    ],
    tests: ['간 기능(AST/ALT/GGT)'],
  },
  D: {
    key: 'D', axis: 'detox', impaired: true,
    title: 'D · 장 누수·간 해독 과부하 경향',
    summary: '장 상피 치밀결합 약화(장 누수)와 간 해독 효소 과부하로 더부룩함·피부 트러블·숙취 지연·약물 부담 경향이 관찰됩니다.',
    note: '장기 방치 시 만성 미세염증·지방간·자가면역 경향으로 이어질 수 있는 경향(추정)입니다.',
    eat: ['십자화과 채소(브로콜리·케일·양배추)', 'L-글루타민·사골 육수', '차전자피·사과 펙틴'],
    avoid: ['글루텐·밀가루 음식', '초가공식품·유화제·인공첨가물', '과음·산화된 튀김유'],
    supplements: [
      { name: '밀크씨슬(실리마린)', timing: '점심 식후', role: '간세포 보호 보조(참고)' },
      { name: 'NAC · L-글루타민', timing: '아침 공복', role: '글루타치온·장점막 보조(참고)' },
    ],
    tests: ['간 기능 정밀(GGT 포함)', '장 누수(Zonulin)', 'hs-CRP'],
  },
  C: {
    key: 'C', axis: 'circulation', impaired: false,
    title: 'C · 순환·부신 리듬 안정',
    summary: '말초 미세순환과 부신 코르티솔 일주기 리듬이 안정적이라 손발 냉감·부종·야간 각성 신호가 적은 경향입니다.',
    note: '유지 포인트: 장시간 좌식·야간 각성만 피하면 순환·수면 리듬을 잘 유지할 수 있습니다.',
    eat: ['등푸른 생선·견과류', '충분한 수분', '컬러 채소(항산화)'],
    avoid: ['과도한 나트륨', '장시간 좌식'],
    supplements: [
      { name: '오메가-3(rTG)', timing: '저녁 식후', role: '혈관·미세순환 보조(참고)' },
    ],
    tests: ['지질 정밀(ApoB)', 'hs-CRP'],
  },
  H: {
    key: 'H', axis: 'circulation', impaired: true,
    title: 'H · 수면/부신 리듬 고갈 경향',
    summary: '코르티솔 분비 곡선 평탄화·역전과 멜라토닌 저하로 아침 피로·야간 각성·식은땀 등 부신·수면 리듬 교란 경향이 관찰됩니다.',
    note: '장기 방치 시 부신 피로·수면장애·성호르몬 저하 경향으로 이어질 수 있는 경향(추정)입니다.',
    eat: ['천연 멜라토닌 식품(타트체리)', '트립토판 단백질(계란·닭가슴살)', '복합 탄수화물(저녁 소량)'],
    avoid: ['오후 카페인', '야간 음주·야식', '취침 전 단순당'],
    supplements: [
      { name: '포스파티딜세린(PS)', timing: '저녁 식후', role: '야간 코르티솔 완화 보조(참고)' },
      { name: '마그네슘(글리시네이트)', timing: '취침 전', role: '자율신경 이완 보조(참고)' },
    ],
    tests: ['타액 코르티솔/DHEA 4단계(ASI)', '수면 웨어러블 깊은수면'],
  },
  S: {
    key: 'S', axis: 'neuro', impaired: false,
    title: 'S · 근골격·뇌신경 안정',
    summary: '근골격 균형과 뇌 신경전달물질 균형이 양호해 만성 통증·브레인 포그·불안 신호가 적은 경향입니다.',
    note: '유지 포인트: 장시간 기기 사용 후 목·어깨 이완만 챙기면 안정적으로 유지됩니다.',
    eat: ['오메가-3 지방', '컬러 채소·베리류', '충분한 수분'],
    avoid: ['장시간 고정 자세', '과도한 카페인'],
    supplements: [
      { name: '마그네슘(글리시네이트)', timing: '취침 전', role: '근육·신경 이완 보조(참고)' },
    ],
    tests: ['자율신경(HRV) 웨어러블'],
  },
  N: {
    key: 'N', axis: 'neuro', impaired: true,
    title: 'N · 뇌신경 과각성·근골격 긴장 경향',
    summary: 'GABA 저하·교감신경 항진으로 거북목·어깨 결림·브레인 포그·예민함 등 뇌신경 과각성·근막 긴장 경향이 관찰됩니다.',
    note: '장기 방치 시 긴장성 두통·수면장애·자율신경 불균형 경향으로 이어질 수 있는 경향(추정)입니다.',
    eat: ['GABA·트립토판 식품(발아현미·바나나·체리)', 'L-테아닌 녹차', '마그네슘 식품(호박씨·시금치)'],
    avoid: ['오후 카페인', '야간 음주', '정제당·자극적 매운 음식'],
    supplements: [
      { name: 'L-테아닌', timing: '저녁 식후', role: '알파파 유도·이완 보조(참고)' },
      { name: '마그네슘(글리시네이트)', timing: '취침 전', role: '신경 흥분 완화 보조(참고)' },
    ],
    tests: ['자율신경(HRV)·뇌파(EEG)', 'hs-CRP · 호모시스테인'],
  },
};

// 코드 한 글자 → 블록.
export function axisBlock(letter: string): AxisStateBlock | undefined {
  return (AXIS_BLOCKS as Record<string, AxisStateBlock>)[letter];
}

export type VitaSectionScoreRow = {
  id: VitaSectionId;
  no: number;
  titleKo: string;
  score: number;
  band: VitaBand;
};

export type VitaReport = {
  result: VitaResult;
  headline: VitaTypeHeadline | undefined;
  totalBandAvg: VitaBand; // 총점 기반 평균 밴드(참고)
  sectionRows: VitaSectionScoreRow[];
  blocks: AxisStateBlock[]; // 코드 4글자에 해당하는 4개 블록(대사·정화·순환·신경 순)
  eat: string[];
  avoid: string[];
  supplements: SupplementItem[];
  tests: string[];
  goalShort: string;
  goalLong: string;
};

function dedupe(arr: string[]): string[] {
  return [...new Set(arr)];
}

// 영역별 점수 → 완성 리포트(유형·밴드·축 블록·통합 먹을것/피할것/영양제/검사·목표).
export function buildVitaReport(sectionScores: Record<VitaSectionId, number>): VitaReport {
  const result = classifyVita(sectionScores);
  const headline = vitaTypeByCode(result.code);
  const sectionRows: VitaSectionScoreRow[] = VITA_SECTIONS.map((s) => ({
    id: s.id,
    no: s.no,
    titleKo: s.titleKo,
    score: sectionScores[s.id] ?? 0,
    band: vitaBand(sectionScores[s.id] ?? 0),
  }));
  const blocks = result.code
    .split('')
    .map((ch) => axisBlock(ch))
    .filter((b): b is AxisStateBlock => Boolean(b));

  const impairedCount = blocks.filter((b) => b.impaired).length;
  const goalShort =
    impairedCount === 0
      ? '단기(6~12개월): 현재 최적 지표를 한 항목의 저하 없이 유지하는 것을 목표로 합니다.'
      : `단기(3~6개월): 관리가 필요한 ${impairedCount}개 축을 우선 개선해 해당 영역 점수를 12점 이하 '최적'으로 되돌리는 것을 목표로 합니다.`;
  const goalLong =
    '장기(평생): 4대 축(대사·정화·순환·신경)의 균형을 회복·유지해 건강 수명(Healthspan)을 늘리는 것을 목표로 합니다.';

  return {
    result,
    headline,
    totalBandAvg: vitaBand(Math.round(result.totalScore / 10)),
    sectionRows,
    blocks,
    eat: dedupe(blocks.flatMap((b) => b.eat)),
    avoid: dedupe(blocks.flatMap((b) => b.avoid)),
    supplements: blocks.flatMap((b) => b.supplements),
    tests: dedupe(blocks.flatMap((b) => b.tests)),
    goalShort,
    goalLong,
  };
}
