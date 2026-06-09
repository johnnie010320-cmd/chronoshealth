# Pending Features — 미구현 개발 내역

> 출처: 스토리보드 `The_DID_스토리보드_0607.pdf` 갭 분석 (2026-06-09 작성).
> 본 문서는 Phase 1~3 연속 작업(2026-06-09 commits `fca4f6b`, `e85ae4c`)에서
> **외부 인프라·외부 API·네이티브 앱·블록체인 인프라** 의존으로 보류된 항목 모음.

## 작성 원칙

- 각 항목은 **storyboard 페이지 → 구현 차단 사유 → 선행 작업(외부) → 권장 ADR/슬라이스 → 예상 작업량** 순.
- 작업량은 **단일 vertical slice 기준** (DB + Gateway + UI + i18n 4언어 + 테스트 + 배포).
- 이미 D1 / Gateway / Web 인프라가 있음을 전제.

---

## 1. SNS 로그인 4종 (Kakao / Facebook / Naver / Apple)

- **스토리보드**: p9
- **현재 상태**:
  - 스키마 골격 완료 → `oauth_accounts (provider, external_id, user_pseudonym_id, email, linked_at)` 테이블 시드 (`migrations/identity/0007_partner_role_oauth.sql`)
  - 로그인 UI 버튼 placeholder 존재
  - 실제 redirect/callback/토큰 검증 라우트 미구현
- **차단 사유**: 각 제공사 개발자 콘솔 등록 후 client_id / client_secret 발급 필수
- **선행 작업 (외부)**:
  1. **Kakao Developers** 앱 등록 → REST API 키 + Redirect URI 등록 → `KAKAO_CLIENT_ID`, `KAKAO_CLIENT_SECRET` (wrangler secret)
  2. **Naver Developers** 애플리케이션 등록 → Client ID/Secret → `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET`
  3. **Meta for Developers** (Facebook) — 앱 등록 + Facebook Login 추가 → App ID/Secret
  4. **Apple Developer Program** ($99/yr) — Sign in with Apple 활성화 → Service ID, Team ID, Key ID, p8 키 → JWT 서명 필요
- **권장 ADR**: ADR 0014 — OAuth provider 정책 (PKCE on/off, refresh token 처리, 이메일 누락 시 처리)
- **권장 슬라이스**:
  - Slice A: Kakao (가장 빠른 한국 사용자 흡수)
  - Slice B: Naver
  - Slice C: Facebook
  - Slice D: Apple (iOS 앱 출시 직전 필수)
- **예상 작업량**: provider 당 1.5~2일 (Apple은 JWT 서명 때문에 2.5일)
- **구현 시 주의**:
  - PII 격리 — 외부 이메일은 `users.email` 에 평문 저장, 외부 ID(`external_id`)는 OAuth 테이블에만 보관
  - 이메일 누락 (특히 Apple "이메일 숨기기" 기능) → `users.email` NULL 허용으로 스키마 변경 필요
  - 본 서비스 19세 미만 차단 정책 — SNS 응답에 생년월일 없을 시 별도 단계로 수집

---

## 2. 국민건강보험공단 검진 결과 연동

- **스토리보드**: p13, p14, p15, p16
- **현재 상태**: 미구현 (UI placeholder 없음)
- **차단 사유**:
  - 공단 OpenAPI 사용권 신청 + 본인인증 SDK (카카오 / 네이버 / 통신사 / 토스) 각각 계약·연동 필요
  - 본인인증 4종 모두 한국 사업자 등록 + 상용 라이선스 필요
- **선행 작업 (외부)**:
  1. **건강보험공단 OpenAPI** 사용 신청 (공공데이터포털 또는 직접 공단 협의)
  2. **카카오 인증서** (간편인증 SDK) 계약 → REST API 키
  3. **네이버 인증서** (NICE 평가정보 위탁) 계약
  4. **PASS** (통신사 인증) 계약
  5. **토스 인증서** 계약
  6. 한국 법인 등록 + 정보보호인증 (ISMS-P 등)
