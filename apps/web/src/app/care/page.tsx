'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import {
  ChevronRightIcon,
  HeartPulseIcon,
  LeafIcon,
  ShieldIcon,
} from '@/components/HealthIcons';
import { LoginRequired } from '@/components/LoginRequired';
import { useI18n } from '@/lib/i18n';
import { readSession } from '@/lib/session';
import {
  fetchAvatarMe,
  fetchCareMe,
  fetchAiPrescription,
  type AiPrescription,
  type CareResponse,
  type CareRule,
  type CareAffiliate,
} from '@/lib/api-client';

type LoadState =
  | { status: 'loading' }
  | { status: 'unauth' }
  | { status: 'noReport' }
  | { status: 'ok'; data: CareResponse }
  | { status: 'err'; code: string };

export default function CarePage() {
  const { t, locale } = useI18n();
  const C = t.care;
  const P = C.prescription;
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [rx, setRx] = useState<AiPrescription | null>(null);
  const [rxBusy, setRxBusy] = useState(false);
  const [rxErr, setRxErr] = useState<string | null>(null);

  useEffect(() => {
    if (!readSession()) {
      setState({ status: 'unauth' });
      return;
    }
    fetchCareMe(locale)
      .then((data) => setState({ status: 'ok', data }))
      .catch((e) => {
        const code = e instanceof Error ? e.message : 'generic';
        if (code === 'NO_REPORT') setState({ status: 'noReport' });
        else if (code === 'UNAUTHORIZED') setState({ status: 'unauth' });
        else setState({ status: 'err', code });
      });
  }, [locale]);

  return (
    <AppShell title={C.pageTitle} decoration="dots">
      {state.status === 'loading' && (
        <div className="mt-10 flex justify-center">
          <span className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-stone-300 border-t-brand-700 dark:border-stone-700 dark:border-t-brand-400" />
        </div>
      )}

      {state.status === 'unauth' && <LoginRequired />}

      {state.status === 'noReport' && (
        <section className="card-shadow mt-6 rounded-3xl bg-white p-8 text-center dark:bg-stone-900">
          <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand-700 dark:bg-brand-900 dark:text-brand-200">
            <HeartPulseIcon className="h-7 w-7" />
          </span>
          <h1 className="mt-4 text-xl font-bold text-stone-900 dark:text-stone-100">
            {C.noReportTitle}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-stone-600 dark:text-stone-400">
            {C.noReportBody}
          </p>
          <Link
            href="/survey"
            className="mt-6 inline-flex items-center gap-1 rounded-2xl bg-stone-900 px-5 py-3 text-sm font-semibold text-white transition active:scale-[0.98] dark:bg-white dark:text-stone-900"
          >
            <span>{C.noReportCta}</span>
            <ChevronRightIcon className="h-4 w-4" />
          </Link>
        </section>
      )}

      {state.status === 'err' && (
        <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-100">
          {C.errorGeneric}
        </div>
      )}

      {state.status === 'ok' && (
        <div className="space-y-5 pb-10 pt-4">
          <ContextCard data={state.data} />

          <PrescriptionCard
            rx={rx}
            busy={rxBusy}
            err={rxErr}
            onRequest={async () => {
              setRxBusy(true);
              setRxErr(null);
              try {
                let avatar = null;
                try { avatar = await fetchAvatarMe(); } catch { /* avatar 없을 수 있음 */ }
                const body: Parameters<typeof fetchAiPrescription>[0] = { locale };
                if (avatar) {
                  body.bioAge = avatar.fiveAges.life;
                  body.youthAge = avatar.fiveAges.vitality;
                  body.chronologicalAge = avatar.chronologicalAge;
                }
                const result = await fetchAiPrescription(body);
                setRx(result);
              } catch (e) {
                setRxErr(e instanceof Error ? e.message : 'generic');
              } finally {
                setRxBusy(false);
              }
            }}
            labels={P}
          />

          <CategorySection
            Icon={LeafIcon}
            sectionTitle={C.dietSectionTitle}
            rules={state.data.diet.rules}
            affiliates={state.data.diet.affiliates}
          />

          <CategorySection
            Icon={HeartPulseIcon}
            sectionTitle={C.exerciseSectionTitle}
            rules={state.data.exercise.rules}
            affiliates={state.data.exercise.affiliates}
          />

          <CategorySection
            Icon={ShieldIcon}
            sectionTitle={C.medicalSectionTitle}
            rules={state.data.medical.rules}
            affiliates={state.data.medical.affiliates}
          />

          <div className="rounded-2xl border border-stone-200/70 bg-white/70 px-4 py-3 text-[11px] leading-relaxed text-stone-600 dark:border-stone-800 dark:bg-stone-900/60 dark:text-stone-400">
            {C.disclaimer}
          </div>
        </div>
      )}
    </AppShell>
  );
}

function ContextCard({ data }: { data: CareResponse }) {
  const { t } = useI18n();
  const C = t.care;
  const { context } = data;
  return (
    <section className="card-shadow rounded-2xl bg-gradient-to-br from-brand-700 via-teal-600 to-emerald-500 px-5 py-4 text-white">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] opacity-90">
        {C.contextTitle}
      </p>
      <ul className="mt-3 grid grid-cols-3 gap-y-2 text-[12px]">
        <Stat label={C.contextBmi} value={context.bmi != null ? `${context.bmi}` : '—'} />
        <Stat label={C.contextAge} value={`${context.age}${C.yearsUnit}`} />
        <Stat
          label={C.contextExercise}
          value={`${context.exerciseMinutesPerWeek}${C.minutesUnit}`}
        />
        <Stat
          label={C.contextSleep}
          value={`${context.sleepHoursPerNight.toFixed(1)}${C.hoursUnit}`}
        />
        <Stat label={C.contextSmoking} value={C.smokingMap[context.smoking]} />
        <Stat label={C.contextStress} value={C.stressMap[context.stressLevel]} />
      </ul>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex flex-col">
      <span className="text-[10px] uppercase tracking-wider opacity-70">{label}</span>
      <span className="mt-0.5 text-sm font-semibold tabular-nums">{value}</span>
    </li>
  );
}

