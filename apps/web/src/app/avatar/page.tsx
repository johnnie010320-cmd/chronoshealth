'use client';

// 마이 VITA — 생체나이/활력 상세 리포트 페이지(홈 요약 카드 "상세보기"의 도착지).
// 삼성 헬스식 vibrant 디자인: 큰 그라데이션 히어로 + 대비 컬러 나이 타일.
// 데이터/로직은 기존 AvatarReport 와 동일(fetchAvatarMe). 색/구조만 재구성.

import { useEffect, useState, type ReactElement } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { LoginRequired } from '@/components/LoginRequired';
import {
  HeartPulseIcon,
  ScopeIcon,
  CoinIcon,
  TrophyIcon,
  ActivityIcon,
  ClipboardIcon,
  ChevronRightIcon,
  type IconProps,
} from '@/components/HealthIcons';
import { useI18n } from '@/lib/i18n';
import { readSession } from '@/lib/session';
import { fetchAvatarMe, type AvatarResponse } from '@/lib/api-client';

type Tier = 'excellent' | 'good' | 'fair' | 'attention';
type AgeKey = 'life' | 'vitality' | 'skin' | 'vascular' | 'joint';

function SectionTitle({ children }: { children: string }) {
  return (
    <h2 className="mb-3 flex items-center px-1 text-[13.5px] font-extrabold text-stone-900 dark:text-stone-100">
      <span className="accent-bar bg-sky-500" />
      {children}
    </h2>
  );
}

function CtaCard({
  href,
  tone,
  Icon,
  eyebrow,
  title,
  body,
  note,
}: {
  href: string;
  tone: string;
  Icon: (p: IconProps) => ReactElement;
  eyebrow: string;
  title: string;
  body: string;
  note?: string;
}) {
  return (
    <Link
      href={href}
      className={`card-shadow flex flex-col gap-1 rounded-3xl ${tone} p-4 transition active:scale-[0.99]`}
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white/70 text-stone-700 dark:bg-stone-900/60 dark:text-stone-200">
        <Icon className="h-5 w-5" />
      </span>
      <span className="mt-2 text-[10px] font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400">
        {eyebrow}
      </span>
      <span className="text-sm font-bold text-stone-900 dark:text-stone-100">{title}</span>
      <span className="text-[11px] leading-relaxed text-stone-600 dark:text-stone-400">{body}</span>
      {note && (
        <span className="mt-0.5 text-[9px] font-medium text-stone-400 dark:text-stone-500">{note}</span>
      )}
    </Link>
  );
}

