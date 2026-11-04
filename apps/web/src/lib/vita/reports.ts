// VITA CODE V8 리포트 빌더 — 영역 점수 → 16 아키타입 정밀 리포트 + 4대 축 스펙트럼.
//
// 의료·윤리(apps/web CLAUDE.md): 본 리포트는 "건강 위험 추정/생활습관 코칭"이며 의학적 진단이 아니다.
// 영양제·정밀검사 안내는 정보 제공 목적(참고용)이며 복용·검사 전 전문가 상담을 권장한다.

import {
  axisPrimaryPercent,
  classifyVita,
  VITA_AXIS_META,
  VITA_SECTIONS,
  vitaBand,
  vitaTypeByCode,
  type VitaAxis,
  type VitaBand,
  type VitaResult,
  type VitaSectionId,
  type VitaTypeHeadline,
} from './engine';
import { vitaArchetype, type VitaArchetype } from './archetypes';
import type { VitaLocale } from './animals';
import { vitaArchetypeText, vitaAxisTitle, vitaSectionTitle } from './i18n';
import type { VitaArchetypeText } from './i18n/types';

export type VitaSectionScoreRow = {
  id: VitaSectionId;
  no: number;
  titleKo: string;
  title: string; // 현지화 영역명
  axis: VitaAxis;
  score: number; // 0~100
  band: VitaBand;
};

// 4대 축 스펙트럼(슬라이더) 한 줄.
export type VitaAxisSpectrum = {
  axis: VitaAxis;
  no: number;
  labelKo: string;
  titleKo: string;
  title: string; // 현지화 축 풀네임
  load: number; // 평균 증상 부하(0~100)
  primaryPct: number; // 주 엔진 강도(0~100)
  isSecondary: boolean; // true=보존 엔진(F/G/L/S)
  activeLetter: string;
  activeName: string;
  primary: { letter: string; name: string };
  secondary: { letter: string; name: string };
  band: VitaBand;
};

export type VitaReport = {
  result: VitaResult;
  headline: VitaTypeHeadline | undefined;
  archetype: VitaArchetype | undefined;
  text: VitaArchetypeText | undefined; // 아키타입 본문(현지화, 번역 없으면 한국어 원문)
  totalBand: VitaBand; // 총점 평균(0~100 환산) 밴드
  sectionRows: VitaSectionScoreRow[];
  spectrum: VitaAxisSpectrum[];
};

// 영역별 점수 → 완성 리포트(아키타입 본문 + 영역 밴드 + 축 스펙트럼).
export function buildVitaReport(
  sectionScores: Record<VitaSectionId, number>,
  locale: VitaLocale = 'ko',
): VitaReport {
  const result = classifyVita(sectionScores);
  const headline = vitaTypeByCode(result.code);
  const archetype = vitaArchetype(result.code);

  const sectionRows: VitaSectionScoreRow[] = VITA_SECTIONS.map((s) => ({
    id: s.id,
    no: s.no,
    titleKo: s.titleKo,
    title: vitaSectionTitle(s.id, locale),
    axis: s.axis,
    score: sectionScores[s.id] ?? 0,
    band: vitaBand(sectionScores[s.id] ?? 0),
  }));

  const spectrum: VitaAxisSpectrum[] = VITA_AXIS_META.map((m) => {
    const load = result.axisLoad[m.axis];
    const isSecondary = result.axisSecondary[m.axis];
    const active = isSecondary ? m.secondary : m.primary;
    return {
      axis: m.axis,
      no: m.no,
      labelKo: m.labelKo,
      titleKo: m.titleKo,
      title: vitaAxisTitle(m.axis, locale).title,
      load,
      primaryPct: axisPrimaryPercent(load),
      isSecondary,
      activeLetter: active.letter,
      activeName: active.name,
      primary: m.primary,
      secondary: m.secondary,
      band: vitaBand(load),
    };
  });

  return {
    result,
    headline,
    archetype,
    text: archetype ? vitaArchetypeText(archetype, locale) : undefined,
    totalBand: vitaBand(Math.round(result.totalScore / VITA_SECTIONS.length)),
    sectionRows,
    spectrum,
  };
}
