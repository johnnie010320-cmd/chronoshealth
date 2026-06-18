'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { PulseBackground } from '@/components/PulseBackground';
import {
  ChevronRightIcon,
  ActivityIcon,
  UsersIcon,
} from '@/components/HealthIcons';
import { useI18n } from '@/lib/i18n';
import { readSession } from '@/lib/session';
import { useIsAdmin } from '@/lib/admin-state';
import {
  fetchAvatarMe,
  fetchMeProfile,
  fetchNotices,
  type AvatarResponse,
  type Notice,
} from '@/lib/api-client';

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
  const A = t.admin;
  const router = useRouter();
  const [signedIn, setSignedIn] = useState(false);
  const [avatar, setAvatar] = useState<AvatarResponse | null>(null);
  const [avatarErr, setAvatarErr] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const isAdmin = useIsAdmin();

  useEffect(() => {
    const session = readSession();
    if (!session) {
      setSignedIn(false);
      return;
    }
    setSignedIn(true);
    // ADR 0013 — 본인정보 미완료 시 /onboarding 강제 이동
    fetchMeProfile(false)
      .then((data) => {
        if (!data.profile.isProfileComplete) {
          router.replace('/onboarding');
        }
      })
      .catch(() => {
        /* me 조회 실패는 무시 (게이트 우회) */
      });
    fetchAvatarMe()
      .then((data) => setAvatar(data))
      .catch((e) => {
        const code = e instanceof Error ? e.message : 'generic';
        setAvatarErr(code);
      });
  }, [router]);

  useEffect(() => {
    // 공지는 공개 — 로그인 여부 무관. 최신 1건만 배너로.
    fetchNotices()
      .then((list) => setNotice(list[0] ?? null))
      .catch(() => {
        /* noop */
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
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-stone-900 px-3 py-1 text-[11px] font-bold tracking-wide text-white dark:bg-white dark:text-stone-900">
            {H.plusBadge}
          </span>
          {isAdmin === true && (
            <Link
              href="/admin"
              className="inline-flex items-center rounded-full bg-gradient-to-r from-rose-600 to-amber-500 px-2.5 py-1 text-[10px] font-bold tracking-[0.15em] text-white transition active:scale-[0.97]"
              aria-label={A.accessCta}
            >
              {A.modeBadge}
            </Link>
          )}
        </div>
        <span className="text-[13px] font-bold tracking-[0.18em] text-stone-700 dark:text-stone-200">
          {H.brandLine}
        </span>
      </section>

      {notice && (
        <Link
          href="/notices"
          className="card-shadow mt-3 flex items-center justify-between gap-2 rounded-2xl bg-gradient-to-br from-brand-50 to-amber-50 px-4 py-3 transition active:scale-[0.99] dark:from-brand-900/30 dark:to-amber-900/20"
        >
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-brand-700 dark:text-brand-200">
              {t.notices.homeEyebrow}
            </p>
            <p className="mt-0.5 truncate text-sm font-bold text-stone-900 dark:text-stone-100">
              {notice.title}
            </p>
          </div>
          <ChevronRightIcon className="h-4 w-4 shrink-0 text-stone-500 dark:text-stone-400" />
        </Link>
      )}

      {signedIn ? (
        <Link
          href={ctaHref}
          className="card-shadow mt-3 flex items-center justify-between gap-2 rounded-2xl bg-white px-5 py-4 transition active:scale-[0.99] dark:bg-stone-900"
        >
          <span className="min-w-0 flex-1 text-[13px] font-medium text-stone-800 dark:text-stone-100">
            {promptText}
          </span>
          <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-[11px] font-semibold text-brand-700 dark:text-brand-300">
            {ctaLabel}
            <ChevronRightIcon className="h-3.5 w-3.5" />
          </span>
        </Link>
      ) : (
        <section className="card-shadow mt-3 rounded-2xl bg-white px-5 py-4 dark:bg-stone-900">
          <p className="text-[13px] font-medium text-stone-800 dark:text-stone-100">
            {promptText}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-xl bg-stone-900 px-3 py-2.5 text-[12px] font-semibold text-white transition active:scale-[0.97] dark:bg-white dark:text-stone-900"
            >
              {H.signupCta}
              <ChevronRightIcon className="h-3.5 w-3.5" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-[12px] font-semibold text-stone-800 transition active:scale-[0.97] hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:hover:bg-stone-800"
            >
              {H.loginCta}
              <ChevronRightIcon className="h-3.5 w-3.5" />
            </Link>
          </div>
        </section>
      )}

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
            <UsersIcon className="h-4 w-4" />
          </span>
          <p className="truncate text-[12px] font-medium text-stone-700 dark:text-stone-300">
            {t.community.homeCardLabel}
          </p>
        </div>
        <ChevronRightIcon className="h-4 w-4 shrink-0 text-stone-400 dark:text-stone-500" />
      </Link>

      {!signedIn && (
        <div className="mt-3 rounded-2xl border border-stone-200/70 bg-white/70 px-4 py-2.5 text-[11px] leading-relaxed text-stone-600 dark:border-stone-800 dark:bg-stone-900/60 dark:text-stone-400">
          {H.disclaimer}
        </div>
      )}
      {signedIn && avatarErr && avatarErr !== 'NO_REPORT' && (
        <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50/60 px-4 py-2.5 text-[11px] leading-relaxed text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
          {avatarErr}
        </div>
      )}
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
