# Slice 01 — risk-survey / 설문 폼 UI

- **Spec**: `docs/spec/risk-survey.md`
- **Estimate**: 2일
- **Linear**: TBD (Linear 발급 시 생성)
- **Dependencies**: identity Slice 01 (`docs/spec/identity/01-signup.md`) — 본 슬라이스는 모의 인증으로 선행 완료, identity Slice 01 합류 후 실제 세션 토큰으로 교체됨
- **Status**: Ready

## 완료 정의 (Definition of Done)

- [ ] 로그인된 사용자가 `/survey` 경로 접근 가능
- [ ] 23문항 입력 폼이 모바일 / 데스크톱 양쪽 정상 표시
- [ ] 클라이언트 측 Zod 검증 통과 후에만 제출 버튼 활성
- [ ] 미인증 사용자 → `/login` 자동 리디렉트
- [ ] 만 19세 미만 (생년 입력 시 즉시 계산) → 차단 메시지 + 1393 안내
- [ ] 제출 버튼은 Slice 02 API 연결 전까지 비활성 (placeholder onClick)
- [ ] 의료 윤리 가드: 폼 어디에도 "진단" / "처방" / "사망" 표현 없음
- [ ] WCAG AA 접근성 (라벨 / aria / 키보드 탐색)

## 영향 영역

- `apps/web/src/app/(authed)/survey/page.tsx` — 신규
- `apps/web/src/features/risk-survey/components/SurveyForm.tsx` — 신규
- `apps/web/src/features/risk-survey/schema.ts` — Zod 스키마 (`@chronos/types`에서 import)
- `packages/types/src/risk-survey.ts` — 공유 스키마 (서버와 동일)
- `apps/web/src/app/login/page.tsx` — 임시 모의 인증 (identity Slice 01에서 `/signup` 페이지로 대체 예정)

## 의존성

- 회원가입 / 로그인 spec — **identity 도메인 spec (`docs/spec/identity.md`) + Slice 01 작성 완료 (2026-05-14)**. 본 슬라이스는 모의 인증으로 선행, identity Slice 01 머지 후 실제 토큰으로 교체.
- Tailwind CSS 4 + 폼 라이브러리 (react-hook-form 또는 자체 훅)

## 검증 시나리오

### Positive
- 30세 남성, 23문항 정상 입력 → 제출 버튼 활성
- 키보드만으로 모든 입력 가능
- 모바일 (375px 폭)에서 가로 스크롤 없음

### Negative
- 생년 2010 입력 → 즉시 차단 메시지 + 1393 안내 + 제출 버튼 비활성
- 키 50cm 입력 → Zod 에러 "100~250 범위" 표시
- 미인증 상태 `/survey` 직접 접근 → `/login`으로 자동 이동

### 회귀
- 기존 페이지(`/`, `/login`) 영향 없음
- Lighthouse 접근성 점수 ≥ 90 유지

## 비목표

- 제출 후 API 호출 (Slice 02)
- 결과 리포트 UI (Slice 04)
- 동의 토글 / DB 저장 (Slice 05)
