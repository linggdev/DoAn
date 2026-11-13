-- CreateTable
CREATE TABLE "departments" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "manager_id" INTEGER,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "departments_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "users" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "department_id" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "users_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "job_requisitions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "department_id" INTEGER NOT NULL,
    "requested_by" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "headcount" INTEGER NOT NULL,
    "filled_count" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "job_requisitions_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "job_requisitions_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "jobs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "requisition_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "requirements" TEXT NOT NULL,
    "salary_range" TEXT,
    "pass_score_threshold" DECIMAL NOT NULL DEFAULT 3.50,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "jobs_requisition_id_fkey" FOREIGN KEY ("requisition_id") REFERENCES "job_requisitions" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "job_stages" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "job_id" INTEGER NOT NULL,
    "stage_code" TEXT NOT NULL,
    "stage_name" TEXT NOT NULL,
    "stage_order" INTEGER NOT NULL,
    CONSTRAINT "job_stages_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "scorecard_criteria" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "job_id" INTEGER NOT NULL,
    "criteria_name" TEXT NOT NULL,
    "weight_percent" INTEGER NOT NULL,
    "is_knockout" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "scorecard_criteria_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "candidates" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "full_name" TEXT NOT NULL,
    "resume_url" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "applications" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "job_id" INTEGER NOT NULL,
    "candidate_id" INTEGER NOT NULL,
    "current_stage_id" INTEGER NOT NULL,
    "resume_url" TEXT NOT NULL,
    "tracking_token" TEXT NOT NULL,
    "overall_score" DECIMAL,
    "has_variance_alert" BOOLEAN NOT NULL DEFAULT false,
    "is_disqualified" BOOLEAN NOT NULL DEFAULT false,
    "calibration_note" TEXT,
    "calibrated_by" INTEGER,
    "calibrated_at" DATETIME,
    "offer_approved_by" INTEGER,
    "offer_approved_at" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "applied_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "applications_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "applications_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidates" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "applications_current_stage_id_fkey" FOREIGN KEY ("current_stage_id") REFERENCES "job_stages" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "applications_calibrated_by_fkey" FOREIGN KEY ("calibrated_by") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "applications_offer_approved_by_fkey" FOREIGN KEY ("offer_approved_by") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "application_logs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "application_id" INTEGER NOT NULL,
    "from_stage_id" INTEGER,
    "to_stage_id" INTEGER NOT NULL,
    "changed_by" INTEGER,
    "note" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "application_logs_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "application_logs_from_stage_id_fkey" FOREIGN KEY ("from_stage_id") REFERENCES "job_stages" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "application_logs_to_stage_id_fkey" FOREIGN KEY ("to_stage_id") REFERENCES "job_stages" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "application_logs_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "interviews" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "application_id" INTEGER NOT NULL,
    "stage_id" INTEGER NOT NULL,
    "scheduled_at" DATETIME NOT NULL,
    "duration_minutes" INTEGER NOT NULL,
    "meeting_link" TEXT,
    "location" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "interviews_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "interviews_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "job_stages" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "interview_participants" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "interview_id" INTEGER NOT NULL,
    "interviewer_id" INTEGER NOT NULL,
    "has_submitted_scorecard" BOOLEAN NOT NULL DEFAULT false,
    "submitted_at" DATETIME,
    CONSTRAINT "interview_participants_interview_id_fkey" FOREIGN KEY ("interview_id") REFERENCES "interviews" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "interview_participants_interviewer_id_fkey" FOREIGN KEY ("interviewer_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "evaluations" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "interview_id" INTEGER NOT NULL,
    "interviewer_id" INTEGER NOT NULL,
    "overall_comment" TEXT,
    "recommendation" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "evaluations_interview_id_fkey" FOREIGN KEY ("interview_id") REFERENCES "interviews" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "evaluations_interviewer_id_fkey" FOREIGN KEY ("interviewer_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "evaluation_scores" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "evaluation_id" INTEGER NOT NULL,
    "criteria_id" INTEGER NOT NULL,
    "score" DECIMAL NOT NULL,
    "comment" TEXT,
    CONSTRAINT "evaluation_scores_evaluation_id_fkey" FOREIGN KEY ("evaluation_id") REFERENCES "evaluations" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "evaluation_scores_criteria_id_fkey" FOREIGN KEY ("criteria_id") REFERENCES "scorecard_criteria" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "departments_name_key" ON "departments"("name");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "job_requisitions_status_idx" ON "job_requisitions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "jobs_requisition_id_key" ON "jobs"("requisition_id");

-- CreateIndex
CREATE INDEX "jobs_status_idx" ON "jobs"("status");

-- CreateIndex
CREATE UNIQUE INDEX "job_stages_job_id_stage_order_key" ON "job_stages"("job_id", "stage_order");

-- CreateIndex
CREATE UNIQUE INDEX "job_stages_job_id_stage_code_key" ON "job_stages"("job_id", "stage_code");

-- CreateIndex
CREATE UNIQUE INDEX "scorecard_criteria_job_id_criteria_name_key" ON "scorecard_criteria"("job_id", "criteria_name");

-- CreateIndex
CREATE UNIQUE INDEX "candidates_email_key" ON "candidates"("email");

-- CreateIndex
CREATE INDEX "candidates_phone_idx" ON "candidates"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "applications_tracking_token_key" ON "applications"("tracking_token");

-- CreateIndex
CREATE INDEX "applications_job_id_status_idx" ON "applications"("job_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "applications_job_id_candidate_id_key" ON "applications"("job_id", "candidate_id");

-- CreateIndex
CREATE INDEX "application_logs_application_id_created_at_idx" ON "application_logs"("application_id", "created_at");

-- CreateIndex
CREATE INDEX "application_logs_to_stage_id_idx" ON "application_logs"("to_stage_id");

-- CreateIndex
CREATE INDEX "interviews_application_id_status_idx" ON "interviews"("application_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "interview_participants_interview_id_interviewer_id_key" ON "interview_participants"("interview_id", "interviewer_id");

-- CreateIndex
CREATE UNIQUE INDEX "evaluations_interview_id_interviewer_id_key" ON "evaluations"("interview_id", "interviewer_id");

-- CreateIndex
CREATE UNIQUE INDEX "evaluation_scores_evaluation_id_criteria_id_key" ON "evaluation_scores"("evaluation_id", "criteria_id");
