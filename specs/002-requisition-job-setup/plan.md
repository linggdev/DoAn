# Plan 002 — Recruitment

## Constitution Check
- [x] I. Module `recruitment`; export `JobsService` (đọc Job, stage, criteria) cho `candidate`, `pipeline`, `evaluation`.
- [x] II. `PUT criteria` và `PUT stages` thay thế toàn bộ trong 1 transaction; khoá cấu hình khi đã có đơn.
- [x] III. Hàm thuần `validateCriteria(list)` và `buildDefaultStages()` / `applyStageConfig()` trong `stage-rules.ts` có unit test.

## Cấu trúc
```text
backend/src/modules/recruitment/
  recruitment.module.ts
  requisitions.controller.ts  requisitions.service.ts
  jobs.controller.ts  jobs.service.ts  public-jobs.controller.ts
  criteria.rules.ts            # validateCriteria (hàm thuần)
  dto/*
backend/src/shared/domain/stage-rules.ts   # thứ tự vòng, vòng bắt buộc, nextStage()
```

## Contracts
| Method | Path | Quyền | Body / Ghi chú |
|:--|:--|:--|:--|
| GET | `/api/requisitions` | ADMIN, HR, HM (phòng mình) | |
| POST | `/api/requisitions` | ADMIN, HIRING_MANAGER | `{title, headcount}` — department = phòng của HM |
| PATCH | `/api/requisitions/:id/decision` | ADMIN, HR | `{decision: "APPROVED" \| "REJECTED", note?}` |
| GET | `/api/jobs` | nội bộ | lọc theo trạng thái |
| GET | `/api/jobs/:id` | nội bộ | kèm stages, criteria |
| POST | `/api/jobs` | ADMIN, HR | `{requisitionId, title?, description, requirements, salaryRange?, passScoreThreshold?}` |
| PATCH | `/api/jobs/:id` | ADMIN, HR | sửa nội dung (Nháp/Đang đăng) |
| PUT | `/api/jobs/:id/stages` | ADMIN, HR | `{stages:[{stageCode, enabled, stageName}]}` |
| PUT | `/api/jobs/:id/criteria` | ADMIN, HR | `{criteria:[{criteriaName, weightPercent, isKnockout}]}` |
| PATCH | `/api/jobs/:id/publish` | ADMIN, HR | |
| PATCH | `/api/jobs/:id/close` | ADMIN, HR | |
| GET | `/api/public/jobs` | Public | Job PUBLISHED (DTO công khai) |
| GET | `/api/public/jobs/:id` | Public | |

## Mã lỗi
`REQ_INVALID_HEADCOUNT` · `REQ_NOT_PENDING` · `REQ_NOT_APPROVED` · `REQ_ALREADY_HAS_JOB` · `JOB_CONFIG_LOCKED` · `CRITERIA_WEIGHT_SUM` · `CRITERIA_INVALID` · `STAGE_REQUIRED` · `JOB_NOT_PUBLISHABLE` · `JOB_NOT_FOUND`

