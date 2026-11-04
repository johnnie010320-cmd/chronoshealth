'use client';

// VITA test — 200문항 자가진단 전용 페이지(디지털 트윈 탭에서 분리).
// 질문 시작 전, 첨부 PDF 5페이지("Digital Twin & VITA code") 안내를 먼저 보여준다(2026-10-09 죠니).

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { LoginRequired } from '@/components/LoginRequired';
import { VitaSurvey } from '@/components/VitaSurvey';
import { VitaTestIntro } from '@/components/vita/VitaTestIntro';
import { ChevronRightIcon } from '@/components/HealthIcons';
import { readSession } from '@/lib/session';

export default function VitaTestPage() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [started, setStarted] = useState(false);
  useEffect(() => setSignedIn(!!readSession()), []);

  return (
    <AppShell title="VITA test" decoration="dots">
      {signedIn === false ? (
        <LoginRequired />
      ) : started ? (
        <div className="space-y-4 pb-12 pt-2">
          <section>
            <h1 className="text-2xl font-black tracking-tight text-stone-900 dark:text-stone-100">
              VITA test
            </h1>
            <p className="mt-1 text-[12px] leading-relaxed text-stone-500 dark:text-stone-400">
              200문항 자가검사로 내 몸의 정밀 대사 상태(VITA 코드)를 측정합니다. 결과는 VITA 코드
              탭에서 확인할 수 있습니다.
            </p>
          </section>
          <VitaSurvey />
        </div>
      ) : (
        <div className="space-y-4 pb-12 pt-3">
          {/* 질문 시작 전 안내(PDF 5페이지) */}
          <VitaTestIntro />

          {/* 나의 VITAcode 확인 — 이미 완료한 진단결과 페이지로 이동 (테스트 시작 버튼 바로 위) */}
          <Link
            href="/vita-result"
            className="grad-emerald card-shadow relative flex w-full items-center justify-between gap-2 overflow-hidden rounded-3xl px-5 py-5 text-left transition active:scale-[0.99]"
          >
            <span
              className="blob"
              style={{ width: 120, height: 120, right: -10, top: -24, background: 'radial-gradient(circle, #6ee7b7, transparent 70%)' }}
            />
            <span className="relative z-10">
              <span className="block text-base font-extrabold">나의 VITAcode 확인</span>
              <span className="mt-0.5 block text-[11px] text-white/85">
                이미 완료한 검사라면 VITA 코드 분석결과를 바로 확인하세요
              </span>
            </span>
            <span className="relative z-10 inline-flex shrink-0 items-center gap-0.5 rounded-full bg-white px-3.5 py-1.5 text-[12px] font-extrabold text-emerald-700">
              확인하기
              <ChevronRightIcon className="h-3.5 w-3.5" />
            </span>
          </Link>

          {/* 시작 버튼 — 누르면 200문항 설문으로 전환 */}
          <button
            type="button"
            onClick={() => setStarted(true)}
            className="grad-violet card-shadow relative flex w-full items-center justify-between gap-2 overflow-hidden rounded-3xl px-5 py-5 text-left transition active:scale-[0.99]"
          >
            <span
              className="blob"
              style={{ width: 120, height: 120, right: -10, top: -24, background: 'radial-gradient(circle, #f0abfc, transparent 70%)' }}
            />
            <span className="relative z-10">
              <span className="block text-base font-extrabold">VITA test 시작하기</span>
              <span className="mt-0.5 block text-[11px] text-white/85">
                200문항으로 나의 대사 유형(VITA 코드)을 찾으세요
              </span>
            </span>
            <span className="relative z-10 inline-flex shrink-0 items-center gap-0.5 rounded-full bg-white px-3.5 py-1.5 text-[12px] font-extrabold text-violet-700">
              시작하기
              <ChevronRightIcon className="h-3.5 w-3.5" />
            </span>
          </button>
        </div>
      )}
    </AppShell>
  );
}
