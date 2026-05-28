# Spec — avatar-chronos (M8 디지털 트윈 아바타)

- **Status**: **Draft** (2026-05-28)
- **Created**: 2026-05-28
- **Author**: 지니 (초안) / 죠니 (검토 대기)
- **Related**:
  - `docs/spec/product-mvp.md` §M8 (모듈 정의)
  - `docs/spec/risk-survey.md` (생체 나이 + 질병 위험 — 본 명세 입력)
  - `docs/spec/identity.md` (사용자 이름 + pseudonym — 본 명세 라벨)
  - ADR 0003 (identity-vault 격리)
- **Phase**: P1 후반
- **Estimate**: 2개 슬라이스 / 합계 3일 (BE 1일 + FE 1.5일 + 검증 0.5일)

> 사용자의 디지털 트윈 = **"크로노스"**. P1 단계는 **정적 카드** 한 장으로 시작 — 이름 + **활력 점수(Vitality Score)** + **예측 잔여 연수(PYR + 95% CI)** + 5종 나이 미니 카드. P2 2D, P3 3D, P4 NFT 옵션은 본 명세 범위 밖.

> ⚠️ apps/web 규칙 5 — **카운트다운/잔여일 형식 UI 절대 금지**. 항상 점수 + 신뢰구간 형식만.

---

## 1. 목표

1. 사용자가 가장 최근에 받은 risk-estimate 결과를 한 화면에서 **자신의 아바타**로 인식
2. 활력 점수 0~100 점수형 + PYR(CI 포함) 으로 5년·생체 나이 추상도를 한 단계 상위로 가시화
3. P2~P4 게임화 진화의 골격 마련 (avatar.id 영구화 + 점수 추세 누적 가능 구조)

## 2. 비목표

- ❌ 2D/3D 시각 렌더링 (P2~P3)
- ❌ 점수 추세 그래프 (P1 한정 — 최신 1건만)
- ❌ NFT 발행 / 온체인 (P4+)
- ❌ 잔여일 카운트다운 UI / D-XXX 표시 — apps/web 규칙 5 위반
- ❌ "사망일" / "예상 소멸일" 표현 — 절대 금지
- ❌ 시계열 시뮬레이션 — M7 simulation 영역

## 3. 활력 점수 산출 (Vitality Score 0~100)

생체 나이와 5종 위험을 종합한 정수 점수:

```
Vitality Score =
    100
    − clamp(bioAge − chronologicalAge, 0, 30) × 1.5   // 노화 가속 페널티
    − sum(diseaseRisk5y[i] − baselineByAge[i] for i in 5종) × 5.0
    × clamp(1 − stressFactor, 0.6, 1.0)               // 스트레스 0.6~1.0 배수
clamp to [0, 100]
```

`baselineByAge` 는 risk-survey 결정형 엔진의 동일 연령·성별 평균값.

## 4. 예측 잔여 연수 (Predicted Years Remaining, PYR)

P1 한정 결정형:

```
PYR_median = max(0, lifeExpectancyByCountryAgeSex − bioAge)
PYR_ci95   = [PYR_median × 0.85, PYR_median × 1.15]   // 결정형 단계는 보수적 ±15%
```

- `lifeExpectancyByCountryAgeSex`: WHO 공개 데이터 정적 표 (한국·미국·일본·스페인 4개국, 5세 단위)
- P3 ML 단계에서 개인화 계수 + 잔차 분산 기반 정밀 CI 로 대체

## 5. API 인터페이스

```
GET /api/v1/avatar/me
Authorization: Bearer <session-token>

Response 200:
{
  "name": "<이름>",                  // identity 도메인에서 조회, 응답에만 포함
  "chronologicalAge": number,
  "vitalityScore": { "value": 0..100, "tier": "excellent|good|fair|attention" },
  "predictedYearsRemaining": { "median": number, "ci95": [number, number] },
  "fiveAges": {                       // M3 5종 나이
    "life": number,
    "vitality": number,
    "skin": number,                   // P1: bioAge 와 동일 (P3+ 실측)
    "vascular": number,
    "joint": number                   // P1: 자가보고 기반 휴리스틱
  },
  "lastReportAt": "ISO 8601",
  "modelVersion": "rs-v0.1.0",
  "disclaimer": "본 카드는 예측 추정으로 의료 자문을 대체하지 않습니다."
}

Errors:
  401 UNAUTHORIZED
  404 NO_REPORT       사용자의 최근 risk-estimate 결과 없음
```

**PII 격리 (ADR 0003)**: `name` 은 응답 직전에 identity DB에서 조회. analysis DB 에는 절대 평문 이름 없음. 본 응답은 로그에 남기지 않음 (mask middleware).

## 6. UI

신규 경로 `/avatar` (또는 기존 `/reports` 를 본 spec 으로 채택):

- AppShell with title "내 크로노스"
- 메인 카드: 그라데이션 + 활력 점수 (큰 숫자 + tier 뱃지)
- 보조 카드: PYR (median + CI 텍스트, 슬라이더형 visualization 한 줄)
- 5종 나이 미니 그리드 (4열)
- 모델·생성시각 footer
- 면책 + "결과 다시 보기" (→ /reports 또는 /survey 결과)
- 다크모드 + 4언어

## 7. 슬라이스 분해

### Slice A1: BE `/api/v1/avatar/me` (1일)
- `services/gateway/src/avatar/vitality.ts` — 점수 산출
- `services/gateway/src/avatar/pyr.ts` — WHO 정적 표 + PYR
- `services/gateway/src/avatar/data/life-expectancy.ts` — 한·미·일·스 정적 데이터
- `services/gateway/src/routes/avatar/me.ts` — Hono route + DB 조회
- 단위 테스트 ≥ 10 (점수 경계 / PYR CI / 4개국 / 5종 나이 / 401 / 404 / PII 회귀)

### Slice A2: FE `/avatar` (1.5일 + 검증)
- `apps/web/src/app/avatar/page.tsx`
- `apps/web/src/components/avatar/VitalityCard.tsx`
- `apps/web/src/components/avatar/PyrBar.tsx`
- `apps/web/src/components/avatar/FiveAgesGrid.tsx`
- `apps/web/src/locales/{ko,en,ja,es}.ts` — `avatar.*` 키 그룹
- 다크모드 + 4언어 + 다른 라우트 회귀 0

## 8. 의료·법무 가드 (절대)

- ❌ "사망일" / "예상 소멸일" / "남은 시간" / D-XXX / 카운트다운
- ❌ "진단" / "처방" / "치료"
- ✅ "활력 점수" / "예측 잔여 연수 (95% CI)" / "건강 위험 추정"
- ✅ 카드 면책 라인 고정

## 9. 미해결

1. 활력 점수 tier 4단계 임계값 (90/75/60/X)
2. `/avatar` 신규 라우트 vs `/reports` 대체 — 죠니 결정
3. WHO 데이터 출처·라이선스 표기 위치 (footer / about)
4. 5종 나이 중 `skin`·`joint` P1 단계 산출식 (자가보고 휴리스틱 명세 부족)

## 10. 변경 이력

- 2026-05-28: 초안 (지니), Draft 상태
