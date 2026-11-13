import { UserRole } from '@/components/animate-ui/animated-sidebar';

export type StageCode =
  | 'APPLIED'
  | 'SCREENING'
  | 'TEST'
  | 'INTERVIEW'
  | 'OFFER'
  | 'HIRED'
  | 'REJECTED';

export type RecommendationType =
  | 'STRONG_HIRE'
  | 'HIRE'
  | 'NO_HIRE'
  | 'STRONG_NO_HIRE';

export interface StageDef {
  id: number;
  code: StageCode;
  name: string;
  order: number;
  enabled: boolean;
  mandatory: boolean;
}

export interface CriterionDef {
  id: number;
  name: string;
  weightPercent: number;
  isKnockout: boolean;
}

export interface AccountUser {
  id: number;
  fullName: string;
  email: string;
  phone: string;
  password: string;
  role: UserRole;
  department: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface DepartmentItem {
  id: number;
  name: string;
  managerName: string;
  memberCount: number;
  openRequisitions: number;
}

export interface RequisitionItem {
  id: number;
  title: string;
  department: string;
  requestedBy: string;
  headcount: number;
  filledCount: number;
  salaryRange: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CLOSED';
  decisionNote?: string;
  hasJobId?: number | null;
  createdAt: string;
}

export interface JobItem {
  id: number;
  requisitionId: number;
  title: string;
  department: string;
  description: string;
  requirements: string;
  salaryRange: string;
  status: 'DRAFT' | 'PUBLISHED' | 'CLOSED';
  headcount: number;
  filledCount: number;
  passScoreThreshold: number;
  stages: StageDef[];
  criteria: CriterionDef[];
  createdAt: string;
}

export interface InterviewEvalSheet {
  interviewerId: number;
  interviewerName: string;
  interviewerEmail: string;
  submitted: boolean;
  submittedAt?: string;
  recommendation: RecommendationType;
  comment: string;
  scores: Record<number, number>;
  criterionComments: Record<number, string>;
}

export interface ApplicationLogItem {
  id: number;
  fromStageCode: StageCode | null;
  toStageCode: StageCode;
  actorName: string;
  actorRole: UserRole | 'SYSTEM' | 'PUBLIC';
  note: string;
  createdAt: string;
}

export interface CandidateCardData {
  id: number;
  jobId: number;
  fullName: string;
  email: string;
  phone: string;
  experience: string;
  resumeFileName: string;
  resumeDataUrl?: string;
  stageCode: StageCode;
  trackingToken: string;
  appliedAt: string;
  appliedDaysAgo: number;
  isReturningCandidate: boolean;
  previousApplicationsNote?: string;
  interviewScheduledAt: string | null;
  interviewDurationMinutes: number;
  meetingLink: string | null;
  interviewLocation: string | null;
  offerSalary: string;
  offerStartDate?: string;
  offerBenefits?: string;
  offerApprovedByHm: boolean;
  offerApprovedByName?: string;
  offerApprovedAt?: string;
  calibrated: boolean;
  calibrationNote: string | null;
  calibratedByName?: string;
  calibratedAt?: string;
  rejectReason?: string;
  sheets: InterviewEvalSheet[];
  logs: ApplicationLogItem[];
}

export interface AuditLogEntry {
  id: number;
  time: string;
  actorName: string;
  actorRole: UserRole;
  action: string;
  detail: string;
}

export interface EmailOutboxItem {
  id: number;
  sentAt: string;
  toEmails: string[];
  subject: string;
  category: 'APPLY_CONFIRM' | 'INTERVIEW_ICS' | 'OFFER_APPROVED' | 'HIRED' | 'AUTO_CLOSED';
  bodyPreview: string;
  hasIcsAttachment?: boolean;
  candidateId?: number;
}

export interface AtsPersistentState {
  users: AccountUser[];
  departments: DepartmentItem[];
  requisitions: RequisitionItem[];
  jobs: JobItem[];
  candidates: CandidateCardData[];
  auditLogs: AuditLogEntry[];
  emailOutbox: EmailOutboxItem[];
}

export const DEFAULT_STAGES_TEMPLATE: StageDef[] = [
  { id: 1, code: 'APPLIED', name: 'Ứng tuyển', order: 1, enabled: true, mandatory: true },
  { id: 2, code: 'SCREENING', name: 'Sàng lọc CV', order: 2, enabled: true, mandatory: false },
  { id: 3, code: 'TEST', name: 'Bài Test Kỹ thuật', order: 3, enabled: true, mandatory: false },
  { id: 4, code: 'INTERVIEW', name: 'Phỏng vấn Hội đồng', order: 4, enabled: true, mandatory: true },
  { id: 5, code: 'OFFER', name: 'Đề nghị (Offer)', order: 5, enabled: true, mandatory: true },
  { id: 6, code: 'HIRED', name: 'Trúng tuyển', order: 6, enabled: true, mandatory: true },
  { id: 99, code: 'REJECTED', name: 'Loại hồ sơ', order: 99, enabled: true, mandatory: true },
];

export const INITIAL_USERS: AccountUser[] = [
  {
    id: 1,
    fullName: 'Nguyễn Quản Trị',
    email: 'admin@ats.local',
    phone: '0900111222',
    password: 'Password@123',
    role: 'ADMIN',
    department: 'Executive & IT Governance',
    status: 'ACTIVE',
  },
  {
    id: 2,
    fullName: 'Trần Minh Quân',
    email: 'hm.eng@ats.local',
    phone: '0900222333',
    password: 'Password@123',
    role: 'HIRING_MANAGER',
    department: 'Engineering',
    status: 'ACTIVE',
  },
  {
    id: 3,
    fullName: 'Lê Thu Hà',
    email: 'hr@ats.local',
    phone: '0900333444',
    password: 'Password@123',
    role: 'HR',
    department: 'People & Talent',
    status: 'ACTIVE',
  },
  {
    id: 4,
    fullName: 'Phạm Hoàng Nam',
    email: 'int1@ats.local',
    phone: '0900444555',
    password: 'Password@123',
    role: 'INTERVIEWER',
    department: 'Engineering',
    status: 'ACTIVE',
  },
  {
    id: 5,
    fullName: 'Vũ Hải Yến',
    email: 'int2@ats.local',
    phone: '0900555666',
    password: 'Password@123',
    role: 'INTERVIEWER',
    department: 'Engineering',
    status: 'ACTIVE',
  },
  {
    id: 6,
    fullName: 'Nguyễn Quốc Tuấn',
    email: 'tuan.nguyen@dev.vn',
    phone: '0901234567',
    password: 'Password@123',
    role: 'CANDIDATE',
    department: 'Ứng viên bên ngoài',
    status: 'ACTIVE',
  },
];

export const INITIAL_DEPARTMENTS: DepartmentItem[] = [
  {
    id: 1,
    name: 'Engineering',
    managerName: 'Trần Minh Quân',
    memberCount: 28,
    openRequisitions: 2,
  },
  {
    id: 2,
    name: 'Product & Design',
    managerName: 'Trần Minh Quân',
    memberCount: 12,
    openRequisitions: 1,
  },
  {
    id: 3,
    name: 'Data & Platform Infrastructure',
    managerName: 'Phạm Hoàng Nam',
    memberCount: 9,
    openRequisitions: 1,
  },
];

export const INITIAL_REQUISITIONS: RequisitionItem[] = [
  {
    id: 501,
    title: 'Senior Backend Engineer (Node.js / NestJS)',
    department: 'Engineering',
    requestedBy: 'Trần Minh Quân',
    headcount: 2,
    filledCount: 1,
    salaryRange: '38.000.000 - 52.000.000 VNĐ',
    status: 'APPROVED',
    hasJobId: 1001,
    createdAt: '2026-11-01',
  },
  {
    id: 502,
    title: 'Product Designer (Design Systems & UI/UX)',
    department: 'Product & Design',
    requestedBy: 'Trần Minh Quân',
    headcount: 1,
    filledCount: 0,
    salaryRange: '28.000.000 - 40.000.000 VNĐ',
    status: 'APPROVED',
    hasJobId: 1002,
    createdAt: '2026-11-05',
  },
  {
    id: 503,
    title: 'DevOps & Cloud Platform Engineer (Kubernetes / AWS)',
    department: 'Engineering',
    requestedBy: 'Trần Minh Quân',
    headcount: 2,
    filledCount: 0,
    salaryRange: '40.000.000 - 55.000.000 VNĐ',
    status: 'PENDING',
    hasJobId: null,
    createdAt: '2026-11-12',
  },
];

export const INITIAL_JOBS: JobItem[] = [
  {
    id: 1001,
    requisitionId: 501,
    title: 'Senior Backend Engineer (Node.js / NestJS)',
    department: 'Engineering',
    description:
      'Thiết kế và phát triển hệ thống lõi theo kiến trúc Modular Monolith, đảm bảo tính toàn vẹn dữ liệu ACID Transaction và xử lý đồng thời hiệu năng cao.',
    requirements:
      '• Tối thiểu 3 năm kinh nghiệm TypeScript, Node.js, NestJS.\n• Nắm vững PostgreSQL, Prisma ORM, Transaction Isolation & Concurrency Locking.\n• Tư duy thiết kế Finite State Machine và viết Unit Test chuẩn.',
    salaryRange: '38.000.000 - 52.000.000 VNĐ',
    status: 'PUBLISHED',
    headcount: 2,
    filledCount: 1,
    passScoreThreshold: 3.5,
    stages: DEFAULT_STAGES_TEMPLATE.map((s) => ({ ...s })),
    criteria: [
      {
        id: 1,
        name: 'Kiến trúc Backend & CSDL ACID (Điểm liệt)',
        weightPercent: 50,
        isKnockout: true,
      },
      {
        id: 2,
        name: 'Tư duy Giải quyết Vấn đề & State Machine',
        weightPercent: 30,
        isKnockout: false,
      },
      {
        id: 3,
        name: 'Giao tiếp Kỹ thuật & Văn hóa Đội ngũ',
        weightPercent: 20,
        isKnockout: false,
      },
    ],
    createdAt: '2026-11-02',
  },
  {
    id: 1002,
    requisitionId: 502,
    title: 'Product Designer (Design Systems & UI/UX)',
    department: 'Product & Design',
    description:
      'Xây dựng hệ thống Design Tokens đa tầng (Primitive -> Semantic -> Component), thiết kế trải nghiệm B2B SaaS hiện đại và micro-interactions.',
    requirements:
      '• Thành thạo Figma, Auto-Layout, Design Tokens & hệ quy chuẩn WAI-ARIA.\n• Có kinh nghiệm thiết kế B2B SaaS Dashboard, Kanban, Split-Screen Workspace.',
    salaryRange: '28.000.000 - 40.000.000 VNĐ',
    status: 'PUBLISHED',
    headcount: 1,
    filledCount: 0,
    passScoreThreshold: 3.5,
    stages: DEFAULT_STAGES_TEMPLATE.map((s) =>
      s.code === 'TEST' ? { ...s, name: 'Design Portfolio Review' } : { ...s },
    ),
    criteria: [
      {
        id: 1,
        name: 'Tư duy Hệ thống Design Tokens & UI Craft (Điểm liệt)',
        weightPercent: 45,
        isKnockout: true,
      },
      {
        id: 2,
        name: 'Nghiên cứu UX & Giải quyết Bài toán Sản phẩm',
        weightPercent: 35,
        isKnockout: false,
      },
      {
        id: 3,
        name: 'Phối hợp Kỹ thuật với Frontend Engineers',
        weightPercent: 20,
        isKnockout: false,
      },
    ],
    createdAt: '2026-11-06',
  },
];

export const INITIAL_CANDIDATES: CandidateCardData[] = [
  {
    id: 101,
    jobId: 1001,
    fullName: 'Nguyễn Quốc Tuấn',
    email: 'tuan.nguyen@dev.vn',
    phone: '0901234567',
    experience: '4 năm NestJS / PostgreSQL / Distributed Lock & ACID Transactions',
    resumeFileName: 'CV_NguyenQuocTuan_SeniorBackend.pdf',
    stageCode: 'INTERVIEW',
    trackingToken: '8f91a2c0-1122-4b33-9900-atsdemo00101',
    appliedAt: '2026-11-01 09:00',
    appliedDaysAgo: 12,
    isReturningCandidate: false,
    interviewScheduledAt: '2026-11-15 14:00',
    interviewDurationMinutes: 60,
    meetingLink: 'https://meet.google.com/ats-tuan-interview',
    interviewLocation: 'Phòng họp tầng 8 / Google Meet',
    offerSalary: '45.000.000 VNĐ / tháng',
    offerStartDate: '2026-12-01',
    offerBenefits: 'Gói bảo hiểm cao cấp + 15 ngày phép + MacBook Pro M3',
    offerApprovedByHm: false,
    calibrated: false,
    calibrationNote: null,
    sheets: [
      {
        interviewerId: 4,
        interviewerName: 'Phạm Hoàng Nam',
        interviewerEmail: 'int1@ats.local',
        submitted: true,
        submittedAt: '2026-11-12 10:15',
        recommendation: 'STRONG_HIRE',
        comment: 'Nắm rất sâu Transaction Isolation và thiết kế Finite State Machine.',
        scores: { 1: 4.5, 2: 5.0, 3: 4.0 },
        criterionComments: {
          1: 'Hiểu rõ cơ chế SELECT FOR UPDATE và Atomic Update.',
          2: 'Chia tách hàm thuần (Pure Function) cực kỳ sạch sẽ.',
          3: 'Trình bày mạch lạc, rõ ràng.',
        },
      },
      {
        interviewerId: 5,
        interviewerName: 'Vũ Hải Yến',
        interviewerEmail: 'int2@ats.local',
        submitted: true,
        submittedAt: '2026-11-12 11:00',
        recommendation: 'HIRE',
        comment: 'Kiến trúc tổng thể tốt nhưng phần tối ưu thuật toán tôi chấm khắt khe hơn.',
        scores: { 1: 4.0, 2: 2.5, 3: 4.0 }, // Δ_2 = 2.5 >= 2.0 -> Variance Alert!
        criterionComments: {
          1: 'Thiết kế schema 13 bảng chuẩn xác.',
          2: 'Cần giải thích thêm về edge-case xử lý đồng thời (Δ = 2.5).',
          3: 'Thái độ cầu thị, hợp tác tốt.',
        },
      },
    ],
    logs: [
      {
        id: 1,
        fromStageCode: null,
        toStageCode: 'APPLIED',
        actorName: 'Nguyễn Quốc Tuấn',
        actorRole: 'CANDIDATE',
        note: 'Ứng viên nộp hồ sơ CV PDF qua cổng tuyển dụng',
        createdAt: '2026-11-01 09:00',
      },
      {
        id: 2,
        fromStageCode: 'APPLIED',
        toStageCode: 'SCREENING',
        actorName: 'Lê Thu Hà',
        actorRole: 'HR',
        note: 'CV đạt chuẩn kinh nghiệm NestJS & PostgreSQL',
        createdAt: '2026-11-03 10:30',
      },
      {
        id: 3,
        fromStageCode: 'SCREENING',
        toStageCode: 'TEST',
        actorName: 'Lê Thu Hà',
        actorRole: 'HR',
        note: 'Gửi bài test thiết kế hệ thống',
        createdAt: '2026-11-05 14:00',
      },
      {
        id: 4,
        fromStageCode: 'TEST',
        toStageCode: 'INTERVIEW',
        actorName: 'Lê Thu Hà',
        actorRole: 'HR',
        note: 'Đã tạo lịch phỏng vấn .ics với 2 giám khảo',
        createdAt: '2026-11-08 16:00',
      },
    ],
  },
  {
    id: 102,
    jobId: 1001,
    fullName: 'Đặng Minh Châu',
    email: 'chau.dang@tech.vn',
    phone: '0912345678',
    experience: '5 năm System Architect / Modular Monolith / High Availability',
    resumeFileName: 'CV_DangMinhChau_Architect.pdf',
    stageCode: 'OFFER',
    trackingToken: '7b44d1e0-2233-4c44-8811-atsdemo00102',
    appliedAt: '2026-10-30 08:30',
    appliedDaysAgo: 14,
    isReturningCandidate: false,
    interviewScheduledAt: '2026-11-10 09:30',
    interviewDurationMinutes: 60,
    meetingLink: 'https://meet.google.com/ats-chau-interview',
    interviewLocation: 'Google Meet',
    offerSalary: '48.000.000 VNĐ / tháng',
    offerStartDate: '2026-12-01',
    offerBenefits: 'Lương tháng 13 + Bảo hiểm PVI Care + Phụ cấp thiết bị',
    offerApprovedByHm: false, // Đang chờ Hiring Manager duyệt ở Portal HM!
    calibrated: true,
    calibrationNote: 'Hội đồng thống nhất đề xuất mức lương Senior bậc 2.',
    calibratedByName: 'Lê Thu Hà',
    calibratedAt: '2026-11-11 15:00',
    sheets: [
      {
        interviewerId: 4,
        interviewerName: 'Phạm Hoàng Nam',
        interviewerEmail: 'int1@ats.local',
        submitted: true,
        submittedAt: '2026-11-10 11:00',
        recommendation: 'STRONG_HIRE',
        comment: 'Ứng viên xuất sắc, trả lời trọn vẹn mọi câu hỏi hóc búa.',
        scores: { 1: 4.5, 2: 4.5, 3: 4.5 },
        criterionComments: {
          1: 'Rất vững CSDL và Index.',
          2: 'Tư duy hệ thống sắc bén.',
          3: 'Khả năng dẫn dắt nhóm tốt.',
        },
      },
      {
        interviewerId: 5,
        interviewerName: 'Vũ Hải Yến',
        interviewerEmail: 'int2@ats.local',
        submitted: true,
        submittedAt: '2026-11-10 11:20',
        recommendation: 'STRONG_HIRE',
        comment: 'Đồng ý tuyển ngay.',
        scores: { 1: 4.5, 2: 4.0, 3: 4.5 },
        criterionComments: {
          1: 'Kiến thức nền tảng sâu.',
          2: 'Giải quyết tình huống rất nhanh.',
          3: 'Giao tiếp chuyên nghiệp.',
        },
      },
    ],
    logs: [
      {
        id: 1,
        fromStageCode: null,
        toStageCode: 'APPLIED',
        actorName: 'Đặng Minh Châu',
        actorRole: 'PUBLIC',
        note: 'Nộp hồ sơ ứng tuyển',
        createdAt: '2026-10-30 08:30',
      },
      {
        id: 2,
        fromStageCode: 'APPLIED',
        toStageCode: 'SCREENING',
        actorName: 'Lê Thu Hà',
        actorRole: 'HR',
        note: 'Vượt qua sàng lọc CV',
        createdAt: '2026-11-01 09:00',
      },
      {
        id: 3,
        fromStageCode: 'SCREENING',
        toStageCode: 'TEST',
        actorName: 'Lê Thu Hà',
        actorRole: 'HR',
        note: 'Hoàn thành bài kiểm tra kiến trúc 95/100',
        createdAt: '2026-11-04 10:00',
      },
      {
        id: 4,
        fromStageCode: 'TEST',
        toStageCode: 'INTERVIEW',
        actorName: 'Lê Thu Hà',
        actorRole: 'HR',
        note: 'Mời phỏng vấn hội đồng',
        createdAt: '2026-11-08 14:00',
      },
      {
        id: 5,
        fromStageCode: 'INTERVIEW',
        toStageCode: 'OFFER',
        actorName: 'Lê Thu Hà',
        actorRole: 'HR',
        note: 'Điểm tổng S = 4.43 >= 3.50, chuyển sang vòng Đề nghị (Offer)',
        createdAt: '2026-11-11 16:00',
      },
    ],
  },
  {
    id: 103,
    jobId: 1001,
    fullName: 'Lê Hoàng Bách',
    email: 'bach.le@coder.vn',
    phone: '0987654321',
    experience: '3 năm Node.js / Express / React & Microservices',
    resumeFileName: 'CV_LeHoangBach_NodeJS.pdf',
    stageCode: 'INTERVIEW',
    trackingToken: '3c12e9f0-3344-4d55-7722-atsdemo00103',
    appliedAt: '2026-11-06 10:15',
    appliedDaysAgo: 7,
    isReturningCandidate: true,
    previousApplicationsNote:
      'Từng ứng tuyển vị trí Mid-level Backend cách đây 5 tháng (Khớp SĐT chuẩn hóa D09)',
    interviewScheduledAt: '2026-11-16 10:00',
    interviewDurationMinutes: 60,
    meetingLink: 'https://meet.google.com/ats-bach-interview',
    interviewLocation: 'Google Meet',
    offerSalary: '38.000.000 VNĐ / tháng',
    offerApprovedByHm: false,
    calibrated: false,
    calibrationNote: null,
    sheets: [
      {
        interviewerId: 4,
        interviewerName: 'Phạm Hoàng Nam',
        interviewerEmail: 'int1@ats.local',
        submitted: true,
        submittedAt: '2026-11-12 09:30',
        recommendation: 'HIRE',
        comment: 'Có kinh nghiệm thực chiến tốt, tiến bộ rõ rệt so với 5 tháng trước.',
        scores: { 1: 4.0, 2: 3.5, 3: 4.0 },
        criterionComments: {
          1: 'Nắm vững Prisma và Transaction.',
          2: 'Giải quyết bài toán ở mức khá.',
          3: 'Thái độ tích cực.',
        },
      },
      {
        interviewerId: 5,
        interviewerName: 'Vũ Hải Yến',
        interviewerEmail: 'int2@ats.local',
        submitted: false, // Chưa nộp phiếu -> Kích hoạt Blind Evaluation Lock!
        recommendation: 'HIRE',
        comment: '',
        scores: { 1: 3.5, 2: 4.0, 3: 3.5 },
        criterionComments: {},
      },
    ],
    logs: [
      {
        id: 1,
        fromStageCode: null,
        toStageCode: 'APPLIED',
        actorName: 'Lê Hoàng Bách',
        actorRole: 'PUBLIC',
        note: 'Ứng viên nộp hồ sơ (Phát hiện trùng lịch sử ứng viên cũ D09)',
        createdAt: '2026-11-06 10:15',
      },
      {
        id: 2,
        fromStageCode: 'APPLIED',
        toStageCode: 'SCREENING',
        actorName: 'Lê Thu Hà',
        actorRole: 'HR',
        note: 'Duyệt qua vòng sàng lọc',
        createdAt: '2026-11-07 11:00',
      },
      {
        id: 3,
        fromStageCode: 'SCREENING',
        toStageCode: 'TEST',
        actorName: 'Lê Thu Hà',
        actorRole: 'HR',
        note: 'Chuyển sang vòng Test kỹ thuật',
        createdAt: '2026-11-09 09:00',
      },
      {
        id: 4,
        fromStageCode: 'TEST',
        toStageCode: 'INTERVIEW',
        actorName: 'Lê Thu Hà',
        actorRole: 'HR',
        note: 'Xếp lịch phỏng vấn hội đồng 2 giám khảo',
        createdAt: '2026-11-11 14:00',
      },
    ],
  },
  {
    id: 104,
    jobId: 1001,
    fullName: 'Phạm Gia Huy',
    email: 'huy.pham@dev.vn',
    phone: '0933445566',
    experience: '2.5 năm Backend Developer (Express / MongoDB)',
    resumeFileName: 'CV_PhamGiaHuy_Backend.pdf',
    stageCode: 'INTERVIEW',
    trackingToken: '5e77b3a1-4455-4e66-6633-atsdemo00104',
    appliedAt: '2026-11-04 13:20',
    appliedDaysAgo: 9,
    isReturningCandidate: false,
    interviewScheduledAt: '2026-11-11 15:30',
    interviewDurationMinutes: 60,
    meetingLink: 'https://meet.google.com/ats-huy-interview',
    interviewLocation: 'Google Meet',
    offerSalary: '35.000.000 VNĐ / tháng',
    offerApprovedByHm: false,
    calibrated: false,
    calibrationNote: null,
    sheets: [
      {
        interviewerId: 4,
        interviewerName: 'Phạm Hoàng Nam',
        interviewerEmail: 'int1@ats.local',
        submitted: true,
        submittedAt: '2026-11-11 16:40',
        recommendation: 'NO_HIRE',
        comment: 'Hổng kiến thức cơ bản về ACID Transaction & CSDL quan hệ.',
        scores: { 1: 1.5, 2: 3.5, 3: 4.0 }, // Knock-out!
        criterionComments: {
          1: 'Không phân biệt được Read Committed và Serializable (1.5 điểm liệt).',
          2: 'Viết code xử lý chuỗi ổn.',
          3: 'Giao tiếp lịch sự.',
        },
      },
      {
        interviewerId: 5,
        interviewerName: 'Vũ Hải Yến',
        interviewerEmail: 'int2@ats.local',
        submitted: true,
        submittedAt: '2026-11-11 16:55',
        recommendation: 'NO_HIRE',
        comment: 'Không đạt tiêu chí bắt buộc về CSDL.',
        scores: { 1: 1.5, 2: 3.0, 3: 3.5 },
        criterionComments: {
          1: 'Chưa đáp ứng tiêu chí bắt buộc của vị trí Senior (1.5 điểm).',
          2: 'Mức trung bình.',
          3: 'Bình thường.',
        },
      },
    ],
    logs: [
      {
        id: 1,
        fromStageCode: null,
        toStageCode: 'APPLIED',
        actorName: 'Phạm Gia Huy',
        actorRole: 'PUBLIC',
        note: 'Nộp hồ sơ ứng tuyển',
        createdAt: '2026-11-04 13:20',
      },
      {
        id: 2,
        fromStageCode: 'APPLIED',
        toStageCode: 'SCREENING',
        actorName: 'Lê Thu Hà',
        actorRole: 'HR',
        note: 'Duyệt hồ sơ',
        createdAt: '2026-11-05 10:00',
      },
      {
        id: 3,
        fromStageCode: 'SCREENING',
        toStageCode: 'TEST',
        actorName: 'Lê Thu Hà',
        actorRole: 'HR',
        note: 'Qua vòng Test',
        createdAt: '2026-11-07 15:00',
      },
      {
        id: 4,
        fromStageCode: 'TEST',
        toStageCode: 'INTERVIEW',
        actorName: 'Lê Thu Hà',
        actorRole: 'HR',
        note: 'Chuyển vào vòng Phỏng vấn',
        createdAt: '2026-11-09 11:00',
      },
    ],
  },
  {
    id: 105,
    jobId: 1001,
    fullName: 'Võ Thanh Trúc',
    email: 'truc.vo@engineer.vn',
    phone: '0977889900',
    experience: '3.5 năm TypeScript / NestJS / GraphQL',
    resumeFileName: 'CV_VoThanhTruc_NestJS.pdf',
    stageCode: 'TEST',
    trackingToken: '9a00c4d2-5566-4f77-5544-atsdemo00105',
    appliedAt: '2026-11-09 11:00',
    appliedDaysAgo: 4,
    isReturningCandidate: false,
    interviewScheduledAt: null,
    interviewDurationMinutes: 60,
    meetingLink: null,
    interviewLocation: null,
    offerSalary: '40.000.000 VNĐ / tháng',
    offerApprovedByHm: false,
    calibrated: false,
    calibrationNote: null,
    sheets: [
      {
        interviewerId: 4,
        interviewerName: 'Phạm Hoàng Nam',
        interviewerEmail: 'int1@ats.local',
        submitted: false,
        recommendation: 'HIRE',
        comment: '',
        scores: { 1: 4.0, 2: 4.0, 3: 4.0 },
        criterionComments: {},
      },
      {
        interviewerId: 5,
        interviewerName: 'Vũ Hải Yến',
        interviewerEmail: 'int2@ats.local',
        submitted: false,
        recommendation: 'HIRE',
        comment: '',
        scores: { 1: 4.0, 2: 4.0, 3: 4.0 },
        criterionComments: {},
      },
    ],
    logs: [
      {
        id: 1,
        fromStageCode: null,
        toStageCode: 'APPLIED',
        actorName: 'Võ Thanh Trúc',
        actorRole: 'PUBLIC',
        note: 'Nộp hồ sơ ứng tuyển',
        createdAt: '2026-11-09 11:00',
      },
      {
        id: 2,
        fromStageCode: 'APPLIED',
        toStageCode: 'SCREENING',
        actorName: 'Lê Thu Hà',
        actorRole: 'HR',
        note: 'Qua vòng Sàng lọc CV',
        createdAt: '2026-11-10 09:00',
      },
      {
        id: 3,
        fromStageCode: 'SCREENING',
        toStageCode: 'TEST',
        actorName: 'Lê Thu Hà',
        actorRole: 'HR',
        note: 'Đang làm bài Test kỹ thuật',
        createdAt: '2026-11-11 10:00',
      },
    ],
  },
  {
    id: 106,
    jobId: 1001,
    fullName: 'Trịnh Quốc Bảo',
    email: 'bao.trinh@fullstack.vn',
    phone: '0966112233',
    experience: '4.5 năm Backend Architecture & DevOps',
    resumeFileName: 'CV_TrinhQuocBao_SeniorBackend.pdf',
    stageCode: 'HIRED',
    trackingToken: '1d22f8a3-6677-4a88-4455-atsdemo00106',
    appliedAt: '2026-10-28 09:00',
    appliedDaysAgo: 16,
    isReturningCandidate: false,
    interviewScheduledAt: '2026-11-02 10:00',
    interviewDurationMinutes: 60,
    meetingLink: 'https://meet.google.com/ats-bao-interview',
    interviewLocation: 'Phòng họp VIP tầng 9',
    offerSalary: '46.000.000 VNĐ / tháng',
    offerStartDate: '2026-11-25',
    offerBenefits: 'Gói cổ phần thưởng ESOP + Bảo hiểm sức khỏe toàn diện',
    offerApprovedByHm: true,
    offerApprovedByName: 'Trần Minh Quân',
    offerApprovedAt: '2026-11-05 14:00',
    calibrated: false,
    calibrationNote: null,
    sheets: [
      {
        interviewerId: 4,
        interviewerName: 'Phạm Hoàng Nam',
        interviewerEmail: 'int1@ats.local',
        submitted: true,
        submittedAt: '2026-11-02 11:30',
        recommendation: 'STRONG_HIRE',
        comment: 'Rất vững vàng cả lý thuyết lẫn thực nghiệm.',
        scores: { 1: 4.5, 2: 4.0, 3: 4.5 },
        criterionComments: {
          1: 'Xuất sắc.',
          2: 'Rất tốt.',
          3: 'Phù hợp văn hóa.',
        },
      },
      {
        interviewerId: 5,
        interviewerName: 'Vũ Hải Yến',
        interviewerEmail: 'int2@ats.local',
        submitted: true,
        submittedAt: '2026-11-02 11:45',
        recommendation: 'STRONG_HIRE',
        comment: 'Tuyển thẳng.',
        scores: { 1: 4.5, 2: 4.5, 3: 4.0 },
        criterionComments: {
          1: 'Rất chắc chắn.',
          2: 'Tư duy hệ thống tốt.',
          3: 'Giao tiếp rõ ràng.',
        },
      },
    ],
    logs: [
      {
        id: 1,
        fromStageCode: null,
        toStageCode: 'APPLIED',
        actorName: 'Trịnh Quốc Bảo',
        actorRole: 'PUBLIC',
        note: 'Nộp hồ sơ ứng tuyển',
        createdAt: '2026-10-28 09:00',
      },
      {
        id: 2,
        fromStageCode: 'APPLIED',
        toStageCode: 'SCREENING',
        actorName: 'Lê Thu Hà',
        actorRole: 'HR',
        note: 'Qua vòng Sàng lọc',
        createdAt: '2026-10-29 10:00',
      },
      {
        id: 3,
        fromStageCode: 'SCREENING',
        toStageCode: 'TEST',
        actorName: 'Lê Thu Hà',
        actorRole: 'HR',
        note: 'Qua vòng Test',
        createdAt: '2026-10-31 15:00',
      },
      {
        id: 4,
        fromStageCode: 'TEST',
        toStageCode: 'INTERVIEW',
        actorName: 'Lê Thu Hà',
        actorRole: 'HR',
        note: 'Hoàn thành phỏng vấn',
        createdAt: '2026-11-02 10:00',
      },
      {
        id: 5,
        fromStageCode: 'INTERVIEW',
        toStageCode: 'OFFER',
        actorName: 'Lê Thu Hà',
        actorRole: 'HR',
        note: 'Gửi đề nghị nhận việc',
        createdAt: '2026-11-04 10:00',
      },
      {
        id: 6,
        fromStageCode: 'OFFER',
        toStageCode: 'HIRED',
        actorName: 'Lê Thu Hà',
        actorRole: 'HR',
        note: 'Chốt tuyển dụng (HIRED) sau khi HM Trần Minh Quân phê duyệt Offer',
        createdAt: '2026-11-06 09:00',
      },
    ],
  },
  {
    id: 201,
    jobId: 1002,
    fullName: 'Hoàng Ngọc Lan',
    email: 'lan.hoang@design.vn',
    phone: '0944556677',
    experience: '4 năm Senior UI/UX & Design Systems (Figma / Tokens / Shadcn)',
    resumeFileName: 'Portfolio_HoangNgocLan_ProductDesigner.pdf',
    stageCode: 'INTERVIEW',
    trackingToken: '2b88e1c4-7788-4b99-8800-atsdemo00201',
    appliedAt: '2026-11-07 10:00',
    appliedDaysAgo: 6,
    isReturningCandidate: false,
    interviewScheduledAt: '2026-11-17 14:30',
    interviewDurationMinutes: 60,
    meetingLink: 'https://meet.google.com/ats-lan-design',
    interviewLocation: 'Google Meet',
    offerSalary: '36.000.000 VNĐ / tháng',
    offerApprovedByHm: false,
    calibrated: false,
    calibrationNote: null,
    sheets: [
      {
        interviewerId: 2,
        interviewerName: 'Trần Minh Quân',
        interviewerEmail: 'hm.eng@ats.local',
        submitted: true,
        submittedAt: '2026-11-12 14:00',
        recommendation: 'STRONG_HIRE',
        comment: 'Portfolio hệ thống Design Tokens rất bài bản.',
        scores: { 1: 4.5, 2: 4.0, 3: 4.5 },
        criterionComments: {
          1: 'Xây dựng token 3 lớp rất chuẩn.',
          2: 'Hiểu sâu luồng nghiệp vụ B2B.',
          3: 'Phối hợp rất ăn ý với kỹ sư.',
        },
      },
      {
        interviewerId: 4,
        interviewerName: 'Phạm Hoàng Nam',
        interviewerEmail: 'int1@ats.local',
        submitted: false,
        recommendation: 'HIRE',
        comment: '',
        scores: { 1: 4.0, 2: 4.0, 3: 4.0 },
        criterionComments: {},
      },
    ],
    logs: [
      {
        id: 1,
        fromStageCode: null,
        toStageCode: 'APPLIED',
        actorName: 'Hoàng Ngọc Lan',
        actorRole: 'PUBLIC',
        note: 'Nộp hồ sơ vào vị trí Product Designer',
        createdAt: '2026-11-07 10:00',
      },
      {
        id: 2,
        fromStageCode: 'APPLIED',
        toStageCode: 'SCREENING',
        actorName: 'Lê Thu Hà',
        actorRole: 'HR',
        note: 'Qua vòng Sàng lọc Portfolio',
        createdAt: '2026-11-08 09:00',
      },
      {
        id: 3,
        fromStageCode: 'SCREENING',
        toStageCode: 'TEST',
        actorName: 'Lê Thu Hà',
        actorRole: 'HR',
        note: 'Qua vòng Design Portfolio Review',
        createdAt: '2026-11-10 11:00',
      },
      {
        id: 4,
        fromStageCode: 'TEST',
        toStageCode: 'INTERVIEW',
        actorName: 'Lê Thu Hà',
        actorRole: 'HR',
        note: 'Xếp lịch phỏng vấn hội đồng',
        createdAt: '2026-11-11 16:00',
      },
    ],
  },
];

export const INITIAL_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: 1,
    time: '2026-11-01 08:00',
    actorName: 'Trần Minh Quân',
    actorRole: 'HIRING_MANAGER',
    action: 'CREATE_REQUISITION',
    detail: 'Tạo yêu cầu định biên Senior Backend Engineer (headcount = 2)',
  },
  {
    id: 2,
    time: '2026-11-02 08:30',
    actorName: 'Lê Thu Hà',
    actorRole: 'HR',
    action: 'PUBLISH_JOB',
    detail: 'Duyệt Requisition #501 & đăng tuyển Job #1001 với bộ tiêu chí trọng số 100%',
  },
  {
    id: 3,
    time: '2026-11-12 11:00',
    actorName: 'Vũ Hải Yến',
    actorRole: 'INTERVIEWER',
    action: 'SUBMIT_SCORECARD',
    detail: 'Nộp phiếu chấm Nguyễn Quốc Tuấn → Phát hiện lệch điểm Δ = 2.5 (Variance Alert)',
  },
];

