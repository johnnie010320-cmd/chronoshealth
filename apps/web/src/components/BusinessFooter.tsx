// 사업자 정보 푸터 — 공개 페이지(로그인·약관·방침)에 노출.
// 카카오/네이버 등 심사에서 "사이트 내 사업자 정보 확인"을 요구하므로,
// 사업자등록증과 동일한 정보(상호·대표·등록번호·주소)를 표기한다.

import { LEGAL_COMPANY } from '@/lib/legal-content';

export function BusinessFooter({ className }: { className?: string }) {
  return (
    <div
      className={
        className ??
        'space-y-0.5 text-center text-[11px] leading-relaxed text-stone-400 dark:text-stone-500'
      }
    >
      <p>
        {LEGAL_COMPANY.name} ({LEGAL_COMPANY.nameEn}) · 대표 {LEGAL_COMPANY.ceo}
      </p>
      <p>사업자등록번호 {LEGAL_COMPANY.bizNo}</p>
      <p>{LEGAL_COMPANY.address}</p>
      <p>
        <a href={`mailto:${LEGAL_COMPANY.email}`} className="hover:underline">
          {LEGAL_COMPANY.email}
        </a>
      </p>
    </div>
  );
}
