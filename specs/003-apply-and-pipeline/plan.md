# Plan 003 — Candidate & Pipeline

## Constitution Check
- [x] I. `candidate` (nộp đơn, quét trùng, lưu CV) export `CandidatesService`; `pipeline` (Kanban, lịch, chuyển vòng) điều phối `HIRED` (cập nhật `job_requisitions`, `jobs` trong cùng transaction — ngoại lệ có chủ đích ở Constitution I).
- [x] II. `PipelineService.transition()` là điểm duy nhất cập nhật `current_stage_id`; tăng `filled_count` bằng `UPDATE … WHERE filled_count < headcount` (D12).
- [x] III. `normalizeEmail/normalizePhone` (thuần) và `evaluateTransition(ctx)` (thuần, trả danh sách vi phạm) có unit test.

## Cấu trúc
```text
backend/src/modules/candidate/
  candidate.module.ts  candidates.service.ts  apply.controller.ts  normalize.ts
backend/src/modules/pipeline/
  pipeline.module.ts  pipeline.controller.ts  pipeline.service.ts
  transition.rules.ts      # evaluateTransition(ctx) → GuardViolation[] (hàm thuần)
  interviews.controller.ts  interviews.service.ts  tracking.controller.ts
backend/src/shared/storage/   # multer disk storage, chỉ PDF ≤ 5MB, tên file UUID
backend/src/shared/mail/      # nodemailer → Mailpit, ics
```

## Luồng `transition(applicationId, toStageId, actor, note?)`
1. `$transaction` (Read Committed) — tải application + job + stages + interview còn hiệu lực + participants.
2. Dựng `ctx` → `evaluateTransition(ctx)`; có vi phạm ⇒ ném `BusinessException(code)`.
3. Cập nhật application (+ `status` nếu HIRED/REJECTED), ghi `application_logs`.
4. Nếu HIRED: `UPDATE job_requisitions SET filled_count = filled_count+1 WHERE id=? AND filled_count<headcount` → `count=0` ⇒ `GUARD_HEADCOUNT_FULL`. Nếu đầy ⇒ đóng Job/Requisition, `REJECTED` các đơn ACTIVE còn lại + log.
5. Commit → gửi email (outbox trong bộ nhớ, sau commit).

## Contracts
| Method | Path | Quyền | Ghi chú |
|:--|:--|:--|:--|
| POST | `/api/public/jobs/:id/apply` | Public | multipart: `fullName,email,phone,resume(pdf)` → `{trackingToken}` |
| GET | `/api/public/track/:token` | Public | DTO công khai (D15) |
| GET | `/api/jobs/:jobId/kanban` | ADMIN, HR, HM(phòng) | `{job, columns:[{stage, cards:[…]}]}` |
| GET | `/api/applications/:id` | ADMIN, HR, HM(phòng), hội đồng | chi tiết + lịch sử + đơn trước đó |
| GET | `/api/applications/:id/resume` | như trên | stream PDF snapshot |
| PATCH | `/api/applications/:id/stage` | ADMIN, HR | `{toStageId, note?}` |
| POST | `/api/applications/:id/interviews` | ADMIN, HR | `{scheduledAt,durationMinutes,meetingLink?,location?,interviewerIds[]}` |
| PATCH | `/api/interviews/:id/cancel` | ADMIN, HR | chỉ khi chưa ai nộp phiếu |
| GET | `/api/interviews/mine` | INTERVIEWER, HM | lịch được phân công |
| PATCH | `/api/applications/:id/offer-approval` | ADMIN, HM(phòng) | chỉ khi ở OFFER |

## Mã lỗi
`APPLY_JOB_NOT_OPEN` · `APPLY_INVALID_FILE` · `APPLY_DUPLICATE_JOB` · `GUARD_NOT_NEXT_STAGE` · `GUARD_TERMINAL_STATE` · `GUARD_REJECT_REASON_REQUIRED` · `GUARD_RESUME_MISSING` · `GUARD_INTERVIEW_REQUIRED` · `GUARD_SCORECARDS_INCOMPLETE` · `GUARD_DISQUALIFIED` · `GUARD_VARIANCE_UNRESOLVED` · `GUARD_SCORE_BELOW_THRESHOLD` · `GUARD_OFFER_NOT_APPROVED` · `GUARD_HEADCOUNT_FULL` · `INTERVIEW_ALREADY_ACTIVE` · `INTERVIEW_HAS_SCORECARDS` · `INTERVIEW_INVALID`

