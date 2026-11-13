import { StageCode } from '@prisma/client';
import { AnalyticsService } from './analytics.module';

describe('Spec 005 — Historical Conversion Funnel & Time-to-Hire Analytics (S5.10, S5.11)', () => {
  it('S5.10: Tính Conversion Funnel dựa trên DISTINCT application_id trong application_logs (kể cả khi ứng viên đã chuyển sang REJECTED)', async () => {
    const prisma: any = {
      applicationLog: {
        findMany: jest.fn(async () => [
          // Ứng viên 1 đi từ APPLIED -> SCREENING -> INTERVIEW -> REJECTED
          { applicationId: 1, toStage: { stageCode: StageCode.APPLIED } },
          { applicationId: 1, toStage: { stageCode: StageCode.SCREENING } },
          { applicationId: 1, toStage: { stageCode: StageCode.INTERVIEW } },
          { applicationId: 1, toStage: { stageCode: StageCode.REJECTED } },
          // Ứng viên 2 đi từ APPLIED -> SCREENING -> TEST -> INTERVIEW -> OFFER -> HIRED
          { applicationId: 2, toStage: { stageCode: StageCode.APPLIED } },
          { applicationId: 2, toStage: { stageCode: StageCode.SCREENING } },
          { applicationId: 2, toStage: { stageCode: StageCode.TEST } },
          { applicationId: 2, toStage: { stageCode: StageCode.INTERVIEW } },
          { applicationId: 2, toStage: { stageCode: StageCode.OFFER } },
          { applicationId: 2, toStage: { stageCode: StageCode.HIRED } },
        ]),
      },
    };

    const service = new AnalyticsService(prisma);
    const funnel = await service.getFunnel(1);

    expect(funnel.totalApplied).toBe(2);
    const interviewRow = funnel.stages.find((s) => s.stageCode === StageCode.INTERVIEW)!;
    const hiredRow = funnel.stages.find((s) => s.stageCode === StageCode.HIRED)!;

    expect(interviewRow.reachedCount).toBe(2);
    expect(interviewRow.conversionRate).toBe(100);
    expect(hiredRow.reachedCount).toBe(1);
    expect(hiredRow.conversionRate).toBe(50);
  });

  it('S5.11: Tính Average Time-to-Hire chính xác theo khoảng thời gian từ applied_at đến log HIRED', async () => {
    const dayMs = 86_400_000;
    const t0 = new Date('2026-11-01T00:00:00Z');
    const prisma: any = {
      application: {
        count: jest.fn(async () => 4),
      },
      applicationLog: {
        findMany: jest.fn(async () => [
          {
            createdAt: new Date(t0.getTime() + 10 * dayMs),
            application: {
              id: 1,
              appliedAt: t0,
              candidate: { fullName: 'Ứng viên A' },
              job: { title: 'Backend Engineer' },
            },
          },
          {
            createdAt: new Date(t0.getTime() + 20 * dayMs),
            application: {
              id: 2,
              appliedAt: t0,
              candidate: { fullName: 'Ứng viên B' },
              job: { title: 'Backend Engineer' },
            },
          },
        ]),
      },
      job: {
        count: jest.fn(async () => 1),
      },
    };

    const service = new AnalyticsService(prisma);
    const res = await service.getTimeToHire(1);

    expect(res.hiredCount).toBe(2);
    expect(res.averageDaysToHire).toBe(15);
  });
});

