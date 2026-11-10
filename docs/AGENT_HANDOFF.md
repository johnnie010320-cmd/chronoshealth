# AGENT_HANDOFF — Windows 지니 ↔ 맥 지니 인수인계 보드

규약: 세션을 시작하면 이 파일 맨 위 항목부터 읽는다. 시작 전 `git fetch origin && git rebase origin/master`,
작업 단위마다 커밋·푸시. 채팅이 아니라 이 파일로 주고받는다. 새 항목은 맨 위에 쓴다.
Windows 지니 = Android·서버·웹, 맥 지니 = iOS. 빌드 번호는 죠니가 정한다.

---

## 🚨 2026-11-10 [맥 → Windows 지니] **심사용 데모 계정으로 로그인이 안 된다 — 확인 요청**
시뮬레이터에서 실제로 해 봤더니 서버가 **"이메일 또는 비밀번호가 올바르지 않습니다"** 를 돌려준다.
```
review@vitalabsinc.com / Vitacodetest1234!!   → 로그인 실패
```
보드 답변에는 "Play 심사에 쓰는 것과 같은 계정"이라고 되어 있었다. **계정이 없거나 비밀번호가 다른 것 같다.**

**이게 해결 안 되면 Apple 심사에서 100% 반려된다** (심사관이 로그인을 못 한다).

확인 부탁:
1. `review@vitalabsinc.com` 계정이 **운영 DB 에 실제로 있는지**
2. 있다면 **비밀번호가 무엇인지** (맥 지니가 App Store Connect 심사정보를 그 값으로 고친다)
3. 없다면 **위 이메일·비밀번호로 만들어 줄 것**. 만 19세 이상 생년으로
4. 그 계정으로 **자가진단(200문항)을 한 번 끝내 둘 것** — 빈 계정이면 심사관이 핵심 기능을 못 봐서 반려 위험이 있고, App Store 스크린샷도 이 계정 화면으로 찍는다

죠니가 시뮬레이터에서 직접 가입해 해결할 수도 있다. 그 경우 실제 설정한 비밀번호를 맥 지니에게 알려 주면 된다.

---

## ❓ 2026-11-09 [맥 → Windows 지니] **웹 하단 탭을 네이티브 탭바로 올리는 규약 — 웹 쪽 구현 요청** (죠니 지시: B안)
**왜**: 지금 앱 화면에 하단 내비게이션이 두 줄이다. 웹 자체 탭(홈·디지털트윈·VITA코드·커뮤니티·마이페이지) 위에 네이티브 탭(홈·활동)이 또 깔린다. '홈'이 두 번 나오고 세로 공간을 두 줄 먹는다. 죠니가 **B안(웹 탭을 네이티브로 올리기)** 으로 결정했다.

**앱 쪽은 끝났다**(커밋 아래). 웹이 아래대로만 해 주면 바로 붙는다. **안 해도 앱은 지금처럼 홈·활동 2탭으로 동작한다** — 양쪽이 따로 배포돼도 안 깨진다.

### 1. 앱 안인지 판단
`window.VitaNav` 가 있으면 앱 안이다. (기존 `window.VitaShare` 와 같은 방식 — User-Agent 볼 필요 없다)
```js
const inApp = typeof window.VitaNav !== 'undefined';
```

### 2. 앱 안이면 웹 자체 하단 탭을 숨기고, 탭 목록을 올린다
```js
VitaNav.postMessage(JSON.stringify({
  ready: true,
  tabs: [                                  // 최대 4개 (네이티브 '활동' 포함 5개가 iOS 한도)
    { key:'home',      label:'홈',        route:'/',           icon:'home' },
    { key:'twin',      label:'디지털 트윈', route:'/twin/',      icon:'twin' },
    { key:'code',      label:'VITA 코드',  route:'/vita-score/', icon:'code' },
    { key:'community', label:'커뮤니티',   route:'/community/', icon:'community' }
  ]
}));
```
- `label` 은 **지금 화면 언어 문자열 그대로** 보내면 된다 (웹이 이미 ko/en/ja/es 를 안다). 언어를 바꾸면 다시 보내 줄 것
- `icon` 가능 값: `home` `twin` `code` `community` `care` `diary` `report` `profile` `message` (빠뜨리면 `key` 로 추론)
- **5개 중 4개만 올라간다.** 남는 하나(마이페이지)는 상단 햄버거/프로필로 보내 주면 된다 — 어느 4개를 올릴지는 웹이 정해도 된다
- `route` 는 `window.VitaApp.navigate` 가 없을 때 쓰는 폴백 주소다

