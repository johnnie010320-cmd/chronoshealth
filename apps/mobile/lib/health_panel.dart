// 활동 요약 — 기기의 건강(HealthKit) 앱에서 읽은 걸음 수·활동 에너지·심박·수면을 앱이 직접 그린다.
// 읽기만 하고 기기 밖으로 보내지 않는다. 인터넷이 없어도 보인다. iOS 전용.
import 'dart:ui' as ui;

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

const _channel = MethodChannel('vitacode/health');

bool get healthSupported => defaultTargetPlatform == TargetPlatform.iOS;

class DayStat {
  const DayStat(this.date, this.steps, this.energyKcal, this.heartRate, this.sleepMinutes);
  final String date;
  final int? steps;
  final int? energyKcal;
  final int? heartRate;
  final int? sleepMinutes;

  static DayStat from(Map<Object?, Object?> m) => DayStat(
        m['date'] as String? ?? '',
        m['steps'] as int?,
        m['energyKcal'] as int?,
        m['heartRate'] as int?,
        m['sleepMinutes'] as int?,
      );
}

class HealthPanel extends StatefulWidget {
  const HealthPanel({super.key, required this.brand});
  final Color brand;

  @override
  State<HealthPanel> createState() => _HealthPanelState();
}

class _HealthPanelState extends State<HealthPanel> {
  final _t = _HealthStrings.of(ui.PlatformDispatcher.instance.locale);
  List<DayStat>? _days;
  bool _loading = false;
  bool _asked = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load(askIfNeeded: false);
  }

  Future<void> _load({bool askIfNeeded = true}) async {
    if (!healthSupported) return;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final ok = await _channel.invokeMethod<bool>('isAvailable') ?? false;
      if (!ok) throw PlatformException(code: 'unavailable', message: _t.unavailable);
      if (askIfNeeded) {
        _asked = true;
        await _channel.invokeMethod<bool>('requestAuthorization');
      }
      final res = await _channel.invokeMapMethod<String, Object?>('readSummary', {'days': 7});
      final raw = (res?['days'] as List?) ?? const [];
      final days = raw.whereType<Map<Object?, Object?>>().map(DayStat.from).toList();
      if (!mounted) return;
      setState(() => _days = days);
    } on PlatformException catch (e) {
      if (!mounted) return;
      setState(() => _error = e.message ?? e.code);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  /// 걸음·활동 에너지·수면을 각각 권장치에 견준 0~100 점. 의학적 평가가 아니다.
  int? _activityScore(List<DayStat> days) {
    final withSteps = days.where((d) => d.steps != null).toList();
    if (withSteps.isEmpty) return null;
    double pct(num v, num goal) => (v / goal).clamp(0.0, 1.0).toDouble();
    final avgSteps = withSteps.map((d) => d.steps!).reduce((a, b) => a + b) / withSteps.length;
    final energy = days.where((d) => d.energyKcal != null).map((d) => d.energyKcal!).toList();
    final sleep = days.where((d) => d.sleepMinutes != null).map((d) => d.sleepMinutes!).toList();
    var score = pct(avgSteps, 8000) * 55;
    var weight = 55.0;
    if (energy.isNotEmpty) {
      score += pct(energy.reduce((a, b) => a + b) / energy.length, 400) * 25;
      weight += 25;
    }
    if (sleep.isNotEmpty) {
      score += pct(sleep.reduce((a, b) => a + b) / sleep.length, 420) * 20;
      weight += 20;
    }
    return (score / weight * 100).round();
  }

  @override
  Widget build(BuildContext context) {
    final days = _days;
    return RefreshIndicator(
      onRefresh: () => _load(askIfNeeded: false),
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 20, 16, 32),
        children: [
          Text(_t.title, style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w700)),
          const SizedBox(height: 4),
          Text(_t.subtitle, style: const TextStyle(color: Colors.black54, height: 1.4)),
          const SizedBox(height: 20),
          if (_loading && days == null)
            const Padding(padding: EdgeInsets.symmetric(vertical: 48), child: Center(child: CircularProgressIndicator()))
          else if (_error != null)
            _Notice(icon: Icons.error_outline, text: _error!, action: _t.retry, onTap: () => _load())
          else if (days == null || days.every((d) => d.steps == null && d.sleepMinutes == null))
            _Notice(
              icon: Icons.favorite_outline,
              text: _asked ? _t.noDataAfterAsk : _t.connectBody,
              action: _asked ? _t.retry : _t.connect,
              onTap: () => _load(),
            )
          else
            ..._content(days),
          const SizedBox(height: 24),
          Text(_t.disclaimer, style: const TextStyle(fontSize: 12, color: Colors.black45, height: 1.5)),
        ],
      ),
    );
  }

  List<Widget> _content(List<DayStat> days) {
    final today = days.last;
    final score = _activityScore(days);
    return [
      if (score != null) ...[
        _ScoreCard(score: score, brand: widget.brand, label: _t.score, caption: _t.scoreCaption),
        const SizedBox(height: 16),
      ],
      Row(children: [
        Expanded(child: _Metric(icon: Icons.directions_walk, label: _t.steps, value: _fmt(today.steps), brand: widget.brand)),
        const SizedBox(width: 12),
        Expanded(child: _Metric(icon: Icons.local_fire_department_outlined, label: _t.energy, value: _fmt(today.energyKcal, unit: 'kcal'), brand: widget.brand)),
      ]),
      const SizedBox(height: 12),
      Row(children: [
        Expanded(child: _Metric(icon: Icons.monitor_heart_outlined, label: _t.heart, value: _fmt(today.heartRate, unit: 'bpm'), brand: widget.brand)),
        const SizedBox(width: 12),
        Expanded(child: _Metric(icon: Icons.bedtime_outlined, label: _t.sleep, value: _sleep(today.sleepMinutes), brand: widget.brand)),
      ]),
      const SizedBox(height: 24),
      Text(_t.week, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
      const SizedBox(height: 12),
      _StepChart(days: days, brand: widget.brand),
    ];
  }

  String _fmt(int? v, {String? unit}) {
    if (v == null) return '—';
    final s = v.toString().replaceAllMapped(RegExp(r'(\d)(?=(\d{3})+$)'), (m) => '${m[1]},');
    return unit == null ? s : '$s $unit';
  }

  String _sleep(int? minutes) {
    if (minutes == null || minutes == 0) return '—';
    return _t.hourMinute(minutes ~/ 60, minutes % 60);
  }
}

