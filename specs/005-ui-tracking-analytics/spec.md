# Feature Spec 005 — Giao diện Multi-Portal Theo 5 Role (`ui-ux-pro-max` + `Animate UI`), Đăng nhập/Đăng ký & Analytics

**Ưu tiên:** P1 · **Phụ thuộc:** 001–004 · **Trạng thái:** Approved (V2 — 5 Dedicated Role Portals & High-Craft SaaS UI)

## 1. Kiến trúc Đa Giao diện theo Vai trò (5 Role-Dedicated Portals)

Thay vì dùng chung một giao diện cho tất cả người dùng, hệ thống tách biệt hoàn toàn thành **Màn hình Xác thực (`/login` & `/register`)** và **5 Portal độc lập** tương ứng với 5 Role:

| Role | Tên Portal & Chủ đề màu (Accent Theme) | Bộ Menu Điều hướng Riêng (Role Sidebar) |
| :--- | :--- | :--- |
| **`ADMIN`** | **Admin Command Center**<br/>*(Slate / Amber Accent)* | 1. `Quản lý Tài khoản & Phân quyền (Users & RBAC)`<br/>2. `Cơ cấu Phòng ban & Trưởng phòng (Departments)`<br/>3. `Nhật ký Kiểm toán Hệ thống (Audit Logs)` |
| **`HIRING_MANAGER`** | **Department Hiring Workspace**<br/>*(Emerald / Teal Accent)* | 1. `Hàng đợi Duyệt Offer (Pending Offer Approvals)` *(Mặc định)*<br/>2. `Yêu cầu Định biên Phòng ban (My Requisitions)`<br/>3. `Họp Calibration Phòng ban (Δ ≥ 2.0)`<br/>4. `Chấm điểm Phỏng vấn Chuyên môn` |
| **`HR`** | **HR Recruitment Operations Hub**<br/>*(Royal Blue / Indigo Accent)* | 1. `Bảng Kanban Điều phối (Drag & Drop FSM)` *(Mặc định)*<br/>2. `Duyệt Định biên & Thiết kế Job (Stages & Criteria 100%)`<br/>3. `So sánh Ứng viên & Calibration`<br/>4. `Phễu Chuyển đổi & Time-to-Hire Analytics` |
| **`INTERVIEWER`** | **Interviewer Evaluation Studio**<br/>*(Violet / Purple Accent)* | 1. `Lịch Phỏng vấn Được giao (My Assigned Interviews)` *(Mặc định)*<br/>2. `Split-Screen Evaluation Studio (PDF CV + Scorecard)` |
| **`CANDIDATE`** | **Candidate Career & Tracking Portal**<br/>*(Sky / Cyan Accent)* | 1. `Khám phá Việc làm & Nộp CV (Career Explorer)` *(Mặc định)*<br/>2. `Đơn Ứng tuyển của Tôi (Stepper 4 bước)`<br/>3. `Tra cứu Nhanh bằng Mã Magic Link (/track/:token)` |

---

## 2. User Stories & Acceptance Scenarios

### US1 (P1) — Màn hình Đăng nhập & Đăng ký High-Craft (`/login` & `/register`) — Bắt buộc Xác thực Thực sự
- **S5.1** — *Given* người dùng chưa đăng nhập, *When* mở ứng dụng, *Then* hiển thị màn hình Split-Screen Auth hiện đại:
  - Bên trái: Bảng giới thiệu trực quan hệ thống **Internal Enterprise ATS** trên nền tối Glassmorphism (`bg-slate-950`) với 4 trụ cột nghiệp vụ và bảng tra cứu thông tin tài khoản mẫu theo từng phòng ban (chỉ hiển thị thông tin để người dùng nhập đăng nhập, **không cho phép vào thẳng không cần đăng nhập**).
  - Bên phải: Biểu mẫu chuyển đổi mượt mà giữa **"Đăng nhập"** và **"Đăng ký tài khoản mới"** bằng `AnimatedTabsList` (`layoutId`).
- **S5.2** — *Given* người dùng đăng ký tài khoản mới hoặc đăng nhập hợp lệ, *Then* hệ thống lưu phiên đăng nhập bền vững (`localStorage`) và chuyển vào **đúng Portal riêng của Role được gán cho tài khoản đó**. Trên Header/Sidebar **không có nút đổi nhanh Role** — tài khoản thuộc Role nào thì cố định ở giao diện Role đó cho đến khi bấm **Đăng xuất**.

### US2 (P1) — Giao diện Riêng cho từng Role & Phân quyền Thao tác Thực sự
- **S5.3 (`ADMIN` Portal):** Admin có thể thêm tài khoản nhân sự mới, đổi trạng thái `ACTIVE`/`INACTIVE`, tạo phòng ban mới, gán `Hiring Manager` cho phòng ban và xem toàn bộ lịch sử `application_logs`.
- **S5.4 (`HIRING_MANAGER` Portal):** Hiring Manager có màn hình **Hàng đợi Duyệt Offer** riêng biệt hiển thị các ứng viên đang ở vòng `OFFER`, bấm **Phê duyệt Offer** (hoặc Từ chối) để mở khóa cho HR chốt `HIRED`; tạo `Job Requisition` mới kèm `headcount`.
- **S5.5 (`HR` Portal & Kéo-thả Kanban thật `@dnd-kit/core`):** HR có thể **dùng chuột kéo-thả trực tiếp thẻ ứng viên** giữa các cột Kanban (hoặc bấm nút chuyển vòng). Nếu vi phạm bất kỳ **State Guard** nào, thẻ quay về cột cũ và bật `GuardAlertDialog` rung ngang.
- **S5.6 (`INTERVIEWER` Portal & Split-Screen Studio):** Interviewer chỉ thấy các buổi phỏng vấn được phân công cho mình; khi mở **Split-Screen Studio**, nửa trái hiển thị CV PDF + trạng thái **Blind Lock**, nửa phải là thanh trượt Scorecard bước `0.5` với `AnimatedScoreTicker` nhảy điểm $S$ và đổi màu đỏ khi chạm ngưỡng Điểm liệt ($\le 1.5$).
- **S5.7 (`CANDIDATE` Portal):** Ứng viên đăng nhập (hoặc vừa đăng ký) có thể xem các vị trí đang tuyển, nộp CV PDF (tự động điền sẵn Họ tên/Email/SĐT từ tài khoản, kiểm tra chống nộp trùng cùng Job và quét trùng lịch sử `D09`), và xem tiến trình 4 bước của các đơn đã nộp.
