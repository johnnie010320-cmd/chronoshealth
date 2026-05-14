# ADR 0005 — 코딩 표준 (TS / Python / Solidity)

- **Status**: Accepted
- **Date**: 2026-05-13
- **Decider**: Johnnie
- **Related**: 절차서 3.6, 6.1, 6.3

## Context

크로노스 헬스는 TypeScript(앱·게이트웨이·SDK), Python(ML), Solidity(컨트랙트) 등 3개 주력 언어를 사용한다. 각 언어별 표준이 일관되지 않으면 PR 리뷰 / 정적 분석 / 코드 검색 효율이 떨어진다.

## Decision

언어별 표준 + 자동화 도구 확정.

### TypeScript
- `tsconfig.json` strict: true, noUncheckedIndexedAccess: true
- 포맷: prettier (printWidth 100, singleQuote true, semi true)
- 린트: eslint + @typescript-eslint, `--max-warnings 0`
- 타입: `type` 우선, `interface`는 클래스 구현체 정의 시만
- 금지: `enum` (→ 문자열 리터럴 유니온), `any` (→ `unknown` + 타입가드), `console.*` (→ `lib/logger`)
- 런타임 검증: Zod (API 입출력, 외부 데이터)

### Python (ML / 일부 서비스)
- Python 3.12+
- 포맷 / 린트: ruff (`pyproject.toml` 설정)
- 타입: mypy --strict
- 데이터 검증: Pydantic v2
- 의존성 관리: uv 또는 poetry (선택은 P0 종료 전 결정)

### Solidity
- 버전: 0.8.24+
- 포맷: `forge fmt`
- 정적 분석: Slither + Aderyn (High 0건 강제)
- 표준 라이브러리: OpenZeppelin v5+
- 패턴: Checks-Effects-Interactions, `nonReentrant`, 명시적 `onlyRole`
- 업그레이드: 명시적 ADR 후 결정 (기본은 비업그레이더블 + 신규 배포 + 마이그레이션)

### 공통
- 커밋 메시지: 컨벤셔널 커밋 (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`)
- 브랜치명: `feature/<slug>`, `fix/<slug>`, `hotfix/<slug>`
- PR 제목 = 컨벤셔널 커밋 형식

## Consequences

**긍정**
- CI 자동 게이트로 인간 리뷰 부담 감소
- 신규 합류자 온보딩 표준화
- 정적 분석으로 의료/금융 사고 사전 차단

**부정 / 위험**
- 초기 학습 비용 (특히 Zod / Pydantic / Slither)
- `--max-warnings 0` 강제로 PR 머지 지연 가능 → 초기 2주는 경고 허용 → 이후 0건 전환

## Alternatives Considered

- **Biome (대신 prettier+eslint)**: 빠르나 플러그인 생태계 부족, 거부 (재검토 P3)
- **Black (Python 포맷)**: ruff format이 호환 + 더 빠름, 거부
- **Hardhat (Foundry 대신)**: JS 기반 친숙하나 fuzzing / cheatcodes / 가스 분석 면에서 Foundry 우위, 거부
