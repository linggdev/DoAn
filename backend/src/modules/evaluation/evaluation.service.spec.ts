import { InterviewStatus, Recommendation, Role, StageCode } from '@prisma/client';
import { EvaluationService } from './evaluation.module';

describe('Spec 004 — Evaluation Service, Blind Lock, Variance & Calibration (S4.1–S4.19)', () => {
  function createMockEvaluationEnv() {
    const criteria = [
      { id: 1, jobId: 1, criteriaName: 'Chuyên môn', weightPercent: 50, isKnockout: true },
      { id: 2, jobId: 1, criteriaName: 'Giải quyết vấn đề', weightPercent: 30, isKnockout: false },
      { id: 3, jobId: 1, criteriaName: 'Giao tiếp', weightPercent: 20, isKnockout: false },
    ];
    const application: any = {
      id: 101,
      jobId: 1,
      candidateId: 1,
      currentStageId: 4,
      status: 'ACTIVE',
      overallScore: null,
      hasVarianceAlert: false,
      isDisqualified: false,
      calibrationNote: null,
      calibratedBy: null,
      calibratedAt: null,
      candidate: { id: 1, fullName: 'Nguyễn Quốc Tuấn', email: 'tuan@dev.vn' },
      currentStage: { id: 4, stageCode: StageCode.INTERVIEW, stageName: 'Phỏng vấn' },
    };
    const participants: any[] = [
      {
        id: 1,
        interviewId: 1,
        interviewerId: 4,
        hasSubmittedScorecard: false,
        submittedAt: null,
        interviewer: { id: 4, fullName: 'Giám khảo A', email: 'a@ats.local', role: Role.INTERVIEWER },
      },
      {
        id: 2,
        interviewId: 1,
        interviewerId: 5,
        hasSubmittedScorecard: false,
        submittedAt: null,
        interviewer: { id: 5, fullName: 'Giám khảo B', email: 'b@ats.local', role: Role.INTERVIEWER },
      },
    ];
    const evaluations: any[] = [];
    const interview: any = {
      id: 1,
      applicationId: 101,
      status: InterviewStatus.SCHEDULED,
    };

    const prisma: any = {
      interview: {
        findUnique: jest.fn(async ({ where }: any) => {
          if (where.id !== 1) return null;
          return {
            ...interview,
            application: {
              ...application,
              job: { id: 1, title: 'Backend Engineer', passScoreThreshold: 3.5, criteria },
            },
            participants,
          };
        }),
        update: jest.fn(async ({ data }: any) => {
          Object.assign(interview, data);
          return interview;
        }),
      },
      interviewParticipant: {
        update: jest.fn(async ({ where, data }: any) => {
          const p = participants.find((item) => item.id === where.id);
          Object.assign(p, data);
          return p;
        }),
        findMany: jest.fn(async () => participants),
      },
      evaluation: {
        create: jest.fn(async ({ data }: any) => {
          const ev = {
            id: evaluations.length + 1,
            interviewId: data.interviewId,
            interviewerId: data.interviewerId,
            overallComment: data.overallComment,
            recommendation: data.recommendation,
            createdAt: new Date(),
            interviewer: participants.find((p) => p.interviewerId === data.interviewerId)
              ?.interviewer,
            scores: data.scores.create,
          };
          evaluations.push(ev);
          return ev;
        }),
        findMany: jest.fn(async () => evaluations),
      },
      application: {
        findUnique: jest.fn(async () => ({
          ...application,
          calibrator: application.calibratedBy ? { id: 3, fullName: 'HR Lead' } : null,
          job: { id: 1, title: 'Backend Engineer', passScoreThreshold: 3.5, criteria },
          interviews: [{ ...interview, participants, evaluations }],
        })),
        update: jest.fn(async ({ data }: any) => {
          Object.assign(application, data);
          return application;
        }),
      },
      applicationLog: {
        create: jest.fn(async ({ data }: any) => data),
      },
      job: {
        findUnique: jest.fn(async () => ({
          id: 1,
          title: 'Backend Engineer',
          passScoreThreshold: 3.5,
          criteria,
          applications: [
            {
              ...application,
              calibrator: application.calibratedBy ? { id: 3, fullName: 'HR Lead' } : null,
              interviews: [{ ...interview, participants, evaluations }],
            },
          ],
        })),
      },
      $transaction: jest.fn(async (cb: any) => cb(prisma)),
    };

    const service = new EvaluationService(prisma);
    return { service, application, interview };
  }

  const interviewerA = {
    id: 4,
    email: 'a@ats.local',
    fullName: 'Giám khảo A',
    role: Role.INTERVIEWER,
    departmentId: 1,
  };
  const interviewerB = {
    id: 5,
    email: 'b@ats.local',
    fullName: 'Giám khảo B',
    role: Role.INTERVIEWER,
    departmentId: 1,
  };
  const hrViewer = {
    id: 3,
    email: 'hr@ats.local',
    fullName: 'HR Lead',
    role: Role.HR,
    departmentId: 2,
  };

  it('S4.1–S4.8, S4.10, S4.14–S4.19: Chấm mù (Blind Lock), chặn sửa phiếu, tổng hợp điểm khi phiếu cuối nộp, phát hiện Δ >= 2.0 và ghi biên bản Calibration', async () => {
    const { service, application, interview } = createMockEvaluationEnv();

    // S4.2: Người không thuộc hội đồng bị chặn
    await expect(
      service.submitScorecard(1, hrViewer, {
        recommendation: Recommendation.HIRE,
        scores: [
          { criteriaId: 1, score: 4.0 },
          { criteriaId: 2, score: 4.0 },
          { criteriaId: 3, score: 4.0 },
        ],
      }),
    ).rejects.toMatchObject({ code: 'EVAL_NOT_PARTICIPANT', status: 403 });

    // S4.1 & S4.14: Giám khảo A nộp phiếu trước -> chưa đủ phiếu nên chưa tính overallScore
    const subA = await service.submitScorecard(1, interviewerA, {
      recommendation: Recommendation.STRONG_HIRE,
      overallComment: 'Rất tốt',
      scores: [
        { criteriaId: 1, score: 4.5 },
        { criteriaId: 2, score: 5.0 },
        { criteriaId: 3, score: 4.0 },
      ],
    });
    expect(subA.allSubmitted).toBe(false);
    expect(application.overallScore).toBeNull();

    // S4.3: Giám khảo A nộp lại -> bị chặn vì phiếu bất biến
    await expect(
      service.submitScorecard(1, interviewerA, {
        recommendation: Recommendation.HIRE,
        scores: [
          { criteriaId: 1, score: 4.0 },
          { criteriaId: 2, score: 4.0 },
          { criteriaId: 3, score: 4.0 },
        ],
      }),
    ).rejects.toMatchObject({ code: 'EVAL_ALREADY_SUBMITTED' });

    // S4.5 & S4.7: Khi B chưa nộp, B và HR không thấy được điểm của A (Blind Lock)
    const viewForB = await service.getApplicationEvaluations(101, interviewerB);
    expect(viewForB.visibleEvaluations).toHaveLength(0);
    expect(viewForB.summary).toBeNull();

    const viewForHr = await service.getApplicationEvaluations(101, hrViewer);
    expect(viewForHr.visibleEvaluations).toHaveLength(0);
    expect(viewForHr.submittedCount).toBe(1);

    // S4.10 & S4.15: Giám khảo B nộp phiếu (chấm tiêu chí 2 là 2.5 -> Δ_2 = 5.0 - 2.5 = 2.5 >= 2.0)
    const subB = await service.submitScorecard(1, interviewerB, {
      recommendation: Recommendation.HIRE,
      overallComment: 'Khá ổn',
      scores: [
        { criteriaId: 1, score: 4.0 },
        { criteriaId: 2, score: 2.5 },
        { criteriaId: 3, score: 4.0 },
      ],
    });
    expect(subB.allSubmitted).toBe(true);
    expect(interview.status).toBe(InterviewStatus.COMPLETED);
    expect(application.hasVarianceAlert).toBe(true);
    expect(application.isDisqualified).toBe(false);
    expect(application.overallScore).toBe(4.05);

    // S4.16: Ghi biên bản Calibration (< 10 ký tự bị từ chối; >= 10 ký tự thành công)
    await expect(service.recordCalibration(101, hrViewer, 'Ngắn')).rejects.toMatchObject({
      code: 'CALIB_NOTE_TOO_SHORT',
    });

    await service.recordCalibration(
      101,
      hrViewer,
      'Hội đồng thống nhất ứng viên đạt yêu cầu chuyên môn sau khi thảo luận.',
    );
    expect(application.calibratedAt).toBeDefined();

    // S4.19: Bảng so sánh ứng viên
    const comparison = await service.getJobComparison(1);
    expect(comparison.candidates).toHaveLength(1);
    expect(comparison.candidates[0].overallScore).toBe(4.05);
    expect(comparison.candidates[0].isCalibrated).toBe(true);
  });
});

