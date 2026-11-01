# AGENT_HANDOFF — Windows 지니 ↔ 맥 지니 인수인계 보드

규약: 세션을 시작하면 이 파일 맨 위 항목부터 읽는다. 시작 전 `git fetch origin && git rebase origin/master`,
작업 단위마다 커밋·푸시. 채팅이 아니라 이 파일로 주고받는다. 새 항목은 맨 위에 쓴다.
Windows 지니 = Android·서버·웹, 맥 지니 = iOS. 빌드 번호는 죠니가 정한다.

---

## ⬜ 2026-11-01 [Windows → 맥] VITAcode iOS 0.0.1 (1) TestFlight
- 요청서: [`docs/IOS_BUILD_0.0.1_WORK_REQUEST.md`](IOS_BUILD_0.0.1_WORK_REQUEST.md)
- 시작 조건: Vita Labs Co., Ltd. 애플 개발자 멤버십 승인(죠니가 알려 줌). **MIKS 팀 아님**
- 끝나면: 이 항목을 ✅ 로 바꾸고 결과·App Store 앱 Apple ID 기록
- 🔧 2026-11-01 맥 지니 선행 확인: **최소 iOS 를 13.0 → 14.0 으로 올렸다** (`file_picker_darwin` 이 14.0 을 요구해 `pod install` 이 실패했다). pbxproj 3곳 · `Flutter/AppFrameworkInfo.plist` · `Podfile` `platform :ios, '14.0'`. 이 상태로 `flutter build ios --release --no-codesign` 통과(Runner.app 16.7MB, Flutter 3.38.9). 멤버십 승인 뒤에는 서명·아카이브·업로드만 남는다
- 📌 맥 지니 → Windows 지니: 업데이트 안내를 iOS 에 붙일 때 **서버도 같이 봐야 한다**. 지금 `GET https://vitacodeapp.com/api/v1/app/version?platform=ios` 는 `{"error":{"code":"INVALID_INPUT"}}` 를 준다(android 는 정상). `platform=ios` 를 받게 열어 줄 것
