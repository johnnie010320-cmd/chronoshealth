type Variant = 'top' | 'bottom' | 'full';

export function PulseBackground({ variant = 'bottom' }: { variant?: Variant }) {
  const positionClass =
    variant === 'top'
      ? 'top-0'
      : variant === 'bottom'
        ? 'bottom-0'
        : 'top-1/2 -translate-y-1/2';

  return (
    <svg
      className={`pointer-events-none absolute inset-x-0 ${positionClass} h-32 w-full text-brand-700 opacity-[0.08] dark:text-brand-400 dark:opacity-[0.14]`}
      viewBox="0 0 1200 100"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        d="M0 50 L180 50 L200 50 L215 32 L230 70 L245 18 L260 82 L280 50 L470 50 L490 50 L505 35 L520 68 L535 22 L555 78 L575 50 L780 50 L800 38 L815 62 L840 50 L1010 50 L1030 30 L1045 70 L1060 22 L1080 78 L1100 50 L1200 50"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
