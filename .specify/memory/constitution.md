# Constitution — Internal Enterprise ATS

Các nguyên tắc **không thương lượng** áp dụng cho mọi spec, plan, task và dòng code của dự án. Mọi `plan.md` phải có mục **Constitution Check** đối chiếu với file này.

## I. Modular Monolith theo Domain
- Mã nguồn backend chia theo module nghiệp vụ trong `backend/src/modules/`: `auth`, `recruitment`, `candidate`, `pipeline`, `evaluation`, `analytics`. Hạ tầng dùng chung nằm trong `backend/src/shared/`.
- Mỗi module tự chứa `*.controller.ts`, `*.service.ts`, `dto/`, và chỉ **export service công khai** qua `*.module.ts`.
- Module khác **chỉ** gọi service đã export, **không** truy cập trực tiếp bảng "của" module khác để ghi dữ liệu, trừ khi trong cùng một transaction được điều phối bởi module sở hữu luồng (ví dụ `pipeline` điều phối `HIRED`).
- Cấm phụ thuộc vòng giữa các module. Chiều phụ thuộc cho phép: `auth ← recruitment ← candidate ← pipeline ← evaluation ← analytics`.

## II. Toàn vẹn dữ liệu là trên hết (ACID)
- Mọi thao tác thay đổi nhiều bảng (chuyển vòng, nộp phiếu, chốt tuyển, cấu hình tiêu chí) chạy trong **một transaction** (`prisma.$transaction`).
- Bất biến nghiệp vụ được bảo vệ ở **cả** tầng service (kiểm tra) **và** tầng CSDL (UNIQUE, CHECK, FK) khi có thể.
- Mọi lần chuyển vòng đều ghi `application_logs`. Không có đường tắt cập nhật `current_stage_id` ngoài `PipelineService.transition`.
- Tác vụ hạ tầng bên ngoài (email, file) không được làm rollback nghiệp vụ: thực hiện **sau commit**.

## III. Thuật toán là hàm thuần + Test trước
- Thuật toán chấm điểm (`scoring.engine.ts`) và bảng luật chuyển vòng (`stage-rules.ts`) là **hàm thuần**, không phụ thuộc DB/Nest, để kiểm thử đơn vị.
- Mỗi kịch bản Given–When–Then trong `spec.md` phải có ít nhất **một test tự động** tương ứng, đặt tên test bằng ID kịch bản (ví dụ `S4.2`).
- Viết test cho thuật toán/guard **trước** khi cài đặt (Red → Green).

## IV. Bảo mật & Phân quyền
- Mọi API nội bộ yêu cầu JWT; phân quyền bằng `@Roles(...)` + `RolesGuard`. Kiểm tra **quyền sở hữu dữ liệu** (phòng ban, hội đồng) ở service, không chỉ dựa vào role.
- Không bao giờ trả `password_hash`. Mật khẩu băm bằng bcrypt (cost ≥ 10).
- API công khai chỉ gồm: danh sách/chi tiết Job đã đăng, nộp đơn, tra cứu bằng `tracking_token`. API công khai không lộ dữ liệu nội bộ (D15).
- File upload: chỉ PDF, ≤ 5 MB, tên file do server sinh.

## V. Nguồn sự thật & Truy vết
- `docs/DECISIONS.md` chốt các điểm mơ hồ; `docs/data-model.md` + `backend/prisma/schema.prisma` là nguồn sự thật về dữ liệu.
- Lỗi nghiệp vụ trả về mã lỗi máy đọc được: `{ "statusCode": 4xx, "code": "GUARD_SCORECARDS_INCOMPLETE", "message": "..." }`. Danh sách mã lỗi nằm trong `plan.md` của từng feature.
- Không thêm tính năng ngoài spec khi chưa cập nhật spec.

## VI. Đơn giản cho đồ án 1 người
- Ưu tiên P1 → P2 → P3 theo `docs/DECISIONS.md`. Không tối ưu sớm, không microservice, không message queue.
- Mỗi task trong `tasks.md` phải hoàn thành và kiểm thử được trong ≤ 1 buổi làm việc.

