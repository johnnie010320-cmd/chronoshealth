'use client';

// 나이 게이지(스피도미터) — 생체나이 리포트용 순수 SVG 원본 그래픽.
// 젊음(초록, 좌) → 보통(노랑, 중) → 노화(빨강, 우). 바늘 위치는 실제 나이 대비 차이(delta)로 계산.
// delta = 실제나이 - 측정나이 (>0 = 더 젊음). 날조 없이 측정/추정값만 시각화.

function arcPts(cx: number, cy: number, r: number, a0: number, a1: number, n = 18): string {
  const out: string[] = [];
  for (let i = 0; i <= n; i++) {
    const a = (a0 + ((a1 - a0) * i) / n) * (Math.PI / 180);
    out.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy - r * Math.sin(a)).toFixed(1)}`);
  }
  return out.join(' ');
}

export function AgeGauge({
  delta,
  leftLabel,
  rightLabel,
}: {
  delta: number;
  leftLabel: string;
  rightLabel: string;
}) {
  const cx = 110;
  const cy = 108;
  const r = 88;
  // f: 0 = 젊음(좌), 1 = 노화(우)
  const f = Math.max(0, Math.min(1, 0.5 - delta / 20));
  const needleAng = 180 - f * 180;
  const nrad = needleAng * (Math.PI / 180);
  const tipX = cx + (r - 10) * Math.cos(nrad);
  const tipY = cy - (r - 10) * Math.sin(nrad);

  return (
    <svg viewBox="0 0 220 128" className="h-auto w-full max-w-[240px]" role="img" aria-label="나이 게이지">
      {/* 트랙 배경 */}
      <polyline points={arcPts(cx, cy, r, 180, 0)} fill="none" stroke="currentColor" strokeWidth={15} strokeLinecap="round" className="text-stone-200 dark:text-stone-800" />
      {/* 색 구간 */}
      <polyline points={arcPts(cx, cy, r, 180, 120)} fill="none" stroke="#10b981" strokeWidth={15} strokeLinecap="round" />
      <polyline points={arcPts(cx, cy, r, 118, 62)} fill="none" stroke="#f59e0b" strokeWidth={15} />
      <polyline points={arcPts(cx, cy, r, 60, 0)} fill="none" stroke="#ef4444" strokeWidth={15} strokeLinecap="round" />
      {/* 눈금 */}
      {Array.from({ length: 13 }).map((_, i) => {
        const a = (180 - (i * 180) / 12) * (Math.PI / 180);
        const r1 = r - 22;
        const r2 = r - 30;
        return (
          <line
            key={i}
            x1={cx + r1 * Math.cos(a)}
            y1={cy - r1 * Math.sin(a)}
            x2={cx + r2 * Math.cos(a)}
            y2={cy - r2 * Math.sin(a)}
            stroke="currentColor"
            strokeWidth={1}
            className="text-stone-300 dark:text-stone-700"
          />
        );
      })}
      {/* 바늘 */}
      <line x1={cx} y1={cy} x2={tipX} y2={tipY} stroke="currentColor" strokeWidth={3.5} strokeLinecap="round" className="text-stone-800 dark:text-stone-100" />
      <circle cx={cx} cy={cy} r={6} className="fill-stone-800 dark:fill-stone-100" />
      <circle cx={cx} cy={cy} r={2.5} className="fill-white dark:fill-stone-900" />
      {/* 좌/우 라벨 */}
      <text x={cx - r} y={cy + 16} textAnchor="start" className="fill-stone-500 dark:fill-stone-400" style={{ fontSize: 10, fontWeight: 700 }}>
        {leftLabel}
      </text>
      <text x={cx + r} y={cy + 16} textAnchor="end" className="fill-stone-500 dark:fill-stone-400" style={{ fontSize: 10, fontWeight: 700 }}>
        {rightLabel}
      </text>
    </svg>
  );
}
