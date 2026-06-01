'use client';

import { ContentPageView } from '@/components/ContentPageView';
import { useI18n } from '@/lib/i18n';

export default function PrivacyPage() {
  const { t } = useI18n();
  return <ContentPageView slug="privacy" fallbackTitle={t.contentPages.privacyTitle} />;
}
