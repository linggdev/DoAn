USE ATS_Enterprise_DB;
GO

-- 1. XÓA BẢNG NẾU ĐÃ TỒN TẠI (THEO THỨ TỰ RÀNG BUỘC)
IF OBJECT_ID('evaluation_scores', 'U') IS NOT NULL DROP TABLE evaluation_scores;
IF OBJECT_ID('evaluations', 'U') IS NOT NULL DROP TABLE evaluations;
IF OBJECT_ID('interview_participants', 'U') IS NOT NULL DROP TABLE interview_participants;
IF OBJECT_ID('interviews', 'U') IS NOT NULL DROP TABLE interviews;
IF OBJECT_ID('application_logs', 'U') IS NOT NULL DROP TABLE application_logs;
IF OBJECT_ID('applications', 'U') IS NOT NULL DROP TABLE applications;
IF OBJECT_ID('candidates', 'U') IS NOT NULL DROP TABLE candidates;
IF OBJECT_ID('scorecard_criteria', 'U') IS NOT NULL DROP TABLE scorecard_criteria;
IF OBJECT_ID('job_stages', 'U') IS NOT NULL DROP TABLE job_stages;
IF OBJECT_ID('jobs', 'U') IS NOT NULL DROP TABLE jobs;
IF OBJECT_ID('job_requisitions', 'U') IS NOT NULL DROP TABLE job_requisitions;
IF OBJECT_ID('users', 'U') IS NOT NULL DROP TABLE users;
IF OBJECT_ID('departments', 'U') IS NOT NULL DROP TABLE departments;
GO

-- 2. TẠO CÁC BẢNG (13 BẢNG THEO DOCS VÀ SPEC)

-- Bảng 1: Phòng ban
CREATE TABLE departments (
    id INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(150) NOT NULL UNIQUE,
    manager_id INT NULL,
    created_at DATETIME2 DEFAULT GETDATE()
);

-- Bảng 2: Tài khoản & Phân quyền (5 Roles: ADMIN, HIRING_MANAGER, HR, INTERVIEWER, CANDIDATE)
CREATE TABLE users (
    id INT IDENTITY(1,1) PRIMARY KEY,
    email NVARCHAR(150) NOT NULL UNIQUE,
    password_hash NVARCHAR(255) NOT NULL,
    full_name NVARCHAR(150) NOT NULL,
    role NVARCHAR(50) NOT NULL CHECK (role IN ('ADMIN', 'HIRING_MANAGER', 'HR', 'INTERVIEWER', 'CANDIDATE')),
    department_id INT NULL FOREIGN KEY REFERENCES departments(id) ON DELETE SET NULL,
    status NVARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    created_at DATETIME2 DEFAULT GETDATE()
);

-- Ràng buộc khóa ngoại manager_id của departments tham chiếu users(id)
ALTER TABLE departments ADD CONSTRAINT FK_dept_manager FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE NO ACTION;

-- Bảng 3: Phiếu yêu cầu tuyển dụng (Requisition)
CREATE TABLE job_requisitions (
    id INT IDENTITY(501,1) PRIMARY KEY,
    department_id INT NOT NULL FOREIGN KEY REFERENCES departments(id),
    requested_by INT NOT NULL FOREIGN KEY REFERENCES users(id),
    title NVARCHAR(200) NOT NULL,
    headcount INT NOT NULL DEFAULT 1,
    filled_count INT NOT NULL DEFAULT 0,
    salary_range NVARCHAR(100) NULL,
    status NVARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'CLOSED')),
    created_at DATETIME2 DEFAULT GETDATE()
);

-- Bảng 4: Tin tuyển dụng (Jobs)
CREATE TABLE jobs (
    id INT IDENTITY(1001,1) PRIMARY KEY,
    requisition_id INT NOT NULL UNIQUE FOREIGN KEY REFERENCES job_requisitions(id),
    title NVARCHAR(200) NOT NULL,
    description NVARCHAR(MAX) NOT NULL,
    requirements NVARCHAR(MAX) NOT NULL,
    salary_range NVARCHAR(100) NULL,
    pass_score_threshold DECIMAL(3,2) NOT NULL DEFAULT 3.50,
    status NVARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PUBLISHED', 'CLOSED')),
    created_at DATETIME2 DEFAULT GETDATE()
);

