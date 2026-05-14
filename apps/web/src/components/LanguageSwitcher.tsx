'use client';

import { useI18n, type Locale } from '@/lib/i18n';

export function LanguageSwitcher() {
  const { locale, setLocale, t, locales } = useI18n();

  return (
    <label className="flex items-center gap-1.5">
      <span className="sr-only">{t.language.label}</span>
      <select
        value={locale}
        onChange={(e) => setLocale(e.target.value as Locale)}
        aria-label={t.language.label}
        className="cursor-pointer rounded-full border border-stone-200 bg-white/80 px-2.5 py-1 text-[11px] font-medium text-stone-700 backdrop-blur transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/30 dark:border-stone-700 dark:bg-stone-900/80 dark:text-stone-200"
      >
        {locales.map((l) => (
          <option key={l} value={l}>
            {t.language[l]}
          </option>
        ))}
      </select>
    </label>
  );
}
