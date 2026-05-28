'use client';

import { useState, type FormEvent } from 'react';
import { useI18n, type Locale } from '@/lib/i18n';
import { ConsentChecklist } from './ConsentChecklist';
import {
  submitBetaSignup,
  type BetaSignupRequest,
} from '@/lib/api-client';

const AGE_GROUPS_VALID = ['19-29', '30-39', '40-49', '50-59', '60+'] as const;
const AGE_OPTIONS = ['under-19', ...AGE_GROUPS_VALID] as const;
const COUNTRIES = ['KR', 'US', 'JP', 'ES', 'OTHER'] as const;
const MODULE_CODES = [
  'm1',
  'm2',
  'm3',
  'm4',
  'm5',
  'm6',
  'm7',
  'm8',
  'm9',
  'm10',
  'm11',
  'mdid',
] as const;

type AgeOption = (typeof AGE_OPTIONS)[number];
type Country = (typeof COUNTRIES)[number];
type ModuleCode = (typeof MODULE_CODES)[number];

type Props = {
  onSuccess: (id: string) => void;
};

export function SignupForm({ onSuccess }: Props) {
  const { t, locale } = useI18n();
  const F = t.betaSignup;

  const [email, setEmail] = useState('');
  const [country, setCountry] = useState<Country | ''>('');
  const [ageGroup, setAgeGroup] = useState<AgeOption | ''>('');
  const [modules, setModules] = useState<Set<ModuleCode>>(new Set());
  const [consentPii, setConsentPii] = useState(false);
  const [consentMedicalDisclaimer, setConsentMedicalDisclaimer] = useState(false);
  const [consentTokenReview, setConsentTokenReview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  const isUnderage = ageGroup === 'under-19';

  const handleConsentChange = (
    field:
      | 'consentPii'
      | 'consentMedicalDisclaimer'
      | 'consentTokenReview',
    value: boolean,
  ) => {
    if (field === 'consentPii') setConsentPii(value);
    if (field === 'consentMedicalDisclaimer')
      setConsentMedicalDisclaimer(value);
    if (field === 'consentTokenReview') setConsentTokenReview(value);
  };

  const toggleModule = (code: ModuleCode) => {
    setModules((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const validClient =
    !!email &&
    !!country &&
    !!ageGroup &&
    !isUnderage &&
    consentPii &&
    consentMedicalDisclaimer &&
    consentTokenReview;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validClient || submitting) return;
    setErrorCode(null);
    setSubmitting(true);

    const body: BetaSignupRequest = {
      email: email.trim(),
      country: country as Country,
      ageGroup: ageGroup as Exclude<AgeOption, 'under-19'>,
      interestedModules: Array.from(modules),
      locale: locale as Locale,
      consentPii,
      consentMedicalDisclaimer,
      consentTokenReview,
    };

    try {
      const result = await submitBetaSignup(body);
      onSuccess(result.id);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'generic';
      setErrorCode(msg);
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <fieldset disabled={submitting}>
        <Legend step={1} text={F.section.contact} />
        <Field label={F.fields.email.label}>
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={F.fields.email.placeholder}
            className="block w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-base text-stone-900 placeholder:text-stone-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-stone-800 dark:bg-stone-950 dark:text-stone-100 dark:placeholder:text-stone-600 dark:focus:bg-stone-900"
            required
            maxLength={254}
          />
        </Field>
      </fieldset>

      <fieldset disabled={submitting}>
        <Legend step={2} text={F.section.region} />
        <Field label={F.fields.country.label}>
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value as Country | '')}
            className="block w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-base text-stone-900 placeholder:text-stone-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-stone-800 dark:bg-stone-950 dark:text-stone-100 dark:placeholder:text-stone-600 dark:focus:bg-stone-900"
            required
          >
            <option value="">{F.fields.country.placeholder}</option>
            {COUNTRIES.map((c) => (
              <option key={c} value={c}>
                {F.fields.country.options[c]}
              </option>
            ))}
          </select>
        </Field>
        <Field label={F.fields.ageGroup.label}>
          <select
            value={ageGroup}
            onChange={(e) => setAgeGroup(e.target.value as AgeOption | '')}
            className="block w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-base text-stone-900 placeholder:text-stone-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-stone-800 dark:bg-stone-950 dark:text-stone-100 dark:placeholder:text-stone-600 dark:focus:bg-stone-900"
            required
          >
            <option value="">{F.fields.ageGroup.placeholder}</option>
            {AGE_OPTIONS.map((g) => (
              <option key={g} value={g}>
                {F.fields.ageGroup.options[g]}
              </option>
            ))}
          </select>
          {isUnderage && (
            <p className="mt-2 rounded-xl bg-rose-50 px-3 py-2 text-[12px] text-rose-800 dark:bg-rose-950/40 dark:text-rose-200">
              {F.underageNotice}
            </p>
          )}
        </Field>
      </fieldset>

      <fieldset disabled={submitting}>
        <Legend step={3} text={F.section.interests} />
        <p className="mb-2 text-[12px] text-stone-600 dark:text-stone-400">
          {F.fields.interestedModules.label}
        </p>
        <div className="flex flex-wrap gap-2">
          {MODULE_CODES.map((code) => {
            const active = modules.has(code);
            return (
              <button
                key={code}
                type="button"
                onClick={() => toggleModule(code)}
                aria-pressed={active}
                className={`rounded-full border px-3 py-1.5 text-[12px] font-medium transition ${
                  active
                    ? 'border-brand-700 bg-brand-700 text-white dark:border-brand-500 dark:bg-brand-500'
                    : 'border-stone-300 bg-white/70 text-stone-700 dark:border-stone-700 dark:bg-stone-900/60 dark:text-stone-200'
                }`}
              >
                {code === 'mdid' ? 'DID' : code.toUpperCase()}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-[11px] text-stone-500 dark:text-stone-400">
          {F.fields.interestedModules.hint}
        </p>
      </fieldset>

      <fieldset disabled={submitting}>
        <Legend step={4} text={F.section.consent} />
        <ConsentChecklist
          consentPii={consentPii}
          consentMedicalDisclaimer={consentMedicalDisclaimer}
          consentTokenReview={consentTokenReview}
          onChange={handleConsentChange}
          disabled={submitting}
        />
      </fieldset>

      {errorCode && (
        <div
          role="alert"
          className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-100"
        >
          {(F.error as Record<string, string>)[errorCode] ?? F.error.generic}
        </div>
      )}

      <button
        type="submit"
        disabled={!validClient || submitting}
        className="inline-flex w-full items-center justify-center rounded-2xl bg-stone-900 px-6 py-4 text-base font-semibold text-white transition active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-stone-300 disabled:text-stone-500 dark:bg-white dark:text-stone-900 dark:disabled:bg-stone-800 dark:disabled:text-stone-500"
      >
        {submitting ? F.submitting : F.submit}
      </button>

      <p className="text-center text-[11px] text-stone-500 dark:text-stone-400">
        {F.bottomNote}
      </p>
    </form>
  );
}

function Legend({ step, text }: { step: number; text: string }) {
  return (
    <legend className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400">
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand-50 text-[10px] font-bold text-brand-700 dark:bg-brand-900 dark:text-brand-200">
        {step}
      </span>
      {text}
    </legend>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="mb-3 block">
      <span className="mb-1 block text-[12px] font-medium text-stone-700 dark:text-stone-300">
        {label}
      </span>
      {children}
    </label>
  );
}
