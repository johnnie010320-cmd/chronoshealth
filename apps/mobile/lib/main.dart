// VITAcode Android 앱 — vitacodeapp.com 을 앱 화면 안(WebView)에서 연다.
// 앱이 따로 갖는 것: 뒤로 가기, 첨부 파일 고르기, 외부 앱 연결(전화·메일·카카오 등), 연결 끊김 화면, 업데이트 안내,
// SNS 공유(웹이 넘긴 결과 그림·글을 휴대폰 공유 창으로).
import 'dart:ui' as ui;

import 'package:file_picker/file_picker.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:webview_flutter_android/webview_flutter_android.dart';

import 'health_panel.dart';
import 'share_bridge.dart';
import 'strings.dart';
import 'update_check.dart';

const kHome = 'https://vitacodeapp.com/';

/// 앱 화면 안에서 열어야 하는 호스트 — 우리 서비스와 소셜 로그인 리다이렉트 경유지.
/// 여기 없는 웹 주소는 iOS 에서 기본 브라우저로 나간다.
const kInAppHosts = <String>{
  'vitacodeapp.com',
  'vitalabsinc.com',
  'appleid.apple.com',
  'accounts.google.com',
  'nid.naver.com',
  'kauth.kakao.com',
  'accounts.kakao.com',
  'kapi.kakao.com',
};

/// iOS 에서만 바깥 웹 주소를 브라우저로 보낸다.
bool get _restrictWeb => defaultTargetPlatform == TargetPlatform.iOS;

bool _isInAppHost(Uri u) {
  final h = u.host.toLowerCase();
  return kInAppHosts.any((d) => h == d || h.endsWith('.$d'));
}
const kBrand = Color(0xFF0F766E);

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const VitaApp());
}

class VitaApp extends StatelessWidget {
  const VitaApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'VITAcode',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(colorSchemeSeed: kBrand, useMaterial3: true),
      home: const WebShell(),
    );
  }
}

class WebShell extends StatefulWidget {
  const WebShell({super.key});

  @override
  State<WebShell> createState() => _WebShellState();
}