export const INITIAL_EMAIL_OUTBOX: EmailOutboxItem[] = [
  {
    id: 1,
    sentAt: '2026-11-08 16:00',
    toEmails: ['tuan.nguyen@dev.vn', 'int1@ats.local', 'int2@ats.local'],
    subject: '[ATS Invite] Thư mời phỏng vấn — Senior Backend Engineer (Nguyễn Quốc Tuấn)',
    category: 'INTERVIEW_ICS',
    bodyPreview:
      'Đính kèm file lịch chuẩn iCalendar (.ics) lúc 2026-11-15 14:00 (60 phút) qua Google Meet.',
    hasIcsAttachment: true,
    candidateId: 101,
  },
  {
    id: 2,
    sentAt: '2026-11-06 09:00',
    toEmails: ['bao.trinh@fullstack.vn'],
    subject: '[ATS Official] Chúc mừng Trúng tuyển — Senior Backend Engineer',
    category: 'HIRED',
    bodyPreview:
      'Chúc mừng Trịnh Quốc Bảo đã chính thức trúng tuyển vị trí Senior Backend Engineer (Định biên 1/2).',
    candidateId: 106,
  },
];

const STORAGE_KEY = 'ats_enterprise_v3_state';
const SESSION_USER_ID_KEY = 'ats_enterprise_v3_user_id';

