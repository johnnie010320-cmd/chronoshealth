'use client';

// AI 리포트 결과(활력 점수·예측 잔여 연수·5종 나이·생애 예상 의료비) 렌더 — 라이프 탭에서 사용.
// 정보구조 재편(2026-08): 입력은 AI리포트 탭. 라이프에선 결과만 표기(입력 CTA 없음).
// 활력 점수/예측 잔여 연수는 같은 열 2단(각 50%) 컴팩트 카드로 표시.

import { useEffect, useState, type ReactElement } from 'react';
import Link from 'next/link';
import { LoginRequired } from '@/components/LoginRequired';
import { IconBadge, type BadgeTone } from '@/components/IconBadge';
import {
  ActivityIcon,
  ScopeIcon,
  CoinIcon,
  TrophyIcon,
  type IconProps,
} from '@/components/HealthIcons';
import { FiveAgesGrid } from '@/components/avatar/FiveAgesGrid';
import { useI18n } from '@/lib/i18n';
import { readSession } from '@/lib/session';
import { fetchAvatarMe, type AvatarResponse } from '@/lib/api-client';

type Tier = 'excellent' | 'good' | 'fair' | 'attention';
const TIER_TONE: Record<Tier, string> = {
  excellent: 'from-emerald-600 to-teal-500',
  good: 'from-brand-700 to-teal-500',
  fair: 'from-amber-500 to-yellow-500',
  attention: 'from-rose-600 to-orange-500',
};

function SectionHeader({
  Icon,
  tone,
  title,
  badge,
}: {
  Icon: (p: IconProps) => ReactElement;
  tone: BadgeTone;
  title: string;
  badge?: string;
}) {
  return (
    <div className="mb-2 flex items-center gap-2 px-1">
      <IconBadge Icon={Icon} tone={tone} size="sm" />
      <h2 className="text-[11px] font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400">
        {title}
      </h2>
      {badge && (
        <span className="rounded-full bg-stone-100 px-1.5 py-0.5 text-[9px] font-semibold text-stone-500 dark:bg-stone-800 dark:text-stone-400">
          {badge}
        </span>
      )}
    </div>
  );
}

export function AvatarReport() {
  const { t } = useI18n();
  const R = t.reports;
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

  if (state.status === 'loading') {
    return (
      <div className="mt-6 flex justify-center">
        <span className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-stone-300 border-t-brand-700 dark:border-stone-700 dark:border-t-brand-400" />
      </div>
    );
  }

  if (state.status === 'unauth') return <LoginRequired />;
  // 리포트가 없으면 라이프에선 아무것도 표시하지 않는다(입력 CTA는 AI 리포트 탭에만).
  if (state.status === 'noReport') return null;
  if (state.status === 'err') {
    return (
      <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-100">
        {R.errorGeneric}
      </div>
    );
  }

  const tier = state.data.vitalityScore.tier as Tier;
  const [lo, hi] = state.data.predictedYearsRemaining.ci95;

  return (
    <div className="space-y-5">
      {/* 활력 점수 + 예측 잔여 연수 — 같은 열 2단(각 50%) */}
      <section className="grid grid-cols-2 gap-3">
        <div
          className={`card-shadow overflow-hidden rounded-2xl bg-gradient-to-br ${TIER_TONE[tier]} px-4 py-4 text-white`}
        >
          <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-white/85">
            {R.vitalitySectionTitle}
          </p>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-4xl font-bold leading-none tracking-tight">
              {state.data.vitalityScore.value}
            </span>
            <span className="text-[11px] text-white/70">/100</span>
          </div>
          <p className="mt-1.5 text-[10px] text-white/85">{A.vitalityTiers[tier]}</p>
        </div>

        <div className="card-shadow rounded-2xl bg-white px-4 py-4 dark:bg-stone-900">
          <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-stone-500 dark:text-stone-400">
            {R.pyrSectionTitle}
          </p>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-3xl font-bold leading-none tracking-tight text-stone-900 dark:text-stone-100">
              {state.data.predictedYearsRemaining.median.toFixed(1)}
            </span>
            <span className="text-[11px] text-stone-500 dark:text-stone-400">{A.pyr.unit}</span>
          </div>
          <p className="mt-1.5 text-[10px] text-stone-500 dark:text-stone-400">
            {A.pyr.ci} {lo.toFixed(1)}~{hi.toFixed(1)}
          </p>
        </div>
      </section>

      <section>
        <SectionHeader Icon={ScopeIcon} tone="violet" title={R.fiveAgesSectionTitle} />
        <FiveAgesGrid
          fiveAges={state.data.fiveAges}
          {...(state.data.fiveAgesBasis ? { basis: state.data.fiveAgesBasis } : {})}
          {...(state.data.vascularAgeCapped !== undefined
            ? { vascularCapped: state.data.vascularAgeCapped }
            : {})}
        />
      </section>

      {state.data.lifetimeMedicalCost && (
        <section>
          <SectionHeader Icon={CoinIcon} tone="amber" title={R.lifetimeCostTitle} badge={R.p1Badge} />
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
          <span className="text-[11px] text-stone-600 dark:text-stone-400">{R.leaderboardCtaBody}</span>
          <span className="mt-0.5 text-[9px] font-medium text-stone-400 dark:text-stone-500">
            {R.leaderboardCtaNote}
          </span>
        </Link>

        <Link
          href="/simulate"
          className="card-shadow flex flex-col gap-1 rounded-2xl card-rose p-4 transition active:scale-[0.99]"
        >
          <IconBadge Icon={ActivityIcon} tone="violet" size="sm" />
          <span className="mt-2 text-[10px] font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400">
            {R.whatIfCtaEyebrow}
          </span>
          <span className="text-sm font-bold text-stone-900 dark:text-stone-100">{R.whatIfCtaTitle}</span>
          <span className="text-[11px] text-stone-600 dark:text-stone-400">{R.whatIfCtaBody}</span>
        </Link>
      </section>

      <div className="rounded-2xl border border-stone-200/70 bg-white/70 px-4 py-3 text-[11px] leading-relaxed text-stone-600 dark:border-stone-800 dark:bg-stone-900/60 dark:text-stone-400">
        {R.disclaimer}
        <span className="mt-1 block text-[10px] text-stone-400 dark:text-stone-500">
          {R.lastReportLabel} {new Date(state.data.lastReportAt).toLocaleString()}
        </span>
      </div>
    </div>
  );
}
