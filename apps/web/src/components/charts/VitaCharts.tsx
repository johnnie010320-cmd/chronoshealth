'use client';

// VITA 파생 데이터 시각화 — 순수 SVG(차트 라이브러리 미사용, 정적 export/번들 경량).
// 레이더: 10개 영역 점수를 한눈에. 바 리스트: 영역별 점수를 밴드 색으로.
// 점수(0~100)는 "증상 부하"로 높을수록 부하가 큼. 색은 밴드(최적/주의/경고/위험).

import type { VitaBand } from '@/lib/vita/engine';
import { useVitaResultT } from '@/locales/vita-result';

const BAND_HEX: Record<VitaBand, string> = {
  optimal: '#10b981', // emerald
  caution: '#8b5cf6', // violet(brand)
  warning: '#f59e0b', // amber
  danger: '#f43f5e', // rose
};

export type ChartDatum = { no: number; label: string; score: number; band: VitaBand };

// ── 레이더 차트 ───────────────────────────────────────────────
export function VitaRadar({ data, color = '#7c3aed' }: { data: ChartDatum[]; color?: string }) {
  const { t: vr } = useVitaResultT();
  const n = data.length;
  if (n < 3) return null;
  const size = 240;
  const cx = size / 2;
  const cy = size / 2;
  const R = 86;
  const ang = (i: number) => (-90 + (360 / n) * i) * (Math.PI / 180);
  const pt = (i: number, r: number) => ({
    x: cx + Math.cos(ang(i)) * r,
    y: cy + Math.sin(ang(i)) * r,
  });

  const rings = [0.25, 0.5, 0.75, 1];
  const dataPts = data.map((d, i) => pt(i, (Math.max(0, Math.min(100, d.score)) / 100) * R));
  const poly = dataPts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="mx-auto h-auto w-full max-w-[280px]" role="img" aria-label={vr.chart.radarAria}>
      {/* 그리드 링 */}
      {rings.map((f, ri) => (
        <polygon
          key={ri}
          points={data.map((_, i) => {
            const p = pt(i, R * f);
            return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
          }).join(' ')}
          fill="none"
          stroke="currentColor"
          strokeWidth={0.7}
          className="text-stone-300 dark:text-stone-700"
        />
      ))}
      {/* 축선 + 번호 라벨 */}
      {data.map((d, i) => {
        const edge = pt(i, R);
        const lab = pt(i, R + 14);
        return (
          <g key={i}>
            <line x1={cx} y1={cy} x2={edge.x} y2={edge.y} stroke="currentColor" strokeWidth={0.6} className="text-stone-200 dark:text-stone-700" />
            <text
              x={lab.x}
              y={lab.y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-stone-500 dark:fill-stone-400"
              style={{ fontSize: 9, fontWeight: 700 }}
            >
              {d.no}
            </text>
          </g>
        );
      })}
      {/* 데이터 폴리곤 */}
      <polygon points={poly} fill={color} fillOpacity={0.22} stroke={color} strokeWidth={2} strokeLinejoin="round" />
      {dataPts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={2.4} fill={color} />
      ))}
    </svg>
  );
}

// ── 밴드 색 바 리스트 ─────────────────────────────────────────
export function BandBars({ data }: { data: ChartDatum[] }) {
  return (
    <div className="space-y-2">
      {data.map((d) => (
        <div key={d.no} className="flex items-center gap-2">
          <span className="w-[4.5rem] shrink-0 truncate text-[11px] font-semibold text-stone-600 dark:text-stone-300">
            <span className="mr-1 text-stone-400">{d.no}</span>
            {d.label}
          </span>
          <div className="relative h-3 flex-1 overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${Math.max(3, Math.min(100, d.score))}%`, backgroundColor: BAND_HEX[d.band] }}
            />
          </div>
          <span className="w-6 shrink-0 text-right text-[11px] font-extrabold tabular-nums text-stone-800 dark:text-stone-100">
            {d.score}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── 밴드 범례 ─────────────────────────────────────────────────
export function BandLegend() {
  const { t: vr } = useVitaResultT();
  const bands: VitaBand[] = ['optimal', 'caution', 'warning', 'danger'];
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      {bands.map((b) => (
        <span key={b} className="flex items-center gap-1 text-[10px] font-semibold text-stone-500 dark:text-stone-400">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: BAND_HEX[b] }} />
          {vr.band[b]}
        </span>
      ))}
    </div>
  );
}
