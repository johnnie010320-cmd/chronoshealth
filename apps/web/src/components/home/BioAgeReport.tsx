'use client';

// 홈 "Digital Twin 생체나이 리포트" (목업 2.png 기준).
// 생체나이 vs 실제나이 비교 + 해석 2줄 + 건강 나이 4종(생체/혈관/피부/골격) 박스(각 코멘트).

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronRightIcon } from '@/components/HealthIcons';
import { readSession } from '@/lib/session';
import { fetchAvatarMe, type AvatarResponse } from '@/lib/api-client';

type AgeItem = { label: string; val: number };

function gapNote(val: number, chrono: number): string {
  const gap = val - chrono;
  if (gap <= -3) return `같은 나이보다 ${-gap}세 젊음`;
  if (gap < 0) return '또래보다 양호';
  if (gap === 0) return '또래 평균 수준';
  return `관리 필요 (+${gap}세)`;
}

export function BioAgeReport() {
  const [data, setData] = useState<AvatarResponse | null>(null);
  const [status, setStatus] = useState<'loading' | 'none' | 'ok'>('loading');

  useEffect(() => {
    if (!readSession()) {
      setStatus('none');
      return;
    }
    fetchAvatarMe()
      .then((d) => {
        setData(d);
        setStatus('ok');
      })
      .catch(() => setStatus('none'));
  }, []);

  if (status !== 'ok' || !data) return null;

  const chrono = data.chronologicalAge;
  const bio = data.fiveAges.life;
  const delta = chrono - bio; // >0 = 더 젊음
  const ages: (AgeItem & { tile: string })[] = [
    { label: '생체나이', val: data.fiveAges.life, tile: 'tile-emerald' },
    { label: '혈관나이', val: data.fiveAges.vascular, tile: 'tile-rose' },
    { label: '피부나이', val: data.fiveAges.skin, tile: 'tile-amber' },
    { label: '골격나이', val: data.fiveAges.joint, tile: 'tile-sky' },
  ];
  const line1 =
    delta > 0
      ? `실제 나이에 비해 ${delta}세 젊어 보입니다`
      : delta < 0
        ? `실제 나이보다 ${-delta}세 높게 나타납니다`
        : '실제 나이와 비슷한 수준입니다';
  const worst = ages.reduce((a, b) => (b.val - chrono > a.val - chrono ? b : a));
  const line2 =
    worst.val > chrono
      ? `${worst.label.replace('나이', '')} 나이 관리가 필요합니다`
      : '전반적으로 건강한 상태입니다';

  return (
    <section className="card-shadow mt-4 rounded-3xl card-emerald px-5 py-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[13.5px] font-extrabold text-stone-900 dark:text-stone-100">
          <span className="accent-bar bg-emerald-500" />
          Digital Twin 생체나이 리포트
        </h2>
        <Link
          href="/bio-age"
          className="inline-flex items-center gap-0.5 rounded-full bg-brand-600 px-3 py-1 text-[11px] font-semibold text-white"
        >
          상세보기
          <ChevronRightIcon className="h-3.5 w-3.5" />
        </Link>
      </div>

      {data.name && (
        <p className="text-[12px] font-semibold text-stone-700 dark:text-stone-200">{data.name}</p>
      )}
      <div className="mt-1 flex items-end gap-3">
        <span className="text-3xl font-bold tabular-nums text-brand-700 dark:text-brand-300">
          {bio}세
        </span>
        <span className="pb-1 text-[12px] text-stone-500 dark:text-stone-400">
          실제나이 {chrono}세 ·{' '}
          <span className={delta >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
            {delta >= 0 ? `-${delta}` : `+${-delta}`}세
          </span>
        </span>
      </div>
      <p className="mt-1.5 text-[12px] leading-relaxed text-stone-600 dark:text-stone-300">{line1}</p>
      <p className="text-[12px] leading-relaxed text-stone-600 dark:text-stone-300">{line2}</p>

      {/* 건강 나이 4종 박스 (한 줄 4열, 대비 vivid 컬러) */}
      <div className="mt-3 grid grid-cols-4 gap-1.5">
        {ages.map((a) => (
          <div
            key={a.label}
            className={`${a.tile} card-shadow rounded-xl px-1.5 py-2.5 text-center`}
          >
            <p className="text-[9px] font-semibold text-white/85">{a.label}</p>
            <p className="mt-0.5 text-[16px] font-extrabold leading-none tabular-nums">
              {a.val}
              <span className="text-[10px] font-semibold text-white/85">세</span>
            </p>
            <p className="mt-1 text-[8.5px] font-medium leading-tight text-white/90">
              {gapNote(a.val, chrono)}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
