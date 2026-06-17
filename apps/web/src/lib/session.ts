'use client';

// spec docs/spec/identity.md 4 / ADR 0010: 세션 토큰을 localStorage에 보관.
// SSR 안전 — typeof window 가드.

const STORAGE_KEY = 'chronos.session';

export type StoredSession = {
  userPseudonymId: string;
  sessionToken: string;
  expiresAt: string;
};

// ADR 0014 — 비-httpOnly 마커 쿠키(chronos_uid). 토큰 아님, pseudonym 값만.
function readUidCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const m = document.cookie.match(/(?:^|;\s*)chronos_uid=([^;]+)/);
  return m && m[1] ? decodeURIComponent(m[1]) : null;
}

export function readSession(): StoredSession | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as StoredSession;
      if (
        parsed.sessionToken &&
        parsed.expiresAt &&
        new Date(parsed.expiresAt).getTime() > Date.now()
      ) {
        return parsed;
      }
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }
  // ADR 0014 — localStorage 가 비어도(iOS Safari ITP 7일 캡) httpOnly 세션 쿠키는 살아있을 수 있음.
  // 마커 쿠키로 로그인 상태를 복원. 실제 인증은 httpOnly 쿠키(서버)가 수행하므로 sessionToken 은 불필요.
  const uid = readUidCookie();
  if (uid) {
    return {
      userPseudonymId: uid,
      sessionToken: '',
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    };
  }
  return null;
}

export function writeSession(s: StoredSession): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  // 새 세션 시작 시 이전 admin·닉네임 캐시 무효화 — 다음 훅 호출에서 새로 fetch.
  window.localStorage.removeItem('chronos.isAdmin');
  window.localStorage.removeItem('chronos.nickname');
}

export function clearSession(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_KEY);
  // admin·닉네임 캐시도 같이 비움 — 다른 사용자가 같은 브라우저에서 로그인할 때 잘못된 표시 방지.
  window.localStorage.removeItem('chronos.isAdmin');
  window.localStorage.removeItem('chronos.nickname');
}
