# DECISIONS — Các quyết định thiết kế đã chốt (ADR rút gọn)

> File này là nơi chốt mọi điểm mơ hồ trong `PROJECT_SPEC.md` gốc. Khi `spec.md` / `plan.md` mâu thuẫn với file này, **file này thắng** cho tới khi được sửa có chủ đích.

| ID | Chủ đề | Quyết định | Lý do |
|:--|:--|:--|:--|
| D01 | Phạm vi phỏng vấn | Mỗi đơn ứng tuyển có **tối đa 1 buổi phỏng vấn còn hiệu lực** (`status != CANCELLED`) ở vòng `INTERVIEW`, hội đồng 1–5 người. Đổi lịch = huỷ buổi cũ (chỉ khi chưa ai nộp phiếu) + tạo buổi mới. | Tiêu chí chấm gắn theo Job; nhiều buổi sẽ buộc người phỏng vấn chấm tiêu chí không liên quan. Giữ thuật toán đúng như công thức gốc. |
| D02 | Thang điểm & trọng số | Điểm `1.0–5.0`, **bước 0.5**. Trọng số lưu **số nguyên phần trăm**, tổng = 100; khi tính dùng `W_i = weight_percent / 100`. `S` làm tròn 2 chữ số. Ngưỡng đậu mặc định `3.50`. | Loại bỏ lỗi lệch 100 lần; bước 0.5 làm các ngưỡng `≤ 1.5`, `< 2.0` rõ nghĩa. |
| D03 | Thời điểm tính điểm | Mọi chỉ số tổng hợp (`overall_score`, `has_variance_alert`, `is_disqualified`) **chỉ tính khi 100% hội đồng đã nộp phiếu**, trong cùng transaction với phiếu cuối. | Tránh lộ kết quả trước khi mở Blind Lock. |
| D04 | Điểm liệt (Knock-out) | `is_disqualified = true` khi **trung bình** một tiêu chí knock-out `< 2.0`. Nếu chỉ có **cá nhân** chấm `≤ 1.5` ở tiêu chí knock-out (trung bình vẫn ≥ 2.0) ⇒ không loại, nhưng bật `has_variance_alert` (buộc calibration). Calibration **không** gỡ được `is_disqualified`. | Giữ tinh thần "điểm liệt" nhưng không cho 1 người phủ quyết cả hội đồng (trái mục tiêu chống thiên kiến). |
| D05 | Độ lệch (Variance) | `Δ_i = max − min ≥ 2.0` ở bất kỳ tiêu chí ⇒ `has_variance_alert = true` ⇒ **chặn** chuyển sang `OFFER` cho tới khi HR hoặc Hiring Manager của phòng ban ghi **biên bản calibration** (ghi chú ≥ 10 ký tự) ⇒ lưu `calibration_note/calibrated_by/calibrated_at`, cờ được xem là đã xử lý. | Biến "thảo luận lại" thành một bước kiểm soát có dấu vết, demo được. |
| D06 | Sửa phiếu | Phiếu đã nộp **bất biến** (không sửa, không xoá). | Toàn vẹn kiểm toán; calibration xử lý bằng biên bản, không chấm lại. |
| D07 | Cấu hình vòng | Thứ tự vòng **cố định**: `APPLIED → SCREENING → TEST → INTERVIEW → OFFER → HIRED` (+ `REJECTED` ngoài luồng). `SCREENING`, `TEST` là **tuỳ chọn** theo Job; HR được đổi `stage_name` hiển thị. | Đủ "custom pipeline" để demo, nhưng State Machine luôn xác định. |
| D08 | Luật kéo-thả | Chỉ đi **tiến 1 bước** sang vòng kế tiếp trong cấu hình Job (không nhảy vòng, không lùi). Từ mọi vòng chưa kết thúc được chuyển sang `REJECTED` (bắt buộc lý do). `HIRED`, `REJECTED` là trạng thái cuối. | Guard theo cạnh = guard theo đích, không có đường vòng qua guard. |
| D09 | Quét trùng | Thực hiện **khi nộp đơn**. Chuẩn hoá email (`trim + lowercase`) và SĐT (chỉ giữ số, `+84/84` → `0`). Trùng email **hoặc** SĐT ⇒ dùng lại `candidate`, cập nhật CV mới nhất. Đơn được gắn nhãn "Ứng viên cũ" nếu ứng viên có đơn khác. Nộp lại **cùng Job** ⇒ từ chối (`UNIQUE(job_id, candidate_id)`). CV được **snapshot** vào `applications.resume_url`. | Quét lúc chuyển vòng là quá muộn; snapshot giữ đúng CV của từng đợt. |
| D10 | Blind Lock | Khi hội đồng chưa nộp đủ: thành viên hội đồng chỉ thấy **phiếu của chính mình**; HR/Admin/HM (không trong hội đồng) chỉ thấy **tiến độ nộp** (ai đã nộp), không thấy điểm. Nộp đủ ⇒ mọi người có quyền xem đều thấy toàn bộ. | Chặn cả kênh rò rỉ gián tiếp qua HR. |
| D11 | Duyệt Offer | Thêm `applications.offer_approved_by/offer_approved_at`. Khi đơn ở `OFFER`, Hiring Manager phòng ban (hoặc Admin) bấm duyệt. `OFFER → HIRED` yêu cầu đã duyệt. | Hoàn thiện quyền "Offer Approval" của Hiring Manager trong đặc tả gốc. |
| D12 | Chống tuyển lố | `UPDATE job_requisitions SET filled_count = filled_count + 1 WHERE id = ? AND filled_count < headcount` (atomic). `affected = 0` ⇒ rollback. | An toàn với request đồng thời, không cần khoá tường minh. |
| D13 | Tự đóng Job | Khi `filled_count == headcount`: Job và Requisition ⇒ `CLOSED`; mọi đơn `ACTIVE` còn lại ⇒ `REJECTED` (log: "Vị trí đã tuyển đủ"), cùng transaction. Email báo kết quả gửi sau commit. | Không để ứng viên "treo" vô thời hạn. |
| D14 | Requisition ↔ Job | **1 Requisition ↔ 1 Job** (`jobs.requisition_id` UNIQUE). Chỉ tạo Job từ Requisition `APPROVED`. | Headcount không bị chia giữa nhiều Job. |
| D15 | Trang tra cứu công khai | Không lộ tên vòng nội bộ, điểm, lý do loại. Ánh xạ: `APPLIED/SCREENING/TEST` → "Đang xem xét hồ sơ"; `INTERVIEW` → "Mời phỏng vấn" (+ thời gian); `OFFER` → "Đề nghị nhận việc"; `HIRED` → "Trúng tuyển"; `REJECTED` → "Đã có kết quả". | Bảo mật + trải nghiệm ứng viên. |
| D16 | Email | Gửi **sau khi commit** (lỗi gửi mail chỉ ghi log, không rollback nghiệp vụ). Dev dùng **Mailpit** (Docker). Lịch hẹn kèm `.ics`. | Không để hạ tầng ngoài làm hỏng ACID. |
| D17 | Analytics | Funnel = số đơn **từng bước vào** mỗi vòng (đếm `DISTINCT application_id` theo `application_logs.to_stage`). Time-to-Hire = TB(`log HIRED.created_at − applied_at`) theo ngày. | Snapshot hiện tại không phải funnel. |
| D18 | Tech stack & UI System | **Backend:** NestJS 11 + TypeScript + Prisma 6 + PostgreSQL 16 + Jest. **Frontend:** React 19 + Vite + TypeScript + **Tailwind CSS v4 + shadcn/ui (Radix UI) + Animate UI (`motion` / Framer Motion + `@animate-ui/cli`)** + **Bộ quy chuẩn thiết kế `ui-ux-pro-max`** (`design-system/internal-enterprise-ats/MASTER.md`) + Lucide/Phosphor Icons + `@dnd-kit/core` + TanStack Query + Recharts; xem PDF bằng `<iframe>`. **Hạ tầng dev:** Docker Compose (PostgreSQL + Mailpit). | `ui-ux-pro-max` định hình bố cục B2B SaaS chuyên nghiệp (Slate/Indigo, spacing 4/8px, Skeleton, Empty State); `shadcn/ui + Animate UI` cung cấp chuyển động vật lý (spring physics) mượt mà cho Sidebar, Dialog chốt chặn, Tabs trượt và số nhảy Counting Number. |

