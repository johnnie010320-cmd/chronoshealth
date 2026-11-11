'use client';

// AI 진단 탭 — VITA CODE V8 16 아키타입 "상세" 정밀 리포트(라이프는 러프 요약).
// 입력은 AI 리포트 탭. 결과 없으면 진단 시작 안내.
// 의료·윤리: 본 리포트는 건강 위험 추정/생활습관 코칭이며 의학적 진단이 아니다.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { LoginRequired } from '@/components/LoginRequired';
import { ChevronRightIcon } from '@/components/HealthIcons';
import { readSession } from '@/lib/session';
import { fetchLatestVita, type VitaSavedResult } from '@/lib/api-client';
import { buildVitaReport, type VitaReport, type VitaAxisSpectrum } from '@/lib/vita/reports';
import type { VitaBand } from '@/lib/vita/engine';
import { vitaAnimal, vitaAnimalImage } from '@/lib/vita/animals';
import { VitaRadar, BandBars, BandLegend } from '@/components/charts/VitaCharts';
import { VitaPeerCompare } from '@/components/vita/VitaPeerCompare';
import { VitaTypeGallery } from '@/components/vita/VitaTypeGallery';
import { VitaGuideCard } from '@/components/vita/VitaGuideCard';
import { VitaCodeIntro } from '@/components/vita/VitaCodeIntro';
import { useVitaResultT } from '@/locales/vita-result';
import type { VitaResultDict } from '@/locales/vita-result/ko';

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
  const { t: vr, locale } = useVitaResultT();
  const t = vr.diag;

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

  const report: VitaReport | null = saved ? buildVitaReport(saved, locale) : null;
  const arch = report?.text;
  const animal = saved ? vitaAnimal(saved.code) : undefined;

  return (
    <AppShell title={t.title} decoration="dots">
      {state === 'unauth' ? (
        <LoginRequired />
      ) : state === 'loading' ? (
        <div className="mt-10 flex justify-center">
          <span className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-stone-300 border-t-brand-700 dark:border-stone-700 dark:border-t-brand-400" />
        </div>
      ) : state === 'none' || !report || !saved ? (
        <div className="pb-10 pt-3">
          <VitaCodeIntro />
        </div>
      ) : (
        <div className="space-y-4 pb-10 pt-3">
          {/* 아키타입 헤드라인 — 대사 동물 */}
          <section className="card-shadow overflow-hidden rounded-3xl bg-gradient-to-br from-brand-700 via-teal-600 to-emerald-500 text-white">
            <div className="flex items-center justify-center bg-black/15 px-6 pt-6">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={vitaAnimalImage(saved.code)}
                alt={animal?.name[locale] ?? saved.code}
                className="h-40 w-auto max-w-full rounded-2xl object-contain shadow-xl"
              />
            </div>
            <div className="px-6 py-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] opacity-90">{t.eyebrow}</p>
              <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="text-4xl font-bold tracking-[0.15em]">{saved.code}</span>
                {animal && (
                  <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[13px] font-bold">
                    {animal.name[locale]}
                  </span>
                )}
                <span className="text-[15px] font-semibold opacity-95">{arch?.nickname}</span>
              </div>
              {animal && (
                <p className="mt-1 text-[11px] font-medium text-white/85">
                  {animal.titleEn} · {animal.quadrantEn}
                </p>
              )}
              {report.spectrum.some((x) => x.borderline) && (
                <p className="mt-1.5 text-[11px] font-semibold text-amber-100">
                  {t.borderlineHeadline(
                    report.spectrum
                      .filter((x) => x.borderline)
                      .map((x) => `${t.axisNo(x.no)} ${x.primary.letter}/${x.secondary.letter}`)
                      .join(' · '),
                  )}
                </p>
              )}
              <p className="mt-2 text-[12px] font-semibold">{t.totalScore(saved.totalScore)}</p>
              <p className="mt-1 text-[10px] leading-relaxed text-white/70">
                {t.analyzedAt(new Date(`${saved.createdAt.replace(' ', 'T')}Z`).toLocaleString(locale))}
              </p>
            </div>
          </section>

          {/* 대사 유형 심층 가이드 (가이드북 원문) */}
          <VitaGuideCard code={saved.code} />

          {/* 종합 점수 & 또래 비교 (7·8페이지 스크롤) */}
          <VitaPeerCompare
            code={saved.code}
            totalScore={saved.totalScore}
            sectionScores={saved.sectionScores}
          />

          {/* 영역별 점수 그래프 (10개 영역 레이더 + 바) */}
          <section className="card-shadow rounded-2xl bg-white px-4 py-4 dark:bg-stone-900">
            <h2 className="mb-1 text-[12px] font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400">
              <span className="accent-bar bg-emerald-500" />
              {t.graphTitle}
            </h2>
            <p className="mb-2 text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">
              {t.graphDesc}
            </p>
            {(() => {
              const chartData = report.sectionRows.map((r) => ({
                no: r.no,
                label: r.title,
                score: r.score,
                band: r.band,
              }));
              return (
                <>
                  <VitaRadar data={chartData} />
                  <div className="mb-3 mt-1 flex justify-center">
                    <BandLegend />
                  </div>
                  <BandBars data={chartData} />
                </>
              );
            })()}
          </section>

          {/* 4대 축 스펙트럼 */}
          <section className="card-shadow rounded-2xl bg-white px-4 py-4 dark:bg-stone-900">
            <h2 className="mb-3 text-[12px] font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400">
              <span className="accent-bar bg-emerald-500" />
              {t.spectrumTitle}
            </h2>
            <div className="space-y-3.5">
              {report.spectrum.map((s) => (
                <SpectrumRow key={s.axis} s={s} t={t} />
              ))}
            </div>
            <p className="mt-3 text-[10px] leading-relaxed text-stone-400 dark:text-stone-500">
              {t.spectrumNote}
            </p>
            {saved.axes && (
              <p className="mt-1 text-[10px] leading-relaxed text-stone-400 dark:text-stone-500">
                {t.cutoffBasis[saved.axes.metabolic.basis](saved.axes.metabolic.peers)}
              </p>
            )}
          </section>

          {arch && (
            <>
              {/* 엔진 구성 */}
              <TextCard title={t.engineMix}>
                <ul className="space-y-1.5">
                  {arch.axisLines.map((l, i) => (
                    <li key={i} className="text-[12px] leading-relaxed text-stone-700 dark:text-stone-200">{l}</li>
                  ))}
                </ul>
              </TextCard>

              {/* 강점 */}
              <BulletCard title={t.strengths} tone="emerald" items={arch.strengths} />

              {/* 주의 포인트 */}
              <BulletCard title={t.warnings} tone="amber" items={arch.warnings} />

              {/* 미래 위험 모니터링 */}
              <BulletCard title={t.futureRisks} tone="rose" items={arch.futureRisks} />

              {/* 당장 바꿔야 할 3가지 */}
              <section className="card-shadow rounded-2xl bg-white px-4 py-4 dark:bg-stone-900">
                <h2 className="mb-3 text-[12px] font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400">
                  <span className="accent-bar bg-rose-500" />
                  {t.actions}
                </h2>
                <div className="space-y-2.5">
                  <ActionRow tag="STOP" tone="rose" title={arch.actions.stop.title} desc={arch.actions.stop.desc} />
                  <ActionRow tag="CHANGE" tone="amber" title={arch.actions.change.title} desc={arch.actions.change.desc} />
                  <ActionRow tag="START" tone="emerald" title={arch.actions.start.title} desc={arch.actions.start.desc} />
                </div>
              </section>

              {/* 정밀 라이프스타일 처방 */}
              <BulletCard title={t.nutrition} tone="emerald" items={arch.nutrition} />
              <BulletCard title={t.exercise} tone="sky" items={arch.exercise} />
              <BulletCard title={t.recovery} tone="violet" items={arch.recovery} />

              {/* 맞춤 영양제 */}
              <section className="card-shadow rounded-2xl bg-white px-4 py-4 dark:bg-stone-900">
                <h2 className="mb-1 text-[12px] font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400">
                  <span className="accent-bar bg-emerald-500" />
                  {t.supplements}
                </h2>
                {arch.supIntro && (
                  <p className="mb-2.5 text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">{arch.supIntro}</p>
                )}
                <div className="space-y-2.5">
                  {arch.supplements.map((s, i) => (
                    <div key={`${s.name}-${i}`} className="rounded-xl bg-stone-50 px-3 py-2.5 dark:bg-stone-800/60">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[13px] font-semibold text-stone-800 dark:text-stone-100">{s.name}</span>
                        <span className="shrink-0 rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold text-brand-700 dark:bg-brand-900/40 dark:text-brand-200">
                          {s.dose} · {s.timing}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">{s.purpose}</p>
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-[10px] leading-relaxed text-stone-400 dark:text-stone-500">
                  {t.supNote}
                </p>
              </section>

              {/* 궁극적 목표 */}
              {arch.goal.length > 0 && (
                <TextCard title={t.goal}>
                  <div className="space-y-1.5">
                    {arch.goal.map((g, i) => (
                      <p
                        key={i}
                        className={`text-[12px] leading-relaxed ${
                          i === 0
                            ? 'font-semibold text-brand-700 dark:text-brand-300'
                            : 'text-stone-700 dark:text-stone-300'
                        }`}
                      >
                        {g}
                      </p>
                    ))}
                  </div>
                </TextCard>
              )}

              {/* 항노화 정밀 검사 */}
              <BulletCard title={t.tests} tone="sky" items={arch.tests} />

              {/* 전문가 코칭 */}
              {arch.coaching.length > 0 && (
                <section className="card-shadow rounded-2xl card-violet px-4 py-4">
                  <h2 className="mb-2 text-[12px] font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400">
                    {t.coaching}
                  </h2>
                  {arch.coaching.map((c, i) => (
                    <p key={i} className="mt-1 text-[12px] leading-relaxed text-stone-700 dark:text-stone-200">{c}</p>
                  ))}
                </section>
              )}
            </>
          )}

          {/* 영역별 점수 */}
          <section className="card-shadow rounded-2xl bg-white px-4 py-4 dark:bg-stone-900">
            <h2 className="mb-3 text-[12px] font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400">
              <span className="accent-bar bg-emerald-500" />
              {t.sectionScores}
            </h2>
            <div className="space-y-2.5">
              {report.sectionRows.map((r) => (
                <div key={r.id}>
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="font-medium text-stone-700 dark:text-stone-300">
                      {r.no}. {r.title}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="tabular-nums text-stone-500 dark:text-stone-400">{r.score}</span>
                      <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${BAND_CHIP[r.band]}`}>
                        {vr.band[r.band]}
                      </span>
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800">
                    <div
                      className={`h-full rounded-full ${BAND_BAR[r.band]}`}
                      style={{ width: `${Math.min(100, r.score)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 16 유형 전체 보기 */}
          <VitaTypeGallery activeCode={saved.code} />

          <p className="px-1 text-[10px] text-stone-400 dark:text-stone-500">
            {t.source}
          </p>

          <div className="flex justify-center">
            <Link
              href="/reports"
              className="inline-flex items-center gap-1 text-[12px] font-semibold text-brand-700 dark:text-brand-300"
            >
              <span>{t.reanalyze}</span>
              <ChevronRightIcon className="h-3 w-3" />
            </Link>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function SpectrumRow({ s, t }: { s: VitaAxisSpectrum; t: VitaResultDict['diag'] }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2 text-[11px]">
        <span className="min-w-0 font-semibold text-stone-600 dark:text-stone-300">
          {t.axisNo(s.no)} · {s.title}
        </span>
        <span className="flex shrink-0 items-center gap-1">
          {s.borderline && (
            <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
              {t.borderline} {s.primary.letter}/{s.secondary.letter}
            </span>
          )}
          <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-bold text-brand-700 dark:bg-brand-900/40 dark:text-brand-200">
            {s.activeLetter} · {s.activeName}
          </span>
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className={`w-3 text-center text-[11px] font-bold ${!s.isSecondary ? 'text-emerald-600 dark:text-emerald-400' : 'text-stone-300 dark:text-stone-600'}`}>
          {s.primary.letter}
        </span>
        <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800">
          <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500" style={{ width: `${s.primaryPct}%` }} />
          <div className="absolute inset-y-0 left-1/2 border-l border-dashed border-stone-400/70 dark:border-stone-500/70" />
          <div
            className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-brand-700 shadow dark:border-stone-900"
            style={{ left: `${s.primaryPct}%` }}
          />
        </div>
        <span className={`w-3 text-center text-[11px] font-bold ${s.isSecondary ? 'text-amber-600 dark:text-amber-400' : 'text-stone-300 dark:text-stone-600'}`}>
          {s.secondary.letter}
        </span>
      </div>
    </div>
  );
}

function ActionRow({ tag, tone, title, desc }: { tag: string; tone: 'rose' | 'amber' | 'emerald'; title: string; desc: string }) {
  const chip =
    tone === 'rose'
      ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'
      : tone === 'amber'
        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
        : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300';
  return (
    <div className="rounded-xl bg-stone-50 px-3 py-2.5 dark:bg-stone-800/60">
      <div className="flex items-center gap-2">
        <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${chip}`}>{tag}</span>
        <span className="text-[13px] font-semibold text-stone-800 dark:text-stone-100">{title}</span>
      </div>
      {desc && <p className="mt-1 text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">{desc}</p>}
    </div>
  );
}

function TextCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card-shadow rounded-2xl bg-white px-4 py-4 dark:bg-stone-900">
      <h2 className="mb-2 text-[12px] font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400">
        <span className="accent-bar bg-emerald-500" />
        {title}
      </h2>
      {children}
    </section>
  );
}

function BulletCard({
  title,
  tone,
  items,
}: {
  title: string;
  tone: 'emerald' | 'rose' | 'sky' | 'amber' | 'violet';
  items: string[];
}) {
  if (!items || items.length === 0) return null;
  const dot =
    tone === 'emerald'
      ? 'bg-emerald-500'
      : tone === 'rose'
        ? 'bg-rose-500'
        : tone === 'sky'
          ? 'bg-sky-500'
          : tone === 'amber'
            ? 'bg-amber-500'
            : 'bg-violet-500';
  return (
    <section className="card-shadow rounded-2xl bg-white px-4 py-4 dark:bg-stone-900">
      <h2 className="mb-2 text-[12px] font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400">
        <span className={`accent-bar ${dot}`} />
        {title}
      </h2>
      <ul className="space-y-1.5">
        {items.map((it, i) => (
          <li key={`${i}`} className="flex items-start gap-2 text-[12.5px] leading-relaxed text-stone-700 dark:text-stone-200">
            <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
