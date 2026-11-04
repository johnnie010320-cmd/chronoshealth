'use client';

// 건강데이터 처리방침 (공개 · 비로그인 접근). 기본값은 즉시 렌더되고,
// 관리자(site_content `legal_health_data`)에 값이 있으면 그것으로 덮어쓴다.

import { useEffect, useState } from 'react';
import { LegalPage } from '@/components/LegalArticle';
import { DEFAULT_HEALTH_DATA, HEALTH_DATA_EFFECTIVE } from '@/lib/legal-content';
import { fetchSiteContent } from '@/lib/api-client';

export default function HealthDataPage() {
  const [markdown, setMarkdown] = useState(DEFAULT_HEALTH_DATA);

  useEffect(() => {
    fetchSiteContent()
      .then((content) => {
        const v = content['legal_health_data'];
        if (v && v.trim() !== '') setMarkdown(v);
      })
      .catch(() => {
        /* 실패 시 기본값 유지 */
      });
  }, []);

  return (
    <LegalPage title="건강데이터 처리방침" effective={HEALTH_DATA_EFFECTIVE} markdown={markdown} />
  );
}
