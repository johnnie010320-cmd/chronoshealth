'use client';

// AI 리포트 탭 — 데이터 "입력" 허브(정보구조 재편 2026-08).
// 목적: 국민건강보험공단 연동 + VITA 200문항 + 건강 기본정보 입력.
// 결과 표시는 러프=라이프 탭 / 상세=AI 진단 탭. (입력과 결과 분리)

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { LoginRequired } from '@/components/LoginRequired';
import { VitaSurvey } from '@/components/VitaSurvey';
import { NhisConnect } from '@/components/NhisConnect';
import { ChevronRightIcon, ClipboardIcon, SparkleIcon } from '@/components/HealthIcons';
import { IconBadge } from '@/components/IconBadge';
import { useI18n } from '@/lib/i18n';
import { readSession } from '@/lib/session';

type InputTab = 'direct' | 'nhis';

export default function ReportsPage() {
  const { t } = useI18n();
  const R = t.reports;
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [tab, setTab] = useState<InputTab>('direct');

  useEffect(() => {
    setSignedIn(!!readSession());
  }, []);

  return (
    <AppShell title={R.pageTitle} decoration="dots">
      {signedIn === false ? (
        <LoginRequired />
      ) : (
        <div className="space-y-4 pb-10 pt-3">
          <p className="px-1 text-[12px] leading-relaxed text-stone-500 dark:text-stone-400">
            건강 데이터를 입력하면 결과를 <b>라이프</b> 탭(요약)과 <b>AI 진단</b> 탭(상세)에서 확인할 수 있습니다.
          </p>

          {/* 입력 방식 세그먼트 */}
          <div className="flex rounded-2xl border border-stone-200 bg-white p-1 dark:border-stone-800 dark:bg-stone-900">
            {(
              [
                ['direct', '직접 입력'],
                ['nhis', '국민건강보험공단 연동'],
              ] as [InputTab, string][]
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`flex-1 rounded-xl px-3 py-2 text-[13px] font-semibold transition ${
                  tab === key
                    ? 'bg-brand-600 text-white'
                    : 'text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* 건강 기본정보 소스 — 직접 입력 or 국민건강보험공단 연동(택1) */}
          {tab === 'direct' ? (
            <Link
              href="/survey"
              className="card-shadow flex items-center gap-3 rounded-2xl bg-white px-4 py-4 transition active:scale-[0.99] dark:bg-stone-900"
            >
              <IconBadge Icon={ClipboardIcon} tone="violet" size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-bold text-stone-900 dark:text-stone-100">
                  건강 기본정보 입력
                </span>
                <span className="block text-[11px] text-stone-500 dark:text-stone-400">
                  나이·성별·활력 습관 등 — AI 리포트(활력·나이·의료비) 산출의 기본 데이터
                </span>
              </span>
              <ChevronRightIcon className="h-4 w-4 shrink-0 text-stone-400 dark:text-stone-500" />
            </Link>
          ) : (
            <NhisConnect />
          )}

          {/* VITA 자가진단 — 입력 방식과 무관하게 항상 추가로 수행해야 하는 필수 항목 */}
          <section>
            <div className="mb-1.5 flex items-center gap-2 px-1">
              <IconBadge Icon={SparkleIcon} tone="emerald" size="sm" />
              <h2 className="text-[11px] font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400">
                VITA 자가진단 (200문항)
              </h2>
              <span className="rounded-full bg-rose-50 px-1.5 py-0.5 text-[9px] font-semibold text-rose-600 dark:bg-rose-900/30 dark:text-rose-300">
                필수
              </span>
            </div>
            <p className="mb-2 px-1 text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">
              건강 기본정보 입력·국민건강보험공단 연동과 별개로, 반드시 추가 수행해야 하는 항목입니다.
            </p>
            <VitaSurvey />
          </section>

          <div className="rounded-2xl border border-stone-200/70 bg-white/70 px-4 py-3 text-[11px] leading-relaxed text-stone-600 dark:border-stone-800 dark:bg-stone-900/60 dark:text-stone-400">
            {R.disclaimer}
          </div>
        </div>
      )}
    </AppShell>
  );
}
