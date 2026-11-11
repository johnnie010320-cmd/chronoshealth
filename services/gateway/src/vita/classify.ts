// VITA CODE V8 유형 판정 v8.1 (2026-11-11 죠니 승인 ①~④). 서버가 정본 — 웹은 결과의 code·axes 를 그대로 쓴다.
//
// ① 200문항 답 원본(answers)을 받는다(없으면 영역 점수로 대신 — 옛 결과·옛 화면).
// ② 답 강도 가중: 0·1·2·3·4·5 → 0·0.5·1·2·3.5·5. '자주·매일' 증상이 축을 더 크게 기울인다.
//    가중 영역 점수(0~100) 평균 = 축 부하. (화면의 영역 점수·밴드는 원문대로 단순 합 그대로.)
// ③ 축마다 기준선(cutoff)과 비교: 부하 > 기준선 → 보존 엔진(F/G/L/S).
//    기준선 = 같은 성별·나이대 사용자(본인 제외, 사람마다 최신 1건)의 중앙값(30명 이상일 때)
//           → 부족하면 전체 사용자 중앙값(30명 이상) → 그것도 부족하면 임시 기준 25.
//    네 축 모두 '최적'(부하 20 이하)이면 VITA.
// ④ 기준선과 차이가 5 이하이면 경계(borderline) — 화면에 두 성향을 함께 표시.

import type { VitaSectionScores } from '../schemas/vita.js';

export type VitaAxis = 'metabolic' | 'circulation' | 'gutliver' | 'hormonal';
export type VitaSectionId = keyof VitaSectionScores;
export type VitaAnswers = Record<VitaSectionId, number[]>;
export type CutoffBasis = 'cohort' | 'all' | 'provisional';

export type VitaAxisDetail = {
  load: number; // 가중 축 부하(0~100, 소수 1자리)
  cutoff: number; // 기준선
  basis: CutoffBasis;
  peers: number; // 기준선 계산에 쓴 사람 수(임시 기준이면 0)
  secondary: boolean; // true = F/G/L/S
  borderline: boolean;
};
export type VitaAxes = Record<VitaAxis, VitaAxisDetail>;
export type VitaAxisLoads = Record<VitaAxis, number>;

export const ANSWER_WEIGHTS = [0, 0.5, 1, 2, 3.5, 5] as const;
export const OPTIMAL_MAX = 20;
export const PROVISIONAL_CUTOFF = 25;
export const MIN_PEERS = 30;
export const BORDERLINE_GAP = 5;

export const AXIS_ORDER: VitaAxis[] = ['metabolic', 'circulation', 'gutliver', 'hormonal'];
export const AXIS_SECTIONS: Record<VitaAxis, VitaSectionId[]> = {
  metabolic: ['energy', 'glucose'],
  circulation: ['circulation'],
  gutliver: ['gut', 'inflammation', 'detox'],
  hormonal: ['hormone', 'sleep', 'musculoskeletal', 'neuro'],
};
const LETTERS: Record<VitaAxis, [string, string]> = {
  metabolic: ['V', 'F'],
  circulation: ['I', 'G'],
  gutliver: ['T', 'L'],
  hormonal: ['A', 'S'],
};

const round1 = (n: number): number => Math.round(n * 10) / 10;

// 영역별 단순 합(0~100) — 화면 표시·밴드용. 답 원본에서 다시 계산(클라이언트 값 대신 정본).
export function linearSectionScores(answers: VitaAnswers): VitaSectionScores {
  const out = {} as VitaSectionScores;
  for (const id of Object.keys(answers) as VitaSectionId[]) {
    out[id] = answers[id].reduce((a, b) => a + b, 0);
  }
  return out;
}

// 축 부하 — 답 원본이 있으면 가중(②), 없으면 영역 점수 평균.
export function axisLoads(sectionScores: VitaSectionScores, answers?: VitaAnswers | null): VitaAxisLoads {
  const section = (id: VitaSectionId): number =>
    answers ? answers[id].reduce((sum, a) => sum + (ANSWER_WEIGHTS[a] ?? 0), 0) : sectionScores[id];
  const out = {} as VitaAxisLoads;
  for (const axis of AXIS_ORDER) {
    const ids = AXIS_SECTIONS[axis];
    out[axis] = round1(ids.reduce((s, id) => s + section(id), 0) / ids.length);
  }
  return out;
}

export function median(values: number[]): number {
  const v = [...values].sort((a, b) => a - b);
  const mid = Math.floor(v.length / 2);
  return v.length % 2 ? (v[mid] as number) : round1(((v[mid - 1] as number) + (v[mid] as number)) / 2);
}

export type PeerLoads = { cohort: VitaAxisLoads[]; all: VitaAxisLoads[] };

// ③④ 판정.
export function classifyAxes(loads: VitaAxisLoads, peers: PeerLoads): { code: string; axes: VitaAxes } {
  const allOptimal = AXIS_ORDER.every((a) => loads[a] <= OPTIMAL_MAX);
  const axes = {} as VitaAxes;
  for (const axis of AXIS_ORDER) {
    let cutoff = PROVISIONAL_CUTOFF;
    let basis: CutoffBasis = 'provisional';
    let n = 0;
    if (peers.cohort.length >= MIN_PEERS) {
      cutoff = median(peers.cohort.map((p) => p[axis]));
      basis = 'cohort';
      n = peers.cohort.length;
    } else if (peers.all.length >= MIN_PEERS) {
      cutoff = median(peers.all.map((p) => p[axis]));
      basis = 'all';
      n = peers.all.length;
    }
    const load = loads[axis];
    const secondary = !allOptimal && load > cutoff;
    const borderline = !allOptimal && Math.abs(load - cutoff) <= BORDERLINE_GAP;
    axes[axis] = { load, cutoff, basis, peers: n, secondary, borderline };
  }
  const code = AXIS_ORDER.map((a) => LETTERS[a][axes[a].secondary ? 1 : 0]).join('');
  return { code, axes };
}

// 10세 단위 나이대(비교 집단). 생년 원본은 analysis DB 에 두지 않는다(ADR 0003).
export function ageDecade(birthYear: number | null | undefined, now = new Date()): string | null {
  if (!birthYear) return null;
  const age = now.getUTCFullYear() - birthYear;
  if (age < 19) return null;
  if (age < 30) return '19-29';
  if (age >= 70) return '70+';
  const d = Math.floor(age / 10) * 10;
  return `${d}-${d + 9}`;
}
