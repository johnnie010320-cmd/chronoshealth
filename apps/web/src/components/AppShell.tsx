'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowLeftIcon, HomeIcon } from './HealthIcons';
import { LanguageSwitcher } from './LanguageSwitcher';
import { UserMenu } from './UserMenu';
import { BottomNav } from './BottomNav';
import { useI18n } from '@/lib/i18n';
import { useTwinNickname } from '@/lib/profile-state';
import { useUnreadMessages } from '@/lib/messages-state';

type Props = {
  children: ReactNode;
  showBack?: boolean;
  backHref?: string;
  title?: string;
  decoration?: 'pulse' | 'dots' | 'none';
  hideBottomNav?: boolean;
};

export function AppShell({
  children,
  showBack,
  backHref = '/',
  title,
  decoration = 'dots',
  hideBottomNav = false,
}: Props) {
  const { t } = useI18n();
  const nickname = useTwinNickname();
  const unread = useUnreadMessages();
  const pathname = usePathname();

  // 결정적 상위(부모) 경로 — 브라우저 히스토리(back) 대신 메뉴 계층을 따라 이동(ping-pong 방지).
  const parentHref = resolveParent(pathname, showBack === true ? backHref : undefined);
  const showHeaderBack = (showBack ?? pathname !== '/') && pathname !== '/';
  // 상위가 홈이면 뒤로가기=홈 이므로 홈 버튼 중복 표기 안 함. 상위가 홈이 아닐 때만 홈 버튼 추가.
  const showHomeButton = showHeaderBack && parentHref !== '/';

  const iconButtonClass =
    'inline-flex h-9 w-9 items-center justify-center rounded-full text-stone-700 hover:bg-stone-200/60 dark:text-stone-200 dark:hover:bg-stone-800/60';

  return (
    <div className="relative mx-auto flex min-h-[100dvh] max-w-md flex-col overflow-x-clip">
      <MessageToast arrivedAt={unread.arrivedAt} count={unread.count} />
      {decoration === 'dots' && (
        <div
          aria-hidden
          className="bg-dot-pattern pointer-events-none absolute inset-0 -z-10"
        />
      )}

      <header className="safe-top sticky top-0 z-10 flex items-center justify-between gap-2 px-5 py-3 backdrop-blur-md">
        {showHeaderBack ? (
          <div className="-ml-2 flex items-center gap-0.5">
            <Link href={parentHref} aria-label={t.common.back} className={iconButtonClass}>
              <ArrowLeftIcon className="h-5 w-5" />
            </Link>
            {showHomeButton && (
              <Link href="/" aria-label={t.common.home} className={iconButtonClass}>
                <HomeIcon className="h-5 w-5" />
              </Link>
            )}
          </div>
        ) : (
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-stone-900 dark:text-stone-100"
            aria-label={t.brand}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand-mark.png"
              alt=""
              className="h-9 w-9 rounded-full object-cover shadow-sm"
            />
            <span className="text-sm font-semibold tracking-tight">
              {t.brand}
            </span>
          </Link>
        )}

        <div className="flex min-w-0 items-center gap-1">
          {title && (
            <span className="mr-1 truncate text-sm font-medium text-stone-700 dark:text-stone-300">
              {title}
            </span>
          )}
          {!title && nickname && (
            <span className="mr-0.5 max-w-[7.5rem] truncate rounded-full bg-brand-50 px-2.5 py-1 text-[12px] font-semibold text-brand-700 dark:bg-brand-900/40 dark:text-brand-200">
              {nickname}
            </span>
          )}
          <MessageBell count={unread.count} />
          <LanguageSwitcher />
          <UserMenu />
        </div>
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
  '/menu': '/',
  '/survey': '/',
  '/health-diary': '/',
  '/twin': '/menu',
  '/routine': '/menu',
  '/reports': '/menu',
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
  return '/';
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
