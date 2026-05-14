# Slice 05 — risk-survey / 답변 저장 + 동의 관리

- **Spec**: `docs/spec/risk-survey.md` (결정 사항 #4)
- **Estimate**: 2일
- **Linear**: TBD
- **Dependencies**: Slice 02 (API 흐름), Slice 01 (동의 토글 UI)
- **Status**: Ready (저장소 결정 완료 — ADR 0008 D1 채택)

## 완료 정의 (Definition of Done)

- [ ] 마이그레이션 — `risk_survey_responses` 테이블 (Cloudflare D1, ADR 0008)
- [ ] 마이그레이션 — `risk_survey_reports` 테이블
- [ ] 마이그레이션 — `consent_log` 테이블 (append-only 트리거 포함)
- [ ] 모든 테이블 `user_pseudonym_id` 컬럼만 (PII 컬럼 절대 없음)
- [ ] `purpose_code = 'risk_estimate'` 모든 row에 태깅
- [ ] Slice 01 폼의 동의 토글 → API 요청 본문 포함 → 백엔드가 동의한 경우만 저장
- [ ] 사용자 "저장 동의 철회" 시 → `consent_log`에 append, 기존 row는 통계적 익명 상태로 잔존 (ADR 0003)
- [ ] identity-vault 외부 — analysis DB로 격리
- [ ] services/identity/에는 변경 없음 (compliance-reviewer / pre-edit hook 확인)

## 영향 영역

- `services/gateway/src/storage/risk-survey.ts` — 신규 (저장 로직)
- `services/gateway/migrations/0001-risk-survey.sql` 또는 D1 마이그레이션 — 신규
- `services/gateway/src/routes/risk-estimate.ts` — Slice 02 핸들러에 저장 로직 추가
- `apps/web/src/features/risk-survey/components/ConsentToggle.tsx` — Slice 01 폼에 토글 추가
- `packages/types/src/risk-survey.ts` — `consentToStore`, `consentToResearch` 필드 (이미 정의됨)

## 의존성

- 저장소: **Cloudflare D1 (ADR 0008 채택 완료)**
- 동의 변경 이력 추적: D1 트리거 (sqlite syntax) 또는 application-level append-only — 본 슬라이스 진입 시 결정

## 검증 시나리오

### Positive
- 사용자가 `consentToStore: true` → 응답 / 리포트 양쪽 DB 저장
- 사용자가 `consentToStore: false` → DB 저장 0, 리포트만 응답 (메모리에서 즉시 휘발)
- "잊혀질 권리" 요청 → identity-vault 매핑 끊으면 `risk_survey_responses` 행은 통계 익명 상태로 잔존

### Negative
- DB 컬럼에 PII (이름 / 이메일 / 전화) 직접 저장 시도 → CI / compliance-reviewer 차단
- `purpose_code` 없이 INSERT 시도 → DB constraint 에러
- `consent_log` UPDATE / DELETE 시도 → DB trigger 차단

### 회귀
- Slice 02 mock 시나리오 (저장 안 함) 여전히 작동 — 동의 토글 false 시 동일
- identity-vault 영역 import / 참조 0건 (grep 검증)
- pre-edit hook이 services/identity/ 경고 발화 확인 (본 슬라이스가 직접 건드릴 일 없음)
- compliance-reviewer 통과

## 비목표

- 데이터 분석 / ML 학습 사용 (별도 동의 + 별도 슬라이스)
- 다중 리포트 비교 (P1 후반)
- 데이터 export (사용자 자기 데이터 다운로드) — P1 후반

## 사전 조건

- ✅ 저장소 ADR 작성 완료 (ADR 0008 — Cloudflare D1)
- ⏳ Slice 01 + Slice 02 완료 (UI 토글 + API 흐름)
