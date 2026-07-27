'use client';

import { useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { GlobeIcon } from './HealthIcons';
import { translateText } from '@/lib/api-client';

// 온디맨드 번역 버튼 + 결과 표시(자체 상태). 원문은 부모가 그대로 렌더하고,
// 이 컨트롤은 그 아래에 번역문을 별도로 붙인다. 번역 결과는 저장하지 않음(휘발).
type Labels = {
  translate: string;
  translating: string;
  showOriginal: string;
  failed: string;
};

export function TranslateControl({ text, labels }: { text: string; labels: Labels }) {
  const { locale } = useI18n();
  const [translated, setTranslated] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function run() {
    if (busy) return;
    setBusy(true);
    setFailed(false);
    try {
      setTranslated(await translateText(text, locale));
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  if (translated !== null) {
    return (
      <div className="mt-1.5">
        <div className="whitespace-pre-wrap rounded-xl border border-dashed border-brand-300 bg-brand-50/60 px-3 py-2 text-[13px] leading-relaxed text-stone-800 dark:border-brand-700 dark:bg-brand-900/20 dark:text-stone-100">
          <span className="mb-1 flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-brand-600 dark:text-brand-300">
            <GlobeIcon className="h-3 w-3" />
            {labels.translate}
          </span>
          {translated}
        </div>
        <button
          type="button"
          onClick={() => setTranslated(null)}
          className="mt-1 text-[11px] font-medium text-stone-400 underline-offset-2 hover:underline"
        >
          {labels.showOriginal}
        </button>
      </div>
    );
  }

  return (
    <div className="mt-1.5">
      <button
        type="button"
        onClick={() => void run()}
        disabled={busy}
        className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-700 transition disabled:opacity-60 dark:text-brand-300"
      >
        <GlobeIcon className="h-3 w-3" />
        {busy ? labels.translating : labels.translate}
      </button>
      {failed && (
        <span className="ml-2 text-[11px] text-rose-600 dark:text-rose-300">{labels.failed}</span>
      )}
    </div>
  );
}