class _ScoreCard extends StatelessWidget {
  const _ScoreCard({required this.score, required this.brand, required this.label, required this.caption});
  final int score;
  final Color brand;
  final String label, caption;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(color: brand.withValues(alpha: 0.08), borderRadius: BorderRadius.circular(16)),
      child: Row(children: [
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(label, style: TextStyle(color: brand, fontWeight: FontWeight.w600)),
            const SizedBox(height: 6),
            Text(caption, style: const TextStyle(fontSize: 12, color: Colors.black54, height: 1.4)),
          ]),
        ),
        const SizedBox(width: 16),
        Text('$score', style: TextStyle(fontSize: 40, fontWeight: FontWeight.w700, color: brand, height: 1)),
      ]),
    );
  }
}

class _Metric extends StatelessWidget {
  const _Metric({required this.icon, required this.label, required this.value, required this.brand});
  final IconData icon;
  final String label, value;
  final Color brand;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        border: Border.all(color: Colors.black12),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Icon(icon, size: 20, color: brand),
        const SizedBox(height: 10),
        Text(label, style: const TextStyle(fontSize: 12, color: Colors.black54)),
        const SizedBox(height: 2),
        FittedBox(
          fit: BoxFit.scaleDown,
          alignment: AlignmentDirectional.centerStart,
          child: Text(value, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w700)),
        ),
      ]),
    );
  }
}

class _StepChart extends StatelessWidget {
  const _StepChart({required this.days, required this.brand});
  final List<DayStat> days;
  final Color brand;

  @override
  Widget build(BuildContext context) {
    final max = days.map((d) => d.steps ?? 0).fold<int>(1, (a, b) => a > b ? a : b);
    return SizedBox(
      height: 140,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          for (final d in days)
            Expanded(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 3),
                child: Column(mainAxisAlignment: MainAxisAlignment.end, children: [
                  Text(d.steps == null ? '' : '${((d.steps! / 1000)).toStringAsFixed(1)}k',
                      style: const TextStyle(fontSize: 10, color: Colors.black45)),
                  const SizedBox(height: 4),
                  Container(
                    height: (((d.steps ?? 0) / max) * 86).clamp(2.0, 86.0),
                    decoration: BoxDecoration(
                      color: d == days.last ? brand : brand.withValues(alpha: 0.35),
                      borderRadius: const BorderRadius.vertical(top: Radius.circular(4)),
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(d.date.length >= 10 ? d.date.substring(8) : '',
                      style: const TextStyle(fontSize: 11, color: Colors.black54)),
                ]),
              ),
            ),
        ],
      ),
    );
  }
}

class _Notice extends StatelessWidget {
  const _Notice({required this.icon, required this.text, required this.action, required this.onTap});
  final IconData icon;
  final String text, action;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 32),
      child: Column(children: [
        Icon(icon, size: 44, color: Colors.black26),
        const SizedBox(height: 16),
        Text(text, textAlign: TextAlign.center, style: const TextStyle(color: Colors.black54, height: 1.5)),
        const SizedBox(height: 20),
        FilledButton(onPressed: onTap, child: Text(action)),
      ]),
    );
  }
}

