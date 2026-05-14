'use client';

import { useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { SurveyForm } from '@/features/risk-survey/SurveyForm';
import { ResultDisplay } from '@/features/risk-survey/ResultDisplay';
import { useI18n } from '@/lib/i18n';
import type { RiskSurveyResponse } from '@/lib/schemas';

export default function SurveyPage() {
  const { t } = useI18n();
  const [result, setResult] = useState<RiskSurveyResponse | null>(null);

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
