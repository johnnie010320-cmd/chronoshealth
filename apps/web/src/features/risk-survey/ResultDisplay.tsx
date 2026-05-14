import type { RiskSurveyResponse } from '@/lib/schemas';

type Props = {
  data: RiskSurveyResponse;
  onReset: () => void;
};

const CATEGORY_COLOR: Record<'low' | 'moderate' | 'high', string> = {
  low: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-200 dark:border-emerald-900',
  moderate: 'bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-900',
  high: 'bg-red-50 text-red-900 border-red-200 dark:bg-red-950 dark:text-red-200 dark:border-red-900',
};

const CATEGORY_LABEL: Record<'low' | 'moderate' | 'high', string> = {
  low: '낮음',
  moderate: '보통',
  high: '높음',
};

export function ResultDisplay({ data, onReset }: Props) {
  const hasHotlines =
    data.hotlines.suicidePrevention || data.hotlines.mentalHealthCrisis;

  return (
    <div className="space-y-6">
      {hasHotlines && <HotlinesBanner hotlines={data.hotlines} />}

      <header className="space-y-1">
        <p className="text-xs uppercase tracking-widest text-gray-500">
          모의 리포트 · {data.modelVersion}
        </p>
        <h1 className="text-2xl md:text-3xl font-bold">건강 위험 추정 리포트</h1>
        <p className="text-xs text-gray-500">
          생성: {new Date(data.generatedAt).toLocaleString('ko-KR')} · ID: {data.reportId.slice(0, 8)}
        </p>
      </header>

      <BioAgeCard bio={data.bioAge} />

      <Section title="5년 주요 질병 위험">
        {data.diseaseRisk.length === 0 ? (
          <Empty>표시할 위험 항목이 없습니다.</Empty>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {data.diseaseRisk.map((r) => (
              <DiseaseRiskCard key={r.code} risk={r} />
            ))}
          </div>
        )}
      </Section>

      <Section title="개선 행동 제안">
        {data.improvement.length === 0 ? (
          <Empty>현 단계는 모의값입니다. 실제 계산식 도입 후 개인 맞춤 제안이 표시됩니다.</Empty>
        ) : (
          <div className="space-y-2">
            {data.improvement.map((i, idx) => (
              <ImprovementCard key={idx} improvement={i} />
            ))}
          </div>
        )}
      </Section>

      <div className="p-4 rounded-lg border border-gray-200 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-900">
        <p className="text-sm text-gray-700 dark:text-gray-300">{data.disclaimer}</p>
      </div>

      <button
        type="button"
        onClick={onReset}
        className="w-full py-3 border border-gray-300 dark:border-neutral-700 rounded-full text-sm font-medium hover:bg-gray-50 dark:hover:bg-neutral-900 transition"
      >
        설문 다시 작성
      </button>
    </div>
  );
}

function BioAgeCard({ bio }: { bio: RiskSurveyResponse['bioAge'] }) {
  const diff = bio.value - bio.chronologicalAge;
  const tone =
    diff <= 0
      ? 'text-emerald-700 dark:text-emerald-300'
      : diff <= 3
        ? 'text-amber-700 dark:text-amber-300'
        : 'text-red-700 dark:text-red-300';

  return (
    <div className="p-6 rounded-xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
      <p className="text-xs uppercase tracking-widest text-gray-500 mb-2">생체 나이 추정</p>
      <div className="flex items-baseline gap-3 flex-wrap">
        <span className="text-5xl font-bold">{bio.value}</span>
        <span className="text-sm text-gray-500">세</span>
        <span className={`text-sm font-medium ${tone}`}>
          실제 나이 {bio.chronologicalAge}세 대비 {diff >= 0 ? '+' : ''}
          {diff}년
        </span>
      </div>
      <p className="text-xs text-gray-500 mt-2">
        95% 신뢰구간: {bio.ci95[0]} ~ {bio.ci95[1]}세
      </p>
      {bio.topContributors.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-neutral-800">
          <p className="text-xs text-gray-500 mb-2">주요 기여 요인 (상위 3)</p>
          <ul className="space-y-1 text-sm">
            {bio.topContributors.map((c, i) => (
              <li key={i} className="flex items-center gap-2">
                <span
                  className={
                    c.direction === 'accelerate'
                      ? 'text-red-600'
                      : 'text-emerald-600'
                  }
                >
                  {c.direction === 'accelerate' ? '↑' : '↓'}
                </span>
                <span>{c.factor}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function DiseaseRiskCard({ risk }: { risk: RiskSurveyResponse['diseaseRisk'][number] }) {
  const pct = (risk.probability5y * 100).toFixed(1);
  return (
    <div className={`p-4 rounded-lg border ${CATEGORY_COLOR[risk.riskCategory]}`}>
      <p className="text-xs uppercase tracking-widest opacity-75">{risk.code}</p>
      <p className="text-base font-semibold mt-1">{risk.label}</p>
      <div className="flex items-baseline gap-2 mt-2">
        <span className="text-2xl font-bold">{pct}%</span>
        <span className="text-xs opacity-80">5년 위험 · {CATEGORY_LABEL[risk.riskCategory]}</span>
      </div>
      {risk.modifiableFactors.length > 0 && (
        <p className="text-xs opacity-80 mt-2">
          개선 가능: {risk.modifiableFactors.join(', ')}
        </p>
      )}
    </div>
  );
}

function ImprovementCard({
  improvement,
}: {
  improvement: RiskSurveyResponse['improvement'][number];
}) {
  return (
    <div className="p-4 rounded-lg border border-gray-200 dark:border-neutral-800 flex items-start justify-between gap-3">
      <div>
        <p className="text-sm font-medium">{improvement.action}</p>
        <p className="text-xs text-gray-500 mt-0.5">신뢰도: {improvement.confidence}</p>
      </div>
      <div className="text-right">
        <p className="text-sm font-semibold text-emerald-600">
          {improvement.expectedBioAgeDeltaYears >= 0 ? '+' : ''}
          {improvement.expectedBioAgeDeltaYears.toFixed(1)}년
        </p>
        <p className="text-xs text-gray-500">생체 나이</p>
      </div>
    </div>
  );
}

function HotlinesBanner({
  hotlines,
}: {
  hotlines: RiskSurveyResponse['hotlines'];
}) {
  return (
    <div className="p-4 rounded-lg border border-amber-300 bg-amber-50 text-amber-900 dark:bg-amber-950 dark:border-amber-800 dark:text-amber-100">
      <p className="text-sm font-semibold mb-1">🚨 도움이 필요하시면 즉시 연락해주세요</p>
      <ul className="text-sm space-y-1">
        {hotlines.suicidePrevention && (
          <li>자살예방상담전화: <strong>{hotlines.suicidePrevention}</strong></li>
        )}
        {hotlines.mentalHealthCrisis && (
          <li>정신건강위기상담전화: <strong>{hotlines.mentalHealthCrisis}</strong></li>
        )}
      </ul>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-500 mb-3">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm text-gray-500 italic p-4 border border-dashed border-gray-200 dark:border-neutral-800 rounded-lg text-center">
      {children}
    </p>
  );
}