-- Bảng 5: Các vòng tuyển dụng (Stages: APPLIED, SCREENING, TEST, INTERVIEW, OFFER, HIRED, REJECTED)
CREATE TABLE job_stages (
    id INT IDENTITY(1,1) PRIMARY KEY,
    job_id INT NOT NULL FOREIGN KEY REFERENCES jobs(id) ON DELETE CASCADE,
    stage_code NVARCHAR(50) NOT NULL CHECK (stage_code IN ('APPLIED', 'SCREENING', 'TEST', 'INTERVIEW', 'OFFER', 'HIRED', 'REJECTED')),
    stage_name NVARCHAR(100) NOT NULL,
    stage_order INT NOT NULL,
    CONSTRAINT UQ_job_stage_code UNIQUE (job_id, stage_code),
    CONSTRAINT UQ_job_stage_order UNIQUE (job_id, stage_order)
);

-- Bảng 6: Barem tiêu chí đánh giá & Trọng số (Scorecard Criteria)
CREATE TABLE scorecard_criteria (
    id INT IDENTITY(1,1) PRIMARY KEY,
    job_id INT NOT NULL FOREIGN KEY REFERENCES jobs(id) ON DELETE CASCADE,
    criteria_name NVARCHAR(150) NOT NULL,
    weight_percent INT NOT NULL CHECK (weight_percent >= 1 AND weight_percent <= 100),
    is_knockout BIT NOT NULL DEFAULT 0,
    CONSTRAINT UQ_job_criteria UNIQUE (job_id, criteria_name)
);

-- Bảng 7: Hồ sơ ứng viên tổng thể (Candidate)
CREATE TABLE candidates (
    id INT IDENTITY(1,1) PRIMARY KEY,
    email NVARCHAR(150) NOT NULL UNIQUE,
    phone NVARCHAR(30) NULL,
    full_name NVARCHAR(150) NOT NULL,
    resume_url NVARCHAR(500) NOT NULL,
    created_at DATETIME2 DEFAULT GETDATE(),
    updated_at DATETIME2 DEFAULT GETDATE()
);

-- Bảng 8: Đơn ứng tuyển theo Job (Application)
CREATE TABLE applications (
    id INT IDENTITY(101,1) PRIMARY KEY,
    job_id INT NOT NULL FOREIGN KEY REFERENCES jobs(id),
    candidate_id INT NOT NULL FOREIGN KEY REFERENCES candidates(id),
    current_stage_id INT NOT NULL FOREIGN KEY REFERENCES job_stages(id),
    resume_url NVARCHAR(500) NOT NULL,
    tracking_token UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID() UNIQUE,
    overall_score DECIMAL(3,2) NULL,
    has_variance_alert BIT NOT NULL DEFAULT 0,
    is_disqualified BIT NOT NULL DEFAULT 0,
    calibration_note NVARCHAR(MAX) NULL,
    calibrated_by INT NULL FOREIGN KEY REFERENCES users(id),
    calibrated_at DATETIME2 NULL,
    offer_approved_by INT NULL FOREIGN KEY REFERENCES users(id),
    offer_approved_at DATETIME2 NULL,
    status NVARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'HIRED', 'REJECTED')),
    applied_at DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT UQ_job_candidate UNIQUE (job_id, candidate_id)
);

-- Bảng 9: Lịch sử chuyển vòng ứng viên (Application Logs)
CREATE TABLE application_logs (
    id INT IDENTITY(1,1) PRIMARY KEY,
    application_id INT NOT NULL FOREIGN KEY REFERENCES applications(id) ON DELETE CASCADE,
    from_stage_id INT NULL FOREIGN KEY REFERENCES job_stages(id),
    to_stage_id INT NOT NULL FOREIGN KEY REFERENCES job_stages(id),
    changed_by INT NULL FOREIGN KEY REFERENCES users(id),
    note NVARCHAR(MAX) NULL,
    created_at DATETIME2 DEFAULT GETDATE()
);

-- Bảng 10: Buổi phỏng vấn (Interview)
CREATE TABLE interviews (
    id INT IDENTITY(1,1) PRIMARY KEY,
    application_id INT NOT NULL FOREIGN KEY REFERENCES applications(id) ON DELETE CASCADE,
    stage_id INT NOT NULL FOREIGN KEY REFERENCES job_stages(id),
    scheduled_at DATETIME2 NOT NULL,
    duration_minutes INT NOT NULL DEFAULT 60,
    meeting_link NVARCHAR(500) NULL,
    location NVARCHAR(255) NULL,
    status NVARCHAR(20) NOT NULL DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED', 'COMPLETED', 'CANCELLED')),
    created_at DATETIME2 DEFAULT GETDATE()
);

