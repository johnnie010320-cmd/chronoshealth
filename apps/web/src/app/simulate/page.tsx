'use client';

// What-if 시뮬레이터 직접 진입 — 저장된 마지막 설문 입력을 base 로 불러와
// 설문 재제출 없이 바로 습관 조정 시뮬레이션. 저장 입력이 없으면 설문으로 유도.
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { LoginRequired } from '@/components/LoginRequired';
import { WhatIfPanel } from '@/components/result/WhatIfPanel';
import { ChevronRightIcon, ActivityIcon } from '@/components/HealthIcons';
import { useI18n } from '@/lib/i18n';
import { readSession } from '@/lib/session';
import { fetchLastSurveyInput, submitSimulate } from '@/lib/api-client';
import type { RiskSurveyRequest, RiskSurveyResponse } from '@/lib/schemas';

const STRESS_KO: Record<string, string> = { low: '낮음', medium: '보통', high: '높음' };
const SRH_KO: Record<string, string> = {
  excellent: '매우 좋음',
  good: '좋음',
  fair: '보통',
  poor: '나쁨',
};
const CAT_CLASS: Record<'low' | 'moderate' | 'high', string> = {
  low: 'bg-emerald-50 text-emerald-900 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-100 dark:border-emerald-900',
  moderate: 'bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950/40 dark:text-amber-100 dark:border-amber-900',
  high: 'bg-rose-50 text-rose-900 border-rose-200 dark:bg-rose-950/40 dark:text-rose-100 dark:border-rose-900',
};

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-start justify-between gap-3 py-0.5 text-[12px]">
      <span className="shrink-0 font-semibold text-stone-500 dark:text-stone-400">{k}</span>
      <span className="text-right text-stone-700 dark:text-stone-200">{v}</span>
    </div>
  );
}

type State =
  | { status: 'loading' }
  | { status: 'unauth' }
  | { status: 'noInput' }
  | { status: 'ok'; base: RiskSurveyRequest }
  | { status: 'err' };

