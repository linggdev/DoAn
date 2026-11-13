import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AuthModule } from './modules/auth/auth.module';
import { CandidateModule } from './modules/candidate/candidate.module';
import { EvaluationModule } from './modules/evaluation/evaluation.module';
import { PipelineModule } from './modules/pipeline/pipeline.module';
import { RecruitmentModule } from './modules/recruitment/recruitment.module';
import { JwtAuthGuard, RolesGuard } from './shared/auth/auth-guards';
import { DatabaseModule } from './shared/database/prisma.service';
import { DomainExceptionFilter } from './shared/filters/domain-exception.filter';
import { MailModule } from './shared/mail/mail.service';

@Module({
  imports: [
    DatabaseModule,
    MailModule,
    AuthModule,
    RecruitmentModule,
    CandidateModule,
    PipelineModule,
    EvaluationModule,
    AnalyticsModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: DomainExceptionFilter },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}

