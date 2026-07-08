import type { CareCategory } from './heuristics.js';

export type Locale = 'ko' | 'en' | 'ja' | 'es';

export type AffiliateCard = {
  slug: string;
  category: CareCategory;
  partner: string;
  title: string;
  body: string;
  ctaLabel: string;
  ctaUrl: string;
  // 실제 제휴 미연동(자리표시자 URL) 여부 — UI 가 "준비중" 안내로 처리.
  comingSoon: boolean;
};

type CardI18n = Record<Locale, { title: string; body: string; ctaLabel: string }>;

type CardRow = {
  slug: string;
  category: CareCategory;
  partner: string;
  ctaUrl: string;
  i18n: CardI18n;
};

const PLACEHOLDER_URL = 'https://chronoshealth.ever-day.com/care';

// 시범 운영 카탈로그 (P1).
// 실제 제휴 데이터는 D1 care_affiliates 테이블에서 확장 가능.
const SEED: CardRow[] = [
  {
    slug: 'diet-mediterranean-plan',
    category: 'diet',
    partner: 'Chronos Lab',
    ctaUrl: `${PLACEHOLDER_URL}#diet-med`,
    i18n: {
      ko: {
        title: '지중해식 식단 7일 플랜',
        body: '주 5회 채소·전곡·올리브유 중심. 체중·LDL 동시 관리.',
        ctaLabel: '자세히 보기',
      },
      en: {
        title: 'Mediterranean 7-day plan',
        body: 'Veggies, whole grains, olive oil 5x/week. Helps weight + LDL.',
        ctaLabel: 'Details',
      },
      ja: {
        title: '地中海食 7日プラン',
        body: '週5回の野菜・全粒穀物・オリーブオイル。体重とLDLを同時管理。',
        ctaLabel: '詳細を見る',
      },
      es: {
        title: 'Plan mediterráneo de 7 días',
        body: 'Vegetales, granos integrales y aceite de oliva 5 veces/semana. Peso + LDL.',
        ctaLabel: 'Detalles',
      },
    },
  },
  {
    slug: 'diet-low-glycemic-pack',
    category: 'diet',
    partner: 'Glucose-Friendly Kitchen',
    ctaUrl: `${PLACEHOLDER_URL}#diet-gi`,
    i18n: {
      ko: {
        title: '저GI 도시락 (가족력 당뇨 대비)',
        body: '주 3회 배송. 식후 혈당 변동 감소를 돕는 메뉴.',
        ctaLabel: '제휴 페이지',
      },
      en: {
        title: 'Low-GI meal box (diabetes family history)',
        body: '3x/week delivery. Designed to soften postprandial glucose swings.',
        ctaLabel: 'Partner page',
      },
      ja: {
        title: '低GI弁当(糖尿家族歴向け)',
        body: '週3回配送。食後血糖変動を抑える献立。',
        ctaLabel: 'パートナー',
      },
      es: {
        title: 'Comida bajo IG (antecedentes de diabetes)',
        body: 'Reparto 3x/semana. Diseñado para suavizar la glucosa postprandial.',
        ctaLabel: 'Socio',
      },
    },
  },
  {
    slug: 'exercise-home-cardio-30',
    category: 'exercise',
    partner: 'Chronos Move',
    ctaUrl: `${PLACEHOLDER_URL}#exercise-cardio`,
    i18n: {
      ko: {
        title: '집에서 30분 유산소 루틴',
        body: '주 5일·30분. 별도 장비 없이 활력 점수 개선 기대.',
        ctaLabel: '루틴 받기',
      },
      en: {
        title: '30-min home cardio routine',
        body: '5 days/week, 30 min, no equipment. Aims to lift Vitality.',
        ctaLabel: 'Get routine',
      },
      ja: {
        title: '自宅で30分有酸素ルーティン',
        body: '週5日30分、器具不要。活力スコア改善を目指す。',
        ctaLabel: 'ルーティン取得',
      },
      es: {
        title: 'Rutina cardio en casa 30 min',
        body: '5 días/semana, 30 min, sin equipo. Mejora la vitalidad.',
        ctaLabel: 'Obtener',
      },
    },
  },
  {
    slug: 'exercise-strength-bands',
    category: 'exercise',
    partner: 'Chronos Move',
    ctaUrl: `${PLACEHOLDER_URL}#exercise-strength`,
    i18n: {
      ko: {
        title: '관절 친화 저강도 근력 (밴드)',
        body: '관절 부담 줄이며 근력 보강. 주 3회 15분.',
        ctaLabel: '시작하기',
      },
      en: {
        title: 'Joint-friendly band strength',
        body: 'Builds strength with low joint load. 3x/week, 15 min.',
        ctaLabel: 'Start',
      },
      ja: {
        title: '関節にやさしい低強度筋力 (バンド)',
        body: '関節負担を抑えながら筋力強化。週3回15分。',
        ctaLabel: '開始',
      },
      es: {
        title: 'Fuerza con bandas (suave para articulaciones)',
        body: 'Fuerza con baja carga articular. 3x/semana, 15 min.',
        ctaLabel: 'Empezar',
      },
    },
  },
  {
    slug: 'medical-annual-checkup-kr',
    category: 'medical',
    partner: 'Health Screening Partner',
    ctaUrl: `${PLACEHOLDER_URL}#medical-checkup`,
    i18n: {
      ko: {
        title: '연 1회 건강검진 예약',
        body: '40세 이상 권장. 혈압·당·콜레스테롤 기본 패키지.',
        ctaLabel: '파트너 안내',
      },
      en: {
        title: 'Annual health screening',
        body: 'Recommended 40+. BP · glucose · cholesterol basic package.',
        ctaLabel: 'Partner info',
      },
      ja: {
        title: '年1回の健康診断予約',
        body: '40歳以上推奨。血圧・血糖・コレステロール基本パック。',
        ctaLabel: 'パートナー',
      },
      es: {
        title: 'Chequeo anual',
        body: 'Recomendado a partir de los 40. Paquete básico TA · glucosa · colesterol.',
        ctaLabel: 'Información',
      },
    },
  },
  {
    slug: 'medical-smoking-cessation',
    category: 'medical',
    partner: 'Chronos Lab',
    ctaUrl: `${PLACEHOLDER_URL}#medical-quit-smoking`,
    i18n: {
      ko: {
        title: '금연 보조 프로그램',
        body: '주간 체크인 + 행동 변화 자료. 외부 클리닉 연계.',
        ctaLabel: '프로그램 안내',
      },
      en: {
        title: 'Smoking-cessation support',
        body: 'Weekly check-ins + behaviour-change materials. Clinic partner ties.',
        ctaLabel: 'Program info',
      },
      ja: {
        title: '禁煙サポートプログラム',
        body: '週次チェック+行動変容資料。外部クリニック連携。',
        ctaLabel: 'プログラム',
      },
      es: {
        title: 'Programa de cese tabáquico',
        body: 'Revisiones semanales + materiales de cambio de hábito. Clínicas asociadas.',
        ctaLabel: 'Programa',
      },
    },
  },
];

function localize(row: CardRow, locale: Locale): AffiliateCard {
  const i = row.i18n[locale];
  return {
    slug: row.slug,
    category: row.category,
    partner: row.partner,
    title: i.title,
    body: i.body,
    ctaLabel: i.ctaLabel,
    ctaUrl: row.ctaUrl,
    // 자리표시자(자기 도메인 /care) URL 이면 아직 실제 제휴 미연동 → 준비중.
    comingSoon: row.ctaUrl.startsWith(PLACEHOLDER_URL),
  };
}

// Future: read from analysisDb.care_affiliates. Current: in-memory seed.
export function listAffiliates(category: CareCategory, locale: Locale): AffiliateCard[] {
  return SEED.filter((r) => r.category === category).map((r) => localize(r, locale));
}

export const AFFILIATE_LOCALES: Locale[] = ['ko', 'en', 'ja', 'es'];
