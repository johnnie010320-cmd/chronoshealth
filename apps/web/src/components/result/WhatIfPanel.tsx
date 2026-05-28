'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { RiskSurveyRequest } from '@/lib/schemas';
import {
  submitSimulate,
  type SimulateOverrides,
  type SimulateResponse,
} from '@/lib/api-client';
import { useI18n } from '@/lib/i18n';
import { LeafIcon } from '@/components/HealthIcons';

type Props = {
  base: RiskSurveyRequest;
};

const DEBOUNCE_MS = 350;

export function WhatIfPanel({ base }: Props) {
  const { t } = useI18n();
  const W = t.result.whatif;

  const [overrides, setOverrides] = useState<SimulateOverrides>({});
  const [data, setData] = useState<SimulateResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);

  const isEmpty = Object.keys(overrides).length === 0;

  const fire = useCallback(
    (next: SimulateOverrides) => {
      if (Object.keys(next).length === 0) {
        setData(null);
        setErrorCode(null);
        return;
      }
      setLoading(true);
      setErrorCode(null);
      submitSimulate(base, next)
        .then((res) => setData(res))
        .catch((e) => {
          const code = e instanceof Error ? e.message : 'generic';
          setErrorCode(code);
        })
        .finally(() => setLoading(false));
    },
    [base],
  );

  useEffect(() => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => fire(overrides), DEBOUNCE_MS);
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [overrides, fire]);

  const set = <K extends keyof SimulateOverrides>(
    k: K,
    v: SimulateOverrides[K] | undefined,
  ) => {
    setOverrides((prev) => {
      const next = { ...prev };
      if (v === undefined) {
        delete next[k];
      } else {
        (next as Record<string, unknown>)[k as string] = v;
      }
      return next;
    });
  };

  const reset = () => setOverrides({});

  return (
    <section className="card-shadow rounded-3xl bg-gradient-to-br from-brand-50 to-teal-50 p-5 dark:from-brand-950 dark:to-teal-950">
      <div className="flex items-center gap-2">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-brand-700 text-white dark:bg-brand-500">
          <LeafIcon className="h-4 w-4" />
        </span>
        <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
          {W.title}
        </h3>
      </div>
      <p className="mt-2 text-[12px] leading-relaxed text-stone-700 dark:text-stone-300">
        {W.body}
      </p>

      <div className="mt-4 space-y-3">
        <NumberRow
          label={W.labels.exerciseMinutesPerWeek}
          baseValue={base.exerciseMinutesPerWeek}
          unit="min"
          min={0}
          max={1000}
          step={30}
          value={overrides.exerciseMinutesPerWeek}
          onChange={(v) => set('exerciseMinutesPerWeek', v)}
        />
        <NumberRow
          label={W.labels.sleepHoursPerNight}
          baseValue={base.sleepHoursPerNight}
          unit="h"
          min={3}
          max={12}
          step={0.5}
          value={overrides.sleepHoursPerNight}
          onChange={(v) => set('sleepHoursPerNight', v)}
        />
        <NumberRow
          label={W.labels.alcoholDrinksPerWeek}
          baseValue={base.alcoholDrinksPerWeek}
          unit=""
          min={0}
          max={50}
          step={1}
          value={overrides.alcoholDrinksPerWeek}
          onChange={(v) => set('alcoholDrinksPerWeek', v)}
        />
        <NumberRow
          label={W.labels.weightKg}
          baseValue={base.weightKg}
          unit="kg"
          min={Math.max(35, base.weightKg - 15)}
          max={Math.min(200, base.weightKg + 15)}
          step={0.5}
          value={overrides.weightKg}
          onChange={(v) => set('weightKg', v)}
        />
        <EnumRow
          label={W.labels.smoking}
          baseValue={base.smoking}
          value={overrides.smoking}
          options={[
            { v: 'never', label: W.smokingOptions.never },
            { v: 'former', label: W.smokingOptions.former },
            { v: 'current', label: W.smokingOptions.current },
          ]}
          onChange={(v) => set('smoking', v as SimulateOverrides['smoking'])}
        />
        <EnumRow
          label={W.labels.stressLevel}
          baseValue={base.stressLevel}
          value={overrides.stressLevel}
          options={[
            { v: 'low', label: W.stressOptions.low },
            { v: 'medium', label: W.stressOptions.medium },
            { v: 'high', label: W.stressOptions.high },
          ]}
          onChange={(v) => set('stressLevel', v as SimulateOverrides['stressLevel'])}
        />
      </div>

      {!isEmpty && (
        <button
          type="button"
          onClick={reset}
          className="mt-3 text-[11px] font-medium text-brand-700 underline-offset-2 hover:underline dark:text-brand-300"
        >
          {W.reset}
        </button>
      )}

      {loading && (
        <p className="mt-4 text-[12px] text-stone-500 dark:text-stone-400">
          {W.submitting}
        </p>
      )}

      {errorCode === 'SMOKING_REGRESSION' && (
        <p className="mt-4 text-[12px] text-rose-700 dark:text-rose-300">
          {W.errSmokingRegression}
        </p>
      )}

      {data && !loading && (
        <div className="mt-4 grid grid-cols-2 gap-2">
          <DeltaTile
            label={W.deltaBioAge}
            delta={data.delta.bioAgeYears}
            unit="y"
            betterIsNegative
          />
          <DeltaTile
            label={W.deltaPyr}
            delta={data.delta.predictedYearsRemaining.median}
            unit="y"
            betterIsNegative={false}
          />
        </div>
      )}

      <p className="mt-4 text-[10px] leading-relaxed text-stone-500 dark:text-stone-400">
        {W.disclaimer}
      </p>
    </section>
  );
}