export default function SimulatePage() {
  const { t } = useI18n();
  const M = t.simulate;
  const R = t.result;
  const [state, setState] = useState<State>({ status: 'loading' });
  const [report, setReport] = useState<RiskSurveyResponse | null>(null);

  useEffect(() => {
    if (!readSession()) {
      setState({ status: 'unauth' });
      return;
    }
    fetchLastSurveyInput()
      .then((input) => {
        if (!input) {
          setState({ status: 'noInput' });
          return;
        }
        setState({ status: 'ok', base: input });
        // 재제출 없이 현재 리포트(기준선) 확보 → "나의 리포트" 표시.
        submitSimulate(input, {})
          .then((res) => setReport(res.baseline))
          .catch(() => {});
      })
      .catch(() => setState({ status: 'err' }));
  }, []);

  return (
    <AppShell title={M.pageTitle} showBack backHref="/reports" decoration="dots">
      {state.status === 'loading' && (
        <div className="mt-10 flex justify-center">
          <span className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-stone-300 border-t-brand-700 dark:border-stone-700 dark:border-t-brand-400" />
        </div>
      )}

      {state.status === 'unauth' && <LoginRequired />}

      {(state.status === 'noInput' || state.status === 'err') && (
        <section className="card-shadow mt-6 rounded-3xl card-violet p-8 text-center">
          <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand-700 dark:bg-brand-900 dark:text-brand-200">
            <ActivityIcon className="h-7 w-7" />
          </span>
          <h1 className="mt-4 text-xl font-bold text-stone-900 dark:text-stone-100">
            {M.noInputTitle}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-stone-600 dark:text-stone-400">
            {M.noInputBody}
          </p>
          <Link
            href="/survey"
            className="mt-6 inline-flex items-center gap-1 rounded-2xl bg-stone-900 px-5 py-3 text-sm font-semibold text-white transition active:scale-[0.98] dark:bg-white dark:text-stone-900"
          >
            <span>{M.noInputCta}</span>
            <ChevronRightIcon className="h-4 w-4" />
          </Link>
        </section>
      )}

      {state.status === 'ok' && (
        <div className="space-y-4 pb-10 pt-4">
          <p className="px-1 text-[13px] leading-relaxed text-stone-600 dark:text-stone-400">
            {M.intro}
          </p>

          {/* 나의 리포트 — 이전 설문 기준(재제출 불필요) 질병 위험·개선 제안 */}
          <section className="card-shadow rounded-3xl card-emerald px-5 py-5">
            <h2 className="flex items-center text-[14px] font-extrabold text-stone-900 dark:text-stone-100">
              <span className="accent-bar bg-emerald-500" />
              나의 리포트
            </h2>
            {report ? (
              <>
                <p className="mb-1.5 mt-3 text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                  {R.diseaseRiskTitle}
                </p>
                <div className="space-y-2">
                  {report.diseaseRisk.map((risk) => (
                    <div key={risk.code} className={`rounded-2xl border p-3.5 ${CAT_CLASS[risk.riskCategory]}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[10px] font-medium uppercase tracking-widest opacity-70">
                            {risk.code}
                          </p>
                          <p className="mt-0.5 text-[13px] font-semibold">{risk.label}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-lg font-bold leading-none">
                            {(risk.probability5y * 100).toFixed(1)}%
                          </p>
                          <p className="mt-0.5 text-[9px] uppercase tracking-widest opacity-70">
                            {R.diseaseRiskCategory[risk.riskCategory]} · {R.diseaseRisk5yLabel}
                          </p>
                        </div>
                      </div>
                      {risk.modifiableFactors.length > 0 && (
                        <p className="mt-1.5 text-[11px] opacity-80">
                          {R.improvementFactorPrefix}: {risk.modifiableFactors.join(', ')}
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                <p className="mb-1.5 mt-4 text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                  {R.improvementTitle}
                </p>
                <div className="space-y-2">
                  {report.improvement.map((imp, idx) => (
                    <div key={idx} className="flex items-start justify-between gap-3 rounded-2xl bg-white px-3.5 py-3 dark:bg-stone-900">
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-stone-900 dark:text-stone-100">
                          {imp.action}
                        </p>
                        <p className="mt-0.5 text-[10.5px] text-stone-500">
                          {R.improvementConfidence} {imp.confidence}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-[13px] font-bold text-emerald-600 dark:text-emerald-400">
                          {imp.expectedBioAgeDeltaYears >= 0 ? '+' : ''}
                          {imp.expectedBioAgeDeltaYears.toFixed(1)} {R.bioAgeYearSuffix}
                        </p>
                        <p className="text-[9px] uppercase tracking-widest text-stone-400">
                          {R.improvementBioAgeUnit}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-[10px] text-stone-400 dark:text-stone-500">
                  {R.modelLabel}: {report.modelVersion} · {R.reportIdLabel} {report.reportId.slice(0, 8)}
                </p>
              </>
            ) : (
              <p className="mt-3 text-[12px] text-stone-500 dark:text-stone-400">리포트를 불러오는 중…</p>
            )}
          </section>

          {/* 내가 입력한 데이터 — 신체측정값/자기인식 */}
          <section className="card-shadow rounded-3xl bg-white px-5 py-4 dark:bg-stone-900">
            <h2 className="flex items-center text-[14px] font-extrabold text-stone-900 dark:text-stone-100">
              <span className="accent-bar bg-sky-500" />
              내가 입력한 데이터
            </h2>
            {(() => {
              const b = state.base;
              const bp =
                b.systolicBp != null || b.diastolicBp != null
                  ? `${b.systolicBp ?? '-'}/${b.diastolicBp ?? '-'} mmHg`
                  : null;
              const noVitals =
                !bp && b.fastingGlucose == null && b.ldlCholesterol == null && b.hdlCholesterol == null;
              return (
                <>
                  <p className="mb-1 mt-2 text-[10px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
                    신체측정값
                  </p>
                  {bp && <Row k="혈압" v={bp} />}
                  {b.fastingGlucose != null && <Row k="공복 혈당" v={`${b.fastingGlucose} mg/dL`} />}
                  {b.ldlCholesterol != null && <Row k="LDL 콜레스테롤" v={`${b.ldlCholesterol} mg/dL`} />}
                  {b.hdlCholesterol != null && <Row k="HDL 콜레스테롤" v={`${b.hdlCholesterol} mg/dL`} />}
                  {noVitals && <Row k="측정값" v="입력 안 함" />}
                  <div className="my-2 border-t border-stone-100 dark:border-stone-800" />
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
                    자기인식
                  </p>
                  <Row k="스트레스" v={STRESS_KO[b.stressLevel] ?? b.stressLevel} />
                  <Row k="주관적 건강" v={SRH_KO[b.selfRatedHealth] ?? b.selfRatedHealth} />
                </>
              );
            })()}
          </section>

          <WhatIfPanel base={state.base} />
          <Link
            href="/survey?redo=1"
            className="grad-sunset card-shadow relative flex items-center justify-between gap-2 overflow-hidden rounded-3xl px-5 py-5 transition active:scale-[0.99]"
          >
            <span
              className="blob"
              style={{ width: 120, height: 120, right: -10, top: -24, background: 'radial-gradient(circle, #fde68a, transparent 70%)' }}
            />
            <span className="relative z-10 min-w-0">
              <span className="block text-[15px] font-extrabold">{M.retakeCta}</span>
              <span className="mt-0.5 block text-[11px] text-white/85">
                기본 정보·생활 습관은 디지털 트윈에서 자동 반영되어 건너뜁니다
              </span>
            </span>
            <span className="relative z-10 inline-flex shrink-0 items-center gap-0.5 rounded-full bg-white px-3.5 py-1.5 text-[12px] font-extrabold text-rose-600">
              다시
              <ChevronRightIcon className="h-3.5 w-3.5" />
            </span>
          </Link>
        </div>
      )}
    </AppShell>
  );
}