class _HealthStrings {
  const _HealthStrings(this.tab, this.title, this.subtitle, this.connect, this.connectBody, this.noDataAfterAsk,
      this.retry, this.steps, this.energy, this.heart, this.sleep, this.week, this.score, this.scoreCaption,
      this.unavailable, this.disclaimer, this._hm);
  final String tab, title, subtitle, connect, connectBody, noDataAfterAsk, retry;
  final String steps, energy, heart, sleep, week, score, scoreCaption, unavailable, disclaimer;
  final String _hm;

  String hourMinute(int h, int m) => _hm.replaceAll('{h}', '$h').replaceAll('{m}', '$m');

  static _HealthStrings of(ui.Locale l) => switch (l.languageCode) {
        'ko' => _ko,
        'ja' => _ja,
        'es' => _es,
        _ => _en,
      };

  static const _ko = _HealthStrings(
      '활동', '활동 요약', '기기의 건강 앱에서 읽은 최근 7일 기록입니다.', '건강 앱 연결',
      '걸음 수·활동 에너지·심박·수면을 읽어 활동 요약을 보여 드립니다. 읽은 값은 기기 안에서만 쓰입니다.',
      '건강 앱에서 읽을 기록이 없습니다. 건강 앱에서 VITAcode 의 읽기 권한이 켜져 있는지 확인해 주세요.',
      '다시 시도', '오늘 걸음', '활동 에너지', '평균 심박', '수면', '최근 7일 걸음 수', '활동 점수',
      '최근 7일의 걸음·활동 에너지·수면을 권장치에 견준 값입니다.',
      '이 기기에서는 건강 데이터를 쓸 수 없습니다.',
      '건강 앱에서 읽은 값이며 기기 안에서만 쓰입니다. 서버로 보내지 않습니다. 의학적 진단이 아니며, 건강에 이상이 느껴지면 의료 전문가와 상담하세요.',
      '{h}시간 {m}분');
  static const _en = _HealthStrings(
      'Activity', 'Activity summary', 'The last 7 days, read from the Health app on this device.', 'Connect Health',
      'We read your steps, active energy, heart rate and sleep to show an activity summary. The values stay on this device.',
      'No records to read. Check that VITAcode has read access turned on in the Health app.',
      'Try again', 'Steps today', 'Active energy', 'Avg heart rate', 'Sleep', 'Steps, last 7 days', 'Activity score',
      'Your last 7 days of steps, active energy and sleep compared with common targets.',
      'Health data is not available on this device.',
      'Read from the Health app and kept on this device. Nothing is sent to our servers. This is not a medical diagnosis — if something feels wrong, talk to a health professional.',
      '{h}h {m}m');
  static const _ja = _HealthStrings(
      'アクティビティ', 'アクティビティ概要', 'この端末のヘルスケアから読み取った直近7日間の記録です。', 'ヘルスケアと連携',
      '歩数・アクティブエネルギー・心拍数・睡眠を読み取って概要を表示します。読み取った値は端末内にとどまります。',
      '読み取れる記録がありません。ヘルスケアでVITAcodeの読み取りが許可されているかご確認ください。',
      '再試行', '今日の歩数', 'アクティブエネルギー', '平均心拍数', '睡眠', '直近7日間の歩数', 'アクティビティスコア',
      '直近7日間の歩数・アクティブエネルギー・睡眠を一般的な目安と比べた値です。',
      'この端末ではヘルスケアデータを利用できません。',
      'ヘルスケアから読み取り、端末内にのみ保持します。サーバーには送信しません。医学的な診断ではありません。体調に不安があるときは医療専門家にご相談ください。',
      '{h}時間{m}分');
  static const _es = _HealthStrings(
      'Actividad', 'Resumen de actividad', 'Los últimos 7 días, leídos desde la app Salud de este dispositivo.',
      'Conectar con Salud',
      'Leemos tus pasos, energía activa, frecuencia cardíaca y sueño para mostrar un resumen. Los valores permanecen en este dispositivo.',
      'No hay registros que leer. Comprueba que VITAcode tenga permiso de lectura en la app Salud.',
      'Reintentar', 'Pasos de hoy', 'Energía activa', 'Frec. cardíaca media', 'Sueño', 'Pasos, últimos 7 días',
      'Puntuación de actividad',
      'Tus últimos 7 días de pasos, energía activa y sueño comparados con objetivos habituales.',
      'Los datos de salud no están disponibles en este dispositivo.',
      'Leído desde la app Salud y conservado en este dispositivo. No se envía a nuestros servidores. No es un diagnóstico médico: si algo no va bien, consulta a un profesional sanitario.',
      '{h} h {m} min');
}

/// 하단 탭에 쓸 이름
String healthTabLabel(ui.Locale l) => _HealthStrings.of(l).tab;
