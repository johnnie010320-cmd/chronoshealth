// 앱이 직접 그리는 문구 (웹 화면 문구는 웹이 4개 언어로 처리). 기기 언어 ko/en/ja/es, 그 밖은 en.
import 'dart:ui';

class AppStrings {
  const AppStrings._(this.updateAvailable, this.updateButton, this.updateRequiredTitle, this.updateRequiredBody,
      this.close, this.offlineTitle, this.offlineBody, this.retry, this.shareCopied, this.shareSendTextTitle,
      this._shareSendTextHelp, this.shareSendTextGo, this.shareMessengerGeneric);

  final String updateAvailable;
  final String updateButton;
  final String updateRequiredTitle;
  final String updateRequiredBody;
  final String close;
  final String offlineTitle;
  final String offlineBody;
  final String retry;
  final String shareCopied;
  final String shareSendTextTitle;
  final String _shareSendTextHelp;
  final String shareSendTextGo;
  /// 공유 창이 고른 앱을 알려 주지 않을 때 {app} 자리에 (2026-11-08)
  final String shareMessengerGeneric;

  String shareSendTextHelp(String app) => _shareSendTextHelp.replaceAll('{app}', app);

  static AppStrings of(Locale locale) => switch (locale.languageCode) {
        'ko' => _ko,
        'ja' => _ja,
        'es' => _es,
        _ => _en,
      };

  static const _ko = AppStrings._('새 버전이 나왔습니다.', '업데이트', '업데이트가 필요합니다',
      '이 버전은 더 이상 지원되지 않습니다. 스토어에서 최신 버전으로 업데이트해 주세요.', '닫기', '연결할 수 없습니다',
      '인터넷 연결을 확인한 뒤 다시 시도해 주세요.', '다시 시도',
      '글과 앱 링크를 복사했어요 — 글이 비어 있으면 붙여넣기 하세요.', '글과 VITAcode 링크도 보낼까요?',
      '{app}은(는) 그림과 함께 넘긴 글을 빼고 보내요. 아래 단추를 누른 뒤 같은 대화방을 한 번 더 고르면 글과 누를 수 있는 링크가 함께 가요.',
      '글·링크 보내기', '메신저');
  static const _en = AppStrings._('A new version is available.', 'Update', 'Update required',
      'This version is no longer supported. Please update to the latest version from the store.', 'Close',
      "Can't connect", 'Check your internet connection and try again.', 'Try again',
      'Text and app link copied — paste it if the post is empty.', 'Send the text and VITAcode link too?',
      '{app} drops the text sent with images. Tap the button below and pick the same chat again to send the text with a tappable link.',
      'Send text & link', 'Your messenger');
  static const _ja = AppStrings._('新しいバージョンがあります。', 'アップデート', 'アップデートが必要です',
      'このバージョンはサポートが終了しました。ストアから最新版にアップデートしてください。', '閉じる', '接続できません',
      'インターネット接続を確認してから、もう一度お試しください。', '再試行',
      '文章とアプリのリンクをコピーしました — 投稿が空なら貼り付けてください。', '文章とVITAcodeのリンクも送りますか？',
      '{app}は画像と一緒に渡した文章を送りません。下のボタンを押して同じトークをもう一度選ぶと、文章とタップできるリンクが届きます。',
      '文章・リンクを送る', 'メッセンジャー');
  static const _es = AppStrings._('Hay una nueva versión disponible.', 'Actualizar', 'Actualización necesaria',
      'Esta versión ya no es compatible. Actualiza a la versión más reciente desde la tienda.', 'Cerrar',
      'No se puede conectar', 'Comprueba tu conexión a internet e inténtalo de nuevo.', 'Reintentar',
      'Texto y enlace de la app copiados — pégalo si la publicación está vacía.', '¿Enviar también el texto y el enlace de VITAcode?',
      '{app} no envía el texto que acompaña a las imágenes. Pulsa el botón y elige el mismo chat otra vez para enviar el texto con un enlace.',
      'Enviar texto y enlace', 'Tu mensajero');
}
