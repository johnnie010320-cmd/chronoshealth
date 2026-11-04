// 웹 화면의 'VITAcode 공유하기' → 휴대폰 공유 창 (2026-11-04 죠니 — FormCoach SNS 공유와 같은 방식).
// 웹이 window.VitaShare.postMessage(JSON{text, image(base64 png), name, hasLink}) 로 넘긴다.
//  1. 글은 클립보드에도 복사 — 인스타그램·페이스북은 넘긴 글을 채워 주지 않아 붙여넣기 해야 한다
//  2. 카톡·왓츠앱 등 메신저는 그림과 함께 넘긴 글을 버린다 → 돌아오면 '글·링크도 보내기'
//     (같은 대화방을 한 번 더 고르면 누를 수 있는 링크가 간다)
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:share_plus/share_plus.dart';

import 'strings.dart';

const kShareChannel = 'VitaShare';

/// 그림과 함께 넘긴 글을 버리는 메신저 — 공유 창이 알려 준 앱 이름(raw)으로 판정
/// 안드로이드 = 패키지(com.kakao.talk), iOS = 공유 확장(com.iwilab.KakaoTalk.Share …)
const _textDroppingApps = [
  'kakao.talk',
  'kakaotalk',
  'whatsapp',
  'naver.line',
  'telegram',
  'telegra.',
  'facebook.orca',
  'facebook.messenger',
];

bool dropsTextWithFiles(String? raw) {
  final r = (raw ?? '').toLowerCase();
  return r.isNotEmpty && _textDroppingApps.any(r.contains);
}

/// 공유 창이 알려 준 앱 이름을 사람이 읽는 이름으로 (안내 문구용)
String messengerName(String raw) {
  final r = raw.toLowerCase();
  if (r.contains('kakao')) return 'KakaoTalk';
  if (r.contains('whatsapp')) return 'WhatsApp';
  if (r.contains('line')) return 'LINE';
  if (r.contains('telegra')) return 'Telegram';
  if (r.contains('orca') || r.contains('messenger')) return 'Messenger';
  return raw;
}

Future<void> shareFromWeb(BuildContext context, String message, AppStrings s) async {
  final Map<String, dynamic> data;
  try {
    data = jsonDecode(message) as Map<String, dynamic>;
  } catch (_) {
    return;
  }
  final text = (data['text'] as String?) ?? '';
  final hasLink = data['hasLink'] == true;
  final name = (data['name'] as String?) ?? 'VITAcode.png';
  final b64 = data['image'] as String?;
  final messenger = ScaffoldMessenger.maybeOf(context);
  // 아이패드는 공유 창을 띄울 자리가 없으면 오류가 난다 → 화면 가운데
  final size = MediaQuery.sizeOf(context);
  final origin = Rect.fromCenter(center: Offset(size.width / 2, size.height / 2), width: 1, height: 1);

  if (hasLink && text.isNotEmpty) {
    try {
      await Clipboard.setData(ClipboardData(text: text));
      messenger?.showSnackBar(SnackBar(content: Text(s.shareCopied)));
    } catch (_) {}
  }
  if (b64 == null || b64.isEmpty) {
    await SharePlus.instance.share(ShareParams(text: text, subject: 'VITAcode', sharePositionOrigin: origin));
    return;
  }
  final file = XFile.fromData(base64Decode(b64), mimeType: 'image/png', name: name);
  final res = await SharePlus.instance.share(ShareParams(files: [file], text: text, subject: 'VITAcode', sharePositionOrigin: origin));
  if (!hasLink || res.status == ShareResultStatus.dismissed) return;
  if (!dropsTextWithFiles(res.raw) || !context.mounted) return;
  final go = await showDialog<bool>(
    context: context,
    builder: (c) => AlertDialog(
      title: Text(s.shareSendTextTitle),
      content: Text(s.shareSendTextHelp(messengerName(res.raw))),
      actions: [
        TextButton(onPressed: () => Navigator.of(c).pop(false), child: Text(s.close)),
        FilledButton(onPressed: () => Navigator.of(c).pop(true), child: Text(s.shareSendTextGo)),
      ],
    ),
  );
  if (go == true) await SharePlus.instance.share(ShareParams(text: text, subject: 'VITAcode', sharePositionOrigin: origin));
}
