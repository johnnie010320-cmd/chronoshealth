'use client';

// 새 공지 알림 — 마지막으로 확인한 공지 시각(createdAt)을 디바이스에 저장하고,
// 그보다 새로운 게시 공지가 있으면 '새 공지'로 표시. 서버 변경 없음.

import { useEffect, useState } from 'react';
import { fetchNotices } from './api-client';

const KEY = 'chronos:noticeLastSeen';

export function getNoticeLastSeen(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function setNoticeLastSeen(iso: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(KEY, iso);
  } catch {
    /* noop */
  }
}

// 공지 목록에서 가장 최신 createdAt(고정 정렬과 무관하게 max).
function newestCreatedAt(list: { createdAt: string }[]): string | null {
  let max: string | null = null;
  for (const n of list) {
    if (max == null || n.createdAt > max) max = n.createdAt;
  }
  return max;
}

// 미확인 새 공지 존재 여부 훅. markAllSeen 으로 확인 처리.
export function useUnseenNotice(): {
  hasNew: boolean;
  newestAt: string | null;
  markAllSeen: () => void;
} {
  const [newestAt, setNewestAt] = useState<string | null>(null);
  const [seen, setSeen] = useState<string | null>(() => getNoticeLastSeen());

  useEffect(() => {
    let active = true;
    fetchNotices()
      .then((list) => {
        if (active) setNewestAt(newestCreatedAt(list));
      })
      .catch(() => {
        /* noop */
      });
    return () => {
      active = false;
    };
  }, []);

  const hasNew = newestAt != null && (seen == null || newestAt > seen);

  const markAllSeen = () => {
    if (newestAt) {
      setNoticeLastSeen(newestAt);
      setSeen(newestAt);
    }
  };

  return { hasNew, newestAt, markAllSeen };
}
