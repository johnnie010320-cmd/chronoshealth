# ADR 0007 — 인프라 전략: P0~P1 Cloudflare 단독 운영, P2+ 재결정

- **Status**: Accepted
- **Date**: 2026-05-14
- **Decider**: Johnnie
- **Supersedes**: ADR 0002 (AWS Seoul)
- **Related**: 절차서 2.1, 2.2, 5.2 P0, 11장 Day 2

## Context

ADR 0002에서 "AWS 서울 리전"을 1차 클라우드로 결정했지만, P0 Day 1 마무리 시점에 실제 인프라 수요를 재검토한 결과 다음 사실이 드러남:

1. **현재 코드는 정적 페이지 1장** (chronoshealth.ever-day.com). 백엔드 / DB / GPU 학습 인프라가 아직 없음
2. **P0~P1 (0~12주차)** 의 작업 범위는 설문 + 결정형 계산식. CF Workers / D1 / Pages로 완결 가능
3. **P2 (13~22주)** 의 웨어러블·EHR 수집도 CF Hyperdrive + 외부 Postgres(Supabase/Neon)로 처리 가능
4. **P3 (23~34주)** ML 학습부터 GPU 클러스터가 필요 — 이 시점에 AWS EKS GPU vs Modal vs RunPod 중 결정하면 됨
5. 죠니는 이미 **Cloudflare 계정(`l2pamerica@gmail.com`)** 보유, twowinz / CloudBridge로 CF 운영 경험 누적
6. P0 단계에서 AWS 계정 + Terraform + VPC + IAM + KMS 설정은 매몰비용 (실제 사용 시점은 P3 진입)

## Decision

**P0~P1 단계는 Cloudflare 단독 운영. P2 후반(~20주차)에 인프라 ADR 재작성.**

### 적용 범위 (P0~P1)

| 영역 | 사용 서비스 |
|------|-----------|
| 정적 호스팅 / SSR | Cloudflare Pages |
| API / Edge 컴퓨트 | Cloudflare Workers |
| DB (관계형, 소규모) | Cloudflare D1 또는 외부 (Supabase / Neon — 별도 ADR로 결정 예정) |
| 객체 저장 | Cloudflare R2 (S3 호환 API) |
| 비밀 관리 (런타임) | Wrangler Secrets (`npx wrangler secret put`) |
| 비밀 관리 (커밋 가능) | SOPS + age (필요 시) |
| 인증 (관리자) | Cloudflare Access |
| CI/CD | GitHub Actions + CF Pages 자동 배포 |
| 도메인 / DNS | Gabia (ever-day.com) — 정식 도메인 등록 시 Cloudflare DNS 이전 |
| 모니터링 | CF Analytics + Sentry (선택) |

### 재결정 트리거 (P2 후반)

다음 중 하나 이상 충족 시 인프라 ADR 재작성 필수:

1. **데이터 규모**: 사용자 DB 또는 시계열 데이터가 CF D1 10GB 한도 / Workers 30초 CPU 한도 초과
2. **TimescaleDB 필요**: 웨어러블 시계열을 시계열 전용 엔진으로 분리 필요
3. **ML GPU 학습**: P3 진입 직전 (PhenoAge / DeepHit / 트랜스포머 학습)
4. **컴플라이언스 요구**: 의료 데이터 BYOK / 한국 거주 데이터 격리 인증 요구 시
5. **외부 DB**: Postgres 직접 운영 필요 시

## 절차서 수정 사항

`docs/work-procedure.txt` 다음 섹션이 본 ADR에 따라 Cloudflare 기준으로 수정됨:

| 절차서 위치 | 원래 | 수정 후 |
|-----------|------|--------|
| 2.1 상위 아키텍처 — 저장소 | "S3(원본)" | "Cloudflare R2(원본, S3 호환)" |
| 2.1 상위 아키텍처 — 인프라 | "AWS 서울 리전, Terraform, GitHub Actions, Docker, k8s(EKS)" | "Cloudflare (Workers/Pages/R2/D1/Hyperdrive) 글로벌 엣지, GitHub Actions (P3 ML 인프라 별도 ADR 예정)" |
| 2.2 의료 데이터 격리 | "KMS로 암호화된 S3 영역" | "Cloudflare R2(또는 BYOK 가능 외부 스토리지) 암호화 영역" |
| 2.3 ML 피처 스토어 | "Parquet on S3" | "Parquet on R2 (P3 시점 재검토)" |
| 5.2 P0 기반 구축 | "Terraform으로 AWS 서울 리전 기본 계정 + VPC 구성" | "Cloudflare (`l2pamerica@gmail.com`) Pages/Workers/R2/D1 환경 구성 + wrangler 환경 분리" |
| 7.2 민감 필드 금고 | "별도 KMS 키" | "별도 암호화 키 (현 시점 Workers Secret + 클라이언트측 암호화, BYOK 시점 재결정)" |
| 9. 리스크 등록부 | "필드 단위 KMS" | "필드 단위 암호화 (Workers Secret 기반)" |
| 11. Day 2 | "Terraform 기본 계정, IAM, KMS / 개발 VPC" | "CF API token 발급 + wrangler secrets / Pages dev·preview 환경 분리" |

## Consequences

**긍정**
- P0 단계 매몰비용 제거 (AWS 계정 + Terraform 설정 + VPC 작업 미실시)
- 죠니 기존 CF 경험 활용 — 학습 시간 단축
- 글로벌 엣지 자동 활용 (전 세계 사용자 지연 ↓)
- 정적 + Edge SSR 단일 플랫폼 (배포 / 모니터링 / 비밀관리 단순화)
- 비용 (P0~P1): 월 $0~5 수준 (CF Free tier 충분)

**부정 / 위험**
- P3 ML 학습 인프라 결정 지연 → P3 진입 직전 의사결정 부담 증가
- CF의 Worker 제약 (CPU 30s, 메모리 128MB) 안에서 알고리즘 설계 필요
- 의료 데이터 BYOK / EKM 인증 요구 시 CF 엔터프라이즈 플랜 또는 외부 KMS 마이그레이션 필요
- D1은 SQLite 기반 — 복잡 트랜잭션 / 동시성 한계 (사용자 수 증가 시 외부 Postgres 전환)

**중립 (P2 시점 재결정 트리거)**
- 사용자 데이터 / 의료 데이터 저장 위치는 P1 종료 직전 별도 ADR
- ML 인프라는 P3 진입 직전 별도 ADR

## Alternatives Considered

- **AWS Seoul 유지 (ADR 0002 원안)** — P0~P1 매몰비용 큼 (실제 사용은 P3). 거부.
- **GCP asia-northeast3 (Seoul)** — Firebase 친화 (FormCoach 경험)이나 CF 대비 Edge 분산 약함, 의료/금융 인프라 도구 부족. 거부.
- **하이브리드 (CF Pages + AWS Backend)** — P0 단계에 AWS Backend 자체가 불필요. P3 진입 시 다시 검토.
- **NCP (네이버클라우드)** — 한국 의료 인증 보유. 단 글로벌 사용자 / EVM 노드 / IPFS 등 Web3 인프라 부재. 거부.

## Migration Plan (P3 진입 시 ML 인프라 추가)

1. P2 후반(~20주차) — ML 인프라 ADR 신규 작성
2. 후보: AWS EKS GPU / Modal / RunPod / Lambda Labs / 하이브리드
3. 학습은 외부 GPU, 추론은 CF Workers AI 또는 외부 — 별도 결정
4. 의료 데이터 저장소도 동 시점 재결정 (계속 R2 vs 외부 Postgres + 객체 스토리지)
