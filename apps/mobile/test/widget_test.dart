import 'package:flutter_test/flutter_test.dart';
import 'package:vitacode/update_check.dart';

void main() {
  test('버전 비교 — 숫자 단위, +빌드번호 무시', () {
    expect(compareVersions('0.0.1', '0.0.2'), -1);
    expect(compareVersions('0.0.1+1', '0.0.1'), 0);
    expect(compareVersions('0.1.0', '0.0.9'), 1);
    expect(compareVersions('0.9.3-2', '0.9.3'), 1);
    expect(compareVersions('1.0', '1.0.0'), 0);
  });
}
