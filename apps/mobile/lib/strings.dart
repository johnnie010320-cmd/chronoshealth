// 앱이 직접 그리는 문구 (웹 화면 문구는 웹이 4개 언어로 처리). 기기 언어 ko/en/ja/es, 그 밖은 en.
import 'dart:ui';

class AppStrings {
  const AppStrings._(this.updateAvailable, this.updateButton, this.updateRequiredTitle, this.updateRequiredBody,
      this.close, this.offlineTitle, this.offlineBody, this.retry);

  final String updateAvailable;
  final String updateButton;
  final String updateRequiredTitle;
  final String updateRequiredBody;
  final String close;
  final String offlineTitle;
  final String offlineBody;
  final String retry;

  static AppStrings of(Locale locale) => switch (locale.languageCode) {
        'ko' => _ko,
        'ja' => _ja,
        'es' => _es,
        _ => _en,
      };

  static const _ko = AppStrings._('새 버전이 나왔습니다.', '업데이트', '업데이트가 필요합니다',
      '이 버전은 더 이상 지원되지 않습니다. 스토어에서 최신 버전으로 업데이트해 주세요.', '닫기', '연결할 수 없습니다',
      '인터넷 연결을 확인한 뒤 다시 시도해 주세요.', '다시 시도');
  static const _en = AppStrings._('A new version is available.', 'Update', 'Update required',
      'This version is no longer supported. Please update to the latest version from the store.', 'Close',
      "Can't connect", 'Check your internet connection and try again.', 'Try again');
  static const _ja = AppStrings._('新しいバージョンがあります。', 'アップデート', 'アップデートが必要です',
      'このバージョンはサポートが終了しました。ストアから最新版にアップデートしてください。', '閉じる', '接続できません',
      'インターネット接続を確認してから、もう一度お試しください。', '再試行');
  static const _es = AppStrings._('Hay una nueva versión disponible.', 'Actualizar', 'Actualización necesaria',
      'Esta versión ya no es compatible. Actualiza a la versión más reciente desde la tienda.', 'Cerrar',
      'No se puede conectar', 'Comprueba tu conexión a internet e inténtalo de nuevo.', 'Reintentar');
}
