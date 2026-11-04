// VITA CODE V8 결과 본문 현지화 — 한국어 원문(archetypes.ts / guidebook.ts / engine.ts)에 en/ja/es 번역을 덧씌운다.
// 번역이 없는 항목은 한국어 원문으로 폴백(화면이 비지 않게).

import type { VitaLocale } from '../animals';
import type { VitaArchetype } from '../archetypes';
import type { VitaAxis, VitaSectionId } from '../engine';
import {
  VITA_AXIS_DECODE,
  VITA_AXIS_X,
  VITA_AXIS_Y,
  VITA_CLOSING,
  VITA_MATRIX_SUBTITLE,
  VITA_STEPS,
  VITA_SYSTEM_INTRO,
  vitaGuide,
  type VitaGuide,
} from '../guidebook';
import type { VitaArchetypeText, VitaGuideText, VitaIntroText } from './types';
import { ARCHETYPES_1 as EN_A1 } from './en/archetypes-1';
import { ARCHETYPES_2 as EN_A2 } from './en/archetypes-2';
import { GUIDES as EN_G, INTRO as EN_I } from './en/guidebook';
import { ARCHETYPES_1 as JA_A1 } from './ja/archetypes-1';
import { ARCHETYPES_2 as JA_A2 } from './ja/archetypes-2';
import { GUIDES as JA_G, INTRO as JA_I } from './ja/guidebook';
import { ARCHETYPES_1 as ES_A1 } from './es/archetypes-1';
import { ARCHETYPES_2 as ES_A2 } from './es/archetypes-2';
import { GUIDES as ES_G, INTRO as ES_I } from './es/guidebook';

type Foreign = Exclude<VitaLocale, 'ko'>;

const ARCHETYPES: Record<Foreign, Record<string, VitaArchetypeText>> = {
  en: { ...EN_A1, ...EN_A2 },
  ja: { ...JA_A1, ...JA_A2 },
  es: { ...ES_A1, ...ES_A2 },
};
const GUIDES: Record<Foreign, Record<string, VitaGuideText>> = { en: EN_G, ja: JA_G, es: ES_G };
const INTROS: Record<Foreign, VitaIntroText> = { en: EN_I, ja: JA_I, es: ES_I };

// 영역(1~10) 이름. ko/en은 engine.ts의 titleKo/titleEn과 같다.
const SECTION_TITLES: Record<VitaLocale, Record<VitaSectionId, string>> = {
  ko: {
    energy: '세포 에너지 및 활력',
    glucose: '인슐린 조절 및 당 대사',
    gut: '장내 환경 및 소화 기능',
    inflammation: '만성 염증 및 면역 반응',
    detox: '해독 및 간 대사 기능',
    circulation: '심혈관 및 순환계',
    hormone: '호르몬 및 부신 내분비계',
    sleep: '수면 및 생체 리듬',
    musculoskeletal: '근골격 및 신체 구조 균형',
    neuro: '스트레스 및 뇌 신경 건강',
  },
  en: {
    energy: 'Cellular Energy & Vitality',
    glucose: 'Glucose & Metabolic Balance',
    gut: 'Gut Health & Microbiome',
    inflammation: 'Inflammation & Immune System',
    detox: 'Detoxification & Liver Health',
    circulation: 'Cardiovascular & Circulation',
    hormone: 'Hormonal & Endocrine System',
    sleep: 'Sleep Quality & Circadian Rhythm',
    musculoskeletal: 'Musculoskeletal Health & Biomechanics',
    neuro: 'Neuro-Mental Health & Stress',
  },
  ja: {
    energy: '細胞エネルギーと活力',
    glucose: 'インスリン調節と糖代謝',
    gut: '腸内環境と消化機能',
    inflammation: '慢性炎症と免疫反応',
    detox: '解毒と肝臓の代謝機能',
    circulation: '心血管と循環系',
    hormone: 'ホルモンと副腎内分泌系',
    sleep: '睡眠と生体リズム',
    musculoskeletal: '筋骨格と身体構造のバランス',
    neuro: 'ストレスと脳神経の健康',
  },
  es: {
    energy: 'Energía celular y vitalidad',
    glucose: 'Regulación de insulina y metabolismo de la glucosa',
    gut: 'Entorno intestinal y digestión',
    inflammation: 'Inflamación crónica y respuesta inmune',
    detox: 'Desintoxicación y función hepática',
    circulation: 'Sistema cardiovascular y circulación',
    hormone: 'Sistema hormonal y suprarrenal',
    sleep: 'Sueño y ritmo circadiano',
    musculoskeletal: 'Equilibrio musculoesquelético y postural',
    neuro: 'Estrés y salud neurológica',
  },
};

