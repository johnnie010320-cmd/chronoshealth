'use client';

import { useState } from 'react';
import Link from 'next/link';
import { SurveyForm } from '@/features/risk-survey/SurveyForm';
import { ResultDisplay } from '@/features/risk-survey/ResultDisplay';
import type { RiskSurveyResponse } from '@/lib/schemas';

export default function SurveyPage() {
  const [result, setResult] = useState<RiskSurveyResponse | null>(null);

  return (
    <main className="min-h-screen px-4 py-8 md:py-12">
      <div className="max-w-3xl mx-auto">
        <header className="mb-8">
          <Link
            href="/"
            className="text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white"
          >
            ← Chronos Health
          </Link>
        </header>

        {result ? (
          <ResultDisplay data={result} onReset={() => setResult(null)} />
        ) : (
          <SurveyForm onSuccess={setResult} />
        )}
      </div>
    </main>
  );
}
