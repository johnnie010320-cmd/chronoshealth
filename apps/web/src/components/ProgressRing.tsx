// 삼성/애플 헬스식 원형 진행 링 — 목표 대비 값(0~max)을 원호로 표시.
// 중앙에 큰 값 + 보조 라벨. SVG 순수 구현(외부 의존 없음).

export type RingTone = 'brand' | 'emerald' | 'amber' | 'rose' | 'sky';

const STROKE_COLOR: Record<RingTone, string> = {
  brand: '#7c3aed',
  emerald: '#059669',
  amber: '#d97706',
  rose: '#e11d48',
  sky: '#0284c7',
};

export function ProgressRing({
  value,
  max = 100,
  size = 72,
  stroke = 8,
  tone = 'brand',
  label,
  sublabel,
  className,
}: {
  value: number;
  max?: number;
  size?: number;
  stroke?: number;
  tone?: RingTone;
  label?: string;
  sublabel?: string;
  className?: string;
}) {
  const pct = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const dash = circumference * pct;
  const color = STROKE_COLOR[tone];

  return (
    <div
      className={`relative inline-flex items-center justify-center ${className ?? ''}`}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          className="stroke-stone-200 dark:stroke-stone-700"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          stroke={color}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
        />
      </svg>
      {(label || sublabel) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
          {label && (
            <span className="text-lg font-bold tabular-nums text-stone-900 dark:text-stone-100">
              {label}
            </span>
          )}
          {sublabel && (
            <span className="mt-0.5 text-[9px] font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500">
              {sublabel}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
