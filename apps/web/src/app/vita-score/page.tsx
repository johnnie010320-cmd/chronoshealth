'use client';

// VITA 건강 점수 — 홈 "VITA 건강점수" 타일 도착지.
// "건강 매트릭스 다이어그램" 인포그래픽의 레이아웃을 재현하되, 실제 API 값만 사용.
// - 종합 건강 점수: 원본 SVG 원형 진행 링(tier 색)
// - 4대 생체 나이(생체/혈관/피부/골격): AgeGauge 재사용 + delta
// - 영양상태/정신·수면: 데이터 없음 → "연동 전" 정직한 플레이스홀더(날조 금지)
// - 모든 그래픽은 원본 SVG(링·스파크라인) + AgeGauge. 스톡 이미지 미사용.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { LoginRequired } from '@/components/LoginRequired';
import { AgeGauge } from '@/components/charts/AgeGauge';
import { ClipboardIcon } from '@/components/HealthIcons';
import { readSession } from '@/lib/session';
import { fetchAvatarMe, type AvatarResponse } from '@/lib/api-client';

type Tier = 'excellent' | 'good' | 'fair' | 'attention';
type AgeKey = 'life' | 'vascular' | 'skin' | 'joint';

const TIER_META: Record<Tier, { label: string; ring: string; chip: string; verdict: string }> = {
  excellent: {
    label: '최상',
    ring: '#10b981',
    chip: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300',
    verdict: '전반적으로 매우 건강한 상태입니다.',
  },
  good: {
    label: '양호',
    ring: '#0ea5e9',
    chip: 'bg-sky-500/20 text-sky-700 dark:text-sky-300',
    verdict: '전반적으로 건강한 상태입니다.',
  },
  fair: {
    label: '보통',
    ring: '#f59e0b',
    chip: 'bg-amber-500/20 text-amber-700 dark:text-amber-300',
    verdict: '전반적으로 보통 수준이며, 꾸준한 관리가 도움이 됩니다.',
  },
  attention: {
    label: '관리 필요',
    ring: '#ef4444',
    chip: 'bg-rose-500/20 text-rose-700 dark:text-rose-300',
    verdict: '일부 영역에 관리가 필요한 상태입니다.',
  },
};

type AgeCfg = {
  key: AgeKey;
  ko: string;
  en: string;
  card: string;
  bar: string;
  left: string;
  right: string;
};

const AGES: AgeCfg[] = [
  { key: 'life', ko: '생체 나이', en: 'Biological Age', card: 'card-emerald', bar: 'bg-emerald-500', left: '건강', right: '노화' },
  { key: 'vascular', ko: '혈관 나이', en: 'Vascular Age', card: 'card-rose', bar: 'bg-rose-500', left: '혈관 탄력', right: '혈류' },
  { key: 'skin', ko: '피부 나이', en: 'Dermal Age', card: 'card-amber', bar: 'bg-amber-500', left: '수분', right: '탄력' },
  { key: 'joint', ko: '골격 나이', en: 'Bone & Joint Age', card: 'card-sky', bar: 'bg-sky-500', left: '골밀도', right: '유연성' },
];

// 종합 건강 점수 — 원본 SVG 원형 진행 링(donut arc, stroke-dasharray).
function ScoreRing({ value, color }: { value: number; color: string }) {
  const r = 84;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value)) / 100;
  const dash = `${(pct * c).toFixed(2)} ${c.toFixed(2)}`;
  return (
    <svg viewBox="0 0 200 200" className="h-48 w-48" role="img" aria-label="종합 건강 점수">
      <circle
        cx="100"
        cy="100"
        r={r}
        fill="none"
        strokeWidth={16}
        stroke="currentColor"
        className="text-stone-200 dark:text-stone-800"
      />
      <circle
        cx="100"
        cy="100"
        r={r}
        fill="none"
        strokeWidth={16}
        stroke={color}
        strokeLinecap="round"
        strokeDasharray={dash}
        transform="rotate(-90 100 100)"
      />
      <text
        x="100"
        y="96"
        textAnchor="middle"
        className="fill-stone-900 dark:fill-stone-100"
        style={{ fontSize: 46, fontWeight: 800 }}
      >
        {value}
      </text>
      <text
        x="100"
        y="124"
        textAnchor="middle"
        className="fill-stone-400 dark:fill-stone-500"
        style={{ fontSize: 15, fontWeight: 700 }}
      >
        / 100
      </text>
    </svg>
  );
}

