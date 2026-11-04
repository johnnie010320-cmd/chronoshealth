'use client';

import {
  createContext,
  useCallback,
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
// v2: 브라우저 언어 자동감지 제거 — 기본 언어는 항상 한글(ko).
// 이전(chronos.locale)에 자동감지로 저장된 값은 무시하고, 사용자가 직접 고른 값만 유지.
const STORAGE_KEY = 'chronos.locale.v2';

type Ctx = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: Dictionary;
  locales: Locale[];
};

const I18nContext = createContext<Ctx | null>(null);

// 사용자가 명시적으로 고른 언어만 반환. 없으면 null → 기본(한글) 사용.
function readStoredLocale(): Locale | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY) as Locale | null;
    return stored && ALL_LOCALES.includes(stored) ? stored : null;
  } catch {
    return null;
  }
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // 기본은 항상 한글. 사용자가 직접 고른 값이 있으면 그것만 복원(브라우저 자동감지 없음).
    const stored = readStoredLocale();
    if (stored) setLocaleState(stored);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    document.documentElement.lang = locale;
  }, [locale, mounted]);

  // 언어 변경은 사용자가 직접 고른 것만 저장 → 기본값은 언제나 한글로 유지.
  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try {
      window.localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* localStorage 미지원/차단 — 이번 세션에만 적용 */
    }
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      locale,
      setLocale,
      t: DICTS[locale],
      locales: ALL_LOCALES,
    }),
    [locale, setLocale],
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
