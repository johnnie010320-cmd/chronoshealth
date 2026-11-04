'use client';

// 내 건강 랭킹 — 홈 "랭킹 내 위치" 타일 도착지.
// 건강-랭킹 인포그래픽의 레이아웃/포맷을 재현하되, 또래(연령대×성별) 비교만 사용한다.
// 지역(서울/한국/세계) 비교·하위 지표 날조 없음. API 가 돌려주는 필드만 사용.
// 모든 그래픽은 원본 SVG/div (스톡 이미지 미사용).

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { LoginRequired } from '@/components/LoginRequired';
import {
  TrophyIcon,
  HeartPulseIcon,
  SparkleIcon,
  ClipboardIcon,
} from '@/components/HealthIcons';
import { readSession } from '@/lib/session';
import {
  fetchLeaderboardMe,
  fetchAvatarMe,
  type LeaderboardResponse,
  type AvatarResponse,
} from '@/lib/api-client';

type Tier = 'excellent' | 'good' | 'fair' | 'attention';
type AgeKey = 'life' | 'vascular' | 'skin' | 'joint';

const SEX_KO: Record<'male' | 'female' | 'other', string> = {
  male: '남성',
  female: '여성',
  other: '기타',
};

const TIER_KO: Record<Tier, string> = {
  excellent: '최상위',
  good: '양호',
  fair: '보통',
  attention: '관리 필요',
};

// 티어 시그니처 색 — 상위=금(amber, 트로피 감성), 양호=emerald, 보통=sky, 주의=rose.
const TIER_TILE: Record<Tier, string> = {
  excellent: 'tile-amber',
  good: 'tile-emerald',
  fair: 'tile-sky',
  attention: 'tile-rose',
};
const TIER_BAR: Record<Tier, string> = {
  excellent: 'bg-amber-400',
  good: 'bg-emerald-500',
  fair: 'bg-sky-400',
  attention: 'bg-rose-400',
};

const TIER_ORDER: Tier[] = ['excellent', 'good', 'fair', 'attention'];

const AGE_TILES: { key: AgeKey; ko: string; tile: string }[] = [
  { key: 'life', ko: '생체 나이', tile: 'tile-emerald' },
  { key: 'vascular', ko: '혈관 나이', tile: 'tile-rose' },
  { key: 'skin', ko: '피부 나이', tile: 'tile-amber' },
  { key: 'joint', ko: '골격 나이', tile: 'tile-sky' },
];

// leaderboard/page.tsx·RankCard 와 동일 산식: 상위 % = 100 - percentile.
function topPercent(percentile: number): number {
  return Math.max(0.1, Math.round((100 - percentile) * 10) / 10);
}

function summary(tier: Tier): string {
  switch (tier) {
    case 'excellent':
      return '또래 중 상위권에 속합니다. 현재의 건강 습관을 꾸준히 유지하세요.';
    case 'good':
      return '또래 평균보다 양호한 편입니다. 조금만 더 관리하면 상위권에 들 수 있습니다.';
    case 'fair':
      return '또래 중 보통 수준입니다. 생활 습관을 점검해 개선 여지를 찾아보세요.';
    case 'attention':
      return '또래 대비 관리가 필요한 구간입니다. 작은 습관부터 바꿔보세요.';
  }
}

// 분야별 또래 비교 바 — 중앙=또래 평균, 왼쪽=젊음(우수), 오른쪽=노화. 원본 div.
function CompareBar({ delta }: { delta: number }) {
  const clamped = Math.max(-10, Math.min(10, delta)); // >0 = 더 젊음
  const pos = 50 - (clamped / 10) * 45; // 젊을수록 왼쪽
  const color = delta === 0 ? 'bg-stone-400' : delta > 0 ? 'bg-emerald-500' : 'bg-amber-500';
  return (
    <div>
      <div className="relative h-2 rounded-full bg-stone-200 dark:bg-stone-700">
        <div className="absolute left-1/2 top-1/2 h-3 w-0.5 -translate-x-1/2 -translate-y-1/2 bg-stone-400 dark:bg-stone-500" />
        <div
          className={`absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full ${color} ring-2 ring-white dark:ring-stone-900`}
          style={{ left: `${pos}%`, transform: 'translate(-50%,-50%)' }}
        />
      </div>
      <div className="mt-0.5 flex justify-between text-[8.5px] font-semibold text-stone-400 dark:text-stone-500">
        <span>젊음</span>
        <span>또래 평균</span>
        <span>노화</span>
      </div>
    </div>
  );
}

