'use client';

import { useI18n } from '@/lib/i18n';

type Basis = 'model' | 'heuristic';

type Props = {
  fiveAges: {
    life: number;
    vitality: number;
    skin: number;
    vascular: number;
    joint: number;
  };
  /** 항목별 산출 근거. 미지정이면 전부 P1 추정으로 간주한다(구 게이트웨이 호환). */
  basis?: Record<keyof Props['fiveAges'], Basis>;
  /** 혈관 나이가 상한(80)에 걸렸으면 "80+" 로 표기 — 단정 표현 금지 */
  vascularCapped?: boolean;
};

export function FiveAgesGrid({ fiveAges, basis, vascularCapped }: Props) {
  const { t } = useI18n();
  const A = t.avatar.fiveAges;

  const items: { key: keyof Props['fiveAges']; label: string }[] = [
    { key: 'life', label: A.life },
    { key: 'vitality', label: A.vitality },
    { key: 'skin', label: A.skin },
    { key: 'vascular', label: A.vascular },
    { key: 'joint', label: A.joint },
  ];

  return (
    <section>
      <h2 className="px-1 text-xs font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400">
        {A.title}
      </h2>
      <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {items.map(({ key, label }) => {
          const kind: Basis = basis?.[key] ?? 'heuristic';
          const capped = key === 'vascular' && vascularCapped === true;
          return (
            <div
              key={key}
              className="card-shadow rounded-2xl bg-white/85 px-3 py-3 backdrop-blur dark:bg-stone-900/70"
            >
              <div className="flex items-start justify-between gap-1">
                <p className="text-[10px] uppercase tracking-widest text-stone-500 dark:text-stone-400">
                  {label}
                </p>
                {kind === 'heuristic' ? (
                  <span className="shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                    {A.basisHeuristic}
                  </span>
                ) : (
                  <span className="shrink-0 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
                    {A.basisModel}
                  </span>
                )}
              </div>
              <p className="mt-1 flex items-baseline gap-1">
                <span className="text-2xl font-bold text-stone-900 dark:text-stone-100">
                  {fiveAges[key]}
                  {capped ? '+' : ''}
                </span>
                <span className="text-[11px] text-stone-500 dark:text-stone-400">
                  {A.unit}
                </span>
              </p>
            </div>
          );
        })}
      </div>
      <p className="mt-2 px-1 text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">
        {A.basisNote}
      </p>
    </section>
  );
}
