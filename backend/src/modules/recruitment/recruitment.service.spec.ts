import { JobStatus, RequisitionStatus, Role, StageCode } from '@prisma/client';
import { RecruitmentService } from './recruitment.module';

describe('Spec 002 — Requisition, Job Setup, Stages & Weighted Criteria (S2.1–S2.13)', () => {
  function createMockRecruitmentEnv() {
    const requisitions: any[] = [];
    const jobs: any[] = [];
    const stages: any[] = [];
    const criteria: any[] = [];
    let appCount = 0;

    const prisma: any = {
      jobRequisition: {
        findMany: jest.fn(async () => requisitions),
        findUnique: jest.fn(async ({ where }: any) => {
          const req = requisitions.find((r) => r.id === where.id);
          if (!req) return null;
          return {
            ...req,
            department: { id: req.departmentId, name: 'Engineering' },
            job: jobs.find((j) => j.requisitionId === req.id) ?? null,
          };
        }),
        create: jest.fn(async ({ data }: any) => {
          const req = {
            id: requisitions.length + 1,
            ...data,
            filledCount: 0,
            createdAt: new Date(),
            department: { id: data.departmentId, name: 'Engineering' },
          };
          requisitions.push(req);
          return req;
        }),
        update: jest.fn(async ({ where, data }: any) => {
          const req = requisitions.find((r) => r.id === where.id);
          Object.assign(req, data);
          return req;
        }),
      },
      job: {
        findUnique: jest.fn(async ({ where }: any) => {
          const j = jobs.find((item) => item.id === where.id);
          if (!j) return null;
          const req = requisitions.find((r) => r.id === j.requisitionId);
          return {
            ...j,
            requisition: {
              ...req,
              department: { id: req.departmentId, name: 'Engineering' },
            },
            stages: stages
              .filter((s) => s.jobId === j.id)
              .sort((a, b) => a.stageOrder - b.stageOrder),
            criteria: criteria.filter((c) => c.jobId === j.id),
            _count: { applications: appCount },
          };
        }),
        findMany: jest.fn(async ({ where }: any) => {
          return jobs
            .filter((j) => (!where?.status ? true : j.status === where.status))
            .map((j) => {
              const req = requisitions.find((r) => r.id === j.requisitionId);
              return {
                ...j,
                requisition: {
                  ...req,
                  department: { id: req.departmentId, name: 'Engineering' },
                },
                stages: stages.filter((s) => s.jobId === j.id),
                criteria: criteria.filter((c) => c.jobId === j.id),
              };
            });
        }),
        create: jest.fn(async ({ data }: any) => {
          const j = {
            id: jobs.length + 1,
            ...data,
            createdAt: new Date(),
          };
          jobs.push(j);
          return j;
        }),
        update: jest.fn(async ({ where, data }: any) => {
          const j = jobs.find((item) => item.id === where.id);
          Object.assign(j, data);
          return j;
        }),
      },
      jobStage: {
        deleteMany: jest.fn(async ({ where }: any) => {
          for (let i = stages.length - 1; i >= 0; i--) {
            if (stages[i].jobId === where.jobId) stages.splice(i, 1);
          }
        }),
        createMany: jest.fn(async ({ data }: any) => {
          for (const item of data) {
            stages.push({ id: stages.length + 1, ...item });
          }
        }),
        findMany: jest.fn(async ({ where }: any) =>
          stages.filter((s) => s.jobId === where.jobId).sort((a, b) => a.stageOrder - b.stageOrder),
        ),
      },
      scorecardCriterion: {
        deleteMany: jest.fn(async ({ where }: any) => {
          for (let i = criteria.length - 1; i >= 0; i--) {
            if (criteria[i].jobId === where.jobId) criteria.splice(i, 1);
          }
        }),
        createMany: jest.fn(async ({ data }: any) => {
          for (const item of data) {
            criteria.push({ id: criteria.length + 1, ...item });
          }
        }),
        findMany: jest.fn(async ({ where }: any) => criteria.filter((c) => c.jobId === where.jobId)),
      },
      application: {
        count: jest.fn(async () => appCount),
      },
      $transaction: jest.fn(async (cb: any) => cb(prisma)),
    };

    const service = new RecruitmentService(prisma);
    return {
      service,
      setAppCount: (n: number) => {
        appCount = n;
      },
    };
  }

  const hmActor = {
    id: 2,
    email: 'hm@ats.local',
    fullName: 'Trần Minh Quân',
    role: Role.HIRING_MANAGER,
    departmentId: 1,
  };

  it('S2.1, S2.2, S2.3: Hiring Manager xin định biên, chặn headcount <= 0, HR duyệt/từ chối', async () => {
    const { service } = createMockRecruitmentEnv();

    await expect(
      service.createRequisition(hmActor, { title: 'Backend Dev', headcount: 0 }),
    ).rejects.toMatchObject({ code: 'REQ_INVALID_HEADCOUNT' });

    const req = await service.createRequisition(hmActor, {
      title: 'Backend Developer',
      headcount: 2,
    });
    expect(req.status).toBe(RequisitionStatus.PENDING);
    expect(req.filledCount).toBe(0);

    const approved = await service.decideRequisition(req.id, 'APPROVED');
    expect(approved.status).toBe(RequisitionStatus.APPROVED);
  });

  it('S2.4–S2.13: Tạo Job từ Requisition đã duyệt, cấu hình Stage & Tiêu chí 100%, khóa khi có đơn, và đăng tuyển công khai (DTO không lộ tiêu chí)', async () => {
    const { service, setAppCount } = createMockRecruitmentEnv();

    const req = await service.createRequisition(hmActor, {
      title: 'Senior Backend Engineer',
      headcount: 2,
    });

    // S2.5: Chưa duyệt không được tạo Job
    await expect(
      service.createJob({
        requisitionId: req.id,
        description: 'Desc',
        requirements: 'Req',
      }),
    ).rejects.toMatchObject({ code: 'REQ_NOT_APPROVED' });

    await service.decideRequisition(req.id, 'APPROVED');

    // S2.4: Tạo Job với 7 vòng mặc định và ngưỡng 3.50
    const job = await service.createJob({
      requisitionId: req.id,
      description: 'Backend Node.js',
      requirements: 'PostgreSQL',
    });
    expect(job?.status).toBe(JobStatus.DRAFT);
    expect(job?.stages).toHaveLength(7);

    // S2.5: Không tạo Job thứ 2 trên cùng Requisition (1-1)
    await expect(
      service.createJob({
        requisitionId: req.id,
        description: 'Dup',
        requirements: 'Dup',
      }),
    ).rejects.toMatchObject({ code: 'REQ_ALREADY_HAS_JOB' });

    // S2.6: Tắt vòng TEST, còn 6 vòng
    const updatedStages = await service.updateStages(job!.id, [
      { stageCode: StageCode.TEST, enabled: false },
      { stageCode: StageCode.INTERVIEW, enabled: true, stageName: 'Phỏng vấn kỹ thuật' },
    ]);
    expect(updatedStages).toHaveLength(6);
    expect(updatedStages.find((s: any) => s.stageCode === StageCode.INTERVIEW)?.stageName).toBe(
      'Phỏng vấn kỹ thuật',
    );

    // S2.11: Chưa có tiêu chí hợp lệ -> không đăng tuyển được
    await expect(service.publishJob(job!.id)).rejects.toMatchObject({
      code: 'JOB_NOT_PUBLISHABLE',
    });

    // S2.8: Tổng trọng số 90% -> từ chối
    await expect(
      service.updateCriteria(job!.id, [
        { criteriaName: 'A', weightPercent: 30, isKnockout: false },
        { criteriaName: 'B', weightPercent: 30, isKnockout: false },
        { criteriaName: 'C', weightPercent: 30, isKnockout: false },
      ]),
    ).rejects.toMatchObject({ code: 'CRITERIA_WEIGHT_SUM' });

    // S2.9: Lưu bộ tiêu chí 50% + 30% + 20% = 100%
    const savedCriteria = await service.updateCriteria(job!.id, [
      { criteriaName: 'Chuyên môn', weightPercent: 50, isKnockout: true },
      { criteriaName: 'Giải quyết vấn đề', weightPercent: 30, isKnockout: false },
      { criteriaName: 'Giao tiếp', weightPercent: 20, isKnockout: false },
    ]);
    expect(savedCriteria).toHaveLength(3);

    // S2.12 & S2.13: Đăng tuyển và kiểm tra DTO công khai không lộ ngưỡng đậu/tiêu chí
    const published = await service.publishJob(job!.id);
    expect(published.status).toBe(JobStatus.PUBLISHED);

    const publicList = await service.listPublicJobs();
    expect(publicList).toHaveLength(1);
    expect((publicList[0] as any).passScoreThreshold).toBeUndefined();
    expect((publicList[0] as any).criteria).toBeUndefined();

    // S2.7: Khi đã có đơn ứng tuyển -> khóa cấu hình vòng & tiêu chí
    setAppCount(1);
    await expect(service.updateCriteria(job!.id, [])).rejects.toMatchObject({
      code: 'JOB_CONFIG_LOCKED',
    });
  });
});

