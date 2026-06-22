'use client';

import { useEffect, useRef, useState } from 'react';
import { fetchUnreadTotal } from './api-client';
import { readSession } from './session';

// 신규 메시지 알림 — 전체 미읽음 수를 주기 폴링.
// count: 헤더 배지. arrivedAt: 미읽음이 "증가한" 순간(토스트 트리거). 초대받은 1:1·단체방 포함 모든 대화.
const POLL_MS = 20000;

export type UnreadState = { count: number; arrivedAt: number | null };

export function useUnreadMessages(): UnreadState {
  const [count, setCount] = useState(0);
  const [arrivedAt, setArrivedAt] = useState<number | null>(null);
  const prev = useRef<number | null>(null);

  useEffect(() => {
    if (!readSession()) return;
    let active = true;
    const tick = () => {
      fetchUnreadTotal()
        .then((n) => {
          if (!active) return;
          // 최초 로드(prev=null)는 토스트 안 띄움. 이후 증가분만 알림.
          if (prev.current !== null && n > prev.current) setArrivedAt(Date.now());
          prev.current = n;
          setCount(n);
        })
        .catch(() => {
          /* noop */
        });
    };
    tick();
    const timer = setInterval(tick, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      active = false;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  return { count, arrivedAt };
}
