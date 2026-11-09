// 웹이 알려 준 하단 탭을 네이티브 탭바로 올리기 위한 규약.
//
// 웹은 앱 안(User-Agent 에 VITAcodeApp)이라고 판단하면 자기 하단 탭을 숨기고,
// 대신 아래 모양으로 JS 채널 `VitaNav` 에 탭 목록을 보낸다. 그러면 앱이 네이티브 탭바를 그린다.
//
//   VitaNav.postMessage(JSON.stringify({
//     ready: true,
//     tabs: [ { key:'home', label:'홈', route:'/', icon:'home' }, ... ]   // 최대 4개
//   }));
//
// 화면이 바뀔 때마다 현재 탭을 알려 준다 (뒤로 가기·웹 내부 이동까지 탭 선택에 반영된다):
//
//   VitaNav.postMessage(JSON.stringify({ active: 'community' }));
//
// 앱이 탭을 누르면 웹의 window.VitaApp.navigate(key) 를 부른다. 그 함수가 없으면 route 로 이동한다.
//
// 웹이 아무것도 보내지 않으면(구버전 웹) 앱은 기존대로 홈·활동 두 탭만 쓴다.
import 'dart:convert';

import 'package:flutter/material.dart';

const kNavChannel = 'VitaNav';

/// 네이티브 탭바는 '활동'을 포함해 5개를 넘지 않는다 (iOS 탭바 권장 한도).
const kMaxWebTabs = 4;

class WebTab {
  const WebTab({required this.key, required this.label, required this.route, required this.icon});

  final String key;
  final String label;
  final String route;
  final IconData icon;

  static const _icons = <String, IconData>{
    'home': Icons.home_outlined,
    'twin': Icons.person_outline,
    'code': Icons.explore_outlined,
    'community': Icons.group_outlined,
    'care': Icons.favorite_border,
    'diary': Icons.calendar_today_outlined,
    'report': Icons.insert_chart_outlined,
    'profile': Icons.account_circle_outlined,
    'message': Icons.chat_bubble_outline,
  };

  static WebTab? parse(Object? raw) {
    if (raw is! Map) return null;
    final key = raw['key'];
    final label = raw['label'];
    if (key is! String || key.isEmpty || label is! String || label.isEmpty) return null;
    final route = raw['route'];
    return WebTab(
      key: key,
      label: label,
      route: route is String && route.isNotEmpty ? route : '/',
      icon: _icons[raw['icon']] ?? _icons[key] ?? Icons.circle_outlined,
    );
  }
}

/// 웹이 보낸 메시지. 둘 다 비어 있을 수 있다.
class NavMessage {
  const NavMessage(this.tabs, this.active);

  /// 탭 목록을 새로 받았을 때만 채워진다.
  final List<WebTab>? tabs;

  /// 지금 보고 있는 탭 키.
  final String? active;

  static NavMessage? parse(String raw) {
    Object? decoded;
    try {
      decoded = jsonDecode(raw);
    } catch (_) {
      return null;
    }
    if (decoded is! Map) return null;

    List<WebTab>? tabs;
    if (decoded['ready'] == true) {
      final list = decoded['tabs'];
      if (list is List) {
        tabs = list.map(WebTab.parse).whereType<WebTab>().take(kMaxWebTabs).toList();
        if (tabs.isEmpty) tabs = null;
      }
    }
    final active = decoded['active'];
    return NavMessage(tabs, active is String ? active : null);
  }
}
