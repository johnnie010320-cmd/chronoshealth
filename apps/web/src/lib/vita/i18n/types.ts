// VITA CODE V8 결과 본문 번역 타입 — 한국어 원문(archetypes.ts / guidebook.ts)에 덧씌우는 en/ja/es 문구.
// 원문 구조(배열 길이·순서)를 그대로 따른다. 코드·엔진명(Vitality-Flex 등)·매트릭스 그룹은 원문(영문) 유지.

import type { VitaArchetypeAction, VitaSupplement } from '../archetypes';
import type { VitaStep } from '../guidebook';

export type VitaArchetypeText = {
  nickname: string;
  coreState: string;
  axisLines: string[];
  strengths: string[];
  warnings: string[];
  futureRisks: string[];
  actions: { stop: VitaArchetypeAction; change: VitaArchetypeAction; start: VitaArchetypeAction };
  nutrition: string[];
  exercise: string[];
  recovery: string[];
  supIntro: string;
  supplements: VitaSupplement[];
  goal: string[];
  tests: string[];
  coaching: string[];
};

export type VitaGuideText = {
  feature: string;
  nutrients: string[];
  exerciseRest: string[];
  diet?: string;
  caution?: string;
};

export type VitaIntroText = {
  matrixSubtitle: string;
  systemIntro: string;
  axisY: string;
  axisX: string;
  // VITA_AXIS_DECODE 4줄과 같은 순서. letters·pos는 원문 유지.
  axisDecode: { domain: string; high: string; low: string }[];
  steps: VitaStep[];
  closing: string;
};