export default function AvatarPage() {
  const { t } = useI18n();
  const A = t.avatar;
  const R = t.reports;
  const [state, setState] = useState<
    | { status: 'loading' }
    | { status: 'unauth' }
    | { status: 'noReport' }
    | { status: 'ok'; data: AvatarResponse }
    | { status: 'err' }
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
        else setState({ status: 'err' });
      });
  }, []);

  return (
    <AppShell title={A.pageTitle} decoration="dots">
      {state.status === 'loading' && (
        <div className="mt-10 flex justify-center">
          <span className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-stone-300 border-t-brand-700 dark:border-stone-700 dark:border-t-brand-400" />
        </div>
      )}

      {state.status === 'unauth' && <LoginRequired />}

      {state.status === 'err' && (
        <div className="mt-6 rounded-3xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-100">
          {R.errorGeneric}
        </div>
      )}

      {state.status === 'noReport' && (
        <section className="card-shadow relative mt-4 overflow-hidden rounded-3xl card-sky px-5 py-8 text-center">
          <h2 className="text-base font-extrabold text-stone-900 dark:text-stone-100">
            {A.noReportTitle}
          </h2>
          <p className="mt-2 text-[12.5px] leading-relaxed text-stone-600 dark:text-stone-300">
            {A.noReportBody}
          </p>
          <Link
            href="/survey"
            className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-5 py-2.5 text-[13px] font-bold text-white transition active:scale-[0.98]"
          >
            <ClipboardIcon className="h-4 w-4" />
            {A.noReportCta}
          </Link>
        </section>
      )}

      {state.status === 'ok' && (() => {
        const d = state.data;
        const tier = d.vitalityScore.tier as Tier;
        const chrono = d.chronologicalAge;
        const bio = d.fiveAges.life;
        const delta = chrono - bio; // >0 = 더 젊음
        const [lo, hi] = d.predictedYearsRemaining.ci95;
        const unit = A.fiveAges.unit;

        const ageTiles: { key: AgeKey; label: string; tile: string }[] = [
          { key: 'life', label: A.fiveAges.biological, tile: 'tile-emerald' },
          { key: 'vitality', label: A.fiveAges.vitality, tile: 'tile-violet' },
          { key: 'skin', label: A.fiveAges.skin, tile: 'tile-amber' },
          { key: 'vascular', label: A.fiveAges.vascular, tile: 'tile-rose' },
          { key: 'joint', label: A.fiveAges.skeletal, tile: 'tile-sky' },
        ];

        const confidencePct =
          typeof d.confidence === 'number' ? Math.round(d.confidence * 100) : null;

        return (
          <div className="space-y-5 pb-10 pt-3">
            {/* 활력 점수 히어로 (grad-indigo) */}
            <section className="card-shadow relative overflow-hidden rounded-3xl grad-indigo px-6 py-7">
              <span
                className="blob"
                style={{
                  width: 160,
                  height: 160,
                  right: -24,
                  top: -34,
                  background: 'radial-gradient(circle, #a5b4fc, transparent 70%)',
                }}
              />
              <span
                className="blob"
                style={{
                  width: 120,
                  height: 120,
                  left: -28,
                  bottom: -30,
                  background: 'radial-gradient(circle, #c4b5fd, transparent 70%)',
                }}
              />
              <div className="relative">
                <div className="flex items-center gap-2 text-white/85">
                  <HeartPulseIcon className="h-4 w-4" />
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em]">{A.eyebrow}</p>
                </div>
                <h1 className="mt-2 text-xl font-bold leading-tight tracking-tight text-white">
                  {d.name || A.nameFallback}
                </h1>
                <p className="mt-0.5 text-[12px] text-white/75">
                  {A.vitalityScore} · {t.result.bioAgeDiffPrefix} {chrono}
                  {unit}
                </p>
                <div className="mt-4 flex items-end gap-2">
                  <span className="text-7xl font-bold leading-none tracking-tighter text-white tabular-nums">
                    {d.vitalityScore.value}
                  </span>
                  <span className="pb-2 text-sm text-white/70">/ 100</span>
                </div>
                <span className="mt-3 inline-block rounded-full bg-white/20 px-3 py-1 text-[11px] font-bold text-white backdrop-blur">
                  {A.vitalityTiers[tier]}
                </span>
              </div>
            </section>

            {/* 대표 지표 2단 — 예측 잔여 연수(grad-cyan) + 생체나이 비교(card-sky) */}
            <section className="grid grid-cols-2 gap-3">
              <div className="card-shadow relative overflow-hidden rounded-3xl grad-cyan px-4 py-4">
                <span
                  className="blob"
                  style={{
                    width: 110,
                    height: 110,
                    right: -18,
                    top: -22,
                    background: 'radial-gradient(circle, #a5f3fc, transparent 70%)',
                  }}
                />
                <div className="relative">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-white/85">
                    {A.pyr.label}
                  </p>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-4xl font-bold leading-none tracking-tight text-white tabular-nums">
                      {d.predictedYearsRemaining.median.toFixed(1)}
                    </span>
                    <span className="text-[11px] text-white/80">{A.pyr.unit}</span>
                  </div>
                  <p className="mt-1.5 text-[10px] text-white/80">
                    {A.pyr.ci} {lo.toFixed(1)}~{hi.toFixed(1)}
                  </p>
                </div>
              </div>

              <div className="card-shadow rounded-3xl card-sky px-4 py-4">
                <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-stone-500 dark:text-stone-400">
                  {A.fiveAges.biological}
                </p>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-4xl font-bold leading-none tracking-tight text-stone-900 tabular-nums dark:text-stone-100">
                    {bio}
                  </span>
                  <span className="text-[11px] text-stone-500 dark:text-stone-400">{unit}</span>
                </div>
                <p className="mt-1.5 text-[10px] text-stone-500 dark:text-stone-400">
                  {t.result.bioAgeDiffPrefix} {chrono}
                  {unit} ·{' '}
                  <span
                    className={
                      delta >= 0
                        ? 'font-bold text-emerald-600 dark:text-emerald-400'
                        : 'font-bold text-rose-600 dark:text-rose-400'
                    }
                  >
                    {delta >= 0 ? `-${delta}` : `+${-delta}`}
                    {unit}
                  </span>
                </p>
              </div>
            </section>

            {/* 건강 나이 — 대비 컬러 타일 */}
            <section>
              <SectionTitle>{A.fiveAges.title4}</SectionTitle>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                {ageTiles.map(({ key, label, tile }) => {
                  const basis = d.fiveAgesBasis?.[key] ?? 'heuristic';
                  const capped = key === 'vascular' && d.vascularAgeCapped === true;
                  return (
                    <div key={key} className={`${tile} card-shadow rounded-3xl px-3.5 py-3.5`}>
                      <div className="flex items-start justify-between gap-1">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-white/85">
                          {label}
                        </p>
                        <span className="shrink-0 rounded-full bg-white/25 px-1.5 py-0.5 text-[8.5px] font-bold text-white backdrop-blur">
                          {basis === 'model' ? A.fiveAges.basisModel : A.fiveAges.basisHeuristic}
                        </span>
                      </div>
                      <p className="mt-1.5 flex items-baseline gap-1">
                        <span className="text-[28px] font-extrabold leading-none text-white tabular-nums">
                          {d.fiveAges[key]}
                          {capped ? '+' : ''}
                        </span>
                        <span className="text-[11px] font-semibold text-white/85">{unit}</span>
                      </p>
                    </div>
                  );
                })}
              </div>
              <p className="mt-2.5 px-1 text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">
                {A.fiveAges.basisNote}
              </p>
            </section>

            {/* 리포트 신뢰도 */}
            {confidencePct !== null && (
              <section>
                <SectionTitle>{R.confidenceLabel}</SectionTitle>
                <div className="card-shadow rounded-3xl card-violet p-5">
                  <div className="flex items-baseline justify-between">
                    <span className="text-[12px] text-stone-600 dark:text-stone-300">
                      {R.confidenceLabel}
                    </span>
                    <span className="grad-text text-2xl font-extrabold tabular-nums">
                      {confidencePct}%
                    </span>
                  </div>
                  <div className="mt-2.5 h-2.5 overflow-hidden rounded-full bg-white/60 dark:bg-stone-800">
                    <div
                      aria-hidden
                      className="h-2.5 rounded-full grad-violet"
                      style={{ width: `${Math.min(100, Math.max(0, confidencePct))}%` }}
                    />
                  </div>
                  <p className="mt-2 text-[10px] leading-relaxed text-stone-500 dark:text-stone-400">
                    {R.confidenceHint}
                  </p>
                </div>
              </section>
            )}

            {/* 생애 예상 의료비 */}
            {d.lifetimeMedicalCost && (
              <section>
                <SectionTitle>{R.lifetimeCostTitle}</SectionTitle>
                <div className="card-shadow rounded-3xl card-amber p-5">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-300">
                      <CoinIcon className="h-5 w-5" />
                    </span>
                    <div className="flex flex-1 items-baseline justify-between">
                      <span className="text-[12px] text-stone-600 dark:text-stone-300">
                        {R.lifetimeCostLabel}
                      </span>
                      <span className="text-[26px] font-extrabold tabular-nums tracking-tight text-stone-900 dark:text-stone-100">
                        {(d.lifetimeMedicalCost.totalKrw / 100_000_000).toFixed(1)}
                        <span className="ml-0.5 text-sm font-bold">{R.lifetimeCostUnit}</span>
                      </span>
                    </div>
                  </div>
                  <p className="mt-2.5 text-[10px] leading-relaxed text-stone-500 dark:text-stone-400">
                    {d.lifetimeMedicalCost.basis}
                  </p>
                </div>
              </section>
            )}

            {/* 바로가기 */}
            <section className="grid grid-cols-2 gap-3">
              <CtaCard
                href="/leaderboard"
                tone="card-amber"
                Icon={TrophyIcon}
                eyebrow={R.leaderboardCtaEyebrow}
                title={R.leaderboardCtaTitle}
                body={R.leaderboardCtaBody}
                note={R.leaderboardCtaNote}
              />
              <CtaCard
                href="/simulate"
                tone="card-rose"
                Icon={ActivityIcon}
                eyebrow={R.whatIfCtaEyebrow}
                title={R.whatIfCtaTitle}
                body={R.whatIfCtaBody}
              />
            </section>

            {/* 상세 리포트(AI 진단) 이동 */}
            <Link
              href="/ai-diagnosis"
              className="card-shadow flex items-center gap-2 rounded-3xl bg-white px-4 py-3.5 transition active:scale-[0.99] dark:bg-stone-900"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-sky-500/15 text-sky-600 dark:text-sky-300">
                <ScopeIcon className="h-5 w-5" />
              </span>
              <span className="flex-1 text-[13px] font-bold text-stone-900 dark:text-stone-100">
                {t.nav.vitaCode}
              </span>
              <ChevronRightIcon className="h-4 w-4 shrink-0 text-stone-400 dark:text-stone-500" />
            </Link>

            <div className="px-1">
              <p className="text-[10px] text-stone-400 dark:text-stone-500">
                {R.lastReportLabel} {new Date(d.lastReportAt).toLocaleString()}
              </p>
            </div>
          </div>
        );
      })()}
    </AppShell>
  );
}