export function getInitialState(): AtsPersistentState {
  return {
    users: INITIAL_USERS,
    departments: INITIAL_DEPARTMENTS,
    requisitions: INITIAL_REQUISITIONS,
    jobs: INITIAL_JOBS,
    candidates: INITIAL_CANDIDATES,
    auditLogs: INITIAL_AUDIT_LOGS,
    emailOutbox: INITIAL_EMAIL_OUTBOX,
  };
}

export function loadPersistedState(): AtsPersistentState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getInitialState();
    const parsed = JSON.parse(raw) as AtsPersistentState;
    if (!parsed.users || !parsed.jobs || !parsed.candidates) {
      return getInitialState();
    }
    return parsed;
  } catch {
    return getInitialState();
  }
}

export function savePersistedState(state: AtsPersistentState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota errors
  }
}

export function loadSessionUserId(): number | null {
  try {
    const raw = localStorage.getItem(SESSION_USER_ID_KEY);
    return raw ? Number(raw) : null;
  } catch {
    return null;
  }
}

export function saveSessionUserId(userId: number | null) {
  try {
    if (userId === null) {
      localStorage.removeItem(SESSION_USER_ID_KEY);
    } else {
      localStorage.setItem(SESSION_USER_ID_KEY, String(userId));
    }
  } catch {
    // Ignore
  }
}

