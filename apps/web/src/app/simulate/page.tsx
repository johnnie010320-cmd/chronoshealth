'use client';

// What-if 시뮬레이터 직접 진입 — 저장된 마지막 설문 입력을 base 로 불러와
// 설문 재제출 없이 바로 습관 조정 시뮬레이션. 저장 입력이 없으면 설문으로 유도.
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { LoginRequired } from '@/components/LoginRequired';
import { WhatIfPanel } from '@/components/result/WhatIfPanel';
import { ChevronRightIcon, ActivityIcon } from '@/components/HealthIcons';
import { useI18n } from '@/lib/i18n';
import { readSession } from '@/lib/session';
import { fetchLastSurveyInput } from '@/lib/api-client';
import type { RiskSurveyRequest } from '@/lib/schemas';

type State =
  | { status: 'loading' }
  | { status: 'unauth' }
  | { status: 'noInput' }
  | { status: 'ok'; base: RiskSurveyRequest }
  | { status: 'err' };

export default function SimulatePage() {
  const { t } = useI18n();
  const M = t.simulate;
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    if (!readSession()) {
      setState({ status: 'unauth' });
      return;
    }
    fetchLastSurveyInput()
      .then((input) =>
        setState(input ? { status: 'ok', base: input } : { status: 'noInput' }),
      )
      .catch(() => setState({ status: 'err' }));
  }, []);

  return (
    <AppShell title={M.pageTitle} showBack backHref="/reports" decoration="dots">
      {state.status === 'loading' && (
        <div className="mt-10 flex justify-center">
          <span className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-stone-300 border-t-brand-700 dark:border-stone-700 dark:border-t-brand-400" />
        </div>
      )}

      {state.status === 'unauth' && <LoginRequired />}

      {(state.status === 'noInput' || state.status === 'err') && (
        <section className="card-shadow mt-6 rounded-3xl card-violet p-8 text-center">
          <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand-700 dark:bg-brand-900 dark:text-brand-200">
            <ActivityIcon className="h-7 w-7" />
          </span>
          <h1 className="mt-4 text-xl font-bold text-stone-900 dark:text-stone-100">
            {M.noInputTitle}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-stone-600 dark:text-stone-400">
            {M.noInputBody}
          </p>
          <Link
            href="/survey"
            className="mt-6 inline-flex items-center gap-1 rounded-2xl bg-stone-900 px-5 py-3 text-sm font-semibold text-white transition active:scale-[0.98] dark:bg-white dark:text-stone-900"
          >
            <span>{M.noInputCta}</span>
            <ChevronRightIcon className="h-4 w-4" />
          </Link>
        </section>
      )}

      {state.status === 'ok' && (
        <div className="space-y-4 pb-10 pt-4">
          <p className="px-1 text-[13px] leading-relaxed text-stone-600 dark:text-stone-400">
            {M.intro}
          </p>
          <WhatIfPanel base={state.base} />
          <Link
            href="/survey"
            className="block text-center text-[12px] font-semibold text-brand-700 dark:text-brand-300"
          >
            {M.retakeCta}
          </Link>
        </div>
      )}
    </AppShell>
  );
}
