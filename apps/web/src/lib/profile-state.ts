'use client';

import { useEffect, useState } from 'react';
import { readSession } from './session';
import { fetchMeProfile } from './api-client';

// 현재 사용자의 Twin 닉네임 — /api/v1/me 결과 캐싱.
// 닉네임은 앱 전역의 표시명(공개용). 실명은 마이페이지에서만 노출.
// admin-state.ts와 동일 패턴: localStorage 캐시 + 세션 토큰별 invalidate.

const STORAGE_KEY = 'chronos.nickname';
const TTL_MS = 30 * 60 * 1000; // 30분

type CacheEntry = {
  nickname: string | null;
  cachedAt: number;
  sessionToken: string;
};

function readCache(sessionToken: string): { nickname: string | null } | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const e = JSON.parse(raw) as CacheEntry;
    if (e.sessionToken !== sessionToken) return null;
    if (Date.now() - e.cachedAt > TTL_MS) return null;
    return { nickname: e.nickname };
  } catch {
    return null;
  }
}

function writeCache(sessionToken: string, nickname: string | null): void {
  if (typeof window === 'undefined') return;
  const entry: CacheEntry = { nickname, cachedAt: Date.now(), sessionToken };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entry));
}

export function invalidateNicknameCache(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_KEY);
}

// 반환: undefined = 로딩 중, null = 미로그인 또는 닉네임 미설정, string = 닉네임.
export function useTwinNickname(): string | null | undefined {
  const [nickname, setNickname] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    const session = readSession();
    if (!session) {
      setNickname(null);
      return;
    }
    const cached = readCache(session.sessionToken);
    if (cached !== null) {
      setNickname(cached.nickname);
      return;
    }
    let cancelled = false;
    fetchMeProfile(false)
      .then((data) => {
        if (cancelled) return;
        writeCache(session.sessionToken, data.profile.nickname);
        setNickname(data.profile.nickname);
      })
      .catch(() => {
        if (cancelled) return;
        setNickname(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return nickname;
}
