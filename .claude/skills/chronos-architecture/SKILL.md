---
name: chronos-architecture
description: Chronos Health 전체 아키텍처 (4도메인), 모노레포 구조, 데이터 계층 분리, 의존성 방향. 새 기능 위치 결정 시 호출. 절차서 2~3장.
---

# Chronos Architecture Skill

> 근거: `docs/work-procedure.txt` 2장 (시스템 아키텍처) + 3.1 (모노레포)

## 4개 도메인 (절차서 2.1)

| 도메인 | 기술 스택 | 책임 |
|--------|----------|------|
| 클라이언트 | React Native (Expo) / Next.js / TanStack Query | UX, 웨어러블 SDK, 오프라인 캐싱 |
| API 게이트웨이 | NestJS(TS), Fastify, 내부 gRPC | 인증·권한·호출 제한·데이터 주권 강제 |
| 데이터·ML | Python / FastAPI / PostgreSQL / TimescaleDB / MLflow / Ray | ETL, 피처 스토어, 모델 학습·서빙·드리프트 |
| Web3 | Solidity / Foundry / OpenZeppelin / Circom / TheGraph | 토큰·보상·ZK 검증 |

저장소: PostgreSQL(메타) / TimescaleDB(시계열) / S3(원본) / IPFS(공개 메타)
인프라: AWS 서울 / Terraform / GitHub Actions / Docker / EKS

## 모노레포 디렉토리

```
chronos-health/
├── apps/        (mobile, web, admin)
├── services/    (gateway, identity, ingestion, ml-serving, reward)
├── ml/          (pipelines, models, notebooks)
├── contracts/   (Foundry)
├── packages/    (types, sdk, ui)
├── infra/       (Terraform + Helm)
├── docs/        (ADR, spec, journal, audit, compliance, runbooks)
└── .claude/
```

## 데이터 계층 격리 (절차서 2.2 — 절대 위배 금지)

1. **identity-vault** 서비스만 PII 취급. 외부에서는 `user_pseudonym_id`만.
2. 원본 의료 데이터: KMS 암호화 S3. 분석 단계로 갈수록 익명화 강화 (브론즈 → 실버 → 골드).
3. 모든 데이터 접근은 `audit_log` 테이블에 기록. **append-only, 7년 보관.**
4. 잊혀질 권리: identity-vault 매핑만 끊으면 분석 DB는 통계적 익명 상태로 잔존 (단, 법무 검토 필수).

## ML 계층 (절차서 2.3)

- 피처 스토어: **Feast** (온라인 Redis / 오프라인 Parquet on S3)
- 모델군:
  - **PhenoAge 회귀** — 생물학적 나이
  - **트랜스포머 시계열** — 12개월 위험 변화
  - **DeepHit 생존분석** — 사건별 hazard
- 실험 관리: **MLflow + DVC** (데이터셋 해시 + 설정 + 깃 SHA 3중 식별)
- 서빙: **Triton** 또는 **BentoML**, A/B는 게이트웨이에서 결정
- 드리프트: **Evidently AI** (PSI/KS), 임계 초과 시 PagerDuty + Slack

## Web3 계층 (절차서 2.4)

- 체인: **Polygon PoS** (1차), Base / Arbitrum 검토
- 핵심 컨트랙트: `ChronosToken`, `DataVault`, `RewardDistributor`, `ZKVerifier`
- 영지식 회로: Circom (Groth16). `BMI ∈ [a,b]`, `HRV ≥ X` 같은 단순 술어부터.
- 자금 관리: Gnosis Safe 3-of-5, OpenZeppelin Defender, 48h 타임락
- 인덱싱: TheGraph

## 의존성 방향 (단방향)

```
apps/ → packages/ → services/ → (외부)
ml/  → packages/ → services/ml-serving
contracts/ ← (독립, 외부 RPC 노드)
infra/     ← (독립, 모든 서비스 배포 대상)
```

- `services/identity/`는 다른 서비스에서 RPC로만 접근 (DB 직접 X)
- `packages/`는 `apps/`, `services/` import 가능하지만 `apps/` ↔ `services/` 직접 X

## 신규 기능 위치 결정 트리

```
Q1: UI인가? → apps/{mobile|web|admin}/
Q2: API 노출인가? → services/gateway/
Q3: 데이터 수집인가? → services/ingestion/
Q4: ML 추론인가? → services/ml-serving/ (서빙) + ml/ (학습)
Q5: 온체인 인덱싱인가? → services/reward/
Q6: 개인정보 관련인가? → services/identity/ + 사람 2명 리뷰 필수
Q7: 공유 타입/SDK인가? → packages/
Q8: 인프라 변경인가? → infra/ + ADR 필수
```

## 환경 분리

- **dev**: 로컬 + 개발 VPC (AWS Seoul)
- **staging**: 스테이징 VPC, 합성 데이터만
- **prod**: 운영 VPC, 실데이터, 다른 AWS 계정
- 환경 간 데이터 이동 절대 금지. 환경별 비밀: SOPS + age.

## 새 기능 PR 시 자동 검사 (CI)

1. lint / typecheck / unit test (모든 워크스페이스)
2. 변경 영역에 따라:
   - `contracts/` 변경 → Slither + Aderyn + forge test
   - `services/identity/` 또는 `docs/compliance/` 변경 → 컴플라이언스 리뷰어 + 사람 2명
   - `ml/` 변경 → ml-experimenter 서브에이전트 + 평가 리포트 첨부
   - DB 마이그레이션 → 4단계 PR 분리 검증
3. OpenAPI 스냅샷 일관성
4. 비밀키 스캔 (gitleaks)
