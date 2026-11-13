import { nextStage, StageCode, TERMINAL_STAGES } from '../../shared/domain/stage-rules';

/**
 * State Machine Guards (spec 003, D08) — HÀM THUẦN.
 * Trả về danh sách vi phạm; rỗng = được phép chuyển.
 * Kiểm tra định biên (D12) KHÔNG nằm ở đây vì phải làm nguyên tử trong DB.
 */

export interface StageRef {
  id: number;
  stageCode: StageCode;
  stageOrder: number;
}

export interface InterviewSnapshot {
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
  participantCount: number;
  submittedCount: number;
}

export interface TransitionContext {
  applicationStatus: 'ACTIVE' | 'HIRED' | 'REJECTED';
  stages: StageRef[];
  currentStageId: number;
  toStageId: number;
  note?: string | null;
  resumePresent: boolean;
  activeInterview: InterviewSnapshot | null; // buổi có status != CANCELLED (D01)
  overallScore: number | null;
  passScoreThreshold: number;
  isDisqualified: boolean;
  hasVarianceAlert: boolean;
  calibrated: boolean;
  offerApproved: boolean;
}

export interface GuardViolation {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export function evaluateTransition(ctx: TransitionContext): GuardViolation[] {
  const current = ctx.stages.find((s) => s.id === ctx.currentStageId);
  const target = ctx.stages.find((s) => s.id === ctx.toStageId);

  if (!current || !target) {
    return [{ code: 'GUARD_STAGE_NOT_IN_JOB', message: 'Vòng đích không thuộc Job của đơn này' }];
  }
  if (ctx.applicationStatus !== 'ACTIVE' || TERMINAL_STAGES.includes(current.stageCode)) {
    return [{ code: 'GUARD_TERMINAL_STATE', message: 'Đơn đã ở trạng thái kết thúc, không thể chuyển vòng' }];
  }

  // Chuyển sang REJECTED: từ mọi vòng chưa kết thúc, bắt buộc lý do.
  if (target.stageCode === 'REJECTED') {
    return (ctx.note ?? '').trim().length === 0
      ? [{ code: 'GUARD_REJECT_REASON_REQUIRED', message: 'Cần nhập lý do loại ứng viên' }]
      : [];
  }

  // Chỉ tiến 1 bước.
  const expected = nextStage(ctx.stages, current);
  if (!expected || expected.id !== target.id) {
    return [
      {
        code: 'GUARD_NOT_NEXT_STAGE',
        message: 'Chỉ được chuyển tới vòng kế tiếp',
        details: { expectedStageId: expected?.id ?? null },
      },
    ];
  }

  const v: GuardViolation[] = [];
  switch (target.stageCode) {
    case 'SCREENING':
    case 'TEST':
      if (!ctx.resumePresent) v.push({ code: 'GUARD_RESUME_MISSING', message: 'Không tìm thấy CV của đơn ứng tuyển' });
      break;

    case 'INTERVIEW': {
      const iv = ctx.activeInterview;
      if (!iv || iv.status !== 'SCHEDULED' || iv.participantCount < 1) {
        v.push({ code: 'GUARD_INTERVIEW_REQUIRED', message: 'Cần tạo lịch phỏng vấn với ít nhất 1 người phỏng vấn' });
      }
      break;
    }

    case 'OFFER': {
      const iv = ctx.activeInterview;
      const remaining = iv ? iv.participantCount - iv.submittedCount : null;
      if (!iv || iv.participantCount === 0 || remaining! > 0) {
        v.push({
          code: 'GUARD_SCORECARDS_INCOMPLETE',
          message: remaining ? `Còn ${remaining} người phỏng vấn chưa nộp phiếu` : 'Chưa có phiếu đánh giá',
          details: { remaining },
        });
        break; // chưa đủ phiếu thì các chỉ số dưới chưa có nghĩa (D03)
      }
      if (ctx.isDisqualified) {
        v.push({ code: 'GUARD_DISQUALIFIED', message: 'Ứng viên vi phạm tiêu chí điểm liệt' });
      }
      if (ctx.hasVarianceAlert && !ctx.calibrated) {
        v.push({ code: 'GUARD_VARIANCE_UNRESOLVED', message: 'Hội đồng chấm lệch điểm, cần ghi biên bản calibration' });
      }
      if (ctx.overallScore === null || ctx.overallScore < ctx.passScoreThreshold) {
        v.push({
          code: 'GUARD_SCORE_BELOW_THRESHOLD',
          message: `Điểm tổng ${ctx.overallScore ?? '—'} chưa đạt ngưỡng ${ctx.passScoreThreshold.toFixed(2)}`,
          details: { overallScore: ctx.overallScore, threshold: ctx.passScoreThreshold },
        });
      }
      break;
    }

    case 'HIRED':
      if (!ctx.offerApproved) v.push({ code: 'GUARD_OFFER_NOT_APPROVED', message: 'Offer chưa được Hiring Manager duyệt' });
      break;
  }
  return v;
}

