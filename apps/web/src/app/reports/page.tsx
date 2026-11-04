'use client';

// 디지털 트윈 탭 — PDF 3번 페이지 구성(2026-10-07 죠니).
// Digital Twin 소개 → 기본 프로필 폼(출생연도/성별/키/몸무게/흡연/음주/운동/수면)
// → 데이터 소스 4종(VITA test / 국민건강보험공단 / 마이 루틴 / 웨어러블) → Digital Twin Simulation.

import { useEffect, useState, type ReactElement } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { LoginRequired } from '@/components/LoginRequired';
import { WearableConnect } from '@/components/WearableConnect';
import { TwinProfileForm } from '@/components/twin/TwinProfileForm';
import {
  ChevronRightIcon,
  SparkleIcon,
  FileTextIcon,
  ClipboardIcon,
  WatchIcon,
} from '@/components/HealthIcons';
import { readSession } from '@/lib/session';
import { useVitaResultT, formatRich } from '@/locales/vita-result';
import type { VitaResultDict } from '@/locales/vita-result/ko';

type Source = 'vita' | 'nhis' | 'routine' | 'wearable';

const SOURCES: { key: Source; label: keyof VitaResultDict['twin']; tile: string; Icon: (p: { className?: string; strokeWidth?: number }) => ReactElement }[] = [
  { key: 'vita', label: 'tileVita', tile: 'tile-violet', Icon: SparkleIcon },
  { key: 'nhis', label: 'tileNhis', tile: 'tile-sky', Icon: FileTextIcon },
  { key: 'routine', label: 'tileRoutine', tile: 'tile-emerald', Icon: ClipboardIcon },
  { key: 'wearable', label: 'tileWearable', tile: 'tile-amber', Icon: WatchIcon },
];

export default function ReportsPage() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [tab, setTab] = useState<Source>('vita');
  const t = useVitaResultT().t.twin;

  useEffect(() => {
    setSignedIn(!!readSession());
  }, []);

  return (
    <AppShell decoration="dots">
      {signedIn === false ? (
        <LoginRequired />
      ) : (
        <div className="space-y-4 pb-12 pt-2">
          {/* 소개 */}
          <section>
            <h1 className="text-3xl font-black tracking-tight text-stone-900 dark:text-stone-100">
              Digital Twin{t.titleSuffix && ' '}
              {t.titleSuffix && (
                <span className="font-extrabold text-stone-500 dark:text-stone-400">{t.titleSuffix}</span>
              )}
            </h1>
            <p className="mt-1 text-[12.5px] font-bold text-cyan-700 dark:text-cyan-300">
              {t.tagline}
            </p>
            <p className="mt-2 text-[12px] leading-relaxed text-stone-500 dark:text-stone-400">
              {t.desc}
            </p>
          </section>

          {/* 프로필 폼 */}
          <section>
            <p className="mb-4 text-[16px] font-bold leading-relaxed text-stone-800 dark:text-stone-100">
              {t.formLead}
            </p>
            <TwinProfileForm />
          </section>

          {/* 데이터 소스 소개 */}
          <p className="px-1 text-[12px] leading-relaxed text-stone-500 dark:text-stone-400">
            {formatRich(t.sourcesDesc, {
              vita: <b>{t.srcVita}</b>,
              nhis: <b>{t.srcNhis}</b>,
              routine: <b>{t.srcRoutine}</b>,
              wearable: <b>{t.srcWearable}</b>,
            })}
          </p>

          {/* 데이터 소스 4종 (한 줄 4열, vivid) */}
          <div className="grid grid-cols-4 gap-2.5">
            {SOURCES.map(({ key, label, tile, Icon }) => {
              const active = tab === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTab(key)}
                  className={`${tile} card-shadow flex flex-col items-center gap-1.5 rounded-2xl px-1 py-3 text-center transition active:scale-[0.96] ${
                    active ? 'ring-2 ring-white ring-offset-2 ring-offset-transparent' : 'opacity-85'
                  }`}
                >
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/25">
                    <Icon className="h-5 w-5 text-white" strokeWidth={2.1} />
                  </span>
                  <span className="whitespace-pre-line text-[10px] font-bold leading-tight text-white">
                    {t[label] as string}
                  </span>
                </button>
              );
            })}
          </div>

          {/* 선택된 소스 콘텐츠 */}
          {tab === 'vita' ? (
            <Link
              href="/vita-test"
              className="card-shadow flex items-center gap-3 rounded-3xl card-violet px-4 py-4 transition active:scale-[0.99]"
            >
              <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-500 text-white">
                <SparkleIcon className="h-6 w-6" strokeWidth={2} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-bold text-stone-900 dark:text-stone-100">
                  {t.vitaTitle}
                </span>
                <span className="block text-[11px] text-stone-500 dark:text-stone-400">
                  {t.vitaDesc}
                </span>
              </span>
              <ChevronRightIcon className="h-4 w-4 shrink-0 text-stone-400 dark:text-stone-500" />
            </Link>
          ) : tab === 'nhis' ? (
            <Link
              href="/checkup"
              className="card-shadow flex items-center gap-3 rounded-3xl card-sky px-4 py-4 transition active:scale-[0.99]"
            >
              <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-500 text-white">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
                  <path d="M12 3 4 6v6c0 4.5 3.4 7.9 8 9 4.6-1.1 8-4.5 8-9V6z" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-extrabold text-stone-900 dark:text-stone-100">
                  {t.nhisTitle}
                </span>
                <span className="mt-0.5 block text-[11.5px] leading-relaxed text-stone-500 dark:text-stone-400">
                  {t.nhisDesc}
                </span>
              </span>
              <ChevronRightIcon className="h-4 w-4 shrink-0 text-stone-400 dark:text-stone-500" />
            </Link>
          ) : tab === 'routine' ? (
            <Link
              href="/my-routine"
              className="card-shadow flex items-center gap-3 rounded-3xl card-emerald px-4 py-4 transition active:scale-[0.99]"
            >
              <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-500 text-white">
                <ClipboardIcon className="h-6 w-6" strokeWidth={2} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-bold text-stone-900 dark:text-stone-100">
                  {t.routineTitle}
                </span>
                <span className="block text-[11px] text-stone-500 dark:text-stone-400">
                  {t.routineDesc}
                </span>
              </span>
              <ChevronRightIcon className="h-4 w-4 shrink-0 text-stone-400 dark:text-stone-500" />
            </Link>
          ) : (
            <WearableConnect />
          )}

          {/* 디지털 트윈 시뮬레이션 — 별도 페이지 버튼 */}
          <Link
            href="/twin-sim"
            className="grad-cyan card-shadow relative flex items-center justify-between gap-2 overflow-hidden rounded-3xl px-5 py-5 transition active:scale-[0.99]"
          >
            <span
              className="blob"
              style={{ width: 120, height: 120, right: -10, top: -24, background: 'radial-gradient(circle, #fde68a, transparent 70%)' }}
            />
            <span className="relative z-10">
              <span className="block text-base font-extrabold">{t.simTitle}</span>
              <span className="mt-0.5 block text-[11px] text-white/85">
                {t.simDesc}
              </span>
            </span>
            <span className="relative z-10 inline-flex shrink-0 items-center gap-0.5 rounded-full bg-white px-3.5 py-1.5 text-[12px] font-extrabold text-cyan-700">
              {t.open}
              <ChevronRightIcon className="h-3.5 w-3.5" />
            </span>
          </Link>
        </div>
      )}
    </AppShell>
  );
}
