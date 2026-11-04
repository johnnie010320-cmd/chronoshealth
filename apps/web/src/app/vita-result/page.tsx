'use client';

// VITAcode 진단결과 상세 — 홈 "VITAcode 진단결과 > 상세보기" 도착지(PDF 6페이지 구성).
// 저장된 최신 VITA 결과를 불러와 VitaResultSummary(= 설문 완료 화면과 동일 포맷)로 렌더.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { LoginRequired } from '@/components/LoginRequired';
import { VitaResultSummary } from '@/components/vita/VitaResultSummary';
import { ChevronRightIcon } from '@/components/HealthIcons';
import { readSession } from '@/lib/session';
import { fetchLatestVita, type VitaSavedResult } from '@/lib/api-client';
import { useVitaResultT } from '@/locales/vita-result';

export default function VitaResultPage() {
  const [state, setState] = useState<'loading' | 'unauth' | 'none' | 'ok'>('loading');
  const [saved, setSaved] = useState<VitaSavedResult | null>(null);
  const t = useVitaResultT().t.resultPage;

  useEffect(() => {
    if (!readSession()) {
      setState('unauth');
      return;
    }
    fetchLatestVita()
      .then((r) => {
        if (r) {
          setSaved(r);
          setState('ok');
        } else setState('none');
      })
      .catch(() => setState('none'));
  }, []);

  return (
    <AppShell title={t.title} decoration="dots">
      {state === 'unauth' ? (
        <LoginRequired />
      ) : state === 'loading' ? (
        <div className="mt-10 flex justify-center">
          <span className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-stone-300 border-t-brand-700 dark:border-stone-700 dark:border-t-brand-400" />
        </div>
      ) : state === 'none' || !saved ? (
        <section className="card-shadow mt-4 rounded-3xl card-violet px-5 py-8 text-center">
          <h2 className="text-base font-extrabold text-stone-900 dark:text-stone-100">
            {t.noneTitle}
          </h2>
          <p className="mt-2 text-[12.5px] leading-relaxed text-stone-600 dark:text-stone-300">
            {t.noneDesc}
          </p>
          <Link
            href="/vita-test"
            className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-5 py-2.5 text-[13px] font-bold text-white transition active:scale-[0.98]"
          >
            {t.start}
            <ChevronRightIcon className="h-4 w-4" />
          </Link>
        </section>
      ) : (
        <div className="pb-10 pt-2">
          <VitaResultSummary saved={saved} />
        </div>
      )}
    </AppShell>
  );
}
