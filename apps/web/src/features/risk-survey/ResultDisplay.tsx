'use client';

import { PulseBackground } from '@/components/PulseBackground';
import {
  AlertIcon,
  HeartPulseIcon,
  LeafIcon,
} from '@/components/HealthIcons';
import { useI18n } from '@/lib/i18n';
import type { RiskSurveyResponse } from '@/lib/schemas';

type Props = {
  data: RiskSurveyResponse;
  onReset: () => void;
};

const CATEGORY_CLASSES: Record<'low' | 'moderate' | 'high', string> = {
  low: 'bg-emerald-50 text-emerald-900 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-100 dark:border-emerald-900',
  moderate:
    'bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950/40 dark:text-amber-100 dark:border-amber-900',
  high: 'bg-rose-50 text-rose-900 border-rose-200 dark:bg-rose-950/40 dark:text-rose-100 dark:border-rose-900',
};

export function ResultDisplay({ data, onReset }: Props) {
  const { t, locale } = useI18n();
  const R = t.result;
  const hasHotlines =
    !!data.hotlines.suicidePrevention || !!data.hotlines.mentalHealthCrisis;

  return (
    <div className="space-y-5 pb-28">
      {hasHotlines && <HotlinesBanner hotlines={data.hotlines} />}

      <BioAgeHero bio={data.bioAge} generatedAt={data.generatedAt} locale={locale} />

      <Section title={R.diseaseRiskTitle}>
        {data.diseaseRisk.length === 0 ? (
          <Empty>{R.diseaseRiskEmpty}</Empty>
        ) : (
          <div className="grid grid-cols-1 gap-2.5">
            {data.diseaseRisk.map((r) => (
              <DiseaseRiskCard key={r.code} risk={r} />
            ))}
          </div>
        )}
      </Section>

      <Section
        title={R.improvementTitle}
        icon={<LeafIcon className="h-4 w-4" />}
      >
        {data.improvement.length === 0 ? (
          <Empty>{R.improvementEmpty}</Empty>
        ) : (
          <div className="space-y-2">
            {data.improvement.map((i, idx) => (
              <ImprovementCard key={idx} improvement={i} />
            ))}
          </div>
        )}
      </Section>

      <div className="rounded-2xl border border-stone-200 bg-white/80 p-4 backdrop-blur dark:border-stone-800 dark:bg-stone-900/70">
        <p className="text-[12px] leading-relaxed text-stone-600 dark:text-stone-400">
          {data.disclaimer}
        </p>
        <p className="mt-2 text-[10px] text-stone-400 dark:text-stone-500">
          {R.modelLabel}: {data.modelVersion} · {R.reportIdLabel}{' '}
          {data.reportId.slice(0, 8)}
        </p>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-md border-t border-stone-200/60 bg-white/80 px-5 pt-3 pb-5 backdrop-blur-md dark:border-stone-800/60 dark:bg-stone-950/80">
        <button
          type="button"
          onClick={onReset}
          className="inline-flex w-full items-center justify-center rounded-2xl border border-stone-300 bg-white px-6 py-4 text-base font-semibold text-stone-900 transition active:scale-[0.98] dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
        >
          {R.resetCta}
        </button>
      </div>
    </div>
  );
}