-- Bảng 11: Hội đồng giám khảo phỏng vấn (Interview Participants)
CREATE TABLE interview_participants (
    id INT IDENTITY(1,1) PRIMARY KEY,
    interview_id INT NOT NULL FOREIGN KEY REFERENCES interviews(id) ON DELETE CASCADE,
    interviewer_id INT NOT NULL FOREIGN KEY REFERENCES users(id),
    has_submitted_scorecard BIT NOT NULL DEFAULT 0,
    submitted_at DATETIME2 NULL,
    CONSTRAINT UQ_interview_interviewer UNIQUE (interview_id, interviewer_id)
);

-- Bảng 12: Phiếu đánh giá của giám khảo (Evaluations)
CREATE TABLE evaluations (
    id INT IDENTITY(1,1) PRIMARY KEY,
    interview_id INT NOT NULL FOREIGN KEY REFERENCES interviews(id) ON DELETE CASCADE,
    interviewer_id INT NOT NULL FOREIGN KEY REFERENCES users(id),
    overall_comment NVARCHAR(MAX) NULL,
    recommendation NVARCHAR(30) NOT NULL CHECK (recommendation IN ('STRONG_HIRE', 'HIRE', 'NO_HIRE', 'STRONG_NO_HIRE')),
    created_at DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT UQ_eval_seat UNIQUE (interview_id, interviewer_id)
);

-- Bảng 13: Điểm từng tiêu chí của phiếu đánh giá (Evaluation Scores)
CREATE TABLE evaluation_scores (
    id INT IDENTITY(1,1) PRIMARY KEY,
    evaluation_id INT NOT NULL FOREIGN KEY REFERENCES evaluations(id) ON DELETE CASCADE,
    criteria_id INT NOT NULL FOREIGN KEY REFERENCES scorecard_criteria(id),
    score DECIMAL(2,1) NOT NULL CHECK (score >= 1.0 AND score <= 5.0),
    comment NVARCHAR(MAX) NULL,
    CONSTRAINT UQ_eval_criterion UNIQUE (evaluation_id, criteria_id)
);
GO

-- 3. CHÈN DỮ LIỆU MẪU ĐỒ ÁN (SEED DATA)
SET IDENTITY_INSERT departments ON;
INSERT INTO departments (id, name, manager_id) VALUES
(1, N'Engineering', NULL),
(2, N'Product & Design', NULL),
(3, N'Data & Platform Infrastructure', NULL);
SET IDENTITY_INSERT departments OFF;

SET IDENTITY_INSERT users ON;
INSERT INTO users (id, email, password_hash, full_name, role, department_id, status) VALUES
(1, 'admin@ats.local', '$2b$10$wK1.sample.hash', N'Nguyễn Quản Trị', 'ADMIN', 1, 'ACTIVE'),
(2, 'hm.eng@ats.local', '$2b$10$wK1.sample.hash', N'Trần Minh Quân', 'HIRING_MANAGER', 1, 'ACTIVE'),
(3, 'hr@ats.local', '$2b$10$wK1.sample.hash', N'Lê Thu Hà', 'HR', 1, 'ACTIVE'),
(4, 'int1@ats.local', '$2b$10$wK1.sample.hash', N'Phạm Hoàng Nam', 'INTERVIEWER', 1, 'ACTIVE'),
(5, 'int2@ats.local', '$2b$10$wK1.sample.hash', N'Vũ Hải Yến', 'INTERVIEWER', 1, 'ACTIVE'),
(6, 'tuan.nguyen@dev.vn', '$2b$10$wK1.sample.hash', N'Nguyễn Quốc Tuấn', 'CANDIDATE', NULL, 'ACTIVE');
SET IDENTITY_INSERT users OFF;

UPDATE departments SET manager_id = 2 WHERE id IN (1, 2);
UPDATE departments SET manager_id = 4 WHERE id = 3;

SET IDENTITY_INSERT job_requisitions ON;
INSERT INTO job_requisitions (id, department_id, requested_by, title, headcount, filled_count, salary_range, status) VALUES
(501, 1, 2, N'Senior Backend Engineer (Node.js / NestJS)', 2, 1, N'38.000.000 - 52.000.000 VNĐ', 'APPROVED'),
(502, 2, 2, N'Lead UI/UX Product Designer', 1, 0, N'32.000.000 - 45.000.000 VNĐ', 'APPROVED');
SET IDENTITY_INSERT job_requisitions OFF;

