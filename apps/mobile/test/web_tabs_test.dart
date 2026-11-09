import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:vitacode/web_tabs.dart';

void main() {
  test('탭 목록을 받는다', () {
    final m = NavMessage.parse(
        '{"ready":true,"tabs":[{"key":"home","label":"홈","route":"/","icon":"home"},'
        '{"key":"twin","label":"디지털 트윈","route":"/twin/"},'
        '{"key":"community","label":"커뮤니티","route":"/community/"}]}')!;
    expect(m.tabs!.length, 3);
    expect(m.tabs![0].key, 'home');
    expect(m.tabs![1].label, '디지털 트윈');
    expect(m.tabs![1].route, '/twin/');
    expect(m.tabs![1].icon, isNot(Icons.circle_outlined)); // key 로 아이콘 추론
  });

  test('4개를 넘으면 잘라낸다 (활동 포함 5개 한도)', () {
    final tabs = List.generate(6, (i) => '{"key":"k$i","label":"L$i","route":"/$i"}').join(',');
    final m = NavMessage.parse('{"ready":true,"tabs":[$tabs]}')!;
    expect(m.tabs!.length, kMaxWebTabs);
  });

  test('현재 탭만 알려 줄 수 있다', () {
    final m = NavMessage.parse('{"active":"community"}')!;
    expect(m.tabs, isNull);
    expect(m.active, 'community');
  });

  test('망가진 입력은 무시한다', () {
    expect(NavMessage.parse('그냥 글자'), isNull);
    expect(NavMessage.parse('[]'), isNull);
    expect(NavMessage.parse('{"ready":true,"tabs":[{"label":"키 없음"}]}')!.tabs, isNull);
    expect(NavMessage.parse('{"ready":true,"tabs":"목록 아님"}')!.tabs, isNull);
  });

  test('ready 가 아니면 탭을 바꾸지 않는다', () {
    final m = NavMessage.parse('{"tabs":[{"key":"home","label":"홈","route":"/"}]}')!;
    expect(m.tabs, isNull);
  });
}
