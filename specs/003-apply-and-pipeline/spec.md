# Feature Spec 003 — Nộp đơn, Quét trùng, Lịch phỏng vấn & Kanban State Machine

**Ưu tiên:** P1 · **Phụ thuộc:** 001, 002 · **Trạng thái:** Approved

## User Stories

### US1 (P1) — Ứng viên nộp đơn không cần tài khoản
- **S3.1** — *Given* Job Đang đăng, *When* ứng viên nộp họ tên, email, SĐT và CV PDF, *Then* đơn được tạo ở vòng Ứng tuyển, ứng viên nhận mã tra cứu (đường dẫn tra cứu), lịch sử ghi nhận bước nộp đơn.
- **S3.2** — *Given* file không phải PDF hoặc > 5 MB, *When* nộp, *Then* bị từ chối.
- **S3.3** — *Given* Job Nháp hoặc Đã đóng, *When* nộp, *Then* bị từ chối.

### US2 (P1) — Quét trùng ứng viên
- **S3.4** — *Given* ứng viên đã tồn tại với email `An.Nguyen@Mail.com`, *When* có đơn mới vào Job khác với email ` an.nguyen@mail.com ` (khác hoa/thường, có khoảng trắng), *Then* hệ thống nhận ra là cùng 1 ứng viên, cập nhật CV mới nhất, và đơn mới được gắn nhãn "Ứng viên cũ" kèm danh sách đơn trước đó.
- **S3.5** — *Given* ứng viên đã tồn tại với SĐT `0912345678`, *When* có đơn mới với SĐT `+84 912-345-678` và email khác, *Then* nhận ra là cùng ứng viên (như S3.4).
- **S3.6** — *Given* ứng viên đã có đơn ở Job X, *When* nộp lại vào Job X, *Then* bị từ chối "Bạn đã ứng tuyển vị trí này".
- **S3.7** — *Given* ứng viên nộp đơn lần 2 với CV mới, *When* HR xem đơn lần 1, *Then* vẫn thấy đúng CV đã nộp ở lần 1.

### US3 (P1) — HR điều phối trên Kanban (State Machine)
- **S3.8** — *Given* đơn ở Ứng tuyển và Job có vòng Sàng lọc, *When* HR kéo sang Sàng lọc, *Then* chuyển thành công và ghi lịch sử (từ, đến, ai, lúc nào).
- **S3.9** — *Given* đơn ở Ứng tuyển, *When* HR kéo thẳng sang Phỏng vấn (bỏ qua Sàng lọc đang bật) hoặc kéo lùi, *Then* bị từ chối "Chỉ được chuyển tới vòng kế tiếp".
- **S3.10** — *Given* đơn ở bất kỳ vòng chưa kết thúc, *When* HR chuyển sang Loại **không** nhập lý do, *Then* bị từ chối; có lý do ⇒ thành công, đơn ở trạng thái Bị loại.
- **S3.11** — *Given* đơn đã Trúng tuyển hoặc Bị loại, *When* HR kéo đi bất kỳ đâu, *Then* bị từ chối.

### US4 (P1) — Guard vào vòng Phỏng vấn
- **S3.12** — *Given* đơn ở vòng ngay trước Phỏng vấn và **chưa** có lịch phỏng vấn, *When* HR kéo sang Phỏng vấn, *Then* bị từ chối "Cần tạo lịch phỏng vấn"; giao diện mở form tạo lịch.
- **S3.13** — *Given* HR tạo lịch phỏng vấn (thời gian tương lai, thời lượng, link/địa điểm, 1–5 người phỏng vấn), *When* kéo sang Phỏng vấn, *Then* thành công; ứng viên và hội đồng nhận email kèm lịch `.ics`.
- **S3.14** — *Given* đơn đã có 1 lịch phỏng vấn còn hiệu lực, *When* tạo thêm lịch, *Then* bị từ chối; muốn đổi phải huỷ lịch cũ (chỉ khi chưa ai nộp phiếu).

