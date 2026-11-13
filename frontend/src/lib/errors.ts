export const ERROR_CODE_MESSAGES: Record<string, { title: string; description: string }> = {
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

