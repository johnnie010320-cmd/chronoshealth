# Spec — risk-survey (설문 기반 위험 추정)

- **Status**: **Accepted** (2026-05-14)
- **Created**: 2026-05-14
- **Accepted by**: Johnnie
- **Author**: Johnnie (검토) / 지니 (초안)
- **Related ADR**: ADR 0003 (identity-vault 격리), ADR 0007 (인프라 — CF Workers)
- **Phase**: P1 예측 MVP의 첫 수직 슬라이스
- **Estimate**: 5개 슬라이스 / 합계 11일 (Day 5 분해 결과)
- **Slices**: `docs/spec/risk-survey/01~05-*.md`

> ⚠️ **의료 자문 진행 시 갱신**: 본 명세 (특히 6장 미해결 항목의 결정값)는 의료 자문 합류 시 지속 업데이트됨. 명세 변경 이력은 git log 추적.

---

## 1. 목표 (Goal)

사용자가 웹 앱에서 15~25문항의 설문에 답하면, 시스템이 **생체 나이 + 5년 주요 질병 위험 추정 + 개선 행동 제안** 1장을 즉시 출력한다.

P1 종료 시 100명 비공개 베타에 본 기능 1종만 제공 (절차서 5.2 P1 종료 조건과 일치).

---

## 2. 비목표 (Non-goal)

본 슬라이스에서 의도적으로 **제외**:

- 웨어러블 데이터 연동 (P2 영역)
- 의료기록(FHIR) 연동 (P2 영역)
- ML 기반 추론 — 본 슬라이스는 **공개 논문 계수 기반 결정형 계산식**만 (절차서 5.2 P1 명시)
- 시계열 추세 / 다중 리포트 비교 (P1 후반)
- 토큰 보상 (P4 이후)
- 영지식 증명 (P3 이후)
- PDF 출력 — 본 슬라이스는 앱 내 카드 UI만 (PDF는 P1 후반에 추가)
- 다국어 — 한국어 우선, 영어는 P1 후반

---

## 3. API 인터페이스

### 3.1 엔드포인트

```
POST /api/v1/risk-estimate
Authorization: Bearer <session-token>
Content-Type: application/json
```

### 3.2 요청 스키마 (Zod, 초안)

```ts
const RiskSurveyRequest = z.object({
  // 인구통계
  birthYear: z.number().int().min(1900).max(new Date().getFullYear() - 19),
  sex: z.enum(['male', 'female', 'other']),
  heightCm: z.number().min(100).max(250),
  weightKg: z.number().min(20).max(300),

  // 생활 습관
  smoking: z.enum(['never', 'former', 'current']),
  alcoholDrinksPerWeek: z.number().int().min(0).max(100),
  exerciseMinutesPerWeek: z.number().int().min(0).max(2000),
  sleepHoursPerNight: z.number().min(0).max(24),

  // 측정값 (선택, 모르면 null)
  systolicBp: z.number().min(60).max(250).nullable(),
  diastolicBp: z.number().min(30).max(150).nullable(),
  fastingGlucose: z.number().min(30).max(500).nullable(),
  ldlCholesterol: z.number().min(30).max(400).nullable(),
  hdlCholesterol: z.number().min(10).max(200).nullable(),

  // 가족력 (boolean)
  familyHistoryDiabetes: z.boolean(),
  familyHistoryHypertension: z.boolean(),
  familyHistoryCardiovascular: z.boolean(),

  // 자가 인식
  stressLevel: z.enum(['low', 'medium', 'high']),
  selfRatedHealth: z.enum(['excellent', 'good', 'fair', 'poor']),

  // 동의
  consentToStore: z.boolean(),         // 답변 저장 동의
  consentToResearch: z.boolean(),       // 익명 통계 활용 동의 (선택)
});
```

> ⚠️ **미해결**: 정확한 15~25문항 확정 (의료 자문 필요). 위 항목은 Framingham / QRISK3 / PhenoAge 공통 입력 기반 초안.

### 3.3 응답 스키마

```ts
const RiskSurveyResponse = z.object({
  reportId: z.string().uuid(),
  generatedAt: z.string().datetime(),
  modelVersion: z.string(),              // 예: 'rs-v0.1.0'

  bioAge: z.object({
    value: z.number(),                    // 산출된 생체 나이
    chronologicalAge: z.number(),         // 실제 나이
    ci95: z.tuple([z.number(), z.number()]),
    topContributors: z.array(z.object({
      factor: z.string(),                 // 예: '수면 부족'
      direction: z.enum(['accelerate', 'decelerate']),
      magnitude: z.number(),              // 0~1 정규화
    })).max(3),
  }),

  diseaseRisk: z.array(z.object({
    code: z.string(),                     // 예: 'I20-I25'
    label: z.string(),                    // 예: '허혈성 심질환'
    probability5y: z.number().min(0).max(1),
    riskCategory: z.enum(['low', 'moderate', 'high']),
    modifiableFactors: z.array(z.string()),
  })).max(5),

  improvement: z.array(z.object({
    action: z.string(),                   // 예: '주 3회 30분 유산소'
    expectedBioAgeDeltaYears: z.number(),
    confidence: z.enum(['low', 'medium', 'high']),
  })).max(5),

  disclaimer: z.string(),                 // 항상 포함, 면책 문구
  hotlines: z.object({                    // 위험 임계 초과 시만
    suicidePrevention: z.string().nullable(),  // '1393'
    mentalHealthCrisis: z.string().nullable(), // '1577-0199'
  }),
});
```

### 3.4 에러 응답

- `400` — 입력 스키마 검증 실패 (Zod 에러)
- `401` — 미인증
- `403` — 만 19세 미만 (생년 검증) — `error.code: 'AGE_RESTRICTED'`
- `429` — 호출 제한 (사용자당 일 5회)
- `500` — 내부 오류

