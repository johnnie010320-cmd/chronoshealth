-- 0037 — 케어 제휴 카드를 코드 상수(SEED) 에서 D1 로 이관.
-- src/care/affiliates.ts 의 "Future: read from analysisDb.care_affiliates" 해소.
--
-- 목적: 실제 제휴처 URL 이 확보될 때마다 코드 배포 없이 관리자 화면에서 입력 → 즉시 반영.
-- coming_soon = 1 이면 UI 가 "준비중" 토스트로 처리하고 링크를 열지 않는다.
-- cta_url 이 자기 도메인 자리표시자면 coming_soon 값과 무관하게 게이트웨이가 준비중으로 강제한다.
--
-- PII 없음 (제휴 카탈로그). ADR 0008 (D1).

CREATE TABLE IF NOT EXISTS care_affiliates (
  slug         TEXT PRIMARY KEY,
  category     TEXT NOT NULL,              -- 'diet' | 'exercise' | 'medical'
  partner      TEXT NOT NULL,
  cta_url      TEXT NOT NULL,
  coming_soon  INTEGER NOT NULL DEFAULT 1, -- 1 = 미연동(준비중)
  sort_order   INTEGER NOT NULL DEFAULT 0,
  active       INTEGER NOT NULL DEFAULT 1,
  i18n_json    TEXT NOT NULL,              -- {"ko":{"title","body","ctaLabel"}, "en":…, "ja":…, "es":…}
  updated_at   TEXT NOT NULL,
  updated_by_pseudonym_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_care_affiliates_category
  ON care_affiliates (category, active, sort_order);

-- 기존 인메모리 SEED 6건을 그대로 이관 (동작 무변화).
INSERT OR IGNORE INTO care_affiliates
  (slug, category, partner, cta_url, coming_soon, sort_order, active, i18n_json, updated_at)
VALUES
  ('diet-mediterranean-plan', 'diet', 'Chronos Lab',
   'https://chronoshealth.ever-day.com/care#diet-med', 1, 0, 1,
   '{"ko":{"title":"지중해식 식단 7일 플랜","body":"주 5회 채소·전곡·올리브유 중심. 체중·LDL 동시 관리.","ctaLabel":"자세히 보기"},"en":{"title":"Mediterranean 7-day plan","body":"Veggies, whole grains, olive oil 5x/week. Helps weight + LDL.","ctaLabel":"Details"},"ja":{"title":"地中海食 7日プラン","body":"週5回の野菜・全粒穀物・オリーブオイル。体重とLDLを同時管理。","ctaLabel":"詳細を見る"},"es":{"title":"Plan mediterráneo de 7 días","body":"Vegetales, granos integrales y aceite de oliva 5 veces/semana. Peso + LDL.","ctaLabel":"Detalles"}}',
   '2026-07-08T00:00:00.000Z'),

  ('diet-low-glycemic-pack', 'diet', 'Glucose-Friendly Kitchen',
   'https://chronoshealth.ever-day.com/care#diet-gi', 1, 1, 1,
   '{"ko":{"title":"저GI 도시락 (가족력 당뇨 대비)","body":"주 3회 배송. 식후 혈당 변동 감소를 돕는 메뉴.","ctaLabel":"제휴 페이지"},"en":{"title":"Low-GI meal box (diabetes family history)","body":"3x/week delivery. Designed to soften postprandial glucose swings.","ctaLabel":"Partner page"},"ja":{"title":"低GI弁当(糖尿家族歴向け)","body":"週3回配送。食後血糖変動を抑える献立。","ctaLabel":"パートナー"},"es":{"title":"Comida bajo IG (antecedentes de diabetes)","body":"Reparto 3x/semana. Diseñado para suavizar la glucosa postprandial.","ctaLabel":"Socio"}}',
   '2026-07-08T00:00:00.000Z'),

  ('exercise-home-cardio-30', 'exercise', 'Chronos Move',
   'https://chronoshealth.ever-day.com/care#exercise-cardio', 1, 0, 1,
   '{"ko":{"title":"집에서 30분 유산소 루틴","body":"주 5일·30분. 별도 장비 없이 활력 점수 개선 기대.","ctaLabel":"루틴 받기"},"en":{"title":"30-min home cardio routine","body":"5 days/week, 30 min, no equipment. Aims to lift Vitality.","ctaLabel":"Get routine"},"ja":{"title":"自宅で30分有酸素ルーティン","body":"週5日30分、器具不要。活力スコア改善を目指す。","ctaLabel":"ルーティン取得"},"es":{"title":"Rutina cardio en casa 30 min","body":"5 días/semana, 30 min, sin equipo. Mejora la vitalidad.","ctaLabel":"Obtener"}}',
   '2026-07-08T00:00:00.000Z'),

  ('exercise-strength-bands', 'exercise', 'Chronos Move',
   'https://chronoshealth.ever-day.com/care#exercise-strength', 1, 1, 1,
   '{"ko":{"title":"관절 친화 저강도 근력 (밴드)","body":"관절 부담 줄이며 근력 보강. 주 3회 15분.","ctaLabel":"시작하기"},"en":{"title":"Joint-friendly band strength","body":"Builds strength with low joint load. 3x/week, 15 min.","ctaLabel":"Start"},"ja":{"title":"関節にやさしい低強度筋力 (バンド)","body":"関節負担を抑えながら筋力強化。週3回15分。","ctaLabel":"開始"},"es":{"title":"Fuerza con bandas (suave para articulaciones)","body":"Fuerza con baja carga articular. 3x/semana, 15 min.","ctaLabel":"Empezar"}}',
   '2026-07-08T00:00:00.000Z'),

  ('medical-annual-checkup-kr', 'medical', 'Health Screening Partner',
   'https://chronoshealth.ever-day.com/care#medical-checkup', 1, 0, 1,
   '{"ko":{"title":"연 1회 건강검진 예약","body":"40세 이상 권장. 혈압·당·콜레스테롤 기본 패키지.","ctaLabel":"파트너 안내"},"en":{"title":"Annual health screening","body":"Recommended 40+. BP · glucose · cholesterol basic package.","ctaLabel":"Partner info"},"ja":{"title":"年1回の健康診断予約","body":"40歳以上推奨。血圧・血糖・コレステロール基本パック。","ctaLabel":"パートナー"},"es":{"title":"Chequeo anual","body":"Recomendado a partir de los 40. Paquete básico TA · glucosa · colesterol.","ctaLabel":"Información"}}',
   '2026-07-08T00:00:00.000Z'),

  ('medical-smoking-cessation', 'medical', 'Chronos Lab',
   'https://chronoshealth.ever-day.com/care#medical-quit-smoking', 1, 1, 1,
   '{"ko":{"title":"금연 보조 프로그램","body":"주간 체크인 + 행동 변화 자료. 외부 클리닉 연계.","ctaLabel":"프로그램 안내"},"en":{"title":"Smoking-cessation support","body":"Weekly check-ins + behaviour-change materials. Clinic partner ties.","ctaLabel":"Program info"},"ja":{"title":"禁煙サポートプログラム","body":"週次チェック+行動変容資料。外部クリニック連携。","ctaLabel":"プログラム"},"es":{"title":"Programa de cese tabáquico","body":"Revisiones semanales + materiales de cambio de hábito. Clínicas asociadas.","ctaLabel":"Programa"}}',
   '2026-07-08T00:00:00.000Z');