// 축 짧은 이름(대사/순환/해독/리듬)과 풀네임.
const AXIS_TITLES: Record<VitaLocale, Record<VitaAxis, { label: string; title: string }>> = {
  ko: {
    metabolic: { label: '대사', title: '대사·에너지' },
    circulation: { label: '순환', title: '심혈관·순환' },
    gutliver: { label: '해독', title: '장·간·해독' },
    hormonal: { label: '리듬', title: '호르몬·리듬' },
  },
  en: {
    metabolic: { label: 'Metabolism', title: 'Metabolism · Energy' },
    circulation: { label: 'Circulation', title: 'Cardiovascular · Circulation' },
    gutliver: { label: 'Detox', title: 'Gut · Liver · Detox' },
    hormonal: { label: 'Rhythm', title: 'Hormones · Rhythm' },
  },
  ja: {
    metabolic: { label: '代謝', title: '代謝・エネルギー' },
    circulation: { label: '循環', title: '心血管・循環' },
    gutliver: { label: '解毒', title: '腸・肝・解毒' },
    hormonal: { label: 'リズム', title: 'ホルモン・リズム' },
  },
  es: {
    metabolic: { label: 'Metabolismo', title: 'Metabolismo · Energía' },
    circulation: { label: 'Circulación', title: 'Cardiovascular · Circulación' },
    gutliver: { label: 'Detox', title: 'Intestino · Hígado · Detox' },
    hormonal: { label: 'Ritmo', title: 'Hormonas · Ritmo' },
  },
};

export function vitaSectionTitle(id: VitaSectionId, locale: VitaLocale): string {
  return SECTION_TITLES[locale][id];
}

export function vitaAxisTitle(axis: VitaAxis, locale: VitaLocale): { label: string; title: string } {
  return AXIS_TITLES[locale][axis];
}

// 아키타입 원문(ko) → 현지화 문구. 번역이 없으면 원문 그대로.
export function vitaArchetypeText(a: VitaArchetype, locale: VitaLocale): VitaArchetypeText {
  const tr = locale === 'ko' ? undefined : ARCHETYPES[locale][a.code];
  if (tr) return tr;
  return {
    nickname: a.nicknameKo,
    coreState: a.coreStateKo,
    axisLines: a.axisLines,
    strengths: a.strengths,
    warnings: a.warnings,
    futureRisks: a.futureRisks,
    actions: a.actions,
    nutrition: a.nutrition,
    exercise: a.exercise,
    recovery: a.recovery,
    supIntro: a.supIntro,
    supplements: a.supplements,
    goal: a.goal,
    tests: a.tests,
    coaching: a.coaching,
  };
}

// 가이드북 유형 카드(원문 + 번역 덧씌움). group은 원문(영문) 유지.
export function vitaGuideLocalized(code: string | null | undefined, locale: VitaLocale): VitaGuide | undefined {
  const g = vitaGuide(code);
  if (!g || locale === 'ko') return g;
  const tr = GUIDES[locale][g.code];
  return tr ? { ...g, ...tr } : g;
}

// "VITA CODE V8이란" 소개 문구.
export function vitaIntro(locale: VitaLocale): VitaIntroText {
  if (locale !== 'ko') return INTROS[locale];
  return {
    matrixSubtitle: VITA_MATRIX_SUBTITLE,
    systemIntro: VITA_SYSTEM_INTRO,
    axisY: VITA_AXIS_Y,
    axisX: VITA_AXIS_X,
    axisDecode: VITA_AXIS_DECODE.map((d) => ({ domain: d.domain, high: d.high, low: d.low })),
    steps: VITA_STEPS,
    closing: VITA_CLOSING,
  };
}
