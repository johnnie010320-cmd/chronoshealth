'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { ComingSoon } from '@/components/ComingSoon';
import { ChevronRightIcon, HeartPulseIcon } from '@/components/HealthIcons';
import { VitalityCard } from '@/components/avatar/VitalityCard';
import { PyrBar } from '@/components/avatar/PyrBar';
import { FiveAgesGrid } from '@/components/avatar/FiveAgesGrid';
import { useI18n } from '@/lib/i18n';
import { readSession } from '@/lib/session';
import { fetchAvatarMe, type AvatarResponse } from '@/lib/api-client';

export default function AvatarPage() {
  const { t } = useI18n();
  const A = t.avatar;
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
    <AppShell title={A.pageTitle} decoration="dots">
      {state.status === 'loading' && (
        <div className="mt-10 flex justify-center">
          <span className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-stone-300 border-t-brand-700 dark:border-stone-700 dark:border-t-brand-400" />
        </div>
      )}

      {state.status === 'unauth' && (
        <ComingSoon customBody={t.userMenu.loginUnavailable} />
      )}

      {state.status === 'noReport' && (
        <section className="card-shadow mt-6 rounded-3xl bg-white p-8 text-center dark:bg-stone-900">
          <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand-700 dark:bg-brand-900 dark:text-brand-200">
            <HeartPulseIcon className="h-7 w-7" />
          </span>
          <h1 className="mt-4 text-xl font-bold text-stone-900 dark:text-stone-100">
            {A.noReportTitle}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-stone-600 dark:text-stone-400">
            {A.noReportBody}
          </p>
          <Link
            href="/survey"
            className="mt-6 inline-flex items-center gap-1 rounded-2xl bg-stone-900 px-5 py-3 text-sm font-semibold text-white transition active:scale-[0.98] dark:bg-white dark:text-stone-900"
          >
            <span>{A.noReportCta}</span>
            <ChevronRightIcon className="h-4 w-4" />
          </Link>
        </section>
      )}

      {state.status === 'err' && (
        <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-100">
          {A.errorGeneric}
        </div>
      )}

      {state.status === 'ok' && (
        <div className="space-y-5 pb-10 pt-6">
          <VitalityCard
            name={state.data.name}
            chronologicalAge={state.data.chronologicalAge}
            value={state.data.vitalityScore.value}
            tier={state.data.vitalityScore.tier}
          />
          <PyrBar
            median={state.data.predictedYearsRemaining.median}
            ci95={state.data.predictedYearsRemaining.ci95}
          />
          <FiveAgesGrid fiveAges={state.data.fiveAges} />

          <div className="rounded-2xl border border-stone-200/70 bg-white/70 px-4 py-3 text-[11px] leading-relaxed text-stone-600 dark:border-stone-800 dark:bg-stone-900/60 dark:text-stone-400">
            {A.disclaimer}
            <span className="block mt-1 text-[10px] text-stone-400 dark:text-stone-500">
              {A.modelLabel}: {state.data.modelVersion} · {A.lastReportLabel}{' '}
              {new Date(state.data.lastReportAt).toLocaleString()}
            </span>
          </div>
        </div>
      )}
    </AppShell>
  );
}
