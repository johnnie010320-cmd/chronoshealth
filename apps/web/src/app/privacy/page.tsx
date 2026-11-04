'use client';

// 개인정보처리방침 (공개 · 비로그인 접근). 기본값은 즉시 렌더되고,
// 관리자(site_content `legal_privacy`)에 값이 있으면 그것으로 덮어쓴다.

import { useEffect, useState } from 'react';
import { LegalPage } from '@/components/LegalArticle';
import { DEFAULT_PRIVACY, PRIVACY_EFFECTIVE } from '@/lib/legal-content';
import { fetchSiteContent } from '@/lib/api-client';

export default function PrivacyPage() {
  const [markdown, setMarkdown] = useState(DEFAULT_PRIVACY);

  useEffect(() => {
    fetchSiteContent()
      .then((content) => {
        const v = content['legal_privacy'];
        if (v && v.trim() !== '') setMarkdown(v);
      })
      .catch(() => {
        /* 실패 시 기본값 유지 */
      });
  }, []);

  return (
    <LegalPage title="개인정보처리방침" effective={PRIVACY_EFFECTIVE} markdown={markdown} />
  );
}
