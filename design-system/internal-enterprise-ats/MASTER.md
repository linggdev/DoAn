# Design System Master File — Internal Enterprise ATS (`ui-ux-pro-max` + `Animate UI`)

> **LOGIC (`ui-ux-pro-max` Hierarchical Retrieval):**
> Khi xây dựng bất kỳ trang hoặc component nào của dự án, bắt buộc đọc file `MASTER.md` này trước. Nếu có file `design-system/internal-enterprise-ats/pages/[page-name].md` thì ưu tiên quy tắc trang đó, nếu không thì tuân thủ tuyệt đối các quy chuẩn dưới đây.

---

**Project:** Internal Enterprise ATS & Candidate Evaluation Platform  
**Architecture UI:** `ui-ux-pro-max` (B2B SaaS Layout & Tokens) + `shadcn/ui` (Radix Primitives) + `Animate UI` (`motion/react` Spring Physics)  
**Design Dials:** Variance `5/10` (Balanced B2B SaaS) | Motion `6/10` (Spring Micro-interactions) | Density `8/10` (Dense Enterprise Workspace)

---

## 1. Phân Vai Chiến Lược: `ui-ux-pro-max` × `Animate UI`

| Thành phần | Trách nhiệm của `ui-ux-pro-max` (Tĩnh & Cấu trúc) | Trách nhiệm của `Animate UI` + `motion` (Động & Cảm xúc) |
| :--- | :--- | :--- |
| **Bố cục & Khung (App Shell)** | Hệ lưới 4px/8px (`--space-*`), mật độ thông tin cao vừa đủ, phân cấp chữ `Plus Jakarta Sans`, hệ màu Slate/Indigo chuẩn B2B SaaS (như Linear, Greenhouse, Ashby). | **Animated Collapsible Sidebar:** Thu/mở từ `256px` $\leftrightarrow$ `68px` bằng lò xo vật lý (`stiffness: 320, damping: 30`), nhãn chữ mờ dần không gây giật bố cục. |
| **Bảng Kanban & Chốt chặn** | Thẻ ứng viên gọn gàng, phân tách rõ Badge trạng thái, Skeleton khi tải cột, Empty State có hướng dẫn khi cột trống. | **Animated Dialog & Guard Shake:** Modal đặt lịch bung mượt; khi vi phạm State Guard / Điểm liệt, hộp thoại cảnh báo **rung ngang vật lý (`x: [0, -10, 10, -6, 6, 0]`)**. |
| **Màn hình Chấm điểm Chia đôi (Split-Screen)** | Tỷ lệ 50/50 (hoặc 55/45) giữa khung PDF CV bên trái và biểu mẫu Scorecard bên phải; thanh cuộn độc lập, header cố định. | **Sliding Tabs & Accordion:** Thanh gạch chân/pill của Tabs (`Xem CV`, `Scorecard`, `Lịch sử`) trượt mượt bằng `layoutId`; Accordion tiêu chí đóng/mở mượt. |
| **Phiếu chấm & Điểm tổng kết ($S$)** | Bố cục thanh trượt rõ ràng (`1.0` $\to$ `5.0`, bước `0.5`), hiển thị trọng số `%` bằng font monospace `JetBrains Mono`. | **Counting Number & Dynamic Color Progress:** Điểm tổng kết $S$ nhảy số mượt theo thời gian thực (`useSpring`), thanh tiến trình tự đổi màu **Xanh $\to$ Vàng $\to$ Đỏ** khi chạm ngưỡng điểm liệt $\le 1.5$. |

---

## 2. Hệ Màu Chuẩn B2B SaaS (Semantic Color Tokens)

Tuyệt đối không dùng màu lòe loẹt tự phát. Sử dụng bảng màu **Slate + Indigo/Royal Blue + Semantic Status**:

