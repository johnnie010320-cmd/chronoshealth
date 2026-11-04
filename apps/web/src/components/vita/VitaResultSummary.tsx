'use client';

// VITA test 완료 결과 화면 — 첨부 PDF 6페이지("VITAcode" 결과 요약) 재현.
// 생성 데이터는 기존 모델(VITA_ARCHETYPES via buildVitaReport) + 실제 측정 영역 점수 사용(날조 없음).
// 일반 문구(제목/소개/특허·상표)는 PDF 6페이지 원문 그대로. 출처: VITA CODE V8.

import { useEffect, useState, type ReactElement } from 'react';
import Link from 'next/link';
import {
  ChevronRightIcon,
  TrophyIcon,
  ActivityIcon,
  SparkleIcon,
  CoinIcon,
} from '@/components/HealthIcons';
import { buildVitaReport } from '@/lib/vita/reports';
import { VitaRadar, BandBars, BandLegend } from '@/components/charts/VitaCharts';
import { vitaAnimal, vitaAnimalImage } from '@/lib/vita/animals';
import { useTwinNickname } from '@/lib/profile-state';
import { fetchSiteContent, type VitaSavedResult } from '@/lib/api-client';
import { WellnessNotice } from '@/components/WellnessNotice';
import { VitaShareButton } from '@/components/vita/VitaShareButton';
import { useVitaResultT, formatRich } from '@/locales/vita-result';

const DEFAULT_RESULT_LEGAL =
  '비타코드 특허 출원번호 제10-2026-0197729호';

