'use client';

// 비의료기관 고지 — "본 검사는 질병의 의학적 진단을 대신하지 않으며, 생활습관 개선을 위한
// 개인형 맞춤정보 제공을 목적으로 합니다"(2026-10-14 죠니). 검사·결과 화면에 공통 노출.
// 4개 로케일 동일 의미로 번역해 표시.

import { useI18n } from '@/lib/i18n';

const NOTICE_KO =
  '본 검사는 질병의 의학적 진단을 대신하지 않으며, 생활습관 개선을 위한 개인형 맞춤정보 제공을 목적으로 합니다.';
const NOTICE: Record<string, string> = {
  ko: NOTICE_KO,
  en: 'This assessment does not replace a medical diagnosis of disease; it is intended to provide personalized information for lifestyle improvement.',
  ja: '本検査は疾病の医学的診断に代わるものではなく、生活習慣の改善のための個人向けカスタム情報の提供を目的としています。',
  es: 'Esta evaluación no sustituye un diagnóstico médico de una enfermedad; su objetivo es proporcionar información personalizada para mejorar el estilo de vida.',
};

export function wellnessNoticeText(locale: string): string {
  return NOTICE[locale] ?? NOTICE_KO;
}

export function WellnessNotice({ className = '' }: { className?: string }) {
  const { locale } = useI18n();
  return (
    <p
      className={`rounded-2xl border border-stone-200/70 bg-white/70 px-4 py-3 text-[11px] leading-relaxed text-stone-500 dark:border-stone-800 dark:bg-stone-900/60 dark:text-stone-400 ${className}`}
    >
      {wellnessNoticeText(locale)}
    </p>
  );
}
