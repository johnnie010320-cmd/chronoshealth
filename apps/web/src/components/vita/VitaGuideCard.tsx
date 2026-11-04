'use client';

// VITA 코드 결과 — 내 대사 동물 유형 심층 가이드(PDF 6페이지 / 가이드북 원문).
// 섹션명·문구는 첨부 "비타코드 V8 16 대사 유형 심층 가이드북" 원문을 그대로 사용.

import { vitaAnimal } from '@/lib/vita/animals';
import { vitaGuideLocalized } from '@/lib/vita/i18n';
import { useVitaResultT } from '@/locales/vita-result';

export function VitaGuideCard({ code }: { code: string }) {
  const { t: vr, locale } = useVitaResultT();
  const t = vr.guide;
  const g = vitaGuideLocalized(code, locale);
  const a = vitaAnimal(code);
  if (!g) return null;

  return (
    <section className="card-shadow rounded-2xl bg-white px-4 py-4 dark:bg-stone-900">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5">
        <h2 className="text-[12px] font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400">
          <span className="accent-bar bg-emerald-500" />
          {t.title}
        </h2>
        <span className="shrink-0 rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold text-brand-700 dark:bg-brand-900/40 dark:text-brand-200">
          {g.group}
        </span>
      </div>

      {a && (
        <p className="mb-3 text-[13px] font-bold text-stone-900 dark:text-stone-100">
          {a.name[locale]} · {a.titleEn}
        </p>
      )}

      {/* 대사 특징 */}
      <GuideBlock label={t.feature}>
        <p className="text-[12.5px] leading-relaxed text-stone-700 dark:text-stone-200">{g.feature}</p>
      </GuideBlock>

      {/* 추천 영양소 */}
      <GuideBlock label={t.nutrients}>
        <div className="flex flex-wrap gap-1.5">
          {g.nutrients.map((n) => (
            <span
              key={n}
              className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
            >
              {n}
            </span>
          ))}
        </div>
      </GuideBlock>

      {/* 운동 & 휴식 */}
      <GuideBlock label={t.exerciseRest}>
        <ul className="space-y-1">
          {g.exerciseRest.map((e) => (
            <li
              key={e}
              className="flex items-start gap-2 text-[12.5px] leading-relaxed text-stone-700 dark:text-stone-200"
            >
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-500" />
              <span>{e}</span>
            </li>
          ))}
        </ul>
      </GuideBlock>

      {/* 식단 전략 */}
      {g.diet && (
        <GuideBlock label={t.diet}>
          <p className="text-[12.5px] leading-relaxed text-stone-700 dark:text-stone-200">{g.diet}</p>
        </GuideBlock>
      )}

      {/* 주의 사항 */}
      {g.caution && (
        <GuideBlock label={t.caution}>
          <p className="text-[12.5px] leading-relaxed text-amber-700 dark:text-amber-300">{g.caution}</p>
        </GuideBlock>
      )}
    </section>
  );
}

function GuideBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-3 first:mt-0">
      <p className="mb-1.5 text-[11px] font-bold text-stone-800 dark:text-stone-100">{label}</p>
      {children}
    </div>
  );
}
