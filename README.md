# Enterprise ATS & Multi-Interviewer Candidate Evaluation Platform

Hệ thống Quản lý Tuyển dụng Nội bộ Doanh nghiệp (**Applicant Tracking System - ATS**) & Đánh giá Ứng viên Đa người chấm (**Multi-Interviewer Weighted Scorecard Platform**), được thiết kế theo phương pháp **Spec-Driven Development (GitHub Spec Kit)**.

---

## Kiến trúc & Tính năng Cốt lõi

1. **Xác thực JWT & Cô lập 5 Cổng Giao diện theo Vai trò (5 Role Portals RBAC)**
   - Không cho phép chuyển đổi vai trò tự do trên thanh công cụ; tài khoản thuộc vai trò nào chỉ truy cập đúng không gian làm việc của vai trò đó:
     - **ADMIN (`admin@ats.local` / `Admin@123`)**: Quản trị tài khoản nội bộ, khóa/mở khóa người dùng (`USER_INACTIVE`), nhật ký kiểm toán hệ thống (`AuditLog`), khôi phục dữ liệu mẫu.
     - **HIRING MANAGER (`hm.eng@ats.local` / `Password@123`)**: Lập & phê duyệt Phiếu yêu cầu tuyển dụng (`JobRequisition`), duyệt trọng số chấm điểm, phê duyệt Offer (`OFFER` $\rightarrow$ `HIRED` guard), xem báo cáo Phễu & Xếp hạng.
     - **HR RECRUITER (`hr@ats.local` / `Password@123`)**: Thiết lập tin tuyển dụng đa vị trí, kéo thả bảng Kanban Pipeline (tìm kiếm & lọc đa tiêu chí), đặt lịch phỏng vấn hội đồng ($1 \dots 5$ giám khảo) kèm xuất file `.ics`, quản lý Hồ sơ 360° và Hộp thư Email tự động (`EmailOutbox`).
     - **INTERVIEWER (`int1@ats.local`, `int2@ats.local` / `Password@123`)**: Màn hình chấm điểm chia đôi (**Split-Screen Evaluation Studio**) xem CV PDF song song thanh trượt chấm điểm thang $1.0 \dots 10.0$ (bước $0.5$), nhận xét từng tiêu chí, tự động bắt Điểm liệt (**Knockout Rule** $s_{u,i} \le k_i$) và khóa điểm chéo (**Blind Evaluation Lock**) cho đến khi nộp phiếu chấm bất biến.
     - **CANDIDATE (`tuan.nguyen@dev.vn` / `Candidate@123`)**: Cổng ứng viên 3 màn hình độc lập (Khám phá việc làm & nộp CV `.pdf` $\le 5\text{ MB}$, Theo dõi hồ sơ đã nộp, Tra cứu trạng thái qua **Magic Link Token**).

2. **Động cơ Chấm điểm Trọng số & Điểm liệt (Weighted Scorecard & Knockout Engine)**
   - Công thức tính điểm trung bình có trọng số cho mỗi người chấm $u$:
     $$S_u = \text{round}\left(\frac{\sum_{i=1}^{n} (s_{u,i} \times w_i)}{100}, 2\right), \quad \sum_{i=1}^{n} w_i = 100\%$$
   - Điểm tổng hợp hội đồng phỏng vấn ($m$ người chấm):
     $$\bar{S} = \text{round}\left(\frac{1}{m}\sum_{u=1}^{m} S_u, 2\right)$$
   - Cơ chế phát hiện độ lệch điểm cao ($\text{Spread} = \max_u(S_u) - \min_u(S_u) \ge 3.0 \implies \text{HIGH\_VARIANCE}$).

---

## Cấu trúc Thư mục

```text
├── .specify/                  # Constitution & quy chuẩn Spec-Driven Development
├── specs/                     # 5 bộ đặc tả kỹ thuật (spec.md, plan.md, tasks.md)
│   ├── 001-auth-rbac/
│   ├── 002-requisition-job-setup/
│   ├── 003-apply-and-pipeline/
│   ├── 004-scorecard-evaluation/
│   └── 005-ui-tracking-analytics/
├── backend/                   # NestJS + TypeScript Modular Monolith & 11 Jest Test Suites
├── frontend/                  # React 19 + TypeScript + Vite + Tailwind CSS + Framer Motion (Animate UI)
├── design-system/             # Hệ thống Design Tokens (B2B SaaS Slate/Indigo)
└── docker-compose.yml         # Cấu hình PostgreSQL 16 & môi trường chạy container
```

---

## Hướng dẫn Cài đặt & Khởi chạy

### 1. Chạy Giao diện Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev
```
Truy cập ứng dụng tại: `http://localhost:5173`

### 2. Chạy Kiểm thử & Backend (NestJS + Jest)
```bash
cd backend
npm install
npm test
npm run typecheck
```

### 3. Cấu hình CSDL SQL Server (SSMS)
Hệ thống đi kèm toàn bộ kịch bản T-SQL 13 bảng và nạp dữ liệu mẫu chuẩn enterprise:
1. Mở **SQL Server Management Studio (SSMS)** và kết nối tới `localhost:1433`.
2. Mở file [docs/setup_database_ssms.sql](docs/setup_database_ssms.sql).
3. Bấm **Execute** (`F5`) để tự động tạo cơ sở dữ liệu `ATS_Enterprise_DB` và 13 bảng liên kết khoá ngoại, trigger & dữ liệu mẫu.
4. Quản trị viên có thể theo dõi trạng thái đồng bộ CSDL ngay trên thanh công cụ của Cổng Quản trị (**Admin Portal**).

