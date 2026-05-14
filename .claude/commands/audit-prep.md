---
description: 외부 감사(CertiK 등) 제출 패키지 생성 (절차서 5.2 P5)
---

# /audit-prep

`docs/audit/YYYY-WW.md` 변경 영향 보고서 자동 작성.

## 수행

1. **감사 대상 식별**:
   - `contracts/` 변경 파일 + 커밋 SHA
   - 이전 감사 이후 diff (`git log --since=...`)

2. **정적 분석**:
   - `slither contracts/ --json slither-report.json`
   - `aderyn contracts/ --output aderyn-report.md`
   - High 1건 이상 시 머지 차단

3. **테스트**:
   - `forge test --gas-report` → 가스 회귀
   - `forge coverage` — 변경 라인 100% 커버 확인
   - `forge fuzz --runs 1000000` — 변경 함수

4. **위협 모델**:
   - STRIDE 항목별 (Spoofing / Tampering / Repudiation / Info Disclosure / DoS / Elevation)
   - 각 항목에 완화책 + 코드 위치

5. **운영 보안**:
   - Gnosis Safe 서명자 목록 (지리 분산 증명)
   - 타임락 설정 (48h 확인)
   - Defender Sentinel 알림 규칙

## 출력 구조

```
docs/audit/YYYY-WW.md
├── 1. 감사 범위 (커밋 SHA, 컨트랙트 목록)
├── 2. 정적 분석 결과
├── 3. 테스트 결과 / 커버리지 / Fuzz
├── 4. 가스 회귀
├── 5. 변경 이력 (이전 감사 이후)
├── 6. 위협 모델 (STRIDE)
├── 7. 운영 보안 (서명자, 타임락, 모니터링)
└── 8. 부록 (slither-report.json, aderyn-report.md, gas-report.txt)
```

## 통과 기준 (절차서 6.2)

- 정적 분석 High 0건
- 테스트 커버리지 95%+
- Fuzz 1M runs 무사고
- 가스 회귀 ±10% 이내