---

## 4. 데이터

### 4.1 새 테이블 (마이그레이션 필요)

| 테이블 | 용도 | PII 여부 |
|--------|------|---------|
| `risk_survey_responses` | 설문 원본 답변 | ❌ pseudonym만 |
| `risk_survey_reports` | 출력된 리포트 | ❌ pseudonym만 |

> ⚠️ **미해결**: identity-vault 외부에 둘지, identity-vault 내부에 둘지. 의료 데이터 카테고리이지만 pseudonym 기준이라 외부 분석 DB로 분리하는 게 ADR 0003에 부합. 죠니 결정 필요.

### 4.2 보존 / 익명화

- `purpose_code`: `risk_estimate`
- 보존: 사용자 삭제 요청 전까지 무기한 (절차서 7.2 "최소 수집" 위배 없음 — 사용자가 명시 동의)
- 익명화: 회원가입 정보와 다른 `user_pseudonym_id`로 분리 저장 (cross-link 차단)
- 동의 변경: `consent_log`에 append-only

### 4.3 모델 메타

- `model_version` 컬럼 응답 메타에 포함 (P3에서 ML 교체 시 회귀 추적)

---

## 5. 위험

### 5.1 보안

- 사용자 인증 필수 (`Authorization: Bearer <token>`)
- 호출 제한: 사용자당 일 5회 (DoS / 광범위 스캐닝 방지)
- 입력은 모두 Zod 검증 후에만 비즈니스 로직 진입

### 5.2 개인정보

- 의료 데이터 카테고리 (개인정보보호법 23조 민감정보)
- 별도 동의 필수 (회원가입 동의와 분리)
- 사용자가 "잊혀질 권리" 요청 시 → identity-vault 매핑 끊으면 분석 DB는 통계적 익명 상태로 잔존 (ADR 0003)

### 5.3 윤리 (compliance-reviewer 차단 항목)

- 응답에 **"진단" / "처방" / "치료" / "사망" / "여명" / "죽음"** 단어 절대 금지
- 모든 응답에 `disclaimer` 필드 필수 — "본 리포트는 의학적 진단이 아닙니다"
- 5년 위험이 사전 정의 임계(예: 30% 초과) 시 → `hotlines.suicidePrevention: '1393'`, `mentalHealthCrisis: '1577-0199'` 자동 포함
- 만 19세 미만 차단 (생년 계산 → 403)

### 5.4 성능 / 비용

- 결정형 계산식이라 추론 비용 거의 0
- 응답 SLO: p95 ≤ 300ms (DB read + 계산식)
- CF Workers 환경 (ADR 0007), Worker CPU 30s 한도 안에서 여유 있음

---

## 6. 결정 사항 (2026-05-14 죠니 승인)

| # | 항목 | 결정값 | 상태 |
|---|------|--------|------|
| 1 | 설문 문항 | 23문항 현 안 채택 | 잠정 — 의료 자문 시 갱신 |
| 2 | 위험 계산식 출처 | **Framingham Risk Score + PhenoAge 회귀** 두 가지 | 잠정 — 의료 자문 시 한국인 코호트 보완 검토 |
| 3 | 첫 리포트 표시 질병 수 | **5개 모두** | 확정 |
| 4 | 답변 저장 위치 | **analysis DB + pseudonym** (identity-vault 외부, ADR 0003 정합) | 확정 |
| 5 | 호출 제한 | **사용자당 일 5회** | 확정 |
| 6 | hotlines 임계치 | 5년 주요 사망 / 자해 관련 위험 **30% 초과** 시 자동 노출 | 잠정 — 의료 자문 시 갱신 |

> **잠정** 표시 항목은 의료 자문 합류 시 본 명세에 직접 갱신. 잠정값에 의존하는 코드는 코드 내 상수 1개로 추출하여 갱신 시 1줄 변경으로 끝나도록 설계.

---

## 7. 검증 시나리오

### Positive
- 30세 남성, 평균 답변 (흡연 안 함, 운동 주 150분, 정상 BMI) → 생체 나이 28~32세, 5년 위험 모두 low
- 50세 여성, 흡연 + 운동 없음 + 가족력 → 생체 나이 53~58세, 5년 위험 cardiovascular 'moderate' 이상

### Negative
- 17세 (생년 검증) → 403 `AGE_RESTRICTED`
- `heightCm: 50` → 400 Zod 에러
- 미인증 호출 → 401
- 일 5회 초과 → 429
- 응답 페이로드에 "진단", "사망일" 같은 금지 단어 있는지 자동 검증 (compliance-reviewer)

### 회귀
- 동일 입력 2회 → 동일 reportId 제외 모든 필드 동일 (결정형 계산식 재현성)
- 모델 버전 변경 시 `model_version` 필드 변경 추적
- 응답에 `disclaimer` 누락 안 됨
- 위험 임계 시나리오에서 `hotlines` 자동 포함

---

## 8. 완료 정의 (Definition of Done)

- [ ] 죠니 검토 + 미해결 질문 6개 모두 해결
- [ ] Status: Draft → Accepted (이후 Day 5 슬라이스 분해 가능)
- [ ] compliance-reviewer 서브에이전트 통과 (윤리 / 개인정보 항목)
- [ ] 절차서 / ADR 0003 / ADR 0007 정합성 확인

---

## 9. 다음 단계

본 명세가 Accepted 되면:
1. Day 5 — 본 명세를 1~3일 단위 수직 슬라이스로 분해 (`/slice risk-survey`)
2. Day 6 — TDD로 첫 슬라이스 (`/api/v1/risk-estimate`) 구현
3. Day 7 — 1주차 회고록 + Week 2 계획