- **권장 ADR**: ADR 0015 — 본인인증 4종 추상화 (`AuthCert` 인터페이스), 공단 데이터 저장 정책
- **권장 슬라이스**: P3 정식 출시 직전
- **예상 작업량**: 30~60일 (외부 계약 시간 제외, 순수 개발만)
- **구현 시 주의**:
  - 공단 데이터는 민감 PII (검진 수치) — identity-vault 내부 별도 테이블, KMS 암호화 권장
  - 공단 데이터는 사용자 수동 갱신 (1년 1회 갱신 가정)
  - "어떠케어" 등 기존 서비스를 reference (스토리보드 p13/p14 명시)

---

## 3. DID (Decentralized Identifier) 분산원장 등록

- **스토리보드**: p35 — "DID = Decentralized Identifier, W3C 표준, 분산원장에 등록"
- **현재 상태**: 완전 미구현. 현재 모델은 중앙 identity-vault (ADR 0003) 기반.
- **차단 사유**:
  - W3C DID 표준 채택 시 ADR 0003 PII 격리 정책의 근본 재검토 필요
  - DID 메서드 결정 (did:ethr, did:web, did:polygon, did:key 중 택1)
  - Polygon DID Registry 스마트컨트랙트 작성·감사·배포
  - Verifiable Credential 발행자(issuer) / 검증자(verifier) 분리 아키텍처
- **선행 작업 (내부)**:
  1. **ADR 0016** — DID 메서드 채택. Polygon 토큰(ADR 0004)과 같은 체인 권장 → `did:polygon`
  2. **ADR 0017** — ADR 0003 개정. PII 격리 + DID 분산 저장 정합화
  3. **Foundry 슬라이스** — DID Registry 컨트랙트 (W3C DID Core v1.0)
  4. **VC 발행 파이프라인** — 검진 결과 / Twin 데이터에 issuer signature
- **권장 슬라이스**: P5 (mainnet 진입 시점)
- **예상 작업량**: 60~90일 (컨트랙트 감사 포함)
- **구현 시 주의**:
  - 사용자가 직접 키 관리 시 UX 매우 어려움 → social recovery + MPC 검토
  - 한국 개인정보보호법 + GDPR 모두 만족하는 DID 운영 모델 별도 법무 검토
  - 가스비 — Polygon이라도 사용자가 지불 안 하도록 meta-transaction (gasless) 검토

---

## 4. 3rd Data 특수 진단 + 결제

- **스토리보드**: p19 — DNA 손상 / 텔로미어 / 노쇠세포 / 면역기능 / 줄기세포 / 후성유전 / 장내미생물
- **현재 상태**:
  - 메뉴 placeholder만 (`/menu` 의 itemData3 disabled)
  - 결제 시스템 미구현
- **차단 사유**:
  - 외부 진단기관 파트너십 필수 (DNA 분석, 텔로미어 측정, 마이크로바이옴 검사 등 각각 다른 업체)
  - PG (한국: 이니시스/카카오페이/네이버페이, 글로벌: Stripe) 가맹점 등록
  - 의료기기법 / 진단검사관리법 검토 — 일부 검사는 "의료행위" 분류 가능성
- **선행 작업 (외부)**:
  1. **진단기관 파트너십** — 각 검사별로 (예: DNA 분석 — 마크로젠/테라젠, 텔로미어 — Life Length 등)
  2. **결제 PG 계약** — 한국 PG (이니시스 등) + 정기/단건 둘 다
  3. **의료법 검토** — 변호사·의료자문위원
  4. **10만원/30만원 패키지** 상품 정의 (스토리보드 p19)
- **권장 ADR**: ADR 0018 — 결제 + 진단기관 정산
- **권장 슬라이스**: P4~P5 (수익 모델 본격 가동 시점)
- **예상 작업량**: 45~90일 (계약 시간 제외)

---

## 5. Apple Health / Galaxy Watch / Wearable 연동

- **스토리보드**: p11 (Wearable device 연동), p18 (활동량계 선택 UI)
- **현재 상태**:
  - 메뉴 placeholder만 (`/menu` 의 itemWearable disabled)
  - 측정 지표 명시 (심박수·호흡수·손목온도·SpO2·수면시간·생리주기)
- **차단 사유**:
  - **HealthKit / Health Connect 는 네이티브 앱(iOS/Android) 만 접근 가능**. 현재 코드는 Next.js 정적 export 웹앱.
  - 네이티브 앱 빌드 환경 + Apple Developer Program ($99/yr) + Google Play Console ($25 1회)
