'use client';

import { ContentPageView } from '@/components/ContentPageView';
import { useI18n } from '@/lib/i18n';

export default function TermsPage() {
  const { t } = useI18n();
  return <ContentPageView slug="terms" fallbackTitle={t.contentPages.termsTitle} />;
}
