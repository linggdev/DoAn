# Plan 005 — Frontend (`shadcn/ui` + `Animate UI` + `ui-ux-pro-max`) & Analytics

## 1. Technical Context
* **Framework & Build:** React 19 + Vite + TypeScript.
* **Styling & Design System (`ui-ux-pro-max`):**
  * **Tailwind CSS v4** (`@tailwindcss/vite`) cấu hình theo bảng token trong [`design-system/internal-enterprise-ats/MASTER.md`](../../design-system/internal-enterprise-ats/MASTER.md).
  * Font `Plus Jakarta Sans` (giao diện) + `JetBrains Mono` (`tabular-nums` cho mọi điểm số, trọng số, độ lệch).
  * Icon vector đồng nhất từ `lucide-react`.
* **Component & Animation Layer (`shadcn/ui` + `Animate UI`):**
  * Primitives truy cập chuẩn WAI-ARIA từ **Radix UI / shadcn/ui** (`Dialog`, `AlertDialog`, `Tabs`, `Accordion`, `Tooltip`, `Slider`, `Sheet`, `Select`, `Badge`).
  * Chuyển động vật lý bằng **`motion` (Framer Motion)** và bộ thành phần **Animate UI** (`npx @animate-ui/cli@latest animate all` hoặc các wrapper component tương đương trong `src/components/animate-ui/`):
    1. `AnimatedSidebar`: Thu/mở `256px` $\leftrightarrow$ `68px` với spring `stiffness: 320, damping: 30` và `layoutId="sidebar-active-pill"`.
    2. `GuardAlertDialog`: Hộp thoại cảnh báo vi phạm State Guard / Điểm liệt tích hợp keyframe shake `x: [0, -10, 10, -7, 7, -4, 4, 0]`.
    3. `AnimatedTabs` & `AnimatedAccordion`: Chuyển tab có gạch chân/pill trượt bằng `layoutId` và đóng/mở nội dung mượt.
    4. `AnimatedScoreTicker`: Component số nhảy dùng `useSpring` + `useTransform` kết hợp thanh tiến trình tự đổi màu (`emerald` $\to$ `amber` $\to$ `red`) khi chạm ngưỡng điểm liệt $\le 1.5$.
* **State, Drag-and-Drop & Charts:**
  * `@dnd-kit/core` + `@dnd-kit/sortable` cho bảng Kanban kéo-thả.
  * `@tanstack/react-query` + `axios` quản lý trạng thái server.
  * `recharts` cho biểu đồ Conversion Funnel và Time-to-Hire.
  * Xem CV PDF trực tiếp bằng `<iframe src="/api/applications/:id/resume" />`.

## 2. Constitution Check
- [x] I. Backend module `analytics` chỉ đọc dữ liệu tổng hợp; không phá vỡ ranh giới module.
- [x] III. Thuật toán tính Funnel và Time-to-Hire có test tự động kiểm chứng (S5.10, S5.11).
- [x] V. Frontend không tự ý quyết định luật State Guard — luôn gọi API và hiển thị thông báo tiếng Việt chuẩn từ bảng mã lỗi `src/lib/errors.ts`.

## 3. Analytics Backend (`backend/src/modules/analytics`)
| Method | Path | Quyền | Mô tả |
|:--|:--|:--|:--|
| GET | `/api/analytics/funnel?jobId=&departmentId=` | ADMIN, HR, HM(phòng) | Đếm `DISTINCT application_id` từng bước vào mỗi `stage_code` từ `application_logs` (D17) |
| GET | `/api/analytics/time-to-hire?jobId=&departmentId=` | ADMIN, HR, HM(phòng) | Trung bình số ngày từ `applications.applied_at` đến `application_logs(HIRED).created_at` + các KPI tổng quan |

## 4. Cấu trúc thư mục Frontend
```text
frontend/src/
├── components/
│   ├── ui/                      # shadcn/ui primitives (Button, Badge, Card, Slider, Input...)
│   ├── animate-ui/              # 4 thành phần chuyển động cốt lõi:
│   │   ├── animated-sidebar.tsx # Sidebar thu/mở spring + active pill layoutId + Tooltip
│   │   ├── guard-dialog.tsx     # Dialog đặt lịch & Alert Dialog rung khi vi phạm State Guard
│   │   ├── animated-tabs.tsx    # Tabs có thanh gạch chân/pill trượt mượt bằng layoutId
│   │   └── score-ticker.tsx     # Counting Number (useSpring) + Dynamic Color Progress Bar
│   ├── kanban/                  # KanbanBoard, KanbanColumn, CandidateCard (@dnd-kit)
│   └── layout/                  # AppShell, RoleBadge, QuickSwitchDemoUser
├── api/                         # Axios client + TanStack Query hooks
├── auth/                        # AuthContext, ProtectedRoute theo RBAC
├── lib/                         # errors.ts (ánh xạ mã lỗi Backend -> tiếng Việt), utils.ts (cn)
└── pages/
    ├── login-page.tsx
    ├── requisitions-page.tsx
    ├── jobs-page.tsx
    ├── job-setup-page.tsx
    ├── kanban-pipeline-page.tsx
    ├── split-evaluation-page.tsx
    ├── calibration-comparison-page.tsx
    ├── analytics-dashboard-page.tsx
    ├── admin-page.tsx
    └── public/                  # careers-page.tsx, job-apply-page.tsx, tracking-page.tsx
```