// 상위 % 를 보여주는 원본 SVG 링(퍼센타일만큼 채운다).
function PercentileRing({ percentile, topPct }: { percentile: number; topPct: number }) {
  const r = 34;
  const circ = 2 * Math.PI * r;
  const filled = Math.min(100, Math.max(0, percentile));
  const offset = circ * (1 - filled / 100);
  return (
    <svg viewBox="0 0 84 84" className="h-24 w-24" aria-hidden>
      <circle cx="42" cy="42" r={r} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="8" />
      <circle
        cx="42"
        cy="42"
        r={r}
        fill="none"
        stroke="#fff"
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        transform="rotate(-90 42 42)"
      />
      <text
        x="42"
        y="39"
        textAnchor="middle"
        className="fill-white"
        style={{ fontSize: 10, fontWeight: 700 }}
      >
        상위
      </text>
      <text
        x="42"
        y="54"
        textAnchor="middle"
        className="fill-white"
        style={{ fontSize: 17, fontWeight: 800 }}
      >
        {topPct}%
      </text>
    </svg>
  );
}

export default function RankingPage() {
  const [state, setState] = useState<
    | { status: 'loading' }
    | { status: 'unauth' }
    | { status: 'noReport' }
    | { status: 'ok'; lb: LeaderboardResponse; avatar: AvatarResponse }
    | { status: 'err' }
  >({ status: 'loading' });

  useEffect(() => {
    if (!readSession()) {
      setState({ status: 'unauth' });
      return;
    }
    // 또래(연령대×성별) 셀 비교 = 'world' 스코프. 국가('country') 스코프는 지역 비교라 사용하지 않는다.
    Promise.all([fetchLeaderboardMe('world'), fetchAvatarMe()])
      .then(([lb, avatar]) => setState({ status: 'ok', lb, avatar }))
      .catch((e) => {
        const code = e instanceof Error ? e.message : 'generic';
        if (code === 'NO_REPORT') setState({ status: 'noReport' });
        else if (code === 'UNAUTHORIZED') setState({ status: 'unauth' });
        else setState({ status: 'err' });
      });
  }, []);

  return (
    <AppShell title="내 건강 랭킹" decoration="dots">
      {state.status === 'loading' && (
        <div className="mt-10 flex justify-center">
          <span className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-stone-300 border-t-brand-700 dark:border-stone-700 dark:border-t-brand-400" />
        </div>
      )}

      {state.status === 'unauth' && <LoginRequired />}

      {state.status === 'err' && (
        <div className="mt-6 rounded-3xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-100">
          랭킹을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
        </div>
      )}

      {state.status === 'noReport' && (
        <section className="card-shadow mt-4 rounded-3xl card-amber px-5 py-8 text-center">
          <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-white/70 text-amber-600 dark:bg-stone-900/60 dark:text-amber-300">
            <TrophyIcon className="h-7 w-7" />
          </span>
          <h2 className="mt-4 text-base font-extrabold text-stone-900 dark:text-stone-100">
            아직 랭킹을 매길 리포트가 없습니다
          </h2>
          <p className="mt-2 text-[12.5px] leading-relaxed text-stone-600 dark:text-stone-300">
            설문을 완료하면 또래 중 내 건강 위치를 확인할 수 있습니다.
          </p>
          <Link
            href="/survey"
            className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-5 py-2.5 text-[13px] font-bold text-white transition active:scale-[0.98]"
          >
            <ClipboardIcon className="h-4 w-4" />
            설문 시작하기
          </Link>
        </section>
      )}

      {state.status === 'ok' && (() => {
        const { lb, avatar } = state;
        const sexKo = SEX_KO[lb.sex];
        const topPct = topPercent(lb.percentile);
        const tier = lb.vitalityTier as Tier;
        const chrono = avatar.chronologicalAge;

        const intl = new Intl.NumberFormat();
        const distTotal = TIER_ORDER.reduce((acc, k) => acc + lb.tierDistribution[k], 0);
        const pctOf = (k: Tier) =>
          distTotal > 0 ? (lb.tierDistribution[k] / distTotal) * 100 : 0;

        return (
          <div className="space-y-5 pb-10 pt-3">
            {/* 1. 히어로 — 또래(연령대×성별) 기준 점수·순위·상위 % */}
            <section className="card-shadow relative overflow-hidden rounded-3xl grad-sunset px-6 py-7">
              <span
                className="blob"
                style={{
                  width: 160,
                  height: 160,
                  right: -26,
                  top: -36,
                  background: 'radial-gradient(circle, #fde68a, transparent 70%)',
                }}
              />
              <span
                className="blob"
                style={{
                  width: 120,
                  height: 120,
                  left: -30,
                  bottom: -30,
                  background: 'radial-gradient(circle, #fbcfe8, transparent 70%)',
                }}
              />
              <TrophyIcon
                className="pointer-events-none absolute right-5 bottom-5 h-14 w-14 text-white/20"
                strokeWidth={1.5}
              />
              <div className="relative">
                <div className="flex items-center gap-2 text-white/85">
                  <HeartPulseIcon className="h-4 w-4" />
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em]">
                    My Health Ranking
                  </p>
                </div>
                <h1 className="mt-2 text-xl font-bold leading-snug tracking-tight text-white">
                  성인 {sexKo} 건강 분석 &amp; 랭킹
                </h1>
                <p className="mt-0.5 text-[12px] text-white/80">{lb.ageBand} 또래 기준</p>

                <div className="mt-4 flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-end gap-2">
                      <span className="text-6xl font-bold leading-none tracking-tighter text-white tabular-nums">
                        {lb.userVitalityScore}
                      </span>
                      <span className="pb-1.5 text-sm text-white/70">/ 100</span>
                    </div>
                    <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-[11px] font-bold text-white backdrop-blur">
                      <SparkleIcon className="h-3.5 w-3.5" />
                      {TIER_KO[tier]}
                    </span>
                  </div>
                  <PercentileRing percentile={lb.percentile} topPct={topPct} />
                </div>

                <div className="mt-5 flex items-center gap-2 rounded-2xl bg-white/15 px-3 py-2.5 backdrop-blur-sm">
                  <TrophyIcon className="h-5 w-5 shrink-0 text-white" />
                  <span className="text-[12.5px] font-semibold text-white">
                    또래 {intl.format(lb.rankWithin.value)}위
                  </span>
                  <span className="text-[11px] text-white/80">
                    / {intl.format(lb.rankWithin.total)}명 · 상위 {topPct}%
                  </span>
                </div>
              </div>
            </section>

            {/* 산출 근거 고지 — modeled 이면 모의 분포, empirical 이면 표본 수 */}
            {lb.basis === 'empirical' ? (
              <div className="flex items-start gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[11px] leading-relaxed text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200">
                <span aria-hidden className="mt-0.5">✅</span>
                <span>
                  같은 연령대·성별 실사용자 {intl.format(lb.sampleSize ?? 0)}명 표본 기준입니다.
                </span>
              </div>
            ) : (
              <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[11px] leading-relaxed text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
                <span aria-hidden className="mt-0.5">📊</span>
                <span>또래 비교는 모의 분포 기반 추정입니다 (실사용자 표본 부족).</span>
              </div>
            )}

            {/* 2. 티어 분포 — 스택 바 + 4 타일, 내 티어 강조 */}
            <section>
              <h2 className="mb-3 flex items-center px-1 text-[13.5px] font-extrabold text-stone-900 dark:text-stone-100">
                <span className="accent-bar bg-amber-500" />
                {lb.ageBand} {sexKo} 티어 분포
              </h2>

              <div className="card-shadow overflow-hidden rounded-2xl border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
                <div className="flex h-4 w-full">
                  {TIER_ORDER.map((k) => (
                    <div
                      key={k}
                      aria-label={TIER_KO[k]}
                      title={`${TIER_KO[k]} — ${pctOf(k).toFixed(1)}%`}
                      style={{ width: `${pctOf(k)}%` }}
                      className={TIER_BAR[k]}
                    />
                  ))}
                </div>
                <ul className="grid grid-cols-2 gap-y-2 p-3 text-[12px] sm:grid-cols-4">
                  {TIER_ORDER.map((k) => (
                    <li key={k} className="flex items-center gap-2">
                      <span
                        aria-hidden
                        className={`inline-block h-2.5 w-2.5 rounded-sm ${TIER_BAR[k]} ${
                          tier === k ? 'ring-2 ring-stone-900 dark:ring-white' : ''
                        }`}
                      />
                      <span className="text-stone-700 dark:text-stone-300">{TIER_KO[k]}</span>
                      <span className="ml-auto tabular-nums text-stone-500 dark:text-stone-400">
                        {pctOf(k).toFixed(1)}%
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-2.5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                {TIER_ORDER.map((k) => {
                  const mine = tier === k;
                  return (
                    <div
                      key={k}
                      className={`${TIER_TILE[k]} card-shadow relative overflow-hidden rounded-3xl px-3.5 py-3.5 ${
                        mine ? 'ring-2 ring-stone-900 dark:ring-white' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-white/90">
                          {TIER_KO[k]}
                        </p>
                        {mine && (
                          <span className="shrink-0 rounded-full bg-white/25 px-1.5 py-0.5 text-[8.5px] font-bold text-white backdrop-blur">
                            내 티어
                          </span>
                        )}
                      </div>
                      <p className="mt-1.5 flex items-baseline gap-0.5">
                        <span className="text-[26px] font-extrabold leading-none text-white tabular-nums">
                          {pctOf(k).toFixed(0)}
                        </span>
                        <span className="text-[12px] font-semibold text-white/85">%</span>
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* 3. 건강 나이 비교 — 4 타일 (생체/혈관/피부/골격) */}
            <section>
              <h2 className="mb-3 flex items-center px-1 text-[13.5px] font-extrabold text-stone-900 dark:text-stone-100">
                <span className="accent-bar bg-sky-500" />
                건강 나이 비교 · 실제 나이 {chrono}세
              </h2>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                {AGE_TILES.map(({ key, ko, tile }) => {
                  const val = avatar.fiveAges[key];
                  const delta = chrono - val; // >0 = 더 젊음
                  const younger = delta > 0;
                  const older = delta < 0;
                  return (
                    <div
                      key={key}
                      className={`${tile} card-shadow relative overflow-hidden rounded-3xl px-3.5 py-3.5`}
                    >
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-white/90">
                        {ko}
                      </p>
                      <p className="mt-1.5 flex items-baseline gap-0.5">
                        <span className="text-[28px] font-extrabold leading-none text-white tabular-nums">
                          {val}
                        </span>
                        <span className="text-[11px] font-semibold text-white/85">세</span>
                      </p>
                      <span
                        className={`mt-2 inline-block rounded-full bg-white/90 px-2 py-0.5 text-[10.5px] font-extrabold tabular-nums ${
                          younger
                            ? 'text-emerald-600'
                            : older
                              ? 'text-amber-600'
                              : 'text-stone-500'
                        }`}
                      >
                        {delta === 0 ? '±0세' : younger ? `↓ -${delta}세` : `↑ +${-delta}세`}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* 3-2. 건강 분야별 상세 분석 — 또래 평균(실제 나이) 대비 분야별 위치 + 해석 */}
            {(() => {
              const rows = AGE_TILES.map(({ key, ko }) => ({ ko, delta: chrono - avatar.fiveAges[key] }));
              const best = rows.reduce((a, b) => (b.delta > a.delta ? b : a));
              const worst = rows.reduce((a, b) => (b.delta < a.delta ? b : a));
              return (
                <section className="card-shadow rounded-3xl bg-white px-5 py-5 dark:bg-stone-900">
                  <h2 className="mb-1 flex items-center text-[13.5px] font-extrabold text-stone-900 dark:text-stone-100">
                    <span className="accent-bar bg-emerald-500" />
                    건강 분야별 상세 분석
                  </h2>
                  <p className="mb-3 text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">
                    또래 평균(실제 나이 {chrono}세) 대비 분야별 위치입니다. 왼쪽일수록 또래보다 젊습니다.
                  </p>
                  <div className="space-y-3.5">
                    {rows.map((r) => {
                      const younger = r.delta > 0;
                      const older = r.delta < 0;
                      return (
                        <div key={r.ko}>
                          <div className="flex items-center justify-between">
                            <span className="text-[12.5px] font-bold text-stone-800 dark:text-stone-100">
                              {r.ko}
                            </span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10.5px] font-extrabold tabular-nums ${
                                younger
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                                  : older
                                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                                    : 'bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400'
                              }`}
                            >
                              {r.delta === 0 ? '또래 평균' : younger ? `또래 대비 -${r.delta}세` : `또래 대비 +${-r.delta}세`}
                            </span>
                          </div>
                          <div className="mt-1.5">
                            <CompareBar delta={r.delta} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2.5">
                    <div className="rounded-2xl bg-emerald-50 px-3.5 py-3 dark:bg-emerald-950/30">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                        강점
                      </p>
                      <p className="mt-0.5 text-[12.5px] font-bold text-stone-800 dark:text-stone-100">
                        {best.ko}
                      </p>
                      <p className="text-[11px] text-stone-500 dark:text-stone-400">
                        {best.delta > 0 ? `또래보다 ${best.delta}세 젊음` : '또래 평균 수준'}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-amber-50 px-3.5 py-3 dark:bg-amber-950/30">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                        주의
                      </p>
                      <p className="mt-0.5 text-[12.5px] font-bold text-stone-800 dark:text-stone-100">
                        {worst.ko}
                      </p>
                      <p className="text-[11px] text-stone-500 dark:text-stone-400">
                        {worst.delta < 0 ? `또래보다 ${-worst.delta}세 높음` : '또래 평균 이상'}
                      </p>
                    </div>
                  </div>
                </section>
              );
            })()}

            {/* 4. 총평 */}
            <section className="card-shadow rounded-3xl card-amber px-5 py-5">
              <h2 className="flex items-center text-[13.5px] font-extrabold text-stone-900 dark:text-stone-100">
                <span className="accent-bar bg-amber-500" />
                총평
              </h2>
              <p className="mt-2 text-[13px] leading-relaxed text-stone-700 dark:text-stone-200">
                {lb.ageBand} {sexKo} 또래 중 상위 {topPct}%, {TIER_KO[tier]} 구간입니다. {summary(tier)}
              </p>
            </section>
          </div>
        );
      })()}
    </AppShell>
  );
}
