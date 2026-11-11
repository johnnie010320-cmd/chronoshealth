import { describe, it, expect } from 'vitest';
import {
  ageDecade,
  axisLoads,
  classifyAxes,
  linearSectionScores,
  median,
  type VitaAnswers,
  type VitaAxisLoads,
} from '../src/vita/classify.js';

const SECTIONS = [
  'energy',
  'glucose',
  'gut',
  'inflammation',
  'detox',
  'circulation',
  'hormone',
  'sleep',
  'musculoskeletal',
  'neuro',
] as const;

function answersAll(level: number, over: Partial<Record<(typeof SECTIONS)[number], number[]>> = {}): VitaAnswers {
  const a = {} as VitaAnswers;
  for (const s of SECTIONS) a[s] = over[s] ?? Array<number>(20).fill(level);
  return a;
}
const loads = (m: number, c: number, g: number, h: number): VitaAxisLoads => ({
  metabolic: m,
  circulation: c,
  gutliver: g,
  hormonal: h,
});
const noPeers = { cohort: [], all: [] };

describe('VITA 판정 v8.1', () => {
  it('② 강도 가중 — 매일(5)은 그대로, 가끔(2)은 절반', () => {
    const a = answersAll(2);
    expect(linearSectionScores(a).energy).toBe(40);
    expect(axisLoads(linearSectionScores(a), a).metabolic).toBe(20); // 20문항 × 1
    const b = answersAll(5);
    expect(axisLoads(linearSectionScores(b), b).metabolic).toBe(100);
  });

  it('답 원본이 없으면 영역 점수 평균', () => {
    const s = linearSectionScores(answersAll(1));
    expect(axisLoads(s, null).hormonal).toBe(20);
  });

  it('네 축 모두 최적(20 이하)이면 VITA, 경계 없음', () => {
    const r = classifyAxes(loads(20, 3, 9, 11), noPeers);
    expect(r.code).toBe('VITA');
    expect(Object.values(r.axes).some((a) => a.borderline)).toBe(false);
  });

  it('③ 표본 부족 → 임시 기준 25', () => {
    const r = classifyAxes(loads(34, 17, 12, 22), noPeers);
    expect(r.code).toBe('FITA');
    expect(r.axes.metabolic.basis).toBe('provisional');
    expect(r.axes.hormonal.borderline).toBe(true); // 22 vs 25
    expect(r.axes.circulation.borderline).toBe(false); // 17 vs 25 = 8
  });

  it('③ 같은 성별·나이대 30명 이상 → 그 중앙값', () => {
    const cohort = Array.from({ length: 30 }, (_, i) => loads(10 + i, 5, 5, 5)); // 대사 중앙값 24.5
    const r = classifyAxes(loads(30, 30, 3, 3), { cohort, all: cohort });
    expect(r.axes.metabolic.basis).toBe('cohort');
    expect(r.axes.metabolic.cutoff).toBe(24.5);
    expect(r.axes.metabolic.peers).toBe(30);
    expect(r.code).toBe('FGTA'); // 순환 30 > 5, 해독·리듬 3 ≤ 5
  });

  it('③ 또래 부족·전체 30명 이상 → 전체 중앙값', () => {
    const all = Array.from({ length: 31 }, () => loads(40, 40, 40, 40));
    const r = classifyAxes(loads(30, 30, 50, 50), { cohort: all.slice(0, 3), all });
    expect(r.axes.gutliver.basis).toBe('all');
    expect(r.code).toBe('VILS');
  });

  it('중앙값·나이대', () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([1, 2, 3, 4])).toBe(2.5);
    const now = new Date('2026-11-11T00:00:00Z');
    expect(ageDecade(1985, now)).toBe('40-49');
    expect(ageDecade(2000, now)).toBe('19-29');
    expect(ageDecade(1950, now)).toBe('70+');
    expect(ageDecade(null, now)).toBeNull();
  });
});
