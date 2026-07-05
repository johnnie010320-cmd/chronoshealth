// 헬스/예방의학 테마 인라인 SVG 아이콘 라이브러리.
// Lucide 호환 24px viewBox + currentColor 사용.

export type IconProps = {
  className?: string;
  strokeWidth?: number;
};

const baseProps = (className?: string, strokeWidth = 1.75) => ({
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  className: className ?? 'w-5 h-5',
  'aria-hidden': true,
});

export function HeartPulseIcon({ className, strokeWidth }: IconProps) {
  return (
    <svg {...baseProps(className, strokeWidth)}>
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z" />
      <path d="M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27" />
    </svg>
  );
}

export function ActivityIcon({ className, strokeWidth }: IconProps) {
  return (
    <svg {...baseProps(className, strokeWidth)}>
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  );
}

export function LeafIcon({ className, strokeWidth }: IconProps) {
  return (
    <svg {...baseProps(className, strokeWidth)}>
      <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19.2 2.3c1.7 5.7-1.5 14.7-7.2 17.7" />
      <path d="M2 21c0-3 1.85-5.36 5.08-6" />
    </svg>
  );
}

export function ShieldIcon({ className, strokeWidth }: IconProps) {
  return (
    <svg {...baseProps(className, strokeWidth)}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

export function ScopeIcon({ className, strokeWidth }: IconProps) {
  return (
    <svg {...baseProps(className, strokeWidth)}>
      <circle cx="12" cy="12" r="10" />
      <line x1="22" x2="18" y1="12" y2="12" />
      <line x1="6" x2="2" y1="12" y2="12" />
      <line x1="12" x2="12" y1="6" y2="2" />
      <line x1="12" x2="12" y1="22" y2="18" />
    </svg>
  );
}

export function DropletIcon({ className, strokeWidth }: IconProps) {
  return (
    <svg {...baseProps(className, strokeWidth)}>
      <path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z" />
    </svg>
  );
}

export function ChatBubbleIcon({ className, strokeWidth }: IconProps) {
  return (
    <svg {...baseProps(className, strokeWidth)}>
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z" />
    </svg>
  );
}

export function UsersIcon({ className, strokeWidth }: IconProps) {
  return (
    <svg {...baseProps(className, strokeWidth)}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

export function BrainIcon({ className, strokeWidth }: IconProps) {
  return (
    <svg {...baseProps(className, strokeWidth)}>
      <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z" />
      <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z" />
    </svg>
  );
}

export function ChevronRightIcon({ className, strokeWidth }: IconProps) {
  return (
    <svg {...baseProps(className, strokeWidth)}>
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

export function ArrowLeftIcon({ className, strokeWidth }: IconProps) {
  return (
    <svg {...baseProps(className, strokeWidth)}>
      <path d="m12 19-7-7 7-7" />
      <path d="M19 12H5" />
    </svg>
  );
}

export function AlertIcon({ className, strokeWidth }: IconProps) {
  return (
    <svg {...baseProps(className, strokeWidth)}>
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}

export function HomeIcon({ className, strokeWidth }: IconProps) {
  return (
    <svg {...baseProps(className, strokeWidth)}>
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
      <path d="M9 22V12h6v10" />
    </svg>
  );
}

export function FileTextIcon({ className, strokeWidth }: IconProps) {
  return (
    <svg {...baseProps(className, strokeWidth)}>
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v5h6" />
      <path d="M8 13h8" />
      <path d="M8 17h6" />
    </svg>
  );
}

export function ChartIcon({ className, strokeWidth }: IconProps) {
  return (
    <svg {...baseProps(className, strokeWidth)}>
      <path d="M3 3v18h18" />
      <path d="m7 14 4-4 4 4 5-6" />
    </svg>
  );
}

export function UserCircleIcon({ className, strokeWidth }: IconProps) {
  return (
    <svg {...baseProps(className, strokeWidth)}>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="10" r="3" />
      <path d="M6.5 19a6 6 0 0 1 11 0" />
    </svg>
  );
}

export function MenuIcon({ className, strokeWidth }: IconProps) {
  return (
    <svg {...baseProps(className, strokeWidth)}>
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

export function LogoutIcon({ className, strokeWidth }: IconProps) {
  return (
    <svg {...baseProps(className, strokeWidth)}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

export function ClockIcon({ className, strokeWidth }: IconProps) {
  return (
    <svg {...baseProps(className, strokeWidth)}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

export function EyeIcon({ className, strokeWidth }: IconProps) {
  return (
    <svg {...baseProps(className, strokeWidth)}>
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function EyeOffIcon({ className, strokeWidth }: IconProps) {
  return (
    <svg {...baseProps(className, strokeWidth)}>
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 19c-7 0-10-7-10-7a17.7 17.7 0 0 1 3.06-4.48m3.34-2.34A10.07 10.07 0 0 1 12 5c7 0 10 7 10 7a17.6 17.6 0 0 1-2.18 3.18" />
      <path d="M9.9 4.24A9 9 0 0 1 12 4c7 0 10 8 10 8a18 18 0 0 1-2.16 3.19" />
      <path d="M9.9 9.9a3 3 0 1 0 4.2 4.2" />
      <line x1="2" y1="2" x2="22" y2="22" />
    </svg>
  );
}

// ── 도메인 아이콘 (삼성 헬스 스타일 컬러 배지용) ─────────────────────────────

export function SparkleIcon({ className, strokeWidth }: IconProps) {
  return (
    <svg {...baseProps(className, strokeWidth)}>
      <path d="M12 3v3M12 18v3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M3 12h3M18 12h3M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
      <circle cx="12" cy="12" r="3.2" />
    </svg>
  );
}

export function ClipboardIcon({ className, strokeWidth }: IconProps) {
  return (
    <svg {...baseProps(className, strokeWidth)}>
      <rect x="8" y="3" width="8" height="4" rx="1" />
      <path d="M16 5h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2" />
      <path d="M8.5 12h7M8.5 16h5" />
    </svg>
  );
}

export function DumbbellIcon({ className, strokeWidth }: IconProps) {
  return (
    <svg {...baseProps(className, strokeWidth)}>
      <path d="M6.5 6.5 17.5 17.5" />
      <path d="M4 8 8 4M16 20l4-4" />
      <path d="M3 11 5 9M19 15l2-2M9 5 11 3M13 21l2-2" />
    </svg>
  );
}

export function UtensilsIcon({ className, strokeWidth }: IconProps) {
  return (
    <svg {...baseProps(className, strokeWidth)}>
      <path d="M4 3v6a2 2 0 0 0 2 2v10M8 3v8M6 3v4" />
      <path d="M18 3c-1.5 0-3 1.5-3 5s1.5 4 3 4v9" />
    </svg>
  );
}

export function StethoscopeIcon({ className, strokeWidth }: IconProps) {
  return (
    <svg {...baseProps(className, strokeWidth)}>
      <path d="M4 3v5a4 4 0 0 0 8 0V3" />
      <path d="M8 14a4 4 0 0 0 4 4h1a4 4 0 0 0 4-4v-2" />
      <circle cx="18" cy="10" r="2.2" />
    </svg>
  );
}

export function CoinIcon({ className, strokeWidth }: IconProps) {
  return (
    <svg {...baseProps(className, strokeWidth)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v10M9.5 9.2c0-1 1.1-1.7 2.5-1.7s2.5.7 2.5 1.7-.9 1.5-2.5 1.8-2.5.8-2.5 1.8 1.1 1.7 2.5 1.7 2.5-.7 2.5-1.7" />
    </svg>
  );
}

export function TrophyIcon({ className, strokeWidth }: IconProps) {
  return (
    <svg {...baseProps(className, strokeWidth)}>
      <path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" />
      <path d="M7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3" />
      <path d="M10 15h4M9 21h6M12 15v6" />
    </svg>
  );
}

export function VideoIcon({ className, strokeWidth }: IconProps) {
  return (
    <svg {...baseProps(className, strokeWidth)}>
      <rect x="2" y="6" width="14" height="12" rx="2" />
      <path d="m16 10 6-3v10l-6-3" />
    </svg>
  );
}

export function BellIcon({ className, strokeWidth }: IconProps) {
  return (
    <svg {...baseProps(className, strokeWidth)}>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </svg>
  );
}

export function BookIcon({ className, strokeWidth }: IconProps) {
  return (
    <svg {...baseProps(className, strokeWidth)}>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
    </svg>
  );
}

export function GiftIcon({ className, strokeWidth }: IconProps) {
  return (
    <svg {...baseProps(className, strokeWidth)}>
      <rect x="3" y="8" width="18" height="4" rx="1" />
      <path d="M12 8v13M5 12v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7" />
      <path d="M12 8S10.5 3 8 4.5 9 8 12 8Zm0 0s1.5-5 4-3.5S15 8 12 8Z" />
    </svg>
  );
}

export function WatchIcon({ className, strokeWidth }: IconProps) {
  return (
    <svg {...baseProps(className, strokeWidth)}>
      <circle cx="12" cy="12" r="5" />
      <path d="M12 9.5v2.5l1.5 1M8.5 7 8 3h8l-.5 4M8.5 17l-.5 4h8l-.5-4" />
    </svg>
  );
}

export function CalendarIcon({ className, strokeWidth }: IconProps) {
  return (
    <svg {...baseProps(className, strokeWidth)}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M8 2v4M16 2v4M3 10h18" />
    </svg>
  );
}

export function PencilIcon({ className, strokeWidth }: IconProps) {
  return (
    <svg {...baseProps(className, strokeWidth)}>
      <path d="M17 3a2.8 2.8 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      <path d="m15 5 4 4" />
    </svg>
  );
}

export function FlameIcon({ className, strokeWidth }: IconProps) {
  return (
    <svg {...baseProps(className, strokeWidth)}>
      <path d="M12 2c1 3 4 4.5 4 8a4 4 0 0 1-8 0c0-1 .3-1.8.8-2.5C9 8 9 6 9 6c-2 1.5-4 4-4 7a7 7 0 0 0 14 0c0-4.5-4-7.5-7-11Z" />
    </svg>
  );
}

export function TargetIcon({ className, strokeWidth }: IconProps) {
  return (
    <svg {...baseProps(className, strokeWidth)}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.5" />
    </svg>
  );
}

// ── 채워진(filled) 아이콘 — 하단 네비 활성 상태(삼성 헬스식) ─────────────────

const filledProps = (className?: string) => ({
  viewBox: '0 0 24 24',
  fill: 'currentColor' as const,
  className: className ?? 'w-5 h-5',
  'aria-hidden': true,
});

export function HomeFilledIcon({ className }: IconProps) {
  return (
    <svg {...filledProps(className)}>
      <path d="M11.3 2.3a1 1 0 0 1 1.4 0l8.3 7.4a1 1 0 0 1 .3.75V20a2 2 0 0 1-2 2h-4v-6a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v6H5a2 2 0 0 1-2-2v-9.55a1 1 0 0 1 .3-.75Z" />
    </svg>
  );
}

export function FileTextFilledIcon({ className }: IconProps) {
  return (
    <svg {...filledProps(className)}>
      <path d="M6 2h7l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm7 0v5h5Z" />
    </svg>
  );
}

export function HeartFilledIcon({ className }: IconProps) {
  return (
    <svg {...filledProps(className)}>
      <path d="M12 21s-7.6-4.6-10-9.3C.8 9.1 1.6 5.9 4.6 4.8 6.8 4 9.1 4.7 10.5 6.4L12 8.2l1.5-1.8C14.9 4.7 17.2 4 19.4 4.8c3 1.1 3.8 4.3 2.6 6.9C19.6 16.4 12 21 12 21Z" />
    </svg>
  );
}

export function UsersFilledIcon({ className }: IconProps) {
  return (
    <svg {...filledProps(className)}>
      <path d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0 1.6c-3.4 0-6.2 1.8-6.2 4.2V20h12.4v-3.2c0-2.4-2.8-4.2-6.2-4.2Zm7.7-1.1a3.4 3.4 0 1 0 0-6.8 3.4 3.4 0 0 0 0 6.8Zm.3 1.6c-.6 0-1.1.07-1.6.2 1.1.95 1.8 2.2 1.8 3.7V20H22v-2.7c0-2.2-2.2-3.6-4.7-3.6Z" />
    </svg>
  );
}

export function UserCircleFilledIcon({ className }: IconProps) {
  return (
    <svg {...filledProps(className)}>
      <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 4.2a3.2 3.2 0 1 1 0 6.4 3.2 3.2 0 0 1 0-6.4Zm0 13.5a7.7 7.7 0 0 1-5.5-2.3c.6-2 2.9-3.4 5.5-3.4s4.9 1.4 5.5 3.4A7.7 7.7 0 0 1 12 19.7Z" />
    </svg>
  );
}

export function GridFilledIcon({ className }: IconProps) {
  return (
    <svg {...filledProps(className)}>
      <path d="M4 4h7v7H4Zm9 0h7v7h-7ZM4 13h7v7H4Zm9 0h7v7h-7Z" />
    </svg>
  );
}
