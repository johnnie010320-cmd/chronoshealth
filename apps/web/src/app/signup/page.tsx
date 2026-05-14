'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { SignupForm } from '@/features/identity/SignupForm';
import { useI18n } from '@/lib/i18n';
import { readSession } from '@/lib/session';

export default function SignupPage() {
  const { t } = useI18n();
  const router = useRouter();

  useEffect(() => {
    const s = readSession();
    if (s) router.replace('/survey');
  }, [router]);

  return (
    <AppShell
      showBack
      backHref="/"
      title={t.signup.pageTitle}
      decoration="dots"
      hideBottomNav
    >
      <div className="mt-2">
        <SignupForm />
      </div>
    </AppShell>
  );
}
