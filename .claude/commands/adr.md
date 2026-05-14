---
description: 비가역적 결정을 docs/adr/NNNN-*.md로 기록 (절차서 4.1)
---

# /adr <결정명>

비가역적 결정 (체인 선택, 라이브러리 선택, 데이터 보존 정책, 인프라 리전 등)은 반드시 ADR로 남긴다.

## 절차

1. 다음 ADR 번호 = `ls docs/adr/*.md | wc -l + 1` 형식 4자리 (0001, 0002, ...)
2. 파일명: `docs/adr/NNNN-<slug>.md`
3. 슬러그는 kebab-case 영문 (예: `0004-token-chain-polygon`)

## 양식

```markdown
# ADR NNNN — <한 줄 결정명>

- **Status**: Proposed | Accepted | Deprecated | Superseded by ADR-XXXX
- **Date**: YYYY-MM-DD
- **Decider**: <이름>

## Context
왜 결정이 필요한가? 배경, 제약, 트리거 사건.

## Decision
무엇으로 결정했는가? 단정형 한 문단.

## Consequences
**긍정**: ...
**부정 / 위험**: ...
**중립 (영향 없음 / 미지)**: ...

## Alternatives Considered
- 옵션 A — 거부 사유
- 옵션 B — 거부 사유
- 옵션 C — 거부 사유
```

## 금지

- Status를 채우지 않은 ADR 머지
- 기존 ADR 본문 수정 (대신 새 ADR로 Supersede)
- Alternatives 비워두기 — "선택"이 아닌 "유일한 길"이라면 ADR 불필요
