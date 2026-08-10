'use client';

// 라이프 탭용 VITA 결과 "러프 요약" 카드. 상세는 AI 진단 탭(/ai-diagnosis)에서.
// 최신 진단 결과가 없으면 진단 시작(AI 리포트) 안내.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronRightIcon, SparkleIcon } from '@/components/HealthIcons';
import { IconBadge } from '@/components/IconBadge';
import { readSession } from '@/lib/session';
import { fetchLatestVita, type VitaSavedResult } from '@/lib/api-client';
import { buildVitaReport } from '@/lib/vita/reports';

const AXIS_LABEL: Record<string, string> = {
  metabolic: '대사',
  detox: '정화',
  circulation: '순환',
  neuro: '신경',
};

export function VitaSummaryCard() {
  const [state, setState] = useState<'loading' | 'none' | 'ok' | 'unauth'>('loading');
  const [saved, setSaved] = useState<VitaSavedResult | null>(null);

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

  if (state === 'unauth' || state === 'loading') return null;

  if (state === 'none' || !saved) {
    return (
      <Link
        href="/reports"
        className="card-shadow mt-3 flex items-center gap-3 rounded-2xl bg-white px-4 py-4 transition active:scale-[0.99] dark:bg-stone-900"
      >
        <IconBadge Icon={SparkleIcon} tone="emerald" size="sm" />
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-bold text-stone-900 dark:text-stone-100">
            VITA 자가진단 시작하기
          </span>
          <span className="block text-[11px] text-stone-500 dark:text-stone-400">
            200문항으로 4대 축(대사·정화·순환·신경)을 진단하고 내 유형을 확인하세요.
          </span>
        </span>
        <ChevronRightIcon className="h-4 w-4 shrink-0 text-stone-400 dark:text-stone-500" />
      </Link>
    );
  }

  const report = buildVitaReport(saved.sectionScores);
  const head = report.headline;

  return (
    <Link
      href="/ai-diagnosis"
      className="card-shadow mt-3 block rounded-2xl bg-gradient-to-br from-brand-700 via-teal-600 to-emerald-500 px-5 py-4 text-white transition active:scale-[0.99]"
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] opacity-90">
          VITA 진단 결과
        </span>
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold opacity-90">
          상세 보기 <ChevronRightIcon className="h-3.5 w-3.5" />
        </span>
      </div>
      <div className="mt-1.5 flex items-baseline gap-2">
        <span className="text-2xl font-bold tracking-tight">{saved.code}</span>
        <span className="text-[13px] font-semibold opacity-90">{head?.nicknameKo ?? ''}</span>
      </div>
      <p className="mt-0.5 text-[11px] opacity-80">
        총점 {saved.totalScore}/600 · {head?.coreStateKo ?? ''}
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {(['metabolic', 'detox', 'circulation', 'neuro'] as const).map((axis) => {
          const impaired = report.result.axisImpaired[axis];
          return (
            <span
              key={axis}
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                impaired
                  ? 'bg-white/20 text-white'
                  : 'bg-white/90 text-emerald-700'
              }`}
            >
              {AXIS_LABEL[axis]} {impaired ? '관리' : '양호'}
            </span>
          );
        })}
      </div>
    </Link>
  );
}
