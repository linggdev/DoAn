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
} from '@nestjs/common';
import {
  ApplicationStatus,
  InterviewStatus,
  JobStatus,
  RequisitionStatus,
  Role,
  StageCode,
} from '@prisma/client';
import { AuthenticatedUser, CurrentUser, Public, Roles } from '../../shared/auth/auth-guards';
import { PrismaService } from '../../shared/database/prisma.service';
import { DomainError } from '../../shared/domain/domain-error';
import { StageCode as DomainStageCode } from '../../shared/domain/stage-rules';
import { MailService } from '../../shared/mail/mail.service';
import { evaluateTransition } from './transition.rules';

@Injectable()
export class PipelineService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  async getKanban(jobId: number) {
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
      include: {
        requisition: { include: { department: true } },
        stages: { orderBy: { stageOrder: 'asc' } },
        criteria: { orderBy: { id: 'asc' } },
      },
    });
    if (!job) throw new DomainError('JOB_NOT_FOUND', 'Không tìm thấy vị trí tuyển dụng', 404);

    const applications = await this.prisma.application.findMany({
      where: { jobId },
      include: {
        candidate: {
          include: {
            _count: { select: { applications: true } },
          },
        },
        currentStage: true,
        offerApprover: { select: { id: true, fullName: true } },
        calibrator: { select: { id: true, fullName: true } },
        interviews: {
          where: { status: { not: InterviewStatus.CANCELLED } },
          include: {
            participants: {
              include: {
                interviewer: { select: { id: true, fullName: true, email: true } },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { appliedAt: 'desc' },
    });

    const columns = job.stages.map((stage) => ({
      id: stage.id,
      stageCode: stage.stageCode,
      stageName: stage.stageName,
      stageOrder: stage.stageOrder,
      cards: applications
        .filter((app) => app.currentStageId === stage.id)
        .map((app) => {
          const activeInterview = app.interviews[0] ?? null;
          const totalParticipants = activeInterview?.participants.length ?? 0;
          const submittedCount =
            activeInterview?.participants.filter((p) => p.hasSubmittedScorecard).length ?? 0;
          return {
            id: app.id,
            candidateId: app.candidateId,
            fullName: app.candidate.fullName,
            email: app.candidate.email,
            phone: app.candidate.phone,
            resumeUrl: app.resumeUrl,
            trackingToken: app.trackingToken,
            status: app.status,
            currentStageId: app.currentStageId,
            currentStageCode: app.currentStage.stageCode,
            overallScore: app.overallScore !== null ? Number(app.overallScore) : null,
            hasVarianceAlert: app.hasVarianceAlert,
            isDisqualified: app.isDisqualified,
            isCalibrated: Boolean(app.calibratedAt),
            calibrationNote: app.calibrationNote,
            isOfferApproved: Boolean(app.offerApprovedBy),
            offerApprovedByName: app.offerApprover?.fullName ?? null,
            isReturningCandidate: app.candidate._count.applications > 1,
            previousApplicationsCount: app.candidate._count.applications - 1,
            appliedAt: app.appliedAt,
            activeInterview: activeInterview
              ? {
                  id: activeInterview.id,
                  scheduledAt: activeInterview.scheduledAt,
                  durationMinutes: activeInterview.durationMinutes,
                  meetingLink: activeInterview.meetingLink,
                  location: activeInterview.location,
                  status: activeInterview.status,
                  totalParticipants,
                  submittedCount,
                  participants: activeInterview.participants.map((p) => ({
                    interviewerId: p.interviewerId,
                    fullName: p.interviewer.fullName,
                    hasSubmitted: p.hasSubmittedScorecard,
                  })),
                }
              : null,
          };
        }),
    }));

    return {
      job: {
        id: job.id,
        title: job.title,
        status: job.status,
        passScoreThreshold: Number(job.passScoreThreshold),
        departmentName: job.requisition.department.name,
        headcount: job.requisition.headcount,
        filledCount: job.requisition.filledCount,
        criteria: job.criteria,
      },
      columns,
    };
  }

  async getApplicationDetail(applicationId: number) {
    const app = await this.prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        job: {
          include: {
            requisition: { include: { department: true } },
            stages: { orderBy: { stageOrder: 'asc' } },
            criteria: { orderBy: { id: 'asc' } },
          },
        },
        candidate: {
          include: {
            applications: {
              where: { id: { not: applicationId } },
              include: {
                job: { select: { id: true, title: true } },
                currentStage: { select: { stageCode: true, stageName: true } },
              },
              orderBy: { appliedAt: 'desc' },
            },
          },
        },
        currentStage: true,
        offerApprover: { select: { id: true, fullName: true } },
        calibrator: { select: { id: true, fullName: true } },
        logs: {
          include: {
            fromStage: { select: { id: true, stageCode: true, stageName: true } },
            toStage: { select: { id: true, stageCode: true, stageName: true } },
            actor: { select: { id: true, fullName: true, role: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        interviews: {
          where: { status: { not: InterviewStatus.CANCELLED } },
          include: {
            participants: {
              include: {
                interviewer: { select: { id: true, fullName: true, email: true, role: true } },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!app) throw new DomainError('APP_NOT_FOUND', 'Không tìm thấy đơn ứng tuyển', 404);
    return app;
  }

  /**
   * Điểm duy nhất chuyển trạng thái ứng viên (Constitution II).
   * Thực thi đầy đủ State Guards và chống Race Condition Over-hiring (D12, D13).
   */
  async transitionStage(
    applicationId: number,
    toStageId: number,
    actor: AuthenticatedUser,
    note?: string,
  ) {
    let inviteMailPayload: Parameters<MailService['sendInterviewInvite']>[0] | null = null;

    const result = await this.prisma.$transaction(async (tx) => {
      const app = await tx.application.findUnique({
        where: { id: applicationId },
        include: {
          candidate: true,
          job: {
            include: {
              requisition: true,
              stages: { orderBy: { stageOrder: 'asc' } },
            },
          },
          interviews: {
            where: { status: { not: InterviewStatus.CANCELLED } },
            include: {
              participants: {
                include: { interviewer: true },
              },
            },
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      if (!app) throw new DomainError('APP_NOT_FOUND', 'Không tìm thấy đơn ứng tuyển', 404);

      const activeInterview = app.interviews[0] ?? null;
      const violations = evaluateTransition({
        applicationStatus: app.status,
        stages: app.job.stages.map((s) => ({
          id: s.id,
          stageCode: s.stageCode as DomainStageCode,
          stageOrder: s.stageOrder,
        })),
        currentStageId: app.currentStageId,
        toStageId,
        note,
        resumePresent: Boolean(app.resumeUrl),
        activeInterview: activeInterview
          ? {
              status: activeInterview.status,
              participantCount: activeInterview.participants.length,
              submittedCount: activeInterview.participants.filter((p) => p.hasSubmittedScorecard).length,
            }
          : null,
        overallScore: app.overallScore !== null ? Number(app.overallScore) : null,
        passScoreThreshold: Number(app.job.passScoreThreshold),
        isDisqualified: app.isDisqualified,
        hasVarianceAlert: app.hasVarianceAlert,
        calibrated: Boolean(app.calibratedAt),
        offerApproved: Boolean(app.offerApprovedBy),
      });

      if (violations.length > 0) {
        const first = violations[0];
        throw new DomainError(first.code, first.message, 400, { violations });
      }

      const targetStage = app.job.stages.find((s) => s.id === toStageId)!;

      // Nhánh HIRED: tăng filled_count nguyên tử (D12) và tự đóng Job nếu đủ định biên (D13)
      if (targetStage.stageCode === StageCode.HIRED) {
        const updatedReqCount = await tx.$executeRaw`
          UPDATE job_requisitions
          SET filled_count = filled_count + 1
          WHERE id = ${app.job.requisitionId} AND filled_count < headcount
        `;
        if (updatedReqCount === 0) {
          throw new DomainError(
            'GUARD_HEADCOUNT_FULL',
            'Vị trí này đã tuyển đủ định biên (headcount), không thể chốt tuyển thêm ứng viên',
            409,
          );
        }

        const updatedReq = await tx.jobRequisition.findUniqueOrThrow({
          where: { id: app.job.requisitionId },
        });

        await tx.application.update({
          where: { id: app.id },
          data: {
            currentStageId: targetStage.id,
            status: ApplicationStatus.HIRED,
          },
        });

        await tx.applicationLog.create({
          data: {
            applicationId: app.id,
            fromStageId: app.currentStageId,
            toStageId: targetStage.id,
            changedBy: actor.id,
            note: note?.trim() || 'Chốt tuyển dụng (HIRED)',
          },
        });

        // D13: Nếu đã đủ headcount -> đóng Job & Requisition, chuyển các đơn ACTIVE còn lại sang REJECTED
        if (updatedReq.filledCount >= updatedReq.headcount) {
          await tx.job.update({
            where: { id: app.jobId },
            data: { status: JobStatus.CLOSED },
          });
          await tx.jobRequisition.update({
            where: { id: updatedReq.id },
            data: { status: RequisitionStatus.CLOSED },
          });

          const rejectedStage = app.job.stages.find((s) => s.stageCode === StageCode.REJECTED);
          const remainingActives = await tx.application.findMany({
            where: {
              jobId: app.jobId,
              status: ApplicationStatus.ACTIVE,
              id: { not: app.id },
            },
          });

          if (rejectedStage && remainingActives.length > 0) {
            await tx.application.updateMany({
              where: { id: { in: remainingActives.map((r) => r.id) } },
              data: {
                currentStageId: rejectedStage.id,
                status: ApplicationStatus.REJECTED,
              },
            });
            await tx.applicationLog.createMany({
              data: remainingActives.map((r) => ({
                applicationId: r.id,
                fromStageId: r.currentStageId,
                toStageId: rejectedStage.id,
                changedBy: null,
                note: 'Vị trí đã tuyển đủ định biên (Auto-closed)',
              })),
            });
          }
        }

        return {
          applicationId: app.id,
          newStageCode: targetStage.stageCode,
          jobAutoClosed: updatedReq.filledCount >= updatedReq.headcount,
        };
      }

      // Các vòng khác (SCREENING, TEST, INTERVIEW, OFFER, REJECTED)
      const nextStatus =
        targetStage.stageCode === StageCode.REJECTED
          ? ApplicationStatus.REJECTED
          : ApplicationStatus.ACTIVE;

      await tx.application.update({
        where: { id: app.id },
        data: {
          currentStageId: targetStage.id,
          status: nextStatus,
        },
      });

      await tx.applicationLog.create({
        data: {
          applicationId: app.id,
          fromStageId: app.currentStageId,
          toStageId: targetStage.id,
          changedBy: actor.id,
          note: note?.trim() || `Chuyển sang vòng ${targetStage.stageName}`,
        },
      });

      if (targetStage.stageCode === StageCode.INTERVIEW && activeInterview) {
        inviteMailPayload = {
          toEmails: [
            app.candidate.email,
            ...activeInterview.participants.map((p) => p.interviewer.email),
          ],
          candidateName: app.candidate.fullName,
          jobTitle: app.job.title,
          scheduledAt: activeInterview.scheduledAt,
          durationMinutes: activeInterview.durationMinutes,
          meetingLink: activeInterview.meetingLink,
          location: activeInterview.location,
        };
      }

      return {
        applicationId: app.id,
        newStageCode: targetStage.stageCode,
        jobAutoClosed: false,
      };
    });

    if (inviteMailPayload) {
      await this.mail.sendInterviewInvite(inviteMailPayload);
    }

    return result;
  }

  async scheduleInterview(
    applicationId: number,
    dto: {
      scheduledAt: string;
      durationMinutes: number;
      meetingLink?: string;
      location?: string;
      interviewerIds: number[];
    },
  ) {
    const uniqueIds = Array.from(new Set(dto.interviewerIds ?? []));
    if (uniqueIds.length < 1 || uniqueIds.length > 5) {
      throw new DomainError(
        'INTERVIEW_INVALID',
        'Hội đồng phỏng vấn phải có từ 1 đến 5 người phỏng vấn',
      );
    }
    const scheduledAt = new Date(dto.scheduledAt);
    if (Number.isNaN(scheduledAt.getTime())) {
      throw new DomainError('INTERVIEW_INVALID', 'Thời gian phỏng vấn không hợp lệ');
    }

    return this.prisma.$transaction(async (tx) => {
      const app = await tx.application.findUnique({
        where: { id: applicationId },
        include: {
          job: { include: { stages: true } },
          interviews: {
            where: { status: { not: InterviewStatus.CANCELLED } },
          },
        },
      });
      if (!app) throw new DomainError('APP_NOT_FOUND', 'Không tìm thấy đơn ứng tuyển', 404);
      if (app.interviews.length > 0) {
        throw new DomainError(
          'INTERVIEW_ALREADY_ACTIVE',
          'Đơn ứng tuyển này đã có lịch phỏng vấn đang hiệu lực (hãy hủy lịch cũ nếu muốn đổi lịch)',
        );
      }

      const interviewStage = app.job.stages.find((s) => s.stageCode === StageCode.INTERVIEW);
      if (!interviewStage) {
        throw new DomainError('INTERVIEW_STAGE_MISSING', 'Job không có vòng INTERVIEW');
      }

      const interview = await tx.interview.create({
        data: {
          applicationId: app.id,
          stageId: interviewStage.id,
          scheduledAt,
          durationMinutes: dto.durationMinutes || 60,
          meetingLink: dto.meetingLink ?? null,
          location: dto.location ?? null,
          status: InterviewStatus.SCHEDULED,
          participants: {
            create: uniqueIds.map((interviewerId) => ({
              interviewerId,
            })),
          },
        },
        include: {
          participants: {
            include: {
              interviewer: { select: { id: true, fullName: true, email: true } },
            },
          },
        },
      });

      return interview;
    });
  }

  async cancelInterview(interviewId: number) {
    const iv = await this.prisma.interview.findUnique({
      where: { id: interviewId },
      include: { participants: true },
    });
    if (!iv) throw new DomainError('INTERVIEW_NOT_FOUND', 'Không tìm thấy lịch phỏng vấn', 404);
    if (iv.participants.some((p) => p.hasSubmittedScorecard)) {
      throw new DomainError(
        'INTERVIEW_HAS_SCORECARDS',
        'Không thể hủy buổi phỏng vấn khi đã có giám khảo nộp phiếu chấm điểm',
      );
    }
    return this.prisma.interview.update({
      where: { id: interviewId },
      data: { status: InterviewStatus.CANCELLED },
    });
  }

  async listMyInterviews(user: AuthenticatedUser) {
    const where =
      user.role === Role.ADMIN || user.role === Role.HR
        ? { status: { not: InterviewStatus.CANCELLED } }
        : {
            status: { not: InterviewStatus.CANCELLED },
            participants: { some: { interviewerId: user.id } },
          };

    const list = await this.prisma.interview.findMany({
      where,
      include: {
        application: {
          include: {
            candidate: true,
            currentStage: true,
            job: {
              include: {
                requisition: { include: { department: true } },
                criteria: { orderBy: { id: 'asc' } },
              },
            },
          },
        },
        participants: {
          include: {
            interviewer: { select: { id: true, fullName: true, email: true } },
          },
        },
      },
      orderBy: { scheduledAt: 'asc' },
    });

    return list.map((iv) => {
      const mySeat = iv.participants.find((p) => p.interviewerId === user.id);
      return {
        id: iv.id,
        applicationId: iv.applicationId,
        scheduledAt: iv.scheduledAt,
        durationMinutes: iv.durationMinutes,
        meetingLink: iv.meetingLink,
        location: iv.location,
        status: iv.status,
        hasSubmittedMine: mySeat?.hasSubmittedScorecard ?? false,
        submittedCount: iv.participants.filter((p) => p.hasSubmittedScorecard).length,
        totalParticipants: iv.participants.length,
        candidate: {
          id: iv.application.candidate.id,
          fullName: iv.application.candidate.fullName,
          email: iv.application.candidate.email,
          phone: iv.application.candidate.phone,
          resumeUrl: iv.application.resumeUrl,
        },
        job: {
          id: iv.application.job.id,
          title: iv.application.job.title,
          departmentName: iv.application.job.requisition.department.name,
          passScoreThreshold: Number(iv.application.job.passScoreThreshold),
          criteria: iv.application.job.criteria,
        },
      };
    });
  }

  async approveOffer(applicationId: number, actor: AuthenticatedUser) {
    const app = await this.prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        currentStage: true,
        job: { include: { requisition: true } },
      },
    });
    if (!app) throw new DomainError('APP_NOT_FOUND', 'Không tìm thấy đơn ứng tuyển', 404);
    if (app.currentStage.stageCode !== StageCode.OFFER) {
      throw new DomainError(
        'OFFER_WRONG_STAGE',
        'Chỉ có thể duyệt Offer khi ứng viên đang ở vòng Đề nghị (OFFER)',
      );
    }
    if (
      actor.role === Role.HIRING_MANAGER &&
      actor.departmentId &&
      actor.departmentId !== app.job.requisition.departmentId
    ) {
      throw new DomainError('AUTH_FORBIDDEN', 'Bạn chỉ được duyệt Offer cho phòng ban của mình', 403);
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.application.update({
        where: { id: applicationId },
        data: {
          offerApprovedBy: actor.id,
          offerApprovedAt: new Date(),
        },
      });
      await tx.applicationLog.create({
        data: {
          applicationId,
          fromStageId: app.currentStageId,
          toStageId: app.currentStageId,
          changedBy: actor.id,
          note: `Hiring Manager (${actor.fullName}) đã phê duyệt Offer`,
        },
      });
      return updated;
    });
  }

  /** Trang tra cứu công khai (D15: không lộ điểm số hay lý do loại nội bộ). */
  async trackByToken(trackingToken: string) {
    const app = await this.prisma.application.findUnique({
      where: { trackingToken },
      include: {
        candidate: { select: { fullName: true } },
        currentStage: true,
        job: {
          include: {
            requisition: { include: { department: true } },
          },
        },
        interviews: {
          where: { status: { not: InterviewStatus.CANCELLED } },
          orderBy: { scheduledAt: 'desc' },
          take: 1,
        },
      },
    });
    if (!app) {
      throw new DomainError('TRACK_NOT_FOUND', 'Không tìm thấy hồ sơ ứng tuyển với mã tra cứu này', 404);
    }

    const code = app.currentStage.stageCode;
    const publicLabelMap: Record<StageCode, { label: string; stepIndex: number; description: string }> = {
      APPLIED: {
        label: 'Đang xem xét hồ sơ',
        stepIndex: 1,
        description: 'Hồ sơ của bạn đã được hệ thống ghi nhận và đang được bộ phận Tuyển dụng rà soát.',
      },
      SCREENING: {
        label: 'Đang xem xét hồ sơ',
        stepIndex: 1,
        description: 'Hồ sơ của bạn đang trong giai đoạn sàng lọc chuyên môn.',
      },
      TEST: {
        label: 'Đang xem xét hồ sơ',
        stepIndex: 1,
        description: 'Hồ sơ của bạn đang trong giai đoạn đánh giá năng lực.',
      },
      INTERVIEW: {
        label: 'Mời phỏng vấn',
        stepIndex: 2,
        description: 'Bạn có lịch phỏng vấn với hội đồng tuyển dụng.',
      },
      OFFER: {
        label: 'Đề nghị nhận việc',
        stepIndex: 3,
        description: 'Chúc mừng! Bộ phận nhân sự đang hoàn tất thư mời nhận việc (Offer) cho bạn.',
      },
      HIRED: {
        label: 'Trúng tuyển',
        stepIndex: 4,
        description: 'Chúc mừng bạn đã chính thức trúng tuyển!',
      },
      REJECTED: {
        label: 'Đã có kết quả',
        stepIndex: 4,
        description: 'Cảm ơn bạn đã quan tâm. Hiện tại hồ sơ chưa phù hợp với vị trí này, chúng tôi xin phép lưu hồ sơ cho các cơ hội tiếp theo.',
      },
    };

    const mapped = publicLabelMap[code];
    const activeInterview = app.interviews[0] ?? null;

    return {
      trackingToken: app.trackingToken,
      candidateName: app.candidate.fullName,
      jobTitle: app.job.title,
      departmentName: app.job.requisition.department.name,
      appliedAt: app.appliedAt,
      publicStatus: mapped.label,
      stepIndex: mapped.stepIndex,
      isRejected: code === StageCode.REJECTED,
      isHired: code === StageCode.HIRED,
      description: mapped.description,
      interview:
        code === StageCode.INTERVIEW && activeInterview
          ? {
              scheduledAt: activeInterview.scheduledAt,
              durationMinutes: activeInterview.durationMinutes,
              meetingLink: activeInterview.meetingLink,
              location: activeInterview.location,
            }
          : null,
    };
  }
}

@Controller('api')
export class PipelineController {
  constructor(private readonly service: PipelineService) {}

  @Get('jobs/:jobId/kanban')
  getKanban(@Param('jobId', ParseIntPipe) jobId: number) {
    return this.service.getKanban(jobId);
  }

  @Get('applications/:id')
  getApplicationDetail(@Param('id', ParseIntPipe) id: number) {
    return this.service.getApplicationDetail(id);
  }

  @Get('applications/:id/resume')
  async getApplicationResume(@Param('id', ParseIntPipe) id: number) {
    const app = await this.service.getApplicationDetail(id);
    return {
      applicationId: app.id,
      candidateName: app.candidate.fullName,
      resumeUrl: app.resumeUrl,
    };
  }

  @Roles(Role.ADMIN, Role.HR)
  @Patch('applications/:id/stage')
  transitionStage(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { toStageId: number; note?: string },
  ) {
    return this.service.transitionStage(id, Number(body.toStageId), user, body.note);
  }

  @Roles(Role.ADMIN, Role.HR)
  @Post('applications/:id/interviews')
  scheduleInterview(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: {
      scheduledAt: string;
      durationMinutes: number;
      meetingLink?: string;
      location?: string;
      interviewerIds: number[];
    },
  ) {
    return this.service.scheduleInterview(id, body);
  }

  @Roles(Role.ADMIN, Role.HR)
  @Patch('interviews/:id/cancel')
  cancelInterview(@Param('id', ParseIntPipe) id: number) {
    return this.service.cancelInterview(id);
  }

  @Get('interviews/mine')
  listMyInterviews(@CurrentUser() user: AuthenticatedUser) {
    return this.service.listMyInterviews(user);
  }

  @Roles(Role.ADMIN, Role.HIRING_MANAGER)
  @Patch('applications/:id/offer-approval')
  approveOffer(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
    return this.service.approveOffer(id, user);
  }

  @Public()
  @Get('public/track/:token')
  track(@Param('token') token: string) {
    return this.service.trackByToken(token);
  }
}

@Module({
  controllers: [PipelineController],
  providers: [PipelineService],
  exports: [PipelineService],
})
export class PipelineModule {}