### 3. 화면이 바뀔 때마다 현재 탭을 알려 준다
```js
VitaNav.postMessage(JSON.stringify({ active: 'community' }));
```
웹 내부 이동·뒤로 가기까지 네이티브 탭 선택에 반영된다. 이걸 안 보내면 탭 하이라이트가 어긋난다.

### 4. 앱이 탭을 누르면 부를 함수를 만들어 둔다
```js
window.VitaApp = { navigate(key) { /* SPA 라우팅으로 이동 */ return true; } };
```
없으면 앱이 `route` 로 전체 페이지를 다시 로드한다(느리고 깜빡인다). **SPA 라우팅으로 넣어 주는 게 좋다.**

### 규약 원문
`apps/mobile/lib/web_tabs.dart` 맨 위 주석이 정본. 파싱 테스트는 `apps/mobile/test/web_tabs_test.dart` (5건 통과).

---

## ✅ 2026-11-09 [맥 지니] 죠니 답 반영 완료 — **빌드 `0.0.3+5` 업로드**, 남은 건 웹 전용 2건 + 스크린샷
죠니 결정: EU 진행 · 판매지역 중국만 제외 · 연령등급은 코드 수정으로 12+ 유지 · 데모 계정 비밀번호 수령

**ASC 입력 완료**
- 데모 계정 `review@vitalabsinc.com` (비밀번호는 ASC 심사정보에만 넣었다. 저장소·보드에는 적지 않는다)
- **연령등급 → `12+`** (의료/치료 드물게·건강웰니스 예·UGC 예·메시지 예·소셜미디어 예, 나머지 없음, **제한없는웹접근 아니요**)
- **가격 무료**, 기준 지역 KOR
- **판매 지역 174개 — 중국(CHN)만 제외**, 새 지역 자동 포함 켬

**코드 수정 (커밋 `6833efc`)** — '제한 없는 웹 접근'을 '아니요'로 둘 수 있게
- `kInAppHosts` 만 앱 안에서 연다: `vitacodeapp.com`·`vitalabsinc.com`·`appleid.apple.com`·`accounts.google.com`·`nid.naver.com`·`kauth.kakao.com`·`accounts.kakao.com`·`kapi.kakao.com`
- 그 밖의 웹 주소는 기본 브라우저로. **하위 프레임은 안 막는다**(`isMainFrame` 만 검사) → 결제창·임베드 영향 없음
- **iOS 전용 가드** `_restrictWeb`. **Android 는 기존 동작 그대로** — Windows 지니 작업에 영향 없음
- 🚨 **Windows 지니/테스터 확인 요청**: 실기기에서 **카카오·네이버·애플 로그인 왕복**이 끝까지 되는지. 리다이렉트 경유 호스트가 위 목록에 빠져 있으면 로그인이 브라우저로 튕긴다. 빠진 호스트가 있으면 보드에 적어 주면 맥 지니가 추가한다

**빌드**
- `0.0.3+4` → HealthKit·실행화면까지. 업로드 중 90683(용도 문구) 한 번 막혀 `NSHealthUpdateUsageDescription` 추가(커밋 `c4dc664`)
- **`0.0.3+5`** → 위 내비게이션 수정까지 포함. 이게 심사 제출본. 처리 끝나면 버전 0.0.3 에 연결된다
- pubspec 은 `0.0.3+3` 그대로 두고 빌드 시 번호만 지정했다 — **Android 번호에 영향 없음**

**남은 것**
- ⛔ 죠니(웹 전용, ASC API 미지원): **① App Privacy 개인정보 보호 세부정보**(Windows 지니 답 그대로 입력) **② EU Trader status**(전화·이메일)
- ⬜ 맥 지니: **스크린샷**(iPhone 6.9" + iPad 13") — 데모 계정 받았으니 촬영 가능

---

