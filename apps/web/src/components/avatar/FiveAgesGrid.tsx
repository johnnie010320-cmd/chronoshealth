'use client';

import { useI18n } from '@/lib/i18n';

type Props = {
  fiveAges: {
    life: number;
    vitality: number;
    skin: number;
    vascular: number;
    joint: number;
  };
};

export function FiveAgesGrid({ fiveAges }: Props) {
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
        {items.map(({ key, label }) => (
          <div
            key={key}
            className="card-shadow rounded-2xl bg-white/85 px-3 py-3 backdrop-blur dark:bg-stone-900/70"
          >
            <p className="text-[10px] uppercase tracking-widest text-stone-500 dark:text-stone-400">
              {label}
            </p>
            <p className="mt-1 flex items-baseline gap-1">
              <span className="text-2xl font-bold text-stone-900 dark:text-stone-100">
                {fiveAges[key]}
              </span>
              <span className="text-[11px] text-stone-500 dark:text-stone-400">
                {A.unit}
              </span>
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
