'use client';

import { AppShell } from '@/components/AppShell';
import { ComingSoon } from '@/components/ComingSoon';
import { useI18n } from '@/lib/i18n';

export default function StatsPage() {
  const { t } = useI18n();
  return (
    <AppShell title={t.nav.stats} decoration="dots">
      <ComingSoon />
    </AppShell>
  );
}