### US5 (P1) — Guard vào vòng Đề nghị (Offer)
- **S3.15** — *Given* hội đồng 2 người mới nộp 1 phiếu, *When* kéo sang Đề nghị, *Then* bị từ chối "Còn 1 người chưa nộp phiếu".
- **S3.16** — *Given* đã nộp đủ nhưng bị điểm liệt, *When* kéo sang Đề nghị, *Then* bị từ chối "Ứng viên vi phạm tiêu chí điểm liệt".
- **S3.17** — *Given* đã nộp đủ, có cảnh báo lệch điểm **chưa** có biên bản calibration, *When* kéo sang Đề nghị, *Then* bị từ chối "Cần họp calibration".
- **S3.18** — *Given* đã nộp đủ, không điểm liệt, cảnh báo đã xử lý (hoặc không có), điểm tổng 3.40 < ngưỡng 3.50, *When* kéo sang Đề nghị, *Then* bị từ chối "Điểm tổng chưa đạt ngưỡng"; điểm 3.80 ⇒ thành công.

### US6 (P1) — Duyệt Offer và chốt tuyển
- **S3.19** — *Given* đơn ở Đề nghị chưa được Hiring Manager duyệt, *When* HR kéo sang Trúng tuyển, *Then* bị từ chối "Offer chưa được duyệt".
- **S3.20** — *Given* Hiring Manager phòng ban duyệt Offer, *When* HR kéo sang Trúng tuyển với định biên 2, đã tuyển 0, *Then* thành công, đã tuyển 1/2, Job vẫn Đang đăng.
- **S3.21** — *Given* định biên 2, đã tuyển 1, còn 3 đơn đang xử lý khác, *When* HR chốt thêm 1 người, *Then* trong cùng một giao dịch: đã tuyển 2/2, Job và yêu cầu tuyển dụng Đã đóng, 3 đơn còn lại chuyển Bị loại với lý do "Vị trí đã tuyển đủ".
- **S3.22** — *Given* định biên còn đúng 1 chỗ, *When* 2 HR **đồng thời** chốt 2 ứng viên khác nhau, *Then* chỉ 1 thành công, người còn lại bị từ chối "Đã tuyển đủ định biên"; số đã tuyển không bao giờ vượt định biên.

## Functional Requirements
- **FR-301** Chuẩn hoá & quét trùng theo D09 (ưu tiên khớp email trước, sau đó SĐT).
- **FR-302** Mọi chuyển vòng đi qua một điểm duy nhất và chạy trong 1 giao dịch; thất bại ⇒ không có thay đổi nào được lưu.
- **FR-303** Luật kéo-thả theo D08; guard theo bảng dưới.
- **FR-304** Email gửi sau khi giao dịch thành công; lỗi email không làm hỏng chuyển vòng (D16).
- **FR-305** Kanban hiển thị mỗi thẻ: tên, nhãn "Ứng viên cũ", điểm tổng (nếu có), cờ lệch điểm, cờ điểm liệt, trạng thái duyệt Offer.

| Vào vòng | Điều kiện (tất cả phải đúng) |
|:--|:--|
| SCREENING / TEST | là vòng kế tiếp |
| INTERVIEW | là vòng kế tiếp · có 1 lịch phỏng vấn `SCHEDULED` với ≥ 1 người phỏng vấn |
| OFFER | là vòng kế tiếp · 100% hội đồng đã nộp phiếu · không điểm liệt · cảnh báo lệch (nếu có) đã có biên bản calibration · điểm tổng ≥ ngưỡng |
| HIRED | là vòng kế tiếp · Offer đã được duyệt · tăng số đã tuyển nguyên tử còn chỗ (D12) · tự đóng Job nếu đủ (D13) |
| REJECTED | đơn chưa ở trạng thái cuối · có lý do |

## Success Criteria
- Mỗi guard có ≥ 1 test chặn và ≥ 1 test cho qua.
- Test đồng thời S3.22 chạy 10 lần liên tiếp đều đúng.

## Out of Scope
Nhiều buổi phỏng vấn/đơn, tự động gợi ý lịch trống, tích hợp Google Calendar, ứng viên tự huỷ đơn.

