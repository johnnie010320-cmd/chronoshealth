# ml — Machine Learning

> Python 3.12. MLflow + DVC 재현 가능성 강제.

## 책임

- 피처 스토어 정의 (Feast)
- 학습 파이프라인 (Kedro 또는 Prefect)
- 모델: PhenoAge 회귀 / DeepHit 생존분석 / 트랜스포머 시계열
- 평가 / 공정성 / 드리프트 (Evidently)

## 절대 규칙 (ADR 0005, 절차서 6.2)

1. 모든 실험은 **데이터셋 해시 + 설정 + 깃 SHA** 3중 식별 (MLflow 태그)
2. 시드 고정 (`seed=42` 또는 명시) — 비결정적 실험 정식 기록 금지
3. PR 머지 전 평가 리포트 첨부 (`docs/ml-experiments/EXP-NNNN.md`)
4. 슬라이스별 (연령 / 성별 / 지역 / BMI) 성능 격차 ΔAUROC ≤ 0.05
5. 추론 지연 p95 ≤ 200ms, 콜드 스타트 ≤ 1.5s
6. 학습 데이터 출처 명시 (UK Biobank, NHANES 등 공개 코호트 우선)
7. 개인 데이터 학습 사용 시 사용자 **별도 동의 필수**

## 표준

- 포맷 / 린트: `ruff check .`, `ruff format`
- 타입: `mypy --strict`
- 검증: Pydantic v2
- 노트북은 커밋 직전 `jupytext --to py` 변환

## 명령어

```bash
pytest                                # 단위 테스트
mlflow ui                             # 실험 비교
python ml/train.py --config configs/<exp>.yaml --seed 42
dvc pull                              # 데이터셋 가져오기
```

## 통과 기준 (절차서 1.4 / 5.2)

- AUROC ≥ 0.78 (5년 만성질환 발생)
- 생체 나이 MAE ≤ 4년
- 드리프트 알림 오탐 월 1건 이하
- 슬라이스 격차 임계 이내
