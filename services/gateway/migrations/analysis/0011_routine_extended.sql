-- Routine 카테고리 확장 — 스토리보드 p20.
-- 기존 routine_entries (calories/exercise/sleep/note) 에 컬럼 추가.
ALTER TABLE routine_entries ADD COLUMN weight_kg REAL;
ALTER TABLE routine_entries ADD COLUMN waist_cm REAL;
ALTER TABLE routine_entries ADD COLUMN blood_glucose_mg_dl REAL;
ALTER TABLE routine_entries ADD COLUMN blood_pressure_systolic INTEGER;
ALTER TABLE routine_entries ADD COLUMN blood_pressure_diastolic INTEGER;
ALTER TABLE routine_entries ADD COLUMN medication_taken INTEGER DEFAULT 0 CHECK (medication_taken IN (0,1));
ALTER TABLE routine_entries ADD COLUMN stress_level TEXT CHECK (stress_level IS NULL OR stress_level IN ('low','medium','high'));