export function resetPersistedState(): AtsPersistentState {
  const fresh = getInitialState();
  savePersistedState(fresh);
  return fresh;
}

export function normalizeEmailInput(email: string): string {
  return (email ?? '').trim().toLowerCase();
}

export function normalizePhoneInput(phone?: string): string {
  const digits = (phone ?? '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('84') && digits.length >= 10) {
    return `0${digits.slice(2)}`;
  }
  return digits;
}

/**
 * Thuật toán tính điểm trọng số theo đơn vị nửa điểm (Spec 004)
 */
export function computeCandidateMetrics(candidate: CandidateCardData, criteria: CriterionDef[]) {
  const submittedSheets = candidate.sheets.filter((s) => s.submitted);
  const allSubmitted =
    candidate.sheets.length > 0 && submittedSheets.length === candidate.sheets.length;

  if (!allSubmitted || criteria.length === 0) {
    return {
      allSubmitted: false,
      submittedCount: submittedSheets.length,
      panelSize: candidate.sheets.length,
      overallScore: null as number | null,
      hasVarianceAlert: false,
      isDisqualified: false,
      perCriterion: [] as {
        criterionId: number;
        mean: number;
        delta: number;
        varianceFlag: boolean;
        knockoutFail: boolean;
        knockoutWarn: boolean;
      }[],
    };
  }

  const m = submittedSheets.length;
  let weightedHalfSum = 0;

  const perCriterion = criteria.map((c) => {
    const hs = submittedSheets.map((s) => Math.round((s.scores[c.id] ?? 3.0) * 2));
    const sumH = hs.reduce((a, b) => a + b, 0);
    const mean = Math.round((sumH / (2 * m)) * 100) / 100;
    const deltaH = Math.max(...hs) - Math.min(...hs);
    const delta = Math.round((deltaH / 2) * 100) / 100;
    const varianceFlag = deltaH >= 4; // Δ >= 2.0
    const knockoutFail = c.isKnockout && sumH < 4 * m; // mean < 2.0
    const knockoutWarn = c.isKnockout && Math.min(...hs) <= 3; // min <= 1.5
    weightedHalfSum += c.weightPercent * sumH;
    return {
      criterionId: c.id,
      mean,
      delta,
      varianceFlag,
      knockoutFail,
      knockoutWarn,
    };
  });

  const overallScore = Math.round((weightedHalfSum / (200 * m)) * 100) / 100;
  const isDisqualified = perCriterion.some((p) => p.knockoutFail);
  const hasVarianceAlert = perCriterion.some(
    (p) => p.varianceFlag || (p.knockoutWarn && !p.knockoutFail),
  );

  return {
    allSubmitted: true,
    submittedCount: m,
    panelSize: m,
    overallScore,
    hasVarianceAlert,
    isDisqualified,
    perCriterion,
  };
}

