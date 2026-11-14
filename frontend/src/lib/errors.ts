export const ERROR_CODE_MESSAGES: Record<string, { title: string; description: string }> = {
  // S3.8 - S3.22: Pipeline State Machine & Guards
  GUARD_NOT_NEXT_STAGE: {
    title: 'Không thể nhảy cóc hoặc lùi vòng tuyển dụng',
    description:
      'Theo quy tắc State Machine (D08), ứng viên chỉ được chuyển tiến tuần tự từng bước tới vòng kế tiếp trong cấu hình Job (hoặc chuyển sang Loại hồ sơ).',
  },
  GUARD_TERMINAL_STATE: {
    title: 'Hồ sơ đã ở trạng thái kết thúc',
    description:
      'Ứng viên đã Trúng tuyển (HIRED) hoặc Đã loại (REJECTED). Trạng thái cuối được khóa để bảo toàn bộ đếm định biên (headcount).',
  },
  GUARD_REJECT_REASON_REQUIRED: {
    title: 'Bắt buộc nhập lý do loại hồ sơ',
    description:
      'Mọi thao tác loại ứng viên phải ghi nhận lý do vào nhật ký kiểm toán (application_logs).',
  },
  GUARD_INTERVIEW_REQUIRED: {
    title: 'Chốt chặn vòng Phỏng vấn: Chưa có lịch hẹn hợp lệ',
    description:
      'Bắt buộc phải tạo lịch phỏng vấn (interviews) và phân công ít nhất 1 người phỏng vấn (interview_participants) trước khi chuyển sang vòng Phỏng vấn.',
  },
  GUARD_SCORECARDS_INCOMPLETE: {
    title: 'Chốt chặn vòng Offer: Hội đồng chưa nộp đủ phiếu chấm',
    description:
      '100% thành viên hội đồng phỏng vấn phải hoàn tất nộp phiếu đánh giá độc lập (Scorecard) trước khi chuyển ứng viên sang vòng Đề nghị (OFFER).',
  },
  GUARD_DISQUALIFIED: {
    title: 'Chốt chặn Điểm liệt (Knock-out Rule Violation)',
    description:
      'Ứng viên có điểm trung bình ở tiêu chí Điểm liệt (is_knockout = true) dưới 2.0. Hệ thống tự động khóa cứng quyền chuyển sang vòng OFFER.',
  },
  GUARD_VARIANCE_UNRESOLVED: {
    title: 'Cảnh báo Lệch điểm Hội đồng (Δ ≥ 2.0) — Cần họp Calibration',
    description:
      'Giữa các giám khảo có độ lệch điểm từ 2.0 trở lên. HR hoặc Hiring Manager cần ghi biên bản Calibration trước khi chuyển sang vòng OFFER.',
  },
  GUARD_SCORE_BELOW_THRESHOLD: {
    title: 'Điểm tổng kết Trọng số (S) chưa đạt ngưỡng đậu',
    description:
      'Điểm tổng kết có trọng số của ứng viên thấp hơn ngưỡng điểm chuẩn (pass_score_threshold) của vị trí tuyển dụng này.',
  },
  GUARD_OFFER_NOT_APPROVED: {
    title: 'Offer chưa được Trưởng bộ phận (Hiring Manager) phê duyệt',
    description:
      'Theo quy tắc phân quyền RBAC (D11), Hiring Manager của phòng ban phải xác nhận duyệt Offer trước khi HR chốt chuyển sang Trúng tuyển (HIRED).',
  },
  GUARD_HEADCOUNT_FULL: {
    title: 'Đã tuyển đủ định biên (Headcount Limit Reached)',
    description:
      'Yêu cầu tuyển dụng này đã đủ số lượng cần tuyển (filled_count == headcount). Hệ thống chặn tuyển lố chỉ tiêu.',
  },

  // S2.1 - S2.13: Requisition, Job & Criteria Invariants
  JOB_CONFIG_LOCKED_APPLICANTS: {
    title: 'Cấu hình bị khóa bảo vệ (Đã có ứng viên nộp hồ sơ)',
    description:
      'Theo quy tắc bảo toàn tính công bằng (S2.7, FR-202), khi vị trí tuyển dụng đã có ứng viên nộp hồ sơ, toàn bộ danh sách vòng, ngưỡng điểm và bộ tiêu chí chấm điểm bị khóa chỉnh sửa.',
  },
  REQ_ALREADY_HAS_JOB: {
    title: 'Yêu cầu định biên đã có Job liên kết',
    description:
      'Mỗi yêu cầu định biên (Job Requisition) chỉ được phép liên kết với tối đa 1 chiến dịch tuyển dụng Job (quan hệ 1–1 theo S2.5, D14).',
  },
  REQ_NOT_APPROVED: {
    title: 'Yêu cầu định biên chưa được duyệt',
    description:
      'Chỉ các yêu cầu định biên ở trạng thái ĐÃ DUYỆT (APPROVED) mới được phép khởi tạo Job tuyển dụng (S2.5).',
  },
  REQ_INVALID_HEADCOUNT: {
    title: 'Chỉ tiêu định biên không hợp lệ',
    description:
      'Số lượng cần tuyển (headcount) bắt buộc phải là số nguyên dương lớn hơn 0 (S2.3).',
  },
  JOB_HEADCOUNT_BELOW_FILLED: {
    title: 'Chỉ tiêu định biên nhỏ hơn số lượng đã tuyển',
    description:
      'Không thể điều chỉnh chỉ tiêu headcount xuống thấp hơn số lượng ứng viên đã chính thức trúng tuyển (HIRED).',
  },
  JOB_NOT_PUBLISHABLE: {
    title: 'Chưa đủ điều kiện xuất bản tin tuyển dụng',
    description:
      'Job phải liên kết với Requisition đã duyệt và có bộ tiêu chí chấm điểm hợp lệ với tổng trọng số đúng 100% (S2.11).',
  },
  JOB_CRITERIA_WEIGHT_INVALID: {
    title: 'Trọng số tiêu chí chưa bằng 100%',
    description:
      'Không thể xuất bản Job khi tổng trọng số các tiêu chí chưa đạt đúng 100% (S2.8, S2.9).',
  },
  CRITERIA_WEIGHT_SUM: {
    title: 'Tổng trọng số Barem phải đúng bằng 100%',
    description:
      'Tổng trọng số của tất cả các tiêu chí chấm điểm trong một Job bắt buộc phải bằng chính xác 100% (S2.8, FR-203).',
  },
  CRITERIA_WEIGHT_SUM_INVALID: {
    title: 'Tổng trọng số Barem không hợp lệ',
    description:
      'Tổng trọng số của các tiêu chí đánh giá phải bằng đúng 100% (S2.8).',
  },
  CRITERIA_INVALID: {
    title: 'Dữ liệu tiêu chí chấm điểm không hợp lệ',
    description:
      'Tên tiêu chí không được để trống, không được trùng lặp trong cùng một Job, và trọng số mỗi tiêu chí phải là số nguyên từ 1% đến 100% (S2.10).',
  },
  STAGE_REQUIRED: {
    title: 'Không thể tắt vòng tuyển dụng bắt buộc',
    description:
      'Năm vòng cốt lõi (Ứng tuyển, Phỏng vấn, Đề nghị, Trúng tuyển, Loại) là bắt buộc trong quy trình (S2.6, D07). Chỉ vòng Sàng lọc và Kiểm tra mới được phép tắt.',
  },
  STAGE_INVALID: {
    title: 'Cấu hình vòng tuyển dụng không hợp lệ',
    description:
      'Mã vòng tuyển dụng không nằm trong danh mục hệ thống hoặc tên vòng bị để trống.',
  },

  // S1.1 - S1.6: IAM & Org Structure Invariants
  USER_IS_DEPT_MANAGER: {
    title: 'Nhân sự đang giữ chức vụ Trưởng bộ phận',
    description:
      'Không thể xóa hoặc khóa nhân sự này vì đang là Trưởng bộ phận (Hiring Manager). Vui lòng điều chuyển chức vụ trước khi thao tác (S1.6).',
  },
  DEPARTMENT_HAS_JOBS: {
    title: 'Phòng ban đang có chiến dịch Job hoạt động',
    description:
      'Không thể xóa phòng ban đang có các Job tuyển dụng liên kết (Referential Integrity Guard S2.10, D14).',
  },
  DEPARTMENT_HAS_MEMBERS: {
    title: 'Phòng ban đang có nhân sự trực thuộc',
    description:
      'Không thể xóa phòng ban khi vẫn còn nhân sự trực thuộc. Hãy điều chuyển nhân sự sang phòng ban khác trước (S1.6).',
  },

  // S3.1 - S3.7: Candidate Apply & Duplicate Guards
  APPLY_JOB_NOT_OPEN: {
    title: 'Vị trí tuyển dụng không nhận hồ sơ',
    description:
      'Vị trí tuyển dụng đang ở trạng thái Bản nháp (DRAFT) hoặc Đã đóng (CLOSED) nên không thể tiếp nhận hồ sơ ứng tuyển mới (S3.3).',
  },
  APPLY_DUPLICATE_JOB: {
    title: 'Hồ sơ đã ứng tuyển trước đó',
    description:
      'Ứng viên đã nộp hồ sơ cho vị trí này với cùng Email hoặc Số điện thoại. Mỗi ứng viên chỉ được nộp 1 lần cho cùng 1 Job (S3.6 — HTTP 409).',
  },
  APPLY_INVALID_FILE: {
    title: 'Định dạng hoặc dung lượng file CV không hợp lệ',
    description:
      'Hệ thống chỉ chấp nhận file hồ sơ định dạng .PDF với dung lượng tối đa không quá 5 MB (S3.2).',
  },
};

export function resolveGuardMessage(code?: string, fallbackMessage?: string) {
  if (code && ERROR_CODE_MESSAGES[code]) {
    return ERROR_CODE_MESSAGES[code];
  }
  return {
    title: 'Thao tác bị từ chối bởi Quy tắc Nghiệp vụ',
    description: fallbackMessage || 'Vui lòng kiểm tra lại điều kiện tiên quyết của vòng tuyển dụng.',
  };
}