export function VitaResultSummary({ saved }: { saved: VitaSavedResult }) {
  const nickname = useTwinNickname();
  const [legal, setLegal] = useState(DEFAULT_RESULT_LEGAL);
  const { t: vr, locale } = useVitaResultT();
  const t = vr.summary;

  useEffect(() => {
    fetchSiteContent()
      .then((c) => {
        const v = c['app_vitacode_result_desc'];
        if (v && v.trim()) setLegal(v.trim());
      })
      .catch(() => {});
  }, []);

  const report = buildVitaReport(saved.sectionScores, locale);
  const chartData = report.sectionRows.map((r) => ({
    no: r.no,
    label: r.title,
    score: r.score,
    band: r.band,
  }));
  const arc = report.archetype;
  const tx = report.text;
  const animal = vitaAnimal(saved.code);
  const legalLines = legal.split('\n').map((l) => l.trim()).filter(Boolean);
  const who = t.who(nickname || null);
  // 영문은 현지화 별명 = 원문 영문 별명이라 괄호 병기를 생략한다.
  const defName = tx && arc ? (tx.nickname === arc.nicknameEn ? tx.nickname : `${tx.nickname} (${arc.nicknameEn})`) : '';

  return (
    <div className="space-y-4">
      {/* 제출 확인 */}
      <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 dark:bg-emerald-900/25">
        <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </span>
        <p className="text-[12.5px] font-bold text-emerald-800 dark:text-emerald-200">
          {t.done}
        </p>
      </div>

      {/* 제목 + 소개 (PDF 6페이지 원문) */}
      <section>
        <h1 className="text-3xl font-black tracking-tight text-stone-900 dark:text-stone-100">
          VITAcode
        </h1>
        <p className="mt-1 text-[13px] font-bold text-emerald-700 dark:text-emerald-300">
          {t.subtitle}
        </p>
        <p className="mt-2 text-[12px] leading-relaxed text-stone-500 dark:text-stone-400">
          {t.intro1}
        </p>
        <p className="mt-2 text-[12px] leading-relaxed text-stone-500 dark:text-stone-400">
          {t.intro2}
        </p>
      </section>

      {/* 결과 박스 */}
      <section className="card-shadow overflow-hidden rounded-3xl card-violet px-5 py-5">
        <p className="text-[12.5px] font-bold text-stone-700 dark:text-stone-200">
          {formatRich(t.codeIs, { who, code: <b className="text-violet-700 dark:text-violet-300">{saved.code}</b> })}
        </p>
        <div className="mt-3 flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={vitaAnimalImage(saved.code)}
            alt={animal?.name[locale] ?? saved.code}
            className="h-16 shrink-0 rounded-xl bg-white/70 object-contain dark:bg-stone-800"
            style={{ width: 84 }}
          />
          <div className="min-w-0 flex-1">
            <p className="text-3xl font-black tracking-[0.08em] text-stone-900 dark:text-stone-100">
              {saved.code}
            </p>
            <p className="mt-0.5 text-[15px] font-extrabold leading-tight text-violet-700 dark:text-violet-300">
              {tx?.nickname ?? ''}
            </p>
            {arc?.nicknameEn && locale !== 'en' && (
              <p className="text-[11px] font-semibold text-stone-500 dark:text-stone-400">
                {arc.nicknameEn}
              </p>
            )}
          </div>
        </div>

        {arc && tx && (
          <div className="mt-4 space-y-3">
            <div>
              <p className="text-[12px] font-extrabold text-stone-800 dark:text-stone-100">{t.combo}</p>
              <p className="mt-0.5 text-[12px] leading-relaxed text-stone-600 dark:text-stone-300">
                {arc.engines.join(' + ')}
              </p>
            </div>
            {tx.strengths.length > 0 && (
              <div>
                <p className="text-[12px] font-extrabold text-stone-800 dark:text-stone-100">{t.features}</p>
                <ul className="mt-1 space-y-1">
                  {tx.strengths.map((s, i) => (
                    <li key={i} className="flex gap-1.5 text-[12px] leading-relaxed text-stone-600 dark:text-stone-300">
                      <span className="mt-[2px] text-violet-500">•</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </section>

      {/* SNS 공유 — 앱 받기 링크 동봉 */}
      <VitaShareButton
        code={saved.code}
        nickname={tx?.nickname ?? ''}
        codeIsLine={t.shareCodeIs(who)}
      />

      {/* 1) 정의 — 4대 축 */}
      {arc && tx && (
        <section className="card-shadow rounded-3xl bg-white px-5 py-4 dark:bg-stone-900">
          <h2 className="text-[14px] font-extrabold text-stone-900 dark:text-stone-100">
            <span className="accent-bar bg-violet-500" />
            {t.definition(saved.code, defName)}
          </h2>
          <ul className="mt-2 space-y-1.5">
            {tx.axisLines.map((line, i) => (
              <li key={i} className="flex gap-1.5 text-[12px] leading-relaxed text-stone-600 dark:text-stone-300">
                <span className="mt-[2px] text-emerald-500">•</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 2) 판단 근거 — VITA Test 10개 영역 실측 점수 */}
      <section className="card-shadow rounded-3xl bg-white px-5 py-4 dark:bg-stone-900">
        <h2 className="text-[14px] font-extrabold text-stone-900 dark:text-stone-100">
          <span className="accent-bar bg-cyan-500" />
          {t.evidenceTitle}
        </h2>
        <p className="mt-1 text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">
          {t.evidenceDesc}
        </p>
        {/* 레이더 그래프 — 10개 영역을 한눈에 */}
        <div className="mt-2">
          <VitaRadar data={chartData} />
        </div>
        <div className="mt-1 flex justify-center">
          <BandLegend />
        </div>
        {/* 영역별 바 그래프 */}
        <div className="mt-3">
          <BandBars data={chartData} />
        </div>
      </section>

      {/* 바로가기 4박스 (PDF 6페이지) */}
      <section className="grid grid-cols-2 gap-2.5">
        <ResultBox href="/ranking" Icon={TrophyIcon} tile="tile-amber" title={t.ranking} />
        <ResultBox href="/bio-age" Icon={ActivityIcon} tile="tile-sky" title={t.bioAge} />
        <ResultBox href="/vita-score" Icon={SparkleIcon} tile="tile-violet" title={t.vitaScore} />
        <ResultBox href="/medical-cost" Icon={CoinIcon} tile="tile-rose" title={t.medicalCost} />
      </section>

      {/* 상세 가이드 */}
      <Link
        href="/ai-diagnosis"
        className="grad-emerald card-shadow relative flex items-center justify-between gap-2 overflow-hidden rounded-3xl px-5 py-4 transition active:scale-[0.99]"
      >
        <span className="relative z-10">
          <span className="block text-[15px] font-extrabold">{t.guideTitle}</span>
          <span className="mt-0.5 block text-[11px] text-white/85">
            {t.guideSub}
          </span>
        </span>
        <span className="relative z-10 inline-flex shrink-0 items-center gap-0.5 rounded-full bg-white px-3.5 py-1.5 text-[12px] font-extrabold text-emerald-700">
          {t.view}
          <ChevronRightIcon className="h-3.5 w-3.5" />
        </span>
      </Link>

      {/* 특허/상표 */}
      {legalLines.length > 0 && (
        <div className="border-t border-stone-100 pt-2.5 dark:border-stone-800">
          {legalLines.map((l, i) => (
            <p key={i} className="text-[10px] leading-relaxed text-stone-400 dark:text-stone-500">
              {l}
            </p>
          ))}
        </div>
      )}

      {/* 비의료기관 고지(죠니 지시) */}
      <WellnessNotice className="mt-1" />
    </div>
  );
}

function ResultBox({
  href,
  Icon,
  tile,
  title,
}: {
  href: string;
  Icon: (p: { className?: string; strokeWidth?: number }) => ReactElement;
  tile: string;
  title: string;
}) {
  return (
    <Link
      href={href}
      className={`${tile} card-shadow flex items-center gap-2.5 rounded-2xl px-3.5 py-3.5 transition active:scale-[0.97]`}
    >
      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/25">
        <Icon className="h-[18px] w-[18px] text-white" strokeWidth={2.1} />
      </span>
      <span className="text-[11.5px] font-bold leading-tight text-white">{title}</span>
    </Link>
  );
}
