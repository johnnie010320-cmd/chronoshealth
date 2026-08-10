'use client';

// 국민건강보험공단(건강보험25시) 검진 데이터 연동 — UI 스캐폴드 + MOCK.
// 실연동은 인증중개사(CODEF/Tilko) 간편인증 경유 계약·키가 필요 → 현재는 mock 표본 표시.
// "어떠케어" 방식(간편인증 → 검진/투약 스크래핑)을 참조한 흐름의 자리표시.

import { useState } from 'react';
import { fetchNhisCheckup, type NhisCheckup } from '@/lib/api-client';

type Row = { label: string; value: string };

function toRows(c: NhisCheckup): Row[] {
  return [
    { label: '검진일', value: c.examDate },
    { label: '키 / 몸무게', value: `${c.heightCm}cm / ${c.weightKg}kg` },
    { label: 'BMI / 허리둘레', value: `${c.bmi} / ${c.waistCm}cm` },
    { label: '혈압(수축/이완)', value: `${c.systolicBp} / ${c.diastolicBp} mmHg` },
    { label: '공복혈당', value: `${c.fastingGlucose} mg/dL` },
    { label: '총콜레스테롤', value: `${c.totalCholesterol} mg/dL` },
    { label: 'HDL / LDL', value: `${c.hdl} / ${c.ldl} mg/dL` },
    { label: '중성지방', value: `${c.triglyceride} mg/dL` },
    { label: '간수치(AST/ALT/γGTP)', value: `${c.ast} / ${c.alt} / ${c.gtp}` },
    { label: '흡연 / 음주', value: `${c.smoking} / ${c.drinking}` },
  ];
}

export function NhisConnect() {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [rows, setRows] = useState<Row[]>([]);

  async function handleLoad() {
    setState('loading');
    try {
      const res = await fetchNhisCheckup();
      setRows(toRows(res.checkup));
      setState('done');
    } catch {
      setState('error');
    }
  }

  return (
    <div className="space-y-3">
      <div className="card-shadow rounded-2xl bg-white px-4 py-4 dark:bg-stone-900">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-200">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
              <path d="M12 3 4 6v6c0 4.5 3.4 7.9 8 9 4.6-1.1 8-4.5 8-9V6z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
          </span>
          <div className="min-w-0">
            <p className="text-[14px] font-bold text-stone-900 dark:text-stone-100">
              국민건강보험공단 검진 연동
            </p>
            <p className="text-[11px] text-stone-500 dark:text-stone-400">
              건강보험25시 검진 데이터를 불러와 건강 기본정보에 반영합니다.
            </p>
          </div>
        </div>

        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
          현재는 <b>미리보기(Mock)</b> 단계입니다. 실제 연동은 간편인증(PASS·카카오·네이버) 및
          인증중개사 계약 후 활성화됩니다.
        </div>

        <button
          type="button"
          onClick={() => void handleLoad()}
          disabled={state === 'loading'}
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-sky-600 px-5 py-3 text-[14px] font-semibold text-white transition active:scale-[0.98] disabled:opacity-60"
        >
          {state === 'loading' ? (
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/50 border-t-white" />
          ) : (
            <span>간편인증으로 불러오기 (Mock)</span>
          )}
        </button>
        {state === 'error' && (
          <p className="mt-2 text-[12px] text-rose-600 dark:text-rose-300">
            불러오기에 실패했습니다. 다시 시도해 주세요.
          </p>
        )}
      </div>

      {state === 'done' && (
        <div className="card-shadow rounded-2xl bg-white px-4 py-3 dark:bg-stone-900">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[12px] font-semibold text-stone-700 dark:text-stone-300">
              불러온 검진 데이터
            </p>
            <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-stone-500 dark:bg-stone-800 dark:text-stone-400">
              MOCK
            </span>
          </div>
          <dl className="divide-y divide-stone-100 dark:divide-stone-800">
            {rows.map((r) => (
              <div key={r.label} className="flex items-center justify-between py-2">
                <dt className="text-[12px] text-stone-500 dark:text-stone-400">{r.label}</dt>
                <dd className="text-[13px] font-semibold tabular-nums text-stone-900 dark:text-stone-100">
                  {r.value}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-2 text-[10px] leading-relaxed text-stone-400 dark:text-stone-500">
            실연동 시 위 값이 건강 기본정보 및 AI 리포트 산출에 자동 반영됩니다(현재 표본).
          </p>
        </div>
      )}
    </div>
  );
}
