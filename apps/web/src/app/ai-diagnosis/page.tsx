'use client';

// AI 진단 탭 — VITA 16유형 "상세" 리포트(라이프는 러프 요약).
// 입력은 AI 리포트 탭. 결과 없으면 진단 시작 안내.
// 의료·윤리: 본 리포트는 건강 위험 추정이며 의학적 진단이 아니다.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { LoginRequired } from '@/components/LoginRequired';
import { ChevronRightIcon } from '@/components/HealthIcons';
import { readSession } from '@/lib/session';
import { fetchLatestVita, type VitaSavedResult } from '@/lib/api-client';
import { buildVitaReport, type VitaReport } from '@/lib/vita/reports';
import type { VitaBand } from '@/lib/vita/engine';

const BAND_LABEL: Record<VitaBand, string> = {
  optimal: '최적',
  caution: '주의',
  warning: '경고',
  danger: '위험',
};
const BAND_BAR: Record<VitaBand, string> = {
  optimal: 'bg-emerald-500',
  caution: 'bg-brand-500',
  warning: 'bg-amber-500',
  danger: 'bg-rose-500',
};
const BAND_CHIP: Record<VitaBand, string> = {
  optimal: 'text-emerald-700 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-900/30',
  caution: 'text-brand-700 bg-brand-50 dark:text-brand-200 dark:bg-brand-900/30',
  warning: 'text-amber-700 bg-amber-50 dark:text-amber-300 dark:bg-amber-900/30',
  danger: 'text-rose-700 bg-rose-50 dark:text-rose-300 dark:bg-rose-900/30',
};

