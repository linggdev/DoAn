import {
  Body,
  Controller,
  Injectable,
  Module,
  Param,
  ParseIntPipe,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApplicationStatus, JobStatus, StageCode } from '@prisma/client';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import { diskStorage } from 'multer';
import * as path from 'path';
import { Public } from '../../shared/auth/auth-guards';
import { PrismaService } from '../../shared/database/prisma.service';
import { DomainError } from '../../shared/domain/domain-error';
import { normalizeEmail, normalizePhone } from './normalize';

const UPLOAD_DIR = path.resolve(process.cwd(), process.env.UPLOAD_DIR || './uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

@Injectable()
export class CandidateService {
  constructor(private readonly prisma: PrismaService) {}

  async applyToJob(
    jobId: number,
    dto: { fullName: string; email: string; phone?: string; resumeUrl?: string },
  ) {
    const fullName = (dto.fullName ?? '').trim();
    const email = normalizeEmail(dto.email);
    const phone = normalizePhone(dto.phone);
    if (!fullName || !email) {
      throw new DomainError('APPLY_INVALID_INPUT', 'Vui lòng nhập đầy đủ họ tên và email');
    }

    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
      include: { stages: { orderBy: { stageOrder: 'asc' } } },
    });
    if (!job || job.status !== JobStatus.PUBLISHED) {
      throw new DomainError('APPLY_JOB_NOT_OPEN', 'Vị trí tuyển dụng này hiện không mở nhận hồ sơ');
    }

    const appliedStage = job.stages.find((s) => s.stageCode === StageCode.APPLIED);
    if (!appliedStage) {
      throw new DomainError('JOB_STAGE_ERROR', 'Job chưa có vòng APPLIED');
    }

    const resumeUrl = dto.resumeUrl || `/uploads/sample-cv-${randomUUID().slice(0, 8)}.pdf`;

    return this.prisma.$transaction(async (tx) => {
      // Quét trùng lặp (D09): ưu tiên khớp email trước, sau đó phone
      let candidate = await tx.candidate.findUnique({ where: { email } });
      if (!candidate && phone) {
        candidate = await tx.candidate.findFirst({ where: { phone } });
      }

      let isDuplicateCandidate = false;
      if (candidate) {
        isDuplicateCandidate = true;
        const alreadyInSameJob = await tx.application.findUnique({
          where: { jobId_candidateId: { jobId, candidateId: candidate.id } },
        });
        if (alreadyInSameJob) {
          throw new DomainError(
            'APPLY_DUPLICATE_JOB',
            'Bạn đã nộp hồ sơ cho vị trí tuyển dụng này trước đó',
            409,
          );
        }
        candidate = await tx.candidate.update({
          where: { id: candidate.id },
          data: {
            fullName,
            phone: phone ?? candidate.phone,
            resumeUrl,
          },
        });
      } else {
        candidate = await tx.candidate.create({
          data: {
            fullName,
            email,
            phone,
            resumeUrl,
          },
        });
      }

      const application = await tx.application.create({
        data: {
          jobId,
          candidateId: candidate.id,
          currentStageId: appliedStage.id,
          resumeUrl, // Snapshot CV tại thời điểm nộp (D09)
          status: ApplicationStatus.ACTIVE,
        },
      });

      await tx.applicationLog.create({
        data: {
          applicationId: application.id,
          fromStageId: null,
          toStageId: appliedStage.id,
          changedBy: null,
          note: isDuplicateCandidate
            ? 'Ứng viên nộp hồ sơ (Phát hiện trùng lịch sử ứng viên cũ)'
            : 'Ứng viên nộp hồ sơ mới',
        },
      });

      return {
        applicationId: application.id,
        trackingToken: application.trackingToken,
        isDuplicateCandidate,
      };
    });
  }
}

@Controller('api')
export class CandidateController {
  constructor(private readonly service: CandidateService) {}

  @Public()
  @Post('public/jobs/:id/apply')
  @UseInterceptors(
    FileInterceptor('resume', {
      storage: diskStorage({
        destination: UPLOAD_DIR,
        filename: (_req, file, cb) => {
          const ext = path.extname(file.originalname || '.pdf') || '.pdf';
          cb(null, `${randomUUID()}${ext}`);
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (file.mimetype !== 'application/pdf' && !file.originalname.toLowerCase().endsWith('.pdf')) {
          return cb(new DomainError('APPLY_INVALID_FILE', 'Chỉ chấp nhận file CV định dạng PDF (≤ 5MB)'), false);
        }
        cb(null, true);
      },
    }),
  )
  apply(
    @Param('id', ParseIntPipe) jobId: number,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() body: { fullName: string; email: string; phone?: string; resumeUrl?: string },
  ) {
    const resumeUrl = file ? `/uploads/${file.filename}` : body.resumeUrl;
    return this.service.applyToJob(jobId, {
      fullName: body.fullName,
      email: body.email,
      phone: body.phone,
      resumeUrl,
    });
  }
}

@Module({
  controllers: [CandidateController],
  providers: [CandidateService],
  exports: [CandidateService],
})
export class CandidateModule {}

