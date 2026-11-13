import {
  Body,
  Controller,
  Get,
  Injectable,
  Module,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { JobStatus, RequisitionStatus, Role, StageCode as PrismaStageCode } from '@prisma/client';
import { AuthenticatedUser, CurrentUser, Public, Roles } from '../../shared/auth/auth-guards';
import { PrismaService } from '../../shared/database/prisma.service';
import { DomainError } from '../../shared/domain/domain-error';
import { applyStageConfig, buildDefaultStages, StageConfigInput } from '../../shared/domain/stage-rules';
import { CriterionInput, validateCriteria } from './criteria.rules';

@Injectable()
export class RecruitmentService {
  constructor(private readonly prisma: PrismaService) {}

  async listRequisitions(actor: AuthenticatedUser) {
    const where =
      actor.role === Role.HIRING_MANAGER && actor.departmentId
        ? { departmentId: actor.departmentId }
        : undefined;
    return this.prisma.jobRequisition.findMany({
      where,
      include: {
        department: true,
        requester: { select: { id: true, fullName: true, email: true } },
        job: { select: { id: true, title: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createRequisition(
    actor: AuthenticatedUser,
    dto: { title: string; headcount: number; departmentId?: number },
  ) {
    const title = (dto.title ?? '').trim();
    if (!title) throw new DomainError('REQ_INVALID_TITLE', 'Tiêu đề yêu cầu tuyển dụng không được để trống');
    if (!Number.isInteger(dto.headcount) || dto.headcount <= 0) {
      throw new DomainError('REQ_INVALID_HEADCOUNT', 'Số lượng cần tuyển (headcount) phải lớn hơn 0');
    }
    const departmentId =
      actor.role === Role.HIRING_MANAGER ? actor.departmentId : (dto.departmentId ?? actor.departmentId);
    if (!departmentId) {
      throw new DomainError('REQ_DEPARTMENT_REQUIRED', 'Tài khoản chưa được gán phòng ban để tạo yêu cầu tuyển dụng');
    }
    return this.prisma.jobRequisition.create({
      data: {
        title,
        headcount: dto.headcount,
        departmentId,
        requestedBy: actor.id,
        status: RequisitionStatus.PENDING,
      },
      include: { department: true },
    });
  }

  async decideRequisition(id: number, decision: 'APPROVED' | 'REJECTED') {
    const req = await this.prisma.jobRequisition.findUnique({ where: { id } });
    if (!req) throw new DomainError('REQ_NOT_FOUND', 'Không tìm thấy yêu cầu tuyển dụng', 404);
    if (req.status !== RequisitionStatus.PENDING) {
      throw new DomainError('REQ_NOT_PENDING', 'Chỉ có thể duyệt yêu cầu đang ở trạng thái Chờ duyệt (PENDING)');
    }
    return this.prisma.jobRequisition.update({
      where: { id },
      data: { status: decision === 'APPROVED' ? RequisitionStatus.APPROVED : RequisitionStatus.REJECTED },
    });
  }

  async listJobs() {
    return this.prisma.job.findMany({
      include: {
        requisition: { include: { department: true } },
        stages: { orderBy: { stageOrder: 'asc' } },
        criteria: true,
        _count: { select: { applications: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getJob(id: number) {
    const job = await this.prisma.job.findUnique({
      where: { id },
      include: {
        requisition: { include: { department: true } },
        stages: { orderBy: { stageOrder: 'asc' } },
        criteria: { orderBy: { id: 'asc' } },
        _count: { select: { applications: true } },
      },
    });
    if (!job) throw new DomainError('JOB_NOT_FOUND', 'Không tìm thấy vị trí tuyển dụng', 404);
    return job;
  }

  async createJob(dto: {
    requisitionId: number;
    title?: string;
    description: string;
    requirements: string;
    salaryRange?: string;
    passScoreThreshold?: number;
  }) {
    const req = await this.prisma.jobRequisition.findUnique({
      where: { id: dto.requisitionId },
      include: { job: true },
    });
    if (!req) throw new DomainError('REQ_NOT_FOUND', 'Không tìm thấy yêu cầu tuyển dụng', 404);
    if (req.status !== RequisitionStatus.APPROVED) {
      throw new DomainError('REQ_NOT_APPROVED', 'Yêu cầu tuyển dụng phải được duyệt (APPROVED) trước khi tạo Job');
    }
    if (req.job) {
      throw new DomainError('REQ_ALREADY_HAS_JOB', 'Yêu cầu tuyển dụng này đã có Job liên kết (1-1)');
    }
    const threshold = dto.passScoreThreshold ?? 3.5;
    if (threshold < 1 || threshold > 5) {
      throw new DomainError('JOB_INVALID_THRESHOLD', 'Ngưỡng điểm đậu phải từ 1.00 đến 5.00');
    }

    const defaultStages = buildDefaultStages();
    return this.prisma.$transaction(async (tx) => {
      const job = await tx.job.create({
        data: {
          requisitionId: req.id,
          title: dto.title?.trim() || req.title,
          description: dto.description?.trim() || 'Mô tả công việc',
          requirements: dto.requirements?.trim() || 'Yêu cầu ứng viên',
          salaryRange: dto.salaryRange ?? null,
          passScoreThreshold: threshold,
          status: JobStatus.DRAFT,
        },
      });
      await tx.jobStage.createMany({
        data: defaultStages.map((s) => ({
          jobId: job.id,
          stageCode: s.stageCode as PrismaStageCode,
          stageName: s.stageName,
          stageOrder: s.stageOrder,
        })),
      });
      return tx.job.findUnique({
        where: { id: job.id },
        include: { stages: { orderBy: { stageOrder: 'asc' } }, criteria: true },
      });
    });
  }

  private async ensureJobConfigMutable(jobId: number) {
    const appCount = await this.prisma.application.count({ where: { jobId } });
    if (appCount > 0) {
      throw new DomainError(
        'JOB_CONFIG_LOCKED',
        'Không thể thay đổi cấu hình vòng hoặc tiêu chí khi Job đã có ứng viên nộp hồ sơ',
      );
    }
  }

  async updateStages(jobId: number, stagesInput: StageConfigInput[]) {
    await this.getJob(jobId);
    await this.ensureJobConfigMutable(jobId);
    const configured = applyStageConfig(stagesInput);

    return this.prisma.$transaction(async (tx) => {
      await tx.jobStage.deleteMany({ where: { jobId } });
      await tx.jobStage.createMany({
        data: configured.map((s) => ({
          jobId,
          stageCode: s.stageCode as PrismaStageCode,
          stageName: s.stageName,
          stageOrder: s.stageOrder,
        })),
      });
      return tx.jobStage.findMany({ where: { jobId }, orderBy: { stageOrder: 'asc' } });
    });
  }

  async updateCriteria(jobId: number, criteriaInput: CriterionInput[]) {
    await this.getJob(jobId);
    await this.ensureJobConfigMutable(jobId);
    const normalized = validateCriteria(criteriaInput);

    return this.prisma.$transaction(async (tx) => {
      await tx.scorecardCriterion.deleteMany({ where: { jobId } });
      await tx.scorecardCriterion.createMany({
        data: normalized.map((c) => ({
          jobId,
          criteriaName: c.criteriaName,
          weightPercent: c.weightPercent,
          isKnockout: c.isKnockout,
        })),
      });
      return tx.scorecardCriterion.findMany({ where: { jobId }, orderBy: { id: 'asc' } });
    });
  }

  async publishJob(jobId: number) {
    const job = await this.getJob(jobId);
    if (job.requisition.status !== RequisitionStatus.APPROVED) {
      throw new DomainError('JOB_NOT_PUBLISHABLE', 'Job Requisition chưa ở trạng thái APPROVED');
    }
    const weightSum = job.criteria.reduce((sum, c) => sum + c.weightPercent, 0);
    if (job.criteria.length === 0 || weightSum !== 100) {
      throw new DomainError(
        'JOB_NOT_PUBLISHABLE',
        'Cần cấu hình bộ tiêu chí chấm điểm có tổng trọng số bằng 100% trước khi đăng tuyển',
      );
    }
    return this.prisma.job.update({
      where: { id: jobId },
      data: { status: JobStatus.PUBLISHED },
    });
  }

  async closeJob(jobId: number) {
    await this.getJob(jobId);
    return this.prisma.job.update({
      where: { id: jobId },
      data: { status: JobStatus.CLOSED },
    });
  }

  async updateJob(
    jobId: number,
    dto: {
      title?: string;
      description?: string;
      requirements?: string;
      salaryRange?: string;
      passScoreThreshold?: number;
    },
  ) {
    const job = await this.getJob(jobId);
    if (job.status === JobStatus.CLOSED) {
      throw new DomainError('JOB_CONFIG_LOCKED', 'Không thể chỉnh sửa Job đã đóng (CLOSED)');
    }
    if (
      dto.passScoreThreshold !== undefined &&
      (dto.passScoreThreshold < 1 || dto.passScoreThreshold > 5)
    ) {
      throw new DomainError('JOB_INVALID_THRESHOLD', 'Ngưỡng điểm đậu phải từ 1.00 đến 5.00');
    }
    return this.prisma.job.update({
      where: { id: jobId },
      data: {
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
        ...(dto.description !== undefined ? { description: dto.description.trim() } : {}),
        ...(dto.requirements !== undefined ? { requirements: dto.requirements.trim() } : {}),
        ...(dto.salaryRange !== undefined ? { salaryRange: dto.salaryRange } : {}),
        ...(dto.passScoreThreshold !== undefined
          ? { passScoreThreshold: dto.passScoreThreshold }
          : {}),
      },
    });
  }

  async getPublicJob(jobId: number) {
    const j = await this.prisma.job.findUnique({
      where: { id: jobId },
      include: {
        requisition: { include: { department: true } },
      },
    });
    if (!j || j.status !== JobStatus.PUBLISHED) {
      throw new DomainError('JOB_NOT_FOUND', 'Không tìm thấy vị trí tuyển dụng đang mở', 404);
    }
    return {
      id: j.id,
      title: j.title,
      departmentName: j.requisition.department.name,
      description: j.description,
      requirements: j.requirements,
      salaryRange: j.salaryRange,
      headcount: j.requisition.headcount,
      filledCount: j.requisition.filledCount,
      createdAt: j.createdAt,
    };
  }

  async listPublicJobs() {
    const jobs = await this.prisma.job.findMany({
      where: { status: JobStatus.PUBLISHED },
      include: {
        requisition: { include: { department: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return jobs.map((j) => ({
      id: j.id,
      title: j.title,
      departmentName: j.requisition.department.name,
      description: j.description,
      requirements: j.requirements,
      salaryRange: j.salaryRange,
      headcount: j.requisition.headcount,
      filledCount: j.requisition.filledCount,
      createdAt: j.createdAt,
    }));
  }
}

@Controller('api')
export class RecruitmentController {
  constructor(private readonly service: RecruitmentService) {}

  @Roles(Role.ADMIN, Role.HR, Role.HIRING_MANAGER)
  @Get('requisitions')
  listRequisitions(@CurrentUser() user: AuthenticatedUser) {
    return this.service.listRequisitions(user);
  }

  @Roles(Role.ADMIN, Role.HIRING_MANAGER)
  @Post('requisitions')
  createRequisition(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { title: string; headcount: number; departmentId?: number },
  ) {
    return this.service.createRequisition(user, body);
  }

  @Roles(Role.ADMIN, Role.HR)
  @Patch('requisitions/:id/decision')
  decideRequisition(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { decision: 'APPROVED' | 'REJECTED' },
  ) {
    return this.service.decideRequisition(id, body.decision);
  }

  @Get('jobs')
  listJobs() {
    return this.service.listJobs();
  }

  @Get('jobs/:id')
  getJob(@Param('id', ParseIntPipe) id: number) {
    return this.service.getJob(id);
  }

  @Roles(Role.ADMIN, Role.HR)
  @Post('jobs')
  createJob(
    @Body()
    body: {
      requisitionId: number;
      title?: string;
      description: string;
      requirements: string;
      salaryRange?: string;
      passScoreThreshold?: number;
    },
  ) {
    return this.service.createJob(body);
  }

  @Roles(Role.ADMIN, Role.HR)
  @Patch('jobs/:id')
  updateJob(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: {
      title?: string;
      description?: string;
      requirements?: string;
      salaryRange?: string;
      passScoreThreshold?: number;
    },
  ) {
    return this.service.updateJob(id, body);
  }

  @Roles(Role.ADMIN, Role.HR)
  @Put('jobs/:id/stages')
  updateStages(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { stages: StageConfigInput[] },
  ) {
    return this.service.updateStages(id, body.stages ?? []);
  }

  @Roles(Role.ADMIN, Role.HR)
  @Put('jobs/:id/criteria')
  updateCriteria(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { criteria: CriterionInput[] },
  ) {
    return this.service.updateCriteria(id, body.criteria ?? []);
  }

  @Roles(Role.ADMIN, Role.HR)
  @Patch('jobs/:id/publish')
  publishJob(@Param('id', ParseIntPipe) id: number) {
    return this.service.publishJob(id);
  }

  @Roles(Role.ADMIN, Role.HR)
  @Patch('jobs/:id/close')
  closeJob(@Param('id', ParseIntPipe) id: number) {
    return this.service.closeJob(id);
  }

  @Public()
  @Get('public/jobs')
  listPublicJobs() {
    return this.service.listPublicJobs();
  }

  @Public()
  @Get('public/jobs/:id')
  getPublicJob(@Param('id', ParseIntPipe) id: number) {
    return this.service.getPublicJob(id);
  }
}

@Module({
  controllers: [RecruitmentController],
  providers: [RecruitmentService],
  exports: [RecruitmentService],
})
export class RecruitmentModule {}

