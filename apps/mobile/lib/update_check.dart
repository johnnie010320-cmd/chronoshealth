// 인앱 업데이트 안내 (전 앱 표준 2026-10-24) — 게이트웨이 GET /api/v1/app/version?platform=android
// 설치 < 최신 → 닫을 수 있는 배너, 설치 < 최소 지원 → 차단 창. 실패하면 조용히 넘어간다.
// iOS 는 아직 안내하지 않는다 — App Store 앱 번호가 정해진 뒤 게이트웨이 platform=ios 와 함께 붙인다.
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:package_info_plus/package_info_plus.dart';

const kPackageId = 'com.vitacode.app';
const _endpoint = 'https://vitacodeapp.com/api/v1/app/version?platform=android';

class UpdateInfo {
  const UpdateInfo({required this.forced});
  final bool forced;
}

Future<UpdateInfo?> checkForUpdate() async {
  if (defaultTargetPlatform != TargetPlatform.android) return null;
  try {
    final installed = (await PackageInfo.fromPlatform()).version;
    final res = await http.get(Uri.parse(_endpoint)).timeout(const Duration(seconds: 6));
    if (res.statusCode != 200) return null;
    final j = jsonDecode(res.body) as Map<String, dynamic>;
    final latest = j['latest'] as String?;
    final minimum = j['minSupported'] as String?;
    if (minimum != null && compareVersions(installed, minimum) < 0) return const UpdateInfo(forced: true);
    if (latest != null && compareVersions(installed, latest) < 0) return const UpdateInfo(forced: false);
    return null;
  } catch (_) {
    return null;
  }
}

// 숫자만 앞에서부터 비교한다. '+빌드번호' 는 뗀다. semver 라이브러리를 쓰지 않는 이유: '0.9.3-2' 를 0.9.3 보다 낮게 읽는다.
int compareVersions(String a, String b) {
  List<int> parts(String v) => v
      .split('+')
      .first
      .split(RegExp(r'[^0-9]+'))
      .where((s) => s.isNotEmpty)
      .map(int.parse)
      .toList();
  final x = parts(a), y = parts(b);
  for (var i = 0; i < (x.length > y.length ? x.length : y.length); i++) {
    final p = i < x.length ? x[i] : 0, q = i < y.length ? y[i] : 0;
    if (p != q) return p < q ? -1 : 1;
  }
  return 0;
}
