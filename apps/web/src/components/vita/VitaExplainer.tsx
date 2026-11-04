'use client';

// "Digital Twin & VITA code" 설명(첨부 PDF 5페이지 = Image 5 내용).
// 배너 클릭 목적지(/intro)와 VITA test 시작 전 안내(/vita-test)에서 공통 사용.
// 의료·윤리: 건강 위험 추정/생활습관 코칭이며 의학적 진단이 아니다.

type Point = { title: string; body: string };

function Section({
  accent,
  eyebrow,
  heading,
  points,
}: {
  accent: string;
  eyebrow: string;
  heading: string;
  points: Point[];
}) {
  return (
    <section className="card-shadow rounded-3xl bg-white px-5 py-5 dark:bg-stone-900">
      <h2 className="text-[15px] font-extrabold text-stone-900 dark:text-stone-100">
        <span className={`accent-bar ${accent}`} />
        {eyebrow}
      </h2>
      <p className="mt-2 text-[12.5px] font-semibold leading-relaxed text-stone-600 dark:text-stone-300">
        {heading}
      </p>
      <div className="mt-3 space-y-3">
        {points.map((p) => (
          <div key={p.title} className="rounded-2xl bg-stone-50 px-4 py-3 dark:bg-stone-800/60">
            <p className="text-[13px] font-bold text-stone-900 dark:text-stone-100">{p.title}</p>
            <p className="mt-1 text-[12px] leading-relaxed text-stone-600 dark:text-stone-300">
              {p.body}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function VitaExplainer() {
  return (
    <>
      {/* 히어로 */}
      <section className="grad-indigo card-shadow relative overflow-hidden rounded-3xl px-5 py-6">
        <span
          className="blob"
          style={{ width: 150, height: 150, right: -20, top: -30, background: 'radial-gradient(circle, #a5f3fc, transparent 70%)' }}
        />
        <h1 className="relative z-10 text-2xl font-black leading-tight">Digital Twin &amp; VITA code</h1>
        <p className="relative z-10 mt-3 text-[12.5px] leading-relaxed text-white/90">
          건강 관리가 매번 실패했던 이유는 내 몸에 맞지 않는 방법을 시도했거나, 노력이 눈에 보이지
          않아 중간에 포기했기 때문입니다. VITAcode는 <b>비타코드(정밀 검사)</b>로 내 몸의 정밀 지도를
          그리고, <b>디지털 트윈(가상 분신)</b>을 통해 내일의 건강을 미리 실험하여 가장 확실하게
          건강해지는 길을 제시합니다.
        </p>
      </section>

      <Section
        accent="bg-emerald-500"
        eyebrow="왜 비타코드(VITA code) 검사를 받아야 할까요?"
        heading="‘남들과 똑같은 건강법’일 수는 없습니다. 내 몸의 정확한 위치를 아는 것이 시작입니다."
        points={[
          {
            title: "어려운 검진 결과지를 쉬운 ‘4대 생체 나이’로 풀어줍니다",
            body:
              '복잡한 혈액 검사 수치만으로는 내 몸이 얼마나 늙어가고 있는지 알기 어렵습니다. 비타코드는 검진 데이터와 생체 신호를 분석해 내 상태를 대사·심폐·면역·자율신경 회복 나이라는 4가지 핵심 수치로 명쾌하게 풀어드립니다.',
          },
          {
            title: "나에게 필요한 ‘진짜 영양과 운동’을 핀셋처럼 집어냅니다",
            body:
              '남들이 다 먹는 영양제나 대중적인 운동이 나에게는 오히려 독이 될 수 있습니다. 비타코드 검사는 내 몸의 취약한 고리(예: 대사 기능 저하, 만성 피로)와 원인을 정밀하게 분석하여, 지금 내게 딱 맞는 솔루션만 정확히 짚어줍니다.',
          },
        ]}
      />

      <Section
        accent="bg-cyan-500"
        eyebrow="왜 디지털 트윈(Digital Twin)을 만들어야 할까요?"
        heading="보이지 않던 내 몸속 상태를 시각화하고, 미래를 미리 경험하는 나의 건강 분신입니다."
        points={[
          {
            title: "눈에 보이지 않는 몸속 변화를 ‘생생하게 3D’로 보여줍니다",
            body:
              '결과만 적힌 리포트는 와닿지 않습니다. 디지털 트윈은 내 간·혈관·심장 등을 3D로 시각화해 건강 상태의 변화를 눈으로 보여줍니다. 내 상태를 눈으로 보는 것만으로 건강 관리의 동기부여가 됩니다.',
          },
          {
            title: '실제 내 몸으로 무모한 실험을 할 필요가 없습니다',
            body:
              "‘이 영양제를 먹으면 효과가 있을까? 야식을 끊고 운동을 시작하면 내 대사 나이가 몇 살 줄어들까?’ 고민할 필요가 없습니다. 디지털 트윈에 원하는 변화(What-if)를 적용해보면 30일 뒤, 1년 뒤의 내 몸이 어떻게 변할지 미리 확인할 수 있습니다.",
          },
        ]}
      />

      <Section
        accent="bg-violet-500"
        eyebrow="비타코드의 디지털 트윈이 만들어 내는 변화"
        heading="정확한 분석(비타코드)과 실시간 예측(디지털 트윈)이 만들어내는 완벽한 건강 선순환"
        points={[
          {
            title: '나만의 정밀 분석 (VITA Code)',
            body: '건강검진과 생체 데이터를 통해 나의 정확한 4대 생체 나이와 취약점을 체크합니다.',
          },
          {
            title: '분석의 실시간 반영 (Digital Twin)',
            body:
              '스마트워치가 보내주는 실시간 수면·심박·활동량에 따라 디지털 트윈이 살아 움직이며 나의 일상 회복력을 트래킹합니다.',
          },
          {
            title: '미래 시뮬레이션 & 맞춤 가이드',
            body:
              '비타코드가 제안하는 맞춤 솔루션을 트윈에게 먼저 실험해보고, 최소한의 노력으로 최대의 효과를 되찾는 최적의 경로를 따라가기만 하면 됩니다.',
          },
        ]}
      />

      {/* 마무리 문구 */}
      <p className="px-3 text-center text-[13px] font-bold leading-relaxed grad-text">
        비타코드로 내 몸의 정밀 지도를 그리고,
        <br />
        디지털 트윈으로 더 젊어지는 내일을 미리 만나보세요.
      </p>
    </>
  );
}
