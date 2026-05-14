---
name: chronos-health-data
description: 웨어러블 / EHR 연동, 개인 건강 데이터 수집·암호화·동의 관리 작업 시 호출. 의료법/GDPR/HIPAA 준수 가이드 포함.
---

# Chronos Health Data Skill

## 데이터 수집 채널

| 채널 | API | 인증 | 우선순위 |
|------|-----|------|----------|
| Apple Health | HealthKit (앱) → 동기화 API | OAuth+Apple ID | P0 (모바일 단계) |
| Galaxy Health | Samsung Health SDK | OAuth | P0 |
| Fitbit | Web API | OAuth 2.0 | P1 |
| Oura Ring | Cloud API | OAuth 2.0 | P1 |
| Garmin | Health API | OAuth 1.0a | P2 |
| 병원 EHR (한국) | KMI/유비케어 등 (협의) | B2B 계약 | P3 |
| 병원 EHR (해외) | FHIR R4 표준 | OAuth+SMART | P3 |
| 사용자 수기 입력 | 자체 폼 | 자체 인증 | P0 (Fallback, 토큰 미지급) |

## 동의 관리 (Consent)

- 데이터 카테고리별 별도 동의 (medical / lifestyle / location / genome)
- 동의 이력은 immutable log (`consent_log` 테이블, append-only)
- 철회 가능: 철회 즉시 학습 풀에서 제거 + 익명 통계만 유지
- 18세 미만 가입 불가 (생년월일 검증)

## 데이터 저장 정책

| 분류 | 저장 위치 | 암호화 |
|------|----------|--------|
| 기본 회원 정보 | Supabase Postgres | 컬럼 암호화 (pgcrypto) |
| 의료 데이터 (raw) | IPFS / Filecoin | 클라이언트 측 AES-256 + 사용자 키 |
| 의료 데이터 (집계) | Supabase | 컬럼 암호화 |
| 동의 이력 | Supabase + 해시 체인 | 무결성 검증용 |
| ML 학습용 (익명) | 별도 S3-호환 | k-anonymity k≥10 |

## Zod 스키마 (예시)

```ts
export const HealthSnapshot = z.object({
  userId: z.string().uuid(),
  source: z.enum(['apple', 'galaxy', 'fitbit', 'oura', 'garmin', 'manual']),
  collectedAt: z.string().datetime(),
  metrics: z.object({
    hrv: z.number().nullable(),
    restingHr: z.number().nullable(),
    sleepEfficiency: z.number().min(0).max(1).nullable(),
    activeMinutes: z.number().nullable(),
    steps: z.number().nullable(),
    spo2: z.number().nullable(),
  }),
  proofOfHealth: z.object({          // 자체 입력은 null
    method: z.literal('zk-snark'),
    commitment: z.string(),
    proof: z.string(),
  }).nullable(),
});
```

## API Route 표준 (`src/app/api/health-data/`)

```ts
export async function POST(req: Request) {
  const body = HealthSnapshot.parse(await req.json());
  // 1. 사용자 동의 확인
  // 2. PoH 검증 (있는 경우)
  // 3. 데이터 암호화
  // 4. Supabase + IPFS 저장
  // 5. 토큰 보상 (PoH 있을 시만)
  return Response.json({ ok: true, rewardEligible: !!body.proofOfHealth });
}
```

## 규제 체크리스트

- [ ] GDPR Article 9 (특수 카테고리 처리 근거 명시)
- [ ] HIPAA (미국 사용자 대상 시): BAA 체결 필요한 서비스만 사용
- [ ] 개인정보보호법 (한국): 민감정보 별도 동의
- [ ] 정보통신망법: 익명화 처리 시점 명시

## 금지

- 의료 데이터를 localStorage / IndexedDB에 평문 저장
- 사용자 동의 없이 ML 학습에 사용
- 데이터 제3자 판매 (생태계 파트너십도 별도 동의)
- 제3자 SDK에 raw 의료 데이터 전달 (Sentry, GA 등은 PII 마스킹 필수)
