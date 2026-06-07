'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { LoginRequired } from '@/components/LoginRequired';
import {
  ChevronRightIcon,
  HeartPulseIcon,
  ChartIcon,
  ActivityIcon,
} from '@/components/HealthIcons';
import { VitalityCard } from '@/components/avatar/VitalityCard';
import { PyrBar } from '@/components/avatar/PyrBar';
import { FiveAgesGrid } from '@/components/avatar/FiveAgesGrid';
import { useI18n } from '@/lib/i18n';
import { readSession } from '@/lib/session';
import { fetchAvatarMe, type AvatarResponse } from '@/lib/api-client';

export default function ReportsPage() {
  const { t } = useI18n();
  const R = t.reports;
  const [state, setState] = useState<
    | { status: 'loading' }
    | { status: 'unauth' }
    | { status: 'noReport' }
    | { status: 'ok'; data: AvatarResponse }
    | { status: 'err'; code: string }
  >({ status: 'loading' });

  useEffect(() => {
    if (!readSession()) {
      setState({ status: 'unauth' });
      return;
    }
    fetchAvatarMe()
      .then((data) => setState({ status: 'ok', data }))
      .catch((e) => {
        const code = e instanceof Error ? e.message : 'generic';
        if (code === 'NO_REPORT') setState({ status: 'noReport' });
        else if (code === 'UNAUTHORIZED') setState({ status: 'unauth' });
        else setState({ status: 'err', code });
      });
  }, []);

  return (
    <AppShell title={R.pageTitle} decoration="dots">
      {state.status === 'loading' && (
        <div className="mt-10 flex justify-center">
          <span className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-stone-300 border-t-brand-700 dark:border-stone-700 dark:border-t-brand-400" />
        </div>
      )}

      {state.status === 'unauth' && (
        <LoginRequired />
      )}

      {state.status === 'noReport' && (
        <section className="card-shadow mt-6 rounded-3xl bg-white p-8 text-center dark:bg-stone-900">
          <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand-700 dark:bg-brand-900 dark:text-brand-200">
            <HeartPulseIcon className="h-7 w-7" />
          </span>
          <h1 className="mt-4 text-xl font-bold text-stone-900 dark:text-stone-100">
            {R.noReportTitle}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-stone-600 dark:text-stone-400">
            {R.noReportBody}
          </p>
          <Link
            href="/survey"
            className="mt-6 inline-flex items-center gap-1 rounded-2xl bg-stone-900 px-5 py-3 text-sm font-semibold text-white transition active:scale-[0.98] dark:bg-white dark:text-stone-900"
          >
            <span>{R.noReportCta}</span>
            <ChevronRightIcon className="h-4 w-4" />
          </Link>
        </section>
      )}

      {state.status === 'err' && (
        <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-100">
          {R.errorGeneric}
        </div>
      )}

      {state.status === 'ok' && (
        <div className="space-y-5 pb-10 pt-4">
          <section>
            <h2 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400">
              {R.vitalitySectionTitle}
            </h2>
            <VitalityCard
              name={state.data.name}
              chronologicalAge={state.data.chronologicalAge}
              value={state.data.vitalityScore.value}
              tier={state.data.vitalityScore.tier}
            />
          </section>

          <section>
            <h2 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400">
              {R.pyrSectionTitle}
            </h2>
            <PyrBar
              median={state.data.predictedYearsRemaining.median}
              ci95={state.data.predictedYearsRemaining.ci95}
            />
          </section>

          <section>
            <h2 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400">
              {R.fiveAgesSectionTitle}
            </h2>
            <FiveAgesGrid fiveAges={state.data.fiveAges} />
          </section>

          <section className="grid grid-cols-2 gap-3">
            <Link
              href="/leaderboard"
              className="card-shadow flex flex-col gap-1 rounded-2xl bg-white p-4 transition active:scale-[0.99] dark:bg-stone-900"
            >
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 text-brand-700 dark:bg-brand-900 dark:text-brand-200">
                <ChartIcon className="h-4 w-4" />
              </span>
              <span className="mt-2 text-[10px] font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400">
                {R.leaderboardCtaEyebrow}
              </span>
              <span className="text-sm font-bold text-stone-900 dark:text-stone-100">
                {R.leaderboardCtaTitle}
              </span>
              <span className="text-[11px] text-stone-600 dark:text-stone-400">
                {R.leaderboardCtaBody}
              </span>
            </Link>

            <Link
              href="/survey"
              className="card-shadow flex flex-col gap-1 rounded-2xl bg-white p-4 transition active:scale-[0.99] dark:bg-stone-900"
            >
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-teal-50 text-teal-700 dark:bg-teal-900 dark:text-teal-200">
                <ActivityIcon className="h-4 w-4" />
              </span>
              <span className="mt-2 text-[10px] font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400">
                {R.whatIfCtaEyebrow}
              </span>
              <span className="text-sm font-bold text-stone-900 dark:text-stone-100">
                {R.whatIfCtaTitle}
              </span>
              <span className="text-[11px] text-stone-600 dark:text-stone-400">
                {R.whatIfCtaBody}
              </span>
            </Link>
          </section>

          <div className="rounded-2xl border border-stone-200/70 bg-white/70 px-4 py-3 text-[11px] leading-relaxed text-stone-600 dark:border-stone-800 dark:bg-stone-900/60 dark:text-stone-400">
            {R.disclaimer}
            <span className="mt-1 block text-[10px] text-stone-400 dark:text-stone-500">
              {R.lastReportLabel}{' '}
              {new Date(state.data.lastReportAt).toLocaleString()}
            </span>
          </div>
        </div>
      )}
    </AppShell>
  );
}