| Vai trò (Token) | Hex (Light Mode) | Tailwind / CSS Variable | Ý nghĩa nghiệp vụ trong ATS |
| :--- | :--- | :--- | :--- |
| **Background (App Canvas)** | `#F8FAFC` | `bg-slate-50` / `--color-background` | Nền tổng thể vùng làm việc & nền bảng Kanban |
| **Surface / Card** | `#FFFFFF` | `bg-white` / `--color-card` | Thẻ ứng viên Kanban, khung phiếu chấm, bảng dữ liệu |
| **Sidebar / Elevated Surface** | `#0F172A` | `bg-slate-900` | Thanh điều hướng Admin/HR bên trái (tạo độ tương phản chuyên nghiệp) |
| **Foreground (Primary Text)** | `#0F172A` | `text-slate-900` / `--color-foreground` | Tiêu đề, họ tên ứng viên, điểm tổng kết |
| **Muted Foreground** | `#475569` | `text-slate-600` / `--color-muted-foreground` | Email, SĐT, thời gian nộp, nhãn phụ (đảm bảo tương phản $\ge 4.5:1$) |
| **Primary (Brand Action)** | `#2563EB` | `bg-blue-600` / `indigo-600` | Nút hành động chính, Tab đang chọn, thanh trượt điểm bình thường |
| **Success (Pass / Hired)** | `#059669` | `bg-emerald-600` (`bg-emerald-50 text-emerald-700`) | Điểm đạt ngưỡng ($S \ge \text{Threshold}$), trạng thái `HIRED`, `Offer Approved` |
| **Warning (Variance Alert)** | `#D97706` | `bg-amber-600` (`bg-amber-50 text-amber-800 border-amber-300`) | Cảnh báo lệch điểm giám khảo ($\Delta_i \ge 2.0$), nhãn `"Ứng viên cũ"` |
| **Destructive (Knock-out)** | `#DC2626` | `bg-red-600` (`bg-red-50 text-red-700 border-red-300`) | Vi phạm **Điểm liệt (`isKnockout`)**, trạng thái `REJECTED`, lỗi State Guard |
| **Border & Divider** | `#E2E8F0` | `border-slate-200` / `--color-border` | Viền thẻ Kanban, đường chia đôi màn hình Split-Screen |

---

## 3. Typography & Spacing Scale (Quy chuẩn `ui-ux-pro-max`)

### 3.1. Font chữ
* **UI & Heading Font:** `Plus Jakarta Sans` (hoặc `Inter` fallback) — Hiện đại, rõ nét ở kích thước nhỏ trên bảng Kanban và bảng so sánh.
* **Numeric / Score Font:** `JetBrains Mono` (hoặc `tabular-nums`) — Bắt buộc bật `font-variant-numeric: tabular-nums` cho mọi con số: điểm số (`3.80`), trọng số (`50%`), định biên (`1/2`), độ lệch (`Δ 3.0`) để khi số nhảy không bị rung lắc chiều ngang.

```css
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
```

### 3.2. Tỷ lệ khoảng trắng 4px/8px (Density `8/10`)
* `--space-xs`: `4px` (`gap-1`) — Khoảng cách giữa icon và nhãn trong Badge.
* `--space-sm`: `8px` (`gap-2`, `p-2`) — Khoảng cách giữa các thẻ ứng viên trong cột Kanban.
* `--space-md`: `12px` (`p-3`) — Padding bên trong thẻ ứng viên Kanban.
* `--space-lg`: `16px` (`p-4`, `gap-4`) — Khoảng cách giữa các cột Kanban và padding khung Scorecard.
* `--space-xl`: `24px` (`p-6`) — Padding vùng nội dung chính của trang.

---

## 4. Đặc Tả 4 Component Chuyển Động "Ăn Tiền" (`Animate UI` + `shadcn/ui`)

Khi khởi tạo Frontend, sử dụng `shadcn/ui` kết hợp `motion` (`framer-motion`) và CLI `@animate-ui/cli`:

```bash
npx @animate-ui/cli@latest animate all
```

### 4.1. Component 1: Admin Sidebar Thu/Mở Mượt Mà (`AnimatedSidebar`)
* **Hành vi:** Chuyển đổi giữa trạng thái mở rộng (`width: 256px`) và thu gọn chỉ còn icon (`width: 68px`).
* **Thông số vật lý:**
  ```tsx
  transition={{ type: 'spring', stiffness: 320, damping: 30, mass: 0.8 }}
  ```
* **Chi tiết tinh tế:**
  * Mục đang chọn có nền sáng trượt dọc theo menu bằng `<motion.div layoutId="sidebar-active-pill" />`.
  * Khi thu gọn, di chuột vào icon sẽ bật `Animate UI Tooltip` với độ trễ `100ms`.

