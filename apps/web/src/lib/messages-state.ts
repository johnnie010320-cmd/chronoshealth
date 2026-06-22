'use client';

import { useEffect, useState } from 'react';
import { fetchUnreadTotal } from './api-client';
import { readSession } from './session';

// 신규 메시지 알림 — 전체 미읽음 수를 주기 폴링. 헤더 배지에서 사용.
const POLL_MS = 20000;

export function useUnreadMessages(): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!readSession()) return;
    let active = true;
    const tick = () => {
      fetchUnreadTotal()
        .then((n) => {
          if (active) setCount(n);
        })
        .catch(() => {
          /* noop */
        });
    };
    tick();
    const timer = setInterval(tick, POLL_MS);
    // 다른 탭/화면에서 돌아왔을 때 즉시 갱신.
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

  return count;
}