function BioAgeHero({
  bio,
  generatedAt,
  locale,
}: {
  bio: RiskSurveyResponse['bioAge'];
  generatedAt: string;
  locale: string;
}) {
  const { t } = useI18n();
  const R = t.result;
  const diff = bio.value - bio.chronologicalAge;
  const tone =
    diff <= 0
      ? 'text-emerald-100'
      : diff <= 3
        ? 'text-amber-100'
        : 'text-rose-100';

  const intlLocale =
    locale === 'ko' ? 'ko-KR' : locale === 'ja' ? 'ja-JP' : locale === 'es' ? 'es-ES' : 'en-US';

  return (
    <section className="card-shadow relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-800 via-brand-700 to-teal-600 px-6 py-7 text-white">
      <PulseBackground variant="bottom" />
      <div className="relative">
        <div className="flex items-center gap-2 text-white/80">
          <HeartPulseIcon className="h-4 w-4" />
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em]">
            {R.bioAgeEyebrow}
          </p>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-6xl font-bold leading-none tracking-tight">
            {bio.value}
          </span>
          <span className="text-sm text-white/70">{R.bioAgeUnit}</span>
        </div>
        <p className={`mt-2 text-sm font-medium ${tone}`}>
          {R.bioAgeDiffPrefix} {bio.chronologicalAge}
          {R.bioAgeDiffSuffix} {diff >= 0 ? '+' : ''}
          {diff} {R.bioAgeYearSuffix}
        </p>
        <p className="mt-1 text-[11px] text-white/60">
          {R.bioAgeCi} {bio.ci95[0]} ~ {bio.ci95[1]} {R.bioAgeUnit} ·{' '}
          {new Date(generatedAt).toLocaleString(intlLocale, {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>

        {bio.topContributors.length > 0 && (
          <div className="mt-4 border-t border-white/15 pt-4">
            <p className="mb-2 text-[11px] uppercase tracking-widest text-white/70">
              {R.contributorsTitle}
            </p>
            <ul className="space-y-1.5 text-sm">
              {bio.topContributors.map((c, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span
                    className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-xs ${
                      c.direction === 'accelerate'
                        ? 'bg-rose-400/20 text-rose-100'
                        : 'bg-emerald-400/20 text-emerald-100'
                    }`}
                  >
                    {c.direction === 'accelerate' ? '↑' : '↓'}
                  </span>
                  <span>{c.factor}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}

function DiseaseRiskCard({
  risk,
}: {
  risk: RiskSurveyResponse['diseaseRisk'][number];
}) {
  const { t } = useI18n();
  const R = t.result;
  const pct = (risk.probability5y * 100).toFixed(1);
  return (
    <div
      className={`rounded-2xl border p-4 ${CATEGORY_CLASSES[risk.riskCategory]}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-widest opacity-70">
            {risk.code}
          </p>
          <p className="mt-0.5 text-sm font-semibold">{risk.label}</p>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold leading-none">{pct}%</p>
          <p className="mt-0.5 text-[10px] uppercase tracking-widest opacity-70">
            {R.diseaseRiskCategory[risk.riskCategory]} · {R.diseaseRisk5yLabel}
          </p>
        </div>
      </div>
      {risk.modifiableFactors.length > 0 && (
        <p className="mt-2 text-[11px] opacity-80">
          {R.improvementFactorPrefix}: {risk.modifiableFactors.join(', ')}
        </p>
      )}
    </div>
  );
}

function ImprovementCard({
  improvement,
}: {
  improvement: RiskSurveyResponse['improvement'][number];
}) {
  const { t } = useI18n();
  const R = t.result;
  return (
    <div className="card-shadow flex items-start justify-between gap-3 rounded-2xl bg-white p-4 dark:bg-stone-900">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">
          {improvement.action}
        </p>
        <p className="mt-0.5 text-[11px] text-stone-500">
          {R.improvementConfidence} {improvement.confidence}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
          {improvement.expectedBioAgeDeltaYears >= 0 ? '+' : ''}
          {improvement.expectedBioAgeDeltaYears.toFixed(1)} {R.bioAgeYearSuffix}
        </p>
        <p className="text-[10px] uppercase tracking-widest text-stone-400">
          {R.improvementBioAgeUnit}
        </p>
      </div>
    </div>
  );
}

function HotlinesBanner({
  hotlines,
}: {
  hotlines: RiskSurveyResponse['hotlines'];
}) {
  const { t } = useI18n();
  const H = t.result.hotlines;
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-2xl border border-rose-300 bg-rose-50 p-4 text-rose-900 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-100"
    >
      <AlertIcon className="mt-0.5 h-5 w-5 shrink-0" />
      <div className="min-w-0">
        <p className="text-sm font-semibold">{H.title}</p>
        <ul className="mt-1.5 space-y-0.5 text-sm">
          {hotlines.suicidePrevention && (
            <li>
              {H.suicide}: <strong>{hotlines.suicidePrevention}</strong>
            </li>
          )}
          {hotlines.mentalHealthCrisis && (
            <li>
              {H.mentalHealth}: <strong>{hotlines.mentalHealthCrisis}</strong>
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-2 flex items-center gap-1.5 px-1">
        {icon && (
          <span className="text-stone-500 dark:text-stone-400">{icon}</span>
        )}
        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400">
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-2xl border border-dashed border-stone-200 p-4 text-center text-[12px] italic text-stone-500 dark:border-stone-800">
      {children}
    </p>
  );
}
