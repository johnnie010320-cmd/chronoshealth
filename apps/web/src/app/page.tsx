'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { PulseBackground } from '@/components/PulseBackground';
import {
  HeartPulseIcon,
  ChartIcon,
  ChevronRightIcon,
  MenuIcon,
  ActivityIcon,
} from '@/components/HealthIcons';
import { useI18n } from '@/lib/i18n';
import { readSession } from '@/lib/session';
import { fetchAvatarMe, type AvatarResponse } from '@/lib/api-client';

type AgePair = { years: number; months: number };

function splitYearMonths(value: number): AgePair {
  if (!Number.isFinite(value) || value <= 0) return { years: 0, months: 0 };
  const years = Math.floor(value);
  const months = Math.round((value - years) * 12);
  if (months === 12) return { years: years + 1, months: 0 };
  return { years, months };
}

export default function HomePage() {
  const { t } = useI18n();
  const H = t.home;
  const [signedIn, setSignedIn] = useState(false);
  const [avatar, setAvatar] = useState<AvatarResponse | null>(null);
  const [avatarErr, setAvatarErr] = useState<string | null>(null);

  useEffect(() => {
    const session = readSession();
    if (!session) {
      setSignedIn(false);
      return;
    }
    setSignedIn(true);
    fetchAvatarMe()
      .then((data) => setAvatar(data))
      .catch((e) => {
        const code = e instanceof Error ? e.message : 'generic';
        setAvatarErr(code);
      });
  }, []);

  const bioAge = avatar ? splitYearMonths(avatar.fiveAges.life) : null;
  const youthAge = avatar ? splitYearMonths(avatar.fiveAges.vitality) : null;
  const ctaHref = signedIn ? '/survey' : '/signup';
  const ctaLabel = signedIn ? H.twinCtaSignedIn : H.twinCtaSignedOut;
  const promptText = signedIn ? H.twinPromptSignedIn : H.twinPromptSignedOut;

  return (
    <AppShell decoration="dots">
      <section className="mt-2 flex items-center justify-between px-1">
        <span className="inline-flex items-center rounded-full bg-stone-900 px-3 py-1 text-[11px] font-bold tracking-wide text-white dark:bg-white dark:text-stone-900">
          {H.plusBadge}
        </span>
        <span className="text-[13px] font-bold tracking-[0.18em] text-stone-700 dark:text-stone-200">
          {H.brandLine}
        </span>
      </section>

      <Link
        href={ctaHref}
        className="card-shadow mt-3 flex items-center justify-between rounded-2xl bg-white px-5 py-4 transition active:scale-[0.99] dark:bg-stone-900"
      >
        <span className="text-sm font-medium text-stone-800 dark:text-stone-100">
          {promptText}
        </span>
        <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-brand-700 dark:text-brand-300">
          {ctaLabel}
          <ChevronRightIcon className="h-4 w-4" />
        </span>
      </Link>

      <section className="mt-3 grid grid-cols-2 gap-3">
        <AgeCard
          eyebrow={H.cardBioAgeEyebrow}
          label={H.cardBioAgeLabel}
          pair={bioAge}
          yearUnit={H.cardAgeYearUnit}
          monthUnit={H.cardAgeMonthUnit}
          hint={H.cardNoReportHint}
        />
        <AgeCard
          eyebrow={H.cardYouthAgeEyebrow}
          label={H.cardYouthAgeLabel}
          pair={youthAge}
          yearUnit={H.cardAgeYearUnit}
          monthUnit={H.cardAgeMonthUnit}
          hint={H.cardNoReportHint}
        />
      </section>

      <section className="card-shadow relative mt-3 overflow-hidden rounded-2xl">
        <div className="relative aspect-[16/10] w-full bg-gradient-to-br from-brand-700 via-teal-600 to-emerald-500">
          <PulseBackground variant="bottom" />
          <div className="absolute inset-0 flex items-end p-4">
            <div className="flex items-center gap-2 text-white">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/15 backdrop-blur">
                <ActivityIcon className="h-5 w-5" />
              </span>
              <span className="text-[12px] font-semibold tracking-wide">
                {H.videoCaption}
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-3 grid grid-cols-2 gap-3">
        <Link
          href="/routine"
          className="card-shadow flex flex-col gap-1 rounded-2xl bg-white px-4 py-3 transition active:scale-[0.99] dark:bg-stone-900"
        >
          <span className="text-[10px] font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400">
            {H.boxRoutineEyebrow}
          </span>
          <span className="text-sm font-bold text-stone-900 dark:text-stone-100">
            {H.boxRoutineTitle}
          </span>
          <span className="text-[11px] text-stone-600 dark:text-stone-400">
            {H.boxRoutineBody}
          </span>
        </Link>

        <Link
          href="/care"
          className="card-shadow flex flex-col gap-1 rounded-2xl bg-white px-4 py-3 transition active:scale-[0.99] dark:bg-stone-900"
        >
          <span className="text-[10px] font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400">
            {H.boxCareEyebrow}
          </span>
          <span className="text-sm font-bold text-stone-900 dark:text-stone-100">
            {H.boxCareTitle}
          </span>
          <span className="text-[11px] text-stone-600 dark:text-stone-400">
            {H.boxCareBody}
          </span>
        </Link>
      </section>

      <Link
        href="/community"
        className="card-shadow mt-3 flex items-center justify-between gap-2 rounded-2xl bg-white/80 px-4 py-3 transition active:scale-[0.99] dark:bg-stone-900/70"
      >
        <div className="flex min-w-0 items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-brand-50 text-brand-700 dark:bg-brand-900 dark:text-brand-200">
            <HeartPulseIcon className="h-4 w-4" />
          </span>
          <p className="truncate text-[12px] text-stone-700 dark:text-stone-300">
            {H.affiliateRolling}
          </p>
        </div>
        <ChevronRightIcon className="h-4 w-4 shrink-0 text-stone-400 dark:text-stone-500" />
      </Link>

      <section className="mt-4 flex items-center justify-between gap-2 px-1">
        <Link
          href="/menu"
          className="inline-flex items-center gap-1 rounded-xl border border-stone-200 bg-white/60 px-3 py-2 text-[12px] font-semibold text-stone-700 dark:border-stone-800 dark:bg-stone-900/50 dark:text-stone-200"
        >
          <MenuIcon className="h-4 w-4" />
          <span>{H.menuShortcut}</span>
        </Link>
        {signedIn ? (
          <Link
            href="/reports"
            className="inline-flex items-center gap-1 rounded-xl bg-stone-900 px-3 py-2 text-[12px] font-semibold text-white dark:bg-white dark:text-stone-900"
          >
            <ChartIcon className="h-4 w-4" />
            <span>{t.nav.reports}</span>
          </Link>
        ) : (
          <Link
            href="/login"
            className="inline-flex items-center gap-1 rounded-xl bg-stone-900 px-3 py-2 text-[12px] font-semibold text-white dark:bg-white dark:text-stone-900"
          >
            <span>{H.loginShortcut}</span>
          </Link>
        )}
      </section>

      <div className="mt-4 rounded-2xl border border-stone-200/70 bg-white/70 px-4 py-3 text-[11px] leading-relaxed text-stone-600 dark:border-stone-800 dark:bg-stone-900/60 dark:text-stone-400">
        {H.disclaimer}
        {avatarErr && avatarErr !== 'NO_REPORT' && (
          <span className="ml-1 text-rose-600 dark:text-rose-300">
            · {avatarErr}
          </span>
        )}
      </div>
    </AppShell>
  );
}

