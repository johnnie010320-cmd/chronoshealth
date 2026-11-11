// VITA CODE V8 리포트 빌더 — 영역 점수 → 16 아키타입 정밀 리포트 + 4대 축 스펙트럼.
//
// 의료·윤리(apps/web CLAUDE.md): 본 리포트는 "건강 위험 추정/생활습관 코칭"이며 의학적 진단이 아니다.
// 영양제·정밀검사 안내는 정보 제공 목적(참고용)이며 복용·검사 전 전문가 상담을 권장한다.

import {
  axisPrimaryPercent,
  classifyVita,
  VITA_AXIS_META,
  VITA_AXIS_ORDER,
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
  borderline: boolean; // ④ 기준선과 차이 5 이하 — 두 성향을 함께 표시
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

// 저장 결과 → 완성 리포트(아키타입 본문 + 영역 밴드 + 축 스펙트럼).
// 🚨 유형 코드·축 판정은 서버 결과(code·axes)를 그대로 쓴다 — 웹에서 다시 판정하지 않는다(2026-11-11 사고).
export type VitaReportInput = {
  code: string;
  sectionScores: Record<VitaSectionId, number>;
  axes?: Partial<Record<VitaAxis, { load: number; cutoff: number; secondary: boolean; borderline: boolean }>> | null;
};

// 기준선(cutoff)을 슬라이더 가운데(50%)에 둔다. 부하가 기준선보다 낮을수록 주 엔진 쪽(100%).
function pctAroundCutoff(load: number, cutoff: number): number {
  const c = Math.min(99, Math.max(1, cutoff));
  const v = load <= c ? 50 + (50 * (c - load)) / c : 50 - (50 * (load - c)) / (100 - c);
  return Math.round(Math.max(0, Math.min(100, v)));
}

export function buildVitaReport(saved: VitaReportInput, locale: VitaLocale = 'ko'): VitaReport {
  const sectionScores = saved.sectionScores;
  const base = classifyVita(sectionScores); // 영역 평균 부하·총점(표시용). 코드는 쓰지 않는다.
  const axisLoad = { ...base.axisLoad };
  const axisSecondary = {} as Record<VitaAxis, boolean>;
  VITA_AXIS_ORDER.forEach((axis, i) => {
    const d = saved.axes?.[axis];
    if (d) axisLoad[axis] = d.load;
    axisSecondary[axis] = d ? d.secondary : 'FGLS'.includes(saved.code.charAt(i));
  });
  const result: VitaResult = { ...base, code: saved.code, axisLoad, axisSecondary };
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
    const d = saved.axes?.[m.axis];
    const load = axisLoad[m.axis];
    const isSecondary = axisSecondary[m.axis];
    const active = isSecondary ? m.secondary : m.primary;
    return {
      axis: m.axis,
      no: m.no,
      labelKo: m.labelKo,
      titleKo: m.titleKo,
      title: vitaAxisTitle(m.axis, locale).title,
      load,
      primaryPct: d ? pctAroundCutoff(d.load, d.cutoff) : axisPrimaryPercent(load),
      isSecondary,
      activeLetter: active.letter,
      activeName: active.name,
      primary: m.primary,
      secondary: m.secondary,
      band: vitaBand(load),
      borderline: d?.borderline ?? false,
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
