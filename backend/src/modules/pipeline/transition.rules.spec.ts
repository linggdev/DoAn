import { evaluateTransition, StageRef, TransitionContext } from './transition.rules';

const STAGES: StageRef[] = [
  { id: 1, stageCode: 'APPLIED', stageOrder: 1 },
  { id: 2, stageCode: 'SCREENING', stageOrder: 2 },
  { id: 4, stageCode: 'INTERVIEW', stageOrder: 4 },
  { id: 5, stageCode: 'OFFER', stageOrder: 5 },
  { id: 6, stageCode: 'HIRED', stageOrder: 6 },
  { id: 99, stageCode: 'REJECTED', stageOrder: 99 },
];

const ctx = (over: Partial<TransitionContext>): TransitionContext => ({
  applicationStatus: 'ACTIVE',
  stages: STAGES,
  currentStageId: 1,
  toStageId: 2,
  note: null,
  resumePresent: true,
  activeInterview: null,
  overallScore: null,
  passScoreThreshold: 3.5,
  isDisqualified: false,
  hasVarianceAlert: false,
  calibrated: false,
  offerApproved: false,
  ...over,
});

const codes = (c: TransitionContext) => evaluateTransition(c).map((v) => v.code);
const fullPanel = { status: 'COMPLETED' as const, participantCount: 2, submittedCount: 2 };

describe('State Machine Guards (spec 003)', () => {
  it('S3.8 — APPLIED → SCREENING hợp lệ', () => {
    expect(codes(ctx({}))).toEqual([]);
  });

  it('S3.9 — nhảy vòng hoặc lùi vòng bị chặn', () => {
    expect(codes(ctx({ toStageId: 4 }))).toEqual(['GUARD_NOT_NEXT_STAGE']);
    expect(codes(ctx({ currentStageId: 4, toStageId: 2 }))).toEqual(['GUARD_NOT_NEXT_STAGE']);
  });

  it('S3.10 — sang REJECTED cần lý do', () => {
    expect(codes(ctx({ toStageId: 99 }))).toEqual(['GUARD_REJECT_REASON_REQUIRED']);
    expect(codes(ctx({ toStageId: 99, note: '   ' }))).toEqual(['GUARD_REJECT_REASON_REQUIRED']);
    expect(codes(ctx({ currentStageId: 5, toStageId: 99, note: 'Không phù hợp lương' }))).toEqual([]);
  });

  it('S3.11 — đơn ở trạng thái cuối không thể chuyển', () => {
    expect(codes(ctx({ applicationStatus: 'HIRED', currentStageId: 6, toStageId: 99, note: 'x' }))).toEqual(['GUARD_TERMINAL_STATE']);
    expect(codes(ctx({ applicationStatus: 'REJECTED', currentStageId: 99, toStageId: 2 }))).toEqual(['GUARD_TERMINAL_STATE']);
  });

  it('vòng đích không thuộc Job bị chặn', () => {
    expect(codes(ctx({ toStageId: 12345 }))).toEqual(['GUARD_STAGE_NOT_IN_JOB']);
  });

  it('S3.12/S3.13 — vào INTERVIEW cần lịch SCHEDULED có ≥ 1 người', () => {
    const base = { currentStageId: 2, toStageId: 4 };
    expect(codes(ctx(base))).toEqual(['GUARD_INTERVIEW_REQUIRED']);
    expect(codes(ctx({ ...base, activeInterview: { status: 'SCHEDULED', participantCount: 0, submittedCount: 0 } }))).toEqual([
      'GUARD_INTERVIEW_REQUIRED',
    ]);
    expect(codes(ctx({ ...base, activeInterview: { status: 'SCHEDULED', participantCount: 2, submittedCount: 0 } }))).toEqual([]);
  });

  const toOffer = { currentStageId: 4, toStageId: 5 };

  it('S3.15 — chưa nộp đủ phiếu', () => {
    const v = evaluateTransition(ctx({ ...toOffer, activeInterview: { status: 'SCHEDULED', participantCount: 2, submittedCount: 1 } }));
    expect(v.map((x) => x.code)).toEqual(['GUARD_SCORECARDS_INCOMPLETE']);
    expect(v[0].message).toContain('Còn 1');
  });

  it('S3.16 — bị điểm liệt', () => {
    expect(codes(ctx({ ...toOffer, activeInterview: fullPanel, isDisqualified: true, overallScore: 4.2 }))).toEqual(['GUARD_DISQUALIFIED']);
  });

  it('S3.17 — lệch điểm chưa calibration bị chặn, đã calibration thì qua', () => {
    const base = { ...toOffer, activeInterview: fullPanel, overallScore: 3.8, hasVarianceAlert: true };
    expect(codes(ctx(base))).toEqual(['GUARD_VARIANCE_UNRESOLVED']);
    expect(codes(ctx({ ...base, calibrated: true }))).toEqual([]);
  });

  it('S3.18 — điểm 3.40 < 3.50 bị chặn; 3.50 và 3.80 qua', () => {
    const base = { ...toOffer, activeInterview: fullPanel };
    expect(codes(ctx({ ...base, overallScore: 3.4 }))).toEqual(['GUARD_SCORE_BELOW_THRESHOLD']);
    expect(codes(ctx({ ...base, overallScore: 3.5 }))).toEqual([]);
    expect(codes(ctx({ ...base, overallScore: 3.8 }))).toEqual([]);
  });

  it('trả về đủ mọi vi phạm cùng lúc để UI hiển thị', () => {
    expect(
      codes(ctx({ ...toOffer, activeInterview: fullPanel, overallScore: 2.0, isDisqualified: true, hasVarianceAlert: true })),
    ).toEqual(['GUARD_DISQUALIFIED', 'GUARD_VARIANCE_UNRESOLVED', 'GUARD_SCORE_BELOW_THRESHOLD']);
  });

  it('S3.19 — sang HIRED cần Offer đã duyệt', () => {
    expect(codes(ctx({ currentStageId: 5, toStageId: 6 }))).toEqual(['GUARD_OFFER_NOT_APPROVED']);
    expect(codes(ctx({ currentStageId: 5, toStageId: 6, offerApproved: true }))).toEqual([]);
  });
});

