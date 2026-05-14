# ADR 0004 — 토큰 체인: Polygon PoS

- **Status**: Accepted
- **Date**: 2026-05-13
- **Decider**: Johnnie
- **Related**: 절차서 2.4, 8.1

## Context

CHRO 토큰의 핵심 효용은 (1) 주간 머클 드롭 보상 클레임 (대량 트랜잭션), (2) ZK 건강 증명 검증, (3) 거버넌스 투표. 사용자가 직접 클레임 트랜잭션을 보내야 하므로 가스비 부담이 진입 장벽이 될 수 있다.

## Decision

**Polygon PoS (chainId 137)** 를 토큰 발행 1차 체인으로 채택.

- 표준: ERC-20 + Permit + Votes (OpenZeppelin)
- 컨트랙트: ChronosToken / DataVault / RewardDistributor / ZKVerifier
- 자금 관리: Gnosis Safe 3-of-5 + 48h TimeLock
- 후속 확장(P5+): Base / Arbitrum L2 검토

## Consequences

**긍정**
- 가스비 평균 $0.001~0.01 (Ethereum 메인넷 대비 1/100~1/1000) → 클레임 부담 거의 없음
- EVM 호환 → OpenZeppelin / Foundry / Slither / Defender 도구 그대로
- TheGraph 노드 풍부 → 인덱싱 용이
- LBank 상장 시 Polygon 자산 풀에 안정적 진입

**부정 / 위험**
- Polygon PoS는 PoS Validator 100여 개 — Ethereum 대비 탈중앙성 낮음
- 토큰 가치 인식이 메인넷 대비 일부 평가절하 가능
- 향후 Polygon zkEVM / PoS 통합 변동성 (지속 모니터링 필요)

## Alternatives Considered

- **Ethereum 메인넷**: 가스비 평균 $5~50/tx — 주간 클레임 자체가 가스비 손실. 거부.
- **BNB Smart Chain**: 가스 저렴하나 탈중앙화 / 규제(증권 분류 리스크) / 글로벌 거래소 평가 이슈. 거부.
- **Base**: 가스 저렴 + Coinbase 후광. 단 신생(2023~) — 토큰 인프라(브릿지, 거래소 지원) 아직 발전 중. 향후 멀티체인 확장 후보로 보류.
- **Solana**: 가스 거의 0이나 EVM 비호환 → 도구/인력 풀 재구축 비용. 거부.
- **자체 메인넷**: 명시적으로 1차 출시 제외 범위 (절차서 1.2). 거부.
