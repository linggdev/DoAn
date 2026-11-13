# Tasks 004 — Evaluation

## Phase 1 — Thuật toán thuần (làm đầu tiên, ăn điểm bảo vệ)
- [x] T027 [Test] unit `scoring.engine.spec.ts`: S4.9, S4.10, S4.11, S4.12, S4.13 + bất biến (S ∈ [1,5], hoán vị giám khảo không đổi kết quả) — **PASS**
- [x] T028 Cài đặt `scoring.engine.ts`
- [x] T029 [Test] unit `blind.policy.spec.ts`: S4.5–S4.8 — **PASS**
- [x] T030 Cài đặt `blind.policy.ts`

## Phase 2 — Nộp phiếu & tổng hợp
- [x] T031 [Test] `evaluation.service.spec.ts`: S4.1–S4.4, S4.14, S4.15 (Nộp phiếu độc lập, bất biến sau khi nộp, Blind Lock và tổng hợp điểm khi phiếu cuối cùng được nộp) — **PASS**
- [x] T032 `EvaluationService.submitScorecard` (transaction), `getApplicationEvaluations` áp blind policy

## Phase 3 — Calibration & so sánh
- [x] T033 [Test] `evaluation.service.spec.ts`: S4.16–S4.19 (Ghi biên bản Calibration ≥ 10 ký tự & Bảng xếp hạng so sánh ứng viên) — **PASS**
- [x] T034 `recordCalibration`, `getJobComparison`
