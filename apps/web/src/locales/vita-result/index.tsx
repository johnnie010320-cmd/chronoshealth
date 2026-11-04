'use client';

// VITA 결과·디지털 트윈 화면 전용 문구 사전. 앱 전역 사전(locales/*.ts)과 같은 언어 설정(useI18n)을 따른다.

import { Fragment, type ReactNode } from 'react';
import { useI18n, type Locale } from '@/lib/i18n';
import { vrKo, type VitaResultDict } from './ko';
import { vrEn } from './en';
import { vrJa } from './ja';
import { vrEs } from './es';

const DICTS: Record<Locale, VitaResultDict> = { ko: vrKo, en: vrEn, ja: vrJa, es: vrEs };

export function useVitaResultT(): { t: VitaResultDict; locale: Locale } {
  const { locale } = useI18n();
  return { t: DICTS[locale], locale };
}

// '{code}는 ...' 같은 문구의 {key}를 값(굵은 글씨 등)으로 바꿔 렌더한다.
export function formatRich(template: string, values: Record<string, ReactNode>): ReactNode {
  const parts = template.split(/\{(\w+)\}/g);
  return parts.map((p, i) => (i % 2 === 1 ? <Fragment key={i}>{values[p] ?? `{${p}}`}</Fragment> : p));
}
