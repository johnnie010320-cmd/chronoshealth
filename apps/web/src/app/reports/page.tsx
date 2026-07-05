'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { ReactElement } from 'react';
import { AppShell } from '@/components/AppShell';
import { LoginRequired } from '@/components/LoginRequired';
import { IconBadge, type BadgeTone } from '@/components/IconBadge';
import {
  ChevronRightIcon,
  HeartPulseIcon,
  ActivityIcon,
  ShieldIcon,
  ScopeIcon,
  CoinIcon,
  TrophyIcon,
  type IconProps,
} from '@/components/HealthIcons';

// 섹션 헤더 — 컬러 아이콘 배지 + 제목(삼성 헬스식).
function SectionHeader({
  Icon,
  tone,
  title,
}: {
  Icon: (p: IconProps) => ReactElement;
  tone: BadgeTone;
  title: string;
}) {
  return (
    <div className="mb-2 flex items-center gap-2 px-1">
      <IconBadge Icon={Icon} tone={tone} size="sm" />
      <h2 className="text-[11px] font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400">
        {title}
      </h2>
    </div>
  );
}
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
        <section className="card-shadow mt-6 rounded-3xl card-violet p-8 text-center">
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
          {typeof state.data.confidence === 'number' && (
            <section className="card-shadow rounded-2xl bg-gradient-to-r from-brand-700 to-brand-500 px-4 py-3 text-white">
              <div className="flex items-baseline justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-widest opacity-90">
                  {R.confidenceLabel}
                </span>
                <span className="text-2xl font-bold tabular-nums">
                  {state.data.confidence}%
                </span>
              </div>
              <p className="mt-1 text-[11px] opacity-80">{R.confidenceHint}</p>
            </section>
          )}

          <section>
            <SectionHeader Icon={HeartPulseIcon} tone="rose" title={R.vitalitySectionTitle} />
            <VitalityCard
              name={state.data.name}
              chronologicalAge={state.data.chronologicalAge}
              value={state.data.vitalityScore.value}
              tier={state.data.vitalityScore.tier}
            />
          </section>

          <section>
            <SectionHeader Icon={ShieldIcon} tone="emerald" title={R.pyrSectionTitle} />
            <PyrBar
              median={state.data.predictedYearsRemaining.median}
              ci95={state.data.predictedYearsRemaining.ci95}
            />
          </section>

          <section>
            <SectionHeader Icon={ScopeIcon} tone="violet" title={R.fiveAgesSectionTitle} />
            <FiveAgesGrid fiveAges={state.data.fiveAges} />
          </section>

          {state.data.lifetimeMedicalCost && (
            <section>
              <SectionHeader Icon={CoinIcon} tone="amber" title={R.lifetimeCostTitle} />
              <div className="card-shadow rounded-2xl card-sky p-4">
                <div className="flex items-baseline justify-between">
                  <span className="text-[12px] text-stone-500 dark:text-stone-400">
                    {R.lifetimeCostLabel}
                  </span>
                  <span className="text-2xl font-bold tabular-nums tracking-tight text-stone-900 dark:text-stone-100">
                    {(state.data.lifetimeMedicalCost.totalKrw / 100_000_000).toFixed(1)}
                    {R.lifetimeCostUnit}
                  </span>
                </div>
                <p className="mt-1 text-[10px] text-stone-500 dark:text-stone-400">
                  {state.data.lifetimeMedicalCost.basis}
                </p>
              </div>
            </section>
          )}

          <section className="grid grid-cols-2 gap-3">
            <Link
              href="/leaderboard"
              className="card-shadow flex flex-col gap-1 rounded-2xl card-amber p-4 transition active:scale-[0.99]"
            >
              <IconBadge Icon={TrophyIcon} tone="amber" size="sm" />
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
              className="card-shadow flex flex-col gap-1 rounded-2xl card-rose p-4 transition active:scale-[0.99]"
            >
              <IconBadge Icon={ActivityIcon} tone="violet" size="sm" />
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
