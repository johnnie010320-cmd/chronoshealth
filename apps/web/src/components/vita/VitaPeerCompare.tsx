'use client';

// VITA 코드 결과 하단 "종합 점수 & 또래 비교·랭킹"(PDF 7·8페이지 스크롤).
// 또래 비교는 실사용자 표본이 아니라 모의 정규분포 기반 추정이며, 화면에 그대로 고지한다(정직성).
// 의료·윤리: 건강 위험 추정/생활습관 코칭이며 의학적 진단이 아니다.

import Link from 'next/link';
import { ProgressRing, type RingTone } from '@/components/ProgressRing';
import { ChevronRightIcon } from '@/components/HealthIcons';
import {
  VITA_SECTIONS,
  vitaBand,
  type VitaSectionId,
} from '@/lib/vita/engine';
import { vitaTypeShare, vitaRarityRank } from '@/lib/vita/animals';
import { vitaSectionTitle } from '@/lib/vita/i18n';
import { useVitaResultT, formatRich } from '@/locales/vita-result';

// 표준정규 누적분포 Φ(z) — Abramowitz & Stegun 근사.
function normCdf(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp((-z * z) / 2);
  const p =
    d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z > 0 ? 1 - p : p;
}

function indexTone(h: number): RingTone {
  if (h >= 75) return 'emerald';
  if (h >= 50) return 'sky';
  if (h >= 30) return 'amber';
  return 'rose';
}

export function VitaPeerCompare({
  code,
  totalScore,
  sectionScores,
}: {
  code: string;
  totalScore: number;
  sectionScores: Record<VitaSectionId, number>;
}) {
  const { t: vr, locale } = useVitaResultT();
  const t = vr.peer;
  // 건강 지수(0~100, 높을수록 좋음) = (1000 - 증상부하 총점)/10.
  const healthIndex = Math.max(0, Math.min(100, Math.round((1000 - totalScore) / 10)));
  const tone = indexTone(healthIndex);

  // 또래(성인) 모의 정규분포: 평균 55, 표준편차 16. 상위 백분위 추정.
  const MU = 55;
  const SIGMA = 16;
  const percentileBelow = normCdf((healthIndex - MU) / SIGMA); // 0~1, 나보다 낮은 비율
  const topPct = Math.max(1, Math.min(99, Math.round((1 - percentileBelow) * 100))); // 상위 %
  const markerLeft = Math.max(2, Math.min(98, Math.round(percentileBelow * 100)));

  // 영역별 강·약점 — 증상부하가 낮을수록 강점.
  const rows = VITA_SECTIONS.map((s) => ({
    id: s.id,
    title: vitaSectionTitle(s.id, locale),
    score: sectionScores[s.id] ?? 0,
    band: vitaBand(sectionScores[s.id] ?? 0),
  }));
  const strengths = [...rows].sort((a, b) => a.score - b.score).slice(0, 3);
  const weaknesses = [...rows].sort((a, b) => b.score - a.score).slice(0, 3);

  // 유형 예상 인구 분포(원문 V8 설명서) — 실측 아닌 추정. 희소도 순위(1=가장 희소).
  const typeShare = vitaTypeShare(code);
  const rarityRank = vitaRarityRank(code);

  return (
    <div className="space-y-4">
      {/* 종합 건강 지수 게이지 */}
      <section className="card-shadow rounded-2xl bg-white px-4 py-4 dark:bg-stone-900">
        <h2 className="mb-3 text-[12px] font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400">
          <span className="accent-bar bg-emerald-500" />
          {t.indexTitle}
        </h2>
        <div className="flex items-center gap-4">
          <ProgressRing
            value={healthIndex}
            max={100}
            size={112}
            stroke={11}
            tone={tone}
            label={String(healthIndex)}
            sublabel="/ 100"
          />
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-stone-800 dark:text-stone-100">
              {t.indexLine(code, healthIndex)}
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">
              {t.indexDesc(totalScore)}
            </p>
          </div>
        </div>
      </section>

      {/* 또래 성인 비교 & 랭킹 (모의 추정) */}
      <section className="card-shadow rounded-2xl bg-white px-4 py-4 dark:bg-stone-900">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[12px] font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400">
            <span className="accent-bar bg-sky-500" />
            {t.peerTitle}
          </h2>
          <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[9px] font-semibold text-stone-500 dark:bg-stone-800 dark:text-stone-400">
            {t.mock}
          </span>
        </div>

        <div className="flex items-end gap-2">
          <span className="text-3xl font-bold tabular-nums text-brand-700 dark:text-brand-300">
            {t.topPct(topPct)}
          </span>
          <span className="pb-1 text-[11px] text-stone-500 dark:text-stone-400">
            {t.basis}
          </span>
        </div>

        {/* 분포 바 + 내 위치 마커 */}
        <div className="mt-3">
          <div className="relative h-3 overflow-hidden rounded-full bg-gradient-to-r from-rose-400 via-amber-300 to-emerald-400">
            <div
              className="absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white bg-brand-700 shadow dark:border-stone-900"
              style={{ left: `${markerLeft}%` }}
            />
          </div>
          <div className="mt-1 flex justify-between text-[9px] font-medium text-stone-400 dark:text-stone-500">
            <span>{t.low}</span>
            <span>{t.avg}</span>
            <span>{t.high}</span>
          </div>
        </div>

        {typeShare != null && (
          <p className="mt-3 rounded-xl bg-stone-50 px-3 py-2 text-[11px] leading-relaxed text-stone-600 dark:bg-stone-800/60 dark:text-stone-300">
            {formatRich(t.typeShare, { code: <b>{code}</b>, share: <b>{typeShare}%</b> })}
            {rarityRank != null && t.rarity(rarityRank)} <span className="text-stone-400">{t.expected}</span>
          </p>
        )}

        <p className="mt-3 text-[10px] leading-relaxed text-stone-400 dark:text-stone-500">
          {t.note}
        </p>
        <Link
          href="/leaderboard"
          className="mt-2 inline-flex items-center gap-1 text-[12px] font-semibold text-brand-700 dark:text-brand-300"
        >
          <span>{t.fullRanking}</span>
          <ChevronRightIcon className="h-3.5 w-3.5" />
        </Link>
      </section>

      {/* 영역별 강·약점 */}
      <section className="card-shadow rounded-2xl bg-white px-4 py-4 dark:bg-stone-900">
        <h2 className="mb-3 text-[12px] font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400">
          <span className="accent-bar bg-amber-500" />
          {t.areaTitle}
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="mb-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
              {t.strong}
            </p>
            <ul className="space-y-1">
              {strengths.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between gap-1 text-[11px] text-stone-600 dark:text-stone-300"
                >
                  <span className="truncate">{r.title}</span>
                  <span className="shrink-0 tabular-nums text-emerald-600 dark:text-emerald-400">
                    {r.score}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-1.5 text-[11px] font-semibold text-rose-600 dark:text-rose-400">
              {t.focus}
            </p>
            <ul className="space-y-1">
              {weaknesses.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between gap-1 text-[11px] text-stone-600 dark:text-stone-300"
                >
                  <span className="truncate">{r.title}</span>
                  <span className="shrink-0 tabular-nums text-rose-600 dark:text-rose-400">
                    {vr.band[r.band]}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
