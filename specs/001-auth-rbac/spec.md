# Feature Spec 001 — Đăng nhập, Đăng ký, Phân quyền RBAC & Quản trị Phòng ban (5 Roles)

**Ưu tiên:** P1 · **Phụ thuộc:** không · **Trạng thái:** Approved (V2 — Multi-Portal RBAC)

## 1. Hệ thống 5 Vai trò (Roles) & Không gian làm việc riêng (Role Portals)

Mỗi người dùng sau khi **Đăng nhập (`/login`)** hoặc **Đăng ký (`/register`)** sẽ được điều hướng vào **Giao diện riêng (Role Portal)** với thanh điều hướng (Sidebar), bảng chỉ số (Bento KPI) và quyền thao tác độc lập:

| Mã Role (`enum Role`) | Tên Giao diện riêng (Portal) | Trách nhiệm & Quyền hạn cốt lõi |
| :--- | :--- | :--- |
| **`ADMIN`** | **Admin Command Center** | Quản trị toàn hệ thống: Quản lý tài khoản (`users`), cấp/đổi Role, khóa/mở khóa tài khoản, quản lý cơ cấu Phòng ban (`departments`), gán Trưởng phòng (`manager_id`), giám sát Nhật ký kiểm toán (`application_logs`). |
| **`HIRING_MANAGER`** | **Department Hiring Workspace** | Trưởng bộ phận chuyên môn: Tạo yêu cầu định biên (`Job Requisition` kèm `headcount`) cho phòng mình, **Phê duyệt hoặc Từ chối Offer (`Offer Approval`)**, tham gia chấm phỏng vấn và họp Calibration của phòng ban. |
| **`HR`** | **HR Recruitment Operations Hub** | Chuyên viên tuyển dụng: Duyệt `Job Requisition`, thiết kế & đăng `Job Posting` (cấu hình vòng & tiêu chí chấm tổng = 100%), kéo-thả ứng viên trên bảng Kanban, xếp lịch phỏng vấn (`.ics`), chủ trì Calibration và xem Dashboard Funnel/Time-to-Hire. |
| **`INTERVIEWER`** | **Interviewer Evaluation Studio** | Giám khảo chuyên môn: Xem danh sách lịch phỏng vấn được phân công, chấm điểm độc lập trên **Split-Screen Studio (PDF CV + Scorecard)** dưới sự kiểm soát của **Blind Evaluation Lock**. |
| **`CANDIDATE`** | **Candidate Career & Tracking Portal** | Ứng viên: Đăng ký/Đăng nhập để khám phá việc làm đang mở, nộp hồ sơ CV PDF (tự động điền thông tin & quét trùng lặp), theo dõi toàn bộ đơn đã nộp qua thanh tiến trình 4 bước và tra cứu bằng mã `tracking_token`. |

---

## 2. User Stories & Acceptance Scenarios (Given - When - Then)

### US1 (P1) — Đăng ký tài khoản mới (`/register`)
- **S1.1 (Đăng ký thành công):**
  - *Given* người dùng mở màn hình xác thực và chọn tab **"Đăng ký tài khoản"**,
  - *When* nhập đầy đủ `Họ và tên`, `Email` (chưa tồn tại), `Số điện thoại`, `Mật khẩu` ($\ge 6$ ký tự), chọn `Role` (và `Phòng ban` nếu là nhân sự nội bộ) rồi bấm **Đăng ký**,
  - *Then* hệ thống chuẩn hóa email, băm mật khẩu (`bcrypt`), tạo tài khoản `ACTIVE`, tự động cấp phiên đăng nhập và chuyển thẳng vào **Portal riêng của Role đó**.
- **S1.2 (Chặn đăng ký trùng Email):**
  - *Given* email `hr@ats.local` đã tồn tại,
  - *When* đăng ký mới với email ` HR@ats.local `,
  - *Then* hệ thống từ chối với mã lỗi `USER_EMAIL_TAKEN` (`HTTP 409`).

### US2 (P1) — Đăng nhập & Điều hướng vào Giao diện riêng theo Role (`/login`)
- **S1.3 (Đăng nhập hợp lệ):**
  - *Given* tài khoản có `status = 'ACTIVE'`,
  - *When* đăng nhập đúng `email` và `password`,
  - *Then* hệ thống trả về `accessToken` kèm thông tin `user` (`role`, `departmentId`) và mở đúng **Role Portal** tương ứng.
- **S1.4 (Từ chối thông tin sai hoặc tài khoản bị khóa):**
  - *Given* nhập sai mật khẩu hoặc tài khoản đang ở trạng thái `INACTIVE`,
  - *When* gửi yêu cầu đăng nhập,
  - *Then* bị từ chối với mã `AUTH_INVALID_CREDENTIALS` (`HTTP 401`).

### US3 (P1) — Phân quyền Chặt chẽ theo Role (Strict RBAC Boundary — Không chuyển nhanh Role)
- **S1.5:** Mỗi tài khoản được gán đúng 1 `Role` duy nhất. Sau khi đăng nhập, tài khoản đó **chỉ được ở trong đúng Role Portal của mình**; hệ thống **tuyệt đối không có thanh chuyển nhanh Role (No Quick Role Switcher)** trên giao diện làm việc. Muốn vào giao diện của Role khác, người dùng bắt buộc phải **Đăng xuất (`Logout`)** và **Đăng nhập (`Login`)** bằng tài khoản được gán Role tương ứng.
- **S1.6:** `ADMIN` có thể tạo phòng ban mới, gán `HIRING_MANAGER` làm trưởng phòng, tạo tài khoản mới, đổi `Role` của tài khoản hoặc khóa tài khoản bất kỳ (`INACTIVE`). Khi `ADMIN` đổi `Role` của một tài khoản, lần đăng nhập tiếp theo của tài khoản đó sẽ vào đúng Portal của `Role` mới.

---

## 3. Ma trận Phân quyền (RBAC Matrix — Nguồn sự thật)

| Chức năng | `ADMIN` | `HIRING_MANAGER` | `HR` | `INTERVIEWER` | `CANDIDATE` |
| :--- | :-: | :-: | :-: | :-: | :-: |
| Đăng ký / Đăng nhập / Xem hồ sơ cá nhân | ✔ | ✔ | ✔ | ✔ | ✔ |
| Quản lý Phòng ban & Tài khoản nhân sự | ✔ | | | | |
| Tạo Yêu cầu tuyển dụng (`Job Requisition`) | ✔ | ✔ *(phòng mình)* | | | |
| Duyệt / Từ chối `Job Requisition` | ✔ | | ✔ | | |
| Tạo, cấu hình Vòng/Tiêu chí & Đăng `Job` | ✔ | | ✔ | | |
| Kéo-thả Kanban, Xếp lịch phỏng vấn, Chốt tuyển | ✔ | *Chỉ xem phòng mình* | ✔ | | |
| Chấm phiếu phỏng vấn (`Split-Screen Scorecard`) | | ✔ *(nếu trong HĐ)* | | ✔ *(nếu trong HĐ)* | |
| Ghi biên bản họp `Calibration` ($\Delta \ge 2.0$) | ✔ | ✔ *(phòng mình)* | ✔ | | |
| Phê duyệt Offer (`Offer Approval`) | ✔ | ✔ *(phòng mình)* | | | |
| Xem Analytics Dashboard (`Funnel` & `Time-to-Hire`) | ✔ | ✔ *(phòng mình)* | ✔ | | |
| Nộp CV ứng tuyển & Theo dõi tiến độ đơn | | | | | ✔ *(+ Public)* |
