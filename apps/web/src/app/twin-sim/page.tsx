'use client';

// 디지털 트윈 시뮬레이션 — 디지털 트윈 탭의 "디지털 트윈 시뮬레이션" 버튼 목적지(첨부 Image 13).
// 바디 + 데이터 종합 소스 + 실시간 변화 예측 + 시뮬레이션 모드 + 예측 결과.
// 의료·윤리: 연동 전 수치는 날조하지 않고 "연동 준비중"으로 표기. 기본 정보만 실데이터.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { LoginRequired } from '@/components/LoginRequired';
import { DigitalTwinSim } from '@/components/twin/DigitalTwinSim';
import { ChevronRightIcon } from '@/components/HealthIcons';
import { readSession } from '@/lib/session';
import { loadHealthProfile } from '@/lib/health-profile';
import { fetchLastSurveyInput } from '@/lib/api-client';
import type { RiskSurveyRequest } from '@/lib/schemas';
import { useVitaResultT, formatRich } from '@/locales/vita-result';

type Mode = 'routine' | 'sleep' | 'diet' | 'workout';
const MODES: { key: Mode; sub: string; tile: string }[] = [
  { key: 'routine', sub: 'Routine Change', tile: 'tile-sky' },
  { key: 'sleep', sub: 'Sleep Opt', tile: 'tile-violet' },
  { key: 'diet', sub: 'Diet Adj', tile: 'tile-amber' },
  { key: 'workout', sub: 'High-int Workout', tile: 'tile-rose' },
];

function Card({ title, accent, children }: { title: string; accent: string; children: React.ReactNode }) {
  return (
    <section className="card-shadow rounded-3xl bg-white px-5 py-4 dark:bg-stone-900">
      <h2 className="mb-2 text-[13px] font-extrabold text-stone-900 dark:text-stone-100">
        <span className={`accent-bar ${accent}`} />
        {title}
      </h2>
      {children}
    </section>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1 text-[12px]">
      <span className="shrink-0 font-semibold text-stone-500 dark:text-stone-400">{k}</span>
      <span className="text-right text-stone-700 dark:text-stone-200">{v}</span>
    </div>
  );
}

