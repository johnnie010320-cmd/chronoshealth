'use client';

// 라이프(홈) 탭 — 결과 표시 중심(정보구조 재편 2026-08).
// AI 리포트(활력·나이·의료비)와 VITA 진단 요약을 여기서 "러프하게" 보여준다.
// 데이터 입력은 AI 리포트 탭, 진단 상세는 AI 진단 탭.

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { IconBadge } from '@/components/IconBadge';
import { ChevronRightIcon, TargetIcon, StethoscopeIcon } from '@/components/HealthIcons';
import { AvatarReport } from '@/components/AvatarReport';
import { VitaSummaryCard } from '@/components/VitaSummaryCard';
import { BannerCarousel } from '@/components/BannerCarousel';
import { useI18n } from '@/lib/i18n';
import { readSession } from '@/lib/session';
import { getNoticeLastSeen } from '@/lib/notice-state';
import { fetchMeProfile, fetchNotices, type Notice } from '@/lib/api-client';

export default function HomePage() {
  const { t } = useI18n();
  const H = t.home;
  const router = useRouter();
  const [signedIn, setSignedIn] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [noticeHasNew, setNoticeHasNew] = useState(false);

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
        if (!data.profile.isProfileComplete) router.replace('/onboarding');
      })
      .catch(() => {
        /* me 조회 실패는 무시 (게이트 우회) */
      });
  }, [router]);

  useEffect(() => {
    // 공지는 공개 — 로그인 여부 무관. 최신 1건만 배너로 + 미확인 알림 표시.
    fetchNotices()
      .then((list) => {
        setNotice(list[0] ?? null);
        const max = list.reduce<string | null>(
          (m, n) => (m == null || n.createdAt > m ? n.createdAt : m),
          null,
        );
        const seen = getNoticeLastSeen();
        setNoticeHasNew(max != null && (seen == null || max > seen));
      })
      .catch(() => {
        /* noop */
      });
  }, []);

  const ctaHref = signedIn ? '/reports' : '/signup';
  const ctaLabel = signedIn ? H.twinCtaSignedIn : H.twinCtaSignedOut;
  const promptText = signedIn ? H.twinPromptSignedIn : H.twinPromptSignedOut;

  return (
    <AppShell decoration="dots">
      {/* 메인 배너 — 관리자 배너(이미지/동영상) 캐러셀. 배너 없으면 기본 히어로 이미지 */}
      <BannerCarousel />

      {notice && (
        <Link
          href="/notices"
          className="card-shadow mt-3 flex items-center justify-between gap-2 rounded-2xl bg-gradient-to-br from-brand-50 to-amber-50 px-4 py-3 transition active:scale-[0.99] dark:from-brand-900/30 dark:to-amber-900/20"
        >
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-brand-700 dark:text-brand-200">
              {t.notices.homeEyebrow}
              {noticeHasNew && (
                <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">
                  {t.notices.newBadge}
                </span>
              )}
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
          className="card-shadow mt-3 flex items-center justify-between gap-2 rounded-2xl card-violet px-5 py-4 transition active:scale-[0.99]"
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
        <section className="card-shadow mt-3 rounded-2xl card-sky px-5 py-4">
          <p className="text-[13px] font-medium text-stone-800 dark:text-stone-100">{promptText}</p>
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

      {/* VITA 진단 요약(러프) — 상세는 AI 진단 탭 */}
      {signedIn && <VitaSummaryCard />}

      {/* AI 리포트 결과(활력 점수·예측 잔여 연수·5종 나이·생애 예상 의료비) */}
      {signedIn && (
        <section className="mt-3">
          <AvatarReport />
        </section>
      )}

      <section className="mt-3 grid grid-cols-2 gap-3">
        <Link
          href="/health-diary"
          className="card-shadow flex flex-col gap-1 rounded-2xl card-amber px-4 py-3 transition active:scale-[0.99]"
        >
          <IconBadge Icon={TargetIcon} tone="amber" size="sm" className="mb-1" />
          <span className="text-[10px] font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400">
            {H.boxRoutineEyebrow}
          </span>
          <span className="text-sm font-bold text-stone-900 dark:text-stone-100">
            {H.boxRoutineTitle}
          </span>
          <span className="text-[11px] text-stone-600 dark:text-stone-400">{H.boxRoutineBody}</span>
        </Link>

        <Link
          href="/care"
          className="card-shadow flex flex-col gap-1 rounded-2xl card-rose px-4 py-3 transition active:scale-[0.99]"
        >
          <IconBadge Icon={StethoscopeIcon} tone="rose" size="sm" className="mb-1" />
          <span className="text-[10px] font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400">
            {H.boxCareEyebrow}
          </span>
          <span className="text-sm font-bold text-stone-900 dark:text-stone-100">
            {H.boxCareTitle}
          </span>
          <span className="text-[11px] text-stone-600 dark:text-stone-400">{H.boxCareBody}</span>
        </Link>
      </section>

      {!signedIn && (
        <div className="mt-3 rounded-2xl border border-stone-200/70 bg-white/70 px-4 py-2.5 text-[11px] leading-relaxed text-stone-600 dark:border-stone-800 dark:bg-stone-900/60 dark:text-stone-400">
          {H.disclaimer}
        </div>
      )}
    </AppShell>
  );
}
