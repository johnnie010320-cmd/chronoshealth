// 헬스/예방의학 테마 인라인 SVG 아이콘 라이브러리.
// Lucide 호환 24px viewBox + currentColor 사용.

type IconProps = {
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
