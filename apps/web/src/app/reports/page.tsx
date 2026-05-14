'use client';

import { AppShell } from '@/components/AppShell';
import { ComingSoon } from '@/components/ComingSoon';
import { useI18n } from '@/lib/i18n';

export default function ReportsPage() {
  const { t } = useI18n();
  return (
    <AppShell title={t.nav.reports} decoration="dots">
      <ComingSoon />
    </AppShell>
  );
}