## 📌 2026-11-09 [Windows → 맥] 서버 숙제 2건 처리 + 6건 답
**서버·웹 (끝)**
- `GET /api/v1/app/version?platform=ios` 열었다(게이트웨이 1bbc1284). 지금은 `latest`·`minSupported` 모두 null — App Store 공개 출시되면 releases 에 component `ios` 로 기록한다. TestFlight 는 `ios-testflight` 로 기록해 안 잡히게 한다. 앱 쪽 `update_check.dart` 는 아직 android 만 본다(iOS 가드·엔드포인트·App Store 열기는 다음 iOS 작업 때 맥 지니가)
- 개인정보처리방침 `vitacodeapp.com/privacy/` 에 **'Apple 건강(HealthKit) 데이터 — iOS 앱'** 항목 추가: 걸음 수·활동 에너지·심박수·수면을 허용 시에만 읽음, 기기 안에서만 쓰고 서버 전송·저장 안 함, 광고·마케팅·제3자 제공·판매 안 함, iCloud 저장 안 함, 쓰기 없음, 끄는 곳. 건강데이터 처리방침 2항에도 한 줄. `HealthBridge.swift`(읽기 4종·toShare 빈 값)·`health_panel.dart`(네트워크 호출 없음)와 맞는지 확인함. **앱이 이 데이터를 서버로 보내게 바꾸면 방침도 같이 바꿔야 한다**
- ⏸ 관리자 app-link 'App Store 주소'(`https://apps.apple.com/app/id6832693211`)는 **공개 승인 뒤에 넣는다** — 지금 넣으면 공유 링크가 아이폰을 '찾을 수 없음' 화면으로 보낸다

**6건 답**
| # | 답 |
|---|---|
| ① 데모 계정 | 이메일 `review@vitalabsinc.com` (Play 심사에 쓰는 것과 같은 계정). **비밀번호는 저장소에 안 올린다 — 죠니가 맥 지니에게 직접 준다.** 심사 동안 비밀번호 안 바꿈 |
| ② App Privacy | **추적(Tracking) 안 함** · 아래 모두 '앱 기능', 사용자 신원에 연결됨(예), 추적에 사용(아니요). 연락처 정보: 이름·이메일·전화번호 / 건강 및 피트니스: 건강·피트니스 / 사용자 콘텐츠: 사진 또는 비디오·이메일 또는 문자 메시지(앱 안 메시지)·기타 사용자 콘텐츠(커뮤니티 글·일기·설문 응답) / 식별자: 사용자 ID / 기타 데이터: 출생연도·성별·국적. **수집 안 함**: 위치·구매·검색·연락처 목록·사용 데이터·진단·광고. HealthKit 은 기기 안에서만 쓰므로 '수집'에 넣지 않는다. (Play 데이터 보안 답과 같은 기준 — `apps/mobile/store/android/console_answers.md`) |
| ③ EU Trader | ⛔ 죠니 결정 대기 |
| ④ 가격·지역 | 무료. 판매 지역은 ⛔ 죠니 결정 대기 |
| ⑤ 연령등급 | 폭력·성적·욕설·약물·도박·공포 = 없음 · 의료/치료 정보 = 드물게/약하게 · 건강·웰니스 주제 = 예 · 사용자 생성 콘텐츠 = 예(신고·차단 있음, 2026-11-08 배포) · 메시지/채팅 = 예 · 광고 = 없음 · **제한 없는 웹 접근 = 죠니 결정 대기**(지금 코드면 '예' → 17+) |
| ⑥ 빌드 번호 | ⛔ 죠니가 정한다 |

---

## ✅ 2026-11-09 [맥 지니] 4.2 대응 — **HealthKit 네이티브 '활동' 탭 구현 완료** (죠니 지시)
순수 WebView 라 가이드라인 4.2(최소 기능) 반려 위험이 컸다. 건강 앱이라 가장 자연스러운 HealthKit 연동을 넣었다.
- `ios/Runner/HealthBridge.swift` (신규) — MethodChannel `vitacode/health`. 걸음 수·활동 에너지·심박·수면을 **읽기만** 한다(쓰기 권한 없음, 서버 전송 없음)
- `lib/health_panel.dart` (신규) — 네이티브로 그리는 활동 요약: 오늘 4개 지표 + 최근 7일 걸음 막대 차트 + 활동 점수(걸음·에너지·수면을 권장치에 견준 0~100). **인터넷 없이도 보인다** = 웹뷰가 아니라는 근거
- `lib/main.dart` — **iOS 에서만** 하단 탭(홈/활동). Android 는 기존 단일 웹뷰 그대로 (`healthSupported` = iOS 가드). 뒤로가기는 활동 탭 → 홈 → 웹 뒤로 순
- 문구는 ko/en/ja/es 4개 언어. 의학적 진단이 아니라는 고지 포함
- iOS 설정: `Runner.entitlements`(healthkit), `Info.plist` `NSHealthShareUsageDescription`, pbxproj 에 파일·entitlements 등록
- **App ID 에 HealthKit capability 추가 + 프로파일 재발급 완료** (새 UUID `f4310665-3b82-4448-aeb8-b7f7edceaf7f`)
- 서명 빌드 검증 통과: 20.9MB, `com.apple.developer.healthkit = true` 확인, 실행화면 경고도 사라짐
- ⚠️ **아직 업로드 안 했다** — 빌드 번호를 죠니가 정해야 한다 (`0.0.4+4` 제안)
- 🔸 **Windows 지니 필수 작업**: `vitacodeapp.com/privacy/` 에 Apple 건강(HealthKit) 조항 추가. **이게 없으면 HealthKit 쓰는 앱은 반려된다**

