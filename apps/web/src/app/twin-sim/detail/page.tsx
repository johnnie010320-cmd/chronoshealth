'use client';

// 디지털 트윈 시뮬레이션 상세 — PDF 4페이지(좌측 목업)의 시뮬레이션 5종 설명.
// "데이터 종합 소스 > 자세히 보기"에서 진입.
// 의료·윤리: 아래 수치·시나리오는 "시뮬레이션이 보여줄 예시"이며 사용자의 실제 결과가 아니다.
// 실제 예측은 데이터(검진·웨어러블·VITA) 연동 후 산출된다. 단정 아님(예측/가설).
// 시뮬레이션 5종 문구(4개 언어)는 locales/vita-result/*.ts 의 simDetail.blocks.

import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { ChevronRightIcon } from '@/components/HealthIcons';
import { useVitaResultT, formatRich } from '@/locales/vita-result';

export default function TwinSimDetailPage() {
  const t = useVitaResultT().t.simDetail;
  return (
    <AppShell title={t.title} decoration="dots">
      <div className="space-y-4 pb-12 pt-2">
        <section>
          <h1 className="text-2xl font-black tracking-tight text-stone-900 dark:text-stone-100">
            Digital Twin Simulation
          </h1>
          <p className="mt-1.5 text-[13px] font-bold text-cyan-700 dark:text-cyan-300">
            {t.tagline}
          </p>
          {/* 제목 아래 이미지 */}
          <div className="card-shadow mt-3 overflow-hidden rounded-3xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/vita/sim-stretch.jpg"
              alt={t.imgAlt}
              className="h-44 w-full object-cover"
            />
          </div>
          <p className="mt-2 rounded-2xl bg-amber-50 px-4 py-3 text-[11.5px] leading-relaxed text-amber-800 dark:bg-amber-900/25 dark:text-amber-200">
            {formatRich(t.notice, { ex: <b>{t.noticeEx}</b> })}
          </p>
        </section>

        {t.blocks.map((b, bi) => (
          <section key={bi} className="card-shadow rounded-3xl bg-white px-5 py-4 dark:bg-stone-900">
            <h2 className="text-[15px] font-extrabold text-stone-900 dark:text-stone-100">
              <span className="accent-bar bg-cyan-500" />
              {bi + 1}. {b.title}
            </h2>
            <p className="mt-1 text-[12px] leading-relaxed text-stone-500 dark:text-stone-400">
              {b.desc}
            </p>
            <ul className="mt-3 space-y-2.5">
              {b.items.map((it, i) => (
                <li key={i} className="rounded-2xl bg-stone-50 px-4 py-3 dark:bg-stone-800/60">
                  <p className="text-[12.5px] font-bold leading-relaxed text-stone-800 dark:text-stone-100">
                    {it.q}
                  </p>
                  <p className="mt-1 flex gap-1.5 text-[12px] leading-relaxed text-cyan-700 dark:text-cyan-300">
                    <span className="font-bold">→</span>
                    <span>{it.a}</span>
                  </p>
                </li>
              ))}
            </ul>
          </section>
        ))}

        {/* 시뮬레이션 시작 */}
        <Link
          href="/simulate"
          className="grad-cyan card-shadow relative flex items-center justify-between gap-2 overflow-hidden rounded-3xl px-5 py-5 transition active:scale-[0.99]"
        >
          <span
            className="blob"
            style={{ width: 120, height: 120, right: -10, top: -24, background: 'radial-gradient(circle, #fde68a, transparent 70%)' }}
          />
          <span className="relative z-10">
            <span className="block text-base font-extrabold">{t.start}</span>
            <span className="mt-0.5 block text-[11px] text-white/85">
              {t.startDesc}
            </span>
          </span>
          <span className="relative z-10 inline-flex shrink-0 items-center gap-0.5 rounded-full bg-white px-3.5 py-1.5 text-[12px] font-extrabold text-cyan-700">
            {t.go}
            <ChevronRightIcon className="h-3.5 w-3.5" />
          </span>
        </Link>
      </div>
    </AppShell>
  );
}
