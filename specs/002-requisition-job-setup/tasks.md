# Tasks 002 — Recruitment

## Phase 1 — Luật thuần
- [x] T010 [Test] unit `stage-rules.spec.ts` (thứ tự, vòng bắt buộc, nextStage) & `criteria.rules.spec.ts` (S2.8, S2.9, S2.10) — **PASS**
- [x] T011 Cài đặt `stage-rules.ts`, `criteria.rules.ts`

## Phase 2 — US1 Requisition
- [x] T012 [Test] `recruitment.service.spec.ts`: S2.1, S2.2, S2.3 (HM xin định biên, chặn `headcount <= 0`, HR duyệt/từ chối) — **PASS**
- [x] T013 `RecruitmentService/Controller` (Requisition CRUD + Decision)

## Phase 3 — US2/US3 Job, vòng, tiêu chí
- [x] T014 [Test] `recruitment.service.spec.ts`: S2.4–S2.10 (Tạo Job 1-1 từ Requisition đã duyệt, cấu hình vòng & tiêu chí 100%, khóa cấu hình khi có đơn) — **PASS**
- [x] T015 `RecruitmentService.createJob` (sinh stage mặc định), `updateStages`, `updateCriteria` (transaction, khoá khi có đơn)

## Phase 4 — US4 Đăng tuyển & công khai
- [x] T016 [Test] `recruitment.service.spec.ts`: S2.11, S2.12, S2.13 (Chặn đăng tuyển khi chưa đủ tiêu chí 100%, DTO công khai không lộ ngưỡng đậu/tiêu chí) — **PASS**
- [x] T017 `publishJob`, `closeJob`, `listPublicJobs`, `getPublicJob`
