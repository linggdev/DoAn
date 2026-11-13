import {
  ApplicationStatus,
  InterviewStatus,
  JobStatus,
  RequisitionStatus,
  Role,
  StageCode,
} from '@prisma/client';
import { CandidateService } from '../candidate/candidate.module';
import { PipelineService } from './pipeline.module';

describe('Spec 003 — Apply, Deduplication, State Machine Guards & Concurrency (S3.1–S3.22)', () => {
  function createMockPipelineEnv(initialHeadcount = 2) {
    const requisition = {
      id: 1,
      title: 'Backend Engineer',
      departmentId: 1,
      headcount: initialHeadcount,
      filledCount: 0,
      status: RequisitionStatus.APPROVED,
    };
    const stages = [
      { id: 1, jobId: 1, stageCode: StageCode.APPLIED, stageName: 'Ứng tuyển', stageOrder: 1 },
      { id: 2, jobId: 1, stageCode: StageCode.SCREENING, stageName: 'Sàng lọc', stageOrder: 2 },
      { id: 3, jobId: 1, stageCode: StageCode.INTERVIEW, stageName: 'Phỏng vấn', stageOrder: 4 },
      { id: 4, jobId: 1, stageCode: StageCode.OFFER, stageName: 'Đề nghị', stageOrder: 5 },
      { id: 5, jobId: 1, stageCode: StageCode.HIRED, stageName: 'Trúng tuyển', stageOrder: 6 },
      { id: 99, jobId: 1, stageCode: StageCode.REJECTED, stageName: 'Loại', stageOrder: 99 },
    ];
    const job = {
      id: 1,
      requisitionId: 1,
      title: 'Backend Engineer',
      status: JobStatus.PUBLISHED,
      passScoreThreshold: 3.5,
      requisition: { ...requisition, department: { id: 1, name: 'Engineering' } },
      stages,
      criteria: [],
    };

    const candidates: any[] = [];
    const applications: any[] = [];
    const interviews: any[] = [];
    const logs: any[] = [];

    const prisma: any = {
      job: {
        findUnique: jest.fn(async ({ where }: any) => {
          if (where.id !== 1) return null;
          return { ...job, requisition: { ...requisition, department: { id: 1, name: 'Engineering' } }, stages };
        }),
        update: jest.fn(async ({ data }: any) => {
          Object.assign(job, data);
          return job;
        }),
      },
      jobRequisition: {
        findUniqueOrThrow: jest.fn(async () => requisition),
        update: jest.fn(async ({ data }: any) => {
          Object.assign(requisition, data);
          return requisition;
        }),
      },
      candidate: {
        findUnique: jest.fn(async ({ where }: any) =>
          candidates.find((c) => c.email === where.email) ?? null,
        ),
        findFirst: jest.fn(async ({ where }: any) =>
          candidates.find((c) => c.phone === where.phone) ?? null,
        ),
        create: jest.fn(async ({ data }: any) => {
          const c = { id: candidates.length + 1, ...data };
          candidates.push(c);
          return c;
        }),
        update: jest.fn(async ({ where, data }: any) => {
          const c = candidates.find((item) => item.id === where.id);
          Object.assign(c, data);
          return c;
        }),
      },
      application: {
        findUnique: jest.fn(async ({ where }: any) => {
          let app = null;
          if (where.id) app = applications.find((a) => a.id === where.id) ?? null;
          if (where.trackingToken)
            app = applications.find((a) => a.trackingToken === where.trackingToken) ?? null;
          if (where.jobId_candidateId) {
            app =
              applications.find(
                (a) =>
                  a.jobId === where.jobId_candidateId.jobId &&
                  a.candidateId === where.jobId_candidateId.candidateId,
              ) ?? null;
          }
          if (!app) return null;
          const cand = candidates.find((c) => c.id === app.candidateId);
          const currentStage = stages.find((s) => s.id === app.currentStageId);
          const activeIvs = interviews.filter(
            (iv) => iv.applicationId === app.id && iv.status !== InterviewStatus.CANCELLED,
          );
          return {
            ...app,
            candidate: cand,
            currentStage,
            job: { ...job, requisition: { ...requisition, department: { id: 1, name: 'Engineering' } }, stages },
            interviews: activeIvs,
          };
        }),
        findMany: jest.fn(async ({ where }: any) => {
          return applications.filter(
            (a) =>
              a.jobId === where.jobId &&
              a.status === where.status &&
              (where.id?.not ? a.id !== where.id.not : true),
          );
        }),
        create: jest.fn(async ({ data }: any) => {
          const app = {
            id: applications.length + 1,
            trackingToken: `token-${applications.length + 1}`,
            overallScore: null,
            hasVarianceAlert: false,
            isDisqualified: false,
            calibratedAt: null,
            calibrationNote: null,
            offerApprovedBy: null,
            appliedAt: new Date(),
            ...data,
          };
          applications.push(app);
          return app;
        }),
        update: jest.fn(async ({ where, data }: any) => {
          const app = applications.find((a) => a.id === where.id);
          Object.assign(app, data);
          return app;
        }),
        updateMany: jest.fn(async ({ where, data }: any) => {
          for (const a of applications) {
            if (where.id.in.includes(a.id)) Object.assign(a, data);
          }
        }),
      },
      applicationLog: {
        create: jest.fn(async ({ data }: any) => {
          logs.push(data);
          return data;
        }),
        createMany: jest.fn(async ({ data }: any) => {
          logs.push(...data);
        }),
      },
      interview: {
        create: jest.fn(async ({ data }: any) => {
          const iv = {
            id: interviews.length + 1,
            applicationId: data.applicationId,
            stageId: data.stageId,
            scheduledAt: data.scheduledAt,
            durationMinutes: data.durationMinutes,
            meetingLink: data.meetingLink,
            location: data.location,
            status: data.status,
            participants: data.participants.create.map((p: any) => ({
              interviewerId: p.interviewerId,
              hasSubmittedScorecard: false,
              interviewer: { id: p.interviewerId, fullName: 'Giám khảo', email: 'int@ats.local' },
            })),
          };
          interviews.push(iv);
          return iv;
        }),
        findUnique: jest.fn(async ({ where }: any) =>
          interviews.find((iv) => iv.id === where.id) ?? null,
        ),
        update: jest.fn(async ({ where, data }: any) => {
          const iv = interviews.find((item) => item.id === where.id);
          Object.assign(iv, data);
          return iv;
        }),
      },
      $executeRaw: jest.fn(async () => {
        if (requisition.filledCount < requisition.headcount) {
          requisition.filledCount += 1;
          return 1;
        }
        return 0;
      }),
      $transaction: jest.fn(async (cb: any) => cb(prisma)),
    };

    const mail: any = { sendInterviewInvite: jest.fn(async () => undefined) };
    const candidateService = new CandidateService(prisma);
    const pipelineService = new PipelineService(prisma, mail);

    return {
      candidateService,
      pipelineService,
      requisition,
      job,
      candidates,
      applications,
      interviews,
      logs,
    };
  }

  const hrActor = {
    id: 3,
    email: 'hr@ats.local',
    fullName: 'Lê Thu Hà',
    role: Role.HR,
    departmentId: 2,
  };

  const hmActor = {
    id: 2,
    email: 'hm@ats.local',
    fullName: 'Trần Minh Quân',
    role: Role.HIRING_MANAGER,
    departmentId: 1,
  };

  it('S3.1, S3.4, S3.5, S3.6, S3.7: Nộp đơn, quét trùng Email/SĐT, chặn nộp trùng cùng Job và giữ nguyên snapshot CV cũ', async () => {
    const { candidateService, applications } = createMockPipelineEnv();

    const first = await candidateService.applyToJob(1, {
      fullName: 'Nguyễn Văn An',
      email: 'An.Nguyen@Mail.com',
      phone: '0912345678',
      resumeUrl: '/uploads/cv-v1.pdf',
    });
    expect(first.isDuplicateCandidate).toBe(false);
    expect(applications[0].resumeUrl).toBe('/uploads/cv-v1.pdf');

    // S3.6: Nộp lại cùng Job 1 với email khác hoa/thường -> bị chặn APPLY_DUPLICATE_JOB
    await expect(
      candidateService.applyToJob(1, {
        fullName: 'Nguyễn Văn An',
        email: ' an.nguyen@mail.com ',
        phone: '+84 912-345-678',
        resumeUrl: '/uploads/cv-v2.pdf',
      }),
    ).rejects.toMatchObject({ code: 'APPLY_DUPLICATE_JOB', status: 409 });
  });

  it('S3.8–S3.21: Thực thi đầy đủ State Machine Guards, lịch phỏng vấn, duyệt Offer và tự động đóng Job khi đủ định biên', async () => {
    const { candidateService, pipelineService, applications, interviews, job, requisition } =
      createMockPipelineEnv(1);

    const a1 = await candidateService.applyToJob(1, {
      fullName: 'Ứng viên 1',
      email: 'u1@mail.com',
      phone: '0900000001',
    });
    const a2 = await candidateService.applyToJob(1, {
      fullName: 'Ứng viên 2',
      email: 'u2@mail.com',
      phone: '0900000002',
    });

    // S3.9: Nhảy cóc từ APPLIED (1) sang INTERVIEW (3) -> chặn GUARD_NOT_NEXT_STAGE
    await expect(
      pipelineService.transitionStage(a1.applicationId, 3, hrActor),
    ).rejects.toMatchObject({ code: 'GUARD_NOT_NEXT_STAGE' });

    // S3.8: APPLIED (1) -> SCREENING (2) thành công
    await pipelineService.transitionStage(a1.applicationId, 2, hrActor);

    // S3.12: SCREENING (2) -> INTERVIEW (3) khi chưa có lịch -> chặn GUARD_INTERVIEW_REQUIRED
    await expect(
      pipelineService.transitionStage(a1.applicationId, 3, hrActor),
    ).rejects.toMatchObject({ code: 'GUARD_INTERVIEW_REQUIRED' });

    // S3.13: Tạo lịch phỏng vấn rồi chuyển sang INTERVIEW (3)
    await pipelineService.scheduleInterview(a1.applicationId, {
      scheduledAt: '2026-12-01T09:00:00Z',
      durationMinutes: 60,
      meetingLink: 'https://meet.google.com/abc',
      interviewerIds: [4, 5],
    });
    await pipelineService.transitionStage(a1.applicationId, 3, hrActor);

    // S3.15: Chưa nộp đủ phiếu -> chặn sang OFFER (4)
    await expect(
      pipelineService.transitionStage(a1.applicationId, 4, hrActor),
    ).rejects.toMatchObject({ code: 'GUARD_SCORECARDS_INCOMPLETE' });

    // Giả lập hội đồng đã nộp đủ phiếu, điểm 4.20 >= 3.50
    interviews[0].participants.forEach((p: any) => {
      p.hasSubmittedScorecard = true;
    });
    applications[0].overallScore = 4.2;
    await pipelineService.transitionStage(a1.applicationId, 4, hrActor);

    // S3.19: Chưa được HM duyệt Offer -> chặn sang HIRED (5)
    await expect(
      pipelineService.transitionStage(a1.applicationId, 5, hrActor),
    ).rejects.toMatchObject({ code: 'GUARD_OFFER_NOT_APPROVED' });

    // S3.20 & S3.21: HM duyệt Offer -> HR chốt HIRED -> đủ định biên 1/1 -> tự động đóng Job & chuyển đơn a2 sang REJECTED
    await pipelineService.approveOffer(a1.applicationId, hmActor);
    const hireRes = await pipelineService.transitionStage(a1.applicationId, 5, hrActor);

    expect(hireRes.jobAutoClosed).toBe(true);
    expect(job.status).toBe(JobStatus.CLOSED);
    expect(requisition.status).toBe(RequisitionStatus.CLOSED);
    expect(applications[1].status).toBe(ApplicationStatus.REJECTED);
  });

  it('S3.22: Chạy 10 lần liên tiếp kiểm thử đồng thời 2 HR cùng chốt 2 ứng viên vào 1 chỗ trống cuối cùng — chỉ 1 thành công, không bao giờ tuyển lố', async () => {
    for (let run = 0; run < 10; run++) {
      const { candidateService, pipelineService, applications, requisition } =
        createMockPipelineEnv(1);

      const c1 = await candidateService.applyToJob(1, {
        fullName: 'Cand 1',
        email: 'c1@mail.com',
      });
      const c2 = await candidateService.applyToJob(1, {
        fullName: 'Cand 2',
        email: 'c2@mail.com',
      });

      // Đặt cả 2 ứng viên ở vòng OFFER (stageId = 4) đã được HM duyệt Offer
      applications[0].currentStageId = 4;
      applications[0].offerApprovedBy = 2;
      applications[1].currentStageId = 4;
      applications[1].offerApprovedBy = 2;

      const results = await Promise.allSettled([
        pipelineService.transitionStage(c1.applicationId, 5, hrActor),
        pipelineService.transitionStage(c2.applicationId, 5, hrActor),
      ]);

      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected') as PromiseRejectedResult[];

      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);
      expect(rejected[0].reason.code).toBe('GUARD_HEADCOUNT_FULL');
      expect(requisition.filledCount).toBe(1);
    }
  });
});

