'use client';

// 배너 클릭 → "Digital Twin & VITA code" 설명 페이지 (첨부 PDF 5페이지 = Image 5 내용).
// 본문은 VitaExplainer 공통 컴포넌트(= VITA test 시작 전 안내와 동일) + 이 페이지 전용 CTA 2종.

import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { VitaExplainer } from '@/components/vita/VitaExplainer';
import { ChevronRightIcon, SparkleIcon, TwinFilledIcon } from '@/components/HealthIcons';

export default function IntroPage() {
  return (
    <AppShell decoration="dots">
      <div className="space-y-4 pb-12 pt-3">
        <VitaExplainer />

        {/* CTA 2종 */}
        <Link
          href="/reports"
          className="grad-cyan card-shadow relative flex items-center justify-between gap-2 overflow-hidden rounded-3xl px-5 py-4"
        >
          <span
            className="blob"
            style={{ width: 110, height: 110, right: -10, top: -20, background: 'radial-gradient(circle, #fde68a, transparent 70%)' }}
          />
          <span className="relative z-10 flex items-center gap-2 text-base font-extrabold">
            <TwinFilledIcon className="h-6 w-6 text-white" />
            Digital Twin 만들기
          </span>
          <span className="relative z-10 inline-flex items-center gap-0.5 rounded-full bg-white px-3.5 py-1.5 text-[12px] font-extrabold text-cyan-700">
            만들기
            <ChevronRightIcon className="h-3.5 w-3.5" />
          </span>
        </Link>

        <Link
          href="/vita-test"
          className="grad-violet card-shadow relative flex items-center justify-between gap-2 overflow-hidden rounded-3xl px-5 py-4"
        >
          <span
            className="blob"
            style={{ width: 110, height: 110, right: -10, top: -20, background: 'radial-gradient(circle, #f0abfc, transparent 70%)' }}
          />
          <span className="relative z-10 flex items-center gap-2 text-base font-extrabold">
            <SparkleIcon className="h-6 w-6 text-white" />
            VITA test 바로가기
          </span>
          <span className="relative z-10 inline-flex items-center gap-0.5 rounded-full bg-white px-3.5 py-1.5 text-[12px] font-extrabold text-violet-700">
            바로가기
            <ChevronRightIcon className="h-3.5 w-3.5" />
          </span>
        </Link>
      </div>
    </AppShell>
  );
}
