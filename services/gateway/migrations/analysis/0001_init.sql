-- analysis DB Slice 05 init
-- spec: docs/spec/risk-survey/05-storage-consent.md
-- ADR: 0003 (PII 격리), 0008 (D1)
-- D1 인스턴스: chronoshealth-analysis (binding DB)
-- 절대 규칙: user_pseudonym_id만, PII (name/email/phone/birth_year/sex 제외 - sex/birth_year는 비식별 통계 변수로 spec 허용)

-- risk_survey_responses: 설문 원본 답변
-- 분석 / ML 학습용 보존. PII 0건. purpose_code = 'risk_estimate' 강제.
CREATE TABLE risk_survey_responses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_pseudonym_id TEXT NOT NULL,
  purpose_code TEXT NOT NULL CHECK (purpose_code = 'risk_estimate'),
  birth_year INTEGER NOT NULL,
  sex TEXT NOT NULL CHECK (sex IN ('male','female','other')),
  height_cm REAL NOT NULL,
  weight_kg REAL NOT NULL,
  smoking TEXT NOT NULL CHECK (smoking IN ('never','former','current')),
  alcohol_drinks_per_week INTEGER NOT NULL,
  exercise_minutes_per_week INTEGER NOT NULL,
  sleep_hours_per_night REAL NOT NULL,
  systolic_bp INTEGER,
  diastolic_bp INTEGER,
  fasting_glucose INTEGER,
  ldl_cholesterol INTEGER,
  hdl_cholesterol INTEGER,
  family_history_diabetes INTEGER NOT NULL CHECK (family_history_diabetes IN (0,1)),
  family_history_hypertension INTEGER NOT NULL CHECK (family_history_hypertension IN (0,1)),
  family_history_cardiovascular INTEGER NOT NULL CHECK (family_history_cardiovascular IN (0,1)),
  stress_level TEXT NOT NULL CHECK (stress_level IN ('low','medium','high')),
  self_rated_health TEXT NOT NULL CHECK (self_rated_health IN ('excellent','good','fair','poor')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_rsr_user ON risk_survey_responses(user_pseudonym_id);
CREATE INDEX idx_rsr_created ON risk_survey_responses(created_at);

-- risk_survey_reports: 산출된 리포트 (응답 JSON 직렬화 + 모델 버전)
-- model_version 회귀 추적 (spec 4.3), P3 ML 교체 시 활용.
CREATE TABLE risk_survey_reports (
  report_id TEXT PRIMARY KEY NOT NULL,
  response_id INTEGER NOT NULL,
  user_pseudonym_id TEXT NOT NULL,
  purpose_code TEXT NOT NULL CHECK (purpose_code = 'risk_estimate'),
  model_version TEXT NOT NULL,
  payload TEXT NOT NULL,
  generated_at TEXT NOT NULL,
  FOREIGN KEY (response_id) REFERENCES risk_survey_responses(id)
);

CREATE INDEX idx_rsrep_user ON risk_survey_reports(user_pseudonym_id);
CREATE INDEX idx_rsrep_model ON risk_survey_reports(model_version);
CREATE INDEX idx_rsrep_generated ON risk_survey_reports(generated_at);

-- consent_log: 분석 측 동의 변경 이력 (append-only)
-- identity-vault 측 consent_log(medical/terms)와 별도. purpose_code 단위 store/research 추적.
CREATE TABLE consent_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_pseudonym_id TEXT NOT NULL,
  purpose_code TEXT NOT NULL CHECK (purpose_code = 'risk_estimate'),
  consent_kind TEXT NOT NULL CHECK (consent_kind IN ('store','research')),
  granted INTEGER NOT NULL CHECK (granted IN (0,1)),
  source TEXT NOT NULL,
  recorded_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_cl_user ON consent_log(user_pseudonym_id);
CREATE INDEX idx_cl_kind ON consent_log(consent_kind);

CREATE TRIGGER consent_log_no_update
  BEFORE UPDATE ON consent_log
  BEGIN
    SELECT RAISE(ABORT, 'consent_log is append-only');
  END;

CREATE TRIGGER consent_log_no_delete
  BEFORE DELETE ON consent_log
  BEGIN
    SELECT RAISE(ABORT, 'consent_log is append-only');
  END;
