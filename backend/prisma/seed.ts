import {
  ApplicationStatus,
  InterviewStatus,
  JobStatus,
  PrismaClient,
  Recommendation,
  RequisitionStatus,
  Role,
  StageCode,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('Password@123', 10);

  // 1. Departments
  const engDept = await prisma.department.upsert({
    where: { name: 'Engineering' },
    update: {},
    create: { name: 'Engineering' },
  });
  const prodDept = await prisma.department.upsert({
    where: { name: 'Product & Design' },
    update: {},
    create: { name: 'Product & Design' },
  });

  // 2. Users (5 tài khoản chuẩn cho 4 vai trò nội bộ)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@ats.local' },
    update: {},
    create: {
      email: 'admin@ats.local',
      fullName: 'Quản trị Hệ thống (Admin)',
      passwordHash,
      role: Role.ADMIN,
      departmentId: engDept.id,
    },
  });

  const hm = await prisma.user.upsert({
    where: { email: 'hm.eng@ats.local' },
    update: {},
    create: {
      email: 'hm.eng@ats.local',
      fullName: 'Trần Minh Quân (Hiring Manager)',
      passwordHash,
      role: Role.HIRING_MANAGER,
      departmentId: engDept.id,
    },
  });

  await prisma.department.update({
    where: { id: engDept.id },
    data: { managerId: hm.id },
  });

  const hr = await prisma.user.upsert({
    where: { email: 'hr@ats.local' },
    update: {},
    create: {
      email: 'hr@ats.local',
      fullName: 'Lê Thu Hà (HR Recruiter)',
      passwordHash,
      role: Role.HR,
      departmentId: prodDept.id,
    },
  });

  const int1 = await prisma.user.upsert({
    where: { email: 'int1@ats.local' },
    update: {},
    create: {
      email: 'int1@ats.local',
      fullName: 'Phạm Hoàng Nam (Senior Interviewer)',
      passwordHash,
      role: Role.INTERVIEWER,
      departmentId: engDept.id,
    },
  });

  const int2 = await prisma.user.upsert({
    where: { email: 'int2@ats.local' },
    update: {},
    create: {
      email: 'int2@ats.local',
      fullName: 'Vũ Hải Yến (Tech Lead Interviewer)',
      passwordHash,
      role: Role.INTERVIEWER,
      departmentId: engDept.id,
    },
  });

  // 3. Requisition & Job mẫu
  const existingReq = await prisma.jobRequisition.findFirst({
    where: { title: 'Senior Backend Engineer (Node.js / NestJS)' },
  });
  if (existingReq) {
    console.log('Seed data already exists.');
    return;
  }

  const req = await prisma.jobRequisition.create({
    data: {
      departmentId: engDept.id,
      requestedBy: hm.id,
      title: 'Senior Backend Engineer (Node.js / NestJS)',
      headcount: 2,
      filledCount: 0,
      status: RequisitionStatus.APPROVED,
    },
  });

  const job = await prisma.job.create({
    data: {
      requisitionId: req.id,
      title: 'Senior Backend Engineer (Node.js / NestJS)',
      description:
        'Xây dựng kiến trúc Modular Monolith, thiết kế cơ sở dữ liệu ACID và tối ưu hóa hiệu năng hệ thống.',
      requirements: '3+ năm kinh nghiệm TypeScript, NestJS, PostgreSQL, Prisma ORM.',
      salaryRange: '35.000.000 - 50.000.000 VNĐ',
      passScoreThreshold: 3.5,
      status: JobStatus.PUBLISHED,
    },
  });

  const stageDefs = [
    { stageCode: StageCode.APPLIED, stageName: 'Ứng tuyển', stageOrder: 1 },
    { stageCode: StageCode.SCREENING, stageName: 'Sàng lọc CV', stageOrder: 2 },
    { stageCode: StageCode.TEST, stageName: 'Bài Test kỹ thuật', stageOrder: 3 },
    { stageCode: StageCode.INTERVIEW, stageName: 'Phỏng vấn Hội đồng', stageOrder: 4 },
    { stageCode: StageCode.OFFER, stageName: 'Đề nghị (Offer)', stageOrder: 5 },
    { stageCode: StageCode.HIRED, stageName: 'Trúng tuyển', stageOrder: 6 },
    { stageCode: StageCode.REJECTED, stageName: 'Loại hồ sơ', stageOrder: 99 },
  ];

  const createdStages: Record<StageCode, number> = {} as Record<StageCode, number>;
  for (const s of stageDefs) {
    const st = await prisma.jobStage.create({
      data: { jobId: job.id, ...s },
    });
    createdStages[s.stageCode] = st.id;
  }

  const c1 = await prisma.scorecardCriterion.create({
    data: {
      jobId: job.id,
      criteriaName: 'Kiến trúc Backend & CSDL (Knock-out)',
      weightPercent: 50,
      isKnockout: true,
    },
  });
  const c2 = await prisma.scorecardCriterion.create({
    data: {
      jobId: job.id,
      criteriaName: 'Tư duy Giải quyết Vấn đề & Thuật toán',
      weightPercent: 30,
      isKnockout: false,
    },
  });
  const c3 = await prisma.scorecardCriterion.create({
    data: {
      jobId: job.id,
      criteriaName: 'Giao tiếp & Văn hóa Kỹ thuật',
      weightPercent: 20,
      isKnockout: false,
    },
  });

  // 4. Ứng viên mẫu ở các trạng thái khác nhau để Demo ngay lập tức
  const cand1 = await prisma.candidate.create({
    data: {
      fullName: 'Nguyễn Quốc Tuấn',
      email: 'tuan.nguyen@candidate.vn',
      phone: '0901234567',
      resumeUrl: '/uploads/sample-cv.pdf',
    },
  });

  const app1 = await prisma.application.create({
    data: {
      jobId: job.id,
      candidateId: cand1.id,
      currentStageId: createdStages.INTERVIEW,
      resumeUrl: '/uploads/sample-cv.pdf',
      overallScore: 3.95,
      hasVarianceAlert: true, // Có lệch điểm Δ = 2.5 ở tiêu chí 2 để demo Calibration!
      isDisqualified: false,
      status: ApplicationStatus.ACTIVE,
    },
  });

  await prisma.applicationLog.createMany({
    data: [
      { applicationId: app1.id, fromStageId: null, toStageId: createdStages.APPLIED, note: 'Ứng viên nộp CV' },
      { applicationId: app1.id, fromStageId: createdStages.APPLIED, toStageId: createdStages.SCREENING, changedBy: hr.id, note: 'CV đạt yêu cầu' },
      { applicationId: app1.id, fromStageId: createdStages.SCREENING, toStageId: createdStages.INTERVIEW, changedBy: hr.id, note: 'Xếp lịch phỏng vấn hội đồng' },
    ],
  });

  const iv1 = await prisma.interview.create({
    data: {
      applicationId: app1.id,
      stageId: createdStages.INTERVIEW,
      scheduledAt: new Date(Date.now() + 86_400_000),
      durationMinutes: 60,
      meetingLink: 'https://meet.google.com/ats-demo-room',
      location: 'Phòng họp Tầng 5 / Google Meet',
      status: InterviewStatus.COMPLETED,
      participants: {
        create: [
          { interviewerId: int1.id, hasSubmittedScorecard: true, submittedAt: new Date() },
          { interviewerId: int2.id, hasSubmittedScorecard: true, submittedAt: new Date() },
        ],
      },
    },
  });

  await prisma.evaluation.create({
    data: {
      interviewId: iv1.id,
      interviewerId: int1.id,
      recommendation: Recommendation.STRONG_HIRE,
      overallComment: 'Nắm rất chắc ACID Transaction và State Machine.',
      scores: {
        create: [
          { criteriaId: c1.id, score: 4.5, comment: 'Thiết kế schema tốt' },
          { criteriaId: c2.id, score: 5.0, comment: 'Xử lý race condition xuất sắc' },
          { criteriaId: c3.id, score: 4.0, comment: 'Trình bày mạch lạc' },
        ],
      },
    },
  });

  await prisma.evaluation.create({
    data: {
      interviewId: iv1.id,
      interviewerId: int2.id,
      recommendation: Recommendation.HIRE,
      overallComment: 'Kiến trúc tốt nhưng phần thuật toán cần thảo luận thêm.',
      scores: {
        create: [
          { criteriaId: c1.id, score: 4.0, comment: 'Ổn' },
          { criteriaId: c2.id, score: 2.5, comment: 'Cần tối ưu thêm (Lệch 2.5 điểm so với GK1)' },
          { criteriaId: c3.id, score: 4.0, comment: 'Hợp văn hóa' },
        ],
      },
    },
  });

  console.log('Seed completed successfully! Default password: Password@123', { admin: admin.email });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

