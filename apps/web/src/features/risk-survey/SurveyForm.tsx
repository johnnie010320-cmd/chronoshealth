'use client';

import { useEffect, useState } from 'react';
import { RiskSurveyRequest, type RiskSurveyRequest as TRiskSurveyRequest, type RiskSurveyResponse } from '@/lib/schemas';
import { submitRiskEstimate } from '@/lib/api-client';
import { useI18n } from '@/lib/i18n';
import {
  loadHealthProfile,
  saveHealthProfile,
  clearHealthProfile,
  type StableHealthProfile,
} from '@/lib/health-profile';
import {
  deriveAlcoholDrinksPerWeek,
  deriveExerciseMinutesPerWeek,
  ALCOHOL_GLASS_ML,
  type AlcoholType,
  type AlcoholEntry,
  type ExerciseEntry,
  type ExerciseKind,
  type ExerciseIntensity,
} from '@/lib/survey-derive';
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
  onSuccess: (data: RiskSurveyResponse, request: TRiskSurveyRequest) => void;
};

export function SurveyForm({ onSuccess }: Props) {
  const { t } = useI18n();
  const S = t.survey;
  const F = S.fields;
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // 변화가 거의 없는 기본 정보(생년·성별·키·가족력) 로컬 프리필.
  const [profile, setProfile] = useState<StableHealthProfile | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [formKey, setFormKey] = useState(0);
  // 세분화 입력 — 흡연 갑수 표시 토글용 smoking, 음주 주종, 운동 목록, 기타 가족력.
  const [smoking, setSmoking] = useState('');
  const [alcohols, setAlcohols] = useState<AlcoholEntry[]>([]);
  const [exercises, setExercises] = useState<ExerciseEntry[]>([]);
  const [familyOther, setFamilyOther] = useState<string[]>([]);

  useEffect(() => {
    const loaded = loadHealthProfile();
    setProfile(loaded);
    setFamilyOther(loaded?.familyHistoryOther ?? []);
    setProfileLoaded(true);
  }, []);

  function handleClearProfile() {
    clearHealthProfile();
    setProfile(null);
    setFamilyOther([]);
    setExercises([]);
    setAlcohols([]);
    setSmoking('');
    setFormKey((k) => k + 1);
  }

  function addAlcohol() {
    setAlcohols((xs) => (xs.length >= 10 ? xs : [...xs, { type: 'beer', amountPerWeek: 0 }]));
  }
  function updateAlcohol(idx: number, patch: Partial<AlcoholEntry>) {
    setAlcohols((xs) => xs.map((x, i) => (i === idx ? { ...x, ...patch } : x)));
  }
  function removeAlcohol(idx: number) {
    setAlcohols((xs) => xs.filter((_, i) => i !== idx));
  }

  function addExercise() {
    setExercises((xs) =>
      xs.length >= 10 ? xs : [...xs, { kind: 'aerobic', intensity: 'medium', minutesPerWeek: 0 }],
    );
  }
  function updateExercise(idx: number, patch: Partial<ExerciseEntry>) {
    setExercises((xs) => xs.map((x, i) => (i === idx ? { ...x, ...patch } : x)));
  }
  function removeExercise(idx: number) {
    setExercises((xs) => xs.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const fd = new FormData(e.currentTarget);
      const smokingVal = fd.get('smoking') as string;
      // 음주·운동 목록·기타 가족력은 상태에서 정제(빈 항목 제거).
      const cleanAlcohols = alcohols.filter((a) => a.amountPerWeek > 0);
      const cleanExercises = exercises.filter((x) => x.minutesPerWeek > 0);
      const cleanFamilyOther = familyOther.map((s) => s.trim()).filter((s) => s !== '');
      const raw = {
        birthYear: numOrNaN(fd.get('birthYear')),
        sex: fd.get('sex') as string,
        heightCm: numOrNaN(fd.get('heightCm')),
        weightKg: numOrNaN(fd.get('weightKg')),
        smoking: smokingVal,
        smokingPacksPerWeek:
          smokingVal === 'current' ? nullableNum(fd.get('smokingPacksPerWeek')) : null,
        alcoholEntries: cleanAlcohols,
        // 계산 입력(표준잔/주 합계)은 주종·주량 목록에서 파생.
        alcoholDrinksPerWeek: deriveAlcoholDrinksPerWeek(cleanAlcohols),
        exercises: cleanExercises,
        // 계산 입력(강도가중 유효분/주)은 운동 목록에서 파생.
        exerciseMinutesPerWeek: deriveExerciseMinutesPerWeek(cleanExercises),
        sleepHoursPerNight: numOrNaN(fd.get('sleepHoursPerNight')),
        systolicBp: nullableNum(fd.get('systolicBp')),
        diastolicBp: nullableNum(fd.get('diastolicBp')),
        fastingGlucose: nullableNum(fd.get('fastingGlucose')),
        ldlCholesterol: nullableNum(fd.get('ldlCholesterol')),
        hdlCholesterol: nullableNum(fd.get('hdlCholesterol')),
        familyHistoryDiabetes: fd.has('familyHistoryDiabetes'),
        familyHistoryHypertension: fd.has('familyHistoryHypertension'),
        familyHistoryCardiovascular: fd.has('familyHistoryCardiovascular'),
        familyHistoryOther: cleanFamilyOther,
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

      // 변화가 거의 없는 기본 정보만 이 기기에 저장 → 다음 설문 자동 입력.
      saveHealthProfile({
        birthYear: parsed.data.birthYear,
        sex: parsed.data.sex,
        heightCm: parsed.data.heightCm,
        weightKg: parsed.data.weightKg,
        familyHistoryDiabetes: parsed.data.familyHistoryDiabetes,
        familyHistoryHypertension: parsed.data.familyHistoryHypertension,
        familyHistoryCardiovascular: parsed.data.familyHistoryCardiovascular,
        familyHistoryOther: parsed.data.familyHistoryOther,
      });

      const data = await submitRiskEstimate(parsed.data);
      onSuccess(data, parsed.data);
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

  if (!profileLoaded) {
    return (
      <div className="mt-2 h-48 animate-pulse rounded-3xl bg-stone-100 dark:bg-stone-900" />
    );
  }

  const p = profile;

  return (
    <form key={formKey} onSubmit={handleSubmit} className="space-y-6 pb-32">
      <header className="space-y-2 px-1">
        <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
          {S.heroTitle}
        </h1>
        <p className="text-[13px] leading-relaxed text-stone-600 dark:text-stone-400">
          {S.heroBody}
        </p>
      </header>

      {p && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-brand-200 bg-brand-50 px-4 py-3 dark:border-brand-900 dark:bg-brand-950">
          <span className="text-[12px] font-medium leading-snug text-brand-800 dark:text-brand-200">
            {S.savedProfile.loaded}
          </span>
          <button
            type="button"
            onClick={handleClearProfile}
            className="shrink-0 rounded-lg px-2 py-1 text-[12px] font-semibold text-brand-700 underline-offset-2 hover:underline dark:text-brand-300"
          >
            {S.savedProfile.clear}
          </button>
        </div>
      )}

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
        hint={S.savedProfile.autofillHint}
      >
        <Field
          label={F.birthYear.label}
          name="birthYear"
          type="number"
          required
          min={1900}
          placeholder={F.birthYear.placeholder}
          defaultValue={p?.birthYear ?? undefined}
        />
        <SelectField
          label={F.sex.label}
          name="sex"
          required
          defaultValue={p?.sex || ''}
          options={[
            { value: 'male', label: F.sex.options.male },
            { value: 'female', label: F.sex.options.female },
            { value: 'other', label: F.sex.options.other },
          ]}
        />
        <Field
          label={F.heightCm.label}
          name="heightCm"
          type="number"
          step="0.1"
          required
          min={100}
          max={250}
          placeholder={F.heightCm.placeholder}
          defaultValue={p?.heightCm ?? undefined}
        />
        <Field
          label={F.weightKg.label}
          name="weightKg"
          type="number"
          step="0.1"
          required
          min={20}
          max={300}
          placeholder={F.weightKg.placeholder}
        />
      </Section>

      <Section
        icon={<ActivityIcon className="h-5 w-5" />}
        title={S.section.lifestyle}
        n="2"
      >
        <SelectField
          label={F.smoking.label}
          name="smoking"
          required
          onChange={setSmoking}
          options={[
            { value: 'never', label: F.smoking.options.never },
            { value: 'former', label: F.smoking.options.former },
            { value: 'current', label: F.smoking.options.current },
          ]}
        />
        {smoking === 'current' && (
          <Field
            label={F.smokingPacks.label}
            name="smokingPacksPerWeek"
            type="number"
            step="0.5"
            min={0}
            max={140}
            placeholder={F.smokingPacks.placeholder}
          />
        )}

        <AlcoholList
          alcohols={alcohols}
          onAdd={addAlcohol}
          onUpdate={updateAlcohol}
          onRemove={removeAlcohol}
          labels={F.alcohol}
        />

        <ExerciseList
          exercises={exercises}
          onAdd={addExercise}
          onUpdate={updateExercise}
          onRemove={removeExercise}
          labels={F.exercise}
        />

        <Field
          label={F.sleepHoursPerNight.label}
          name="sleepHoursPerNight"
          type="number"
          step="0.5"
          required
          min={0}
          max={24}
          defaultValue={7}
        />
      </Section>

      <Section
        icon={<DropletIcon className="h-5 w-5" />}
        title={S.section.vitals}
        n="3"
        hint={S.section.vitalsHint}
      >
        <Field
          label={F.systolicBp.label}
          name="systolicBp"
          type="number"
          min={60}
          max={250}
          placeholder={F.systolicBp.placeholder}
        />
        <Field
          label={F.diastolicBp.label}
          name="diastolicBp"
          type="number"
          min={30}
          max={150}
          placeholder={F.diastolicBp.placeholder}
        />
        <Field
          label={F.fastingGlucose.label}
          name="fastingGlucose"
          type="number"
          min={30}
          max={500}
          placeholder={F.fastingGlucose.placeholder}
        />
        <Field
          label={F.ldlCholesterol.label}
          name="ldlCholesterol"
          type="number"
          min={30}
          max={400}
          placeholder={F.ldlCholesterol.placeholder}
        />
        <Field
          label={F.hdlCholesterol.label}
          name="hdlCholesterol"
          type="number"
          min={10}
          max={200}
          placeholder={F.hdlCholesterol.placeholder}
        />
      </Section>

      <Section
        icon={<HeartPulseIcon className="h-5 w-5" />}
        title={S.section.familyHistory}
        n="4"
      >
        <Checkbox
          name="familyHistoryDiabetes"
          label={F.familyHistoryDiabetes.label}
          defaultChecked={p?.familyHistoryDiabetes}
        />
        <Checkbox
          name="familyHistoryHypertension"
          label={F.familyHistoryHypertension.label}
          defaultChecked={p?.familyHistoryHypertension}
        />
        <Checkbox
          name="familyHistoryCardiovascular"
          label={F.familyHistoryCardiovascular.label}
          defaultChecked={p?.familyHistoryCardiovascular}
        />
        <FamilyOtherList
          items={familyOther}
          onChange={setFamilyOther}
          labels={F.familyHistoryOther}
        />
      </Section>

      <Section
        icon={<BrainIcon className="h-5 w-5" />}
        title={S.section.perception}
        n="5"
      >
        <SelectField
          label={F.stressLevel.label}
          name="stressLevel"
          required
          options={[
            { value: 'low', label: F.stressLevel.options.low },
            { value: 'medium', label: F.stressLevel.options.medium },
            { value: 'high', label: F.stressLevel.options.high },
          ]}
        />
        <SelectField
          label={F.selfRatedHealth.label}
          name="selfRatedHealth"
          required
          options={[
            { value: 'excellent', label: F.selfRatedHealth.options.excellent },
            { value: 'good', label: F.selfRatedHealth.options.good },
            { value: 'fair', label: F.selfRatedHealth.options.fair },
            { value: 'poor', label: F.selfRatedHealth.options.poor },
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
          label={F.consentToStore.label}
        />
        <Checkbox
          name="consentToResearch"
          label={F.consentToResearch.label}
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
  defaultValue?: string | number | undefined;
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
  defaultValue = '',
  onChange,
}: {
  label: string;
  name: string;
  required?: boolean;
  options: Array<{ value: string; label: string }>;
  defaultValue?: string;
  onChange?: (v: string) => void;
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
        defaultValue={defaultValue}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
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

function Checkbox({
  name,
  label,
  defaultChecked,
}: {
  name: string;
  label: string;
  defaultChecked?: boolean | undefined;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-stone-200 bg-stone-50/60 p-3 transition hover:bg-stone-50 dark:border-stone-800 dark:bg-stone-950/60 dark:hover:bg-stone-900">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="mt-0.5 h-5 w-5 shrink-0 accent-brand-700 dark:accent-brand-400"
      />
      <span className="text-sm leading-snug text-stone-700 dark:text-stone-300">
        {label}
      </span>
    </label>
  );
}

// 주당 음주 — (주종·주량 잔) 목록. 복수 입력. 주종별 1잔 용량(ml) 표시.
function AlcoholList({
  alcohols,
  onAdd,
  onUpdate,
  onRemove,
  labels,
}: {
  alcohols: AlcoholEntry[];
  onAdd: () => void;
  onUpdate: (idx: number, patch: Partial<AlcoholEntry>) => void;
  onRemove: (idx: number) => void;
  labels: {
    label: string;
    addCta: string;
    empty: string;
    remove: string;
    amountLabel: string;
    perGlass: string;
    types: Record<AlcoholType, string>;
  };
}) {
  const types: AlcoholType[] = ['beer', 'soju', 'wine', 'spirits', 'makgeolli', 'other'];
  return (
    <div className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-stone-700 dark:text-stone-300">
        {labels.label}
      </span>
      {alcohols.length === 0 ? (
        <p className="mb-2 text-[12px] text-stone-400 dark:text-stone-500">{labels.empty}</p>
      ) : (
        <div className="space-y-2">
          {alcohols.map((a, idx) => {
            const ml = ALCOHOL_GLASS_ML[a.type];
            return (
              <div
                key={idx}
                className="rounded-xl border border-stone-200 bg-stone-50/60 p-2.5 dark:border-stone-800 dark:bg-stone-950/60"
              >
                <div className="flex items-center gap-2">
                  <select
                    aria-label={labels.label}
                    value={a.type}
                    onChange={(e) => onUpdate(idx, { type: e.target.value as AlcoholType })}
                    className="min-w-0 flex-1 rounded-xl border border-stone-200 bg-stone-50 px-2 py-2.5 text-[13px] text-stone-900 focus:border-brand-500 focus:bg-white focus:outline-none dark:border-stone-800 dark:bg-stone-950 dark:text-stone-100"
                  >
                    {types.map((t) => (
                      <option key={t} value={t}>
                        {labels.types[t]}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min={0}
                    max={200}
                    inputMode="numeric"
                    value={a.amountPerWeek || ''}
                    onChange={(e) =>
                      onUpdate(idx, {
                        amountPerWeek: Math.max(0, Math.floor(Number(e.target.value) || 0)),
                      })
                    }
                    placeholder={labels.amountLabel}
                    className="w-16 shrink-0 rounded-xl border border-stone-200 bg-stone-50 px-2.5 py-2.5 text-[14px] text-stone-900 placeholder:text-stone-400 focus:border-brand-500 focus:bg-white focus:outline-none dark:border-stone-800 dark:bg-stone-950 dark:text-stone-100"
                  />
                  <span className="shrink-0 text-[12px] text-stone-500 dark:text-stone-400">
                    {labels.amountLabel}
                  </span>
                  <button
                    type="button"
                    onClick={() => onRemove(idx)}
                    aria-label={labels.remove}
                    className="shrink-0 rounded-lg px-2 py-1 text-[12px] font-semibold text-rose-600 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-950/40"
                  >
                    {labels.remove}
                  </button>
                </div>
                {ml > 0 && (
                  <p className="mt-1 text-[10px] text-stone-400 dark:text-stone-500">
                    {labels.perGlass.replace('{v}', String(ml))}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
      <button
        type="button"
        onClick={onAdd}
        disabled={alcohols.length >= 10}
        className="mt-2 rounded-xl border border-stone-300 bg-white px-3 py-2 text-[13px] font-semibold text-stone-700 transition active:scale-[0.98] disabled:opacity-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200"
      >
        {labels.addCta}
      </button>
    </div>
  );
}

// 주당 운동 — (유산소/근력/기타)×(강/중/약)×분 목록. 복수 입력.
function ExerciseList({
  exercises,
  onAdd,
  onUpdate,
  onRemove,
  labels,
}: {
  exercises: ExerciseEntry[];
  onAdd: () => void;
  onUpdate: (idx: number, patch: Partial<ExerciseEntry>) => void;
  onRemove: (idx: number) => void;
  labels: {
    label: string;
    addCta: string;
    empty: string;
    remove: string;
    minutesLabel: string;
    kinds: Record<ExerciseKind, string>;
    intensities: Record<ExerciseIntensity, string>;
  };
}) {
  const rowSelect =
    'min-w-0 flex-1 rounded-xl border border-stone-200 bg-stone-50 px-2 py-2.5 text-[13px] text-stone-900 focus:border-brand-500 focus:bg-white focus:outline-none dark:border-stone-800 dark:bg-stone-950 dark:text-stone-100';
  const kinds: ExerciseKind[] = ['aerobic', 'strength', 'other'];
  const intensities: ExerciseIntensity[] = ['high', 'medium', 'low'];
  return (
    <div className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-stone-700 dark:text-stone-300">
        {labels.label}
      </span>
      {exercises.length === 0 ? (
        <p className="mb-2 text-[12px] text-stone-400 dark:text-stone-500">{labels.empty}</p>
      ) : (
        <div className="space-y-2">
          {exercises.map((ex, idx) => (
            <div
              key={idx}
              className="rounded-xl border border-stone-200 bg-stone-50/60 p-2.5 dark:border-stone-800 dark:bg-stone-950/60"
            >
              <div className="flex items-center gap-2">
                <select
                  aria-label={labels.label}
                  value={ex.kind}
                  onChange={(e) => onUpdate(idx, { kind: e.target.value as ExerciseKind })}
                  className={rowSelect}
                >
                  {kinds.map((k) => (
                    <option key={k} value={k}>
                      {labels.kinds[k]}
                    </option>
                  ))}
                </select>
                <select
                  aria-label={labels.label}
                  value={ex.intensity}
                  onChange={(e) => onUpdate(idx, { intensity: e.target.value as ExerciseIntensity })}
                  className={rowSelect}
                >
                  {intensities.map((it) => (
                    <option key={it} value={it}>
                      {labels.intensities[it]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={2000}
                  inputMode="numeric"
                  value={ex.minutesPerWeek || ''}
                  onChange={(e) =>
                    onUpdate(idx, { minutesPerWeek: Math.max(0, Math.floor(Number(e.target.value) || 0)) })
                  }
                  placeholder={labels.minutesLabel}
                  className="min-w-0 flex-1 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-[14px] text-stone-900 placeholder:text-stone-400 focus:border-brand-500 focus:bg-white focus:outline-none dark:border-stone-800 dark:bg-stone-950 dark:text-stone-100"
                />
                <span className="shrink-0 text-[12px] text-stone-500 dark:text-stone-400">
                  {labels.minutesLabel}
                </span>
                <button
                  type="button"
                  onClick={() => onRemove(idx)}
                  aria-label={labels.remove}
                  className="shrink-0 rounded-lg px-2 py-1 text-[12px] font-semibold text-rose-600 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-950/40"
                >
                  {labels.remove}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={onAdd}
        disabled={exercises.length >= 10}
        className="mt-2 rounded-xl border border-stone-300 bg-white px-3 py-2 text-[13px] font-semibold text-stone-700 transition active:scale-[0.98] disabled:opacity-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200"
      >
        {labels.addCta}
      </button>
    </div>
  );
}

// 기타 가족력 — 자유 입력 복수.
function FamilyOtherList({
  items,
  onChange,
  labels,
}: {
  items: string[];
  onChange: (items: string[]) => void;
  labels: { label: string; placeholder: string; addCta: string; remove: string };
}) {
  return (
    <div className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-stone-700 dark:text-stone-300">
        {labels.label}
      </span>
      {items.length > 0 && (
        <div className="space-y-2">
          {items.map((val, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input
                type="text"
                maxLength={60}
                value={val}
                onChange={(e) => onChange(items.map((v, i) => (i === idx ? e.target.value : v)))}
                placeholder={labels.placeholder}
                className="min-w-0 flex-1 rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-[14px] text-stone-900 placeholder:text-stone-400 focus:border-brand-500 focus:bg-white focus:outline-none dark:border-stone-800 dark:bg-stone-950 dark:text-stone-100"
              />
              <button
                type="button"
                onClick={() => onChange(items.filter((_, i) => i !== idx))}
                aria-label={labels.remove}
                className="shrink-0 rounded-lg px-2 py-1 text-[12px] font-semibold text-rose-600 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-950/40"
              >
                {labels.remove}
              </button>
            </div>
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={() => (items.length >= 10 ? null : onChange([...items, '']))}
        disabled={items.length >= 10}
        className="mt-2 rounded-xl border border-stone-300 bg-white px-3 py-2 text-[13px] font-semibold text-stone-700 transition active:scale-[0.98] disabled:opacity-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200"
      >
        {labels.addCta}
      </button>
    </div>
  );
}
