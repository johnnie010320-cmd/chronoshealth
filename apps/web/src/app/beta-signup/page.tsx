'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { SignupForm } from '@/components/beta/SignupForm';
import { ChevronRightIcon, LeafIcon } from '@/components/HealthIcons';
import { useI18n } from '@/lib/i18n';

export default function BetaSignupPage() {
  const { t } = useI18n();
  const F = t.betaSignup;
  const [registeredId, setRegisteredId] = useState<string | null>(null);

  return (
    <AppShell
      title={F.pageTitle}
      decoration="dots"
      showBack
      backHref="/roadmap"
    >
      {registeredId ? (
        <SuccessView
          title={F.success.title}
          body={F.success.body}
          cta={F.success.cta}
        />
      ) : (
        <>
          <section className="card-shadow mt-6 rounded-3xl bg-gradient-to-br from-brand-700 via-brand-600 to-teal-500 px-6 py-8 text-white">
            <div className="flex items-center gap-2 text-white/85">
              <LeafIcon className="h-4 w-4" />
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em]">
                Waitlist
              </p>
            </div>
            <h1 className="mt-3 text-xl font-bold leading-tight tracking-tight">
              {F.heroTitle}
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-white/90">
              {F.heroBody}
            </p>
          </section>

          <section className="mt-6">
            <SignupForm onSuccess={(id) => setRegisteredId(id)} />
          </section>
        </>
      )}
    </AppShell>
  );
}

function SuccessView({
  title,
  body,
  cta,
}: {
  title: string;
  body: string;
  cta: string;
}) {
  return (
    <section className="card-shadow mt-6 rounded-3xl bg-white p-8 text-center dark:bg-stone-900">
      <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200">
        <LeafIcon className="h-7 w-7" />
      </span>
      <h1 className="mt-4 text-xl font-bold text-stone-900 dark:text-stone-100">
        {title}
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-stone-600 dark:text-stone-400">
        {body}
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex items-center gap-1 rounded-2xl bg-stone-900 px-5 py-3 text-sm font-semibold text-white transition active:scale-[0.98] dark:bg-white dark:text-stone-900"
      >
        <span>{cta}</span>
        <ChevronRightIcon className="h-4 w-4" />
      </Link>
    </section>
  );
}
