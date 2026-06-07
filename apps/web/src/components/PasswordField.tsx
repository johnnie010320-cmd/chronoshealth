'use client';

import { useState } from 'react';
import { EyeIcon, EyeOffIcon } from './HealthIcons';

type Props = {
  label: string;
  name: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
  showLabel: string;
  hideLabel: string;
  required?: boolean;
  maxLength?: number;
};

export function PasswordField({
  label,
  name,
  value,
  onChange,
  placeholder,
  autoComplete,
  showLabel,
  hideLabel,
  required,
  maxLength,
}: Props) {
  const [revealed, setRevealed] = useState(false);
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
      <div className="relative">
        <input
          type={revealed ? 'text' : 'password'}
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          maxLength={maxLength}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className="block w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 pr-12 text-base text-stone-900 placeholder:text-stone-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-stone-800 dark:bg-stone-950 dark:text-stone-100 dark:placeholder:text-stone-600 dark:focus:bg-stone-900"
        />
        <button
          type="button"
          onClick={() => setRevealed((v) => !v)}
          aria-label={revealed ? hideLabel : showLabel}
          className="absolute right-2 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-stone-500 hover:bg-stone-200/60 hover:text-stone-700 dark:text-stone-400 dark:hover:bg-stone-800/60 dark:hover:text-stone-200"
        >
          {revealed ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
        </button>
      </div>
    </label>
  );
}
