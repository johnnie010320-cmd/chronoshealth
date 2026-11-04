'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowLeftIcon, HomeIcon } from './HealthIcons';
import { LanguageSwitcher } from './LanguageSwitcher';
import { UserMenu } from './UserMenu';
import { BottomNav } from './BottomNav';
import { useI18n } from '@/lib/i18n';
import { useTwinNickname } from '@/lib/profile-state';
import { useUnreadMessages } from '@/lib/messages-state';
import { useIsAdmin } from '@/lib/admin-state';

type Props = {
  children: ReactNode;
  showBack?: boolean;
  backHref?: string;
  // 뒤로가기를 네비게이션 대신 가로채고 싶을 때(예: 온보딩 이탈 확인). 지정 시 홈 버튼은 숨긴다.
  onBack?: () => void;
  title?: string;
  decoration?: 'pulse' | 'dots' | 'none';
  hideBottomNav?: boolean;
};

// 앱 홈 = 루트 '/'. 회사 홍보 사이트는 vitalabsinc.com(별도 프로젝트)로 분리(2026-09-20).
const APP_HOME = '/';

// 이 SPA 세션에서 AppShell이 마운트된 횟수(= 앱 내부 이동 횟수). 2 이상이면 앱 내부에
// 직전 페이지가 존재하므로 뒤로가기=브라우저 history.back()이 "그 이전 페이지"로 정확히 간다.
// 1이면(새로고침/딥링크 직접 진입) history가 없으므로 PARENT_MAP 상위로 폴백한다.
let appNavCount = 0;

export function AppShell({
  children,
  showBack,
  backHref = APP_HOME,
  onBack,
  title,
  decoration = 'dots',
  hideBottomNav = false,
}: Props) {
  const { t } = useI18n();
  const router = useRouter();
  const nickname = useTwinNickname();
  const unread = useUnreadMessages();
  const pathname = usePathname();
  const isAdmin = useIsAdmin();

  // 앱 내부 이동 1회로 집계(페이지 이동마다 AppShell이 새로 마운트됨).
  useEffect(() => {
    appNavCount += 1;
  }, []);

  // 상위(부모) 경로 — 직접 진입/새로고침 시의 폴백.
  const parentHref = resolveParent(pathname, showBack === true ? backHref : undefined);

  // 뒤로가기: 앱 내부에 직전 페이지가 있으면 실제 history로 "그 이전 페이지"로 이동,
  // 없으면(딥링크) 상위 경로로 폴백(2026-10-09 죠니 — 다중 진입 페이지의 뒤로가기 오작동 수정).
  function handleBack() {
    if (appNavCount > 1) router.back();
    else router.push(parentHref);
  }
  const showHeaderBack = (showBack ?? pathname !== APP_HOME) && pathname !== APP_HOME;
  // 상위가 홈이면 뒤로가기=홈 이므로 홈 버튼 중복 표기 안 함. 상위가 홈이 아닐 때만 홈 버튼 추가.
  const showHomeButton = showHeaderBack && parentHref !== APP_HOME;

  const iconButtonClass =
    'inline-flex h-9 w-9 items-center justify-center rounded-full text-stone-700 hover:bg-stone-200/60 dark:text-stone-200 dark:hover:bg-stone-800/60';

  // 헤더 2층 구조 — 1층은 브랜드/이동 + 고정 액션 아이콘만 두고,
  // 폭이 가변인 요소(제목·닉네임·배지·브랜드라인)는 2층으로 내려 겹침을 원천 차단한다.
  // 'DID AI' 태그라인 제거(기능 없음, 2026-10-07 죠니).
  const showBrandLine = false;
  const showAdminBadge = isAdmin === true && !showHeaderBack;
  const showNickname = !title && Boolean(nickname);
  const hasSecondRow =
    Boolean(title) || showNickname || showAdminBadge || showBrandLine;

  return (
    <div className="app-bg relative mx-auto flex min-h-[100dvh] max-w-md flex-col overflow-x-clip">
      <MessageToast arrivedAt={unread.arrivedAt} count={unread.count} />
      {decoration === 'dots' && (
        <div
          aria-hidden
          className="bg-dot-pattern pointer-events-none absolute inset-0 -z-10"
        />
      )}

      <header className="safe-top sticky top-0 z-10 backdrop-blur-md">
        {/* 1층 — 브랜드/이동 + 고정 액션 아이콘. 아이콘은 shrink-0 이라 항상 자리를 지킨다. */}
        <div className="flex items-center justify-between gap-2 px-5 pb-1.5 pt-3">
          {showHeaderBack ? (
            <div className="-ml-2 flex shrink-0 items-center gap-0.5">
              {onBack ? (
                <button
                  type="button"
                  onClick={onBack}
                  aria-label={t.common.back}
                  className={iconButtonClass}
                >
                  <ArrowLeftIcon className="h-5 w-5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleBack}
                  aria-label={t.common.back}
                  className={iconButtonClass}
                >
                  <ArrowLeftIcon className="h-5 w-5" />
                </button>
              )}
              {!onBack && showHomeButton && (
                <Link href={APP_HOME} aria-label={t.common.home} className={iconButtonClass}>
                  <HomeIcon className="h-5 w-5" />
                </Link>
              )}
            </div>
          ) : (
            <Link
              href={APP_HOME}
              className="flex min-w-0 items-center gap-2 text-stone-900 dark:text-stone-100"
              aria-label={t.brand}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/brand-mark.png"
                alt=""
                className="h-9 w-9 shrink-0 rounded-full object-cover shadow-sm"
              />
              <span className="truncate text-sm font-semibold tracking-tight">
                {t.brand}
              </span>
            </Link>
          )}

          <div className="flex shrink-0 items-center gap-1">
            <MessageBell count={unread.count} />
            <LanguageSwitcher />
            <UserMenu />
          </div>
        </div>

        {/* 2층 — 화면 제목 또는 사용자 컨텍스트(ADMIN 배지·닉네임)와 DID AI 표기. */}
        {hasSecondRow && (
          <div className="flex items-center justify-between gap-2 px-5 pb-2">
            <div className="flex min-w-0 items-center gap-1.5">
              {/* 관리자에게만 보이는 ADMIN 진입 배지. */}
              {showAdminBadge && (
                <Link
                  href="/admin"
                  aria-label={t.admin.accessCta}
                  className="inline-flex shrink-0 items-center rounded-full bg-gradient-to-r from-rose-600 to-amber-500 px-2 py-0.5 text-[9px] font-bold tracking-[0.15em] text-white transition active:scale-[0.97]"
                >
                  {t.admin.modeBadge}
                </Link>
              )}
              {title ? (
                <span className="truncate text-sm font-medium text-stone-700 dark:text-stone-300">
                  {title}
                </span>
              ) : (
                showNickname && (
                  <span className="truncate rounded-full bg-brand-50 px-2.5 py-1 text-[12px] font-semibold text-brand-700 dark:bg-brand-900/40 dark:text-brand-200">
                    {nickname}
                  </span>
                )
              )}
            </div>
            {showBrandLine && (
              <span className="shrink-0 text-[11px] font-bold tracking-[0.16em] text-stone-500 dark:text-stone-400">
                {t.home.brandLine}
              </span>
            )}
          </div>
        )}
      </header>

      <div className={`flex-1 px-5 ${hideBottomNav ? 'pb-8' : 'pb-24'}`}>
        {children}
      </div>

      {!hideBottomNav && <BottomNav />}
      <div className="safe-bottom" />
    </div>
  );
}

