'use client';

import { useState } from 'react';
import { RiskSurveyRequest, type RiskSurveyResponse } from '@/lib/schemas';
import { submitRiskEstimate } from '@/lib/api-client';
import { useI18n } from '@/lib/i18n';
import {
  UsersIcon,
  ActivityIcon,
  DropletIcon,
  HeartPulseIcon,
  BrainIcon,
  ShieldIcon,
  AlertIcon,
} from '@/components/HealthIcons';

type Props = {
  onSuccess: (data: RiskSurveyResponse) => void;
};

export function SurveyForm({ onSuccess }: Props) {
  const { t } = useI18n();
  const S = t.survey;
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const fd = new FormData(e.currentTarget);
      const raw = {
        birthYear: numOrNaN(fd.get('birthYear')),
        sex: fd.get('sex') as string,
        heightCm: numOrNaN(fd.get('heightCm')),
        weightKg: numOrNaN(fd.get('weightKg')),
        smoking: fd.get('smoking') as string,
        alcoholDrinksPerWeek: numOrNaN(fd.get('alcoholDrinksPerWeek')),
        exerciseMinutesPerWeek: numOrNaN(fd.get('exerciseMinutesPerWeek')),
        sleepHoursPerNight: numOrNaN(fd.get('sleepHoursPerNight')),
        systolicBp: nullableNum(fd.get('systolicBp')),
        diastolicBp: nullableNum(fd.get('diastolicBp')),
        fastingGlucose: nullableNum(fd.get('fastingGlucose')),
        ldlCholesterol: nullableNum(fd.get('ldlCholesterol')),
        hdlCholesterol: nullableNum(fd.get('hdlCholesterol')),
        familyHistoryDiabetes: fd.has('familyHistoryDiabetes'),
        familyHistoryHypertension: fd.has('familyHistoryHypertension'),
        familyHistoryCardiovascular: fd.has('familyHistoryCardiovascular'),
        stressLevel: fd.get('stressLevel') as string,
        selfRatedHealth: fd.get('selfRatedHealth') as string,
        consentToStore: fd.has('consentToStore'),
        consentToResearch: fd.has('consentToResearch'),
      };

      const parsed = RiskSurveyRequest.safeParse(raw);
      if (!parsed.success) {
        const first = parsed.error.issues[0];
        const fieldPath = first?.path.join('.') ?? '';
        setError(
          `${S.error.validation} — ${fieldPath || 'unknown'}: ${first?.message ?? ''}`,
        );
        setSubmitting(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      const data = await submitRiskEstimate(parsed.data);
      onSuccess(data);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      const code = err instanceof Error ? err.message : String(err);
      const friendly =
        (S.error as Record<string, string>)[code] ??
        `${S.error.generic}: ${code}`;
      setError(friendly);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pb-32">
      <header className="space-y-2 px-1">
        <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
          {S.heroTitle}
        </h1>
        <p className="text-[13px] leading-relaxed text-stone-600 dark:text-stone-400">
          {S.heroBody}
        </p>
      </header>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-100"
        >
          <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <Section
        icon={<UsersIcon className="h-5 w-5" />}
        title={S.section.demographics}
        n="1"
      >
        <Field label="출생 연도 / Birth year" name="birthYear" type="number" required min={1900} placeholder="1990" />
        <SelectField
          label="성별 / Sex"
          name="sex"
          required
          options={[
            { value: 'male', label: 'Male / 男 / Hombre' },
            { value: 'female', label: 'Female / 女 / Mujer' },
            { value: 'other', label: 'Other / その他 / Otro' },
          ]}
        />
        <Field label="키 / Height (cm)" name="heightCm" type="number" step="0.1" required min={100} max={250} placeholder="175" />
        <Field label="몸무게 / Weight (kg)" name="weightKg" type="number" step="0.1" required min={20} max={300} placeholder="70" />
      </Section>

      <Section
        icon={<ActivityIcon className="h-5 w-5" />}
        title={S.section.lifestyle}
        n="2"
      >
        <SelectField
          label="흡연 / Smoking"
          name="smoking"
          required
          options={[
            { value: 'never', label: 'Never / 非喫煙 / Nunca' },
            { value: 'former', label: 'Former / 過去 / Anterior' },
            { value: 'current', label: 'Current / 現在 / Actual' },
          ]}
        />
        <Field label="주당 음주 잔 / Alcohol/wk" name="alcoholDrinksPerWeek" type="number" required min={0} max={100} defaultValue={0} />
        <Field label="주당 운동(분) / Exercise min/wk" name="exerciseMinutesPerWeek" type="number" required min={0} max={2000} defaultValue={150} />
        <Field label="수면(시간) / Sleep hours" name="sleepHoursPerNight" type="number" step="0.5" required min={0} max={24} defaultValue={7} />
      </Section>

      <Section
        icon={<DropletIcon className="h-5 w-5" />}
        title={S.section.vitals}
        n="3"
        hint={S.section.vitalsHint}
      >
        <Field label="수축기 혈압 / Systolic BP" name="systolicBp" type="number" min={60} max={250} placeholder="120" />
        <Field label="이완기 혈압 / Diastolic BP" name="diastolicBp" type="number" min={30} max={150} placeholder="80" />
        <Field label="공복 혈당 / Fasting glucose" name="fastingGlucose" type="number" min={30} max={500} placeholder="95" />
        <Field label="LDL cholesterol" name="ldlCholesterol" type="number" min={30} max={400} placeholder="110" />
        <Field label="HDL cholesterol" name="hdlCholesterol" type="number" min={10} max={200} placeholder="50" />
      </Section>

      <Section
        icon={<HeartPulseIcon className="h-5 w-5" />}
        title={S.section.familyHistory}
        n="4"
      >
        <Checkbox name="familyHistoryDiabetes" label="당뇨 / Diabetes / 糖尿 / Diabetes" />
        <Checkbox name="familyHistoryHypertension" label="고혈압 / Hypertension / 高血圧 / Hipertensión" />
        <Checkbox name="familyHistoryCardiovascular" label="심혈관 / Cardiovascular / 心血管 / Cardiovascular" />
      </Section>

      <Section
        icon={<BrainIcon className="h-5 w-5" />}
        title={S.section.perception}
        n="5"
      >
        <SelectField
          label="스트레스 / Stress level"
          name="stressLevel"
          required
          options={[
            { value: 'low', label: 'Low / 低 / Bajo' },
            { value: 'medium', label: 'Medium / 中 / Medio' },
            { value: 'high', label: 'High / 高 / Alto' },
          ]}
        />
        <SelectField
          label="자가 평가 / Self-rated health"
          name="selfRatedHealth"
          required
          options={[
            { value: 'excellent', label: 'Excellent / 매우 좋음' },
            { value: 'good', label: 'Good / 좋음' },
            { value: 'fair', label: 'Fair / 보통' },
            { value: 'poor', label: 'Poor / 나쁨' },
          ]}
        />
      </Section>

      <Section
        icon={<ShieldIcon className="h-5 w-5" />}
        title={S.section.consent}
        n="6"
      >
        <Checkbox
          name="consentToStore"
          label="저장 동의 / Consent to store / 保存に同意 / Consiento guardar"
        />
        <Checkbox
          name="consentToResearch"
          label="익명 활용 / Anonymous research / 匿名活用 / Uso anónimo"
        />
      </Section>

      <div className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-md border-t border-stone-200/60 bg-white/80 px-5 pt-3 pb-5 backdrop-blur-md dark:border-stone-800/60 dark:bg-stone-950/80">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-stone-900 px-6 py-4 text-base font-semibold text-white transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-stone-900"
        >
          {submitting && (
            <span
              aria-hidden
              className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
            />
          )}
          {submitting ? S.submitting : S.submit}
        </button>
        <p className="mt-2 text-center text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">
          {S.bottomDisclaimer}
        </p>
      </div>
    </form>
  );
}

function numOrNaN(v: FormDataEntryValue | null): number {
  const s = String(v ?? '').trim();
  return s === '' ? NaN : Number(s);
}

function nullableNum(v: FormDataEntryValue | null): number | null {
  const s = String(v ?? '').trim();
  return s === '' ? null : Number(s);
}

function Section({
  icon,
  title,
  n,
  hint,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  n: string;
  hint?: string;
  children: React.ReactNode;
}) {
  const { t } = useI18n();
  return (
    <section className="card-shadow rounded-3xl bg-white p-5 dark:bg-stone-900">
      <div className="mb-4 flex items-center gap-3">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 dark:bg-brand-900 dark:text-brand-200">
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-widest text-stone-400 dark:text-stone-500">
            {t.survey.section.step} {n}
          </p>
          <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100">
            {title}
          </h2>
        </div>
      </div>
      {hint && (
        <p className="mb-3 text-[12px] leading-relaxed text-stone-500 dark:text-stone-400">
          {hint}
        </p>
      )}
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Field({
  label,
  name,
  type = 'text',
  required,
  min,
  max,
  step,
  defaultValue,
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  min?: number;
  max?: number;
  step?: string | number;
  defaultValue?: string | number;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-stone-700 dark:text-stone-300">
        {label}
        {required && (
          <span className="ml-1 text-rose-500" aria-hidden>
            *
          </span>
        )}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        min={min}
        max={max}
        step={step}
        defaultValue={defaultValue}
        placeholder={placeholder}
        inputMode={type === 'number' ? 'decimal' : undefined}
        className="block w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-base text-stone-900 placeholder:text-stone-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-stone-800 dark:bg-stone-950 dark:text-stone-100 dark:placeholder:text-stone-600 dark:focus:bg-stone-900"
      />
    </label>
  );
}

function SelectField({
  label,
  name,
  required,
  options,
}: {
  label: string;
  name: string;
  required?: boolean;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-stone-700 dark:text-stone-300">
        {label}
        {required && (
          <span className="ml-1 text-rose-500" aria-hidden>
            *
          </span>
        )}
      </span>
      <select
        name={name}
        required={required}
        defaultValue=""
        className="block w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-base text-stone-900 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-stone-800 dark:bg-stone-950 dark:text-stone-100 dark:focus:bg-stone-900"
      >
        <option value="" disabled>
          —
        </option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Checkbox({ name, label }: { name: string; label: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-stone-200 bg-stone-50/60 p-3 transition hover:bg-stone-50 dark:border-stone-800 dark:bg-stone-950/60 dark:hover:bg-stone-900">
      <input
        type="checkbox"
        name={name}
        className="mt-0.5 h-5 w-5 shrink-0 accent-brand-700 dark:accent-brand-400"
      />
      <span className="text-sm leading-snug text-stone-700 dark:text-stone-300">
        {label}
      </span>
    </label>
  );
}
