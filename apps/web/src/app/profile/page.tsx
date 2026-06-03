'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { useI18n } from '@/lib/i18n';
import { readSession, clearSession, type StoredSession } from '@/lib/session';
import { useIsAdmin } from '@/lib/admin-state';
import {
  UserCircleIcon,
  ShieldIcon,
  LogoutIcon,
  ClockIcon,
  ChevronRightIcon,
} from '@/components/HealthIcons';

export default function ProfilePage() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [session, setSession] = useState<StoredSession | null>(null);
  const [ready, setReady] = useState(false);
  const isAdmin = useIsAdmin();

  useEffect(() => {
    const s = readSession();
    if (s) {
      setSession(s);
      setReady(true);
    } else {
      router.replace('/signup');
    }
  }, [router]);

  if (!ready || !session) return null;

  const expiresLocal = new Date(session.expiresAt).toLocaleString(locale);

  const handleLogout = () => {
    if (typeof window !== 'undefined' && !window.confirm(t.profile.logoutConfirm)) {
      return;
    }
    clearSession();
    router.push('/');
  };

  return (
    <AppShell title={t.profile.pageTitle} decoration="dots">
      {isAdmin === true && (
        <Link
          href="/admin"
          className="card-shadow mt-4 flex items-center justify-between gap-3 rounded-3xl bg-gradient-to-r from-rose-500 via-rose-600 to-amber-500 px-5 py-4 text-white transition active:scale-[0.99]"
        >
          <div className="flex items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
              <ShieldIcon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-sm font-bold tracking-tight">
                {t.admin.accessTitle}
                <span className="inline-flex items-center rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold tracking-[0.15em]">
                  {t.admin.modeBadge}
                </span>
              </p>
              <p className="mt-0.5 truncate text-[12px] leading-relaxed text-white/85">
                {t.admin.accessBody}
              </p>
            </div>
          </div>
          <ChevronRightIcon className="h-5 w-5 shrink-0 text-white/90" />
        </Link>
      )}

      <section className="card-shadow mt-4 rounded-3xl bg-white p-5 dark:bg-stone-900">
        <div className="mb-4 flex items-center gap-3">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 dark:bg-brand-900 dark:text-brand-200">
            <UserCircleIcon className="h-5 w-5" />
          </span>
          <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100">
            {t.profile.sectionAccount}
          </h2>
        </div>

        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-[11px] font-medium uppercase tracking-widest text-stone-500 dark:text-stone-400">
              {t.profile.pseudonymLabel}
            </dt>
            <dd className="mt-1 break-all font-mono text-[13px] text-stone-800 dark:text-stone-200">
              {session.userPseudonymId}
            </dd>
          </div>
          <div>
            <dt className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-widest text-stone-500 dark:text-stone-400">
              <ClockIcon className="h-3 w-3" />
              {t.profile.expiresAtLabel}
            </dt>
            <dd className="mt-1 text-[13px] text-stone-800 dark:text-stone-200">
              {expiresLocal}
            </dd>
          </div>
        </dl>
      </section>

      <section className="card-shadow mt-4 rounded-3xl bg-white p-5 dark:bg-stone-900">
        <div className="mb-3 flex items-center gap-3">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 dark:bg-brand-900 dark:text-brand-200">
            <ShieldIcon className="h-5 w-5" />
          </span>
          <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100">
            {t.profile.sectionPrivacy}
          </h2>
        </div>
        <p className="mb-3 text-[12px] leading-relaxed text-stone-600 dark:text-stone-400">
          {t.profile.note}
        </p>
        <ul className="space-y-2 text-[13px] text-stone-800 dark:text-stone-200">
          <li className="flex items-start gap-2">
            <span aria-hidden className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
            <span>{t.profile.consentMedical}</span>
          </li>
          <li className="flex items-start gap-2">
            <span aria-hidden className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
            <span>{t.profile.consentTerms}</span>
          </li>
        </ul>
      </section>

      <div className="mt-6">
        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-white px-6 py-4 text-base font-semibold text-rose-700 transition active:scale-[0.98] hover:bg-rose-50 dark:border-rose-900 dark:bg-stone-900 dark:text-rose-300 dark:hover:bg-rose-950"
        >
          <LogoutIcon className="h-5 w-5" />
          {t.profile.logout}
        </button>
      </div>
    </AppShell>
  );
}
