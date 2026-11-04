'use client';

// 홈 탭 — 목업(2.png) 순서 + 삼성 헬스식 vibrant 디자인(2026-10-07 죠니, "과하다 싶을 정도로").
// 큰 라운드 카드 · 포화 그라데이션 · 흰 글자 · 코너 글로우/아이콘 장식.

import { useEffect, useState, type ReactElement, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import {
  ChevronRightIcon,
  TrophyIcon,
  ActivityIcon,
  SparkleIcon,
  CoinIcon,
} from '@/components/HealthIcons';
import { BannerCarousel } from '@/components/BannerCarousel';
import { BioAgeReport } from '@/components/home/BioAgeReport';
import { VitaResultHomeCard } from '@/components/home/VitaResultHomeCard';
import { useI18n } from '@/lib/i18n';
import { readSession } from '@/lib/session';
import { getNoticeLastSeen } from '@/lib/notice-state';
import { useTwinNickname } from '@/lib/profile-state';
import { fetchMeProfile, fetchNotices, fetchSiteContent, type Notice } from '@/lib/api-client';

const DEFAULT_HERO_TITLE = 'VITA Code';
const DEFAULT_HERO_GREETING = '오늘도 VITAcode와 함께 건강한 하루를 만들어봐요!';
const DEFAULT_RESULT_LEGAL =
  '비타코드 특허 출원번호 제10-2026-0197729호';

export default function HomePage() {
  const { t } = useI18n();
  const H = t.home;
  const router = useRouter();
  const nickname = useTwinNickname();
  const [signedIn, setSignedIn] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [noticeHasNew, setNoticeHasNew] = useState(false);
  const [heroTitle, setHeroTitle] = useState(DEFAULT_HERO_TITLE);
  const [heroGreeting, setHeroGreeting] = useState(DEFAULT_HERO_GREETING);
  const [resultLegal, setResultLegal] = useState(DEFAULT_RESULT_LEGAL);

  useEffect(() => {
    const session = readSession();
    if (!session) {
      setSignedIn(false);
      return;
    }
    setSignedIn(true);
    fetchMeProfile(false)
      .then((data) => {
        if (!data.profile.isProfileComplete) router.replace('/onboarding');
      })
      .catch(() => {
        /* me 조회 실패 무시 */
      });
  }, [router]);

  useEffect(() => {
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
      .catch(() => {});

    fetchSiteContent()
      .then((content) => {
        const title = content['app_home_title'];
        const greeting = content['app_home_greeting'];
        const legal = content['app_vitacode_result_desc'];
        if (title && title.trim()) setHeroTitle(title.trim());
        if (greeting && greeting.trim()) setHeroGreeting(greeting.trim());
        if (legal && legal.trim()) setResultLegal(legal.trim());
      })
      .catch(() => {});
  }, []);

  const nameLine = nickname ? `안녕하세요 ${nickname}님` : '안녕하세요!';

  return (
    <AppShell decoration="dots">
      {/* ① VITA Code 타이틀 + 인사말 */}
      <section className="pb-2 pt-1">
        <h1 className="grad-text text-4xl font-black tracking-tight">{heroTitle}</h1>
        <p className="mt-1.5 text-[13px] font-bold text-stone-800 dark:text-stone-100">{nameLine}</p>
        <p className="text-[12px] leading-relaxed text-stone-500 dark:text-stone-400">
          {heroGreeting}
        </p>
      </section>

      {/* ② 메인 배너 */}
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
        <>
          {/* ③ Digital Twin 만들기 — 남·여 전신 듀오 이미지 히어로 */}
          <Link
            href="/reports"
            className="card-shadow relative mt-4 block overflow-hidden rounded-3xl bg-[#07101e] transition active:scale-[0.99]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/vita/body/twin-duo.png"
              alt=""
              className="pointer-events-none absolute inset-0 h-full w-full object-cover object-right"
            />
            <span
              aria-hidden
              className="absolute inset-0 bg-gradient-to-r from-[#07101e] via-[#07101e]/80 to-transparent"
            />
            <div className="relative z-10 px-5 py-7 text-white">
              <h2 className="text-xl font-extrabold tracking-tight">Digital Twin 만들기</h2>
              <p className="mt-1.5 max-w-[56%] text-[12.5px] font-medium leading-relaxed text-white/85">
                나의 건강 데이터로 디지털 트윈을 만들어보세요
              </p>
              <span className="mt-5 inline-flex items-center gap-1 rounded-full bg-white px-4 py-2 text-[13px] font-extrabold text-cyan-700">
                만들기
                <ChevronRightIcon className="h-4 w-4" />
              </span>
            </div>
          </Link>

          {/* ④ Digital Twin 생체나이 리포트 + 건강 나이 4종 */}
          <BioAgeReport />

          {/* ⑤ VITAtest 시작하기 — 큰 violet 카드 */}
          <BigCard grad="grad-violet" title="VITAtest 시작하기" subtitle="200문항으로 나의 대사 유형(VITA 코드)을 찾으세요" cta="시작하기" href="/vita-test" btnText="text-violet-700">
            <span className="blob" style={{ width: 130, height: 130, right: -16, top: -18, background: 'radial-gradient(circle, #f0abfc, transparent 70%)' }} />
            <SparkleIcon className="absolute right-4 top-6 h-24 w-24 text-white/30" />
          </BigCard>

          {/* ⑥ VITAcode 진단결과 */}
          <VitaResultHomeCard legalText={resultLegal} />
        </>
      ) : (
        <section className="grad-indigo card-shadow mt-4 overflow-hidden rounded-3xl px-5 py-6">
          <p className="text-lg font-extrabold">나의 대사 유형을 찾아보세요</p>
          <p className="mt-1 text-[12px] text-white/85">{H.twinPromptSignedOut}</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-full bg-white px-3 py-2.5 text-[12px] font-extrabold text-indigo-700 transition active:scale-[0.97]"
            >
              {H.signupCta}
              <ChevronRightIcon className="h-3.5 w-3.5" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-full bg-white/20 px-3 py-2.5 text-[12px] font-bold text-white transition active:scale-[0.97]"
            >
              {H.loginCta}
              <ChevronRightIcon className="h-3.5 w-3.5" />
            </Link>
          </div>
        </section>
      )}

      {/* ⑦ 바로가기 4박스 (한 줄 4열, vivid) */}
      <section className="mt-4 grid grid-cols-4 gap-2.5">
        <HomeBox href="/ranking" Icon={TrophyIcon} tile="tile-amber" title={'랭킹\n내 위치'} />
        <HomeBox href="/bio-age" Icon={ActivityIcon} tile="tile-sky" title={'생체 나이\n리포트'} />
        <HomeBox href="/vita-score" Icon={SparkleIcon} tile="tile-violet" title={'VITA\n건강점수'} />
        <HomeBox href="/medical-cost" Icon={CoinIcon} tile="tile-rose" title={'생애 의료비\n계산'} />
      </section>
    </AppShell>
  );
}

