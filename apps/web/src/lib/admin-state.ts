'use client';

import { useEffect, useState } from 'react';
import { readSession } from './session';
import { fetchAdminWhoami } from './api-client';

// 사용자의 관리자 권한 상태 — /api/v1/admin/whoami 결과 캐싱.
// localStorage 캐시 + 세션 토큰별 invalidate.
// ADR 0012 정합 — 로그인 후 1회 호출, 세션 변경 시 재조회.

const STORAGE_KEY = 'chronos.isAdmin';
const TTL_MS = 30 * 60 * 1000; // 30분

type CacheEntry = {
  isAdmin: boolean;
  isSuperAdmin: boolean;
  cachedAt: number;
  sessionToken: string;
};

function readCache(sessionToken: string): { isAdmin: boolean; isSuperAdmin: boolean } | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const e = JSON.parse(raw) as CacheEntry;
    if (e.sessionToken !== sessionToken) return null;
    if (Date.now() - e.cachedAt > TTL_MS) return null;
    return { isAdmin: e.isAdmin, isSuperAdmin: e.isSuperAdmin ?? false };
  } catch {
    return null;
  }
}

function writeCache(sessionToken: string, isAdmin: boolean, isSuperAdmin: boolean): void {
  if (typeof window === 'undefined') return;
  const entry: CacheEntry = {
    isAdmin,
    isSuperAdmin,
    cachedAt: Date.now(),
    sessionToken,
  };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entry));
}

export function invalidateAdminCache(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_KEY);
}

// null = 로딩 중 / 미로그인. true / false = 결과.
function useWhoami(): { isAdmin: boolean; isSuperAdmin: boolean } | null {
  const [state, setState] = useState<{ isAdmin: boolean; isSuperAdmin: boolean } | null>(null);

  useEffect(() => {
    const session = readSession();
    if (!session) {
      setState({ isAdmin: false, isSuperAdmin: false });
      return;
    }
    const cached = readCache(session.sessionToken);
    if (cached !== null) {
      setState(cached);
      return;
    }
    let cancelled = false;
    fetchAdminWhoami()
      .then((data) => {
        if (cancelled) return;
        const next = { isAdmin: data.isAdmin, isSuperAdmin: data.isSuperAdmin ?? false };
        writeCache(session.sessionToken, next.isAdmin, next.isSuperAdmin);
        setState(next);
      })
      .catch(() => {
        if (cancelled) return;
        setState({ isAdmin: false, isSuperAdmin: false });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

export function useIsAdmin(): boolean | null {
  const w = useWhoami();
  return w === null ? null : w.isAdmin;
}

export function useIsSuperAdmin(): boolean | null {
  const w = useWhoami();
  return w === null ? null : w.isSuperAdmin;
}
