'use client';

import { useI18n } from '@/lib/i18n';

type Props = {
  consentPii: boolean;
  consentMedicalDisclaimer: boolean;
  consentTokenReview: boolean;
  onChange: (
    field:
      | 'consentPii'
      | 'consentMedicalDisclaimer'
      | 'consentTokenReview',
    value: boolean,
  ) => void;
  disabled?: boolean;
};

export function ConsentChecklist({
  consentPii,
  consentMedicalDisclaimer,
  consentTokenReview,
  onChange,
  disabled,
}: Props) {
  const { t } = useI18n();
  const C = t.betaSignup.consent;

  return (
    <ul className="space-y-3">
      <ConsentItem
        checked={consentPii}
        label={C.pii.label}
        description={C.pii.description}
        onChange={(v) => onChange('consentPii', v)}
        disabled={disabled}
      />
      <ConsentItem
        checked={consentMedicalDisclaimer}
        label={C.medical.label}
        description={C.medical.description}
        onChange={(v) => onChange('consentMedicalDisclaimer', v)}
        disabled={disabled}
      />
      <ConsentItem
        checked={consentTokenReview}
        label={C.token.label}
        description={C.token.description}
        onChange={(v) => onChange('consentTokenReview', v)}
        disabled={disabled}
      />
    </ul>
  );
}

function ConsentItem({
  checked,
  label,
  description,
  onChange,
  disabled,
}: {
  checked: boolean;
  label: string;
  description: string;
  onChange: (v: boolean) => void;
  disabled: boolean | undefined;
}) {
  return (
    <li>
      <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-stone-200 bg-white/85 p-3 transition hover:border-brand-300 dark:border-stone-800 dark:bg-stone-900/70 dark:hover:border-brand-700">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-stone-300 text-brand-700 focus:ring-brand-500 dark:border-stone-700 dark:bg-stone-800"
        />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-stone-900 dark:text-stone-100">
            {label}
          </span>
          <span className="mt-1 block text-[12px] leading-relaxed text-stone-600 dark:text-stone-400">
            {description}
          </span>
        </span>
      </label>
    </li>
  );
}
