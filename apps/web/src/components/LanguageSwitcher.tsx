'use client';

import { useI18n, type Locale } from '@/lib/i18n';

export function LanguageSwitcher() {
  const { locale, setLocale, t, locales } = useI18n();

  return (
    <label className="flex items-center gap-1.5">
      <span className="sr-only">{t.language.label}</span>
      {/* 헤더 폭 절약을 위해 닫힌 상태는 짧은 코드(KO/EN/JA/ES)로 표기.
          전체 언어명은 aria-label·title 로 접근 가능하게 유지한다. */}
      <select
        value={locale}
        onChange={(e) => setLocale(e.target.value as Locale)}
        aria-label={t.language.label}
        title={t.language[locale]}
        className="w-[3.25rem] cursor-pointer rounded-full border border-stone-200 bg-white/80 px-2 py-1 text-[11px] font-semibold text-stone-700 backdrop-blur transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/30 dark:border-stone-700 dark:bg-stone-900/80 dark:text-stone-200"
      >
        {locales.map((l) => (
          <option key={l} value={l} title={t.language[l]}>
            {l.toUpperCase()}
          </option>
        ))}
      </select>
    </label>
  );
}
