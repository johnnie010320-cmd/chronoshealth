'use client';

import { PulseBackground } from '@/components/PulseBackground';
import { HeartPulseIcon } from '@/components/HealthIcons';
import { useI18n } from '@/lib/i18n';

type Tier = 'excellent' | 'good' | 'fair' | 'attention';

const TIER_TONE: Record<Tier, string> = {
  excellent: 'from-emerald-600 via-emerald-500 to-teal-500',
  good: 'from-brand-700 via-brand-600 to-teal-500',
  fair: 'from-amber-500 via-amber-400 to-yellow-500',
  attention: 'from-rose-600 via-rose-500 to-orange-500',
};

type Props = {
  name: string;
  chronologicalAge: number;
  value: number;
  tier: Tier;
};

export function VitalityCard({ name, chronologicalAge, value, tier }: Props) {
  const { t } = useI18n();
  const A = t.avatar;

  return (
    <section
      className={`card-shadow relative overflow-hidden rounded-3xl bg-gradient-to-br ${TIER_TONE[tier]} px-6 py-7 text-white`}
    >
      <PulseBackground variant="bottom" />
      <div className="relative">
        <div className="flex items-center gap-2 text-white/85">
          <HeartPulseIcon className="h-4 w-4" />
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em]">
            {A.eyebrow}
          </p>
        </div>
        <h1 className="mt-2 text-xl font-bold leading-tight tracking-tight">
          {name || A.nameFallback}
        </h1>
        <p className="mt-1 text-[12px] text-white/70">
          {chronologicalAge} {t.result.bioAgeUnit}
        </p>
        <div className="mt-5 flex items-baseline gap-2">
          <span className="text-7xl font-bold leading-none tracking-tighter">
            {value}
          </span>
          <span className="text-sm text-white/70">/ 100</span>
        </div>
        <p className="mt-2 text-[12px] uppercase tracking-widest text-white/80">
          {A.vitalityScore} · {A.vitalityTiers[tier]}
        </p>
      </div>
    </section>
  );
}