// 장식용 스파크라인(원본 SVG polyline) — 수치 라벨 없음. younger=우상향, older=우하향 느낌.
function Sparkline({ younger }: { younger: boolean }) {
  const up = [6, 20, 14, 22, 11, 26, 18, 30];
  const down = [30, 18, 26, 11, 22, 14, 20, 6];
  const ys = younger ? up : down;
  const pts = ys.map((y, i) => `${(i * (110 / (ys.length - 1))).toFixed(1)},${y}`).join(' ');
  const stroke = younger ? '#10b981' : '#f59e0b';
  return (
    <svg viewBox="0 0 110 36" className="h-7 w-24" aria-hidden>
      <polyline points={pts} fill="none" stroke={stroke} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function VitaScorePage() {
  const [state, setState] = useState<
    | { status: 'loading' }
    | { status: 'unauth' }
    | { status: 'noReport' }
    | { status: 'ok'; data: AvatarResponse }
    | { status: 'err' }
  >({ status: 'loading' });

  useEffect(() => {
    if (!readSession()) {
      setState({ status: 'unauth' });
      return;
    }
    fetchAvatarMe()
      .then((data) => setState({ status: 'ok', data }))
      .catch((e) => {
        const code = e instanceof Error ? e.message : 'generic';
        if (code === 'NO_REPORT') setState({ status: 'noReport' });
        else if (code === 'UNAUTHORIZED') setState({ status: 'unauth' });
        else setState({ status: 'err' });
      });
  }, []);

  return (
    <AppShell title="VITA 건강 점수" decoration="dots">
      {state.status === 'loading' && (
        <div className="mt-10 flex justify-center">
          <span className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-stone-300 border-t-brand-700 dark:border-stone-700 dark:border-t-brand-400" />
        </div>
      )}

      {state.status === 'unauth' && <LoginRequired />}

      {state.status === 'err' && (
        <div className="mt-6 rounded-3xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-100">
          점수를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
        </div>
      )}

      {state.status === 'noReport' && (
        <section className="card-shadow mt-4 rounded-3xl card-sky px-5 py-8 text-center">
          <h2 className="text-base font-extrabold text-stone-900 dark:text-stone-100">
            아직 VITA 건강 점수가 없습니다
          </h2>
          <p className="mt-2 text-[12.5px] leading-relaxed text-stone-600 dark:text-stone-300">
            설문을 완료하면 나의 종합 건강 점수와 4대 생체 나이를 확인할 수 있습니다.
          </p>
          <Link
            href="/survey"
            className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-5 py-2.5 text-[13px] font-bold text-white transition active:scale-[0.98]"
          >
            <ClipboardIcon className="h-4 w-4" />
            설문 시작하기
          </Link>
        </section>
      )}

      {state.status === 'ok' && (() => {
        const d = state.data;
        const chrono = d.chronologicalAge;
        const tier = d.vitalityScore.tier as Tier;
        const meta = TIER_META[tier];

        return (
          <div className="space-y-5 pb-10 pt-3">
            {/* 1. 타이틀 + 인트로 */}
            <section>
              <h1 className="text-3xl font-black tracking-tight">
                <span className="grad-text">VITA 건강 점수</span>
              </h1>
              <p className="mt-2 text-[12.5px] leading-relaxed text-stone-600 dark:text-stone-300">
                VITA 건강점수는 귀하의 VITACODE V8 데이터를 기반으로 4가지 핵심 영역을 종합 분석하여 산출합니다.
              </p>
            </section>

            {/* 2. 종합 건강 점수 — 원형 진행 링 히어로 */}
            <section className="card-shadow relative overflow-hidden rounded-3xl grad-violet px-6 py-7">
              <span
                className="blob"
                style={{ width: 150, height: 150, right: -26, top: -30, background: 'radial-gradient(circle, #e9d5ff, transparent 70%)' }}
              />
              <span
                className="blob"
                style={{ width: 120, height: 120, left: -26, bottom: -28, background: 'radial-gradient(circle, #c4b5fd, transparent 70%)' }}
              />
              <div className="relative flex flex-col items-center text-center">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/85">
                  종합 건강 점수
                </p>
                <div className="mt-3 rounded-full bg-white/90 p-2 dark:bg-stone-900/80">
                  <ScoreRing value={d.vitalityScore.value} color={meta.ring} />
                </div>
                <span className="mt-4 inline-block rounded-full bg-white/25 px-3.5 py-1 text-[12px] font-bold text-white backdrop-blur">
                  {meta.label}
                </span>
                <p className="mt-2 text-[11px] text-white/80">실제 나이 {chrono}세 기준</p>
              </div>
            </section>

            {/* 3. 4대 생체 나이 — AgeGauge 카드 */}
            <section>
              <h2 className="mb-3 flex items-center px-1 text-[13.5px] font-extrabold text-stone-900 dark:text-stone-100">
                <span className="accent-bar bg-violet-500" />
                4대 생체 나이
              </h2>
              <div className="space-y-4">
                {AGES.map((a) => {
                  const val = d.fiveAges[a.key];
                  const delta = chrono - val; // >0 = 더 젊음
                  const younger = delta > 0;
                  return (
                    <div key={a.key} className={`card-shadow rounded-3xl ${a.card} px-5 py-5`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="text-[15px] font-extrabold text-stone-900 dark:text-stone-100">
                            <span className={`accent-bar ${a.bar}`} />
                            {a.ko}
                          </h3>
                          <p className="text-[10px] font-semibold text-stone-500 dark:text-stone-400">
                            ({a.en})
                          </p>
                          <p className="mt-2 text-4xl font-black tabular-nums text-stone-900 dark:text-stone-100">
                            {val}세
                          </p>
                          <p
                            className={`mt-0.5 text-[13px] font-extrabold ${
                              younger
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : delta < 0
                                  ? 'text-amber-600 dark:text-amber-400'
                                  : 'text-stone-500'
                            }`}
                          >
                            {delta === 0 ? '±0세' : younger ? `↓ -${delta}세` : `↑ +${-delta}세`}
                          </p>
                        </div>
                        <div className="w-[48%] shrink-0 text-stone-700 dark:text-stone-200">
                          <AgeGauge delta={delta} leftLabel={a.left} rightLabel={a.right} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* 4. "건강" 나이별 delta + 장식 스파크라인 */}
            <section>
              <h2 className="mb-3 flex items-center px-1 text-[13.5px] font-extrabold text-stone-900 dark:text-stone-100">
                <span className="accent-bar bg-emerald-500" />
                생체·혈관·피부·골격 건강
              </h2>
              <div className="card-shadow rounded-3xl card-violet px-4 py-2 divide-y divide-stone-200/70 dark:divide-stone-800/70">
                {AGES.map((a) => {
                  const val = d.fiveAges[a.key];
                  const delta = chrono - val;
                  const younger = delta > 0;
                  return (
                    <div key={a.key} className="flex items-center justify-between gap-3 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`accent-bar ${a.bar}`} />
                        <span className="text-[12.5px] font-bold text-stone-800 dark:text-stone-100">
                          {a.ko}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Sparkline younger={younger} />
                        <span
                          className={`w-14 text-right text-[14px] font-extrabold tabular-nums ${
                            younger
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : delta < 0
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-stone-500'
                          }`}
                        >
                          {delta === 0 ? '±0세' : younger ? `-${delta}세` : `+${-delta}세`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* 5. 영양상태 / 정신·수면 — 데이터 없음(연동 전) */}
            <section>
              <h2 className="mb-3 flex items-center px-1 text-[13.5px] font-extrabold text-stone-900 dark:text-stone-100">
                <span className="accent-bar bg-sky-500" />
                생활·정신 영역
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { title: '영양 상태', en: 'Nutrition' },
                  { title: '정신 · 수면', en: 'Mind & Sleep' },
                ].map((t) => (
                  <div
                    key={t.en}
                    className="card-shadow rounded-3xl border border-dashed border-stone-300 bg-white/60 px-4 py-5 text-center dark:border-stone-700 dark:bg-stone-900/40"
                  >
                    <p className="text-[13px] font-bold text-stone-700 dark:text-stone-200">
                      {t.title}
                    </p>
                    <p className="text-[9.5px] font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500">
                      {t.en}
                    </p>
                    <span className="mt-3 inline-block rounded-full bg-stone-200/80 px-3 py-1 text-[11px] font-bold text-stone-500 dark:bg-stone-800 dark:text-stone-400">
                      연동 전
                    </span>
                    <p className="mt-2 text-[10px] leading-relaxed text-stone-400 dark:text-stone-500">
                      데이터 준비중
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* 6. 총평 */}
            <section className="card-shadow rounded-3xl card-emerald px-5 py-4">
              <div className="flex items-center gap-2">
                <span className="accent-bar bg-emerald-500" />
                <span className="text-[12px] font-extrabold text-stone-700 dark:text-stone-200">총평</span>
                <span className={`ml-auto rounded-full px-2.5 py-0.5 text-[11px] font-bold ${meta.chip}`}>
                  {meta.label}
                </span>
              </div>
              <p className="mt-2 text-[13.5px] font-bold leading-relaxed text-stone-900 dark:text-stone-100">
                {meta.verdict}
              </p>
            </section>
          </div>
        );
      })()}
    </AppShell>
  );
}
