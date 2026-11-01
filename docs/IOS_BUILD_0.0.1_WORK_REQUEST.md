# iOS 작업요청서 — VITAcode 0.0.1 (1) TestFlight

- 요청: Windows 지니 → 맥 지니 · 2026-11-01
- 상태: ⬜ 대기 — **Vita Labs 애플 개발자 멤버십 승인 뒤 시작** (죠니가 승인 소식을 알려 줌)

## 무엇을
`apps/mobile`(Flutter, vitacodeapp.com 을 여는 WebView 앱)을 iOS 로 빌드해 TestFlight 내부 테스트에 올린다.
Android 는 0.0.1+1 이 Play 내부 테스트에 올라가 있다(2026-10-31).

## 🚨 계정이 MIKS 가 아니다
- 애플 개발자 팀 = **Vita Labs Co., Ltd.** (2026-11 새로 가입, D-U-N-S 696662490). MIKS&T INC 팀에 만들지 말 것.
- Xcode 서명·App Store Connect 모두 Vita Labs 팀을 고른다. 판매자 이름이 Vita Labs Co., Ltd. 로 보여야 한다.

## 값
| 항목 | 값 |
|---|---|
| 저장소 | `johnnie010320-cmd/chronoshealth` (master) — 앱은 `apps/mobile/` |
| 번들 ID | `com.chronoshealth.app` (pbxproj 에 설정됨, Android 와 같음) |
| 앱 이름 | `VITAcode` |
| 버전 | `0.0.1` 빌드 `1` (pubspec `0.0.1+1`, 죠니 지정 번호 — 바꾸지 말 것) |
| Flutter | **3.38.9** (Android 와 같은 버전. 3.44.4 로 빌드하지 말 것 — 소나기에서 화면 충돌 전례) |
| 최소 iOS | Flutter 기본값 |
| App Store Connect 앱 | 이름 VITAcode · 기본 언어 한국어 · 번들 com.chronoshealth.app · SKU `vitacode-ios` |

## 순서
1. `git clone https://github.com/johnnie010320-cmd/chronoshealth.git` (처음 한 번) → `git pull --rebase`
2. developer.apple.com → Identifiers 에서 `com.chronoshealth.app` 등록. **"not available" 이면 멈추고** 보드에 적는다(대체 후보 `com.vitalabs.vitacode` — 죠니 확인 뒤 바꾼다)
3. App Store Connect 에 앱 레코드 생성(위 표)
4. `cd apps/mobile && flutter pub get && cd ios && pod install`
5. Xcode 에서 Runner → Signing → Team = Vita Labs Co., Ltd., 자동 서명
6. `flutter build ipa --release --obfuscate --split-debug-info=dist/symbols/vitacode-0.0.1+1`
   → 결과 IPA 를 `dist/vitacode-0.0.1+1.ipa` 로 **복사해 보존**(덮어쓰기 금지, 심볼 폴더 지우지 말 것. `dist/` 는 gitignore)
7. Transporter 로 업로드 → TestFlight 처리 완료 확인 → 내부 테스터에 johnnie010320@gmail.com 추가
8. `docs/AGENT_HANDOFF.md` 맨 위 항목을 ✅ 로 바꾸고 결과(업로드 시각·빌드 상태·막힌 것)를 적어 커밋·푸시

## 알아 둘 것
- 앱 코드는 플랫폼 공통. `AndroidWebViewController` 부분은 `is` 검사로 iOS 에서 건너뛴다. iOS 의 파일 첨부는 WKWebView 기본 동작.
- 업데이트 안내(`lib/update_check.dart`)는 iOS 에서 꺼 두었다 — App Store 앱 번호가 정해지면 Windows 지니가 붙인다. **App Store 앱 Apple ID(숫자)를 보드에 적어 줄 것.**
- Info.plist 에 카메라·마이크·사진 용도 문구, `ITSAppUsesNonExemptEncryption=false` 를 넣어 두었다.
  업로드가 90683(용도 문구 없음)으로 거부되면 메일에 적힌 키만 추가하고 보드에 기록.
- 소셜 로그인은 웹 화면 안에서 한다(애플 로그인 포함, vitacodeapp.com 라이브). Google 로그인은 WebView 에서 막히는 것이 알려진 한계.
- 공개 심사 전 과제(이번 아님): 순수 WebView 앱은 가이드라인 4.2 반려 위험 → 심사 제출 때 따로 다룬다.