function AgeCard({
  eyebrow,
  label,
  pair,
  yearUnit,
  monthUnit,
  hint,
}: {
  eyebrow: string;
  label: string;
  pair: AgePair | null;
  yearUnit: string;
  monthUnit: string;
  hint: string;
}) {
  return (
    <div className="card-shadow flex flex-col rounded-2xl bg-white px-4 py-3 dark:bg-stone-900">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400">
        {eyebrow}
      </span>
      {pair ? (
        <div className="mt-1 flex items-baseline gap-1">
          <span className="text-2xl font-bold leading-tight tracking-tight text-stone-900 dark:text-stone-100">
            {pair.years}
          </span>
          <span className="text-[12px] text-stone-600 dark:text-stone-400">
            {yearUnit}
          </span>
          {pair.months > 0 && (
            <>
              <span className="ml-1 text-base font-semibold text-stone-700 dark:text-stone-300">
                {pair.months}
              </span>
              <span className="text-[12px] text-stone-600 dark:text-stone-400">
                {monthUnit}
              </span>
            </>
          )}
        </div>
      ) : (
        <span className="mt-2 text-[12px] font-medium text-stone-400 dark:text-stone-500">
          {hint}
        </span>
      )}
      <span className="mt-2 text-[11px] text-stone-600 dark:text-stone-400">
        {label}
      </span>
    </div>
  );
}