// 페이지별 상위(부모) 경로 맵 — "상위 메뉴류"로 이동. 대부분 콘텐츠 페이지는 전체메뉴(/menu) 허브 하위.
// 홈 히어로/카드에서 직접 진입하는 페이지(survey·health-diary)는 홈(/)이 상위.
const PARENT_MAP: Record<string, string> = {
  '/menu': APP_HOME,
  '/survey': APP_HOME,
  '/intro': APP_HOME,
  '/simulate': '/reports',
  '/health-diary': APP_HOME,
  '/twin': '/reports',
  '/vita-test': '/reports',
  '/twin-sim': '/reports',
  '/routine': '/menu',
  '/my-routine': '/menu',
  '/ai-diagnosis': APP_HOME,
  '/reports': APP_HOME,
  '/care': '/menu',
  '/rewards': '/menu',
  '/profile': '/menu',
  '/diary': '/menu',
  '/leaderboard': '/menu',
  '/stats': '/menu',
  '/avatar': '/menu',
  '/notices': '/menu',
  '/community': '/menu',
  '/messages': '/menu',
};

// 상위 경로 해석: ① 명시 backHref 우선 → ② PARENT_MAP → ③ 경로 한 단계 제거 → ④ 홈.
function resolveParent(pathname: string, explicitBackHref?: string): string {
  if (explicitBackHref) return explicitBackHref;
  const path = pathname.replace(/\/$/, '') || '/';
  if (PARENT_MAP[path]) return PARENT_MAP[path];
  const parts = path.split('/').filter(Boolean);
  if (parts.length > 1) {
    parts.pop();
    return '/' + parts.join('/');
  }
  return APP_HOME;
}

// 신규 메시지 알림 배지 — 미읽음>0 일 때 빨간 점+숫자.
function MessageBell({ count }: { count: number }) {
  const { t } = useI18n();
  return (
    <Link
      href="/messages"
      aria-label={t.messaging.nav}
      className="relative inline-flex h-9 w-9 items-center justify-center rounded-full text-stone-600 hover:bg-stone-200/60 dark:text-stone-300 dark:hover:bg-stone-800/60"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
      {count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 inline-flex min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold leading-none text-white">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  );
}

// 새 메시지 도착 토스트 — 미읽음 증가 시 상단에 잠깐 표시(어느 화면에서든). 탭하면 메시지함.
function MessageToast({ arrivedAt, count }: { arrivedAt: number | null; count: number }) {
  const { t } = useI18n();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (arrivedAt === null) return;
    setShow(true);
    const timer = setTimeout(() => setShow(false), 5000);
    return () => clearTimeout(timer);
  }, [arrivedAt]);

  if (!show) return null;
  return (
    <Link
      href="/messages"
      onClick={() => setShow(false)}
      className="fixed inset-x-3 top-[max(env(safe-area-inset-top),0.75rem)] z-50 mx-auto flex max-w-md items-center gap-2.5 rounded-2xl border border-brand-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur dark:border-brand-900 dark:bg-stone-900/95"
    >
      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700 dark:bg-brand-900/50 dark:text-brand-200">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-semibold text-stone-900 dark:text-stone-100">
          {t.messaging.newMessageTitle}
        </span>
        <span className="block truncate text-[11px] text-stone-500 dark:text-stone-400">
          {t.messaging.newMessageBody}
        </span>
      </span>
      {count > 0 && (
        <span className="shrink-0 rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-bold text-white">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  );
}
