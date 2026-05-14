'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/i18n';
import { readSession, clearSession, type StoredSession } from '@/lib/session';
import { UserCircleIcon, LogoutIcon, MenuIcon } from './HealthIcons';

// 헤더 우측 드롭다운 메뉴.
// 비로그인 → 로그인(준비중, disabled) + 회원가입
// 로그인  → 내 정보 + 로그아웃
export function UserMenu() {
  const { t } = useI18n();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState<StoredSession | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    setSession(readSession());
  }, []);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        btnRef.current &&
        !btnRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const handleLogout = () => {
    clearSession();
    setSession(null);
    setOpen(false);
    router.push('/');
  };

  const isLoggedIn = session !== null;

  return (
    <div className="relative">
      <button
        ref={btnRef}
        type="button"
        aria-label={t.userMenu.open}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full text-stone-700 transition hover:bg-stone-200/60 dark:text-stone-200 dark:hover:bg-stone-800/60"
      >
        {isLoggedIn ? (
          <UserCircleIcon className="h-5 w-5" />
        ) : (
          <MenuIcon className="h-5 w-5" />
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          role="menu"
          className="card-shadow absolute right-0 top-11 z-20 w-56 overflow-hidden rounded-2xl border border-stone-200/70 bg-white py-1.5 text-sm dark:border-stone-800 dark:bg-stone-900"
        >
          {isLoggedIn ? (
            <>
              <Link
                href="/profile"
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-stone-800 hover:bg-stone-100 dark:text-stone-100 dark:hover:bg-stone-800"
              >
                <UserCircleIcon className="h-4 w-4 text-stone-500" />
                <span>{t.userMenu.profile}</span>
              </Link>
              <button
                type="button"
                role="menuitem"
                onClick={handleLogout}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-stone-800 hover:bg-stone-100 dark:text-stone-100 dark:hover:bg-stone-800"
              >
                <LogoutIcon className="h-4 w-4 text-stone-500" />
                <span>{t.userMenu.logout}</span>
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                role="menuitem"
                onClick={() => setOpen(false)}
                className="block px-4 py-2.5 text-stone-800 hover:bg-stone-100 dark:text-stone-100 dark:hover:bg-stone-800"
              >
                {t.userMenu.login}
              </Link>
              <Link
                href="/signup"
                role="menuitem"
                onClick={() => setOpen(false)}
                className="block px-4 py-2.5 font-medium text-brand-700 hover:bg-brand-50 dark:text-brand-300 dark:hover:bg-brand-900/30"
              >
                {t.userMenu.signup}
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  );
}