SET IDENTITY_INSERT jobs ON;
INSERT INTO jobs (id, requisition_id, title, description, requirements, salary_range, pass_score_threshold, status) VALUES
(1001, 501, N'Senior Backend Engineer (Node.js / NestJS)', N'Thiết kế kiến trúc High-load và hệ thống Microservices quy mô lớn.', N'Ít nhất 4 năm kinh nghiệm với Node.js, NestJS, PostgreSQL/SQL Server, Docker.', N'38.000.000 - 52.000.000 VNĐ', 3.50, 'PUBLISHED'),
(1002, 502, N'Lead UI/UX Product Designer', N'Định hình Design System B2B SaaS và cải tiến trải nghiệm người dùng.', N'Thành thạo Figma, Design Tokens, Micro-interactions và Prototype.', N'32.000.000 - 45.000.000 VNĐ', 3.80, 'PUBLISHED');
SET IDENTITY_INSERT jobs OFF;

-- Các vòng cho Job 1001
INSERT INTO job_stages (job_id, stage_code, stage_name, stage_order) VALUES
(1001, 'APPLIED', N'Ứng tuyển', 1),
(1001, 'SCREENING', N'Sàng lọc CV', 2),
(1001, 'TEST', N'Bài Test Kỹ thuật', 3),
(1001, 'INTERVIEW', N'Phỏng vấn Hội đồng', 4),
(1001, 'OFFER', N'Đề nghị (Offer)', 5),
(1001, 'HIRED', N'Trúng tuyển', 6),
(1001, 'REJECTED', N'Loại hồ sơ', 99);

-- Tiêu chí chấm điểm Job 1001 (∑w = 100%)
INSERT INTO scorecard_criteria (job_id, criteria_name, weight_percent, is_knockout) VALUES
(1001, N'Kiến trúc Hệ thống & Microservices', 30, 0),
(1001, N'Tối ưu Hóa Cơ Sở Dữ Liệu & Concurrency', 25, 0),
(1001, N'Kỹ năng Clean Code & Design Patterns', 20, 0),
(1001, N'Tư duy Giải quyết Vấn đề & Giao tiếp', 15, 0),
(1001, N'Tiêu chuẩn Bảo mật OWASP (Điểm Liệt)', 10, 1);

-- Ứng viên mẫu
SET IDENTITY_INSERT candidates ON;
INSERT INTO candidates (id, email, phone, full_name, resume_url) VALUES
(1, 'tuan.nguyen@dev.vn', '0901234567', N'Nguyễn Quốc Tuấn', '/uploads/cv_nguyen_quoc_tuan.pdf'),
(2, 'hoang.pham@engineer.io', '0912345678', N'Phạm Minh Hoàng', '/uploads/cv_pham_minh_hoang.pdf'),
(3, 'mai.le@design.vn', '0923456789', N'Lê Tuyết Mai', '/uploads/cv_le_tuyet_mai.pdf');
SET IDENTITY_INSERT candidates OFF;

-- Đơn ứng tuyển mẫu
DECLARE @stageApplied INT = (SELECT id FROM job_stages WHERE job_id = 1001 AND stage_code = 'APPLIED');
DECLARE @stageInterview INT = (SELECT id FROM job_stages WHERE job_id = 1001 AND stage_code = 'INTERVIEW');
DECLARE @stageHired INT = (SELECT id FROM job_stages WHERE job_id = 1001 AND stage_code = 'HIRED');

SET IDENTITY_INSERT applications ON;
INSERT INTO applications (id, job_id, candidate_id, current_stage_id, resume_url, overall_score, has_variance_alert, is_disqualified, status) VALUES
(101, 1001, 1, @stageInterview, '/uploads/cv_nguyen_quoc_tuan.pdf', 4.15, 0, 0, 'ACTIVE'),
(102, 1001, 2, @stageHired, '/uploads/cv_pham_minh_hoang.pdf', 4.60, 0, 0, 'HIRED'),
(103, 1001, 3, @stageApplied, '/uploads/cv_le_tuyet_mai.pdf', NULL, 0, 0, 'ACTIVE');
SET IDENTITY_INSERT applications OFF;

PRINT N'>>> ĐÃ TẠO TOÀN BỘ 13 BẢNG VÀ CHÈN DỮ LIỆU MẪU THÀNH CÔNG VÀO DATABASE ATS_Enterprise_DB <<<';
