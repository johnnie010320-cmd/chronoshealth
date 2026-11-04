'use client';

// VITA test 안내(첨부 PDF 5페이지) — "내 몸속 슈퍼카 건강 리포트" 소개 + 평가 방법/점수 산정 체계(0~5점).
// 질문 시작 전 노출. 출처: VITAcode. 문구는 PDF 5페이지 원문 유지.

import { WellnessNotice } from '@/components/WellnessNotice';

type ScoreRow = { score: number; label: string; en: string; desc: string; tone: string };

const SCORE_ROWS: ScoreRow[] = [
  { score: 0, label: '전혀 없음', en: 'Optimal', desc: '해당 증상이 전혀 없거나 완벽히 건강한 상태/습관을 유지함', tone: 'bg-emerald-500' },
  { score: 1, label: '극히 드묾', en: 'Very Rare', desc: '월 1회 이하로 발생하거나 거의 느끼지 못하는 수준', tone: 'bg-teal-500' },
  { score: 2, label: '가끔 발생', en: 'Occasional', desc: '월 2~3회 또는 컨디션 난조 시 간헐적으로 발생함', tone: 'bg-sky-500' },
  { score: 3, label: '주기적 발생', en: 'Moderate', desc: '주 1~2회 지속적으로 발생하며 개선이 필요한 상태', tone: 'bg-amber-500' },
  { score: 4, label: '자주 발생', en: 'Severe', desc: '주 3~4회 이상 자주 겪으며 일상에 미세한 불편을 유발함', tone: 'bg-orange-500' },
  { score: 5, label: '매일/심각', en: 'Very Severe', desc: '매일 발생하거나 일상생활 수행에 지장을 줄 정도로 심각함', tone: 'bg-rose-500' },
];

export function VitaTestIntro() {
  return (
    <div className="space-y-4">
      {/* 히어로 */}
      <section className="grad-violet card-shadow relative overflow-hidden rounded-3xl px-5 py-6">
        <span
          className="blob"
          style={{ width: 150, height: 150, right: -24, top: -30, background: 'radial-gradient(circle, #f0abfc, transparent 70%)' }}
        />
        <h1 className="relative z-10 text-3xl font-black tracking-tight">VITA test</h1>
        <p className="relative z-10 mt-2 text-[13px] font-bold">
          비타테스트는 ‘내 몸속 슈퍼카 건강 리포트’예요!
        </p>
        <p className="relative z-10 mt-1.5 text-[12.5px] leading-relaxed text-white/90">
          우리가 타는 자동차는 모두 똑같지 않아요. 어떤 차는 <b>상당히 빠르게 달리는 스포츠카</b>이고,
          어떤 차는 <b>험한 길도 잘 올라가는 커다란 SUV</b>이며, 어떤 차는{' '}
          <b>전기와 기름을 같이 쓰는 하이브리드 차</b>지요.
        </p>
      </section>

      <section className="card-shadow rounded-3xl card-violet px-5 py-4">
        <p className="text-[12.5px] leading-relaxed text-stone-700 dark:text-stone-200">
          사람의 몸도 똑같답니다! 사람마다 몸속에서 에너지를 만들고, 피를 돌리고, 독소를 청소하는 방식이
          다 달라요.
        </p>
        <p className="mt-2 text-[12.5px] leading-relaxed text-stone-700 dark:text-stone-200">
          비타테스트는 “내 몸은 어떤 자동차일까?”, “내 몸엔 어떤 엔진이 달려 있을까?”를 알아보고, 내
          몸속 슈퍼카가 고장 나지 않고 평생 신나게 달리도록 관리하는 비밀 설명서를 만들어 주는
          테스트입니다.
        </p>
        <p className="mt-2 text-[12.5px] font-semibold leading-relaxed text-violet-700 dark:text-violet-300">
          내 몸을 꼼꼼히 분석하는 200개의 test를 통해 당신은 내 몸 설명서를 받게 됩니다! 자 이제 시작해
          볼까요?
        </p>
      </section>

      {/* 평가 방법 및 점수 산정 체계 */}
      <section className="card-shadow rounded-3xl bg-white px-5 py-4 dark:bg-stone-900">
        <h2 className="text-[15px] font-extrabold text-stone-900 dark:text-stone-100">
          <span className="accent-bar bg-violet-500" />
          평가 방법 및 점수 산정 체계
        </h2>
        <p className="mt-1 text-[12px] leading-relaxed text-stone-500 dark:text-stone-400">
          최근 1~3개월간 경험한 신체 상태와 생활 습관에 맞게 해당하는 점수 칸에 체크(✓)해 주세요.
        </p>
        <div className="mt-3 space-y-2">
          {SCORE_ROWS.map((r) => (
            <div key={r.score} className="flex items-start gap-3 rounded-2xl bg-stone-50 px-3 py-2.5 dark:bg-stone-800/60">
              <span className={`mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${r.tone} text-[13px] font-black text-white`}>
                {r.score}
              </span>
              <div className="min-w-0">
                <p className="text-[12.5px] font-bold text-stone-900 dark:text-stone-100">
                  {r.label} <span className="text-[10px] font-semibold text-stone-400">({r.en})</span>
                </p>
                <p className="text-[11.5px] leading-relaxed text-stone-600 dark:text-stone-300">
                  {r.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[12px] font-bold text-stone-700 dark:text-stone-200">아래 설문 200문항</p>
      </section>

      {/* 비의료기관 고지(죠니 지시) */}
      <WellnessNotice />
    </div>
  );
}
