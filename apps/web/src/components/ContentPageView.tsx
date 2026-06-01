'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { useI18n } from '@/lib/i18n';
import {
  fetchContentPage,
  type ContentPage,
  type ContentSlug,
} from '@/lib/api-client';

type LoadState =
  | { status: 'loading' }
  | { status: 'ok'; page: ContentPage }
  | { status: 'notFound' }
  | { status: 'err' };

export function ContentPageView({
  slug,
  fallbackTitle,
}: {
  slug: ContentSlug;
  fallbackTitle: string;
}) {
  const { t, locale } = useI18n();
  const C = t.contentPages;
  const [state, setState] = useState<LoadState>({ status: 'loading' });

  useEffect(() => {
    fetchContentPage(slug, locale)
      .then((page) => setState({ status: 'ok', page }))
      .catch((e) => {
        const code = e instanceof Error ? e.message : 'generic';
        if (code === 'NOT_FOUND') setState({ status: 'notFound' });
        else setState({ status: 'err' });
      });
  }, [slug, locale]);

  return (
    <AppShell
      title={state.status === 'ok' ? state.page.title : fallbackTitle}
      decoration="dots"
      showBack
      backHref="/signup"
      hideBottomNav
    >
      {state.status === 'loading' && (
        <div className="mt-10 flex justify-center">
          <span className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-stone-300 border-t-brand-700 dark:border-stone-700 dark:border-t-brand-400" />
        </div>
      )}

      {state.status === 'notFound' && (
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/60 px-4 py-3 text-sm leading-relaxed text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          {C.notFound}
        </div>
      )}

      {state.status === 'err' && (
        <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-100">
          {C.loadingError}
        </div>
      )}

      {state.status === 'ok' && (
        <article className="mt-3 pb-8">
          <div className="mb-3 flex items-baseline justify-between gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400">
              {C.versionLabel}: {state.page.version}
            </p>
            <p className="text-[10px] text-stone-500 dark:text-stone-400">
              {C.updatedLabel}: {new Date(state.page.updatedAt).toLocaleDateString()}
            </p>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50/60 px-4 py-3 text-[11px] leading-relaxed text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
            {C.notReady}
          </div>

          <pre className="mt-4 whitespace-pre-wrap break-words rounded-2xl bg-white p-4 text-[12px] leading-relaxed text-stone-700 dark:bg-stone-900 dark:text-stone-200">
            {state.page.bodyMd}
          </pre>
        </article>
      )}
    </AppShell>
  );
}