class _WebShellState extends State<WebShell> with WidgetsBindingObserver {
  late final WebViewController _web;
  final _s = AppStrings.of(ui.PlatformDispatcher.instance.locale);
  int _progress = 0;
  bool _failed = false;
  UpdateInfo? _update;
  bool _updateDismissed = false;
  int _tab = 0;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _web = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(Colors.white)
      ..setNavigationDelegate(NavigationDelegate(
        onProgress: (p) => setState(() => _progress = p),
        onPageStarted: (_) => setState(() => _failed = false),
        onWebResourceError: (e) {
          // 페이지 본문을 못 받았을 때만 연결 끊김 화면 (이미지 하나 실패는 무시)
          if (e.isForMainFrame ?? false) setState(() => _failed = true);
        },
        onNavigationRequest: _onNavigate,
      ))
      // 웹의 'VITAcode 공유하기' → 휴대폰 공유 창 (share_bridge.dart)
      ..addJavaScriptChannel(kShareChannel, onMessageReceived: (m) {
        if (mounted) shareFromWeb(context, m.message, _s);
      });
    final platform = _web.platform;
    if (platform is AndroidWebViewController) {
      platform.setOnShowFileSelector(_pickFiles);
      platform.setMediaPlaybackRequiresUserGesture(false);
    }
    _web.loadRequest(Uri.parse(kHome));
    _checkUpdate();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) _checkUpdate();
  }

  Future<void> _checkUpdate() async {
    final info = await checkForUpdate();
    if (!mounted || info == null) return;
    setState(() => _update = info);
    if (info.forced) _showForcedDialog();
  }

  // 우리 서비스 주소와 로그인 제공자 주소는 앱 안에서 (로그인 복귀가 같은 화면으로 돌아와야 하므로).
  // 그 밖의 웹 주소는 iOS 에서 기본 브라우저로 넘긴다 — App Store 연령등급의 '제한 없는 웹 접근'을
  // '아니요'로 둘 수 있어야 12+ 가 유지된다. Android 는 Play 기준이 달라 기존 동작 그대로 둔다.
  // 웹이 아닌 주소(tel:, mailto:, intent:, kakaotalk: 등)는 기기의 다른 앱으로 넘긴다.
  Future<NavigationDecision> _onNavigate(NavigationRequest req) async {
    final uri = Uri.tryParse(req.url);
    if (uri == null) return NavigationDecision.prevent;
    if (uri.scheme == 'about' || uri.scheme == 'data') return NavigationDecision.navigate;
    if (uri.scheme == 'http' || uri.scheme == 'https') {
      // 하위 프레임(결제창·임베드 등)은 막지 않는다. 주소창을 통째로 옮기는 이동만 본다.
      if (!_restrictWeb || !req.isMainFrame || _isInAppHost(uri)) {
        return NavigationDecision.navigate;
      }
      await _openExternal(uri);
      return NavigationDecision.prevent;
    }
    await _openExternal(uri);
    return NavigationDecision.prevent;
  }

  Future<void> _openExternal(Uri uri) async {
    if (uri.scheme == 'intent') {
      // intent://...#Intent;scheme=X;package=Y;S.browser_fallback_url=Z;end
      final raw = uri.toString();
      final fallback = RegExp(r'S\.browser_fallback_url=([^;]+)').firstMatch(raw)?.group(1);
      final scheme = RegExp(r';scheme=([^;]+)').firstMatch(raw)?.group(1);
      final pkg = RegExp(r';package=([^;]+)').firstMatch(raw)?.group(1);
      if (scheme != null) {
        final target = Uri.parse(raw.replaceFirst(RegExp(r'^intent:'), '$scheme:').split('#Intent').first);
        if (await launchUrl(target, mode: LaunchMode.externalApplication).catchError((_) => false)) return;
      }
      if (fallback != null) {
        await _web.loadRequest(Uri.parse(Uri.decodeComponent(fallback)));
        return;
      }
      if (pkg != null) {
        await launchUrl(Uri.parse('market://details?id=$pkg'), mode: LaunchMode.externalApplication)
            .catchError((_) => false);
      }
      return;
    }
    await launchUrl(uri, mode: LaunchMode.externalApplication).catchError((_) => false);
  }

  // 웹의 <input type="file"> → 기기 파일 고르기
  Future<List<String>> _pickFiles(FileSelectorParams params) async {
    final accept = params.acceptTypes.join(',').toLowerCase();
    final type = accept.contains('image') && !accept.contains('pdf')
        ? FileType.image
        : (accept.contains('video') && !accept.contains('image') ? FileType.video : FileType.any);
    try {
      final f = await FilePicker.pickFile(type: type);
      final path = f?.path;
      return path == null ? <String>[] : [Uri.file(path).toString()];
    } catch (_) {
      return <String>[];
    }
  }

  Future<void> _onBack() async {
    if (await _web.canGoBack()) {
      await _web.goBack();
    } else {
      await SystemNavigator.pop();
    }
  }

  Future<void> _openStore() async {
    final market = Uri.parse('market://details?id=$kPackageId');
    final ok = await launchUrl(market, mode: LaunchMode.externalApplication).catchError((_) => false);
    if (!ok) {
      await launchUrl(Uri.parse('https://play.google.com/store/apps/details?id=$kPackageId'),
          mode: LaunchMode.externalApplication);
    }
  }

  void _showForcedDialog() {
    showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => PopScope(
        canPop: false,
        child: AlertDialog(
          title: Text(_s.updateRequiredTitle),
          content: Text(_s.updateRequiredBody),
          actions: [FilledButton(onPressed: _openStore, child: Text(_s.updateButton))],
        ),
      ),
    );
  }

  // iOS 하단 탭에서 웹 화면이 아닌 곳에 있으면 먼저 웹 화면으로 돌아온다.
  void _handleBack() {
    if (_tab != 0) {
      setState(() => _tab = 0);
    } else {
      _onBack();
    }
  }

  @override
  Widget build(BuildContext context) {
    final showBanner = _update != null && !_update!.forced && !_updateDismissed;
    final web = SafeArea(
          child: Column(
            children: [
              if (showBanner)
                Material(
                  color: const Color(0xFFE6F4F1),
                  child: Padding(
                    padding: const EdgeInsetsDirectional.fromSTEB(16, 8, 4, 8),
                    child: Row(
                      children: [
                        Expanded(child: Text(_s.updateAvailable, style: const TextStyle(fontSize: 14))),
                        TextButton(onPressed: _openStore, child: Text(_s.updateButton)),
                        IconButton(
                          tooltip: _s.close,
                          icon: const Icon(Icons.close, size: 20),
                          onPressed: () => setState(() => _updateDismissed = true),
                        ),
                      ],
                    ),
                  ),
                ),
              if (_progress < 100 && !_failed)
                LinearProgressIndicator(value: _progress / 100, minHeight: 2, color: kBrand),
              Expanded(
                child: _failed
                    ? _OfflineView(s: _s, onRetry: () => _web.reload())
                    : WebViewWidget(controller: _web),
              ),
            ],
          ),
        );

    if (!healthSupported) {
      return PopScope(
        canPop: false,
        onPopInvokedWithResult: (didPop, _) {
          if (!didPop) _onBack();
        },
        child: Scaffold(backgroundColor: Colors.white, body: web),
      );
    }

    final locale = ui.PlatformDispatcher.instance.locale;
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) _handleBack();
      },
      child: Scaffold(
        backgroundColor: Colors.white,
        body: IndexedStack(
          index: _tab,
          children: [web, SafeArea(child: HealthPanel(brand: kBrand))],
        ),
        bottomNavigationBar: NavigationBar(
          selectedIndex: _tab,
          onDestinationSelected: (i) => setState(() => _tab = i),
          destinations: [
            NavigationDestination(
              icon: const Icon(Icons.home_outlined),
              selectedIcon: const Icon(Icons.home),
              label: _homeTabLabel(locale),
            ),
            NavigationDestination(
              icon: const Icon(Icons.favorite_outline),
              selectedIcon: const Icon(Icons.favorite),
              label: healthTabLabel(locale),
            ),
          ],
        ),
      ),
    );
  }
}

String _homeTabLabel(ui.Locale l) => switch (l.languageCode) {
      'ko' => '홈',
      'ja' => 'ホーム',
      'es' => 'Inicio',
      _ => 'Home',
    };

class _OfflineView extends StatelessWidget {
  const _OfflineView({required this.s, required this.onRetry});
  final AppStrings s;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.wifi_off_rounded, size: 48, color: Colors.black45),
            const SizedBox(height: 16),
            Text(s.offlineTitle, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600), textAlign: TextAlign.center),
            const SizedBox(height: 8),
            Text(s.offlineBody, textAlign: TextAlign.center, style: const TextStyle(color: Colors.black54)),
            const SizedBox(height: 20),
            FilledButton(onPressed: onRetry, child: Text(s.retry)),
          ],
        ),
      ),
    );
  }
}
