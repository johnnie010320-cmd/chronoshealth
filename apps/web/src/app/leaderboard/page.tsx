'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { ChevronRightIcon, ChartIcon } from '@/components/HealthIcons';
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
          <section className="card-shadow rounded-3xl bg-gradient-to-br from-brand-700 via-brand-600 to-teal-500 px-6 py-6 text-white">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] opacity-90">
              {L.eyebrow}
            </p>
            <h1 className="mt-2 text-xl font-bold leading-tight tracking-tight">
              {L.title}
            </h1>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-5xl font-bold leading-none tracking-tighter">
                {worldState.userVitalityScore}
              </span>
              <span className="text-sm text-white/70">/ 100 · {L.yourScore}</span>
            </div>
            <p className="mt-2 text-[12px] text-white/80">
              {worldState.ageBand} · {worldState.sex}
            </p>
          </section>

          <RankCard
            scopeLabel={L.scopeWorld}
            percentile={worldState.percentile}
            rankValue={worldState.rankWithin.value}
            rankTotal={worldState.rankWithin.total}
          />

          <section>
            <div className="flex items-center justify-between gap-2 px-1">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400">
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
                scopeLabel={L.countryOptions[country]}
                percentile={countryState.percentile}
                rankValue={countryState.rankWithin.value}
                rankTotal={countryState.rankWithin.total}
              />
            </div>
          </section>

          <TierBar
            distribution={worldState.tierDistribution}
            userTier={worldState.vitalityTier}
          />

          <section className="card-shadow rounded-2xl bg-white p-4 dark:bg-stone-900">
            <p className="text-[12px] text-stone-600 dark:text-stone-400">
              {L.nextTier}
            </p>
            <p className="mt-1 text-lg font-semibold text-stone-900 dark:text-stone-100">
              +{worldState.delta.nextTierGap} {L.points}
            </p>
            <Link
              href="/reports"
              className="mt-3 inline-flex items-center gap-1 text-[12px] font-semibold text-brand-700 dark:text-brand-300"
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
