# Spec — leaderboard (M6 랭킹 / 리더보드)

- **Status**: **Draft** (2026-05-28)
- **Created**: 2026-05-28
- **Author**: 지니 (초안) / 죠니 (검토 대기)
- **Related**:
  - `docs/spec/product-mvp.md` §M6 (모듈 정의) + §1 한 줄 정의
  - `docs/spec/avatar-chronos.md` (활력 점수 입력)
  - ADR 0003 (PII 격리), ADR 0008 (D1)
- **Phase**: P1 후반
- **Estimate**: 2개 슬라이스 / 합계 3.5일 (BE 1.5일 + FE 1.5일 + 검증 0.5일)

> 사용자가 자신의 활력 점수가 **동일 연령·성별 인구 중 어느 위치인지** 즉시 알 수 있게 한다. P1은 **모의 정규분포(WHO 평균·표준편차 기반)** 로 시작하고, P2 후반(베타 1,000명+) 부터 실측 분포로 점진 전환.

> ⚠️ apps/web 규칙 1·5 — 의료 행위 / 카운트다운 / 사망 단정 표현 일체 금지.

---

## 1. 목표

1. **위치 인지**: 사용자 자신의 활력 점수가 전세계/국가/도시 중 상위 N% 인지 즉시 파악
2. **개입 동기**: 다음 등급으로 가려면 어떤 행동이 필요한지 시뮬레이션 진입 동선 제공
3. **부정 가입 동기 차단**: 보상은 P4 이후 — 본 슬라이스는 보상 미발행, 순위만

## 2. 비목표

- ❌ 실명·핸들 노출 (PII 보호)
- ❌ 토큰 보상 트리거 (M10 P4 이후)
- ❌ 도시 단위 정밀 랭킹 — P2 실측 단계까지 보류 (도시별 표본 불충분)
- ❌ 월별 변동 보상 — M10 P4 이후
- ❌ 친구·팔로우·소셜 비교 — M9 P3 후반

## 3. 분포 모델 (P1 한정)

**모의 정규분포**:
- 평균 μ: 연령·성별·국가별 활력 점수 평균 (WHO 평균 수명 + 한국 코호트 보정)
- 표준편차 σ: 연령대별 12~18 (고연령일수록 분산 ↑)
- 표본 가정 N: 세계 = 인구 통계 표 / 국가 = 동일

`percentile = Φ((vitalityScore − μ) / σ) × 100` (정규 CDF)
`rankWithin = round(N × (1 − percentile / 100))`

P2 진입(베타 1,000명+) 시 D1 `vitality_snapshots` 테이블에서 ECDF 로 대체.

## 4. API 인터페이스

```
GET /api/v1/leaderboard/me?scope=world|country&ageBand=5y
Authorization: Bearer <session-token>

Response 200:
{
  "scope": "world|country",
  "country": "KR|US|JP|ES|other",     // scope=country 시
  "ageBand": "40-44",                  // 5세 단위
  "sex": "male|female|other",
  "userVitalityScore": 82,
  "percentile": 78.4,                  // 상위 21.6%
  "rankWithin": { "value": 21500000, "total": 100000000 },
  "tierDistribution": {                // 4단계 카운트 (모의)
    "excellent": 5000000,
    "good": 25000000,
    "fair": 50000000,
    "attention": 20000000
  },
  "delta": {
    "monthOverMonth": null,            // P1: 추적 데이터 부족, null
    "nextTierGap": 8.2                 // 다음 등급까지 점수 차이
  },
  "modelVersion": "lb-v0.1.0",
  "disclaimer": "본 랭킹은 모의 정규분포 기반 추정입니다."
}

Errors:
  401 UNAUTHORIZED
  404 NO_REPORT
  400 INVALID_SCOPE
```

**캐싱**: 분포 파라미터(μ, σ)는 정적 → CF Workers KV 또는 모듈 상수 (편의상 상수, 갱신은 코드 배포로). 사용자 점수만 매번 조회.

## 5. 데이터

```ts
// services/gateway/src/leaderboard/data/distribution.ts
export const DISTRIBUTION: Record<
  'world' | 'KR' | 'US' | 'JP' | 'ES',
  Record<AgeBand, Record<Sex, { mean: number; sd: number; population: number }>>
> = { /* 5세 단위 × 4국 × 3성별 × 4데이터 */ };
```

WHO 데이터 기반, 출처 footer 명시.

## 6. UI

신규 경로 `/leaderboard` (또는 기존 `/stats` 대체):

- 헤더: 사용자 활력 점수 큰 숫자
- 카드 1: 세계 랭킹 (퍼센타일 + 상위 N% + 절대 순위)
- 카드 2: 국가 랭킹 (동일)
- 카드 3: 등급 분포 (4단계 도넛 또는 가로 막대)
- 카드 4: 다음 등급까지 — 점수 차이 + "What-if 시뮬레이션 해보기" 링크 (M7)
- 면책 footer

다크모드 + 4언어.

## 7. 슬라이스 분해

### Slice L1: BE `/api/v1/leaderboard/me` (1.5일)
- `services/gateway/src/leaderboard/data/distribution.ts` — 정적 표
- `services/gateway/src/leaderboard/percentile.ts` — 정규 CDF + rank
- `services/gateway/src/leaderboard/me.ts` — service
- `services/gateway/src/routes/leaderboard/me.ts` — Hono route
- 단위 테스트 ≥ 10 (정규성/경계/4개국/2성별/401/404/INVALID_SCOPE/PII 회귀)

### Slice L2: FE `/leaderboard` (1.5일 + 검증)
- `apps/web/src/app/leaderboard/page.tsx`
- `apps/web/src/components/leaderboard/RankCard.tsx`
- `apps/web/src/components/leaderboard/TierDonut.tsx`
- `apps/web/src/locales/{ko,en,ja,es}.ts` — `leaderboard.*` 키 그룹
- M7 What-if 진입 링크 (이미 구현 시)

## 8. 의료·법무 가드

- ❌ "사망", "남은 시간", D-XXX, 카운트다운
- ❌ "진단", "처방", "치료"
- ✅ "활력 점수", "예측 잔여 연수", "건강 위험 추정"
- ✅ 면책 라인: 모의 분포 명시

## 9. 미해결

1. `/leaderboard` 신규 라우트 vs `/stats` 대체
2. 정규분포 가정의 한국 코호트 보정 계수 (의료 자문 시 갱신)
3. 도시 단위 P2 진입 시점 (실측 표본 1,000+ 필요)
4. 등급 분포 시각화 — 도넛 vs 막대 vs 누적바

## 10. 변경 이력

- 2026-05-28: 초안 (지니), Draft 상태
