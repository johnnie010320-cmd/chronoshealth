// VITA CODE V8 — 16 대사 유형 심층 가이드(첨부 "비타코드 V8 16 대사 유형 심층 종합 가이드북" 전사).
// 결과 화면(PDF 6페이지)에서 내 유형의 동물별 대사 특징·추천 영양소·운동/휴식·식단을 보여준다.
// 출처: VITA CODE V8 Metabolic Matrix. 의료·윤리: 건강 위험 추정/생활습관 코칭이며 의학적 진단이 아니다.

export type VitaGuide = {
  code: string;
  group: string; // 매트릭스 그룹
  feature: string; // 대사 특징
  nutrients: string[]; // 추천 영양소
  exerciseRest: string[]; // 운동 & 휴식
  diet?: string; // 식단 전략
  caution?: string; // 주의 사항
};

export const VITA_GUIDES: Record<string, VitaGuide> = {
  VITA: {
    code: 'VITA',
    group: 'High Power · Narrow Fuel',
    feature:
      '미토콘드리아 ATP 생성이 극대화된 최고 에너지 출력형입니다. 교감신경 우세형으로 지방과 단백질을 신속히 연소시키며 발열 효과가 뛰어나지만, 특정 단백질 연료 의존도가 높아 가공 탄수화물 과다 시 대사 불균형이 오기 쉽습니다.',
    nutrients: ['고단백 살코기', '코코넛 오일(MCT)', 'B-Complex', '마그네슘'],
    exerciseRest: ['고강도 인터벌 트레이닝(HIIT)', '단기 집중 운동', '야간 정적인 수면 확보'],
  },
  VITS: {
    code: 'VITS',
    group: 'High Power · Night Rhythms',
    feature:
      '고에너지 대사 능력을 지녔으나 야간 신경계와 멜라토닌 분비 축이 발달한 밤의 지배자형입니다. 심야 시간대에 세포 회복과 해독 효소 분비가 가장 활성화됩니다.',
    nutrients: ['L-테아닌', '트립토판', '아연', '항산화 섭취(블루베리·퀘르세틴)'],
    exerciseRest: ['저녁 시간대 유산소 운동', '암막 커튼으로 수면 환경 극대화'],
  },
  VILA: {
    code: 'VILA',
    group: 'High Power · Fluid Burner',
    feature:
      '수분 대사와 혈류 순환 능력이 매우 우수한 유연한 에너지 연소자입니다. 탄수화물·지방을 모두 손쉽게 에너지로 전환하는 뛰어난 대사 유연성을 지녔습니다.',
    nutrients: ['오메가-3 지방산', '칼륨', '수분 보충', '전해질 밸런스 음식'],
    exerciseRest: ['수영', '전신 유산소 운동', '수분 공급 중심 순환 관리'],
    caution: '수분 정체 방지를 위한 나트륨 조절이 필요합니다.',
  },
  VILS: {
    code: 'VILS',
    group: 'High Power · Flexible Night',
    feature:
      '세심하고 예민한 신경계를 지닌 고효율 연소자입니다. 야간에 간 해독과 세포 정화(autophagy)가 극대화되며, 특정 화학첨가물·당분에 민감할 수 있습니다.',
    nutrients: ['밀크씨슬(실리마린)', '글루타치온', '유기농 식단', '비타민 C'],
    exerciseRest: ['필라테스', '스트레칭', '정돈된 야간 간헐적 단식'],
    caution: '카페인 민감도가 높아 오후 2시 이후 카페인을 제한하세요.',
  },
  VGTA: {
    code: 'VGTA',
    group: 'Shield Power · Heavy Fuel',
    feature:
      '단단한 체격과 강한 방어 기전을 가진 기사형 대사 체계입니다. 혈관과 장벽 보호력이 강하지만 에너지를 저장하려는 경향이 강해 소화 기관에 과부하가 걸리기 쉽습니다.',
    nutrients: ['소화효소제', '식이섬유', '식이유황(MSM)', '프로바이오틱스'],
    exerciseRest: ['중량 웨이트 트레이닝', '근력 보존형 유산소 운동'],
    diet: '고영양 저열량 식단, 정제 탄수화물 엄격 제한',
  },
  VGTS: {
    code: 'VGTS',
    group: 'Starry Power · Rest Balance',
    feature:
      '차분하고 긴 수면·휴식으로 신경계와 대사를 재충전하는 유형입니다. 소화 대사 속도는 느리지만 자원 보존 능력이 뛰어나며 장내 미생물 환경의 영향을 크게 받습니다.',
    nutrients: ['발효 식품', '프리바이오틱스', '카모마일', '유기농 채소류'],
    exerciseRest: ['산책', '느린 템포의 요가', '8시간 이상 수면 확보'],
    diet: '소화가 쉬운 따뜻한 익힌 채소 위주의 식단',
  },
  VGLA: {
    code: 'VGLA',
    group: 'Wave Flow · High Active',
    feature:
      '탁월한 혈류·림프 순환 능력을 가진 파도형 대사자입니다. 호기성 대사 능력이 뛰어나 산소 공급과 영양 전달 속도가 매우 빠릅니다.',
    nutrients: ['L-아르기닌', '비트루트 추출물', '코엔자임 Q10', '비타민 E'],
    exerciseRest: ['러닝', '사이클링', '심폐 지구력 강화 운동'],
    diet: '질산염이 풍부한 녹색 잎채소 및 혈관 건강 식단',
  },
  VGLS: {
    code: 'VGLS',
    group: 'Moonlight · Guard Burner',
    feature:
      '밤과 새벽 시간대에 대사·면역 감시 능력이 극대화되는 수호자형입니다. 야간 신체 활동과 대사 전환이 수월하지만 일주기 리듬 교란에 취약할 수 있습니다.',
    nutrients: ['아연', '셀레늄', '비타민 D', '알파리포산'],
    exerciseRest: ['야간 서킷 트레이닝', '규율적인 라이프스타일 유지'],
    diet: '저녁 식사 시 양질의 단백질과 건강한 지방 비율 확대',
  },
  FITA: {
    code: 'FITA',
    group: 'Steady · Low Power',
    feature:
      '에너지 소비량이 적고 연료를 아껴 쓰는 절약형 대사입니다. 혈관 흐름과 장 정화는 양호하지만 출력에 여유가 적어 부신 피질 호르몬(코르티솔) 변화에 민감하므로, 스트레스 관리와 규칙적인 식사가 대사율의 핵심입니다.',
    nutrients: ['아쉬와간다', '비타민 B6', '자몽', '정제 안 된 천일염'],
    exerciseRest: ['빈야사 요가', '코어 강화 운동', '호흡법 훈련'],
    diet: '소식 다맥(잦은 소량 섭취)으로 혈당 안정화',
  },
  FITS: {
    code: 'FITS',
    group: 'Deep Sleep · Energy Saver',
    feature:
      '기저대사율이 낮고 에너지를 효율적으로 보존하려는 경향이 가장 강한 부교감신경 우세형입니다. 깊은 수면을 통해 체내 독소 배출과 대사 리셋이 일어납니다.',
    nutrients: ['녹차 추출물(EGCG)', 'L-카르니틴', '스피루리나', '매운 양념류'],
    exerciseRest: ['식후 가벼운 산책', '따뜻한 반신욕', '9시간 이상 충분한 수면'],
    diet: '따뜻하고 과도하지 않은 적정 열량 식단',
  },
  FILA: {
    code: 'FILA',
    group: 'Steady Flow · Light Active',
    feature:
      '에너지 출력은 낮지만 낮 동안 꾸준히 움직이며 림프 순환으로 노폐물을 내보내는 유형입니다. 오래 앉아 있으면 부종과 피로가 쌓이고 오후 에너지 급락이 잦으므로, 자주 움직이고 혈당을 안정시키는 것이 핵심입니다.',
    nutrients: ['칼륨이 풍부한 채소', '양질의 단백질', '오메가-3', '마그네슘'],
    exerciseRest: ['빠르게 걷기·가벼운 리바운딩', '하체 근력 운동', '다리를 올리고 쉬는 휴식'],
    diet: '혈당 스파이크 방지를 위해 식이섬유 우선 섭취(Vegetables First)',
  },
  FILS: {
    code: 'FILS',
    group: 'Crystal · Night Saver',
    feature:
      '에너지를 아껴 쓰는 보존형 대사로, 밤사이 깊은 수면과 림프 순환을 통해 몸을 정비합니다. 수면이 흔들리면 다음 날 피로와 부종이 크게 늘고, 미네랄 밸런스가 컨디션 유지의 핵심 열쇠입니다.',
    nutrients: ['마그네슘', '이온화 미네랄', '견과류', '비타민 E'],
    exerciseRest: ['소도구 필라테스', '릴렉스 요가', '정적인 저녁 루틴'],
    diet: '아몬드·호두 등 건강한 견과류 위주의 간식',
  },
  FGTA: {
    code: 'FGTA',
    group: 'Sturdy · Dense Energy',
    feature:
      '에너지를 저장하려는 절약형 대사에 혈관 방어 반응이 더해진 묵직한 방어자입니다. 장 장벽은 깨끗하지만 지방 대사 전환이 느리고 식후 혈당 변동이 혈관에 부담을 줄 수 있어 신중한 식단 선택이 요구됩니다.',
    nutrients: ['시트러스 바이오플라보노이드', '올리브잎 추출물', '크롬'],
    exerciseRest: ['지속적인 저강도 장시간 유산소(Zone 2 Training)'],
    diet: '포화지방 감소 및 불포화지방 위주의 유기농 식단',
  },
  FGTS: {
    code: 'FGTS',
    group: 'Cosmic · Ultra Saver',
    feature:
      '극도로 효율적인 자원 보존 체계를 지닌 자원 절약형 유형입니다. 칼로리 소모율이 적어 과식 시 체중 증가와 혈액 순환 정체가 빠르게 올 수 있습니다.',
    nutrients: ['갑상선 지원 영양소(요오드·셀레늄)', '계피', '생강 추출물'],
    exerciseRest: ['온열 찜질', '신체 가열 체조', '정기적인 가벼운 전신 움직임'],
    diet: '간헐적 단식 및 체온을 높여주는 온성(溫性) 음식 구성',
  },
  FGLA: {
    code: 'FGLA',
    group: 'Nature · Clean Saver',
    feature:
      '에너지를 아끼는 절약형 대사에 혈관 방어 반응과 림프 순환 해독이 함께 작동하는 유형입니다. 독소·당독소에 민감도가 높아 클린 라이프스타일을 적용하면 대사 개선 효과가 빠르게 나타납니다.',
    nutrients: ['클로렐라', '엽록소(Chlorophyll)', '비타민 C', '클린 플랜트 프로틴'],
    exerciseRest: ['야외 트레킹', '숲속 산책', '자연 친화적 휴식'],
    diet: '초가공식품 완전 배제, 채식 중심의 생기 있는 식단',
  },
  FGLS: {
    code: 'FGLS',
    group: 'Starlight · Night Saver',
    feature:
      '에너지를 깊이 아끼는 보존형 대사로, 밤사이 수면과 림프 순환에 기대어 몸을 정비하는 턱시도 신사형입니다. 추위를 잘 타고 혈관이 자극에 민감하게 반응하므로, 몸을 따뜻하게 하고 수면 리듬을 지키는 것이 핵심입니다.',
    nutrients: ['고함량 오메가-3', '비타민 D3+K2', '마그네슘', '생강·계피 등 온성 향신료'],
    exerciseRest: ['낮 시간 가벼운 유산소 운동', '따뜻한 반신욕', '정돈된 야간 휴식'],
    diet: '혈관 보호와 체온 유지를 돕는 양질의 해산물·등푸른생선과 따뜻한 음식 위주의 식단',
  },
};

