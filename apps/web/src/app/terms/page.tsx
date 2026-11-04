'use client';

// 서비스 약관 (공개 · 비로그인 접근). 기본값은 즉시 렌더되고,
// 관리자(site_content `legal_terms`)에 값이 있으면 그것으로 덮어쓴다.

import { useEffect, useState } from 'react';
import { LegalPage } from '@/components/LegalArticle';
import { DEFAULT_TERMS, TERMS_EFFECTIVE } from '@/lib/legal-content';
import { fetchSiteContent } from '@/lib/api-client';

export default function TermsPage() {
  const [markdown, setMarkdown] = useState(DEFAULT_TERMS);

  useEffect(() => {
    fetchSiteContent()
      .then((content) => {
        const v = content['legal_terms'];
        if (v && v.trim() !== '') setMarkdown(v);
      })
      .catch(() => {
        /* 실패 시 기본값 유지 */
      });
  }, []);

  return <LegalPage title="서비스 약관" effective={TERMS_EFFECTIVE} markdown={markdown} />;
}
