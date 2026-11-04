'use client';

// 외부 정보 업데이트 안내 — 이모티콘 '캐릭터'가 말풍선으로 알려주는 친근한 배너.
// 공단 건강검진·웨어러블 등 소스별 프리셋(이모지/색). 새 소스는 PRESETS 에 한 줄 추가로 재사용.

export type UpdateSource = 'nhis' | 'wearable' | 'survey' | 'generic';

type Preset = { emoji: string; ring: string; bg: string; text: string; bar: string };

const PRESETS: Record<UpdateSource, Preset> = {
  // 건강검진(국민건강보험공단)
  nhis: {
    emoji: '😊',
    ring: 'border-sky-200 dark:border-sky-900',
    bg: 'bg-sky-50 dark:bg-sky-950/40',
    text: 'text-sky-900 dark:text-sky-100',
    bar: 'bg-sky-500',
  },
  // 웨어러블 디바이스
  wearable: {
    emoji: '😄',
    ring: 'border-violet-200 dark:border-violet-900',
    bg: 'bg-violet-50 dark:bg-violet-950/40',
    text: 'text-violet-900 dark:text-violet-100',
    bar: 'bg-violet-500',
  },
  // 설문/자가입력
  survey: {
    emoji: '🙂',
    ring: 'border-emerald-200 dark:border-emerald-900',
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    text: 'text-emerald-900 dark:text-emerald-100',
    bar: 'bg-emerald-500',
  },
  generic: {
    emoji: '✨',
    ring: 'border-amber-200 dark:border-amber-900',
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    text: 'text-amber-900 dark:text-amber-100',
    bar: 'bg-amber-500',
  },
};

export function UpdateNotice({
  source = 'generic',
  title,
  message,
  emoji,
  onClose,
}: {
  source?: UpdateSource;
  title: string;
  message?: string;
  emoji?: string; // 프리셋 이모지 대체
  onClose?: () => void;
}) {
  const p = PRESETS[source];
  return (
    <div
      role="status"
      className={`update-pop relative flex items-start gap-3 overflow-hidden rounded-3xl border ${p.ring} ${p.bg} px-4 py-3.5`}
    >
      <span aria-hidden className={`absolute left-0 top-0 h-full w-1.5 ${p.bar}`} />
      <span
        aria-hidden
        className="update-bob grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white text-[24px] leading-none shadow-sm dark:bg-stone-900"
      >
        {emoji ?? p.emoji}
      </span>
      <div className={`min-w-0 flex-1 ${p.text}`}>
        <p className="text-[13.5px] font-extrabold leading-snug">{title}</p>
        {message && <p className="mt-0.5 text-[12px] leading-relaxed opacity-90">{message}</p>}
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="닫기"
          className={`shrink-0 rounded-full p-1 text-lg leading-none opacity-50 transition hover:opacity-100 ${p.text}`}
        >
          ×
        </button>
      )}
    </div>
  );
}
