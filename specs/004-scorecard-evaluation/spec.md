# Feature Spec 004 — Scorecard Engine: Chấm mù, Trọng số, Độ lệch, Điểm liệt, Calibration

**Ưu tiên:** P1 · **Phụ thuộc:** 002, 003 · **Trạng thái:** Approved

## Định nghĩa
Job có *n* tiêu chí, trọng số $W_i = \text{weight\_percent}_i/100$ ($\sum W_i = 1$). Hội đồng *m* người, điểm $P_{i,j} \in \{1.0, 1.5, …, 5.0\}$.
- Trung bình tiêu chí: $\bar P_i = \frac1m\sum_j P_{i,j}$
- Độ lệch: $\Delta_i = \max_j P_{i,j} - \min_j P_{i,j}$
- Điểm tổng: $S = \sum_i W_i \bar P_i$ (làm tròn 2 chữ số)

## User Stories

### US1 (P1) — Người phỏng vấn nộp phiếu độc lập
- **S4.1** — *Given* tôi thuộc hội đồng và chưa nộp, *When* nộp phiếu chấm **đủ mọi tiêu chí** (1.0–5.0, bước 0.5) kèm khuyến nghị, *Then* phiếu được lưu, tôi được đánh dấu đã nộp.
- **S4.2** — *Given* phiếu thiếu tiêu chí, có điểm ngoài thang/không đúng bước 0.5, hoặc tôi không thuộc hội đồng, *When* nộp, *Then* bị từ chối.
- **S4.3** — *Given* tôi đã nộp, *When* nộp lại hoặc sửa, *Then* bị từ chối (phiếu bất biến — D06).
- **S4.4** — *Given* lịch phỏng vấn đã huỷ, *When* nộp phiếu, *Then* bị từ chối.

### US2 (P1) — Chấm mù (Blind Lock)
- **S4.5** — *Given* hội đồng A, B; A đã nộp, B chưa, *When* B xem kết quả đánh giá, *Then* B không thấy điểm/nhận xét của A (chỉ thấy phiếu của mình nếu có).
- **S4.6** — *Given* như S4.5, *When* A xem, *Then* A chỉ thấy phiếu của chính A.
- **S4.7** — *Given* như S4.5, *When* HR xem, *Then* HR chỉ thấy tiến độ "1/2 đã nộp" và ai đã nộp, không thấy điểm.
- **S4.8** — *Given* cả A, B đã nộp, *When* bất kỳ ai có quyền xem, *Then* thấy đầy đủ điểm từng người, trung bình, độ lệch từng tiêu chí và điểm tổng.

### US3 (P1) — Tính điểm khi phiếu cuối được nộp
- **S4.9 (Điểm tổng)** — *Given* tiêu chí "Chuyên môn" 60%, "Giao tiếp" 40%; A chấm 4.0/3.0, B chấm 4.0/4.0, *When* B (người cuối) nộp, *Then* $\bar P$ = 4.0 / 3.5; $S = 0.6·4.0 + 0.4·3.5 = 3.80$; không cảnh báo, không điểm liệt.
- **S4.10 (Độ lệch)** — *Given* tiêu chí "Giải quyết vấn đề"; A chấm 5.0, B chấm 2.0, *When* B nộp, *Then* trung bình tiêu chí 3.50, $\Delta = 3.0 \ge 2.0$ ⇒ bật cảnh báo lệch điểm.
- **S4.11 (Biên lệch)** — *Given* A chấm 4.0, B chấm 2.5 ($\Delta = 1.5$), *Then* **không** cảnh báo; A 4.0, B 2.0 ($\Delta = 2.0$) ⇒ **có** cảnh báo.
- **S4.12 (Điểm liệt tập thể)** — *Given* "Chuyên môn" là tiêu chí điểm liệt; A chấm 2.0, B chấm 1.5 (TB 1.75 < 2.0), *When* B nộp, *Then* ứng viên bị gắn điểm liệt (dù điểm tổng có thể ≥ ngưỡng).
- **S4.13 (Điểm liệt cá nhân)** — *Given* tiêu chí điểm liệt; A chấm 4.0, B chấm 1.5 (TB 2.75), *When* B nộp, *Then* **không** gắn điểm liệt nhưng **bật cảnh báo** (buộc calibration).
- **S4.14 (Chưa đủ phiếu)** — *Given* hội đồng 3 người, mới 2 người nộp (kể cả có điểm 1.0 ở tiêu chí điểm liệt), *Then* chưa có điểm tổng, chưa cờ nào được bật (D03).
- **S4.15** — *Given* phiếu cuối được nộp, *Then* buổi phỏng vấn chuyển Hoàn thành; mọi cập nhật trên xảy ra trong cùng 1 giao dịch với việc lưu phiếu.

### US4 (P1) — Calibration
- **S4.16** — *Given* đơn có cảnh báo lệch điểm, *When* HR hoặc Hiring Manager phòng ban ghi biên bản calibration (≥ 10 ký tự), *Then* cảnh báo được xem là đã xử lý (lưu người ghi, thời điểm) và đơn có thể sang Đề nghị nếu đạt các điều kiện khác.
- **S4.17** — *Given* đơn không có cảnh báo, hoặc chưa đủ phiếu, *When* ghi biên bản, *Then* bị từ chối.
- **S4.18** — *Given* đơn bị điểm liệt, *When* ghi biên bản, *Then* biên bản được lưu nhưng **không** gỡ điểm liệt.

### US5 (P2) — So sánh & xếp hạng ứng viên của Job
- **S4.19** — *Given* Job có nhiều đơn đã chấm đủ, *When* HR mở màn hình so sánh, *Then* thấy bảng xếp hạng theo điểm tổng giảm dần, điểm trung bình từng tiêu chí, tô vàng ô có $\Delta \ge 2.0$, gắn nhãn điểm liệt; đơn chưa chấm đủ hiển thị "Đang chấm" và không lộ điểm.

## Functional Requirements
- **FR-401** Thuật toán chấm là hàm thuần, kết quả xác định với cùng đầu vào.
- **FR-402** So sánh số thập phân chính xác (dùng đơn vị 0.5 → số nguyên hoặc Decimal), tránh sai số dấu phẩy động ở biên 2.0.
- **FR-403** Blind Lock áp dụng ở tầng service cho mọi API trả về điểm (chi tiết đơn, kanban, so sánh).

## Out of Scope
Sửa/rút phiếu, chấm nhiều buổi, trọng số theo người phỏng vấn, chuẩn hoá điểm theo độ "khó tính" của giám khảo.

