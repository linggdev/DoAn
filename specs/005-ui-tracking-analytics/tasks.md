# Tasks 005 — Frontend High-Craft SaaS (`ui-ux-pro-max` + `Animate UI`), 5 Role Portals & Analytics (V2)

## Phase 1 — Backend Analytics Module
- [x] T035 [Test] `analytics.service.spec.ts` kiểm tra S5.10 (Funnel tính từ `DISTINCT application_id` trong `application_logs`) và S5.11 (Average Time-to-Hire) — **PASS**
- [x] T036 Xây dựng `AnalyticsModule` (`GET /api/analytics/funnel`, `GET /api/analytics/time-to-hire`)

## Phase 2 — Khởi tạo Frontend, Design Tokens (`ui-ux-pro-max`) & Bộ `Animate UI`
- [x] T037 Khởi tạo Vite + React + TypeScript + Tailwind CSS + `lucide-react` + `motion` + `@dnd-kit/core` + Radix UI primitives; cấu hình font `Plus Jakarta Sans` & `JetBrains Mono` (`tabular-nums`) và bảng màu trong `MASTER.md`
- [x] T038 Xây dựng 4 component `Animate UI` cốt lõi trong `src/components/animate-ui/`:
  - `animated-sidebar.tsx` (Sidebar thu/mở spring + active pill `layoutId` + Tooltip + cấu hình menu động `ROLE_NAV_CONFIG` & accent theme riêng cho 5 Role)
  - `guard-dialog.tsx` (Dialog đặt lịch & Alert Dialog rung ngang `shake` khi vi phạm State Guard / Điểm liệt)
  - `animated-tabs.tsx` (Tabs gạch chân trượt `layoutId` & Animated Accordion)
  - `score-ticker.tsx` (`Counting Number` nhảy số mượt bằng `useSpring` + thanh tiến trình đổi màu Xanh/Vàng/Đỏ)
- [x] T039 Xây dựng Màn hình **Split-Screen Login & Register** (`/login`, `/register` với chọn vai trò, validation, thẻ Demo 1-click 5 Role) + App Shell có Topbar Role Switcher & nút Đăng xuất

## Phase 3 — 5 Giao diện Cổng thông tin riêng biệt theo từng Role (5 Dedicated Role Portals)
- [x] T040 **Portal 1 — `ADMIN` (Quản trị hệ thống)**: Quản lý người dùng & gán Role, Quản lý phòng ban, Cấu hình ngưỡng hệ thống (`VARIANCE_THRESHOLD`, `KNOCKOUT_SCORE`, `DEDUP_MONTHS`) & Nhật ký Audit Log
- [x] T041 **Portal 2 — `HIRING_MANAGER` (Trưởng phòng chuyên môn)**: Tạo & phê duyệt Phiếu yêu cầu định biên (`headcount`), Phê duyệt quyết định tuyển dụng (`Calibration`) và Giám sát hiệu suất tuyển dụng của phòng ban
- [x] T042 **Portal 3 — `HR` (Chuyên viên Tuyển dụng - TA)**: Bảng Kanban kéo thả thực tế bằng chuột (`@dnd-kit/core` + State Machine Guards + `GuardAlertDialog` rung cảnh báo), Thiết lập Job & Trọng số tiêu chí (`100%`), Đặt lịch phỏng vấn `.ics`, Mở khóa Calibration
- [x] T043 **Portal 4 — `INTERVIEWER` (Hội đồng Phỏng vấn)**: Hàng đợi phỏng vấn cá nhân + Màn hình **Split-Screen Blind Evaluation** (Xem CV/JD + Thanh trượt bước `0.5` + `AnimatedScoreTicker` nhảy điểm $S$ & cảnh báo Điểm liệt $\le 1.5$ + Chế độ Chấm điểm mù `Blind Lock`)
- [x] T044 **Portal 5 — `CANDIDATE` (Cổng Ứng viên)**: Khám phá việc làm đang mở, Nộp hồ sơ ứng tuyển (kèm kiểm tra chống trùng CV 6 tháng) và Theo dõi tiến độ hồ sơ trực quan theo thời gian thực (Stepper 4 bước & lịch phỏng vấn)
- [x] T045 **Analytics Dashboard**: Biểu đồ Historical Conversion Funnel & Average Time-to-Hire