function BigCard({
  grad,
  title,
  subtitle,
  cta,
  href,
  btnText,
  children,
}: {
  grad: string;
  title: string;
  subtitle: string;
  cta: string;
  href: string;
  btnText: string;
  children?: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`${grad} card-shadow relative mt-4 block overflow-hidden rounded-3xl px-5 py-6 transition active:scale-[0.99]`}
    >
      {children}
      <div className="relative z-10">
        <h2 className="text-xl font-extrabold tracking-tight">{title}</h2>
        <p className="mt-1.5 max-w-[72%] text-[12.5px] font-medium leading-relaxed text-white/85">
          {subtitle}
        </p>
        <span
          className={`mt-5 inline-flex items-center gap-1 rounded-full bg-white px-4 py-2 text-[13px] font-extrabold ${btnText}`}
        >
          {cta}
          <ChevronRightIcon className="h-4 w-4" />
        </span>
      </div>
    </Link>
  );
}

function HomeBox({
  href,
  Icon,
  tile,
  title,
}: {
  href: string;
  Icon: (p: { className?: string; strokeWidth?: number }) => ReactElement;
  tile: string;
  title: string;
}) {
  return (
    <Link
      href={href}
      className={`${tile} card-shadow flex flex-col items-center gap-1.5 rounded-2xl px-1.5 py-3.5 text-center transition active:scale-[0.96]`}
    >
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/25">
        <Icon className="h-5 w-5 text-white" strokeWidth={2.1} />
      </span>
      <span className="whitespace-pre-line text-[10.5px] font-bold leading-tight text-white">
        {title}
      </span>
    </Link>
  );
}
