'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { ChevronRightIcon, ShieldIcon } from '@/components/HealthIcons';
import { useI18n } from '@/lib/i18n';
import { readSession } from '@/lib/session';
import { fetchAdminWhoami } from '@/lib/api-client';

type GuardState =
  | { status: 'loading' }
  | { status: 'unauth' }
  | { status: 'forbidden' }
  | { status: 'ok' };

export function AdminGuard({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const A = t.admin;
  const [state, setState] = useState<GuardState>({ status: 'loading' });

  useEffect(() => {
    if (!readSession()) {
      setState({ status: 'unauth' });
      return;
    }
    fetchAdminWhoami()
      .then((data) => {
        setState({ status: data.isAdmin ? 'ok' : 'forbidden' });
      })
      .catch(() => {
        setState({ status: 'forbidden' });
      });
  }, []);

  if (state.status === 'loading') {
    return (
      <AppShell title={A.pageTitle} decoration="dots" hideBottomNav>
        <div className="mt-10 flex justify-center">
          <span className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-stone-300 border-t-brand-700 dark:border-stone-700 dark:border-t-brand-400" />
        </div>
      </AppShell>
    );
  }

  if (state.status === 'unauth' || state.status === 'forbidden') {
    const subtitle = state.status === 'unauth' ? A.loginPrompt : A.notAuthorizedBody;
    return (
      <AppShell title={A.pageTitle} decoration="dots" hideBottomNav>
        <section className="card-shadow mt-8 rounded-3xl bg-white p-8 text-center dark:bg-stone-900">
          <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-200">
            <ShieldIcon className="h-7 w-7" />
          </span>
          <h1 className="mt-4 text-xl font-bold text-stone-900 dark:text-stone-100">
            {A.notAuthorizedTitle}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-stone-600 dark:text-stone-400">
            {subtitle}
          </p>
          <Link
            href={state.status === 'unauth' ? '/login' : '/'}
            className="mt-6 inline-flex items-center gap-1 rounded-2xl bg-stone-900 px-5 py-3 text-sm font-semibold text-white transition active:scale-[0.98] dark:bg-white dark:text-stone-900"
          >
            <span>{state.status === 'unauth' ? A.loginPrompt : A.backToHome}</span>
            <ChevronRightIcon className="h-4 w-4" />
          </Link>
        </section>
      </AppShell>
    );
  }

  return <>{children}</>;
}
