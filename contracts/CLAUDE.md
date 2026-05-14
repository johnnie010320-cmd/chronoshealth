# contracts — Solidity Workspace

> Foundry 기반. 솔리디티 감사관 필수 통과.

## 책임

- `ChronosToken.sol` (ERC-20 + Permit + Votes)
- `DataVault.sol` (사용자 데이터 메타 해시)
- `RewardDistributor.sol` (Health-to-Earn 머클 드롭)
- `ZKVerifier.sol` (Circom Groth16 검증)

## 표준 (ADR 0005)

- Solidity 0.8.24+
- OpenZeppelin v5+
- `forge fmt` (커밋 전 자동)
- Slither + Aderyn (High 0건 강제)
- `forge test` 커버리지 95%+
- `forge invariant` 1M runs

## 절대 규칙

1. `nonReentrant` 모든 외부 호출 함수
2. `onlyRole(...)` 권한 분리 (msg.sender 직접 체크 금지)
3. Checks-Effects-Interactions 순서 (외부 호출 전 상태 변경 완료)
4. `block.timestamp` 직접 비교 금지 (오프셋 변수 사용)
5. 업그레이드 프록시 채택 시 storage gap 필수
6. `forge script --broadcast` 금지 (deny 등록됨, ask 모드)

## 명령어

```bash
forge install                 # 의존성
forge build                   # 컴파일
forge test -vvv               # 테스트
forge coverage --report lcov  # 커버리지
forge fmt                     # 포맷
slither contracts/            # 정적 분석
forge invariant --runs 1000000
```

## PR 머지 조건

- forge test 100% 통과
- Slither High 0 / Aderyn High 0
- 변경 라인 커버리지 100%
- 가스 회귀 ±10% 이내 (의도 초과 시 PR 본문 명시)
- `/audit-prep` 결과 첨부 (P5 단계)
