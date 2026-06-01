'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { useI18n } from '@/lib/i18n';

export default function AvatarLegacyPage() {
  const router = useRouter();
  const { t } = useI18n();

  useEffect(() => {
    router.replace('/reports');
  }, [router]);

  return (
    <AppShell title={t.reports.pageTitle} decoration="dots">
      <div className="mt-10 flex justify-center">
        <span className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-stone-300 border-t-brand-700 dark:border-stone-700 dark:border-t-brand-400" />
      </div>
    </AppShell>
  );
}