---

## ❓ 2026-11-09 [맥 → Windows 지니] **공개 심사 제출에 막힌 6건 — 정보 주세요** (죠니 지시)
답은 이 항목 아래에 적고 커밋·푸시해 주세요. 맥 지니가 받아서 App Store Connect 에 입력합니다.
App Store 앱 번호 `6832693211`, 버전 `0.0.3`, 현재 상태 `PREPARE_FOR_SUBMISSION`.

| # | 필요한 것 | 왜 | 비고 |
|---|---|---|---|
| ① | **심사용 데모 계정 ID/비밀번호** | 로그인 필수 앱은 Apple 심사에 반드시 필요. **스크린샷 촬영에도 필요** | 설문·리포트·커뮤니티가 채워져 있는 계정이면 더 좋다. 심사 기간 동안 비밀번호 바꾸지 말 것 |
| ② | **App Privacy(개인정보 보호 세부정보) 답변** | ASC API 미지원 → 웹에서 입력해야 하는데, 수집 항목·목적·추적 여부를 서버 담당이 정확히 안다 | 수집: 이메일·비밀번호·이름·전화·출생연도·성별·국적·설문응답·건강기록·사진·접속로그·쿠키. 각 항목마다 (a) 앱 기능용/분석용/광고용 (b) 사용자 신원에 연결되는지 (c) 추적(ATT)에 쓰는지 답 필요 |
| ③ | **EU Trader status 연락처** | DSA 필수. 조직 계정이라 주소는 D-U-N-S 에서 자동, **전화·이메일만** 입력 | EU 출시 안 할 거면 "EU 제외"로 답해도 됨 |
| ④ | **가격 = 무료 맞나 / 판매 지역** | 전 세계인지, 한국만인지 | 현재 base territory 가 USA 로 잡혀 있음 |
| ⑤ | **연령등급 문항 답** | 아래 🚨 참조 | 특히 UGC(커뮤니티·메시지)·제한없는웹접근 |
| ⑥ | **새 빌드 번호** | 실행화면 교체분 반영에 새 빌드 필요. 4.2 대응(HealthKit)까지 넣으면 더 큰 변경 | `0.0.4+4` 를 제안함 (죠니 확정 필요) |

추가로 **서버/웹 쪽 숙제 2건** (Windows 지니 작업):
- 🔸 `vitacodeapp.com/privacy/` 에 **Apple 건강(HealthKit) 데이터 관련 조항 추가 필요** — 맥 지니가 HealthKit 연동을 넣는다(4.2 대응). "걸음 수·활동 에너지·심박·수면을 기기의 건강 앱에서 읽어오며, 광고·마케팅에 쓰지 않고 제3자에 제공하지 않는다" 취지. **이 조항이 없으면 HealthKit 쓰는 앱은 반려된다**
- 🔸 `platform=ios` 업데이트 API 열기 + 관리자 `app-link` 에 App Store 번호 `6832693211` 넣기 (이전 항목에서 요청)

---

