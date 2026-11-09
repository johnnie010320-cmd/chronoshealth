// 기기의 건강(HealthKit) 앱에서 걸음 수·활동 에너지·심박·수면을 읽어 Flutter 로 넘긴다.
// 읽기만 한다. 쓰지 않고, 밖으로 보내지도 않는다 (화면에 보여 주기만 한다).
import Foundation
import Flutter
import HealthKit

enum HealthBridge {
  static let channelName = "vitacode/health"
  private static let store = HKHealthStore()

  static func register(with registrar: FlutterPluginRegistrar) {
    let channel = FlutterMethodChannel(name: channelName, binaryMessenger: registrar.messenger())
    channel.setMethodCallHandler { call, result in
      switch call.method {
      case "isAvailable":
        result(HKHealthStore.isHealthDataAvailable())
      case "requestAuthorization":
        requestAuthorization(result)
      case "readSummary":
        let days = (call.arguments as? [String: Any])?["days"] as? Int ?? 7
        readSummary(days: max(1, min(days, 31)), result: result)
      default:
        result(FlutterMethodNotImplemented)
      }
    }
  }

  private static var readTypes: Set<HKObjectType> {
    var types = Set<HKObjectType>()
    if let t = HKQuantityType.quantityType(forIdentifier: .stepCount) { types.insert(t) }
    if let t = HKQuantityType.quantityType(forIdentifier: .activeEnergyBurned) { types.insert(t) }
    if let t = HKQuantityType.quantityType(forIdentifier: .heartRate) { types.insert(t) }
    if let t = HKCategoryType.categoryType(forIdentifier: .sleepAnalysis) { types.insert(t) }
    return types
  }

  private static func requestAuthorization(_ result: @escaping FlutterResult) {
    guard HKHealthStore.isHealthDataAvailable() else { result(false); return }
    store.requestAuthorization(toShare: [], read: readTypes) { granted, error in
      DispatchQueue.main.async {
        if let error = error {
          result(FlutterError(code: "auth_failed", message: error.localizedDescription, details: nil))
        } else {
          result(granted)
        }
      }
    }
  }

  /// 최근 `days` 일의 하루별 합계를 돌려준다.
  /// { "days": [ {"date":"2026-11-09","steps":8123,"energyKcal":412,"restingHeartRate":62,"sleepMinutes":430}, ... ] }
  private static func readSummary(days: Int, result: @escaping FlutterResult) {
    guard HKHealthStore.isHealthDataAvailable() else {
      result(FlutterError(code: "unavailable", message: "이 기기에서는 건강 데이터를 쓸 수 없습니다.", details: nil))
      return
    }
    let cal = Calendar.current
    let end = cal.startOfDay(for: Date()).addingTimeInterval(24 * 3600)
    guard let start = cal.date(byAdding: .day, value: -days, to: cal.startOfDay(for: Date())) else {
      result(FlutterError(code: "bad_range", message: "기간을 계산하지 못했습니다.", details: nil)); return
    }

    var buckets: [String: [String: Any]] = [:]
    let fmt = DateFormatter()
    fmt.dateFormat = "yyyy-MM-dd"
    fmt.calendar = cal
    fmt.timeZone = cal.timeZone
    for i in 0..<days {
      if let d = cal.date(byAdding: .day, value: -i, to: cal.startOfDay(for: Date())) {
        buckets[fmt.string(from: d)] = ["date": fmt.string(from: d)]
      }
    }

    let group = DispatchGroup()

    func collectSum(_ id: HKQuantityTypeIdentifier, unit: HKUnit, key: String) {
      guard let type = HKQuantityType.quantityType(forIdentifier: id) else { return }
      group.enter()
      let q = HKStatisticsCollectionQuery(
        quantityType: type,
        quantitySamplePredicate: HKQuery.predicateForSamples(withStart: start, end: end, options: .strictStartDate),
        options: .cumulativeSum,
        anchorDate: cal.startOfDay(for: start),
        intervalComponents: DateComponents(day: 1))
      q.initialResultsHandler = { _, stats, _ in
        stats?.enumerateStatistics(from: start, to: end) { s, _ in
          let key2 = fmt.string(from: s.startDate)
          if buckets[key2] != nil, let sum = s.sumQuantity() {
            buckets[key2]?[key] = Int(sum.doubleValue(for: unit).rounded())
          }
        }
        group.leave()
      }
      store.execute(q)
    }

    func collectAverage(_ id: HKQuantityTypeIdentifier, unit: HKUnit, key: String) {
      guard let type = HKQuantityType.quantityType(forIdentifier: id) else { return }
      group.enter()
      let q = HKStatisticsCollectionQuery(
        quantityType: type,
        quantitySamplePredicate: HKQuery.predicateForSamples(withStart: start, end: end, options: .strictStartDate),
        options: .discreteAverage,
        anchorDate: cal.startOfDay(for: start),
        intervalComponents: DateComponents(day: 1))
      q.initialResultsHandler = { _, stats, _ in
        stats?.enumerateStatistics(from: start, to: end) { s, _ in
          let key2 = fmt.string(from: s.startDate)
          if buckets[key2] != nil, let avg = s.averageQuantity() {
            buckets[key2]?[key] = Int(avg.doubleValue(for: unit).rounded())
          }
        }
        group.leave()
      }
      store.execute(q)
    }

    func collectSleep() {
      guard let type = HKCategoryType.categoryType(forIdentifier: .sleepAnalysis) else { return }
      group.enter()
      let q = HKSampleQuery(
        sampleType: type,
        predicate: HKQuery.predicateForSamples(withStart: start, end: end, options: []),
        limit: HKObjectQueryNoLimit,
        sortDescriptors: nil) { _, samples, _ in
          var asleep: [String: Double] = [:]
          for s in (samples as? [HKCategorySample]) ?? [] {
            guard isAsleep(s.value) else { continue }
            // 깨어난 날 기준으로 묶는다 (새벽 수면이 전날로 흩어지지 않게)
            let key2 = fmt.string(from: s.endDate)
            asleep[key2, default: 0] += s.endDate.timeIntervalSince(s.startDate)
          }
          for (k, secs) in asleep where buckets[k] != nil {
            buckets[k]?["sleepMinutes"] = Int((secs / 60).rounded())
          }
          group.leave()
        }
      store.execute(q)
    }

    collectSum(.stepCount, unit: .count(), key: "steps")
    collectSum(.activeEnergyBurned, unit: .kilocalorie(), key: "energyKcal")
    collectAverage(.heartRate, unit: HKUnit.count().unitDivided(by: .minute()), key: "heartRate")
    collectSleep()

    group.notify(queue: .main) {
      let ordered = buckets.values.sorted {
        ($0["date"] as? String ?? "") < ($1["date"] as? String ?? "")
      }
      result(["days": ordered])
    }
  }

  private static func isAsleep(_ value: Int) -> Bool {
    if #available(iOS 16.0, *) {
      return value == HKCategoryValueSleepAnalysis.asleepCore.rawValue
        || value == HKCategoryValueSleepAnalysis.asleepDeep.rawValue
        || value == HKCategoryValueSleepAnalysis.asleepREM.rawValue
        || value == HKCategoryValueSleepAnalysis.asleepUnspecified.rawValue
    }
    return value == HKCategoryValueSleepAnalysis.asleep.rawValue
  }
}
