'use client';

// 관리자 — 설문 기본정보 집계(나이대·성별). 개인정보 완전 배제, 집계값만.
import { useEffect, useState } from 'react';
import { AdminShell } from '@/components/admin/AdminShell';
import { useI18n } from '@/lib/i18n';
import { fetchAdminSurveyStats, type AdminSurveyStatRow } from '@/lib/api-client';

type Loaded =
  | { status: 'loading' }
  | { status: 'ok'; rows: AdminSurveyStatRow[] }
  | { status: 'err'; code: string };

const BUCKET_ORDER = ['<20', '20s', '30s', '40s', '50s', '60s', '70+'];

export default function AdminSurveyStatsPage() {
  const { t } = useI18n();
  const A = t.admin;
  const V = A.surveyStats;
  const [state, setState] = useState<Loaded>({ status: 'loading' });

  useEffect(() => {
    fetchAdminSurveyStats()
      .then((rows) => setState({ status: 'ok', rows }))
      .catch((e) => setState({ status: 'err', code: e instanceof Error ? e.message : 'generic' }));
  }, []);

  const rows = state.status === 'ok' ? state.rows : [];
  const total = rows.reduce((s, r) => s + r.n, 0);
  const sorted = [...rows].sort((a, b) => {
    const ai = BUCKET_ORDER.indexOf(a.ageBucket);
    const bi = BUCKET_ORDER.indexOf(b.ageBucket);
    return ai !== bi ? ai - bi : a.sex.localeCompare(b.sex);
  });

  const pct = (v: number, n: number) => (n > 0 ? Math.round((v / n) * 100) : 0);
  const sexLabel = (sex: string) =>
    sex === 'male' ? V.sex.male : sex === 'female' ? V.sex.female : V.sex.other;

  return (
    <AdminShell title={V.title}>
      <p className="mt-2 px-1 text-[12px] leading-relaxed text-stone-500 dark:text-stone-400">
        {V.intro}
      </p>

      {state.status === 'loading' && (
        <div className="mt-8 flex justify-center">
          <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-stone-300 border-t-brand-600" />
        </div>
      )}

      {state.status === 'err' && (
        <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-100">
          {A.error[state.code as keyof typeof A.error] ?? A.error.generic}
        </div>
      )}

      {state.status === 'ok' && (
        <>
          <div className="mt-3 rounded-2xl bg-brand-50 px-4 py-3 dark:bg-brand-900/30">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-brand-700 dark:text-brand-200">
              {V.totalLabel}
            </span>
            <p className="text-2xl font-bold tabular-nums text-stone-900 dark:text-stone-100">
              {total.toLocaleString()}
            </p>
          </div>

          {sorted.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-stone-200/70 bg-white/70 px-4 py-6 text-center text-[13px] text-stone-500 dark:border-stone-800 dark:bg-stone-900/60 dark:text-stone-400">
              {V.empty}
            </div>
          ) : (
            <div className="mt-3 grid grid-cols-1 gap-3">
              {sorted.map((r) => (
                <div
                  key={`${r.ageBucket}-${r.sex}`}
                  className="card-shadow rounded-2xl bg-white px-4 py-3 dark:bg-stone-900"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-stone-900 dark:text-stone-100">
                      {r.ageBucket} · {sexLabel(r.sex)}
                    </p>
                    <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-stone-600 dark:bg-stone-800 dark:text-stone-300">
                      n={r.n}
                    </span>
                  </div>
                  <dl className="mt-2 space-y-1 text-[12px]">
                    <Row label={V.bmi} value={r.avgBmi ?? '—'} />
                    <Row
                      label={V.smoking}
                      value={`${pct(r.smokingNever, r.n)} / ${pct(r.smokingFormer, r.n)} / ${pct(r.smokingCurrent, r.n)}%`}
                    />
                    <Row label={V.alcohol} value={r.avgAlcohol ?? '—'} />
                    <Row label={V.exercise} value={r.avgExercise ?? '—'} />
                    <Row label={V.sleep} value={r.avgSleep ?? '—'} />
                    <Row
                      label={V.family}
                      value={`${pct(r.famDiabetes, r.n)} / ${pct(r.famHypertension, r.n)} / ${pct(r.famCardio, r.n)}%`}
                    />
                  </dl>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <div className="mt-4 rounded-2xl border border-stone-200/70 bg-white/70 px-4 py-3 text-[11px] leading-relaxed text-stone-500 dark:border-stone-800 dark:bg-stone-900/60 dark:text-stone-400">
        {V.disclaimer}
      </div>
    </AdminShell>
  );
}

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-stone-500 dark:text-stone-400">{label}</dt>
      <dd className="font-semibold tabular-nums text-stone-800 dark:text-stone-100">{value}</dd>
    </div>
  );
}
