'use client';

// 라이프 탭용 VITA 결과 "러프 요약" 카드. 상세는 AI 진단 탭(/ai-diagnosis)에서.
// 최신 진단 결과가 없으면 진단 시작(AI 리포트) 안내.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronRightIcon } from '@/components/HealthIcons';
import { readSession } from '@/lib/session';
import { fetchLatestVita, type VitaSavedResult } from '@/lib/api-client';
import { buildVitaReport } from '@/lib/vita/reports';
import { VITA_AXIS_META } from '@/lib/vita/engine';
import { vitaAnimalImage, vitaAnimalName } from '@/lib/vita/animals';
import { vitaAxisTitle } from '@/lib/vita/i18n';
import { useVitaResultT } from '@/locales/vita-result';

export function VitaSummaryCard() {
  const [state, setState] = useState<'loading' | 'none' | 'ok' | 'unauth'>('loading');
  const [saved, setSaved] = useState<VitaSavedResult | null>(null);
  const { t: vr, locale } = useVitaResultT();
  const t = vr.lifeCard;

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

  // 결과가 있을 때만 요약을 노출한다. '시작하기' 진입은 AI 리포트 탭에 있으므로 라이프에선 생략(중복 방지).
  if (state !== 'ok' || !saved) return null;

  const report = buildVitaReport(saved, locale);
  const head = report.headline;
  const tx = report.text;

  return (
    <Link
      href="/ai-diagnosis"
      className="card-shadow mt-3 block rounded-2xl bg-gradient-to-br from-brand-700 via-teal-600 to-emerald-500 px-5 py-4 text-white transition active:scale-[0.99]"
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] opacity-90">
          {t.eyebrow}
        </span>
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold opacity-90">
          {t.detail} <ChevronRightIcon className="h-3.5 w-3.5" />
        </span>
      </div>
      <div className="mt-2 flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={vitaAnimalImage(saved.code)}
          alt=""
          className="h-16 w-20 shrink-0 rounded-xl bg-white/10 object-cover ring-1 ring-white/30"
        />
        <div className="min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight">{saved.code}</span>
            <span className="truncate text-[13px] font-semibold opacity-90">
              {vitaAnimalName(saved.code, locale)} · {tx?.nickname ?? ''}
            </span>
          </div>
          <p className="mt-0.5 text-[11px] opacity-80">
            {t.total(saved.totalScore)} · {head?.nicknameEn ?? tx?.coreState ?? ''}
          </p>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {VITA_AXIS_META.map((m) => {
          const secondary = report.result.axisSecondary[m.axis];
          const eng = secondary ? m.secondary : m.primary;
          return (
            <span
              key={m.axis}
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                secondary
                  ? 'bg-white/20 text-white'
                  : 'bg-white/90 text-emerald-700'
              }`}
            >
              {vitaAxisTitle(m.axis, locale).label} · {eng.letter}
            </span>
          );
        })}
      </div>
    </Link>
  );
}
