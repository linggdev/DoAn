import {
  Body,
  Controller,
  Get,
  Injectable,
  Module,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { InterviewStatus, Recommendation, Role } from '@prisma/client';
import { AuthenticatedUser, CurrentUser, Roles } from '../../shared/auth/auth-guards';
import { PrismaService } from '../../shared/database/prisma.service';
import { DomainError } from '../../shared/domain/domain-error';
import { resolveVisibility } from './blind.policy';
import { computeScorecard, validateSheet } from './scoring.engine';

@Injectable()
export class EvaluationService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Nộp phiếu chấm điểm độc lập (Spec 004).
   * Khi giám khảo cuối cùng trong hội đồng nộp phiếu -> tự động tính S, Δ_i, Knock-out trong cùng Transaction.
   */
  async submitScorecard(
    interviewId: number,
    actor: AuthenticatedUser,
    dto: {
      recommendation: Recommendation;
      overallComment?: string;
      scores: { criteriaId: number; score: number; comment?: string }[];
    },
  ) {
    return this.prisma.$transaction(async (tx) => {
      const interview = await tx.interview.findUnique({
        where: { id: interviewId },
        include: {
          application: {
            include: {
              job: { include: { criteria: { orderBy: { id: 'asc' } } } },
            },
          },
          participants: true,
        },
      });
      if (!interview) {
        throw new DomainError('INTERVIEW_NOT_FOUND', 'Không tìm thấy buổi phỏng vấn', 404);
      }
      if (interview.status === InterviewStatus.CANCELLED) {
        throw new DomainError('EVAL_INTERVIEW_CANCELLED', 'Buổi phỏng vấn này đã bị hủy');
      }

      const seat = interview.participants.find((p) => p.interviewerId === actor.id);
      if (!seat) {
        throw new DomainError('EVAL_NOT_PARTICIPANT', 'Bạn không thuộc hội đồng phỏng vấn của buổi này', 403);
      }
      if (seat.hasSubmittedScorecard) {
        throw new DomainError('EVAL_ALREADY_SUBMITTED', 'Bạn đã nộp phiếu chấm điểm trước đó (Phiếu đã nộp là bất biến)');
      }

      const criteriaSpecs = interview.application.job.criteria.map((c) => ({
        id: c.id,
        weightPercent: c.weightPercent,
        isKnockout: c.isKnockout,
      }));

      const scoreMap: Record<number, number> = {};
      for (const item of dto.scores ?? []) {
        scoreMap[item.criteriaId] = Number(item.score);
      }
      validateSheet(criteriaSpecs, scoreMap);

      const evaluation = await tx.evaluation.create({
        data: {
          interviewId,
          interviewerId: actor.id,
          overallComment: dto.overallComment?.trim() || null,
          recommendation: dto.recommendation,
          scores: {
            create: (dto.scores ?? []).map((s) => ({
              criteriaId: s.criteriaId,
              score: s.score,
              comment: s.comment?.trim() || null,
            })),
          },
        },
      });

      await tx.interviewParticipant.update({
        where: { id: seat.id },
        data: {
          hasSubmittedScorecard: true,
          submittedAt: new Date(),
        },
      });

      const updatedParticipants = await tx.interviewParticipant.findMany({
        where: { interviewId },
      });
      const allSubmitted =
        updatedParticipants.length > 0 &&
        updatedParticipants.every((p) => p.hasSubmittedScorecard);

      let scorecardSummary = null;
      if (allSubmitted) {
        const allEvaluations = await tx.evaluation.findMany({
          where: { interviewId },
          include: { scores: true },
        });
        const sheets = allEvaluations.map((ev) => {
          const map: Record<number, number> = {};
          for (const sc of ev.scores) {
            map[sc.criteriaId] = Number(sc.score);
          }
          return { interviewerId: ev.interviewerId, scores: map };
        });

        scorecardSummary = computeScorecard(criteriaSpecs, sheets);

        await tx.application.update({
          where: { id: interview.applicationId },
          data: {
            overallScore: scorecardSummary.overallScore,
            hasVarianceAlert: scorecardSummary.hasVarianceAlert,
            isDisqualified: scorecardSummary.isDisqualified,
          },
        });

        await tx.interview.update({
          where: { id: interviewId },
          data: { status: InterviewStatus.COMPLETED },
        });
      }

      return {
        evaluationId: evaluation.id,
        allSubmitted,
        scorecardSummary,
      };
    });
  }

  /**
   * Xem kết quả chấm điểm của 1 đơn ứng tuyển, tuân thủ Blind Evaluation Lock (D10).
   */
  async getApplicationEvaluations(applicationId: number, viewer: AuthenticatedUser) {
    const app = await this.prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        job: { include: { criteria: { orderBy: { id: 'asc' } } } },
        calibrator: { select: { id: true, fullName: true } },
        interviews: {
          where: { status: { not: InterviewStatus.CANCELLED } },
          include: {
            participants: {
              include: {
                interviewer: { select: { id: true, fullName: true, email: true, role: true } },
              },
            },
            evaluations: {
              include: {
                interviewer: { select: { id: true, fullName: true, role: true } },
                scores: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!app) throw new DomainError('APP_NOT_FOUND', 'Không tìm thấy đơn ứng tuyển', 404);

    const activeInterview = app.interviews[0] ?? null;
    if (!activeInterview) {
      return {
        hasInterview: false,
        blindMode: 'PROGRESS_ONLY',
        allSubmitted: false,
        submittedCount: 0,
        panelSize: 0,
        participants: [],
        visibleEvaluations: [],
        summary: null,
      };
    }

    const visibility = resolveVisibility(
      viewer.id,
      activeInterview.participants.map((p) => ({
        interviewerId: p.interviewerId,
        hasSubmitted: p.hasSubmittedScorecard,
      })),
    );

    const visibleEvaluations = activeInterview.evaluations
      .filter((ev) => visibility.visibleInterviewerIds.includes(ev.interviewerId))
      .map((ev) => ({
        id: ev.id,
        interviewerId: ev.interviewerId,
        interviewerName: ev.interviewer.fullName,
        recommendation: ev.recommendation,
        overallComment: ev.overallComment,
        createdAt: ev.createdAt,
        scores: ev.scores.map((s) => ({
          criteriaId: s.criteriaId,
          score: Number(s.score),
          comment: s.comment,
        })),
      }));

    let summary = null;
    if (visibility.allSubmitted && activeInterview.evaluations.length > 0) {
      const criteriaSpecs = app.job.criteria.map((c) => ({
        id: c.id,
        weightPercent: c.weightPercent,
        isKnockout: c.isKnockout,
      }));
      const sheets = activeInterview.evaluations.map((ev) => {
        const map: Record<number, number> = {};
        for (const sc of ev.scores) map[sc.criteriaId] = Number(sc.score);
        return { interviewerId: ev.interviewerId, scores: map };
      });
      summary = computeScorecard(criteriaSpecs, sheets);
    }

    return {
      hasInterview: true,
      interviewId: activeInterview.id,
      blindMode: visibility.mode,
      allSubmitted: visibility.allSubmitted,
      submittedCount: visibility.submittedCount,
      panelSize: visibility.panelSize,
      calibration: {
        isCalibrated: Boolean(app.calibratedAt),
        calibrationNote: app.calibrationNote,
        calibratedAt: app.calibratedAt,
        calibratedByName: app.calibrator?.fullName ?? null,
      },
      participants: activeInterview.participants.map((p) => ({
        interviewerId: p.interviewerId,
        fullName: p.interviewer.fullName,
        role: p.interviewer.role,
        hasSubmitted: p.hasSubmittedScorecard,
        submittedAt: p.submittedAt,
      })),
      criteria: app.job.criteria,
      visibleEvaluations,
      summary,
    };
  }

  /** Ghi biên bản Calibration để giải quyết cờ lệch điểm (D05, S4.16–S4.18). */
  async recordCalibration(applicationId: number, actor: AuthenticatedUser, note: string) {
    const trimmed = (note ?? '').trim();
    if (trimmed.length < 10) {
      throw new DomainError(
        'CALIB_NOTE_TOO_SHORT',
        'Biên bản họp Calibration phải có tối thiểu 10 ký tự',
      );
    }

    const app = await this.prisma.application.findUnique({
      where: { id: applicationId },
      include: { currentStage: true },
    });
    if (!app) throw new DomainError('APP_NOT_FOUND', 'Không tìm thấy đơn ứng tuyển', 404);
    if (!app.hasVarianceAlert) {
      throw new DomainError('CALIB_NOT_REQUIRED', 'Đơn ứng tuyển này không có cảnh báo lệch điểm');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.application.update({
        where: { id: applicationId },
        data: {
          calibrationNote: trimmed,
          calibratedBy: actor.id,
          calibratedAt: new Date(),
        },
      });
      await tx.applicationLog.create({
        data: {
          applicationId,
          fromStageId: app.currentStageId,
          toStageId: app.currentStageId,
          changedBy: actor.id,
          note: `[Calibration] ${trimmed}`,
        },
      });
      return updated;
    });
  }

  /** Bảng so sánh & xếp hạng ứng viên trong cùng 1 Job (S4.19). */
  async getJobComparison(jobId: number) {
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
      include: {
        criteria: { orderBy: { id: 'asc' } },
        applications: {
          include: {
            candidate: true,
            currentStage: true,
            calibrator: { select: { id: true, fullName: true } },
            interviews: {
              where: { status: { not: InterviewStatus.CANCELLED } },
              include: {
                participants: true,
                evaluations: { include: { scores: true } },
              },
              orderBy: { createdAt: 'desc' },
            },
          },
        },
      },
    });
    if (!job) throw new DomainError('JOB_NOT_FOUND', 'Không tìm thấy vị trí tuyển dụng', 404);

    const criteriaSpecs = job.criteria.map((c) => ({
      id: c.id,
      weightPercent: c.weightPercent,
      isKnockout: c.isKnockout,
    }));

    const rows = job.applications.map((app) => {
      const iv = app.interviews[0] ?? null;
      const panelSize = iv?.participants.length ?? 0;
      const submittedCount = iv?.participants.filter((p) => p.hasSubmittedScorecard).length ?? 0;
      const allSubmitted = panelSize > 0 && submittedCount === panelSize;

      let breakdown = null;
      if (allSubmitted && iv && iv.evaluations.length > 0 && criteriaSpecs.length > 0) {
        const sheets = iv.evaluations.map((ev) => {
          const map: Record<number, number> = {};
          for (const sc of ev.scores) map[sc.criteriaId] = Number(sc.score);
          return { interviewerId: ev.interviewerId, scores: map };
        });
        breakdown = computeScorecard(criteriaSpecs, sheets);
      }

      return {
        applicationId: app.id,
        candidateName: app.candidate.fullName,
        email: app.candidate.email,
        currentStageCode: app.currentStage.stageCode,
        currentStageName: app.currentStage.stageName,
        status: app.status,
        allSubmitted,
        submittedCount,
        panelSize,
        overallScore: allSubmitted && app.overallScore !== null ? Number(app.overallScore) : null,
        hasVarianceAlert: allSubmitted ? app.hasVarianceAlert : false,
        isDisqualified: allSubmitted ? app.isDisqualified : false,
        isCalibrated: Boolean(app.calibratedAt),
        calibrationNote: app.calibrationNote,
        calibratedByName: app.calibrator?.fullName ?? null,
        perCriterion: breakdown?.perCriterion ?? [],
      };
    });

    rows.sort((a, b) => (b.overallScore ?? -1) - (a.overallScore ?? -1));

    return {
      job: {
        id: job.id,
        title: job.title,
        passScoreThreshold: Number(job.passScoreThreshold),
        criteria: job.criteria,
      },
      candidates: rows,
    };
  }
}

