'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { SurveyForm } from '@/features/risk-survey/SurveyForm';
import { ResultDisplay } from '@/features/risk-survey/ResultDisplay';
import { useI18n } from '@/lib/i18n';
import { readSession } from '@/lib/session';
import type { RiskSurveyResponse } from '@/lib/schemas';

export default function SurveyPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [result, setResult] = useState<RiskSurveyResponse | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (readSession()) {
      setReady(true);
    } else {
      router.replace('/signup');
    }
  }, [router]);

  if (!ready) return null;

  return (
    <AppShell
      showBack
      backHref="/"
      title={result ? t.result.pageTitle : t.survey.pageTitle}
      decoration="dots"
    >
      <div className="mt-2">
        {result ? (
          <ResultDisplay data={result} onReset={() => setResult(null)} />
        ) : (
          <SurveyForm onSuccess={setResult} />
        )}
      </div>
    </AppShell>
  );
}