export function vitaGuide(code: string | null | undefined): VitaGuide | undefined {
  if (!code) return undefined;
  return VITA_GUIDES[code.toUpperCase()];
}

// 코드 4글자 해설(매트릭스 축). 결과·설명 화면 공용.
export type VitaAxisDecode = {
  pos: number;
  letters: string;
  domain: string;
  high: string;
  low: string;
};

export const VITA_AXIS_DECODE: VitaAxisDecode[] = [
  { pos: 1, letters: 'V / F', domain: '세포 에너지', high: 'Vitality · 고대사/발열', low: 'Flex-Saver · 절약형 대사' },
  { pos: 2, letters: 'I / G', domain: '심혈관·순환', high: 'Inner-Flow · 혈류 활성', low: 'Guard-Vessel · 혈관 보호형' },
  { pos: 3, letters: 'T / L', domain: '장·간·해독', high: 'Tidy-Filter · 강력 해독', low: 'Lymph-Cleaner · 순환 해독' },
  { pos: 4, letters: 'A / S', domain: '호르몬·리듬', high: 'Active-Day · 주간 활성', low: 'Serene-Night · 야간 수면' },
];

export const VITA_SYSTEM_INTRO =
  '비타코드 V8 System은 인간의 대사 생화학 체계를 4가지 핵심 메커니즘 척도를 기준으로 정밀하게 분화하여 총 16가지 대사 유형(16 Metabolic Types)으로 분류합니다. 각 유형은 에너지 생성 능력, 미토콘드리아 활성도, 영양소 대사 유연성, 호르몬·자율신경 반응성을 종합해 동물 상징으로 직관화했습니다.';