## Mức ưu tiên phạm vi

| Mức | Nội dung |
|:--|:--|
| **P1 — Lõi (bắt buộc)** | 001 Auth/RBAC · 002 Requisition → Job → Stages/Criteria · 003 Nộp đơn + quét trùng + Kanban State Machine + chống tuyển lố · 004 Scorecard Engine (Blind, S, Δ, Knock-out, Calibration) · test tự động cho thuật toán và guard |
| **P2 — Nên có** | Màn hình chia đôi PDF + Scorecard · Calibration/So sánh ứng viên · Trang tra cứu công khai · Dashboard Funnel + Time-to-Hire |
| **P3 — Nếu còn thời gian** | Email thật kèm `.ics` hoàn chỉnh · Talent pool · Xuất báo cáo |

## Thay đổi so với `PROJECT_SPEC.md` gốc
- Số bảng: **13** (bản gốc ghi nhầm 12).
- Thêm cột vào `applications`: `resume_url`, `offer_approved_by`, `offer_approved_at`, `calibration_note`, `calibrated_by`, `calibrated_at`.
- Quét trùng chuyển từ guard `APPLIED → SCREENING` sang lúc nộp đơn (D09).
- Knock-out cá nhân `≤ 1.5` chuyển từ "loại ngay" sang "buộc calibration" (D04).