@Controller('api')
export class EvaluationController {
  constructor(private readonly service: EvaluationService) {}

  @Post('interviews/:id/evaluations')
  submitScorecard(
    @Param('id', ParseIntPipe) interviewId: number,
    @CurrentUser() user: AuthenticatedUser,
    @Body()
    body: {
      recommendation: Recommendation;
      overallComment?: string;
      scores: { criteriaId: number; score: number; comment?: string }[];
    },
  ) {
    return this.service.submitScorecard(interviewId, user, body);
  }

  @Get('applications/:id/evaluations')
  getApplicationEvaluations(
    @Param('id', ParseIntPipe) applicationId: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.getApplicationEvaluations(applicationId, user);
  }

  @Roles(Role.ADMIN, Role.HR, Role.HIRING_MANAGER)
  @Post('applications/:id/calibration')
  recordCalibration(
    @Param('id', ParseIntPipe) applicationId: number,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { note: string },
  ) {
    return this.service.recordCalibration(applicationId, user, body.note);
  }

  @Roles(Role.ADMIN, Role.HR, Role.HIRING_MANAGER)
  @Get('jobs/:jobId/comparison')
  getJobComparison(@Param('jobId', ParseIntPipe) jobId: number) {
    return this.service.getJobComparison(jobId);
  }
}

@Module({
  controllers: [EvaluationController],
  providers: [EvaluationService],
  exports: [EvaluationService],
})
export class EvaluationModule {}

