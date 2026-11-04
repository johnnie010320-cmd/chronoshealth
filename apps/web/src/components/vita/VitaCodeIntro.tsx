'use client';

// VITA 코드 설명(PDF 2페이지) — 결과가 아직 없을 때 "VITA CODE V8이란" 안내.
// 문구는 첨부 가이드북 원문을 최대한 그대로 사용.

import Link from 'next/link';
import { ChevronRightIcon } from '@/components/HealthIcons';
import { VitaTypeGallery } from '@/components/vita/VitaTypeGallery';
import { VITA_MATRIX_TITLE, VITA_AXIS_DECODE } from '@/lib/vita/guidebook';
import { vitaIntro } from '@/lib/vita/i18n';
import { useVitaResultT } from '@/locales/vita-result';

export function VitaCodeIntro({ showCta = true }: { showCta?: boolean }) {
  const { t: vr, locale } = useVitaResultT();
  const t = vr.intro;
  const tx = vitaIntro(locale);
  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <section className="card-shadow overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-brand-800 to-teal-700 px-6 py-6 text-white">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/80">
          {VITA_MATRIX_TITLE}
        </p>
        <h1 className="mt-1 text-xl font-bold leading-snug">{tx.matrixSubtitle}</h1>
        <p className="mt-2 text-[12px] leading-relaxed text-white/85">{tx.systemIntro}</p>
      </section>

      {/* 2대 핵심 축 */}
      <section className="card-shadow rounded-2xl bg-white px-4 py-4 dark:bg-stone-900">
        <h2 className="mb-2 text-[12px] font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400">
          {t.twoAxes}
        </h2>
        <p className="text-[12px] leading-relaxed text-stone-700 dark:text-stone-200">{tx.axisY}</p>
        <p className="mt-2 text-[12px] leading-relaxed text-stone-700 dark:text-stone-200">{tx.axisX}</p>
      </section>

      {/* 코드 4글자 해설 */}
      <section className="card-shadow rounded-2xl bg-white px-4 py-4 dark:bg-stone-900">
        <h2 className="mb-3 text-[12px] font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400">
          {t.decodeTitle}
        </h2>
        <div className="space-y-2">
          {VITA_AXIS_DECODE.map((src, i) => {
            const d = { ...src, ...tx.axisDecode[i] };
            return (
            <div key={d.pos} className="rounded-xl bg-stone-50 px-3 py-2 dark:bg-stone-800/60">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-bold text-stone-800 dark:text-stone-100">
                  {t.nth(d.pos)} · {d.letters}
                </span>
                <span className="text-[10px] font-medium text-stone-500 dark:text-stone-400">
                  {d.domain}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px]">
                <span className="text-emerald-600 dark:text-emerald-400">↑ {d.high}</span>
                <span className="text-stone-500 dark:text-stone-400">↓ {d.low}</span>
              </div>
            </div>
            );
          })}
        </div>
      </section>

      {/* 16 유형 매트릭스 */}
      <VitaTypeGallery activeCode="" defaultOpen />

      {/* 3단계 적용법 */}
      <section className="card-shadow rounded-2xl card-violet px-4 py-4">
        <h2 className="mb-3 text-[12px] font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400">
          {t.stepsTitle}
        </h2>
        <div className="space-y-2.5">
          {tx.steps.map((s) => (
            <div key={s.title}>
              <p className="text-[12.5px] font-bold text-stone-800 dark:text-stone-100">{s.title}</p>
              <p className="mt-0.5 text-[11.5px] leading-relaxed text-stone-600 dark:text-stone-300">
                {s.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 마무리 문구 */}
      <p className="px-2 text-center text-[12px] font-semibold italic leading-relaxed text-brand-700 dark:text-brand-300">
        “{tx.closing}”
      </p>

      {showCta && (
        <div className="flex justify-center">
          <Link
            href="/reports"
            className="inline-flex items-center gap-1 rounded-2xl bg-stone-900 px-5 py-3 text-sm font-semibold text-white transition active:scale-[0.98] dark:bg-white dark:text-stone-900"
          >
            <span>{t.start}</span>
            <ChevronRightIcon className="h-4 w-4" />
          </Link>
        </div>
      )}
    </div>
  );
}