function CategorySection({
  Icon,
  sectionTitle,
  rules,
  affiliates,
}: {
  Icon: (p: { className?: string }) => React.ReactElement;
  sectionTitle: string;
  rules: CareRule[];
  affiliates: CareAffiliate[];
}) {
  const { t } = useI18n();
  const C = t.care;
  return (
    <section>
      <div className="mb-2 flex items-center gap-2 px-1">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-brand-50 text-brand-700 dark:bg-brand-900 dark:text-brand-200">
          <Icon className="h-3.5 w-3.5" />
        </span>
        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400">
          {sectionTitle}
        </h2>
      </div>

      {rules.length > 0 && (
        <ul className="card-shadow divide-y divide-stone-100 overflow-hidden rounded-2xl bg-white dark:divide-stone-800 dark:bg-stone-900">
          {rules.map((rule) => {
            const text = (C.rules as Record<string, string>)[rule.ruleId] ?? rule.ruleId;
            const severityLabel = C.severityLabels[rule.severity];
            const severityClass = SEVERITY_CLASS[rule.severity];
            return (
              <li key={rule.ruleId} className="flex items-start gap-3 px-4 py-3">
                <span
                  className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${severityClass}`}
                >
                  {severityLabel}
                </span>
                <p className="text-[13px] leading-relaxed text-stone-700 dark:text-stone-200">
                  {text}
                </p>
              </li>
            );
          })}
        </ul>
      )}

      {affiliates.length > 0 && (
        <>
          <p className="mt-3 px-1 text-[10px] font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400">
            {C.affiliatesLabel}
          </p>
          <ul className="mt-2 space-y-2">
            {affiliates.map((a) => (
              <li key={a.slug}>
                <a
                  href={a.ctaUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="card-shadow flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 transition active:scale-[0.99] dark:bg-stone-900"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[10px] font-semibold uppercase tracking-wider text-brand-700 dark:text-brand-300">
                      {a.partner}
                    </p>
                    <p className="text-[13px] font-semibold text-stone-900 dark:text-stone-100">
                      {a.title}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-stone-600 dark:text-stone-400">
                      {a.body}
                    </p>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold text-brand-700 dark:text-brand-300">
                    {a.ctaLabel}
                    <ChevronRightIcon className="h-3 w-3" />
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

const SEVERITY_CLASS: Record<CareRule['severity'], string> = {
  info: 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300',
  recommend: 'bg-brand-50 text-brand-700 dark:bg-brand-900 dark:text-brand-200',
  attention: 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-200',
};

function PrescriptionCard({
  rx,
  busy,
  err,
  onRequest,
  labels,
}: {
  rx: AiPrescription | null;
  busy: boolean;
  err: string | null;
  onRequest: () => Promise<void> | void;
  labels: {
    sectionTitle: string;
    sectionHint: string;
    requestCta: string;
    requesting: string;
    dietTitle: string;
    exerciseTitle: string;
    restTitle: string;
    note: string;
    errGeneric: string;
  };
}) {
  return (
    <section className="card-shadow rounded-2xl bg-gradient-to-br from-rose-50 to-amber-50 px-4 py-4 dark:from-rose-950/30 dark:to-amber-950/30">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100">
          {labels.sectionTitle}
        </h2>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400">
          AI
        </span>
      </div>
      <p className="mt-1 text-[11px] leading-relaxed text-stone-600 dark:text-stone-400">
        {labels.sectionHint}
      </p>
      {!rx && (
        <button
          type="button"
          onClick={() => void onRequest()}
          disabled={busy}
          className="mt-3 w-full rounded-xl bg-stone-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60 dark:bg-white dark:text-stone-900"
        >
          {busy ? labels.requesting : labels.requestCta}
        </button>
      )}
      {err && (
        <p className="mt-2 text-[11px] text-rose-700 dark:text-rose-300">
          {labels.errGeneric}
        </p>
      )}
      {rx && (
        <div className="mt-3 space-y-3">
          <p className="rounded-xl bg-white/70 px-3 py-2 text-[12px] leading-relaxed text-stone-800 dark:bg-stone-900/50 dark:text-stone-100">
            {rx.summary}
          </p>
          <RxList title={labels.dietTitle} items={rx.diet} />
          <RxList title={labels.exerciseTitle} items={rx.exercise} />
          <RxList title={labels.restTitle} items={rx.rest} />
          <p className="text-[10px] text-stone-500 dark:text-stone-400">{labels.note}</p>
        </div>
      )}
    </section>
  );
}

function RxList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400">
        {title}
      </p>
      <ul className="mt-1 space-y-1">
        {items.map((s, i) => (
          <li key={i} className="flex items-start gap-2 text-[12px] text-stone-800 dark:text-stone-200">
            <span aria-hidden className="mt-1.5 inline-block h-1 w-1 shrink-0 rounded-full bg-brand-600" />
            <span>{s}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
