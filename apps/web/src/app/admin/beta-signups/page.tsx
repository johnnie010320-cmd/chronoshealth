'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// 베타 등록자 메뉴는 출시 후 비활성화. 직접 URL 접근 시 admin 대시보드로 리다이렉트.
export default function AdminBetaSignupsRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/admin');
  }, [router]);
  return null;
}
