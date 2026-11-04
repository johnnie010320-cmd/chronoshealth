'use client';

// 생애 예상 의료비 — 홈 "생애 의료비 계산" 타일의 도착지.
// "생애 예상 의료비 리포트" 인포그래픽 레이아웃을 재현하되, 값은 전부 API 실데이터(fetchAvatarMe)만 사용.
// 모든 그래픽은 원본 SVG(스톡 이미지 미사용). 날조 수치 없음 — 통계 추정값.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { LoginRequired } from '@/components/LoginRequired';
import { CoinIcon, ClipboardIcon, ChevronRightIcon } from '@/components/HealthIcons';
import { readSession } from '@/lib/session';
import { fetchAvatarMe, type AvatarResponse } from '@/lib/api-client';

// KRW 금액을 사람이 읽기 좋은 억/만원 단위 라벨로. 날조 없이 표시 변환만 수행.
function formatKrwCompact(krw: number): string {
  if (krw >= 100_000_000) return `${(krw / 100_000_000).toFixed(1)}억`;
  const man = Math.round(krw / 10_000);
  return `${man.toLocaleString()}만`;
}

// perDecadeKrw 막대 차트 — 전부 원본 SVG. 막대는 최댓값 기준으로 스케일.
function DecadeBarChart({
  values,
  labels,
}: {
  values: number[];
  labels: string[];
}) {
  const W = 320;
  const H = 188;
  const padL = 10;
  const padR = 10;
  const padTop = 22; // 막대 위 값 라벨 공간
  const padBottom = 26; // x축 라벨 공간
  const plotW = W - padL - padR;
  const plotH = H - padTop - padBottom;
  const baseY = padTop + plotH;
  const max = Math.max(...values, 1);
  const n = values.length;
  const band = plotW / n;
  const barW = Math.min(band * 0.56, 34);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-auto w-full"
      role="img"
      aria-label="연령 구간별 예상 의료비 막대 그래프"
    >
      <defs>
        <linearGradient id="costBar" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fb7185" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
      </defs>

      {/* x축 기준선 */}
      <line
        x1={padL}
        y1={baseY}
        x2={W - padR}
        y2={baseY}
        className="stroke-stone-300 dark:stroke-stone-700"
        strokeWidth={1}
      />

      {values.map((v, i) => {
        const h = max > 0 ? (v / max) * plotH : 0;
        const cx = padL + band * i + band / 2;
        const x = cx - barW / 2;
        const y = baseY - h;
        return (
          <g key={i}>
            {/* 값 라벨(억/만원) */}
            <text
              x={cx}
              y={y - 6}
              textAnchor="middle"
              className="fill-stone-600 dark:fill-stone-300"
              style={{ fontSize: 8.5, fontWeight: 700 }}
            >
              {formatKrwCompact(v)}
            </text>
            {/* 막대 */}
            <rect
              x={x}
              y={y}
              width={barW}
              height={Math.max(h, 2)}
              rx={4}
              fill="url(#costBar)"
            />
            {/* x축 구간 라벨 */}
            <text
              x={cx}
              y={baseY + 15}
              textAnchor="middle"
              className="fill-stone-500 dark:fill-stone-400"
              style={{ fontSize: 8.5, fontWeight: 600 }}
            >
              {labels[i]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// 항목별 구성 — 표준 의료비 지출 비율(합계 1.0)을 실제 총액에 적용한 추정.
// 개인별 실제 구성이 아니라 표준 비율 기반 추정임을 화면에 명시한다(날조 아님, 모델 가정).
const COST_SPLIT: { label: string; ratio: number; tile: string; bar: string }[] = [
  { label: '질환 관리', ratio: 0.577, tile: 'tile-rose', bar: '#f43f5e' },
  { label: '수술 / 치료', ratio: 0.152, tile: 'tile-amber', bar: '#f59e0b' },
  { label: '예방 / 검진', ratio: 0.117, tile: 'tile-sky', bar: '#0ea5e9' },
  { label: '약제비', ratio: 0.107, tile: 'tile-violet', bar: '#8b5cf6' },
  { label: '장기 요양', ratio: 0.047, tile: 'tile-emerald', bar: '#10b981' },
];

export default function MedicalCostPage() {
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
    <AppShell title="생애 예상 의료비" decoration="dots">
      {state.status === 'loading' && (
        <div className="mt-10 flex justify-center">
          <span className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-stone-300 border-t-brand-700 dark:border-stone-700 dark:border-t-brand-400" />
        </div>
      )}

      {state.status === 'unauth' && <LoginRequired />}

      {state.status === 'err' && (
        <div className="mt-6 rounded-3xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-100">
          리포트를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
        </div>
      )}

      {state.status === 'noReport' && (
        <section className="card-shadow mt-4 rounded-3xl card-rose px-5 py-8 text-center">
          <h2 className="text-base font-extrabold text-stone-900 dark:text-stone-100">
            아직 생애 의료비 리포트가 없습니다
          </h2>
          <p className="mt-2 text-[12.5px] leading-relaxed text-stone-600 dark:text-stone-300">
            설문을 완료하면 나의 생애 예상 의료비를 확인할 수 있습니다.
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
        const cost = d.lifetimeMedicalCost;

        return (
          <div className="space-y-5 pb-10 pt-3">
            {/* 1. 타이틀 히어로 (grad-sunset + blob) */}
            <section className="card-shadow relative overflow-hidden rounded-3xl grad-sunset px-6 py-7">
              <span
                className="blob"
                style={{
                  width: 170,
                  height: 170,
                  right: -28,
                  top: -36,
                  background: 'radial-gradient(circle, #fecaca, transparent 70%)',
                }}
              />
              <span
                className="blob"
                style={{
                  width: 120,
                  height: 120,
                  left: -26,
                  bottom: -30,
                  background: 'radial-gradient(circle, #fde68a, transparent 70%)',
                }}
              />
              <div className="relative">
                <div className="flex items-center gap-2 text-white/85">
                  <CoinIcon className="h-4 w-4" />
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em]">
                    LIFETIME MEDICAL COST
                  </p>
                </div>
                <h1 className="mt-2 text-2xl font-black leading-tight tracking-tight text-white">
                  생애 예상 의료비
                </h1>
                <p className="mt-1 text-[12px] text-white/80">
                  {d.name ? `${d.name} · ` : ''}실제 나이 {d.chronologicalAge}세 기준 통계 추정
                </p>
              </div>
            </section>

            {!cost && (
              <section className="card-shadow rounded-3xl card-amber px-5 py-8 text-center">
                <h2 className="text-base font-extrabold text-stone-900 dark:text-stone-100">
                  리포트 준비중
                </h2>
                <p className="mt-2 text-[12.5px] leading-relaxed text-stone-600 dark:text-stone-300">
                  생애 예상 의료비는 아직 산출되지 않았습니다. 데이터가 쌓이면 자동으로 표시됩니다.
                </p>
              </section>
            )}

            {cost && (() => {
              const values = cost.perDecadeKrw ?? [];
              const startDecade = Math.floor(d.chronologicalAge / 10) * 10;
              // 연령 구간 라벨: 현재 나이대부터 10년 단위로 이어지는 추정 구분.
              const labels = values.map((_, i) => `${startDecade + i * 10}대`);

              return (
                <>
                  {/* 2. 큰 헤드라인 — 생애 총 예상 의료비 (card-amber) */}
                  <section className="card-shadow relative overflow-hidden rounded-3xl card-amber px-6 py-7">
                    <div className="flex items-center gap-2">
                      <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-300">
                        <CoinIcon className="h-5 w-5" />
                      </span>
                      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-stone-500 dark:text-stone-400">
                        생애 총 예상 의료비
                      </p>
                    </div>
                    <p className="mt-3 flex items-baseline gap-1">
                      <span className="text-5xl font-black tracking-tighter text-stone-900 tabular-nums dark:text-stone-100">
                        ₩{(cost.totalKrw / 100_000_000).toFixed(1)}
                      </span>
                      <span className="text-xl font-extrabold text-stone-700 dark:text-stone-200">억</span>
                    </p>
                    <span className="mt-3 inline-block rounded-full bg-white/60 px-3 py-1 text-[10px] font-bold text-stone-600 dark:bg-stone-900/50 dark:text-stone-300">
                      통계 추정 · {cost.modelVersion}
                    </span>
                  </section>

                  {/* 3. 연령 구간별 예상 의료비 — 원본 SVG 막대 차트 */}
                  {values.length > 0 && (
                    <section className="card-shadow rounded-3xl bg-white px-4 py-5 dark:bg-stone-900">
                      <h2 className="mb-1 flex items-center px-1 text-[13.5px] font-extrabold text-stone-900 dark:text-stone-100">
                        <span className="accent-bar bg-rose-500" />
                        연령 구간별 예상 의료비
                      </h2>
                      <p className="mb-3 px-1 text-[10.5px] text-stone-500 dark:text-stone-400">
                        연령 구간은 현재 나이 기준 10년 단위 추정 구분입니다.
                      </p>
                      <DecadeBarChart values={values} labels={labels} />
                    </section>
                  )}

                  {/* 4. 산출 근거 해설 (모델 자체 설명) */}
                  <section className="card-shadow rounded-3xl card-rose p-5">
                    <h2 className="flex items-center text-[13.5px] font-extrabold text-stone-900 dark:text-stone-100">
                      <span className="accent-bar bg-rose-500" />
                      산출 근거
                    </h2>
                    <p className="mt-2 text-[12px] leading-relaxed text-stone-700 dark:text-stone-200">
                      {cost.basis}
                    </p>
                  </section>

                  {/* 5. 항목별 세부 구성 — 표준 비율 기반 추정(실제 총액에 적용). */}
                  <section>
                    <h2 className="mb-1 flex items-center px-1 text-[13.5px] font-extrabold text-stone-900 dark:text-stone-100">
                      <span className="accent-bar bg-amber-500" />
                      항목별 세부 구성
                      <span className="ml-1.5 text-[10px] font-semibold text-stone-400 dark:text-stone-500">
                        (표준 비율 기반 추정)
                      </span>
                    </h2>
                    {/* 구성 비율 바 */}
                    <div className="mt-2 flex h-4 w-full overflow-hidden rounded-full">
                      {COST_SPLIT.map((c) => (
                        <div
                          key={c.label}
                          title={`${c.label} ${(c.ratio * 100).toFixed(1)}%`}
                          style={{ width: `${c.ratio * 100}%`, backgroundColor: c.bar }}
                        />
                      ))}
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2.5">
                      {COST_SPLIT.map((c) => (
                        <div
                          key={c.label}
                          className={`${c.tile} card-shadow rounded-3xl px-3.5 py-3`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-semibold text-white/90">{c.label}</span>
                            <span className="rounded-full bg-white/25 px-1.5 py-0.5 text-[9.5px] font-bold text-white">
                              {(c.ratio * 100).toFixed(1)}%
                            </span>
                          </div>
                          <p className="mt-1 text-[16px] font-extrabold leading-none text-white tabular-nums">
                            ₩{formatKrwCompact(cost.totalKrw * c.ratio)}
                          </p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 rounded-2xl bg-stone-100 px-4 py-3 dark:bg-stone-800/60">
                      <p className="text-[11px] leading-relaxed text-stone-600 dark:text-stone-300">
                        항목별 구성은 표준 의료비 지출 비율을 실제 총액에 적용한 추정입니다. 개인별 실제
                        구성과 다를 수 있습니다.
                      </p>
                    </div>
                  </section>

                  {/* 상세 리포트 이동 */}
                  <Link
                    href="/avatar"
                    className="card-shadow flex items-center gap-2 rounded-3xl bg-white px-4 py-3.5 transition active:scale-[0.99] dark:bg-stone-900"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-rose-500/15 text-rose-600 dark:text-rose-300">
                      <CoinIcon className="h-5 w-5" />
                    </span>
                    <span className="flex-1 text-[13px] font-bold text-stone-900 dark:text-stone-100">
                      마이 VITA 리포트 전체 보기
                    </span>
                    <ChevronRightIcon className="h-4 w-4 shrink-0 text-stone-400 dark:text-stone-500" />
                  </Link>

                  <div className="px-1">
                    <p className="text-[10px] text-stone-400 dark:text-stone-500">
                      최근 리포트 {new Date(d.lastReportAt).toLocaleString()}
                    </p>
                  </div>
                </>
              );
            })()}
          </div>
        );
      })()}
    </AppShell>
  );
}
