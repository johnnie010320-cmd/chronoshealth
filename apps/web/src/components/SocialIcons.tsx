// 카카오 / 구글 브랜드 로고 SVG.
// 카카오: 검은 말풍선 단색. 구글: 공식 4색 G 로고.

type IconProps = {
  className?: string;
};

export function KakaoLogo({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      className={className ?? 'h-5 w-5'}
    >
      <path d="M12 3C6.477 3 2 6.46 2 10.73c0 2.73 1.83 5.12 4.6 6.52l-1.16 4.2c-.09.32.27.58.55.4l5.04-3.34c.32.03.65.05.97.05 5.523 0 10-3.46 10-7.73S17.523 3 12 3Z" />
    </svg>
  );
}

export function GoogleLogo({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={className ?? 'h-5 w-5'}
    >
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.99.66-2.25 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.11A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.11V7.05H2.18A11 11 0 0 0 1 12c0 1.78.43 3.46 1.18 4.95l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.05l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z"
      />
    </svg>
  );
}
