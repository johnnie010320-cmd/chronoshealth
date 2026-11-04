'use client';

// VITA CODE V8 — 16 대사 유형 전체 보기 매트릭스(PDF 6페이지 그리드).
// 내 유형을 강조 표시. 이미지는 /public/vita/animals/<code>.png.

import { useState } from 'react';
import { VITA_ANIMALS } from '@/lib/vita/animals';
import { useVitaResultT } from '@/locales/vita-result';

// 매트릭스 배치(원본 그리드 순서) — 상단 High Power → 하단 Low Power.
const MATRIX: string[][] = [
  ['VITA', 'VITS', 'VILA', 'VILS'],
  ['VGTA', 'VGTS', 'VGLA', 'VGLS'],
  ['FITA', 'FITS', 'FILA', 'FILS'],
  ['FGTA', 'FGTS', 'FGLA', 'FGLS'],
];

export function VitaTypeGallery({
  activeCode,
  defaultOpen = false,
}: {
  activeCode: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const { t: vr, locale } = useVitaResultT();
  const t = vr.gallery;
  const active = activeCode?.toUpperCase();

  return (
    <section className="card-shadow rounded-2xl bg-white px-4 py-4 dark:bg-stone-900">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between"
        aria-expanded={open}
      >
        <h2 className="text-[12px] font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400">
          {t.title}
        </h2>
        <span className="text-[11px] font-semibold text-brand-700 dark:text-brand-300">
          {open ? t.collapse : t.expand}
        </span>
      </button>

      {open && (
        <div className="mt-3 grid grid-cols-4 gap-2">
          {MATRIX.flat().map((code) => {
            const a = VITA_ANIMALS[code];
            if (!a) return null;
            const isActive = code === active;
            return (
              <div
                key={code}
                className={`overflow-hidden rounded-xl border text-center transition ${
                  isActive
                    ? 'border-brand-500 ring-2 ring-brand-400'
                    : 'border-stone-200 opacity-80 dark:border-stone-700'
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={a.image} alt={a.name[locale]} className="aspect-[4/3] w-full object-cover" />
                <div className="px-1 py-1">
                  <p className="text-[10px] font-bold tracking-wide text-stone-800 dark:text-stone-100">
                    {code}
                  </p>
                  <p className="truncate text-[9px] text-stone-500 dark:text-stone-400">
                    {a.name[locale]}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {open && (
        <p className="mt-3 text-[10px] leading-relaxed text-stone-400 dark:text-stone-500">
          {t.note}
        </p>
      )}
    </section>
  );
}