export default function AiDiagnosisPage() {
  const [state, setState] = useState<'loading' | 'unauth' | 'none' | 'ok'>('loading');
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

  const report: VitaReport | null = saved ? buildVitaReport(saved.sectionScores) : null;

  return (
    <AppShell title="AI 진단" decoration="dots">
      {state === 'unauth' ? (
        <LoginRequired />
      ) : state === 'loading' ? (
        <div className="mt-10 flex justify-center">
          <span className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-stone-300 border-t-brand-700 dark:border-stone-700 dark:border-t-brand-400" />
        </div>
      ) : state === 'none' || !report || !saved ? (
        <section className="card-shadow mt-6 rounded-3xl card-violet p-8 text-center">
          <h1 className="text-xl font-bold text-stone-900 dark:text-stone-100">아직 진단 결과가 없어요</h1>
          <p className="mt-3 text-sm leading-relaxed text-stone-600 dark:text-stone-400">
            AI 리포트 탭에서 VITA 자가진단(200문항)을 완료하면 여기에서 상세 리포트를 볼 수 있습니다.
          </p>
          <Link
            href="/reports"
            className="mt-6 inline-flex items-center gap-1 rounded-2xl bg-stone-900 px-5 py-3 text-sm font-semibold text-white transition active:scale-[0.98] dark:bg-white dark:text-stone-900"
          >
            <span>진단 시작하기</span>
            <ChevronRightIcon className="h-4 w-4" />
          </Link>
        </section>
      ) : (
        <div className="space-y-4 pb-10 pt-3">
          {/* 유형 헤드라인 */}
          <section className="card-shadow rounded-3xl bg-gradient-to-br from-brand-700 via-teal-600 to-emerald-500 px-6 py-6 text-white">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] opacity-90">VITA 진단 유형</p>
            <div className="mt-1.5 flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight">{saved.code}</span>
              <span className="text-[15px] font-semibold opacity-95">{report.headline?.nicknameKo}</span>
            </div>
            <p className="mt-1 text-[12px] leading-relaxed text-white/85">{report.headline?.coreStateKo}</p>
            <p className="mt-2 text-[12px] font-semibold">총점 {saved.totalScore} / 600</p>
            <p className="mt-2 text-[10px] leading-relaxed text-white/70">
              {new Date(`${saved.createdAt.replace(' ', 'T')}Z`).toLocaleString()} 진단 · {report.headline?.keySymptomsKo}
            </p>
          </section>

          {/* 영역별 점수 */}
          <section className="card-shadow rounded-2xl bg-white px-4 py-4 dark:bg-stone-900">
            <h2 className="mb-3 text-[12px] font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400">
              영역별 점수 (0~60)
            </h2>
            <div className="space-y-2.5">
              {report.sectionRows.map((r) => (
                <div key={r.id}>
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="font-medium text-stone-700 dark:text-stone-300">
                      {r.no}. {r.titleKo}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="tabular-nums text-stone-500 dark:text-stone-400">{r.score}</span>
                      <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${BAND_CHIP[r.band]}`}>
                        {BAND_LABEL[r.band]}
                      </span>
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800">
                    <div
                      className={`h-full rounded-full ${BAND_BAR[r.band]}`}
                      style={{ width: `${Math.min(100, (r.score / 60) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 4대 축 해설 */}
          <section className="space-y-3">
            <h2 className="px-1 text-[12px] font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400">
              4대 축 해설
            </h2>
            {report.blocks.map((b) => (
              <div
                key={b.key}
                className={`card-shadow rounded-2xl border-l-4 bg-white px-4 py-3 dark:bg-stone-900 ${
                  b.impaired ? 'border-amber-400' : 'border-emerald-400'
                }`}
              >
                <p className="text-[13px] font-bold text-stone-900 dark:text-stone-100">{b.title}</p>
                <p className="mt-1 text-[12px] leading-relaxed text-stone-600 dark:text-stone-300">{b.summary}</p>
                <p className="mt-1.5 text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">{b.note}</p>
              </div>
            ))}
          </section>

          {/* 먹을 것 / 피할 것 */}
          <section className="grid grid-cols-1 gap-3">
            <ListCard title="도움이 되는 식품" tone="emerald" items={report.eat} />
            <ListCard title="줄이면 좋은 식품" tone="rose" items={report.avoid} />
          </section>

          {/* 영양 성분(참고) */}
          <section className="card-shadow rounded-2xl bg-white px-4 py-4 dark:bg-stone-900">
            <h2 className="mb-2 text-[12px] font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400">
              참고 영양 성분
            </h2>
            <div className="space-y-2">
              {report.supplements.map((s, i) => (
                <div key={`${s.name}-${i}`} className="flex items-start gap-2">
                  <span className="mt-0.5 shrink-0 rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold text-brand-700 dark:bg-brand-900/40 dark:text-brand-200">
                    {s.timing}
                  </span>
                  <span className="min-w-0">
                    <span className="text-[13px] font-semibold text-stone-800 dark:text-stone-100">{s.name}</span>
                    <span className="block text-[11px] text-stone-500 dark:text-stone-400">{s.role}</span>
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-2 text-[10px] leading-relaxed text-stone-400 dark:text-stone-500">
              정보 제공 목적이며 복용 전 전문가 상담을 권장합니다.
            </p>
          </section>

          {/* 정밀검사 */}
          <ListCard title="참고 정밀검사 항목" tone="sky" items={report.tests} />

          {/* 목표 */}
          <section className="card-shadow rounded-2xl bg-white px-4 py-4 dark:bg-stone-900">
            <h2 className="mb-2 text-[12px] font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400">
              추구 목표
            </h2>
            <p className="text-[12px] leading-relaxed text-stone-700 dark:text-stone-300">{report.goalShort}</p>
            <p className="mt-1.5 text-[12px] leading-relaxed text-stone-700 dark:text-stone-300">{report.goalLong}</p>
          </section>

          <div className="rounded-2xl border border-stone-200/70 bg-white/70 px-4 py-3 text-[11px] leading-relaxed text-stone-600 dark:border-stone-800 dark:bg-stone-900/60 dark:text-stone-400">
            본 리포트는 자가 진단 응답을 바탕으로 한 <b>건강 위험 추정</b>이며 의학적 진단이 아닙니다.
            증상이 지속되면 전문의 상담을 권장합니다.
            <span className="mt-1 block text-[10px] text-stone-400 dark:text-stone-500">
              VITA 분류 체계 출처: VITA healthcare
            </span>
          </div>

          <div className="flex justify-center">
            <Link
              href="/reports"
              className="inline-flex items-center gap-1 text-[12px] font-semibold text-brand-700 dark:text-brand-300"
            >
              <span>다시 진단하기</span>
              <ChevronRightIcon className="h-3 w-3" />
            </Link>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function ListCard({ title, tone, items }: { title: string; tone: 'emerald' | 'rose' | 'sky'; items: string[] }) {
  const dot =
    tone === 'emerald' ? 'bg-emerald-500' : tone === 'rose' ? 'bg-rose-500' : 'bg-sky-500';
  return (
    <section className="card-shadow rounded-2xl bg-white px-4 py-4 dark:bg-stone-900">
      <h2 className="mb-2 text-[12px] font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400">
        {title}
      </h2>
      <ul className="space-y-1.5">
        {items.map((it, i) => (
          <li key={`${it}-${i}`} className="flex items-start gap-2 text-[13px] text-stone-700 dark:text-stone-200">
            <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
