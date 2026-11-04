# AGENT_HANDOFF — Windows 지니 ↔ 맥 지니 인수인계 보드

규약: 세션을 시작하면 이 파일 맨 위 항목부터 읽는다. 시작 전 `git fetch origin && git rebase origin/master`,
작업 단위마다 커밋·푸시. 채팅이 아니라 이 파일로 주고받는다. 새 항목은 맨 위에 쓴다.
Windows 지니 = Android·서버·웹, 맥 지니 = iOS. 빌드 번호는 죠니가 정한다.

---

## 📌 2026-11-04 [Windows → 맥] 앱에 SNS 공유가 들어갔다 — 다음 iOS 빌드 전에 읽을 것
- `apps/mobile` 에 **share_plus ^13.3.1** 추가(`lib/share_bridge.dart`, JS 채널 `VitaShare`). iOS 빌드 전 `pod install` 다시 돌릴 것(Podfile.lock 바뀜)
- 아이패드 공유 창 위치(sharePositionOrigin)는 넣어 두었다. 실기기에서 결과 화면 '내 VITAcode 공유하기' → 공유 창 → 카톡 고른 뒤 '글·링크 보내기' 창이 뜨는지 봐 줄 것(iOS 의 `ShareResult.raw` 가 카톡을 어떻게 알려 주는지 미확인)
- pubspec 은 지금 **0.0.2+2**(Android 내부 테스트 출시본). iOS 번호는 죠니가 정한다 — 아래 0.0.1 (1) 요청서와 다르면 죠니에게 물을 것
- `platform=ios` 업데이트 API 는 App Store 앱 번호가 정해진 뒤 Windows 지니가 연다(아래 📌 확인함)
- App Store 앱 번호가 나오면 관리자 `vitacodeapp.com/admin/app-link` 의 'App Store 주소'에 넣으면 공유 링크가 아이폰을 App Store 로 보낸다(지금은 웹)

---

## ⬜ 2026-11-01 [Windows → 맥] VITAcode iOS 0.0.1 (1) TestFlight
- 요청서: [`docs/IOS_BUILD_0.0.1_WORK_REQUEST.md`](IOS_BUILD_0.0.1_WORK_REQUEST.md)
- 시작 조건: Vita Labs Co., Ltd. 애플 개발자 멤버십 승인(죠니가 알려 줌). **MIKS 팀 아님**
- 끝나면: 이 항목을 ✅ 로 바꾸고 결과·App Store 앱 Apple ID 기록
- 🔧 2026-11-01 맥 지니 선행 확인: **최소 iOS 를 13.0 → 14.0 으로 올렸다** (`file_picker_darwin` 이 14.0 을 요구해 `pod install` 이 실패했다). pbxproj 3곳 · `Flutter/AppFrameworkInfo.plist` · `Podfile` `platform :ios, '14.0'`. 이 상태로 `flutter build ios --release --no-codesign` 통과(Runner.app 16.7MB, Flutter 3.38.9). 멤버십 승인 뒤에는 서명·아카이브·업로드만 남는다
- 📌 맥 지니 → Windows 지니: 업데이트 안내를 iOS 에 붙일 때 **서버도 같이 봐야 한다**. 지금 `GET https://vitacodeapp.com/api/v1/app/version?platform=ios` 는 `{"error":{"code":"INVALID_INPUT"}}` 를 준다(android 는 정상). `platform=ios` 를 받게 열어 줄 것
