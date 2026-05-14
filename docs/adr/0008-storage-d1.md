# ADR 0008 — 저장소: Cloudflare D1 (P0~P1 설문 / 리포트 / 동의 이력)

- **Status**: Accepted
- **Date**: 2026-05-14
- **Decider**: Johnnie
- **Related**: ADR 0003 (identity-vault 격리), ADR 0007 (CF 단독 인프라)

## Context

ADR 0007에서 P0~P1 단계 DB로 "Cloudflare D1 또는 외부 Postgres" 둘 다 후보로 남겨두었다. Slice 05 (답변 저장 + 동의 관리) 진입 전 결정 필요.

## Decision

**Cloudflare D1** 채택 (P0~P1 단계 한정).

### 적용 테이블 (Slice 05에서 마이그레이션)

| 테이블 | 용도 | PII 여부 |
|--------|------|---------|
| `risk_survey_responses` | 설문 원본 답변 | ❌ `user_pseudonym_id`만 |
| `risk_survey_reports` | 산출된 리포트 | ❌ `user_pseudonym_id`만 |
| `consent_log` | 동의 변경 이력 (append-only 트리거) | ❌ `user_pseudonym_id`만 |

### 운영 규칙

- 한 환경(dev / staging / prod)당 별도 D1 인스턴스
- 마이그레이션은 wrangler `d1 migrations apply` 표준 흐름
- 백업: D1 자체 백업 + 주간 export → R2 보관 (P1 진입 시 자동화)

## Consequences

**긍정**
- Cloudflare 단일 계정 안에서 컨트롤 — 추가 외부 서비스 / 비밀 0
- Workers와 같은 엣지에서 실행 — 낮은 지연
- Free tier: 5 GB 저장, 일 100k 읽기 / 50k 쓰기 — P1 100명 베타에 충분
- wrangler CLI로 마이그레이션 / 백업 통합

**부정 / 위험**
- 단일 인스턴스 10 GB 상한 (Pro $5/mo 시 50 GB) — P2 웨어러블 시계열 도입 시 한계
- SQLite 기반 — 복잡 트랜잭션 / 동시 쓰기 한계
- BYOK / Customer-Managed Key 불가 (CF Enterprise 별도 필요) — 의료 데이터 BYOK 요구 발생 시 ADR 재검토
- Region pinning 제한 (Database location selection 일부) — 한국 거주 데이터 격리 인증 요구 시 외부 Postgres 필요

## 재결정 트리거

다음 중 1건 이상 충족 시 별도 ADR 작성 후 외부 Postgres(Neon/Supabase) 또는 AWS RDS로 이전:

1. 단일 인스턴스 5 GB 초과 (P2 진입 직전 예상)
2. 시계열 워크로드 도입 — TimescaleDB 또는 동급 필요
3. 의료 데이터 BYOK / 한국 거주 인증 요구
4. P3 ML 학습 파이프라인이 D1 직접 접근 필요 (Hyperdrive 우회 한계)
5. 일 100k+ 쓰기 트래픽 (P1 후반 단계 예상치 못한 성장 시)

## Alternatives Considered

- **Supabase Postgres**: Auth + Postgres 통합 매력적이나 별도 서비스, 별도 비밀 관리. P0~P1 단계에 외부 서비스 추가 매몰비용. 거부 (P2 시점 재검토).
- **Neon Postgres**: 서버리스 Postgres, 분기 가능. CF Hyperdrive 호환. 단 별도 계정. P2 시점 재검토 후보.
- **AWS RDS Postgres**: ADR 0007에서 P0~P1 AWS 미사용 결정 → 거부.
- **CF Workers KV**: 키-값 저장으로 관계형 쿼리 불가능 — 동의 이력 / 리포트 검색에 부적합. 거부.