export default function TwinSimPage() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [mode, setMode] = useState<Mode>('routine');
  const { t: vr } = useVitaResultT();
  const t = vr.simPage;
  const pf = vr.profileForm;
  // null = 연동 준비중, '' = 기본 정보 미입력. 언어 전환 시 즉시 반영되도록 문구는 렌더 시점에 고른다.
  const [basicParts, setBasicParts] = useState<{ age: number | null; sex: string; height: number | null; weight: number | null } | null>(null);
  const [report, setReport] = useState<RiskSurveyRequest | null>(null);
  const [reportLoaded, setReportLoaded] = useState(false);

  useEffect(() => {
    const s = !!readSession();
    setSignedIn(s);
    if (s) {
      const p = loadHealthProfile();
      setBasicParts({
        age: p?.birthYear ? new Date().getFullYear() - p.birthYear : null,
        sex: p?.sex ?? '',
        height: p?.heightCm ?? null,
        weight: p?.weightKg ?? null,
      });
      // 이전 설문 결과(신체측정값/가족력/자기인식) — 생체나이는 다른 페이지에서 표시하므로 제외.
      fetchLastSurveyInput()
        .then((r) => setReport(r))
        .catch(() => {})
        .finally(() => setReportLoaded(true));
    }
  }, []);

  const basic = (() => {
    if (!basicParts) return t.pending;
    const parts: string[] = [];
    if (basicParts.age) parts.push(vr.twinSim.age(basicParts.age));
    if (basicParts.sex) parts.push(basicParts.sex === 'male' ? pf.male : basicParts.sex === 'female' ? pf.female : pf.other);
    if (basicParts.height) parts.push(`${basicParts.height}cm`);
    if (basicParts.weight) parts.push(`${basicParts.weight}kg`);
    return parts.length ? parts.join(' · ') : t.noBasic;
  })();

  return (
    <AppShell title="Digital Twin Simulation" decoration="dots">
      {signedIn === false ? (
        <LoginRequired />
      ) : (
        <div className="space-y-4 pb-12 pt-2">
          {/* 바디 */}
          <DigitalTwinSim />

          {/* 데이터 종합 소스 */}
          <Card title={t.sourcesTitle} accent="bg-cyan-500">
            <Row k={t.basic} v={basic} />
            <div className="my-1 border-t border-stone-100 dark:border-stone-800" />
            <Row k={t.nhis} v={t.pending} />
            <Row k={t.wearable} v={t.pending} />
            <Row k={t.vita} v={t.vitaVal} />
            <p className="mt-2 text-[10px] leading-relaxed text-stone-400 dark:text-stone-500">
              {t.sourcesNote}
            </p>
            <Link
              href="/twin-sim/detail"
              className="mt-3 flex items-center justify-between gap-2 rounded-2xl bg-cyan-50 px-4 py-2.5 transition active:scale-[0.99] dark:bg-cyan-900/25"
            >
              <span className="text-[12.5px] font-bold text-cyan-800 dark:text-cyan-200">
                {t.more}
              </span>
              <ChevronRightIcon className="h-4 w-4 shrink-0 text-cyan-700 dark:text-cyan-300" />
            </Link>
          </Card>

          {/* 나의 건강 리포트 — 이전 설문 기반(신체측정값/가족력/자기인식). 생체나이는 생체나이 리포트에서 표시. */}
          <Card title={t.reportTitle} accent="bg-emerald-500">
            {!reportLoaded ? (
              <Row k={t.loading} v="…" />
            ) : !report ? (
              <div className="py-1">
                <p className="text-[12px] leading-relaxed text-stone-500 dark:text-stone-400">
                  {t.noReport}
                </p>
                <Link
                  href="/survey"
                  className="mt-2 inline-flex items-center gap-0.5 text-[12px] font-bold text-emerald-700 dark:text-emerald-300"
                >
                  {t.doSurvey}
                  <ChevronRightIcon className="h-3.5 w-3.5" />
                </Link>
              </div>
            ) : (
              (() => {
                const r = report;
                const fam: string[] = [];
                if (r.familyHistoryDiabetes) fam.push(t.famDiabetes);
                if (r.familyHistoryHypertension) fam.push(t.famHypertension);
                if (r.familyHistoryCardiovascular) fam.push(t.famCardio);
                fam.push(...(r.familyHistoryOther ?? []));
                const bp =
                  r.systolicBp != null || r.diastolicBp != null
                    ? `${r.systolicBp ?? '-'}/${r.diastolicBp ?? '-'} mmHg`
                    : null;
                return (
                  <>
                    <p className="mb-1 mt-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                      {t.measures}
                    </p>
                    {bp && <Row k={t.bp} v={bp} />}
                    {r.fastingGlucose != null && <Row k={t.glucose} v={`${r.fastingGlucose} mg/dL`} />}
                    {r.ldlCholesterol != null && <Row k={t.ldl} v={`${r.ldlCholesterol} mg/dL`} />}
                    {r.hdlCholesterol != null && <Row k={t.hdl} v={`${r.hdlCholesterol} mg/dL`} />}
                    {!bp && r.fastingGlucose == null && r.ldlCholesterol == null && r.hdlCholesterol == null && (
                      <Row k={t.measured} v={t.notEntered} />
                    )}
                    <div className="my-1 border-t border-stone-100 dark:border-stone-800" />
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                      {t.family}
                    </p>
                    <Row k={t.family} v={fam.length ? fam.join(', ') : t.none} />
                    <div className="my-1 border-t border-stone-100 dark:border-stone-800" />
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                      {t.selfView}
                    </p>
                    <Row k={t.stressK} v={t.stress[r.stressLevel] ?? r.stressLevel} />
                    <Row k={t.srhK} v={t.srh[r.selfRatedHealth] ?? r.selfRatedHealth} />
                    <p className="mt-2 text-[10px] leading-relaxed text-stone-400 dark:text-stone-500">
                      {t.bioAgeNote}
                    </p>
                  </>
                );
              })()
            )}
          </Card>

          {/* 실시간 변화 예측 */}
          <Card title={t.todayTitle} accent="bg-violet-500">
            <div className="grid grid-cols-3 gap-2">
              {[
                [t.stressIdx, t.whenLinked, 'tile-emerald'],
                [t.activity, t.whenLinked, 'tile-sky'],
                [t.metabolism, t.whenLinked, 'tile-amber'],
              ].map(([k, v, tile]) => (
                <div key={k} className={`${tile} rounded-xl px-2 py-2.5 text-center`}>
                  <p className="text-[9px] font-semibold text-white/85">{k}</p>
                  <p className="mt-1 text-[11px] font-bold leading-tight text-white">{v}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* 시뮬레이션 모드 선택 */}
          <Card title={t.modeTitle} accent="bg-sky-500">
            <div className="grid grid-cols-2 gap-2">
              {MODES.map((m) => {
                const active = mode === m.key;
                return (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => setMode(m.key)}
                    className={`${m.tile} rounded-2xl px-3 py-3 text-left transition active:scale-[0.98] ${
                      active ? 'ring-2 ring-white ring-offset-2 ring-offset-transparent' : 'opacity-80'
                    }`}
                  >
                    <p className="text-[13px] font-extrabold text-white">{t.modes[m.key]}</p>
                    <p className="text-[10px] font-medium text-white/85">{m.sub}</p>
                  </button>
                );
              })}
            </div>
            <Link
              href="/simulate"
              className="mt-3 flex items-center justify-center gap-1 rounded-2xl bg-gradient-to-r from-amber-500 to-rose-500 py-3 text-[14px] font-extrabold text-white transition active:scale-[0.99]"
            >
              {t.start}
              <ChevronRightIcon className="h-4 w-4" />
            </Link>
          </Card>

          {/* 예측 결과 */}
          <Card title={t.resultTitle} accent="bg-emerald-500">
            <p className="text-[12px] leading-relaxed text-stone-500 dark:text-stone-400">
              {formatRich(t.resultDesc, { start: <b>{t.start}</b> })}
            </p>
          </Card>
        </div>
      )}
    </AppShell>
  );
}
