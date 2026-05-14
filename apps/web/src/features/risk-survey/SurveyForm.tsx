'use client';

import { useState } from 'react';
import { RiskSurveyRequest, type RiskSurveyResponse } from '@/lib/schemas';
import { submitRiskEstimate } from '@/lib/api-client';

type Props = {
  onSuccess: (data: RiskSurveyResponse) => void;
};

const FRIENDLY_ERROR: Record<string, string> = {
  UNAUTHORIZED: '인증이 필요합니다 (베타 토큰 누락).',
  AGE_RESTRICTED: '만 19세 미만은 이용할 수 없습니다.',
  RATE_LIMITED: '일일 호출 한도(5회)를 초과했습니다.',
  INVALID_INPUT: '입력값을 다시 확인해주세요.',
  INVALID_JSON: '요청 형식이 올바르지 않습니다.',
};

export function SurveyForm({ onSuccess }: Props) {
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
        setError(`입력값 확인 필요 — ${fieldPath || 'unknown'}: ${first?.message ?? ''}`);
        setSubmitting(false);
        return;
      }

      const data = await submitRiskEstimate(parsed.data);
      onSuccess(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(FRIENDLY_ERROR[msg] ?? `서버 오류: ${msg}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <header>
        <h1 className="text-2xl md:text-3xl font-bold mb-2">건강 위험 추정 베타 설문</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          아래 23문항에 답하시면 모의 위험 추정 리포트가 즉시 표시됩니다.
          만 19세 이상만 참여 가능합니다.
        </p>
      </header>

      <Section title="1. 인구통계">
        <Field label="출생 연도" name="birthYear" type="number" required min={1900} placeholder="예: 1990" />
        <SelectField label="성별" name="sex" required options={[
          { value: 'male', label: '남성' },
          { value: 'female', label: '여성' },
          { value: 'other', label: '기타 / 응답하지 않음' },
        ]} />
        <Field label="키 (cm)" name="heightCm" type="number" step="0.1" required min={100} max={250} placeholder="예: 175" />
        <Field label="몸무게 (kg)" name="weightKg" type="number" step="0.1" required min={20} max={300} placeholder="예: 70" />
      </Section>

      <Section title="2. 생활 습관">
        <SelectField label="흡연 상태" name="smoking" required options={[
          { value: 'never', label: '비흡연' },
          { value: 'former', label: '과거 흡연 (현재 안 함)' },
          { value: 'current', label: '현재 흡연' },
        ]} />
        <Field label="주당 음주 잔 수" name="alcoholDrinksPerWeek" type="number" required min={0} max={100} defaultValue={0} />
        <Field label="주당 운동 시간 (분)" name="exerciseMinutesPerWeek" type="number" required min={0} max={2000} defaultValue={150} />
        <Field label="평균 수면 시간 (시간)" name="sleepHoursPerNight" type="number" step="0.5" required min={0} max={24} defaultValue={7} />
      </Section>

      <Section title="3. 측정값" hint="모르면 비워두세요. 비워두면 추정 정확도가 일부 낮아집니다.">
        <Field label="수축기 혈압 (mmHg)" name="systolicBp" type="number" min={60} max={250} placeholder="예: 120" />
        <Field label="이완기 혈압 (mmHg)" name="diastolicBp" type="number" min={30} max={150} placeholder="예: 80" />
        <Field label="공복 혈당 (mg/dL)" name="fastingGlucose" type="number" min={30} max={500} placeholder="예: 95" />
        <Field label="LDL 콜레스테롤 (mg/dL)" name="ldlCholesterol" type="number" min={30} max={400} placeholder="예: 110" />
        <Field label="HDL 콜레스테롤 (mg/dL)" name="hdlCholesterol" type="number" min={10} max={200} placeholder="예: 50" />
      </Section>

      <Section title="4. 가족력">
        <Checkbox name="familyHistoryDiabetes" label="당뇨 가족력" />
        <Checkbox name="familyHistoryHypertension" label="고혈압 가족력" />
        <Checkbox name="familyHistoryCardiovascular" label="심혈관 질환 가족력" />
      </Section>

      <Section title="5. 자가 인식">
        <SelectField label="평상시 스트레스 수준" name="stressLevel" required options={[
          { value: 'low', label: '낮음' },
          { value: 'medium', label: '보통' },
          { value: 'high', label: '높음' },
        ]} />
        <SelectField label="현재 건강 상태 (자가 평가)" name="selfRatedHealth" required options={[
          { value: 'excellent', label: '매우 좋음' },
          { value: 'good', label: '좋음' },
          { value: 'fair', label: '보통' },
          { value: 'poor', label: '나쁨' },
        ]} />
      </Section>

      <Section title="6. 동의 (선택)">
        <Checkbox name="consentToStore" label="답변을 익명으로 저장하는 데 동의합니다 (서비스 개선용)" />
        <Checkbox name="consentToResearch" label="익명 통계 활용에 동의합니다 (연구 / 파트너십)" />
      </Section>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800 dark:bg-red-950 dark:border-red-900 dark:text-red-200">
          {error}
        </div>
      )}

      <div className="space-y-3">
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-4 bg-black text-white rounded-full text-sm font-medium hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed dark:bg-white dark:text-black dark:hover:bg-gray-200"
        >
          {submitting ? '계산 중…' : '모의 리포트 받기'}
        </button>
        <p className="text-xs text-gray-500 text-center px-4">
          본 리포트는 의료 행위를 대체할 수 없으며 건강 증진 참고용입니다.
          베타 단계이며 결과는 모의값(placeholder)입니다. 실제 계산식은 다음 단계에서 도입됩니다.
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
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="space-y-4 border border-gray-200 dark:border-neutral-800 rounded-lg p-5 bg-white dark:bg-neutral-900">
      <legend className="px-2 text-sm font-semibold">{title}</legend>
      {hint && <p className="text-xs text-gray-500 dark:text-gray-400 -mt-2">{hint}</p>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>
    </fieldset>
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
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="text-gray-700 dark:text-gray-300">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
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
        className="px-3 py-2 rounded-md border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/30"
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
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="text-gray-700 dark:text-gray-300">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </span>
      <select
        name={name}
        required={required}
        defaultValue=""
        className="px-3 py-2 rounded-md border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/30"
      >
        <option value="" disabled>
          선택하세요
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
    <label className="flex items-start gap-2 text-sm cursor-pointer md:col-span-2">
      <input
        type="checkbox"
        name={name}
        className="mt-0.5 w-4 h-4 accent-black dark:accent-white"
      />
      <span className="text-gray-700 dark:text-gray-300">{label}</span>
    </label>
  );
}
