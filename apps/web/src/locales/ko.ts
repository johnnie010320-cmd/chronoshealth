export const ko = {
  meta: {
    title: 'Chronos Health — 베타',
    description:
      '내 건강 데이터로 시작하는 예방의학. 생체 나이와 5년 위험 추정 리포트를 즉시 받아보세요.',
  },
  brand: 'Chronos Health',
  beta: 'BETA',
  language: {
    label: '언어',
    ko: '한국어',
    en: 'English',
    ja: '日本語',
    es: 'Español',
  },
  common: {
    back: '뒤로',
    cancel: '취소',
    retry: '다시 시도',
  },
  landing: {
    eyebrow: 'Preventive medicine · 2026',
    headingLine1: '오래 살기 위한',
    headingLine2: '오늘의 습관',
    body: '과거 건강 정보와 생활 데이터로 나의 생체 나이와 5년 위험을 추정합니다.',
    howItWorks: '어떻게 작동하나요?',
    step1Title: '23문항 설문 응답',
    step1Body: '생활 습관·신체 측정값·가족력. 2~3분.',
    step2Title: '모의 리포트 즉시 발급',
    step2Body: '생체 나이 + 5년 주요 위험 + 개선 행동.',
    step3Title: '데이터는 내가 통제',
    step3Body: '저장 / 익명 활용은 선택. 언제든 철회.',
    disclaimer:
      '본 서비스는 의료 행위를 대체할 수 없으며 건강 증진 참고용입니다. 만 19세 이상만 이용 가능합니다.',
    cta: '설문 시작하기',
  },
  survey: {
    pageTitle: '베타 설문',
    heroTitle: '오늘의 건강을 입력해주세요',
    heroBody: '23문항 · 2~3분 · 모든 답변은 사용자의 동의 없이는 저장되지 않습니다.',
    section: {
      step: 'STEP',
      demographics: '인구통계',
      lifestyle: '생활 습관',
      vitals: '신체 측정값',
      vitalsHint: '모르면 비워두세요. 추정 정확도가 일부 낮아질 수 있습니다.',
      familyHistory: '가족력',
      perception: '자가 인식',
      consent: '데이터 동의 (선택)',
    },
    submit: '모의 리포트 받기',
    submitting: '계산 중…',
    bottomDisclaimer:
      '본 리포트는 의료 행위를 대체할 수 없으며 건강 증진 참고용입니다.',
    fields: {
      birthYear: { label: '출생 연도', placeholder: '예: 1990' },
      sex: {
        label: '성별',
        options: { male: '남성', female: '여성', other: '기타' },
      },
      heightCm: { label: '키 (cm)', placeholder: '예: 175' },
      weightKg: { label: '몸무게 (kg)', placeholder: '예: 70' },
      smoking: {
        label: '흡연',
        options: {
          never: '비흡연',
          former: '과거 흡연',
          current: '현재 흡연',
        },
      },
      alcoholDrinksPerWeek: { label: '주당 음주 잔 수' },
      exerciseMinutesPerWeek: { label: '주당 운동 시간 (분)' },
      sleepHoursPerNight: { label: '하루 평균 수면 (시간)' },
      systolicBp: { label: '수축기 혈압', placeholder: '예: 120' },
      diastolicBp: { label: '이완기 혈압', placeholder: '예: 80' },
      fastingGlucose: { label: '공복 혈당', placeholder: '예: 95' },
      ldlCholesterol: { label: 'LDL 콜레스테롤', placeholder: '예: 110' },
      hdlCholesterol: { label: 'HDL 콜레스테롤', placeholder: '예: 50' },
      familyHistoryDiabetes: { label: '당뇨 가족력' },
      familyHistoryHypertension: { label: '고혈압 가족력' },
      familyHistoryCardiovascular: { label: '심혈관 질환 가족력' },
      stressLevel: {
        label: '스트레스 수준',
        options: { low: '낮음', medium: '보통', high: '높음' },
      },
      selfRatedHealth: {
        label: '자가 건강 평가',
        options: {
          excellent: '매우 좋음',
          good: '좋음',
          fair: '보통',
          poor: '나쁨',
        },
      },
      consentToStore: { label: '내 응답을 저장하는 것에 동의합니다' },
      consentToResearch: {
        label: '익명화된 데이터를 연구 목적으로 활용하는 것에 동의합니다',
      },
    },
    error: {
      validation: '입력값 확인 필요',
      UNAUTHORIZED: '인증이 필요합니다 (베타 토큰 누락).',
      AGE_RESTRICTED: '만 19세 미만은 이용할 수 없습니다.',
      RATE_LIMITED: '일일 호출 한도(5회)를 초과했습니다.',
      INVALID_INPUT: '입력값을 다시 확인해주세요.',
      INVALID_JSON: '요청 형식이 올바르지 않습니다.',
      generic: '서버 오류',
    },
  },
  result: {
    pageTitle: '나의 리포트',
    bioAgeEyebrow: '생체 나이 추정',
    bioAgeUnit: '세',
    bioAgeDiffPrefix: '실제 나이',
    bioAgeDiffSuffix: '세 대비',
    bioAgeYearSuffix: '년',
    bioAgeCi: '95% 신뢰구간',
    contributorsTitle: '주요 기여 요인',
    diseaseRiskTitle: '5년 주요 위험',
    diseaseRiskEmpty: '표시할 위험 항목이 없습니다.',
    diseaseRiskCategory: {
      low: '낮음',
      moderate: '보통',
      high: '높음',
    },
    diseaseRisk5yLabel: '5년',
    improvementTitle: '개선 행동 제안',
    improvementEmpty:
      '현 단계는 모의값입니다. 실제 계산식 도입 후 개인 맞춤 제안이 표시됩니다.',
    improvementConfidence: '신뢰도',
    improvementBioAgeUnit: '생체 나이',
    improvementFactorPrefix: '개선 가능',
    modelLabel: '모델',
    reportIdLabel: 'ID',
    resetCta: '설문 다시 작성',
    hotlines: {
      title: '도움이 필요하시면 즉시 연락해주세요',
      suicide: '자살예방상담전화',
      mentalHealth: '정신건강위기상담전화',
    },
  },
  signup: {
    pageTitle: '회원가입',
    heroTitle: '시작하기 전에 가입해주세요',
    heroBody:
      '이름·전화·이메일은 본 서비스 외부로 공유되지 않으며 별도 격리 저장소에 보관됩니다.',
    section: {
      identity: '본인 정보',
      consent: '동의',
    },
    fields: {
      name: { label: '이름', placeholder: '홍길동' },
      email: { label: '이메일', placeholder: 'you@example.com' },
      phone: { label: '전화번호', placeholder: '010-1234-5678' },
      birthYear: { label: '출생 연도', placeholder: '예: 1990' },
      sex: {
        label: '성별',
        options: { male: '남성', female: '여성', other: '기타' },
      },
    },
    consent: {
      medical: {
        label: '건강 데이터 처리 동의 (필수)',
        description:
          '입력하신 설문·측정값·가족력을 위험 추정 목적으로 처리하는 데 동의합니다.',
      },
      terms: {
        label: '이용약관 및 개인정보 처리방침 동의 (필수)',
        description:
          '서비스 이용약관 및 개인정보 처리방침에 동의합니다.',
      },
    },
    submit: '가입하고 설문 시작',
    submitting: '가입 중…',
    bottomNote:
      '본인 인증 / 비밀번호는 향후 단계에서 추가됩니다. 현 단계는 비공개 베타 입니다.',
    error: {
      validation: '입력값 확인 필요',
      AGE_RESTRICTED: '만 19세 미만은 가입할 수 없습니다.',
      CONSENT_REQUIRED: '건강 데이터 처리 및 이용약관 동의가 필요합니다.',
      IDENTITY_EXISTS:
        '이미 가입된 정보입니다. 멀티 디바이스 로그인은 향후 본인 인증 도입 후 제공됩니다.',
      RATE_LIMITED: '일일 가입 시도 한도(10회)를 초과했습니다.',
      INVALID_INPUT: '입력값을 다시 확인해주세요.',
      INVALID_JSON: '요청 형식이 올바르지 않습니다.',
      generic: '서버 오류',
    },
  },
};

export type Dictionary = typeof ko;
