'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { LoginForm } from '@/features/identity/LoginForm';
import { useI18n } from '@/lib/i18n';
import { readSession } from '@/lib/session';

export default function LoginPage() {
  const { t } = useI18n();
  const router = useRouter();

  useEffect(() => {
    if (readSession()) router.replace('/');
  }, [router]);

  return (
    <AppShell
      showBack
      backHref="/"
      title={t.login.pageTitle}
      decoration="dots"
      hideBottomNav
    >
      <div className="mt-2 pb-8">
        <LoginForm />
      </div>
    </AppShell>
  );
}
