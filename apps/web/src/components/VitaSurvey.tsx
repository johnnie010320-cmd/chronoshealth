'use client';

// VITA 자가진단 200문항 설문(10영역 × 20문항, 문항당 0~5점).
// 영역 단위 스텝퍼로 진행 → 제출 시 영역별 점수 산출 후 DB 저장(submitVita).
// 결과(요약/상세)는 라이프·AI진단 탭에서 조회한다(입력과 결과 분리).
// VITA 콘텐츠는 원문(한국어) 기준 — 현지화는 후속 과제.

import { useMemo, useRef, useState } from 'react';
import { ChevronRightIcon } from '@/components/HealthIcons';
import { VitaResultSummary } from '@/components/vita/VitaResultSummary';
import { submitVita, type VitaAnswers, type VitaSectionScores, type VitaSavedResult } from '@/lib/api-client';
import { VITA_SECTIONS, type VitaSectionId } from '@/lib/vita/engine';
import { VITA_ANSWER_OPTIONS, VITA_QUESTIONS, type VitaAnswerLevel } from '@/lib/vita/questions';

type AnswerMap = Record<string, VitaAnswerLevel>; // key = `${section}:${no}`

function qKey(section: VitaSectionId, no: number): string {
  return `${section}:${no}`;
}

export function VitaSurvey({ onComplete }: { onComplete?: (r: VitaSavedResult) => void }) {
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [step, setStep] = useState(0); // 0~9 영역 인덱스
  const [busy, setBusy] = useState(false);
  const [errCode, setErrCode] = useState<string | null>(null);
  const [done, setDone] = useState<VitaSavedResult | null>(null);
  const topRef = useRef<HTMLDivElement>(null);

  // 영역 이동 시 다음 영역 최상단으로 화면 스크롤(2026-10-09 죠니).
  function goToStep(next: number) {
    setStep((s) => {
      const clamped = Math.max(0, Math.min(VITA_SECTIONS.length - 1, next));
      if (clamped !== s) {
        requestAnimationFrame(() =>
          topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
        );
      }
      return clamped;
    });
  }

  const section = VITA_SECTIONS[step];
  const questions = useMemo(
    () => VITA_QUESTIONS.filter((q) => q.section === section?.id),
    [section?.id],
  );

  const answeredInSection = questions.filter((q) => answers[qKey(q.section, q.no)] !== undefined).length;
  const sectionComplete = section ? answeredInSection === questions.length : false;
  const totalAnswered = Object.keys(answers).length;
  const isLast = step === VITA_SECTIONS.length - 1;

  function setAnswer(section: VitaSectionId, no: number, value: VitaAnswerLevel) {
    setAnswers((prev) => ({ ...prev, [qKey(section, no)]: value }));
  }

  function computeSectionScores(): VitaSectionScores {
    const out = {} as VitaSectionScores;
    for (const s of VITA_SECTIONS) {
      let sum = 0;
      for (const q of VITA_QUESTIONS) {
        if (q.section === s.id) sum += answers[qKey(s.id, q.no)] ?? 0;
      }
      (out as Record<string, number>)[s.id] = sum;
    }
    return out;
  }

  // 200문항 답 원본(영역별 1~20번 순서). 서버가 강도 가중·또래 기준선으로 유형을 정한다(v8.1).
  function collectAnswers(): VitaAnswers {
    const out = {} as VitaAnswers;
    for (const s of VITA_SECTIONS) {
      const row: number[] = [];
      for (let no = 1; no <= 20; no += 1) row.push(answers[qKey(s.id, no)] ?? 0);
      out[s.id] = row;
    }
    return out;
  }

  async function handleSubmit() {
    setBusy(true);
    setErrCode(null);
    try {
      const saved = await submitVita(computeSectionScores(), collectAnswers());
      setDone(saved);
      onComplete?.(saved);
    } catch (err) {
      setErrCode(err instanceof Error ? err.message : 'generic');
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return <VitaResultSummary saved={done} />;
  }

  if (!section) return null;

  return (
    <div className="space-y-3">
      <div ref={topRef} className="scroll-mt-4" />
      {/* 진행 헤더 */}
      <div className="card-shadow rounded-2xl bg-gradient-to-br from-brand-700 via-teal-600 to-emerald-500 px-5 py-4 text-white">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] opacity-90">
            VITA 자가검사 {step + 1}/{VITA_SECTIONS.length}
          </p>
          <span className="text-[11px] font-semibold opacity-90 tabular-nums">
            총 {totalAnswered}/200
          </span>
        </div>
        <h2 className="mt-1.5 text-[16px] font-bold leading-tight">
          {section.no}. {section.titleKo}
        </h2>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/25">
          <div
            className="h-full rounded-full bg-white transition-all"
            style={{ width: `${(totalAnswered / 200) * 100}%` }}
          />
        </div>
      </div>

      <p className="px-1 text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">
        최근 1~3개월간 경험한 신체 상태·생활 습관에 맞춰 응답해 주세요.
      </p>

      {/* 문항 */}
      <ul className="space-y-2">
        {questions.map((q) => {
          const key = qKey(q.section, q.no);
          const val = answers[key];
          return (
            <li key={key} className="card-shadow rounded-2xl bg-white px-4 py-3 dark:bg-stone-900">
              <p className="text-[13px] leading-relaxed text-stone-800 dark:text-stone-100">
                <span className="mr-1 font-semibold text-stone-400">{q.no}.</span>
                {q.ko}
              </p>
              <div className="mt-2 grid grid-cols-6 gap-1">
                {VITA_ANSWER_OPTIONS.map((opt) => {
                  const active = val === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setAnswer(q.section, q.no, opt.value)}
                      className={`rounded-lg border px-0.5 py-1.5 text-center font-semibold leading-tight transition active:scale-[0.97] ${
                        active
                          ? 'border-brand-500 bg-brand-600 text-white'
                          : 'border-stone-200 bg-white text-stone-500 hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-400 dark:hover:bg-stone-800'
                      }`}
                    >
                      <span className="block text-[13px] tabular-nums">{opt.value}</span>
                      <span className="block text-[8px] opacity-90">{opt.ko}</span>
                    </button>
                  );
                })}
              </div>
            </li>
          );
        })}
      </ul>

      {errCode && (
        <p className="px-1 text-[12px] text-rose-600 dark:text-rose-300">
          제출에 실패했습니다. 다시 시도해 주세요.
        </p>
      )}

      {/* 이동 */}
      <div className="flex items-center gap-2 pt-1">
        {step > 0 && (
          <button
            type="button"
            onClick={() => goToStep(step - 1)}
            className="rounded-2xl border border-stone-300 px-4 py-3 text-[13px] font-semibold text-stone-700 transition active:scale-[0.98] dark:border-stone-700 dark:text-stone-200"
          >
            이전
          </button>
        )}
        {!isLast ? (
          <button
            type="button"
            disabled={!sectionComplete}
            onClick={() => goToStep(step + 1)}
            className="inline-flex flex-1 items-center justify-between rounded-2xl bg-stone-900 px-5 py-3 text-[14px] font-semibold text-white transition active:scale-[0.98] disabled:opacity-50 dark:bg-white dark:text-stone-900"
          >
            <span>{sectionComplete ? '다음 영역' : `이 영역 응답 (${answeredInSection}/${questions.length})`}</span>
            <ChevronRightIcon className="h-5 w-5" />
          </button>
        ) : (
          <button
            type="button"
            disabled={busy || totalAnswered < 200}
            onClick={() => void handleSubmit()}
            className="inline-flex flex-1 items-center justify-between rounded-2xl bg-brand-700 px-5 py-3 text-[14px] font-semibold text-white transition active:scale-[0.98] disabled:opacity-50"
          >
            <span>{busy ? '확인 중…' : totalAnswered < 200 ? `전체 응답 필요 (${totalAnswered}/200)` : '나의 VITAcode 확인'}</span>
            <ChevronRightIcon className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  );
}
