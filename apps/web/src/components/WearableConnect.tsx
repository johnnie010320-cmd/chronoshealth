'use client';

// 웨어러블 연동 — UI 스캐폴드 + MOCK.
// 실연동은 집계 플랫폼(Terra/Vital 등) 계약·API키 + 사용자 OAuth 동의 경유가 필요 → 현재는 mock 표본.
// 흐름(실연동): 연동 → 제조사 선택/OAuth → 집계사 webhook → 최근 지표 요약.

import { useState } from 'react';
import { connectWearable, fetchWearableSummary, type WearableSummary } from '@/lib/api-client';

type Row = { label: string; value: string };

function toRows(s: WearableSummary): Row[] {
  const m = s.metrics;
  return [
    { label: '수면', value: `${m.sleepDurationH}시간 (점수 ${m.sleepScore})` },
    { label: '깊은수면 / REM', value: `${m.sleepDeepH}h / ${m.sleepRemH}h` },
    { label: 'HRV (rMSSD)', value: `${m.hrvMs} ms` },
    { label: '안정시 심박 / 평균', value: `${m.restingHr} / ${m.avgHr} bpm` },
    { label: '걸음 / 활동에너지', value: `${m.steps.toLocaleString()}보 / ${m.activeEnergyKcal} kcal` },
    { label: '산소포화도(SpO2)', value: `${m.spo2}%` },
    { label: '호흡수 / 피부온도Δ', value: `${m.respiratoryRate}/분 / ${m.skinTempDeltaC}°C` },
  ];
}

const PROVIDERS = ['Apple Watch', '갤럭시 워치/링', 'Oura', 'Garmin', 'Withings', 'Fitbit', 'Whoop'];

export function WearableConnect() {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [summary, setSummary] = useState<WearableSummary | null>(null);

  async function handleConnect() {
    setState('loading');
    try {
      await connectWearable(); // 실연동 시 authUrl 로 리다이렉트. mock 은 즉시 연결.
      const s = await fetchWearableSummary();
      setSummary(s);
      setState('done');
    } catch {
      setState('error');
    }
  }

  return (
    <div className="space-y-3">
      <div className="card-shadow rounded-2xl bg-white px-4 py-4 dark:bg-stone-900">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-200">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
              <rect x="6" y="7" width="12" height="10" rx="2" />
              <path d="M9 7V4h6v3M9 17v3h6v-3" />
              <path d="M12 11v2" />
            </svg>
          </span>
          <div className="min-w-0">
            <p className="text-[14px] font-bold text-stone-900 dark:text-stone-100">웨어러블 연동</p>
            <p className="text-[11px] text-stone-500 dark:text-stone-400">
              스마트워치·링의 수면·심박·활동 데이터를 불러와 VITA·AI 리포트에 반영합니다.
            </p>
          </div>
        </div>

        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {PROVIDERS.map((p) => (
            <span
              key={p}
              className="rounded-full border border-stone-200 bg-stone-50 px-2 py-0.5 text-[10px] font-medium text-stone-500 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-400"
            >
              {p}
            </span>
          ))}
        </div>

        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
          현재는 <b>미리보기(Mock)</b> 단계입니다. 실제 연동은 집계 플랫폼(Terra·Vital 등) 계약 및
          제조사 OAuth 동의 후 활성화됩니다.
        </div>

        <button
          type="button"
          onClick={() => void handleConnect()}
          disabled={state === 'loading'}
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 py-3 text-[14px] font-semibold text-white transition active:scale-[0.98] disabled:opacity-60"
        >
          {state === 'loading' ? (
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/50 border-t-white" />
          ) : (
            <span>웨어러블 연동하기 (Mock)</span>
          )}
        </button>
        {state === 'error' && (
          <p className="mt-2 text-[12px] text-rose-600 dark:text-rose-300">
            연동에 실패했습니다. 다시 시도해 주세요.
          </p>
        )}
      </div>

      {state === 'done' && summary && (
        <div className="card-shadow rounded-2xl bg-white px-4 py-3 dark:bg-stone-900">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[12px] font-semibold text-stone-700 dark:text-stone-300">최근 웨어러블 지표</p>
            <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-stone-500 dark:bg-stone-800 dark:text-stone-400">
              MOCK
            </span>
          </div>
          <dl className="divide-y divide-stone-100 dark:divide-stone-800">
            {toRows(summary).map((r) => (
              <div key={r.label} className="flex items-center justify-between py-2">
                <dt className="text-[12px] text-stone-500 dark:text-stone-400">{r.label}</dt>
                <dd className="text-[13px] font-semibold tabular-nums text-stone-900 dark:text-stone-100">
                  {r.value}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-2 text-[10px] leading-relaxed text-stone-400 dark:text-stone-500">
            실연동 시 위 값이 VITA 8영역(수면)·6·7영역(순환·부신) 등에 자동 반영됩니다(현재 표본).
          </p>
        </div>
      )}
    </div>
  );
}