- **선행 작업 (내부)**:
  1. **모바일 앱 결정** — React Native / Capacitor / Flutter / 네이티브 중 택1
     - 권장: React Native + Expo (현재 TS/React 스택과 호환)
  2. **모노레포에 `apps/mobile/` 추가** (Chronos CLAUDE.md 이미 명시되어 있으나 비어있음)
  3. **HealthKit Bridge** (iOS) + **Health Connect Bridge** (Android) 작성
  4. **개별 디바이스 연동** — Galaxy Watch (Samsung Health SDK), Apple Watch (HealthKit 통해 간접)
- **권장 ADR**: ADR 0019 — 네이티브 앱 스택 채택
- **권장 슬라이스**: P3 진입 시점 (웹앱 안정 후)
- **예상 작업량**: 모바일 앱 셋업 30~45일 + HealthKit 연동 15일 + Health Connect 연동 15일

---

## 6. 스트레스 얼굴인식 측정

- **스토리보드**: p20, p24 — "얼굴인식으로 스트레스 측정하기"
- **현재 상태**: 미구현. routine_entries.stress_level 컬럼만 추가됨 (수동 입력 가능)
- **차단 사유**:
  - 얼굴 표정 → 스트레스 분류 모델 학습 데이터셋 확보 어려움
  - 카메라 권한 + 프라이버시 정책 강화 필요 (얼굴 데이터는 강 PII)
  - 실시간 추론 모델 (TFLite / CoreML) 배포 인프라
- **선행 작업 (내부)**:
  1. **ML 파이프라인** — 공개 표정 데이터셋 (FER2013 등) + 스트레스 라벨 매핑
  2. **개인정보 동의** — 얼굴 이미지는 절대 저장 안 하고 디바이스 내 추론 (on-device only)
  3. **Workers AI Vision** 모델 후보 검토 — 표정 분석에 특화된 모델 없으면 자체 학습
- **권장 슬라이스**: 매우 후순위 (P4 이후)
- **예상 작업량**: 45~90일

---

## 7. Skin Age / Joint Age 모델

- **스토리보드**: p25 — 5종 나이 중 Skin/Joint 미구현
- **현재 상태**:
  - 메뉴 placeholder (`/menu` 의 itemSkinAge / itemJointAge)
  - avatar API 응답에 `fiveAges.skin`, `fiveAges.joint` 존재하나 P1 휴리스틱 (bioAge 그대로 반환)
- **차단 사유**:
  - Skin Age: 피부 사진 + 광노화/주름/색소침착 학습 모델 필요
  - Joint Age: 가동범위·통증·움직임 패턴 모델 (의학 데이터 부족)
- **선행 작업 (내부)**:
  1. **ML 학습 데이터셋** 확보 — 피부과 협업 (공개 데이터셋 한정적)
  2. **Skin Age**: 사용자 사진 (얼굴/손) → ResNet 기반 회귀 모델
  3. **Joint Age**: 가동범위 자가 측정 설문 + 통증 점수 → 회귀 모델
- **권장 슬라이스**: 매우 후순위 (P4 이후)
- **예상 작업량**: Skin 45일 + Joint 30일 (각각 의학자문 시간 제외)

---

## 8. 음식 검색 DB (식약처 식품영양정보)

- **스토리보드**: p20, p21 — "음식 검색" 탭
- **현재 상태**: AI 칼로리 추정 (LLM) + 푸드샷 (Vision) 구현됨. 검색 가능한 식품 DB는 미구현.
- **차단 사유**: 식품영양정보 DB 라이선스 필요
- **선행 작업 (외부)**:
  1. **식품의약품안전처 식품영양정보 OpenAPI** 키 발급 (한국)
  2. **USDA FoodData Central** API (영문)
- **권장 슬라이스**: P2 후반 (이미 있는 AI 추정으로 일부 대체 가능하므로 우선순위 낮음)
- **예상 작업량**: 5~10일

---

## 9. 광고 메뉴 + 정산

- **스토리보드**: p7 메뉴 트리의 "7. 광고", p27/p28 — "영양제 판매 수수료", "피트니스센터 광고 수수료"
- **현재 상태**: care 페이지에 affiliates 카드 일부 노출. 별도 광고 메뉴 + 정산 시스템 미구현
- **차단 사유**:
  - affiliates 테이블 + 노출 카운터 + 클릭 추적 + 정산 파이프라인 미구현
  - 광고주(파트너) 관리 admin UI 필요
