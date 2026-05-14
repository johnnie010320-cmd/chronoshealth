# ADR 0001 — 모노레포: pnpm + Turborepo

- **Status**: Accepted
- **Date**: 2026-05-13
- **Decider**: Johnnie

## Context

크로노스 헬스는 5개 서비스 + 3개 앱 + ML + 컨트랙트 + 공용 패키지를 동시에 개발한다. 코드 공유와 빌드 파이프라인 효율을 위해 모노레포가 필요하다.

## Decision

**pnpm 워크스페이스 + Turborepo** 채택.

- `pnpm-workspace.yaml`로 워크스페이스 정의
- `turbo.json`으로 빌드/테스트 의존성 그래프 관리
- 잠금파일은 `pnpm-lock.yaml` 1개만 (루트)

## Consequences

**긍정**
- 디스크 절약 (pnpm의 hard link)
- 빠른 캐시 (Turborepo remote cache)
- 잠금파일 단일화로 의존성 충돌 추적 용이

**부정 / 위험**
- npm/yarn 사용자 진입장벽 약간 (`pnpm` CLI 학습)
- Turborepo remote cache 사용 시 Vercel 계정 필요 (선택)

## Alternatives Considered

- **Nx**: 강력하나 학습 곡선 가파름, JS 외 다언어(Python/Solidity) 지원 약함
- **Lerna**: 사실상 deprecated, Nx에 합병
- **Yarn workspaces**: 잠금파일 안정성 이슈 (Yarn Berry PnP 호환성)
- **Polyrepo**: 코드 공유 불가, CI 복잡도 증가, 거부