function NumberRow({
  label,
  baseValue,
  value,
  unit,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  baseValue: number;
  value: number | undefined;
  unit: string;
  min: number;
  max: number;
  step: number;
  onChange: (v: number | undefined) => void;
}) {
  const current = value ?? baseValue;
  const changed = value !== undefined && value !== baseValue;
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[12px] font-medium text-stone-700 dark:text-stone-300">
          {label}
        </span>
        <span
          className={`text-[12px] tabular-nums ${
            changed
              ? 'font-semibold text-brand-700 dark:text-brand-300'
              : 'text-stone-500 dark:text-stone-400'
          }`}
        >
          {current} {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={current}
        onChange={(e) => {
          const v = Number(e.target.value);
          onChange(v === baseValue ? undefined : v);
        }}
        className="mt-1 w-full accent-brand-700 dark:accent-brand-400"
      />
    </div>
  );
}

function EnumRow({
  label,
  baseValue,
  value,
  options,
  onChange,
}: {
  label: string;
  baseValue: string;
  value: string | undefined;
  options: { v: string; label: string }[];
  onChange: (v: string | undefined) => void;
}) {
  const current = value ?? baseValue;
  return (
    <div>
      <p className="text-[12px] font-medium text-stone-700 dark:text-stone-300">
        {label}
      </p>
      <div className="mt-1 flex flex-wrap gap-1.5">
        {options.map((o) => {
          const active = current === o.v;
          return (
            <button
              key={o.v}
              type="button"
              onClick={() => onChange(o.v === baseValue ? undefined : o.v)}
              aria-pressed={active}
              className={`rounded-full border px-3 py-1 text-[11px] font-medium transition ${
                active
                  ? 'border-brand-700 bg-brand-700 text-white dark:border-brand-500 dark:bg-brand-500'
                  : 'border-stone-300 bg-white/70 text-stone-700 dark:border-stone-700 dark:bg-stone-900/60 dark:text-stone-200'
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DeltaTile({
  label,
  delta,
  unit,
  betterIsNegative,
}: {
  label: string;
  delta: number;
  unit: string;
  betterIsNegative: boolean;
}) {
  const isSame = Math.abs(delta) < 0.05;
  const isBetter = betterIsNegative ? delta < 0 : delta > 0;
  const tone = isSame
    ? 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300'
    : isBetter
      ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100'
      : 'bg-rose-100 text-rose-900 dark:bg-rose-950/40 dark:text-rose-100';
  const sign = delta > 0 ? '+' : '';
  return (
    <div className={`rounded-2xl p-3 ${tone}`}>
      <p className="text-[10px] uppercase tracking-widest opacity-70">{label}</p>
      <p className="mt-1 text-xl font-bold tabular-nums">
        {sign}
        {delta.toFixed(1)} {unit}
      </p>
    </div>
  );
}
