# Slice 02 — risk-survey / 위험 추정 API (mock 계산)

- **Spec**: `docs/spec/risk-survey.md`
- **Estimate**: 2일
- **Linear**: TBD
- **Dependencies**: 없음 (Slice 01과 병렬 진행 가능)
- **Status**: Ready

## 목적

API 흐름(인증 / 검증 / 호출제한 / 응답 직렬화)을 먼저 안정화. 실제 계산식은 Slice 03에서 교체.

## 완료 정의 (Definition of Done)

- [ ] `POST /api/v1/risk-estimate` 엔드포인트 동작
- [ ] Zod 입력 검증 실패 → 400
- [ ] 미인증 → 401
- [ ] 만 19세 미만 (생년 계산) → 403 `AGE_RESTRICTED`
- [ ] 일 5회 초과 → 429 `RATE_LIMITED`
- [ ] mock 응답: 입력값 무관 고정 placeholder (생체 나이 = 실제 나이, 5년 위험 모두 'low')
- [ ] 응답 페이로드에 `disclaimer` 항상 포함
- [ ] 응답 페이로드 grep으로 금지 단어("진단" 등) 없음 자동 검증 (CI)
- [ ] CF Workers 호환 라이브러리(Hono 등) 도입 — ADR 0007 정합

## 영향 영역

- `services/gateway/src/index.ts` 또는 `services/gateway/src/routes/risk-estimate.ts` — 신규
- `services/gateway/wrangler.toml` — CF Worker 설정
- `packages/types/src/risk-survey.ts` — Slice 01과 공유 (Zod 단일 소스)
- `.github/workflows/ci.yml` — 금지 단어 grep 단계 (이미 존재) 적용 확인

## 의존성

- CF Workers 호환 프레임워크 선택 (Hono 추천 — 작은 번들, NestJS는 P2/P3 재고)
- 호출 제한 저장소 — CF Workers KV 또는 D1 (간단 구현 시 KV가 좋음)
- 임시 인증 — Slice 01과 같은 모의 토큰

## 검증 시나리오

### Positive
- 30세 남성 정상 답변 → 200, mock 응답 (생체 나이 30, 위험 5건 모두 low, disclaimer 포함)
- 응답에 `model_version: 'rs-mock-v0'` 명시

### Negative
- 미인증 헤더 → 401
- 17세 (생년) → 403 `AGE_RESTRICTED`
- `heightCm: 50` → 400 (Zod 에러 메시지 포함)
- 동일 사용자 6번째 호출 → 429 `RATE_LIMITED`
- 응답 본문에 "진단" 단어 포함 → CI에서 빌드 실패 (회귀 가드)

### 회귀
- 기존 워크플로(CF Pages 정적 호스팅) 영향 없음
- CI ts-lint-type-test 통과
- CI compliance-gate 통과

## 비목표

- 실제 계산식 (Slice 03)
- DB 저장 (Slice 05)
- 사용자 정식 인증 (회원가입 spec 별도)