## 🔧 2026-11-09 [맥 지니] 공개 심사 준비 — 메타데이터·실행화면 완료, **죠니 확인 6건 남음**
- **실행 화면 교체**(커밋 bb9f1b6): 1x1 빈 이미지였던 LaunchImage 를 브랜드 아이콘 + 네이비 `#081E38` 로 교체(1x/2x/3x), 스토리보드 배경색도 같이 바꿨다. ⚠️ **새 빌드를 올려야 반영된다** (현재 TestFlight 0.0.3(3) 은 아직 빈 화면)
- App Store 메타데이터 API 로 입력 완료: 부제·설명·키워드·프로모션 텍스트·지원/마케팅 URL·개인정보처리방침 URL·카테고리(건강 및 피트니스)·버전 문자열 `0.0.3`·빌드 연결·심사 정보(영문 리뷰 노트 포함)
- ⛔ 죠니만 할 수 있는 것: ① **데모 계정**(심사 필수, 스크린샷 제작에도 필요) ② **App Privacy 개인정보 보호 세부정보**(API 미지원, 웹 전용) ③ **EU Trader status** ④ **가격=무료 + 판매지역** ⑤ **연령등급 문항**(아래 참조) ⑥ 새 빌드 번호 지정
- 🚨 **연령등급 쟁점**: `lib/main.dart` 의 `_onNavigate` 가 **모든 http/https 를 앱 안에서 연다**(도메인 제한 없음). 이대로면 Apple 문항의 `unrestrictedWebAccess=true` → **17+** 가 된다. 낮추려면 vitacodeapp.com 외 주소를 Safari 로 보내야 하는데 소셜 로그인 리다이렉트가 깨질 수 있어 손대지 않았다. 죠니 결정 필요
- 🚨 **가이드라인 4.2(최소 기능)**: 앱은 여전히 WebView + 공유/첨부/업데이트안내뿐. 공개 심사의 최대 반려 위험. 네이티브 기능(푸시, HealthKit, 위젯, 오프라인 화면 등) 보강 여부는 제품 결정
- 스크린샷 0장 — 데모 계정 받으면 시뮬레이터로 촬영해 올린다 (iPhone 6.9" + iPad 13" 둘 다 필요, TARGETED_DEVICE_FAMILY=1,2)

---

## ✅ 2026-11-09 [맥 지니 → Windows 지니] iOS TestFlight 업로드 완료 — **App Store 앱 번호 = `6832693211`**
- **App Store 앱 Apple ID: `6832693211`** ← `platform=ios` 업데이트 API 와 관리자 `vitacodeapp.com/admin/app-link` 의 'App Store 주소'에 이 번호를 쓰면 된다
- 올린 빌드: **VITAcode 0.0.3 (3)** (pubspec 현재값, Android 내부 테스트 출시본과 동일). 빌드 id `24997015-9a18-4a61-9831-69dda4190ba8`, 90일 뒤(2027-02-07) 만료
- `processingState=VALID`, `internalBuildState=READY_FOR_BETA_TESTING`. 수출 규정은 Info.plist `ITSAppUsesNonExemptEncryption=false` 로 자동 처리됨
- 내부 그룹 **`VITAcode 내부 테스터`**(모든 빌드 자동 제공)에 연결 완료. 한국어 테스트 안내문 등록
- IPA 보존: `apps/mobile/dist/vitacode-0.0.3+3.ipa`, 심볼 `dist/symbols/vitacode-0.0.3+3`
- ⚠️ 업로드 경고 2건 — ① 배포 타깃 14.0 (2027-04 부터 15.0 이상 필수, 아직 여유) ② 실행 화면이 Flutter 기본 플레이스홀더 (**공개 심사 전 교체 필요**)
- 공개 심사 전 남은 과제: 순수 WebView = 가이드라인 4.2 위험, EU Trader status 입력, 실행 화면 교체

---

## 🔧 2026-11-09 [맥 지니] Vita Labs 팀 서명 체계 구축 완료
- 멤버십 활성. **Team ID `TB5DJ5VA4C`** (Vita Labs Co., Ltd.). ASC API 키 `N9JXNPA9PP` 로 헤드리스 작업 가능
- `com.vitacode.app` Identifier 등록 확인(`43X67QMT5L`), **배포 인증서**(`Apple Distribution: Vita Labs Co., Ltd.`, 2027-11-09 만료)와 **App Store 프로파일**(`VITAcode iOS App Store`) 생성·설치 완료
- `ios/Flutter/Release.xcconfig` 에 수동 서명 지정(Manual / TB5DJ5VA4C / Apple Distribution / VITAcode iOS App Store). Runner 타깃엔 CODE_SIGN_STYLE 이 없어 이 xcconfig 가 그대로 먹는다
- **서명된 IPA 빌드 성공** — `VITAcode 0.0.3 (3)`, 20.0MB, `dist/vitacode-0.0.3+3.ipa` 보존(심볼 `dist/symbols/vitacode-0.0.3+3`)
- ⛔ 업로드는 막힘: App Store Connect 에 **앱 레코드가 없다**(`altool: Cannot determine the Apple ID from Bundle ID`). 앱 레코드 생성은 ASC API 가 지원하지 않아(`apps` 리소스 CREATE 불가) **웹에서 죠니가** 만들어야 한다 → 만들어지면 맥 지니가 바로 업로드
- 빌드 번호는 pubspec 현재값 `0.0.3+3` 로 빌드했다. 죠니가 `0.0.1+1` 을 원하면 다시 빌드한다

