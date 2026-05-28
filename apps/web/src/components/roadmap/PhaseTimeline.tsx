'use client';

type PhaseEntry = {
  id: string;
  name: string;
  weeks: string;
  summary: string;
};

type Props = {
  phases: PhaseEntry[];
  currentPhaseId: string;
  nowMarker: string;
};

export function PhaseTimeline({ phases, currentPhaseId, nowMarker }: Props) {
  return (
    <ol className="space-y-3">
      {phases.map((p, i) => {
        const isCurrent = p.id === currentPhaseId;
        const currentIdx = phases.findIndex((x) => x.id === currentPhaseId);
        const isPast = i < currentIdx;
        return (
          <li key={p.id} className="relative pl-8">
            {i < phases.length - 1 && (
              <span
                aria-hidden
                className={`absolute left-[14px] top-7 h-[calc(100%-12px)] w-px ${
                  isPast || isCurrent
                    ? 'bg-brand-300 dark:bg-brand-700'
                    : 'bg-stone-200 dark:bg-stone-800'
                }`}
              />
            )}
            <span
              aria-hidden
              className={`absolute left-0 top-1 inline-flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold ${
                isCurrent
                  ? 'bg-brand-700 text-white ring-4 ring-brand-100 dark:bg-brand-500 dark:ring-brand-950'
                  : isPast
                    ? 'bg-brand-200 text-brand-900 dark:bg-brand-800 dark:text-brand-100'
                    : 'bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400'
              }`}
            >
              {p.id}
            </span>
            <div
              className={`rounded-2xl border p-3 ${
                isCurrent
                  ? 'border-brand-300 bg-brand-50/60 dark:border-brand-800 dark:bg-brand-950/40'
                  : 'border-stone-200/70 bg-white/70 dark:border-stone-800 dark:bg-stone-900/50'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                  {p.name}
                </p>
                <span className="text-[10px] font-medium uppercase tracking-widest text-stone-500 dark:text-stone-400">
                  {p.weeks}
                </span>
              </div>
              <p className="mt-1 text-[12px] leading-relaxed text-stone-600 dark:text-stone-400">
                {p.summary}
              </p>
              {isCurrent && (
                <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-brand-700 px-2 py-0.5 text-[10px] font-semibold text-white dark:bg-brand-500">
                  <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                  {nowMarker}
                </span>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
