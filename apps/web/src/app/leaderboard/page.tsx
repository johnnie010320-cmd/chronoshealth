'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import {
  ChevronRightIcon,
  ChartIcon,
  TrophyIcon,
  TargetIcon,
} from '@/components/HealthIcons';
import { RankCard } from '@/components/leaderboard/RankCard';
import { TierBar } from '@/components/leaderboard/TierBar';
import { useI18n } from '@/lib/i18n';
import { readSession } from '@/lib/session';
import {
  fetchLeaderboardMe,
  type LeaderboardResponse,
} from '@/lib/api-client';

type Country = 'KR' | 'US' | 'JP' | 'ES' | 'OTHER';

export default function LeaderboardPage() {
  const { t } = useI18n();
  const L = t.leaderboard;
  const [country, setCountry] = useState<Country>('KR');
  const [worldState, setWorldState] = useState<LeaderboardResponse | null>(null);
  const [countryState, setCountryState] = useState<LeaderboardResponse | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const intl = new Intl.NumberFormat();
  // 대표 카드용 상위 백분위 (RankCard 와 동일 산식, 로직 변경 없음).
  const worldTopPct = worldState
    ? Math.max(0.1, Math.round((100 - worldState.percentile) * 10) / 10)
    : 0;

  useEffect(() => {
    if (!readSession()) {
      setErrorCode('UNAUTHORIZED');
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setErrorCode(null);
    Promise.all([
      fetchLeaderboardMe('world'),
      fetchLeaderboardMe('country', country),
    ])
      .then(([w, c]) => {
        if (cancelled) return;
        setWorldState(w);
        setCountryState(c);
        setLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        const code = e instanceof Error ? e.message : 'generic';
        setErrorCode(code);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [country]);

  if (errorCode === 'NO_REPORT') {
    return (
      <AppShell title={L.pageTitle} decoration="dots">
        <section className="card-shadow mt-6 rounded-3xl bg-white p-8 text-center dark:bg-stone-900">
          <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand-700 dark:bg-brand-900 dark:text-brand-200">
            <ChartIcon className="h-7 w-7" />
          </span>
          <h1 className="mt-4 text-xl font-bold text-stone-900 dark:text-stone-100">
            {L.noReportTitle}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-stone-600 dark:text-stone-400">
            {L.noReportBody}
          </p>
          <Link
            href="/survey"
            className="mt-6 inline-flex items-center gap-1 rounded-2xl bg-stone-900 px-5 py-3 text-sm font-semibold text-white transition active:scale-[0.98] dark:bg-white dark:text-stone-900"
          >
            <span>{L.noReportCta}</span>
            <ChevronRightIcon className="h-4 w-4" />
          </Link>
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell title={L.pageTitle} decoration="dots">
      {loading && (
        <div className="mt-10 flex justify-center">
          <span className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-stone-300 border-t-brand-700 dark:border-stone-700 dark:border-t-brand-400" />
        </div>
      )}

      {errorCode && errorCode !== 'NO_REPORT' && (
        <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-100">
          {L.errorGeneric}
        </div>
      )}

      {!loading && worldState && countryState && (
        <div className="space-y-5 pb-10 pt-6">
          {/* 내 순위/백분위 대표 카드 — 전세계 스코프. 도메인 색 violet. */}
          <section className="card-shadow grad-violet relative overflow-hidden rounded-3xl px-6 py-7">
            <span
              className="blob"
              style={{
                width: 150,
                height: 150,
                right: -24,
                top: -30,
                background: 'radial-gradient(circle, #ddd6fe, transparent 70%)',
              }}
            />
            <TrophyIcon
              className="pointer-events-none absolute right-5 top-6 h-16 w-16 text-white/20"
              strokeWidth={1.5}
            />
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/90">
              {L.eyebrow}
            </p>
            <h1 className="mt-2 text-lg font-bold leading-tight tracking-tight text-white">
              {L.title}
            </h1>
            <div className="mt-5 flex items-end gap-2">
              <span className="mb-2 text-sm font-semibold text-white/90">
                {L.percentile}
              </span>
              <span className="text-6xl font-bold leading-none tracking-tighter text-white">
                {worldTopPct}%
              </span>
            </div>
            <p className="mt-3 text-[12px] text-white/85">
              {L.scopeWorld} · {L.rankWithin} {intl.format(worldState.rankWithin.value)}{' '}
              / {intl.format(worldState.rankWithin.total)}
            </p>
            <div className="mt-4 flex items-center gap-2 rounded-2xl bg-white/15 px-3 py-2 backdrop-blur-sm">
              <span className="text-2xl font-bold leading-none text-white">
                {worldState.userVitalityScore}
              </span>
              <span className="text-[11px] text-white/80">/ 100 · {L.yourScore}</span>
              <span className="ml-auto text-[11px] text-white/80">
                {worldState.ageBand} · {worldState.sex}
              </span>
            </div>
          </section>

          {/* 순위 산출 근거를 그대로 노출한다. 표본이 최소치를 넘으면 서버가
              basis='empirical' 로 자동 전환하고, 아래 문구도 함께 바뀐다. */}
          {worldState.basis === 'empirical' ? (
            <div className="flex items-start gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[11px] leading-relaxed text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200">
              <span aria-hidden className="mt-0.5">✅</span>
              <span>
                {L.empiricalNote.replace('{n}', String(worldState.sampleSize ?? 0))}
              </span>
            </div>
          ) : (
            <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[11px] leading-relaxed text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
              <span aria-hidden className="mt-0.5">📊</span>
              <span>{L.modeledNote}</span>
            </div>
          )}

          <section>
            <div className="flex items-center justify-between gap-2 px-1">
              <h2 className="flex items-center text-xs font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400">
                <span className="accent-bar bg-violet-500" />
                {L.scopeCountry}
              </h2>
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value as Country)}
                className="rounded-lg border border-stone-200 bg-white px-2 py-1 text-[12px] font-medium text-stone-700 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200"
              >
                {(['KR', 'US', 'JP', 'ES', 'OTHER'] as Country[]).map((c) => (
                  <option key={c} value={c}>
                    {L.countryOptions[c]}
                  </option>
                ))}
              </select>
            </div>
            <div className="mt-3">
              <RankCard
                tone="amber"
                scopeLabel={L.countryOptions[country]}
                percentile={countryState.percentile}
                rankValue={countryState.rankWithin.value}
                rankTotal={countryState.rankWithin.total}
              />
            </div>
            {/* 국가 스코프는 사용자 국가를 수집하지 않아 항상 모의분포.
                전세계 카드가 실측으로 전환된 뒤에도 이 차이를 밝혀둔다. */}
            {worldState.basis === 'empirical' && countryState.basis === 'modeled' && (
              <p className="mt-2 px-1 text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">
                {L.modeledCountryNote}
              </p>
            )}
          </section>

          {/* 티어 분포 — 상위=금(amber), 중간=violet/sky, 주의=rose. 색만 page 에서 지정. */}
          <TierBar
            distribution={worldState.tierDistribution}
            userTier={worldState.vitalityTier}
            colors={{
              excellent: 'bg-amber-400',
              good: 'bg-violet-500',
              fair: 'bg-sky-400',
              attention: 'bg-rose-400',
            }}
          />

          <section className="card-shadow relative overflow-hidden rounded-3xl bg-white p-5 dark:bg-stone-900">
            <div className="flex items-center gap-4">
              <span
                aria-hidden
                className="tile-amber inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl"
              >
                <TargetIcon className="h-7 w-7" />
              </span>
              <div className="min-w-0">
                <p className="text-[12px] text-stone-600 dark:text-stone-400">
                  {L.nextTier}
                </p>
                <p className="mt-0.5 text-2xl font-bold text-amber-600 dark:text-amber-400">
                  +{worldState.delta.nextTierGap} {L.points}
                </p>
              </div>
            </div>
            <Link
              href="/reports"
              className="mt-4 inline-flex items-center gap-1 text-[12px] font-semibold text-violet-600 dark:text-violet-300"
            >
              <span>{L.whatIfLink}</span>
              <ChevronRightIcon className="h-3 w-3" />
            </Link>
          </section>

          <div className="rounded-2xl border border-stone-200/70 bg-white/70 px-4 py-3 text-[11px] leading-relaxed text-stone-600 dark:border-stone-800 dark:bg-stone-900/60 dark:text-stone-400">
            {L.disclaimer}
          </div>
        </div>
      )}
    </AppShell>
  );
}
