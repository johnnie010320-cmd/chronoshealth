import type { Locale } from '../care/affiliates.js';

export type SpendItem = {
  slug: string;
  cost: number;
  partner: string;
  title: string;
  body: string;
};

type SpendRow = {
  slug: string;
  cost: number;
  partner: string;
  i18n: Record<Locale, { title: string; body: string }>;
};

const SEED: SpendRow[] = [
  {
    slug: 'diet-mediterranean-discount',
    cost: 100,
    partner: 'Chronos Lab',
    i18n: {
      ko: {
        title: '지중해식 식단 플랜 10% 할인 쿠폰',
        body: '주 7일 플랜 첫 결제에 적용 가능합니다.',
      },
      en: {
        title: '10% off Mediterranean meal plan',
        body: 'Applies to your first 7-day plan order.',
      },
      ja: {
        title: '地中海食プラン 10%割引クーポン',
        body: '初回7日プランの注文に適用。',
      },
      es: {
        title: '10% off plan mediterráneo',
        body: 'Se aplica al primer pedido del plan de 7 días.',
      },
    },
  },
  {
    slug: 'exercise-home-cardio-discount',
    cost: 150,
    partner: 'Chronos Move',
    i18n: {
      ko: {
        title: '집 유산소 루틴 30% 할인 쿠폰',
        body: '월간 구독 첫 결제에 적용 가능합니다.',
      },
      en: {
        title: '30% off home cardio routine',
        body: 'Applies to your first monthly subscription.',
      },
      ja: {
        title: '自宅有酸素ルーティン 30%割引クーポン',
        body: '月額初回課金に適用。',
      },
      es: {
        title: '30% off cardio en casa',
        body: 'Se aplica a la primera suscripción mensual.',
      },
    },
  },
  {
    slug: 'medical-checkup-discount',
    cost: 300,
    partner: 'Health Screening Partner',
    i18n: {
      ko: {
        title: '건강검진 패키지 10,000원 할인 쿠폰',
        body: '연 1회 정기 검진 예약 시 사용.',
      },
      en: {
        title: '$10 off annual health screening',
        body: 'Use at booking for the annual checkup.',
      },
      ja: {
        title: '健康診断パッケージ 1,000円割引',
        body: '年1回の定期検診予約時に使用。',
      },
      es: {
        title: '10€ de descuento en chequeo anual',
        body: 'Usar al reservar el chequeo anual.',
      },
    },
  },
];

export function listSpendCatalog(locale: Locale): SpendItem[] {
  return SEED.map((row) => ({
    slug: row.slug,
    cost: row.cost,
    partner: row.partner,
    title: row.i18n[locale].title,
    body: row.i18n[locale].body,
  }));
}

export function findSpendItem(slug: string): SpendRow | null {
  return SEED.find((r) => r.slug === slug) ?? null;
}
