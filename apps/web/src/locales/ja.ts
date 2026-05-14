import type { Dictionary } from './ko';

export const ja: Dictionary = {
  meta: {
    title: 'Chronos Health — ベータ',
    description:
      '健康データから始める予防医学。生体年齢と5年以内のリスク推定レポートを即時に発行。',
  },
  brand: 'Chronos Health',
  beta: 'BETA',
  language: {
    label: '言語',
    ko: '한국어',
    en: 'English',
    ja: '日本語',
    es: 'Español',
  },
  common: {
    back: '戻る',
    cancel: 'キャンセル',
    retry: '再試行',
  },
  landing: {
    eyebrow: 'Preventive medicine · 2026',
    headingLine1: '長く生きるための',
    headingLine2: '今日の習慣',
    body: '過去の健康情報と生活データから、生体年齢と5年リスクを推定します。',
    howItWorks: '仕組み',
    step1Title: '23問のアンケート',
    step1Body: '生活習慣・身体測定値・家族歴。2〜3分。',
    step2Title: 'モックレポートを即時発行',
    step2Body: '生体年齢 + 5年主要リスク + 改善行動。',
    step3Title: 'データは自分で管理',
    step3Body: '保存・匿名活用は任意。いつでも撤回可能。',
    disclaimer:
      '本サービスは医療行為を代替するものではなく、健康増進の参考用です。満19歳以上のみご利用いただけます。',
    cta: 'アンケート開始',
  },
  survey: {
    pageTitle: 'ベータ アンケート',
    heroTitle: '今日の健康を入力してください',
    heroBody:
      '23問 · 2〜3分 · 同意なしに回答が保存されることはありません。',
    section: {
      step: 'STEP',
      demographics: '基本情報',
      lifestyle: '生活習慣',
      vitals: '身体測定値',
      vitalsHint: '不明なら空欄でOK。推定精度は若干下がります。',
      familyHistory: '家族歴',
      perception: '自己認識',
      consent: 'データ同意（任意）',
    },
    submit: 'モックレポートを受け取る',
    submitting: '計算中…',
    bottomDisclaimer:
      '本レポートは医療行為を代替するものではなく、健康増進の参考用です。',
    fields: {
      birthYear: { label: '生年', placeholder: '例: 1990' },
      sex: {
        label: '性別',
        options: { male: '男性', female: '女性', other: 'その他' },
      },
      heightCm: { label: '身長 (cm)', placeholder: '例: 175' },
      weightKg: { label: '体重 (kg)', placeholder: '例: 70' },
      smoking: {
        label: '喫煙',
        options: {
          never: '非喫煙',
          former: '過去喫煙',
          current: '現在喫煙',
        },
      },
      alcoholDrinksPerWeek: { label: '週あたりの飲酒杯数' },
      exerciseMinutesPerWeek: { label: '週あたりの運動時間 (分)' },
      sleepHoursPerNight: { label: '1日の睡眠時間 (時間)' },
      systolicBp: { label: '収縮期血圧', placeholder: '例: 120' },
      diastolicBp: { label: '拡張期血圧', placeholder: '例: 80' },
      fastingGlucose: { label: '空腹時血糖', placeholder: '例: 95' },
      ldlCholesterol: { label: 'LDLコレステロール', placeholder: '例: 110' },
      hdlCholesterol: { label: 'HDLコレステロール', placeholder: '例: 50' },
      familyHistoryDiabetes: { label: '糖尿病の家族歴' },
      familyHistoryHypertension: { label: '高血圧の家族歴' },
      familyHistoryCardiovascular: { label: '心血管疾患の家族歴' },
      stressLevel: {
        label: 'ストレスレベル',
        options: { low: '低', medium: '中', high: '高' },
      },
      selfRatedHealth: {
        label: '自己評価健康',
        options: {
          excellent: '非常に良い',
          good: '良い',
          fair: '普通',
          poor: '悪い',
        },
      },
      consentToStore: { label: '回答の保存に同意します' },
      consentToResearch: {
        label: '匿名化データの研究利用に同意します',
      },
    },
    error: {
      validation: '入力値の確認が必要',
      UNAUTHORIZED: '認証が必要です（ベータトークン不足）。',
      AGE_RESTRICTED: '満19歳未満は利用できません。',
      RATE_LIMITED: '1日のリクエスト上限（5回）を超過しました。',
      INVALID_INPUT: '入力値を再確認してください。',
      INVALID_JSON: 'リクエスト形式が正しくありません。',
      generic: 'サーバーエラー',
    },
  },
  result: {
    pageTitle: 'マイレポート',
    bioAgeEyebrow: '生体年齢の推定',
    bioAgeUnit: '歳',
    bioAgeDiffPrefix: '実年齢',
    bioAgeDiffSuffix: '歳と比較',
    bioAgeYearSuffix: '年',
    bioAgeCi: '95% 信頼区間',
    contributorsTitle: '主要な寄与要因',
    diseaseRiskTitle: '5年主要リスク',
    diseaseRiskEmpty: '表示するリスクがありません。',
    diseaseRiskCategory: {
      low: '低',
      moderate: '中',
      high: '高',
    },
    diseaseRisk5yLabel: '5年',
    improvementTitle: '改善行動の提案',
    improvementEmpty:
      '現段階はモック値です。実モデル導入後に個人最適化された提案が表示されます。',
    improvementConfidence: '信頼度',
    improvementBioAgeUnit: '生体年齢',
    improvementFactorPrefix: '改善可能',
    modelLabel: 'モデル',
    reportIdLabel: 'ID',
    resetCta: 'アンケートをやり直す',
    hotlines: {
      title: '支援を受けられます — すぐにご連絡を',
      suicide: '自殺予防相談',
      mentalHealth: '精神保健危機相談',
    },
  },
  nav: {
    home: 'ホーム',
    survey: 'アンケート',
    reports: 'レポート',
    stats: '統計',
    profile: 'マイページ',
  },
  userMenu: {
    open: 'メニューを開く',
    login: 'ログイン',
    loginUnavailable: 'ログインは本人認証導入後に提供されます',
    signup: '会員登録',
    profile: 'マイページ',
    logout: 'ログアウト',
  },
  comingSoon: {
    title: '準備中',
    body: 'この画面は後続段階で追加されます。ベータではホームとアンケートのみ動作します。',
    backHome: 'ホームに戻る',
  },
  profile: {
    pageTitle: 'マイページ',
    sectionAccount: 'アカウント',
    sectionPrivacy: 'プライバシー / 同意',
    pseudonymLabel: '匿名ID',
    expiresAtLabel: 'セッション有効期限',
    note: '氏名・電話番号・メールは隔離された identity-vault に保存され、本画面には表示されません (ADR 0003)。',
    consentMedical: '健康データ処理への同意',
    consentTerms: '利用規約への同意',
    consentResearch: '匿名研究利用への同意（任意）',
    consentGrantedAt: '同意日',
    logout: 'ログアウト',
    logoutConfirm:
      'ログアウトするとこの端末のセッションが削除されます。再ログインは本人認証導入後に提供されます。',
  },
  signup: {
    pageTitle: '会員登録',
    heroTitle: 'はじめる前にご登録ください',
    heroBody:
      '氏名・電話番号・メールは本サービスの隔離保管庫に保存され、外部に共有されることはありません。',
    section: {
      identity: 'ご本人の情報',
      consent: '同意',
    },
    fields: {
      name: { label: '氏名', placeholder: '山田 太郎' },
      email: { label: 'メール', placeholder: 'you@example.com' },
      phone: { label: '電話番号', placeholder: '+81-90-1234-5678' },
      birthYear: { label: '生年', placeholder: '例: 1990' },
      sex: {
        label: '性別',
        options: { male: '男性', female: '女性', other: 'その他' },
      },
    },
    consent: {
      medical: {
        label: '健康データ処理への同意（必須）',
        description:
          'アンケート・測定値・家族歴を健康リスク推定の目的で処理することに同意します。',
      },
      terms: {
        label: '利用規約・プライバシーポリシーへの同意（必須）',
        description:
          '利用規約およびプライバシーポリシーに同意します。',
      },
    },
    submit: '登録してアンケート開始',
    submitting: '登録中…',
    bottomNote:
      '本人認証・パスワードログインは後続段階で追加されます。現段階は非公開ベータです。',
    error: {
      validation: '入力値の確認が必要',
      AGE_RESTRICTED: '満19歳未満は登録できません。',
      CONSENT_REQUIRED: '健康データ処理および利用規約への同意が必要です。',
      IDENTITY_EXISTS:
        'すでに登録されている情報です。マルチデバイスログインは本人認証導入後に提供されます。',
      RATE_LIMITED: '1日の登録試行上限（10回）を超過しました。',
      INVALID_INPUT: '入力値を再確認してください。',
      INVALID_JSON: 'リクエスト形式が正しくありません。',
      generic: 'サーバーエラー',
    },
  },
};