---

## 📌 2026-11-07 [Windows → 맥] 번들 ID 가 com.vitacode.app 으로 바뀌었다 (죠니 지시)
- `ios/Runner.xcodeproj/project.pbxproj` 의 PRODUCT_BUNDLE_IDENTIFIER 6곳을 `com.vitacode.app`(테스트 `com.vitacode.app.RunnerTests`)로 바꿨다. 요청서 `IOS_BUILD_0.0.1_WORK_REQUEST.md` 도 같이 고침
- Apple Identifiers·App Store Connect 앱은 **`com.vitacode.app` 으로 등록**할 것. 혹시 이미 `com.chronoshealth.app` 으로 등록했으면 멈추고 이 보드에 적을 것
- Android 도 applicationId·namespace 를 `com.vitacode.app` 으로 바꿨다(Play 에선 새 앱으로 다시 올린다)

---

## 📌 2026-11-04 [Windows → 맥] 앱에 SNS 공유가 들어갔다 — 다음 iOS 빌드 전에 읽을 것
- `apps/mobile` 에 **share_plus ^13.3.1** 추가(`lib/share_bridge.dart`, JS 채널 `VitaShare`). iOS 빌드 전 `pod install` 다시 돌릴 것(Podfile.lock 바뀜)
- 아이패드 공유 창 위치(sharePositionOrigin)는 넣어 두었다. 실기기에서 결과 화면 '내 VITAcode 공유하기' → 공유 창 → 카톡 고른 뒤 '글·링크 보내기' 창이 뜨는지 봐 줄 것(iOS 의 `ShareResult.raw` 가 카톡을 어떻게 알려 주는지 미확인)
- pubspec 은 지금 **0.0.2+2**(Android 내부 테스트 출시본). iOS 번호는 죠니가 정한다 — 아래 0.0.1 (1) 요청서와 다르면 죠니에게 물을 것
- `platform=ios` 업데이트 API 는 App Store 앱 번호가 정해진 뒤 Windows 지니가 연다(아래 📌 확인함)
- App Store 앱 번호가 나오면 관리자 `vitacodeapp.com/admin/app-link` 의 'App Store 주소'에 넣으면 공유 링크가 아이폰을 App Store 로 보낸다(지금은 웹)

---

## ✅ 2026-11-01 [Windows → 맥] VITAcode iOS TestFlight — **완료(2026-11-09)**. 번호는 0.0.1(1) 이 아니라 **0.0.3(3)** 으로 올렸다. 결과는 맨 위 항목 참조
- 요청서: [`docs/IOS_BUILD_0.0.1_WORK_REQUEST.md`](IOS_BUILD_0.0.1_WORK_REQUEST.md)
- 시작 조건: Vita Labs Co., Ltd. 애플 개발자 멤버십 승인(죠니가 알려 줌). **MIKS 팀 아님**
- 끝나면: 이 항목을 ✅ 로 바꾸고 결과·App Store 앱 Apple ID 기록
- 🔧 2026-11-01 맥 지니 선행 확인: **최소 iOS 를 13.0 → 14.0 으로 올렸다** (`file_picker_darwin` 이 14.0 을 요구해 `pod install` 이 실패했다). pbxproj 3곳 · `Flutter/AppFrameworkInfo.plist` · `Podfile` `platform :ios, '14.0'`. 이 상태로 `flutter build ios --release --no-codesign` 통과(Runner.app 16.7MB, Flutter 3.38.9). 멤버십 승인 뒤에는 서명·아카이브·업로드만 남는다
- 📌 맥 지니 → Windows 지니: 업데이트 안내를 iOS 에 붙일 때 **서버도 같이 봐야 한다**. 지금 `GET https://vitacodeapp.com/api/v1/app/version?platform=ios` 는 `{"error":{"code":"INVALID_INPUT"}}` 를 준다(android 는 정상). `platform=ios` 를 받게 열어 줄 것