/**
 * Tạo và tải file lịch phỏng vấn chuẩn iCalendar (.ics) về máy (Spec 003 - S3.13)
 */
export function downloadIcsFile(candidate: CandidateCardData, jobTitle: string) {
  const nowStr = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const icsLines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Internal Enterprise ATS//Scorecard Engine//VN',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:interview-${candidate.id}@ats.local`,
    `DTSTAMP:${nowStr}`,
    `SUMMARY:[ATS Phỏng vấn] ${jobTitle} — ${candidate.fullName}`,
    `DESCRIPTION:Buổi phỏng vấn hội đồng cho ứng viên ${candidate.fullName} (${candidate.email}). Thời gian: ${candidate.interviewScheduledAt || 'Sắp tới'}. Link: ${candidate.meetingLink || 'Tại văn phòng'}`,
    `LOCATION:${candidate.meetingLink || candidate.interviewLocation || 'Google Meet'}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  const blob = new Blob([icsLines], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Lich_Phong_Van_${candidate.fullName.replace(/\s+/g, '_')}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Xuất bảng xếp hạng ứng viên ra file CSV (mở trực tiếp bằng Microsoft Excel)
 */
export function exportRankingToCsv(
  job: JobItem,
  candidates: CandidateCardData[],
  criteria: CriterionDef[],
) {
  const headers = [
    'Hang',
    'Ung Vien',
    'Email',
    'So Dien Thoai',
    'Vong Hien Tai',
    ...criteria.map((c) => `${c.name} (${c.weightPercent}%)`),
    'Diem Tong Ket (S)',
    'Canh Bao Lech (Delta >= 2.0)',
    'Diem Liet (Knock-out)',
    'Trang Thai Calibration',
  ];

  const rows = candidates
    .map((cand) => ({ cand, m: computeCandidateMetrics(cand, criteria) }))
    .sort((a, b) => (b.m.overallScore ?? -1) - (a.m.overallScore ?? -1))
    .map(({ cand, m }, idx) => {
      const critCols = criteria.map((c) => {
        const pc = m.perCriterion.find((p) => p.criterionId === c.id);
        if (!m.allSubmitted || !pc) return `Blind Lock (${m.submittedCount}/${m.panelSize})`;
        return `TB ${pc.mean.toFixed(2)} (Delta=${pc.delta.toFixed(1)})`;
      });
      return [
        idx + 1,
        `"${cand.fullName}"`,
        cand.email,
        cand.phone,
        cand.stageCode,
        ...critCols.map((v) => `"${v}"`),
        m.overallScore !== null ? m.overallScore.toFixed(2) : 'Chua du phieu',
        m.hasVarianceAlert ? 'CO CANH BAO' : 'Khong',
        m.isDisqualified ? 'DIEM LIET' : 'Dat',
        cand.calibrated ? `"Da Calibration: ${cand.calibrationNote || ''}"` : 'Chua',
      ].join(',');
    });

  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Bang_Xep_Hang_${job.title.replace(/[^a-zA-Z0-9]/g, '_')}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

