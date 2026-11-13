import { Controller, Get, Injectable, Module, Query } from '@nestjs/common';
import { StageCode } from '@prisma/client';
import { PrismaService } from '../../shared/database/prisma.service';
import { DEFAULT_STAGE_NAMES, STAGE_ORDER } from '../../shared/domain/stage-rules';

const FUNNEL_STAGE_CODES: StageCode[] = [
  StageCode.APPLIED,
  StageCode.SCREENING,
  StageCode.TEST,
  StageCode.INTERVIEW,
  StageCode.OFFER,
  StageCode.HIRED,
];

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Phễu chuyển đổi (Conversion Funnel - D17, S5.10):
   * Đếm số DISTINCT application_id đã từng bước vào mỗi stage_code trong application_logs.
   */
  async getFunnel(jobId?: number, departmentId?: number) {
    const logs = await this.prisma.applicationLog.findMany({
      where: {
        application: {
          ...(jobId ? { jobId } : {}),
          ...(departmentId ? { job: { requisition: { departmentId } } } : {}),
        },
      },
      select: {
        applicationId: true,
        toStage: { select: { stageCode: true } },
      },
    });

    const stageSets = new Map<StageCode, Set<number>>();
    for (const code of FUNNEL_STAGE_CODES) {
      stageSets.set(code, new Set<number>());
    }
    for (const log of logs) {
      const bucket = stageSets.get(log.toStage.stageCode);
      if (bucket) bucket.add(log.applicationId);
    }

    const totalApplied = stageSets.get(StageCode.APPLIED)?.size ?? 0;
    const stages = FUNNEL_STAGE_CODES.map((code) => {
      const count = stageSets.get(code)?.size ?? 0;
      const conversionRate =
        totalApplied > 0 ? Math.round((count / totalApplied) * 1000) / 10 : 0;
      return {
        stageCode: code,
        stageName: DEFAULT_STAGE_NAMES[code],
        stageOrder: STAGE_ORDER[code],
        reachedCount: count,
        conversionRate,
      };
    });

    return {
      totalApplied,
      stages,
    };
  }

  /**
   * Thống kê Time-to-Hire trung bình (D17, S5.11) + các KPI tổng quan.
   */
  async getTimeToHire(jobId?: number, departmentId?: number) {
    const appWhere = {
      ...(jobId ? { jobId } : {}),
      ...(departmentId ? { job: { requisition: { departmentId } } } : {}),
    };

    const [totalApplications, hiredLogs, activeJobsCount, varianceCount, disqualifiedCount] =
      await Promise.all([
        this.prisma.application.count({ where: appWhere }),
        this.prisma.applicationLog.findMany({
          where: {
            toStage: { stageCode: StageCode.HIRED },
            application: appWhere,
          },
          include: {
            application: {
              select: {
                id: true,
                appliedAt: true,
                candidate: { select: { fullName: true } },
                job: { select: { title: true } },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.job.count({ where: { status: 'PUBLISHED' } }),
        this.prisma.application.count({ where: { ...appWhere, hasVarianceAlert: true } }),
        this.prisma.application.count({ where: { ...appWhere, isDisqualified: true } }),
      ]);

    const hires = hiredLogs.map((log) => {
      const diffMs = log.createdAt.getTime() - log.application.appliedAt.getTime();
      const days = Math.max(0.1, Math.round((diffMs / 86_400_000) * 10) / 10);
      return {
        applicationId: log.application.id,
        candidateName: log.application.candidate.fullName,
        jobTitle: log.application.job.title,
        appliedAt: log.application.appliedAt,
        hiredAt: log.createdAt,
        daysToHire: days,
      };
    });

    const averageDays =
      hires.length > 0
        ? Math.round((hires.reduce((sum, h) => sum + h.daysToHire, 0) / hires.length) * 10) / 10
        : 0;

    return {
      averageDaysToHire: averageDays,
      hiredCount: hires.length,
      totalApplications,
      activeJobsCount,
      varianceCount,
      disqualifiedCount,
      hires,
    };
  }
}

@Controller('api/analytics')
export class AnalyticsController {
  constructor(private readonly service: AnalyticsService) {}

  @Get('funnel')
  getFunnel(@Query('jobId') jobId?: string, @Query('departmentId') departmentId?: string) {
    return this.service.getFunnel(
      jobId ? Number(jobId) : undefined,
      departmentId ? Number(departmentId) : undefined,
    );
  }

  @Get('time-to-hire')
  getTimeToHire(@Query('jobId') jobId?: string, @Query('departmentId') departmentId?: string) {
    return this.service.getTimeToHire(
      jobId ? Number(jobId) : undefined,
      departmentId ? Number(departmentId) : undefined,
    );
  }
}

@Module({
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}