### 4.2. Component 2: Hộp Thoại Đặt Lịch & Cảnh Báo Chốt Chặn (`GuardAlertDialog`)
* **Hành vi 1 (Mở Modal đặt lịch tự động):** Khi HR kéo thẻ ứng viên vào cột `INTERVIEW` mà thiếu lịch hẹn (`GUARD_INTERVIEW_REQUIRED`), thẻ quay về vị trí cũ mượt mà đồng thời Dialog đặt lịch bung ra từ tâm màn hình (`scale: 0.94 -> 1`, `opacity: 0 -> 1`, spring `stiffness: 380, damping: 28`).
* **Hành vi 2 (Rung cảnh báo khi vi phạm State Guard / Điểm liệt):** Khi HR kéo thẻ vi phạm điều kiện (ví dụ: chưa nộp đủ phiếu `GUARD_SCORECARDS_INCOMPLETE`, dính điểm liệt `GUARD_DISQUALIFIED`, hoặc lệch điểm chưa Calibration `GUARD_VARIANCE_UNRESOLVED`), hộp thoại cảnh báo hiển thị lý do chi tiết kèm hiệu ứng **rung ngang (Shake Keyframes)**:
  ```tsx
  animate={{ x: [0, -10, 10, -7, 7, -4, 4, 0] }}
  transition={{ duration: 0.45, ease: 'easeInOut' }}
  ```

### 4.3. Component 3: Tabs Gạch Chân Trượt & Accordion (`AnimatedTabs` / `AnimatedAccordion`)
* **Ứng dụng:** Trong màn hình Split-Screen Evaluation và Chi tiết ứng viên (`Xem CV PDF` | `Phiếu chấm điểm` | `Lịch sử luân chuyển`).
* **Cơ chế:** Sử dụng Radix `<Tabs.Root>` bọc bởi `motion.div` với `layoutId="active-tab-indicator"` cho thanh gạch chân hoặc pill nền, giúp thanh chỉ báo trượt mượt từ tab này sang tab kia thay vì biến mất rồi hiện lại.

### 4.4. Component 4: Số Nhảy Điểm Tổng Kết $S$ & Thanh Tiến Trình Đổi Màu (`AnimatedScoreTicker`)
* **Ứng dụng:** Header của phiếu chấm điểm (Scorecard) bên phải màn hình Split-Screen.
* **Cơ chế:**
  * Dùng `useSpring` và `useTransform` (từ `motion/react`) để nội suy giá trị điểm tổng kết dự kiến $S \in [1.00, 5.00]$ mỗi khi người phỏng vấn kéo thanh trượt tiêu chí.
  * Sử dụng class `tabular-nums font-mono` để các chữ số nhảy mượt mà không làm dịch chuyển chữ bên cạnh.
  * **Đổi màu động theo ngữ cảnh nghiệp vụ:**
    * Nếu có bất kỳ tiêu chí `isKnockout` nào bị kéo xuống $\le 1.5$: Thanh tiến trình và khung điểm chuyển ngay sang màu **Đỏ (`#DC2626`)** kèm nhãn cảnh báo `"CẢNH BÁO ĐIỂM LIỆT (KNOCK-OUT)"`.
    * Nếu không dính điểm liệt và $S \ge \text{passScoreThreshold}$: Màu **Xanh lục (`#059669`)**.
    * Nếu $S < \text{passScoreThreshold}$: Màu **Vàng cam (`#D97706`)**.

---

## 5. Checklist Kiểm Duyệt Giao Diện Trước Khi Hoàn Thành Task (`Pre-Delivery Gate`)

- [ ] **Không dùng Emoji làm icon hệ thống:** 100% dùng vector icon từ `lucide-react` hoặc `@phosphor-icons/react` với `strokeWidth={1.75}` đồng nhất.
- [ ] **Có đầy đủ trạng thái Loading & Empty State:** Bảng Kanban và Dashboard khi đang tải phải hiện `Skeleton` đồng bộ kích thước; cột Kanban trống phải có khung viền nét đứt (`border-dashed`) gọn gàng.
- [ ] **Số liệu dùng `tabular-nums`:** Mọi điểm số ($S$, $\bar{P}_i$, $\Delta_i$), phần trăm trọng số (`50%`) và định biên (`1/2`) đều có class `tabular-nums`.
- [ ] **Tôn trọng `prefers-reduced-motion`:** Nếu hệ điều hành bật giảm chuyển động, bỏ qua hiệu ứng shake/spring dài và hiển thị trạng thái đích ngay lập tức.