- **선행 작업 (내부)**:
  1. **`affiliates` 테이블 확장** — 노출 노이즈 + 정산 추적
  2. **`affiliate_impressions`, `affiliate_clicks` 테이블** 신설
  3. **광고주 admin** — partner_accounts (이미 있음) 와 affiliates 결합
  4. **정산** — 월 단위 정산 리포트 자동 생성
- **권장 ADR**: ADR 0020 — 광고/제휴 트래킹 + 정산
- **권장 슬라이스**: P3 (수익 모델 시점)
- **예상 작업량**: 15~25일

---

## 10. Push 알림 (Daily 루틴 알림)

- **스토리보드**: p31 — "Daily 루틴 목록 check alarm 발송 서비스"
- **현재 상태**: 미구현
- **차단 사유**:
  - 웹 푸시는 Web Push API + Service Worker 필요 (PWA 인프라)
  - 모바일 푸시는 네이티브 앱 + APNs (Apple) / FCM (Google) 필요
- **선행 작업 (내부)**:
  1. **웹 푸시 (PWA)** — Service Worker + VAPID 키 생성 + Cloudflare Workers 에서 Push API 호출
  2. **알림 스케줄러** — Cron Trigger (이미 가능) 로 매일 정해진 시각 발송
- **권장 ADR**: ADR 0021 — 푸시 알림 인프라
- **권장 슬라이스**: P3 (PWA 전환 단계)
- **예상 작업량**: 웹 푸시 10~15일, 네이티브 푸시 +15일

---

## 우선순위 권장

### 다음에 가장 먼저 할 만한 것
1. **Kakao 로그인** (Phase 3 1번) — 한국 사용자 onboarding 마찰 가장 큰 감소
2. **푸시 알림 PWA** (Phase 3 10번) — 리텐션 큰 영향, 외부 의존 없음
3. **광고 정산** (Phase 3 9번) — 수익 모델 가동 가능

### 인프라 의존성 큰 것 (별도 트랙)
- DID 분산원장 (Phase 3 3번) — ADR 0016/0017 합의 먼저
- 국민건강보험공단 연동 (Phase 3 2번) — 외부 계약·법무 트랙
- 네이티브 앱 + Wearable (Phase 3 5번) — 모바일 앱 스택 결정 먼저

### 수요 작아 후순위
- 스트레스 얼굴인식 (Phase 3 6번)
- Skin/Joint Age 모델 (Phase 3 7번)

---

## 외부 인프라 체크리스트 (작업 시작 전 필수)

| 항목 | 비용 | 등록 사이트 | 처리 시간 |
|---|---|---|---|
| Kakao Developers | 무료 | https://developers.kakao.com | 즉시 |
| Naver Developers | 무료 | https://developers.naver.com | 즉시 |
| Meta for Developers | 무료 | https://developers.facebook.com | 즉시 |
| Apple Developer Program | $99/yr | https://developer.apple.com | 즉시 (결제 후) |
| Google Play Console | $25 1회 | https://play.google.com/console | 즉시 |
| 건강보험공단 OpenAPI | 무료 | (별도 협의 필요) | 30~60일 |
| 식약처 OpenAPI | 무료 | https://www.data.go.kr | 1~3일 |
| 카카오 인증서 | 유료 (계약) | (영업 문의) | 30일+ |
| 네이버 인증서 | 유료 (계약) | (영업 문의) | 30일+ |
| PASS 통신사 인증 | 유료 (계약) | (영업 문의) | 60일+ |
| 토스 인증서 | 유료 (계약) | (영업 문의) | 30일+ |
| 한국 PG (이니시스 등) | 가맹점 수수료 | (영업 문의) | 7~14일 |
| Stripe (글로벌) | 가맹점 수수료 | https://stripe.com | 즉시 (실명 인증 후) |

---

**문서 갱신 규칙**: 새 외부 의존성 발견 시 본 문서에 항목 추가. 구현 완료 항목은 본 문서에서 제거 + commit 메시지에 "closes pending-features.md #N" 명시.
