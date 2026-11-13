# Feature Spec 002 — Yêu cầu tuyển dụng, Job, Vòng & Tiêu chí chấm

**Ưu tiên:** P1 · **Phụ thuộc:** 001 · **Trạng thái:** Approved

## User Stories

### US1 (P1) — Hiring Manager xin định biên, HR duyệt
- **S2.1** — *Given* Hiring Manager phòng Engineering, *When* tạo yêu cầu tuyển "Backend Developer" số lượng 2, *Then* yêu cầu ở trạng thái Chờ duyệt, đã tuyển 0/2, thuộc phòng Engineering.
- **S2.2** — *Given* yêu cầu Chờ duyệt, *When* HR duyệt, *Then* yêu cầu chuyển Đã duyệt; *When* HR từ chối (kèm lý do), *Then* chuyển Từ chối và không thể tạo Job từ yêu cầu này.
- **S2.3** — *Given* số lượng ≤ 0, *When* tạo yêu cầu, *Then* bị từ chối.

### US2 (P1) — HR tạo Job và cấu hình quy trình
- **S2.4** — *Given* yêu cầu Đã duyệt chưa có Job, *When* HR tạo Job, *Then* Job ở trạng thái Nháp với bộ vòng mặc định đầy đủ (Ứng tuyển, Sàng lọc, Kiểm tra, Phỏng vấn, Đề nghị, Trúng tuyển, Loại) và ngưỡng đậu 3.50.
- **S2.5** — *Given* yêu cầu đã có Job **hoặc** chưa được duyệt, *When* tạo Job, *Then* bị từ chối.
- **S2.6** — *Given* Job Nháp, *When* HR tắt vòng Kiểm tra và đổi tên hiển thị "Phỏng vấn" thành "Phỏng vấn kỹ thuật", *Then* Job còn 6 vòng, thứ tự không đổi; các vòng bắt buộc (Ứng tuyển, Phỏng vấn, Đề nghị, Trúng tuyển, Loại) không thể tắt.
- **S2.7** — *Given* Job đã có đơn ứng tuyển, *When* HR thay đổi vòng hoặc tiêu chí, *Then* bị từ chối (cấu hình bị khoá).

### US3 (P1) — HR cấu hình tiêu chí chấm có trọng số
- **S2.8** — *Given* Job Nháp, *When* lưu 3 tiêu chí 30% + 30% + 30%, *Then* bị từ chối: "Tổng trọng số phải bằng 100%"; dữ liệu tiêu chí cũ giữ nguyên.
- **S2.9** — *Given* Job Nháp, *When* lưu "Chuyên môn 50% (điểm liệt)", "Giải quyết vấn đề 30%", "Giao tiếp 20%", *Then* lưu thành công, thay thế toàn bộ tiêu chí cũ.
- **S2.10** — *Given* bất kỳ, *When* lưu tiêu chí trùng tên trong cùng Job hoặc trọng số ngoài 1–100, *Then* bị từ chối.

### US4 (P1) — Đăng tuyển và trang tuyển dụng công khai
- **S2.11** — *Given* Job Nháp chưa có tiêu chí hợp lệ, *When* đăng tuyển, *Then* bị từ chối và nêu rõ điều kiện còn thiếu.
- **S2.12** — *Given* Job đủ điều kiện (yêu cầu Đã duyệt, tiêu chí tổng 100%), *When* đăng tuyển, *Then* Job hiển thị trên trang tuyển dụng công khai.
- **S2.13** — *Given* khách vãng lai, *When* xem trang tuyển dụng, *Then* chỉ thấy Job Đang đăng, không thấy ngưỡng đậu, tiêu chí, hay thông tin nội bộ.

## Functional Requirements
- **FR-201** 1 yêu cầu tuyển dụng ↔ tối đa 1 Job (D14).
- **FR-202** Thứ tự vòng cố định; Sàng lọc, Kiểm tra là tuỳ chọn (D07).
- **FR-203** Trọng số là số nguyên %, tổng = 100; ngưỡng đậu trong [1.00, 5.00] (D02).
- **FR-204** Hiring Manager chỉ tạo yêu cầu cho phòng ban của mình.
- **FR-205** Job có thể được HR đóng thủ công; Job tự đóng khi đủ định biên (xem 003).

## Out of Scope
Duyệt yêu cầu nhiều cấp, ngân sách lương, sao chép Job, mẫu tiêu chí dùng chung.

