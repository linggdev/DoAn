# Tasks 003 — Candidate & Pipeline

## Phase 1 — Luật thuần
- [x] T018 [Test] unit `normalize.spec.ts` (S3.4, S3.5) & `transition.rules.spec.ts` (S3.9–S3.12, S3.15–S3.19) — **PASS**
- [x] T019 Cài đặt `normalize.ts`, `transition.rules.ts`

## Phase 2 — US1/US2 Nộp đơn & quét trùng
- [x] T020 [Test] `pipeline.service.spec.ts`: S3.1–S3.7 (Nộp đơn, quét trùng Email/SĐT, chặn nộp trùng cùng Job `APPLY_DUPLICATE_JOB`, bảo toàn snapshot CV cũ) — **PASS**
- [x] T021 Upload PDF ≤ 5MB, `CandidateService.applyToJob` (transaction: upsert candidate, tạo application + log đầu)
- [x] T022 `/api/public/track/:token` (D15)

## Phase 3 — US3/US4 Kanban, lịch phỏng vấn
- [x] T023 [Test] `pipeline.service.spec.ts`: S3.8–S3.14 (Chuyển vòng tuần tự, tạo lịch phỏng vấn `.ics`, guard `INTERVIEW`) — **PASS**
- [x] T024 `PipelineService.transitionStage`, `getKanban`, `scheduleInterview`/`cancelInterview`/`listMyInterviews`, `MailService` + `.ics`

## Phase 4 — US5/US6 Offer, chốt tuyển, chống tuyển lố
- [x] T025 [Test] `pipeline.service.spec.ts`: S3.15–S3.22 (Guard `OFFER`, HM duyệt Offer, tự động đóng Job khi đủ định biên & 10 lần liên tiếp kiểm thử đồng thời S3.22 chống tuyển lố) — **PASS**
- [x] T026 `approveOffer`, nhánh HIRED nguyên tử (D12, D13)
