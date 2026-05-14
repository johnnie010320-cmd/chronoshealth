# ADR 0002 — 클라우드: AWS 서울(ap-northeast-2)

- **Status**: Accepted
- **Date**: 2026-05-13
- **Decider**: Johnnie

## Context

크로노스 헬스 1차 출시 지역은 한국 + 영어권이다. 의료 데이터의 국외 이전은 별도 동의 + 규제 검토를 필요로 한다(개인정보보호법 28조의8). 데이터 주권을 위해 데이터는 국내에 보관하는 것이 안전하다.

## Decision

**AWS ap-northeast-2 (Seoul)** 을 운영 1차 리전으로 채택.

- 운영 / 스테이징 / 개발 환경별 **AWS Organization 하위 계정 분리**
- 멀티 AZ (apne2a, apne2b, apne2c) 활용
- 백업 / DR은 별도 ADR (P3 단계)

## Consequences

**긍정**
- 한국 사용자 지연(latency) 최소
- 데이터 국외 이전 규제 회피
- AWS 서비스 풀(EKS, RDS, S3, KMS) 사용 가능

**부정 / 위험**
- 서울 리전 비용이 미국 동부 대비 ~15% 비쌈
- EU(GDPR) 출시 시 EU 리전 추가 필요 (P3 이후)

## Alternatives Considered

- **GCP asia-northeast3 (Seoul)**: Firebase 친화적이나 의료/금융 컴플라이언스 도구 부족
- **NCP (네이버클라우드)**: 한국 토종, 의료 인증 보유. 단 글로벌 확장성 / 인력 풀 / 도구 생태계 약함
- **Azure Korea Central**: AWS 대비 점유율 낮아 인력 채용 난이도 ↑
