'use client';

// 디지털 트윈 바디 — 순수 SVG 인체 피규어(남/여) + 중앙 원형 "얼굴 슬롯".
// 얼굴 슬롯에는 사용자가 업로드한 프로필 사진(data URL) 또는 선택한 이모티콘을 넣는다.
// 정적 export·확대 선명·얼굴 교체에 유리(래스터 바디 이미지 대신 코드 생성).

import { useId } from 'react';

export type TwinSex = 'male' | 'female' | 'other';
export type TwinFace =
  | { kind: 'photo'; src: string }
  | { kind: 'emoji'; char: string }
  | null;

type Cap = { x: number; y: number; w: number; h: number; rx: number; rot?: number; cx?: number; cy?: number };
type BodySpec = { neck: string; torso: string; armL: Cap; armR: Cap; legL: Cap; legR: Cap };

const MALE: BodySpec = {
  neck: 'M112 92 h16 v22 h-16 Z',
  torso:
    'M86 130 C82 118 96 112 106 112 L134 112 C144 112 158 118 154 130 L147 238 C146 250 138 252 128 252 L112 252 C102 252 94 250 93 238 Z',
  armL: { x: 60, y: 122, w: 18, h: 108, rx: 9, rot: 9, cx: 69, cy: 176 },
  armR: { x: 162, y: 122, w: 18, h: 108, rx: 9, rot: -9, cx: 171, cy: 176 },
  legL: { x: 98, y: 250, w: 20, h: 124, rx: 10 },
  legR: { x: 122, y: 250, w: 20, h: 124, rx: 10 },
};

const FEMALE: BodySpec = {
  neck: 'M113 94 h14 v20 h-14 Z',
  torso:
    'M94 126 C90 116 102 112 110 112 L130 112 C138 112 150 116 146 126 L140 194 C150 210 150 228 139 246 C136 251 131 252 125 252 L115 252 C109 252 104 251 101 246 C90 228 90 210 100 194 Z',
  armL: { x: 66, y: 122, w: 14, h: 104, rx: 7, rot: 10, cx: 73, cy: 174 },
  armR: { x: 160, y: 122, w: 14, h: 104, rx: 7, rot: -10, cx: 167, cy: 174 },
  legL: { x: 100, y: 250, w: 17, h: 122, rx: 8 },
  legR: { x: 123, y: 250, w: 17, h: 122, rx: 8 },
};

function CapRect({ c }: { c: Cap }) {
  return (
    <rect
      x={c.x}
      y={c.y}
      width={c.w}
      height={c.h}
      rx={c.rx}
      transform={c.rot ? `rotate(${c.rot} ${c.cx} ${c.cy})` : undefined}
    />
  );
}

export function DigitalTwinBody({
  sex = 'male',
  face = null,
  showGrid = true,
  className,
}: {
  sex?: TwinSex;
  face?: TwinFace;
  showGrid?: boolean;
  className?: string;
}) {
  const uid = useId().replace(/[:]/g, '');
  const spec = sex === 'female' ? FEMALE : MALE;
  const bgId = `twbg-${uid}`;
  const bodyId = `twbody-${uid}`;
  const faceClip = `twface-${uid}`;
  const glowId = `twglow-${uid}`;

  return (
    <svg
      viewBox="0 0 240 440"
      className={className}
      role="img"
      aria-label="digital twin"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <linearGradient id={bgId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0b1733" />
          <stop offset="1" stopColor="#0a0f22" />
        </linearGradient>
        <linearGradient id={bodyId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#22d3ee" stopOpacity="0.30" />
          <stop offset="1" stopColor="#3b82f6" stopOpacity="0.18" />
        </linearGradient>
        <radialGradient id={glowId} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#5eead4" stopOpacity="0.9" />
          <stop offset="1" stopColor="#5eead4" stopOpacity="0" />
        </radialGradient>
        <clipPath id={faceClip}>
          <circle cx="120" cy="60" r="40" />
        </clipPath>
      </defs>

      <rect width="240" height="440" rx="18" fill={`url(#${bgId})`} />

      {showGrid && (
        <g stroke="#1e3a5f" strokeWidth="0.5" opacity="0.5">
          {Array.from({ length: 9 }, (_, i) => (
            <line key={`h${i}`} x1="0" y1={i * 55} x2="240" y2={i * 55} />
          ))}
          {Array.from({ length: 7 }, (_, i) => (
            <line key={`v${i}`} x1={i * 40} y1="0" x2={i * 40} y2="440" />
          ))}
        </g>
      )}

      {/* 바디 */}
      <g fill={`url(#${bodyId})`} stroke="#67e8f9" strokeWidth="1.6" strokeLinejoin="round">
        <path d={spec.neck} />
        <path d={spec.torso} />
        <CapRect c={spec.armL} />
        <CapRect c={spec.armR} />
        <CapRect c={spec.legL} />
        <CapRect c={spec.legR} />
      </g>

      {/* 장기 노드(장식) */}
      <g>
        <circle cx="112" cy="150" r="9" fill={`url(#${glowId})`} />
        <circle cx="112" cy="150" r="3.2" fill="#f0abfc" />
        <circle cx="120" cy="196" r="7" fill={`url(#${glowId})`} />
        <circle cx="120" cy="196" r="2.6" fill="#5eead4" />
        <circle cx="120" cy="300" r="2.4" fill="#67e8f9" />
      </g>

      {/* 머리 링 + 얼굴 슬롯 */}
      <circle cx="120" cy="60" r="42" fill="none" stroke="#67e8f9" strokeWidth="2" />
      <circle cx="120" cy="60" r="40" fill="#0a1024" />
      <g clipPath={`url(#${faceClip})`}>
        {face?.kind === 'photo' ? (
          // eslint-disable-next-line react/no-unknown-property
          <image href={face.src} x="76" y="16" width="88" height="88" preserveAspectRatio="xMidYMid slice" />
        ) : face?.kind === 'emoji' ? (
          <text x="120" y="62" fontSize="54" textAnchor="middle" dominantBaseline="central">
            {face.char}
          </text>
        ) : null}
      </g>
    </svg>
  );
}
