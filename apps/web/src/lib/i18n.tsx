'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { ko, type Dictionary } from '@/locales/ko';
import { en } from '@/locales/en';
import { ja } from '@/locales/ja';
import { es } from '@/locales/es';

export type Locale = 'ko' | 'en' | 'ja' | 'es';

const DICTS: Record<Locale, Dictionary> = { ko, en, ja, es };
const ALL_LOCALES: Locale[] = ['ko', 'en', 'ja', 'es'];
const DEFAULT_LOCALE: Locale = 'ko';
const STORAGE_KEY = 'chronos.locale';

type Ctx = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: Dictionary;
  locales: Locale[];
};

const I18nContext = createContext<Ctx | null>(null);

function detectInitialLocale(): Locale {
  if (typeof window === 'undefined') return DEFAULT_LOCALE;
  const stored = window.localStorage.getItem(STORAGE_KEY) as Locale | null;
  if (stored && ALL_LOCALES.includes(stored)) return stored;

  const nav = window.navigator.language?.toLowerCase() ?? '';
  if (nav.startsWith('ko')) return 'ko';
  if (nav.startsWith('ja')) return 'ja';
  if (nav.startsWith('es')) return 'es';
  if (nav.startsWith('en')) return 'en';
  return DEFAULT_LOCALE;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setLocaleState(detectInitialLocale());
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    document.documentElement.lang = locale;
    window.localStorage.setItem(STORAGE_KEY, locale);
  }, [locale, mounted]);

  const value = useMemo<Ctx>(
    () => ({
      locale,
      setLocale: setLocaleState,
      t: DICTS[locale],
      locales: ALL_LOCALES,
    }),
    [locale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): Ctx {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    // SSR/SSG safe fallback to ko.
    return {
      locale: DEFAULT_LOCALE,
      setLocale: () => undefined,
      t: ko,
      locales: ALL_LOCALES,
    };
  }
  return ctx;
}