// 가이드북 원문 문구(최대한 그대로 적용).
export const VITA_MATRIX_TITLE = 'VITA CODE V8 METABOLIC MATRIX';
export const VITA_MATRIX_SUBTITLE = '16가지 맞춤형 대사 동물 유형 심층 가이드';

export const VITA_AXIS_Y =
  'Y축 (Metabolic Power / 에너지 출력): 상단일수록 High Power(강력한 ATP 생성 및 고대사), 하단일수록 Low Power(저에너지, 효율적 자원 절약형 대사).';
export const VITA_AXIS_X =
  'X축 (Fuel Adaptability / 연료 유연성): 좌측은 Narrow(특정 영양소 중심 대사), 우측은 Wide(탄수화물·지방·단백질 자유 대사).';

export type VitaStep = { title: string; desc: string };
export const VITA_STEPS: VitaStep[] = [
  {
    title: '1단계 (신호 파악)',
    desc: '자신의 핵심 대사 동물 코드를 확인하고 에너지 출력(Y축)과 연료 유연성(X축)의 위치를 확인합니다.',
  },
  {
    title: '2단계 (영양 매칭)',
    desc: '추천 영양소 및 피해야 할 음식군(예: High Power형의 정제당 제한, Low Power형의 온성 음식 선택)을 반영합니다.',
  },
  {
    title: '3단계 (서카디안 리듬 적응)',
    desc: 'Day(A) 타입과 Night(S) 타입에 맞춰 운동 시간대와 수면 솔루션을 차별화하여 적용합니다.',
  },
];

export const VITA_CLOSING =
  '비타코드 V8은 당신의 고유한 생화학적 엔진에 딱 맞는 최적의 연료와 리듬을 제시합니다.';
