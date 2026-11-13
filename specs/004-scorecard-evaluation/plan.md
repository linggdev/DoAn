# Plan 004 — Evaluation

## Constitution Check
- [x] I. Module `evaluation`; đọc criteria qua `JobsService`, cập nhật cột tổng hợp của `applications` trong transaction nộp phiếu (module sở hữu luồng chấm).
- [x] II. Lưu phiếu + đánh dấu participant + (nếu cuối) tính & ghi kết quả + đóng interview: **1 transaction**. Khoá dòng interview (`SELECT … FOR UPDATE`) để 2 phiếu cuối đồng thời không cùng bỏ qua bước tổng hợp.
- [x] III. `scoring.engine.ts` thuần, test trước.

## Thuật toán (`computeScorecard`)
Đầu vào: `criteria[{id, weightPercent, isKnockout}]`, `sheets[{interviewerId, scores: Map<criteriaId, number>}]`.
Tính bằng **đơn vị nửa điểm** (`h = score*2`, số nguyên) để so sánh biên chính xác:
```text
for each criterion i:
  hs = [h_ij]                         # số nguyên 2..10
  mean_i  = sum(hs) / (2m)
  delta_h = max(hs) - min(hs)          # Δ ≥ 2.0  ⇔ delta_h ≥ 4
  varianceFlag_i = delta_h >= 4
  if knockout:
    knockoutFail_i  = sum(hs) < 4m     # mean < 2.0
    knockoutWarn_i  = min(hs) <= 3     # có cá nhân ≤ 1.5 (D04)
S = round2( Σ weightPercent_i * sum(hs_i) / (200 m) )
hasVarianceAlert = any(varianceFlag) or any(knockoutWarn and not knockoutFail)
isDisqualified   = any(knockoutFail)
```
Đầu ra: `{ overallScore, hasVarianceAlert, isDisqualified, perCriterion[{criteriaId, mean, delta, varianceFlag, knockoutFail, knockoutWarn}] }`.

## Cấu trúc
```text
backend/src/modules/evaluation/
  evaluation.module.ts  evaluations.controller.ts  evaluations.service.ts
  scoring.engine.ts  blind.policy.ts   # hàm thuần: quyết định ai thấy gì
  calibration.controller.ts  comparison.controller.ts  dto/*
```

## Contracts
| Method | Path | Quyền | Ghi chú |
|:--|:--|:--|:--|
| POST | `/api/interviews/:id/evaluations` | thành viên hội đồng | `{recommendation, overallComment?, scores:[{criteriaId, score, comment?}]}` |
| GET | `/api/applications/:id/evaluations` | nội bộ có quyền xem đơn | áp `blind.policy` |
| POST | `/api/applications/:id/calibration` | ADMIN, HR, HM(phòng) | `{note}` |
| GET | `/api/jobs/:jobId/comparison` | ADMIN, HR, HM(phòng) | S4.19 |

## Mã lỗi
`EVAL_NOT_PARTICIPANT` · `EVAL_ALREADY_SUBMITTED` · `EVAL_INTERVIEW_CANCELLED` · `EVAL_INCOMPLETE_SCORES` · `EVAL_INVALID_SCORE` · `CALIB_NOT_REQUIRED` · `CALIB_NOTE_TOO_SHORT`

