'use client';

// 홈 "VITAcode 진단결과" (목업 2.png 기준).
// 코드(FITA) + 유형명 + 상세보기 + 특허/상표 출원 표기(관리자 편집). 동물 썸네일 포함.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronRightIcon } from '@/components/HealthIcons';
import { readSession } from '@/lib/session';
import { fetchLatestVita, type VitaSavedResult } from '@/lib/api-client';
import { buildVitaReport } from '@/lib/vita/reports';
import { vitaAnimal, vitaAnimalImage } from '@/lib/vita/animals';
import { useVitaResultT } from '@/locales/vita-result';

export function VitaResultHomeCard({ legalText }: { legalText: string }) {
  const [saved, setSaved] = useState<VitaSavedResult | null>(null);
  const [status, setStatus] = useState<'loading' | 'none' | 'ok'>('loading');
  const { t: vr, locale } = useVitaResultT();
  const t = vr.home;

  useEffect(() => {
    if (!readSession()) {
      setStatus('none');
      return;
    }
    fetchLatestVita()
      .then((r) => {
        if (r) {
          setSaved(r);
          setStatus('ok');
        } else setStatus('none');
      })
      .catch(() => setStatus('none'));
  }, []);

  const legalLines = legalText.split('\n').map((l) => l.trim()).filter(Boolean);

  return (
    <section className="card-shadow mt-4 rounded-3xl card-violet px-5 py-5">
      <h2 className="text-[13.5px] font-extrabold text-stone-900 dark:text-stone-100">
        <span className="accent-bar bg-violet-500" />
        {t.title}
      </h2>

      {status === 'ok' && saved ? (
        <>
          <div className="mt-2 flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={vitaAnimalImage(saved.code)}
              alt={vitaAnimal(saved.code)?.name[locale] ?? saved.code}
              className="h-14 shrink-0 rounded-lg bg-stone-100 object-cover dark:bg-stone-800"
              style={{ width: 72 }}
            />
            <div className="min-w-0 flex-1">
              <p className="text-xl font-black tracking-[0.1em] text-stone-900 dark:text-stone-100">
                {saved.code}
              </p>
              {/* 핵심 요약(해시)을 크고 진하게 */}
              <p className="text-[15px] font-extrabold leading-tight text-violet-700 dark:text-violet-300">
                {buildVitaReport(saved, locale).text?.nickname ?? ''}
              </p>
            </div>
            {/* 상세보기 — 우측 여유 공간, 생동감 그라데이션 버튼 */}
            <Link
              href="/vita-result"
              className="grad-violet card-shadow inline-flex shrink-0 items-center gap-0.5 rounded-full px-3.5 py-2 text-[12px] font-extrabold text-white transition active:scale-[0.96]"
            >
              {t.detail}
              <ChevronRightIcon className="h-3.5 w-3.5" />
            </Link>
          </div>
        </>
      ) : (
        <p className="mt-2 text-[12px] leading-relaxed text-stone-500 dark:text-stone-400">
          {t.none}
        </p>
      )}

      {legalLines.length > 0 && (
        <div className="mt-3 border-t border-stone-100 pt-2.5 dark:border-stone-800">
          {legalLines.map((l, i) => (
            <p key={i} className="text-[10px] leading-relaxed text-stone-400 dark:text-stone-500">
              {l}
            </p>
          ))}
        </div>
      )}
    </section>
  );
}
