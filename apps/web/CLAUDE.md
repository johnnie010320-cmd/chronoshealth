# apps/web — Next.js Marketing + Dashboard

> Next.js 15 + React 19. 마케팅 + 베타 대시보드.

## 책임

- 랜딩 / 가입 / 로그인
- 베타 사용자 대시보드 (예측 리포트 UI)
- 관리자 콘솔은 `apps/admin/`에 별도

## 절대 규칙 (윤리)

1. UI 문구에 "진단" / "처방" / "치료" / "여명" / "사망일" / "죽음" 금지
2. 위험 점수 임계 초과 시 **1393 / 1577-0199** 안내 자동 노출
3. 미성년자(만 19세 미만) 가입 차단 — 회원가입 단계 생년월일 검증
4. 모든 예측 표시에 신뢰구간 + 면책 문구 ("본 리포트는 의학적 진단이 아닙니다")
5. 카운트다운 UI (D-XXX 같은) 절대 금지

## 표준

- App Router (`src/app/`)
- Tailwind CSS 4
- Zustand (no persist — DB가 단일 진실원천)
- API 호출은 `packages/sdk/` 통해서만 (직접 fetch 금지)
- i18n: 한국어 / 영어 (절차서 1.2)

## SLO

- LCP ≤ 2.5s
- TTI ≤ 3.5s
- 크래시 없는 세션 99.5%
- 리포트 출고 p95 3초 (절차서 5.2 P1)

## 배포

- Cloudflare Pages 프로젝트: `chronoshealth` (CF 계정 `l2pamerica@gmail.com`)
- 임시 도메인: `chronoshealth.ever-day.com` (ADR 0006)
- GitHub: `johnnie010320-cmd/chronoshealth`
