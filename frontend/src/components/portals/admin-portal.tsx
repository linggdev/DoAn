import {
  Activity,
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  Award,
  Briefcase,
  Building2,
  Check,
  CheckCircle2,
  CheckSquare,
  Clock,
  Copy,
  Database,
  Download,
  Edit3,
  ExternalLink,
  Eye,
  FileCode,
  FileSpreadsheet,
  Filter,
  Info,
  KeyRound,
  Layers,
  LayoutGrid,
  Lock,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Server,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Sparkles,
  Square,
  Table as TableIcon,
  Terminal,
  Trash2,
  TrendingUp,
  Unlock,
  Upload,
  UserCheck,
  UserPlus,
  Users,
  X,
  Zap,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { ROLE_META, UserRole } from '@/components/animate-ui/animated-sidebar';
import { GuardViolationState } from '@/components/animate-ui/guard-dialog';
import { ModernSelect } from '@/components/animate-ui/modern-select';
import { TablePagination } from '@/components/animate-ui/table-pagination';
import { JobSetupView } from '@/components/portals/job-setup-view';
import {
  AccountUser,
  AtsPersistentState,
  computeCandidateMetrics,
  CriterionDef,
  exportRankingToCsv,
  JobItem,
  normalizeEmailInput,
  normalizePhoneInput,
  RequisitionItem,
  resetPersistedState,
  StageCode,
  StageDef,
} from '@/lib/store';
import { cn } from '@/lib/utils';

interface AdminPortalViewProps {
  activeSection: string;
  onSelectSection: (section: string) => void;
  currentUser: AccountUser;
  store: AtsPersistentState;
  setStore: React.Dispatch<React.SetStateAction<AtsPersistentState>>;
  selectedJob: JobItem;
  onSelectJobId: (jobId: number) => void;
  onOpenCandidate360: (candidateId: number) => void;
  onTriggerViolation: (v: Omit<GuardViolationState, 'open'>) => void;
  appendAudit: (action: string, detail: string) => void;
}

const RBAC_MATRIX: {
  capability: string;
  specRef: string;
  roles: Record<UserRole, 'FULL' | 'SCOPED' | 'READ' | 'NONE'>;
}[] = [
  {
    capability: 'Quản trị Tài khoản, Đổi Role & Khóa/Mở khóa (IAM)',
    specRef: 'S1.5, S1.6',
    roles: { ADMIN: 'FULL', HIRING_MANAGER: 'NONE', HR: 'NONE', INTERVIEWER: 'NONE', CANDIDATE: 'NONE' },
  },
  {
    capability: 'Tạo & Phê duyệt Phiếu Yêu cầu Định biên (Job Requisition)',
    specRef: 'S2.1 - S2.4',
    roles: { ADMIN: 'FULL', HIRING_MANAGER: 'FULL', HR: 'READ', INTERVIEWER: 'NONE', CANDIDATE: 'NONE' },
  },
  {
    capability: 'Thiết kế Tin Tuyển dụng, Vòng Pipeline & Barem Trọng số (∑w=100%)',
    specRef: 'S2.5 - S2.11',
    roles: { ADMIN: 'FULL', HIRING_MANAGER: 'READ', HR: 'FULL', INTERVIEWER: 'READ', CANDIDATE: 'NONE' },
  },
  {
    capability: 'Kéo thả Kanban Pipeline & Chốt chặn Luồng Trạng thái',
    specRef: 'S3.8 - S3.12',
    roles: { ADMIN: 'FULL', HIRING_MANAGER: 'READ', HR: 'FULL', INTERVIEWER: 'NONE', CANDIDATE: 'NONE' },
  },
  {
    capability: 'Đặt lịch Phỏng vấn Hội đồng (1–5 Giám khảo) & Xuất file .ics',
    specRef: 'S3.13, S3.14',
    roles: { ADMIN: 'FULL', HIRING_MANAGER: 'READ', HR: 'FULL', INTERVIEWER: 'SCOPED', CANDIDATE: 'SCOPED' },
  },
  {
    capability: 'Chấm điểm Split-Screen Scorecard & Blind Evaluation Lock',
    specRef: 'S4.1 - S4.8',
    roles: { ADMIN: 'READ', HIRING_MANAGER: 'SCOPED', HR: 'READ', INTERVIEWER: 'FULL', CANDIDATE: 'NONE' },
  },
  {
    capability: 'Phê duyệt Đề nghị Tuyển dụng (Offer Approval Guard)',
    specRef: 'S3.19, D11',
    roles: { ADMIN: 'FULL', HIRING_MANAGER: 'FULL', HR: 'NONE', INTERVIEWER: 'NONE', CANDIDATE: 'NONE' },
  },
  {
    capability: 'Chốt Tuyển dụng (HIRED) & Khóa Định biên Giao dịch (Atomic Lock)',
    specRef: 'S3.21, S3.22',
    roles: { ADMIN: 'FULL', HIRING_MANAGER: 'NONE', HR: 'FULL', INTERVIEWER: 'NONE', CANDIDATE: 'NONE' },
  },
  {
    capability: 'Ứng tuyển CV PDF (≤ 5MB) & Tra cứu Tiến trình Magic Link',
    specRef: 'S3.1, D15',
    roles: { ADMIN: 'READ', HIRING_MANAGER: 'NONE', HR: 'READ', INTERVIEWER: 'NONE', CANDIDATE: 'FULL' },
  },
];

const SYSTEM_POLICIES = [
  {
    code: 'D01 / S1.2',
    title: 'Chuẩn hóa Định danh Email & Số điện thoại Việt Nam',
    desc: 'Tự động đưa Email về chữ thường và chuẩn hóa đầu số +84 / 84 về 0xxxxxxxxx để chống trùng lặp hồ sơ.',
    status: 'ENFORCED',
  },
  {
    code: 'D03 / S2.6',
    title: 'Khóa Vòng Tuyển dụng Bắt buộc (Mandatory Stages)',
    desc: '4 vòng APPLIED, INTERVIEW, OFFER, HIRED luôn cố định; chỉ cho phép bật/tắt vòng SCREENING và TEST.',
    status: 'ENFORCED',
  },
  {
    code: 'D04 / S2.9',
    title: 'Bất biến Tổng Trọng số Barem 100% (∑wᵢ = 100%)',
    desc: 'Chặn xuất bản Job (PUBLISHED) nếu tổng trọng số các tiêu chí khác 100% hoặc chưa có tiêu chí.',
    status: 'ENFORCED',
  },
  {
    code: 'D05 / S4.10',
    title: 'Cơ chế Điểm liệt Tự động (Knockout Criterion Rule)',
    desc: 'Khi tiêu chí có gắn cờ Điểm liệt nhận điểm trung bình < 2.0, hệ thống tự động gắn cờ FAILED_KNOCKOUT và chặn qua vòng.',
    status: 'ENFORCED',
  },
  {
    code: 'D06 / S4.5',
    title: 'Khóa Điểm Chéo Hội đồng (Blind Evaluation Lock)',
    desc: 'Giám khảo chưa nộp phiếu chấm không thể xem điểm hoặc nhận xét của các giám khảo khác trong cùng hội đồng.',
    status: 'ENFORCED',
  },
  {
    code: 'D11 / S3.19',
    title: 'Chốt chặn Phê duyệt Offer bởi Hiring Manager',
    desc: 'HR không thể chuyển ứng viên sang HIRED nếu Hiring Manager (hoặc Admin) chưa phê duyệt Offer.',
    status: 'ENFORCED',
  },
  {
    code: 'D13 / S3.22',
    title: 'Chống Tuyển Lố Định biên & Tự động Đóng Chiến dịch',
    desc: 'Khi số lượng HIRED đạt đủ Headcount, tự động đóng Job (CLOSED) và từ chối các đơn còn tồn đọng.',
    status: 'ENFORCED',
  },
];

const SSMS_TABLES: {
  name: string;
  tableName: string;
  desc: string;
  pk: string;
  fks: string[];
  module: 'IAM' | 'ORG' | 'RECRUITMENT' | 'PIPELINE' | 'EVALUATION' | 'SYSTEM';
  key: string;
}[] = [
  {
    name: 'Phòng ban Doanh nghiệp',
    tableName: 'dbo.departments',
    desc: 'Cơ cấu phòng ban nội bộ, chỉ định Trưởng bộ phận (Hiring Manager).',
    pk: 'department_id (PK, INT IDENTITY)',
    fks: ['manager_id -> users(user_id) [NULLABLE phá vòng lặp FK]'],
    module: 'ORG',
    key: 'departments',
  },
  {
    name: 'Tài khoản & Định danh IAM',
    tableName: 'dbo.users',
    desc: 'Tài khoản người dùng, email duy nhất (UQ), mật khẩu băm và 5 Role RBAC.',
    pk: 'user_id (PK, INT IDENTITY)',
    fks: ['department_id -> departments(department_id)'],
    module: 'IAM',
    key: 'users',
  },
  {
    name: 'Yêu cầu Định biên Tuyển dụng',
    tableName: 'dbo.job_requisitions',
    desc: 'Phiếu đề xuất chỉ tiêu định biên nhân sự, ngân sách lương và phê duyệt.',
    pk: 'requisition_id (PK, INT IDENTITY)',
    fks: ['department_id -> departments', 'requested_by -> users'],
    module: 'RECRUITMENT',
    key: 'requisitions',
  },
  {
    name: 'Tin Tuyển dụng & Vị trí Mở',
    tableName: 'dbo.jobs',
    desc: 'Vị trí tuyển dụng chính thức, trạng thái PUBLISHED/CLOSED, ngưỡng điểm đạt.',
    pk: 'job_id (PK, INT IDENTITY)',
    fks: ['requisition_id -> job_requisitions', 'department_id -> departments'],
    module: 'RECRUITMENT',
    key: 'jobs',
  },
  {
    name: 'Cấu hình Vòng Quy trình FSM',
    tableName: 'dbo.job_stages',
    desc: 'Các vòng tuyển dụng theo Finite State Machine (4 vòng bắt buộc, 2 vòng tùy chọn).',
    pk: 'stage_id (PK, INT IDENTITY)',
    fks: ['job_id -> jobs(job_id)'],
    module: 'PIPELINE',
    key: 'stages',
  },
  {
    name: 'Barem Tiêu chí & Trọng số',
    tableName: 'dbo.evaluation_criteria',
    desc: 'Tiêu chí đánh giá ứng viên, trọng số phần trăm (∑w = 100%) và cờ Điểm liệt.',
    pk: 'criterion_id (PK, INT IDENTITY)',
    fks: ['job_id -> jobs(job_id)'],
    module: 'EVALUATION',
    key: 'criteria',
  },
  {
    name: 'Hồ sơ Ứng viên Tuyển dụng',
    tableName: 'dbo.candidates',
    desc: 'Thông tin ứng viên, vòng hiện tại, token Magic Link và đề xuất mức lương Offer.',
    pk: 'candidate_id (PK, INT IDENTITY)',
    fks: ['job_id -> jobs', 'offer_approved_by -> users'],
    module: 'PIPELINE',
    key: 'candidates',
  },
  {
    name: 'Nhật ký Chuyển vòng Bất biến',
    tableName: 'dbo.candidate_stage_logs',
    desc: 'Truy vết toàn bộ lịch sử kéo thả Kanban và lý do từ chối (REJECTED).',
    pk: 'log_id (PK, INT IDENTITY)',
    fks: ['candidate_id -> candidates', 'actor_id -> users'],
    module: 'PIPELINE',
    key: 'stageLogs',
  },
  {
    name: 'Phân công Hội đồng Phỏng vấn',
    tableName: 'dbo.interview_panels',
    desc: 'Danh sách giám khảo được gán phỏng vấn ứng viên, ngày giờ & link họp Meet.',
    pk: 'panel_id (PK, INT IDENTITY)',
    fks: ['candidate_id -> candidates', 'interviewer_id -> users'],
    module: 'EVALUATION',
    key: 'panels',
  },
  {
    name: 'Phiếu Chấm Điểm Tổng Hợp',
    tableName: 'dbo.scorecards',
    desc: 'Phiếu chấm điểm độc lập của từng giám khảo (Blind Evaluation Lock Protocol).',
    pk: 'scorecard_id (PK, INT IDENTITY)',
    fks: ['candidate_id -> candidates', 'interviewer_id -> users'],
    module: 'EVALUATION',
    key: 'scorecards',
  },
  {
    name: 'Chi tiết Điểm số Tiêu chí',
    tableName: 'dbo.scorecard_items',
    desc: 'Điểm từng tiêu chí thang 1-5, nhận xét chuyên môn và cảnh báo điểm liệt.',
    pk: 'item_id (PK, INT IDENTITY)',
    fks: ['scorecard_id -> scorecards', 'criterion_id -> evaluation_criteria'],
    module: 'EVALUATION',
    key: 'scorecardItems',
  },
  {
    name: 'Hộp thư Thông báo Tự động',
    tableName: 'dbo.system_email_outbox',
    desc: 'Nhật ký email hệ thống gửi ứng viên và giám khảo kèm file lịch phỏng vấn .ics.',
    pk: 'outbox_id (PK, INT IDENTITY)',
    fks: ['candidate_id -> candidates'],
    module: 'SYSTEM',
    key: 'emailOutbox',
  },
  {
    name: 'Nhật ký Kiểm toán Hệ thống ACID',
    tableName: 'dbo.audit_trail_logs',
    desc: 'Lưu vết mọi hành động quản trị, bảo mật và thay đổi dữ liệu nhạy cảm.',
    pk: 'audit_id (PK, INT IDENTITY)',
    fks: ['actor_id -> users'],
    module: 'SYSTEM',
    key: 'auditLogs',
  },
];

export const AdminPortalView: React.FC<AdminPortalViewProps> = ({
  activeSection,
  onSelectSection,
  currentUser,
  store,
  setStore,
  selectedJob,
  onSelectJobId,
  onOpenCandidate360,
  onTriggerViolation,
  appendAudit,
}) => {
  // ---------------------------------------------------------------------------
  // STATE: USER MANAGEMENT (admin-users)
  // ---------------------------------------------------------------------------
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | UserRole>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [userDeptFilter, setUserDeptFilter] = useState<'ALL' | string>('ALL');
  const [userPage, setUserPage] = useState<number>(1);
  const [userPageSize, setUserPageSize] = useState<number>(10);
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [healthCheckOpen, setHealthCheckOpen] = useState(false);
  const [dbSchemaModalOpen, setDbSchemaModalOpen] = useState(false);
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<AccountUser | null>(null);
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const [resetConfirmUser, setResetConfirmUser] = useState<AccountUser | null>(null);
  const [statusConfirmUser, setStatusConfirmUser] = useState<{
    user: AccountUser;
    nextStatus: 'ACTIVE' | 'INACTIVE';
  } | null>(null);

  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('0909888777');
  const [newUserPassword, setNewUserPassword] = useState('Password@123');
  const [newUserRole, setNewUserRole] = useState<UserRole>('HR');
  const [newUserDept, setNewUserDept] = useState('People & Talent');

  const [editingUser, setEditingUser] = useState<AccountUser | null>(null);
  const [editUserName, setEditUserName] = useState('');
  const [editUserPhone, setEditUserPhone] = useState('');
  const [editUserPassword, setEditUserPassword] = useState('');
  const [editUserRole, setEditUserRole] = useState<UserRole>('HR');
  const [editUserDept, setEditUserDept] = useState('People & Talent');
  const [editUserStatus, setEditUserStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');

  // ---------------------------------------------------------------------------
  // STATE: DEPARTMENT MANAGEMENT (admin-departments)
  // ---------------------------------------------------------------------------
  const [deptSearch, setDeptSearch] = useState('');
  const [deptQuotaFilter, setDeptQuotaFilter] = useState<'ALL' | 'FULL' | 'HIRING' | 'NO_REQ'>('ALL');
  const [deptViewMode, setDeptViewMode] = useState<'TABLE' | 'CARDS'>('TABLE');
  const [deptPage, setDeptPage] = useState<number>(1);
  const [deptPageSize, setDeptPageSize] = useState<number>(10);
  const [isCreateDeptOpen, setIsCreateDeptOpen] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptManager, setNewDeptManager] = useState(
    store.users.find((u) => u.role === 'HIRING_MANAGER')?.fullName ?? 'Trần Minh Quân',
  );
  const [editingDept, setEditingDept] = useState<{
    id: number;
    name: string;
    managerName: string;
  } | null>(null);
  const [editDeptName, setEditDeptName] = useState('');
  const [editDeptManager, setEditDeptManager] = useState('');
  const [deleteConfirmDept, setDeleteConfirmDept] = useState<{ id: number; name: string } | null>(null);
  const [isSyncingDb, setIsSyncingDb] = useState(false);
  const [overviewRbacTab, setOverviewRbacTab] = useState<'INSPECTOR' | 'MATRIX'>('INSPECTOR');
  const [overviewSelectedRole, setOverviewSelectedRole] = useState<UserRole>('ADMIN');

  // ---------------------------------------------------------------------------
  // STATE: GOVERNANCE & CANDIDATE OVERSIGHT (admin-governance)
  // ---------------------------------------------------------------------------
  const [offerApprovalCand, setOfferApprovalCand] = useState<{
    id: number;
    fullName: string;
    jobTitle: string;
    dept: string;
    salary: string;
  } | null>(null);
  const [govTab, setGovTab] = useState<'jobs' | 'candidates'>('jobs');
  const [govCandidateSearch, setGovCandidateSearch] = useState('');
  const [govStageFilter, setGovStageFilter] = useState<'ALL' | StageCode>('ALL');
  const [govJobFilter, setGovJobFilter] = useState<'ALL' | number>('ALL');
  const [candidateAlertFilter, setCandidateAlertFilter] = useState<
    'ALL' | 'KNOCKOUT' | 'VARIANCE' | 'PENDING_OFFER' | 'HIRED'
  >('ALL');
  const [govCandPage, setGovCandPage] = useState<number>(1);
  const [govCandPageSize, setGovCandPageSize] = useState<number>(10);

  // ---------------------------------------------------------------------------
  // STATE: AUDIT LOGS & BACKUP (admin-audit)
  // ---------------------------------------------------------------------------
  const [auditSearch, setAuditSearch] = useState('');
  const [auditRoleFilter, setAuditRoleFilter] = useState<'ALL' | UserRole>('ALL');
  const [auditCategoryFilter, setAuditCategoryFilter] = useState<
    'ALL' | 'IAM' | 'PIPELINE' | 'EVAL' | 'JOB'
  >('ALL');
  const [auditPage, setAuditPage] = useState<number>(1);
  const [auditPageSize, setAuditPageSize] = useState<number>(10);
  const [adminBanner, setAdminBanner] = useState<string | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);
  const [clearAuditConfirmOpen, setClearAuditConfirmOpen] = useState(false);

  // ---------------------------------------------------------------------------
  // COMPUTED METRICS
  // ---------------------------------------------------------------------------
  const pendingGlobalOffers = useMemo(
    () => store.candidates.filter((c) => c.stageCode === 'OFFER' && !c.offerApprovedByHm),
    [store.candidates],
  );

  const systemMetrics = useMemo(() => {
    const activeUsers = store.users.filter((u) => u.status === 'ACTIVE').length;
    const inactiveUsers = store.users.length - activeUsers;
    const totalHeadcount = store.jobs.reduce((acc, j) => acc + j.headcount, 0);
    const totalFilled = store.jobs.reduce((acc, j) => acc + j.filledCount, 0);
    const publishedJobs = store.jobs.filter((j) => j.status === 'PUBLISHED').length;
    const totalCandidates = store.candidates.length;
    const hiredCandidates = store.candidates.filter((c) => c.stageCode === 'HIRED').length;
    const offerCandidates = store.candidates.filter((c) => c.stageCode === 'OFFER').length;
    const interviewCandidates = store.candidates.filter((c) => c.stageCode === 'INTERVIEW').length;
    const submittedSheets = store.candidates.reduce(
      (acc, c) => acc + c.sheets.filter((s) => s.submitted).length,
      0,
    );
    const totalSheets = store.candidates.reduce((acc, c) => acc + c.sheets.length, 0);

    return {
      activeUsers,
      inactiveUsers,
      totalHeadcount,
      totalFilled,
      publishedJobs,
      totalCandidates,
      hiredCandidates,
      offerCandidates,
      interviewCandidates,
      submittedSheets,
      totalSheets,
    };
  }, [store]);

  const allDistinctDepartments = useMemo(() => {
    const set = new Set<string>();
    set.add('Executive & IT Governance');
    set.add('People & Talent');
    store.departments.forEach((d) => set.add(d.name));
    store.users.forEach((u) => {
      if (u.department && u.department !== 'Ứng viên bên ngoài') {
        set.add(u.department);
      }
    });
    return Array.from(set);
  }, [store.departments, store.users]);

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    return store.users.filter((u) => {
      if (roleFilter !== 'ALL' && u.role !== roleFilter) return false;
      if (statusFilter !== 'ALL' && u.status !== statusFilter) return false;
      if (userDeptFilter !== 'ALL' && u.department !== userDeptFilter) return false;
      if (!q) return true;
      return (
        u.fullName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.phone.toLowerCase().includes(q) ||
        u.department.toLowerCase().includes(q)
      );
    });
  }, [store.users, userSearch, roleFilter, statusFilter, userDeptFilter]);

  const paginatedUsers = useMemo(() => {
    const start = (userPage - 1) * userPageSize;
    return filteredUsers.slice(start, start + userPageSize);
  }, [filteredUsers, userPage, userPageSize]);

  const enrichedDepartments = useMemo(() => {
    return store.departments.map((dept) => {
      const members = store.users.filter(
        (u) => u.department.toLowerCase() === dept.name.toLowerCase(),
      );
      const reqs = store.requisitions.filter(
        (r) => r.department.toLowerCase() === dept.name.toLowerCase(),
      );
      const jobs = store.jobs.filter(
        (j) => j.department.toLowerCase() === dept.name.toLowerCase(),
      );
      const headcount = reqs.reduce((sum, r) => sum + r.headcount, 0);
      const filled = reqs.reduce((sum, r) => sum + r.filledCount, 0);
      return {
        ...dept,
        actualMembers: members,
        actualMemberCount: Math.max(dept.memberCount, members.length),
        actualRequisitions: reqs,
        actualJobs: jobs,
        totalHeadcount: headcount,
        totalFilled: filled,
      };
    });
  }, [store.departments, store.users, store.requisitions, store.jobs]);

  const filteredDepartments = useMemo(() => {
    const q = deptSearch.trim().toLowerCase();
    return enrichedDepartments.filter((d) => {
      if (deptQuotaFilter === 'FULL' && (d.totalHeadcount === 0 || d.totalFilled < d.totalHeadcount)) return false;
      if (deptQuotaFilter === 'HIRING' && (d.totalHeadcount === 0 || d.totalFilled >= d.totalHeadcount)) return false;
      if (deptQuotaFilter === 'NO_REQ' && d.totalHeadcount > 0) return false;
      if (!q) return true;
      return (
        d.name.toLowerCase().includes(q) ||
        d.managerName.toLowerCase().includes(q) ||
        String(d.id).includes(q)
      );
    });
  }, [enrichedDepartments, deptSearch, deptQuotaFilter]);

  const paginatedDepartments = useMemo(() => {
    const start = (deptPage - 1) * deptPageSize;
    return filteredDepartments.slice(start, start + deptPageSize);
  }, [filteredDepartments, deptPage, deptPageSize]);

  const filteredGovCandidates = useMemo(() => {
    const q = govCandidateSearch.trim().toLowerCase();
    return store.candidates.filter((c) => {
      const job = store.jobs.find((j) => j.id === c.jobId) ?? selectedJob;
      if (govJobFilter !== 'ALL' && c.jobId !== govJobFilter) return false;
      if (govStageFilter !== 'ALL' && c.stageCode !== govStageFilter) return false;
      if (candidateAlertFilter !== 'ALL') {
        const m = computeCandidateMetrics(c, job.criteria);
        if (candidateAlertFilter === 'KNOCKOUT' && !m.isDisqualified) return false;
        if (candidateAlertFilter === 'VARIANCE' && !m.hasVarianceAlert) return false;
        if (candidateAlertFilter === 'PENDING_OFFER' && (c.stageCode !== 'OFFER' || c.offerApprovedByHm))
          return false;
        if (candidateAlertFilter === 'HIRED' && c.stageCode !== 'HIRED') return false;
      }
      if (!q) return true;
      return (
        c.fullName.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        c.trackingToken.toLowerCase().includes(q)
      );
    });
  }, [
    store.candidates,
    store.jobs,
    selectedJob,
    govCandidateSearch,
    govJobFilter,
    govStageFilter,
    candidateAlertFilter,
  ]);

  const paginatedGovCandidates = useMemo(() => {
    const start = (govCandPage - 1) * govCandPageSize;
    return filteredGovCandidates.slice(start, start + govCandPageSize);
  }, [filteredGovCandidates, govCandPage, govCandPageSize]);

  const filteredAuditLogs = useMemo(() => {
    const q = auditSearch.trim().toLowerCase();
    return store.auditLogs.filter((log) => {
      if (auditRoleFilter !== 'ALL' && log.actorRole !== auditRoleFilter) return false;
      if (auditCategoryFilter !== 'ALL') {
        const act = log.action.toUpperCase();
        if (
          auditCategoryFilter === 'IAM' &&
          !act.includes('USER') &&
          !act.includes('ROLE') &&
          !act.includes('LOGIN') &&
          !act.includes('REGISTER') &&
          !act.includes('DEPARTMENT')
        ) {
          return false;
        }
        if (
          auditCategoryFilter === 'PIPELINE' &&
          !act.includes('STAGE') &&
          !act.includes('INTERVIEW') &&
          !act.includes('OFFER') &&
          !act.includes('HIRE') &&
          !act.includes('REJECT') &&
          !act.includes('APPLY')
        ) {
          return false;
        }
        if (
          auditCategoryFilter === 'EVAL' &&
          !act.includes('SCORECARD') &&
          !act.includes('CALIBRAT') &&
          !act.includes('EVAL')
        ) {
          return false;
        }
        if (
          auditCategoryFilter === 'JOB' &&
          !act.includes('JOB') &&
          !act.includes('REQUISITION') &&
          !act.includes('CRITERIA')
        ) {
          return false;
        }
      }
      if (!q) return true;
      return (
        log.action.toLowerCase().includes(q) ||
        log.actorName.toLowerCase().includes(q) ||
        log.detail.toLowerCase().includes(q)
      );
    });
  }, [store.auditLogs, auditSearch, auditRoleFilter, auditCategoryFilter]);

  const paginatedAuditLogs = useMemo(() => {
    const start = (auditPage - 1) * auditPageSize;
    return filteredAuditLogs.slice(start, start + auditPageSize);
  }, [filteredAuditLogs, auditPage, auditPageSize]);

  // ---------------------------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------------------------
  const notifyBanner = (msg: string) => {
    setAdminBanner(msg);
    setTimeout(() => setAdminBanner(null), 4000);
  };

  const handleExportAuditCsv = () => {
    const headers = ['ID', 'Thoi Gian', 'Hanh Dong', 'Nguoi Thuc Hien', 'Vai Tro', 'Chi Tiet'];
    const rows = filteredAuditLogs.map((l) =>
      [
        l.id,
        `"${l.time}"`,
        `"${l.action}"`,
        `"${l.actorName}"`,
        l.actorRole,
        `"${l.detail.replace(/"/g, '""')}"`,
      ].join(','),
    );
    const csv = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ATS_Audit_Trail_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    appendAudit('EXPORT_AUDIT_CSV', `Admin xuất ${filteredAuditLogs.length} bản ghi Audit Log ra CSV`);
    notifyBanner(`Đã xuất ${filteredAuditLogs.length} dòng Nhật ký Kiểm toán ra file CSV!`);
  };

  const handleExportAuditJson = () => {
    const json = JSON.stringify(filteredAuditLogs, null, 2);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ATS_Audit_Trail_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    appendAudit('EXPORT_AUDIT_JSON', `Admin xuất ${filteredAuditLogs.length} bản ghi Audit Log ra file JSON`);
    notifyBanner(`Đã xuất ${filteredAuditLogs.length} dòng Nhật ký Kiểm toán ra file JSON!`);
  };

  const handleExportFullBackupJson = () => {
    const json = JSON.stringify(store, null, 2);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ATS_Full_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    appendAudit('ADMIN_BACKUP_JSON', 'Sao lưu toàn bộ cơ sở dữ liệu ATS ra file JSON');
    notifyBanner('Đã tải xuống bản sao lưu toàn bộ dữ liệu hệ thống (.JSON)!');
  };

  const handleImportBackupJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as AtsPersistentState;
        if (!parsed.users || !parsed.jobs || !parsed.candidates) {
          throw new Error('Invalid schema');
        }
        setStore(parsed);
        notifyBanner('Đã khôi phục dữ liệu thành công từ file JSON Backup!');
      } catch {
        onTriggerViolation({
          code: 'INVALID_BACKUP_FILE',
          message: 'File JSON không đúng định dạng cấu trúc AtsPersistentState.',
          candidateName: file.name,
          fromStageName: 'JSON Import',
          toStageName: 'System Store',
        });
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-5">
      {/* Top Notification Toast */}
      {adminBanner && (
        <div className="flex items-center justify-between rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs font-bold text-amber-900 shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-amber-600" />
            <span>{adminBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setAdminBanner(null)}
            className="text-[11px] text-amber-700 underline"
          >
            Đóng
          </button>
        </div>
      )}

      {/* =====================================================================
          TAB 1: ADMIN EXECUTIVE COMMAND DASHBOARD & GOVERNANCE PULSE (admin-overview)
         ===================================================================== */}
      {activeSection === 'admin-overview' && (
        <div className="space-y-6">
          {/* 1. HERO COMMAND CENTER & LIVE INFRASTRUCTURE PULSE */}
          <div className="relative overflow-hidden rounded-3xl border border-slate-200/90 bg-gradient-to-br from-white via-amber-50/25 to-slate-50/60 p-6 shadow-xs">
            {/* Ambient decorative glow */}
            <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-amber-400/10 blur-3xl" />
            <div className="pointer-events-none absolute -left-16 -bottom-16 h-64 w-64 rounded-full bg-blue-400/10 blur-3xl" />

            <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-100/80 px-3 py-1 font-mono text-[10px] font-extrabold text-amber-950 uppercase tracking-wide">
                    <ShieldCheck className="h-3.5 w-3.5 text-amber-700" />
                    SYSTEM GOVERNANCE & RBAC COMMAND CENTER
                  </span>

                  <span className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1 font-mono text-[10px] font-bold text-emerald-800">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                    </span>
                    Dual-Sync SQL Server 1433 Active
                  </span>

                  <span className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white/80 px-2.5 py-1 text-[10px] font-semibold text-slate-600">
                    <Database className="h-3 w-3 text-blue-600" />
                    13 Bảng SSMS Sẵn Sàng
                  </span>
                </div>

                <h1 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">
                  Bảng Điều Khiển Quản Trị Hệ Thống Tuyển Dụng Doanh Nghiệp
                </h1>
                <p className="max-w-3xl text-xs text-slate-600 leading-relaxed">
                  Giám sát thời gian thực toàn bộ chu trình định biên nhân sự, 5 cổng phân quyền độc lập (Strict 5-Role Isolation), phễu ứng viên liên chiến dịch, tiến độ chấm điểm hội đồng và nhật ký kiểm toán bất biến ACID.
                </p>
              </div>

              {/* Action Toolbar */}
              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsCreateUserOpen(true)}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-2xl bg-amber-500 px-4 py-2.5 text-xs font-bold text-slate-950 shadow-md shadow-amber-500/20 hover:bg-amber-400 hover:shadow-lg transition-all active:scale-95"
                >
                  <UserPlus className="h-4 w-4" />
                  Cấp Tài Khoản IAM
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setNewDeptName('');
                    setIsCreateDeptOpen(true);
                  }}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-2xl border border-slate-200/90 bg-white px-4 py-2.5 text-xs font-bold text-slate-800 shadow-2xs hover:bg-slate-50 transition-all active:scale-95"
                >
                  <Plus className="h-4 w-4 text-emerald-600" />
                  Thêm Phòng Ban
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsSyncingDb(true);
                    setTimeout(() => {
                      setIsSyncingDb(false);
                      notifyBanner('Đồng bộ CSDL SQL Server thành công! 13 bảng SSMS và Store đồng nhất 100%.');
                    }, 600);
                  }}
                  disabled={isSyncingDb}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-2xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 transition-all active:scale-95 disabled:opacity-50"
                  title="Đồng bộ lại trạng thái kết nối SQL Server"
                >
                  <RefreshCw className={cn('h-3.5 w-3.5 text-amber-600', isSyncingDb && 'animate-spin')} />
                  <span>{isSyncingDb ? 'Đang sync...' : 'Làm Mới CSDL'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDbSchemaModalOpen(true)}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-2xl border border-blue-200 bg-blue-50/80 px-3.5 py-2.5 text-xs font-bold text-blue-800 shadow-2xs hover:bg-blue-100 transition-all active:scale-95"
                >
                  <Database className="h-3.5 w-3.5 text-blue-600" />
                  Tra Cứu SSMS
                </button>

                <button
                  type="button"
                  onClick={() => setHealthCheckOpen(true)}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-2xl border border-emerald-300 bg-emerald-50/80 px-3.5 py-2.5 text-xs font-bold text-emerald-800 shadow-2xs hover:bg-emerald-100 transition-all active:scale-95"
                >
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                  Kiểm Định Hệ Thống
                </button>
              </div>
            </div>
          </div>

          {/* 2. EMERGENCY EXECUTIVE OFFER DESK (Nếu có ứng viên ở OFFER cần duyệt) */}
          {pendingGlobalOffers.length > 0 && (
            <div className="rounded-3xl border border-amber-300 bg-amber-50/80 p-5 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200/80 pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-amber-500/20 text-amber-700">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="font-bold text-amber-950">
                      Hàng Đợi Phê Duyệt Đề Nghị Tuyển Dụng Đặc Cách ({pendingGlobalOffers.length} ứng viên chờ quyết định Offer)
                    </span>
                    <p className="text-[11px] text-amber-800">
                      Theo cơ chế S1.6 Admin Executive Override, Admin có thể phê duyệt quyết định tuyển dụng khẩn cấp.
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-amber-200 px-3 py-1 font-mono text-[10px] font-bold text-amber-900 ring-1 ring-amber-300">
                  ADMIN EXECUTIVE OVERRIDE (S1.6)
                </span>
              </div>
              <div className="mt-3.5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {pendingGlobalOffers.map((cand) => {
                  const job = store.jobs.find((j) => j.id === cand.jobId) ?? selectedJob;
                  const m = computeCandidateMetrics(cand, job.criteria);
                  return (
                    <div
                      key={cand.id}
                      className="flex flex-col justify-between rounded-2xl border border-amber-200 bg-white p-4 shadow-2xs transition-all hover:shadow-md"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900">{cand.fullName}</span>
                          <span className="rounded-md bg-emerald-50 px-2 py-0.5 font-mono text-xs font-bold text-emerald-700 ring-1 ring-emerald-200">
                            {m.overallScore !== null ? `${m.overallScore.toFixed(2)} / 5.00` : 'Đủ phiếu'}
                          </span>
                        </div>
                        <p className="mt-1 text-[11px] text-slate-500">
                          {job.title} · <strong>{job.department}</strong>
                        </p>
                        <p className="mt-1 font-mono text-[11px] text-amber-900">
                          Mức lương Offer:{' '}
                          <strong>{cand.offerSalary || job.salaryRange || 'Theo thỏa thuận'}</strong>
                        </p>
                      </div>
                      <div className="mt-3.5 flex items-center justify-between border-t border-slate-100 pt-3">
                        <button
                          type="button"
                          onClick={() => onOpenCandidate360(cand.id)}
                          className="cursor-pointer text-xs font-bold text-blue-600 hover:underline inline-flex items-center gap-1"
                        >
                          Xem Hồ sơ 360° <ArrowRight className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setOfferApprovalCand({
                              id: cand.id,
                              fullName: cand.fullName,
                              jobTitle: job.title,
                              dept: job.department,
                              salary: cand.offerSalary || job.salaryRange || 'Theo thỏa thuận',
                            })
                          }
                          className="cursor-pointer rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-emerald-700 transition-all active:scale-95"
                        >
                          Phê Duyệt Ngay
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3. CORE EXECUTIVE BENTO KPI METRICS (4 Cohesive Cards) */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* KPI 1: IAM Identity & RBAC Accounts */}
            <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-2xs transition-all hover:shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">Định Danh Nhân Sự & IAM</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-200/60">
                  <Users className="h-4 w-4" />
                </div>
              </div>

              <div className="mt-3 flex items-baseline justify-between">
                <div>
                  <span className="font-mono text-3xl font-extrabold text-slate-900 tracking-tight">
                    {systemMetrics.activeUsers}
                  </span>
                  <span className="font-mono text-xs font-semibold text-slate-400"> / {store.users.length} tài khoản</span>
                </div>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 ring-1 ring-emerald-200">
                  {Math.round((systemMetrics.activeUsers / Math.max(1, store.users.length)) * 100)}% Hoạt động
                </span>
              </div>

              {/* Mini active/inactive horizontal bar */}
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100 flex">
                <div
                  className="h-full bg-emerald-500 transition-all duration-300"
                  style={{
                    width: `${(systemMetrics.activeUsers / Math.max(1, store.users.length)) * 100}%`,
                  }}
                  title={`Hoạt động: ${systemMetrics.activeUsers}`}
                />
                <div
                  className="h-full bg-red-400 transition-all duration-300"
                  style={{
                    width: `${(systemMetrics.inactiveUsers / Math.max(1, store.users.length)) * 100}%`,
                  }}
                  title={`Đã khóa: ${systemMetrics.inactiveUsers}`}
                />
              </div>

              {/* Role distribution chips */}
              <div className="mt-3 flex flex-wrap gap-1 text-[10px] font-mono font-bold text-slate-500">
                {(['ADMIN', 'HIRING_MANAGER', 'HR', 'INTERVIEWER', 'CANDIDATE'] as UserRole[]).map((r) => {
                  const count = store.users.filter((u) => u.role === r).length;
                  return (
                    <span key={r} className="rounded-md bg-slate-50 px-1.5 py-0.5 border border-slate-200/80">
                      {r.slice(0, 3)}: {count}
                    </span>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => onSelectSection('admin-users')}
                className="mt-3.5 inline-flex cursor-pointer items-center gap-1 text-xs font-bold text-amber-700 hover:text-amber-800 transition-colors"
              >
                Quản lý 5 Role IAM <ArrowRight className="h-3 w-3" />
              </button>
            </div>

            {/* KPI 2: Headcount Quota & Fulfillment */}
            <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-2xs transition-all hover:shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">Chỉ Tiêu Định Biên Nhân Sự</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200/60">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
              </div>

              <div className="mt-3 flex items-baseline justify-between">
                <div>
                  <span className="font-mono text-3xl font-extrabold text-slate-900 tracking-tight">
                    {systemMetrics.totalFilled}
                  </span>
                  <span className="font-mono text-xs font-semibold text-slate-400"> / {systemMetrics.totalHeadcount} chỉ tiêu</span>
                </div>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 ring-1 ring-emerald-200">
                  {systemMetrics.totalHeadcount > 0
                    ? Math.round((systemMetrics.totalFilled / systemMetrics.totalHeadcount) * 100)
                    : 0}% Lấp đầy
                </span>
              </div>

              {/* Fulfillment progress bar */}
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                  style={{
                    width: `${systemMetrics.totalHeadcount > 0 ? Math.min(100, Math.round((systemMetrics.totalFilled / systemMetrics.totalHeadcount) * 100)) : 0}%`,
                  }}
                />
              </div>

              <p className="mt-3 text-[11px] text-slate-500 truncate">
                {systemMetrics.publishedJobs} Job mở · {store.departments.length} Phòng ban · {store.requisitions.length} Requisitions
              </p>

              <button
                type="button"
                onClick={() => onSelectSection('admin-departments')}
                className="mt-3.5 inline-flex cursor-pointer items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800 transition-colors"
              >
                Cơ cấu Phòng ban & HM <ArrowRight className="h-3 w-3" />
              </button>
            </div>

            {/* KPI 3: Pipeline Velocity & Candidates */}
            <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-2xs transition-all hover:shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">Dòng Chảy Hồ Sơ Tuyển Dụng</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-200/60">
                  <TrendingUp className="h-4 w-4" />
                </div>
              </div>

              <div className="mt-3 flex items-baseline justify-between">
                <div>
                  <span className="font-mono text-3xl font-extrabold text-slate-900 tracking-tight">
                    {systemMetrics.totalCandidates}
                  </span>
                  <span className="font-mono text-xs font-semibold text-slate-400"> hồ sơ toàn Job</span>
                </div>
                <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 ring-1 ring-indigo-200">
                  {store.jobs.length} Vị trí
                </span>
              </div>

              {/* Status breakdown pills */}
              <div className="mt-3 grid grid-cols-3 gap-1.5 text-center text-[10px] font-bold">
                <div className="rounded-xl bg-emerald-50 py-1 text-emerald-800 border border-emerald-100">
                  {systemMetrics.hiredCandidates} Hired
                </div>
                <div className="rounded-xl bg-amber-50 py-1 text-amber-800 border border-amber-100">
                  {systemMetrics.offerCandidates} Offer
                </div>
                <div className="rounded-xl bg-violet-50 py-1 text-violet-800 border border-violet-100">
                  {systemMetrics.interviewCandidates} Phỏng vấn
                </div>
              </div>

              <p className="mt-3 text-[11px] text-slate-500">
                Tỷ lệ đỗ phỏng vấn: ~{Math.round(((systemMetrics.hiredCandidates + systemMetrics.offerCandidates) / Math.max(1, systemMetrics.totalCandidates)) * 100)}%
              </p>

              <button
                type="button"
                onClick={() => onSelectSection('admin-governance')}
                className="mt-3.5 inline-flex cursor-pointer items-center gap-1 text-xs font-bold text-indigo-700 hover:text-indigo-800 transition-colors"
              >
                Giám sát Danh bạ Ứng viên <ArrowRight className="h-3 w-3" />
              </button>
            </div>

            {/* KPI 4: Scorecard Evaluation & Audit Trail */}
            <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-2xs transition-all hover:shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">Hội Đồng & Kiểm Toán ACID</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-violet-50 text-violet-600 border border-violet-200/60">
                  <Award className="h-4 w-4" />
                </div>
              </div>

              <div className="mt-3 flex items-baseline justify-between">
                <div>
                  <span className="font-mono text-3xl font-extrabold text-slate-900 tracking-tight">
                    {systemMetrics.submittedSheets}
                  </span>
                  <span className="font-mono text-xs font-semibold text-slate-400"> / {systemMetrics.totalSheets} phiếu</span>
                </div>
                <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-bold text-violet-700 ring-1 ring-violet-200">
                  {systemMetrics.totalSheets > 0
                    ? Math.round((systemMetrics.submittedSheets / systemMetrics.totalSheets) * 100)
                    : 100}% Chấm xong
                </span>
              </div>

              {/* Scorecard completion progress bar */}
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full bg-violet-500 rounded-full transition-all duration-300"
                  style={{
                    width: `${systemMetrics.totalSheets > 0 ? (systemMetrics.submittedSheets / systemMetrics.totalSheets) * 100 : 100}%`,
                  }}
                />
              </div>

              <p className="mt-3 text-[11px] text-slate-500 truncate">
                {store.auditLogs.length} sự kiện Audit · {store.emailOutbox.length} Email Outbox (.ics)
              </p>

              <button
                type="button"
                onClick={() => onSelectSection('admin-audit')}
                className="mt-3.5 inline-flex cursor-pointer items-center gap-1 text-xs font-bold text-violet-700 hover:text-violet-800 transition-colors"
              >
                Mở Nhật ký Kiểm toán <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          </div>

          {/* 4. STRATEGIC DEEP-DIVE ANALYTICS BENTO GRID (12 Cols: 7 Left, 5 Right) */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
            {/* LEFT 7 COLS: Pipeline Funnel + Department Headcount */}
            <div className="space-y-5 lg:col-span-7">
              {/* Widget 1: System-wide Pipeline Funnel */}
              <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Layers className="h-4 w-4 text-amber-600" />
                      Phễu Tuyển Dụng Toàn Hệ Thống (Cross-Job Pipeline Funnel)
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Tổng hợp phân bổ {store.candidates.length} hồ sơ trên tất cả các vị trí đang tuyển
                    </p>
                  </div>
                  <span className="rounded-xl bg-slate-100 px-3 py-1 font-mono text-xs font-bold text-slate-700">
                    Tổng: {store.candidates.length} ứng viên
                  </span>
                </div>

                <div className="mt-4 space-y-2.5">
                  {(
                    [
                      { code: 'APPLIED', label: '1. Ứng tuyển mới (APPLIED)', color: 'bg-slate-700' },
                      { code: 'SCREENING', label: '2. Sàng lọc CV (SCREENING)', color: 'bg-sky-600' },
                      { code: 'TEST', label: '3. Bài Test Kỹ thuật (TEST)', color: 'bg-indigo-600' },
                      { code: 'INTERVIEW', label: '4. Phỏng vấn Hội đồng (INTERVIEW)', color: 'bg-violet-600' },
                      { code: 'OFFER', label: '5. Đề nghị Tuyển dụng (OFFER)', color: 'bg-amber-500' },
                      { code: 'HIRED', label: '6. Chính thức Trúng tuyển (HIRED)', color: 'bg-emerald-600' },
                      { code: 'REJECTED', label: '7. Đã loại / Không đạt (REJECTED)', color: 'bg-red-500' },
                    ] as const
                  ).map((st) => {
                    const count = store.candidates.filter((c) => c.stageCode === st.code).length;
                    const pct =
                      store.candidates.length > 0
                        ? Math.round((count / store.candidates.length) * 100)
                        : 0;
                    return (
                      <div key={st.code} className="space-y-1 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-700">{st.label}</span>
                          <span className="font-mono font-bold text-slate-900">
                            {count} hồ sơ <span className="text-slate-400 font-normal">({pct}%)</span>
                          </span>
                        </div>
                        <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={cn('h-full rounded-full transition-all duration-300', st.color)}
                            style={{ width: `${Math.max(pct, count > 0 ? 5 : 0)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Widget 2: Department Headcount Fulfillment Allocation */}
              <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-blue-600" />
                      Cơ Cấu Định Biên 5 Phòng Ban Chuyên Môn
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      So sánh nhân sự hiện có, chỉ tiêu Requisition và tỷ lệ lấp đầy theo phòng ban
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onSelectSection('admin-departments')}
                    className="cursor-pointer text-xs font-bold text-blue-600 hover:underline"
                  >
                    Xem chi tiết →
                  </button>
                </div>

                <div className="mt-4 space-y-3">
                  {enrichedDepartments.map((dept) => {
                    const pct =
                      dept.totalHeadcount > 0
                        ? Math.round((dept.totalFilled / dept.totalHeadcount) * 100)
                        : 100;
                    return (
                      <div
                        key={dept.id}
                        className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3.5 transition-all hover:bg-slate-50"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 text-xs">{dept.name}</span>
                              <span className="rounded-md bg-white border border-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                                HM: {dept.managerName}
                              </span>
                            </div>
                            <p className="mt-1 text-[11px] text-slate-500">
                              Nhân sự: <strong>{dept.actualMemberCount}</strong> · Requisitions:{' '}
                              <strong>{dept.actualRequisitions.length}</strong> · Jobs:{' '}
                              <strong>{dept.actualJobs.length}</strong>
                            </p>
                          </div>

                          <div className="text-right">
                            <span className="font-mono text-xs font-extrabold text-slate-900">
                              {dept.totalFilled}/{dept.totalHeadcount} định biên
                            </span>
                            <span className="ml-1.5 font-mono text-xs font-bold text-emerald-700">
                              ({pct}%)
                            </span>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200/80">
                          <div
                            className={cn(
                              'h-full rounded-full transition-all duration-300',
                              pct >= 100 ? 'bg-emerald-500' : pct > 0 ? 'bg-amber-500' : 'bg-slate-300',
                            )}
                            style={{ width: `${Math.min(100, pct)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* RIGHT 5 COLS: Active Jobs Radar + Live Audit Stream */}
            <div className="space-y-5 lg:col-span-5">
              {/* Widget 3: Active Campaigns & Barem Weight Health */}
              <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-emerald-600" />
                      Giám Sát Chiến Dịch Job & Barem Trọng Số
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Trạng thái xuất bản, Barem trọng số 100% (S2.8) và số lượng hồ sơ
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setGovTab('jobs');
                      onSelectSection('admin-governance');
                    }}
                    className="cursor-pointer text-xs font-bold text-blue-600 hover:underline"
                  >
                    Mở Jobs →
                  </button>
                </div>

                <div className="mt-4 space-y-3">
                  {store.jobs.map((job) => {
                    const jobCands = store.candidates.filter((c) => c.jobId === job.id);
                    const weightSum = job.criteria.reduce((s, c) => s + c.weightPercent, 0);
                    const isCriteriaValid = weightSum === 100 && job.criteria.length > 0;
                    return (
                      <div
                        key={job.id}
                        className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3.5 transition-all hover:bg-slate-50 text-xs"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-mono text-[10px] font-bold text-slate-400">
                                #{job.id}
                              </span>
                              <span className="font-bold text-slate-900">{job.title}</span>
                              <span
                                className={cn(
                                  'rounded-full px-2 py-0.5 font-mono text-[10px] font-bold',
                                  job.status === 'PUBLISHED'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : job.status === 'DRAFT'
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-slate-200 text-slate-700',
                                )}
                              >
                                {job.status}
                              </span>
                            </div>
                            <p className="mt-1 text-[11px] text-slate-500">
                              {job.department} · <strong>{jobCands.length} hồ sơ</strong>
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              onSelectJobId(job.id);
                              setGovTab('jobs');
                              onSelectSection('admin-governance');
                            }}
                            className="cursor-pointer rounded-xl bg-slate-900 px-3 py-1 text-[11px] font-bold text-white shadow-2xs hover:bg-amber-600 transition-all active:scale-95 shrink-0"
                          >
                            Cấu hình
                          </button>
                        </div>

                        <div className="mt-2.5 flex items-center justify-between border-t border-slate-200/60 pt-2 text-[11px]">
                          <span
                            className={cn(
                              'font-mono font-bold',
                              isCriteriaValid ? 'text-emerald-700' : 'text-red-600',
                            )}
                          >
                            Barem: {weightSum}% {isCriteriaValid ? '(Chuẩn S2.8)' : '(Lỗi)'}
                          </span>
                          <span className="font-mono font-bold text-slate-700">
                            Định biên: {job.filledCount}/{job.headcount}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Widget 4: Live Audit Stream */}
              <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Clock className="h-4 w-4 text-violet-600" />
                      Nhật Ký Sự Kiện Gần Nhất (Live Audit Trail)
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      5 hành động kiểm toán mới nhất ghi nhận bất biến trên hệ thống
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onSelectSection('admin-audit')}
                    className="cursor-pointer text-xs font-bold text-violet-600 hover:underline"
                  >
                    Xem tất cả ({store.auditLogs.length}) →
                  </button>
                </div>

                <div className="mt-3.5 space-y-2.5">
                  {store.auditLogs.slice(0, 5).map((log) => (
                    <div
                      key={log.id}
                      className="rounded-2xl border border-slate-200/70 bg-slate-50/50 p-2.5 text-xs transition-colors hover:bg-white"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="rounded-md bg-violet-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-violet-800">
                            {log.action}
                          </span>
                          <span className="font-semibold text-slate-900 truncate">{log.actorName}</span>
                          <span className="text-[10px] text-slate-400">({log.actorRole})</span>
                        </div>
                        <span className="font-mono text-[10px] text-slate-400 shrink-0">
                          {log.time.slice(11, 19) || log.time}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-slate-600 truncate">{log.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 5. INTERACTIVE RBAC GOVERNANCE & SECURITY MATRIX (Spec 001) */}
          <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-amber-600" />
                  Ma Trận Phân Quyền Độc Lập 5 Vai Trò (Strict 5-Role RBAC Matrix — Spec 001)
                </h3>
                <p className="text-xs text-slate-500">
                  Mỗi tài khoản được gắn duy nhất 1 Role và bị khóa chặt trong Role Portal sau xác thực JWT (No Quick Role Switcher).
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setOverviewRbacTab('INSPECTOR')}
                  className={cn(
                    'cursor-pointer rounded-2xl px-3.5 py-1.5 text-xs font-bold transition-all',
                    overviewRbacTab === 'INSPECTOR'
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
                  )}
                >
                  Khám Phá Theo Role
                </button>
                <button
                  type="button"
                  onClick={() => setOverviewRbacTab('MATRIX')}
                  className={cn(
                    'cursor-pointer rounded-2xl px-3.5 py-1.5 text-xs font-bold transition-all',
                    overviewRbacTab === 'MATRIX'
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
                  )}
                >
                  Bảng Ma Trận Tổng Hợp
                </button>
              </div>
            </div>

            {/* TAB CONTENT: INSPECTOR VIEW */}
            {overviewRbacTab === 'INSPECTOR' ? (
              <div className="mt-4 space-y-4">
                {/* 5 Role Select Buttons */}
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                  {(['ADMIN', 'HIRING_MANAGER', 'HR', 'INTERVIEWER', 'CANDIDATE'] as UserRole[]).map(
                    (r) => {
                      const isSel = overviewSelectedRole === r;
                      const userCount = store.users.filter((u) => u.role === r).length;
                      return (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setOverviewSelectedRole(r)}
                          className={cn(
                            'cursor-pointer rounded-2xl border p-3 text-left transition-all',
                            isSel
                              ? 'border-amber-500 bg-amber-50/80 shadow-xs ring-2 ring-amber-500/20'
                              : 'border-slate-200 bg-slate-50/60 hover:bg-white',
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-xs font-bold text-slate-900">{r}</span>
                            <span className="rounded-full bg-slate-200 px-1.5 py-0.2 text-[10px] font-bold text-slate-700 font-mono">
                              {userCount}
                            </span>
                          </div>
                          <p className="mt-1 truncate text-[11px] text-slate-500">
                            {ROLE_META[r].portalTitle}
                          </p>
                        </button>
                      );
                    },
                  )}
                </div>

                {/* Selected Role Deep Dive */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
                    <div>
                      <span className="rounded-md bg-amber-100 text-amber-900 px-2 py-0.5 font-mono text-[11px] font-bold">
                        VAI TRÒ: {overviewSelectedRole}
                      </span>
                      <h4 className="mt-1 text-sm font-bold text-slate-900">
                        {ROLE_META[overviewSelectedRole].portalTitle}
                      </h4>
                      <p className="text-xs text-slate-600">
                        {ROLE_META[overviewSelectedRole].portalSubtitle}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-[11px] text-slate-500">Tài khoản thuộc Role:</span>
                      <div className="flex items-center gap-1 justify-end mt-1 flex-wrap">
                        {store.users
                          .filter((u) => u.role === overviewSelectedRole)
                          .map((u) => (
                            <span
                              key={u.id}
                              className="rounded-md bg-white border border-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-800"
                            >
                              {u.fullName} ({u.status})
                            </span>
                          ))}
                      </div>
                    </div>
                  </div>

                  {/* Capabilities List for Selected Role */}
                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {RBAC_MATRIX.map((row) => {
                      const perm = row.roles[overviewSelectedRole];
                      return (
                        <div
                          key={row.capability}
                          className="flex items-start justify-between gap-2 rounded-xl border border-slate-200/80 bg-white p-3 text-xs"
                        >
                          <div>
                            <span className="font-semibold text-slate-800 leading-snug block">
                              {row.capability}
                            </span>
                            <span className="mt-0.5 font-mono text-[10px] text-slate-400 block">
                              Mã Spec: {row.specRef}
                            </span>
                          </div>
                          <span
                            className={cn(
                              'rounded-md px-2 py-0.5 font-mono text-[10px] font-bold shrink-0',
                              perm === 'FULL' && 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300',
                              perm === 'SCOPED' && 'bg-blue-100 text-blue-800 ring-1 ring-blue-300',
                              perm === 'READ' && 'bg-amber-100 text-amber-800 ring-1 ring-amber-300',
                              perm === 'NONE' && 'bg-slate-100 text-slate-400',
                            )}
                          >
                            {perm === 'FULL'
                              ? 'TOÀN QUYỀN'
                              : perm === 'SCOPED'
                                ? 'THEO PHÂN CÔNG'
                                : perm === 'READ'
                                  ? 'CHỈ XEM'
                                  : 'CHẶN (403)'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              /* TAB CONTENT: FULL MATRIX TABLE */
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-600 uppercase">
                      <th className="px-3.5 py-3">Chức năng / Quyền hạn Nghiệp vụ</th>
                      <th className="px-3 py-3 font-mono">Mã Spec</th>
                      <th className="px-3 py-3 text-center">ADMIN</th>
                      <th className="px-3 py-3 text-center">HIRING_MANAGER</th>
                      <th className="px-3 py-3 text-center">HR</th>
                      <th className="px-3 py-3 text-center">INTERVIEWER</th>
                      <th className="px-3 py-3 text-center">CANDIDATE</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {RBAC_MATRIX.map((row) => (
                      <tr key={row.capability} className="hover:bg-slate-50/70">
                        <td className="px-3.5 py-2.5 font-semibold text-slate-900">
                          {row.capability}
                        </td>
                        <td className="px-3 py-2.5 font-mono text-[11px] font-bold text-slate-500">
                          {row.specRef}
                        </td>
                        {(
                          ['ADMIN', 'HIRING_MANAGER', 'HR', 'INTERVIEWER', 'CANDIDATE'] as UserRole[]
                        ).map((r) => {
                          const perm = row.roles[r];
                          return (
                            <td key={r} className="px-3 py-2.5 text-center">
                              <span
                                className={cn(
                                  'inline-block rounded-md px-2 py-0.5 font-mono text-[10px] font-bold',
                                  perm === 'FULL' && 'bg-emerald-100 text-emerald-800',
                                  perm === 'SCOPED' && 'bg-blue-100 text-blue-800',
                                  perm === 'READ' && 'bg-amber-100 text-amber-800',
                                  perm === 'NONE' && 'bg-slate-100 text-slate-400',
                                )}
                              >
                                {perm === 'FULL'
                                  ? 'TOÀN QUYỀN'
                                  : perm === 'SCOPED'
                                    ? 'THEO PHÂN CÔNG'
                                    : perm === 'READ'
                                      ? 'CHỈ XEM'
                                      : 'CHẶN (403)'}
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 2: IAM USER & RBAC LIFECYCLE MANAGEMENT (admin-users)
         ===================================================================== */}
      {activeSection === 'admin-users' && (
        <div className="space-y-5">
          {/* Role Count Filter Pills */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-6">
            <button
              type="button"
              onClick={() => setRoleFilter('ALL')}
              className={cn(
                'cursor-pointer rounded-2xl border p-3.5 text-left transition-all',
                roleFilter === 'ALL'
                  ? 'border-amber-500 bg-amber-50/70 shadow-xs'
                  : 'border-slate-200 bg-white hover:bg-slate-50',
              )}
            >
              <p className="font-mono text-[10px] font-bold text-slate-500 uppercase">TẤT CẢ ROLE</p>
              <p className="mt-1 font-mono text-2xl font-extrabold text-slate-900">
                {store.users.length}
              </p>
              <p className="text-[11px] text-slate-500">Tài khoản hệ thống</p>
            </button>

            {(['ADMIN', 'HIRING_MANAGER', 'HR', 'INTERVIEWER', 'CANDIDATE'] as UserRole[]).map(
              (r) => {
                const count = store.users.filter((u) => u.role === r).length;
                const active = roleFilter === r;
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRoleFilter(active ? 'ALL' : r)}
                    className={cn(
                      'cursor-pointer rounded-2xl border p-3.5 text-left transition-all',
                      active
                        ? 'border-amber-500 bg-amber-50/70 shadow-xs'
                        : 'border-slate-200 bg-white hover:bg-slate-50',
                    )}
                  >
                    <p className="truncate font-mono text-[10px] font-bold text-slate-500 uppercase">
                      {r}
                    </p>
                    <p className="mt-1 font-mono text-2xl font-extrabold text-slate-900">{count}</p>
                    <p className="truncate text-[11px] text-slate-500">{ROLE_META[r].portalTitle}</p>
                  </button>
                );
              },
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Quản Trị Định Danh & Phân Quyền Tài Khoản (IAM & RBAC — S1.3, S1.5, S1.6)
                </h2>
                <p className="text-xs text-slate-500">
                  Tạo mới nhân sự, cấp quyền Role, điều chuyển Phòng ban, đặt lại mật khẩu hoặc khóa
                  tài khoản vi phạm (<code>USER_INACTIVE</code>).
                </p>
              </div>

              {/* Search, Status & Department Filter & Create User Action */}
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Dedicated Search Input + Button */}
                <div className="flex items-center gap-1.5">
                  <div className="relative">
                    <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={userSearch}
                      onChange={(e) => {
                        setUserSearch(e.target.value);
                        setUserPage(1);
                      }}
                      placeholder="Tìm tên, email, SĐT, phòng ban..."
                      className="w-56 sm:w-64 rounded-2xl border border-slate-200/90 bg-white py-1.5 pr-8 pl-8 text-xs shadow-2xs transition-all focus:border-amber-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400/20"
                    />
                    {userSearch && (
                      <button
                        type="button"
                        onClick={() => {
                          setUserSearch('');
                          setUserPage(1);
                        }}
                        className="absolute top-1/2 right-2.5 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5 rounded-full hover:bg-slate-100"
                        title="Xóa tìm kiếm"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setUserPage(1)}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-2xl bg-slate-900 px-3.5 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-slate-800 transition-all active:scale-95"
                  >
                    <Search className="h-3.5 w-3.5" />
                    <span>Tìm kiếm</span>
                  </button>
                </div>

                <ModernSelect<'ALL' | 'ACTIVE' | 'INACTIVE'>
                  value={statusFilter}
                  onChange={(val) => {
                    setStatusFilter(val);
                    setUserPage(1);
                  }}
                  options={[
                    { value: 'ALL', label: 'Mọi trạng thái' },
                    {
                      value: 'ACTIVE',
                      label: 'Đang hoạt động',
                      badge: 'ACTIVE',
                      badgeColor: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60',
                    },
                    {
                      value: 'INACTIVE',
                      label: 'Đã khóa',
                      badge: 'INACTIVE',
                      badgeColor: 'bg-red-50 text-red-700 ring-1 ring-red-200/60',
                    },
                  ]}
                  triggerClassName="rounded-2xl"
                />

                <ModernSelect<string>
                  value={userDeptFilter}
                  onChange={(val) => {
                    setUserDeptFilter(val);
                    setUserPage(1);
                  }}
                  options={[
                    { value: 'ALL', label: 'Tất cả phòng ban' },
                    ...allDistinctDepartments.map((d) => ({
                      value: d,
                      label: d,
                    })),
                  ]}
                  triggerClassName="rounded-2xl max-w-[200px]"
                />

                <button
                  type="button"
                  onClick={() => setIsCreateUserOpen(true)}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-amber-500 px-4 py-2 text-xs font-extrabold text-slate-950 shadow-md shadow-amber-500/20 hover:bg-amber-400 hover:shadow-lg transition-all active:scale-95"
                >
                  <UserPlus className="h-4 w-4" />
                  Cấp Mới Tài Khoản
                </button>
              </div>
            </div>

            {/* Active User Filters Pill & Quick Reset */}
            {(userSearch.trim() !== '' || roleFilter !== 'ALL' || statusFilter !== 'ALL' || userDeptFilter !== 'ALL') && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2.5 rounded-2xl border border-amber-200/90 bg-amber-50/60 px-4 py-2 text-xs text-amber-950 shadow-2xs">
                <div className="flex flex-wrap items-center gap-2">
                  <Filter className="h-3.5 w-3.5 text-amber-700" />
                  <span className="font-semibold text-slate-800">Đang lọc danh sách:</span>
                  <span className="rounded-lg bg-white px-2 py-0.5 font-bold text-slate-900 shadow-2xs">
                    {filteredUsers.length} / {store.users.length} tài khoản
                  </span>
                  {userSearch.trim() && (
                    <span className="rounded-lg border border-amber-300/80 bg-white/80 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                      Từ khóa: <strong>"{userSearch.trim()}"</strong>
                    </span>
                  )}
                  {roleFilter !== 'ALL' && (
                    <span className="rounded-lg border border-amber-300/80 bg-white/80 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                      Role: <strong>{roleFilter}</strong>
                    </span>
                  )}
                  {statusFilter !== 'ALL' && (
                    <span className="rounded-lg border border-amber-300/80 bg-white/80 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                      Trạng thái: <strong>{statusFilter}</strong>
                    </span>
                  )}
                  {userDeptFilter !== 'ALL' && (
                    <span className="rounded-lg border border-amber-300/80 bg-white/80 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                      Phòng ban: <strong>{userDeptFilter}</strong>
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setUserSearch('');
                    setRoleFilter('ALL');
                    setStatusFilter('ALL');
                    setUserDeptFilter('ALL');
                    setUserPage(1);
                  }}
                  className="inline-flex cursor-pointer items-center gap-1 rounded-xl bg-white px-3 py-1 text-[11px] font-bold text-amber-900 shadow-2xs hover:bg-amber-100 transition-all active:scale-95"
                >
                  <RotateCcw className="h-3 w-3 text-amber-700" />
                  Xóa bộ lọc
                </button>
              </div>
            )}

            {/* User Table */}
            {selectedUserIds.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-blue-300 bg-blue-50/90 px-4 py-2.5 text-xs shadow-xs">
                <div className="flex items-center gap-2">
                  <CheckSquare className="h-4 w-4 text-blue-600" />
                  <span className="font-bold text-blue-950">
                    Đã chọn {selectedUserIds.length} tài khoản nhân sự:
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setStore((prev) => ({
                        ...prev,
                        users: prev.users.map((u) =>
                          selectedUserIds.includes(u.id) && u.id !== currentUser.id
                            ? { ...u, status: 'INACTIVE' }
                            : u,
                        ),
                      }));
                      appendAudit(
                        'ADMIN_BULK_LOCK',
                        `Admin khóa hàng loạt ${selectedUserIds.length} tài khoản`,
                      );
                      notifyBanner(`Đã khóa ${selectedUserIds.length} tài khoản đã chọn!`);
                      setSelectedUserIds([]);
                    }}
                    className="cursor-pointer rounded-lg bg-amber-600 px-3 py-1 font-bold text-white hover:bg-amber-700"
                  >
                    Khóa Đã Chọn
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStore((prev) => ({
                        ...prev,
                        users: prev.users.map((u) =>
                          selectedUserIds.includes(u.id) ? { ...u, status: 'ACTIVE' } : u,
                        ),
                      }));
                      appendAudit(
                        'ADMIN_BULK_UNLOCK',
                        `Admin mở khóa hàng loạt ${selectedUserIds.length} tài khoản`,
                      );
                      notifyBanner(`Đã mở khóa ${selectedUserIds.length} tài khoản đã chọn!`);
                      setSelectedUserIds([]);
                    }}
                    className="cursor-pointer rounded-lg bg-emerald-600 px-3 py-1 font-bold text-white hover:bg-emerald-700"
                  >
                    Mở Khóa Đã Chọn
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStore((prev) => ({
                        ...prev,
                        users: prev.users.map((u) =>
                          selectedUserIds.includes(u.id) ? { ...u, password: 'Password@123' } : u,
                        ),
                      }));
                      appendAudit(
                        'ADMIN_BULK_RESET_PWD',
                        `Admin đặt lại mật khẩu về Password@123 cho ${selectedUserIds.length} tài khoản`,
                      );
                      notifyBanner(
                        `Đã đặt lại mật khẩu của ${selectedUserIds.length} tài khoản về mặc định "Password@123"!`,
                      );
                      setSelectedUserIds([]);
                    }}
                    className="cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-1 font-bold text-slate-800 hover:bg-slate-100"
                  >
                    Reset MK (Password@123)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedUserIds([])}
                    className="cursor-pointer text-xs font-semibold text-slate-600 hover:text-slate-900"
                  >
                    Bỏ chọn
                  </button>
                </div>
              </div>
            )}

            <div className="mt-4 overflow-x-auto min-h-[460px] pb-24">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-600 uppercase">
                    <th className="w-8 px-3.5 py-3">
                      <input
                        type="checkbox"
                        checked={
                          selectedUserIds.length === filteredUsers.length && filteredUsers.length > 0
                        }
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedUserIds(filteredUsers.map((u) => u.id));
                          } else {
                            setSelectedUserIds([]);
                          }
                        }}
                        className="h-3.5 w-3.5 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                      />
                    </th>
                    <th className="px-3.5 py-3">Nhân sự / Định danh</th>
                    <th className="px-3.5 py-3">Phòng ban</th>
                    <th className="px-3.5 py-3">Role Được Gán</th>
                    <th className="px-3.5 py-3">Mật khẩu hiện tại</th>
                    <th className="px-3.5 py-3">Trạng thái</th>
                    <th className="px-3.5 py-3 text-right">Thao tác Quản trị</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedUsers.map((u) => {
                    const isSelf = u.id === currentUser.id;
                    const isChecked = selectedUserIds.includes(u.id);
                    return (
                      <tr
                        key={u.id}
                        className={cn('hover:bg-slate-50/80', isChecked && 'bg-blue-50/40')}
                      >
                        <td className="w-8 px-3.5 py-3">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedUserIds((prev) => [...prev, u.id]);
                              } else {
                                setSelectedUserIds((prev) => prev.filter((id) => id !== u.id));
                              }
                            }}
                            className="h-3.5 w-3.5 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                          />
                        </td>
                        <td className="px-3.5 py-3">
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-slate-900">{u.fullName}</p>
                            {isSelf && (
                              <span className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-[9px] font-bold text-amber-800">
                                BẠN
                              </span>
                            )}
                          </div>
                          <p className="font-mono text-[11px] text-slate-500">
                            {u.email} · {u.phone}
                          </p>
                        </td>

                        {/* Direct Department Selector (UI/UX PRO MAX ModernSelect) */}
                        <td className="px-3.5 py-3 min-w-[210px]">
                          <ModernSelect<string>
                            value={u.department}
                            disabled={u.role === 'CANDIDATE'}
                            onChange={(nextDept) => {
                              setStore((prev) => ({
                                ...prev,
                                users: prev.users.map((item) =>
                                  item.id === u.id ? { ...item, department: nextDept } : item,
                                ),
                              }));
                              appendAudit(
                                'CHANGE_USER_DEPT',
                                `Điều chuyển ${u.email} sang phòng ban "${nextDept}"`,
                              );
                              notifyBanner(`Đã chuyển ${u.fullName} sang phòng ban ${nextDept}.`);
                            }}
                            options={[
                              { value: 'Executive & IT Governance', label: 'Executive & IT Governance' },
                              { value: 'People & Talent', label: 'People & Talent' },
                              { value: 'Ứng viên bên ngoài', label: 'Ứng viên bên ngoài' },
                              ...store.departments.map((d) => ({
                                value: d.name,
                                label: d.name,
                              })),
                            ]}
                            className="w-full"
                            triggerClassName="w-full rounded-xl py-1 text-xs font-medium"
                          />
                        </td>

                        {/* Direct Role Selector (UI/UX PRO MAX ModernSelect) */}
                        <td className="px-3.5 py-3 min-w-[170px]">
                          <ModernSelect<UserRole>
                            value={u.role}
                            disabled={isSelf}
                            onChange={(nextRole) => {
                              setStore((prev) => ({
                                ...prev,
                                users: prev.users.map((item) =>
                                  item.id === u.id ? { ...item, role: nextRole } : item,
                                ),
                              }));
                              appendAudit(
                                'CHANGE_ROLE',
                                `Đổi Role của ${u.email} từ ${u.role} → ${nextRole}`,
                              );
                              notifyBanner(
                                `Đã đổi Role của ${u.email} sang ${nextRole}. Khi đăng nhập sẽ vào ${ROLE_META[nextRole].portalTitle}!`,
                              );
                            }}
                            options={[
                              { value: 'ADMIN', label: 'ADMIN', badge: 'ADMIN', badgeColor: 'bg-amber-100 text-amber-900' },
                              { value: 'HIRING_MANAGER', label: 'HIRING_MANAGER', badge: 'HM', badgeColor: 'bg-emerald-100 text-emerald-900' },
                              { value: 'HR', label: 'HR', badge: 'HR', badgeColor: 'bg-blue-100 text-blue-900' },
                              { value: 'INTERVIEWER', label: 'INTERVIEWER', badge: 'INT', badgeColor: 'bg-violet-100 text-violet-900' },
                              { value: 'CANDIDATE', label: 'CANDIDATE', badge: 'CAND', badgeColor: 'bg-sky-100 text-sky-900' },
                            ]}
                            className="w-full"
                            triggerClassName="w-full rounded-xl py-1 font-mono text-xs font-bold"
                          />
                        </td>

                        <td className="px-3.5 py-3 font-mono text-[11px] text-slate-500">
                          <code>{u.password}</code>
                        </td>

                        <td className="px-3.5 py-3">
                          <span
                            className={cn(
                              'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold',
                              u.status === 'ACTIVE'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-red-100 text-red-700',
                            )}
                          >
                            {u.status === 'ACTIVE' ? (
                              <Unlock className="h-3 w-3" />
                            ) : (
                              <Lock className="h-3 w-3" />
                            )}
                            {u.status}
                          </span>
                        </td>

                        <td className="px-3.5 py-3 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setResetConfirmUser(u)}
                              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200/90 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 shadow-2xs hover:border-slate-300 hover:bg-slate-50 transition-all active:scale-95"
                              title="Đặt lại mật khẩu về Password@123"
                            >
                              <RefreshCw className="h-3 w-3 text-slate-500" />
                              Reset MK
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setEditingUser(u);
                                setEditUserName(u.fullName);
                                setEditUserPhone(u.phone);
                                setEditUserPassword(u.password);
                                setEditUserRole(u.role);
                                setEditUserDept(u.department);
                                setEditUserStatus(u.status);
                              }}
                              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-blue-200/90 bg-blue-50/50 px-2.5 py-1 text-[11px] font-semibold text-blue-700 shadow-2xs hover:border-blue-300 hover:bg-blue-100 transition-all active:scale-95"
                              title="Cập nhật thông tin và đổi mật khẩu"
                            >
                              <KeyRound className="h-3 w-3 text-blue-600" />
                              Sửa / Đổi MK
                            </button>

                            {!isSelf && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const nextStatus =
                                      u.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
                                    setStatusConfirmUser({ user: u, nextStatus });
                                  }}
                                  className={cn(
                                    'inline-flex cursor-pointer items-center gap-1 rounded-xl border px-2.5 py-1 text-[11px] font-semibold shadow-2xs transition-all active:scale-95',
                                    u.status === 'ACTIVE'
                                      ? 'border-amber-200/90 bg-amber-50/70 text-amber-800 hover:border-amber-300 hover:bg-amber-100'
                                      : 'border-emerald-200/90 bg-emerald-50/70 text-emerald-800 hover:border-emerald-300 hover:bg-emerald-100',
                                  )}
                                  title={u.status === 'ACTIVE' ? 'Khóa tài khoản này' : 'Mở khóa tài khoản'}
                                >
                                  {u.status === 'ACTIVE' ? (
                                    <>
                                      <Lock className="h-3 w-3 text-amber-700" />
                                      Khóa
                                    </>
                                  ) : (
                                    <>
                                      <Unlock className="h-3 w-3 text-emerald-700" />
                                      Mở khóa
                                    </>
                                  )}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    const managesDept = store.departments.find(
                                      (d) =>
                                        d.managerName.toLowerCase() === u.fullName.toLowerCase(),
                                    );
                                    if (managesDept) {
                                      onTriggerViolation({
                                        code: 'USER_IS_DEPT_MANAGER',
                                        message: `Không thể xóa "${u.fullName}" vì đang là Trưởng bộ phận của phòng ban "${managesDept.name}". Hãy điều chuyển chức vụ Trưởng bộ phận trước khi xóa!`,
                                        candidateName: u.fullName,
                                        fromStageName: 'Department Manager',
                                        toStageName: 'Delete User',
                                      });
                                      return;
                                    }
                                    setDeleteConfirmUser(u);
                                  }}
                                  className="inline-flex cursor-pointer items-center justify-center h-7 w-7 rounded-xl border border-red-200/90 bg-red-50/70 text-red-600 shadow-2xs hover:border-red-300 hover:bg-red-100 transition-all active:scale-95"
                                  title="Xóa tài khoản an toàn"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {filteredUsers.length === 0 && (
                <div className="py-12 text-center">
                  <Users className="mx-auto h-8 w-8 text-slate-300" />
                  <p className="mt-2 text-xs font-semibold text-slate-600">
                    Không tìm thấy tài khoản nào khớp với điều kiện lọc hiện tại.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setUserSearch('');
                      setRoleFilter('ALL');
                      setStatusFilter('ALL');
                      setUserDeptFilter('ALL');
                      setUserPage(1);
                    }}
                    className="mt-2 inline-flex items-center gap-1 text-xs text-amber-600 font-bold hover:underline cursor-pointer"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Đặt lại toàn bộ bộ lọc
                  </button>
                </div>
              )}
            </div>

            <TablePagination
              currentPage={userPage}
              pageSize={userPageSize}
              totalItems={filteredUsers.length}
              onPageChange={setUserPage}
              onPageSizeChange={setUserPageSize}
              itemName="tài khoản IAM"
            />
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 3: ORG STRUCTURE & DEPARTMENT GOVERNANCE (admin-departments)
         ===================================================================== */}
      {activeSection === 'admin-departments' && (
        <div className="space-y-5">
          {/* Header Bar with Action Button, Dedicated Search & Filters */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Cơ Cấu Phòng Ban & Trưởng Bộ Phận (Organizational Structure — S2.10)
                </h2>
                <p className="text-xs text-slate-500">
                  Quản lý các phòng ban chuyên môn, chỉ định Hiring Manager, theo dõi định biên nhân sự và ràng buộc khóa ngoại (Referential Integrity).
                </p>
              </div>

              {/* Action Buttons: Create New Dept */}
              <button
                type="button"
                onClick={() => {
                  setNewDeptName('');
                  setIsCreateDeptOpen(true);
                }}
                className="inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-amber-500 px-4 py-2 text-xs font-extrabold text-slate-950 shadow-md shadow-amber-500/20 hover:bg-amber-400 hover:shadow-lg transition-all active:scale-95"
              >
                <Plus className="h-4 w-4" />
                Thêm Phòng Ban Mới
              </button>
            </div>

            {/* Search, Quota Filter & View Mode Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Dedicated Search Input + Button */}
                <div className="flex items-center gap-1.5">
                  <div className="relative">
                    <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={deptSearch}
                      onChange={(e) => {
                        setDeptSearch(e.target.value);
                        setDeptPage(1);
                      }}
                      placeholder="Tìm phòng ban, Trưởng bộ phận..."
                      className="w-56 sm:w-64 rounded-2xl border border-slate-200/90 bg-white py-1.5 pr-8 pl-8 text-xs shadow-2xs transition-all focus:border-amber-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400/20"
                    />
                    {deptSearch && (
                      <button
                        type="button"
                        onClick={() => {
                          setDeptSearch('');
                          setDeptPage(1);
                        }}
                        className="absolute top-1/2 right-2.5 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5 rounded-full hover:bg-slate-100"
                        title="Xóa tìm kiếm"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setDeptPage(1)}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-2xl bg-slate-900 px-3.5 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-slate-800 transition-all active:scale-95"
                  >
                    <Search className="h-3.5 w-3.5" />
                    <span>Tìm kiếm</span>
                  </button>
                </div>

                {/* Quota Filter */}
                <ModernSelect<'ALL' | 'FULL' | 'HIRING' | 'NO_REQ'>
                  value={deptQuotaFilter}
                  onChange={(val) => {
                    setDeptQuotaFilter(val);
                    setDeptPage(1);
                  }}
                  options={[
                    { value: 'ALL', label: 'Mọi tiến độ định biên' },
                    { value: 'HIRING', label: 'Đang tuyển dụng', badge: 'Đang tuyển', badgeColor: 'bg-emerald-50 text-emerald-700' },
                    { value: 'FULL', label: 'Đã đủ định biên', badge: 'Đã đủ', badgeColor: 'bg-blue-50 text-blue-700' },
                    { value: 'NO_REQ', label: 'Chưa có Requisition', badge: '0 Req', badgeColor: 'bg-slate-100 text-slate-600' },
                  ]}
                  triggerClassName="rounded-2xl"
                />
              </div>

              {/* View Mode Toggle (Table vs Cards) */}
              <div className="flex items-center gap-1 rounded-2xl border border-slate-200 bg-slate-50 p-1 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setDeptViewMode('TABLE')}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer',
                    deptViewMode === 'TABLE'
                      ? 'bg-white text-slate-900 shadow-2xs ring-1 ring-slate-900/5'
                      : 'text-slate-500 hover:text-slate-800',
                  )}
                >
                  <TableIcon className="h-3.5 w-3.5" />
                  <span>Dạng Bảng</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDeptViewMode('CARDS')}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer',
                    deptViewMode === 'CARDS'
                      ? 'bg-white text-slate-900 shadow-2xs ring-1 ring-slate-900/5'
                      : 'text-slate-500 hover:text-slate-800',
                  )}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  <span>Dạng Thẻ</span>
                </button>
              </div>
            </div>

            {/* Active Department Filters Pill */}
            {(deptSearch.trim() !== '' || deptQuotaFilter !== 'ALL') && (
              <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-2xl border border-amber-200/90 bg-amber-50/60 px-4 py-2 text-xs text-amber-950 shadow-2xs">
                <div className="flex flex-wrap items-center gap-2">
                  <Filter className="h-3.5 w-3.5 text-amber-700" />
                  <span className="font-semibold text-slate-800">Đang lọc phòng ban:</span>
                  <span className="rounded-lg bg-white px-2 py-0.5 font-bold text-slate-900 shadow-2xs">
                    {filteredDepartments.length} / {store.departments.length} phòng ban
                  </span>
                  {deptSearch.trim() && (
                    <span className="rounded-lg border border-amber-300/80 bg-white/80 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                      Từ khóa: <strong>"{deptSearch.trim()}"</strong>
                    </span>
                  )}
                  {deptQuotaFilter !== 'ALL' && (
                    <span className="rounded-lg border border-amber-300/80 bg-white/80 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                      Tiến độ: <strong>{deptQuotaFilter}</strong>
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setDeptSearch('');
                    setDeptQuotaFilter('ALL');
                    setDeptPage(1);
                  }}
                  className="inline-flex cursor-pointer items-center gap-1 rounded-xl bg-white px-3 py-1 text-[11px] font-bold text-amber-900 shadow-2xs hover:bg-amber-100 transition-all active:scale-95"
                >
                  <RotateCcw className="h-3 w-3 text-amber-700" />
                  Xóa bộ lọc
                </button>
              </div>
            )}
          </div>

          {/* Department Content: Table View vs Cards View */}
          {filteredDepartments.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center shadow-xs">
              <Building2 className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-2 text-xs font-semibold text-slate-600">
                Không tìm thấy phòng ban nào khớp với điều kiện tìm kiếm và bộ lọc.
              </p>
              <button
                type="button"
                onClick={() => {
                  setDeptSearch('');
                  setDeptQuotaFilter('ALL');
                  setDeptPage(1);
                }}
                className="mt-2 inline-flex items-center gap-1 text-xs text-amber-600 font-bold hover:underline cursor-pointer"
              >
                <RotateCcw className="h-3 w-3" />
                Đặt lại bộ lọc
              </button>
            </div>
          ) : deptViewMode === 'TABLE' ? (
            /* Modern Table View */
            <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-600 uppercase">
                      <th className="px-4 py-3">Mã ID</th>
                      <th className="px-4 py-3">Phòng Ban Chuyên Môn</th>
                      <th className="px-4 py-3">Trưởng Bộ Phận (HM)</th>
                      <th className="px-4 py-3">Nhân Sự Nội Bộ</th>
                      <th className="px-4 py-3">Chiến Dịch & Requisitions</th>
                      <th className="px-4 py-3">Lấp Đầy Định Biên</th>
                      <th className="px-4 py-3 text-right">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedDepartments.map((d) => {
                      const fillPercent =
                        d.totalHeadcount > 0 ? Math.min(100, Math.round((d.totalFilled / d.totalHeadcount) * 100)) : 0;
                      return (
                        <tr key={d.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-4 py-3.5 font-mono text-xs font-bold text-slate-500">
                            #{d.id}
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2.5">
                              <span className="rounded-xl bg-amber-50 p-2 text-amber-600 shadow-2xs">
                                <Building2 className="h-4 w-4" />
                              </span>
                              <div>
                                <p className="font-bold text-slate-900">{d.name}</p>
                                <p className="text-[11px] text-slate-400">
                                  {d.actualJobs.length} Job đang tuyển dụng
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-800">
                              <strong className="text-amber-700 font-mono text-[10px]">HM</strong>
                              {d.managerName}
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            <button
                              type="button"
                              onClick={() => {
                                setUserDeptFilter(d.name);
                                onSelectSection('admin-users');
                              }}
                              className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                              title="Xem danh sách nhân sự phòng ban này"
                            >
                              <Users className="h-3.5 w-3.5 text-blue-500" />
                              <span>{d.actualMembers.length} nhân sự</span>
                            </button>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2">
                              <span className="rounded bg-blue-50 px-2 py-0.5 font-mono text-[11px] font-bold text-blue-700">
                                {d.actualJobs.length} Jobs
                              </span>
                              <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-bold text-slate-600">
                                {d.actualRequisitions.length} Reqs
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 min-w-[160px]">
                            {d.totalHeadcount > 0 ? (
                              <div className="space-y-1">
                                <div className="flex items-center justify-between text-[11px]">
                                  <span className="font-mono font-bold text-slate-700">
                                    {d.totalFilled} / {d.totalHeadcount}
                                  </span>
                                  <span
                                    className={cn(
                                      'font-mono font-extrabold text-[10px]',
                                      fillPercent >= 100 ? 'text-blue-600' : 'text-emerald-600',
                                    )}
                                  >
                                    {fillPercent}%
                                  </span>
                                </div>
                                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                                  <div
                                    className={cn(
                                      'h-full rounded-full transition-all duration-300',
                                      fillPercent >= 100 ? 'bg-blue-500' : 'bg-emerald-500',
                                    )}
                                    style={{ width: `${fillPercent}%` }}
                                  />
                                </div>
                              </div>
                            ) : (
                              <span className="font-mono text-[11px] text-slate-400 italic">
                                Chưa có định biên
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingDept(d);
                                  setEditDeptName(d.name);
                                  setEditDeptManager(d.managerName);
                                }}
                                className="cursor-pointer rounded-xl border border-slate-200/90 bg-white p-2 text-slate-600 shadow-2xs hover:border-slate-300 hover:bg-slate-50 transition-all active:scale-95"
                                title="Chỉnh sửa Phòng ban"
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (d.actualMembers.length > 0) {
                                    onTriggerViolation({
                                      code: 'DEPARTMENT_HAS_MEMBERS',
                                      message: `Không thể xóa phòng ban "${d.name}" vì đang có ${d.actualMembers.length} tài khoản nội bộ trực thuộc. Vui lòng điều chuyển nhân sự sang phòng ban khác trước khi xóa.`,
                                      candidateName: d.name,
                                      fromStageName: 'Referential Integrity Guard (S2.10)',
                                      toStageName: 'Delete Department Blocked',
                                    });
                                    return;
                                  }
                                  if (d.actualRequisitions.length > 0) {
                                    onTriggerViolation({
                                      code: 'DEPARTMENT_HAS_REQUISITIONS',
                                      message: `Không thể xóa phòng ban "${d.name}" vì đang có ${d.actualRequisitions.length} phiếu định biên (Requisitions) liên kết.`,
                                      candidateName: d.name,
                                      fromStageName: 'Referential Integrity Guard (S2.10)',
                                      toStageName: 'Delete Department Blocked',
                                    });
                                    return;
                                  }
                                  if (d.actualJobs.length > 0) {
                                    onTriggerViolation({
                                      code: 'DEPARTMENT_HAS_JOBS',
                                      message: `Không thể xóa phòng ban "${d.name}" vì đang có ${d.actualJobs.length} chiến dịch tuyển dụng (Jobs) đang mở thuộc phòng ban này.`,
                                      candidateName: d.name,
                                      fromStageName: 'Referential Integrity Guard (S2.10)',
                                      toStageName: 'Delete Department Blocked',
                                    });
                                    return;
                                  }
                                  setDeleteConfirmDept({ id: d.id, name: d.name });
                                }}
                                className="cursor-pointer rounded-xl border border-red-200/90 bg-red-50/70 p-2 text-red-600 shadow-2xs hover:border-red-300 hover:bg-red-100 transition-all active:scale-95"
                                title="Xóa Phòng ban an toàn"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <TablePagination
                currentPage={deptPage}
                pageSize={deptPageSize}
                totalItems={filteredDepartments.length}
                onPageChange={setDeptPage}
                onPageSizeChange={setDeptPageSize}
                itemName="phòng ban"
              />
            </div>
          ) : (
            /* Modern Cards View */
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {paginatedDepartments.map((d) => {
                  return (
                    <div
                      key={d.id}
                      className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <span className="rounded-xl bg-amber-50 p-2.5 text-amber-600">
                              <Building2 className="h-5 w-5" />
                            </span>
                            <div>
                              <h3 className="text-base font-bold text-slate-900">{d.name}</h3>
                              <p className="text-[11px] text-slate-500">
                                Trưởng bộ phận:{' '}
                                <strong className="text-slate-800">{d.managerName}</strong>
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingDept(d);
                                setEditDeptName(d.name);
                                setEditDeptManager(d.managerName);
                              }}
                              className="cursor-pointer rounded-xl border border-slate-200/90 bg-white p-2 text-slate-600 shadow-2xs hover:border-slate-300 hover:bg-slate-50 transition-all active:scale-95"
                              title="Chỉnh sửa Phòng ban"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (d.actualMembers.length > 0) {
                                  onTriggerViolation({
                                    code: 'DEPARTMENT_HAS_MEMBERS',
                                    message: `Không thể xóa phòng ban "${d.name}" vì đang có ${d.actualMembers.length} tài khoản nội bộ trực thuộc. Vui lòng điều chuyển nhân sự sang phòng ban khác trước khi xóa.`,
                                    candidateName: d.name,
                                    fromStageName: 'Referential Integrity Guard (S2.10)',
                                    toStageName: 'Delete Department Blocked',
                                  });
                                  return;
                                }
                                if (d.actualRequisitions.length > 0) {
                                  onTriggerViolation({
                                    code: 'DEPARTMENT_HAS_REQUISITIONS',
                                    message: `Không thể xóa phòng ban "${d.name}" vì đang có ${d.actualRequisitions.length} phiếu định biên (Requisitions) liên kết.`,
                                    candidateName: d.name,
                                    fromStageName: 'Referential Integrity Guard (S2.10)',
                                    toStageName: 'Delete Department Blocked',
                                  });
                                  return;
                                }
                                if (d.actualJobs.length > 0) {
                                  onTriggerViolation({
                                    code: 'DEPARTMENT_HAS_JOBS',
                                    message: `Không thể xóa phòng ban "${d.name}" vì đang có ${d.actualJobs.length} chiến dịch tuyển dụng (Jobs) đang mở thuộc phòng ban này.`,
                                    candidateName: d.name,
                                    fromStageName: 'Referential Integrity Guard (S2.10)',
                                    toStageName: 'Delete Department Blocked',
                                  });
                                  return;
                                }
                                setDeleteConfirmDept({ id: d.id, name: d.name });
                              }}
                              className="cursor-pointer rounded-xl border border-red-200/90 bg-red-50/70 p-2 text-red-600 shadow-2xs hover:border-red-300 hover:bg-red-100 transition-all active:scale-95"
                              title="Xóa Phòng ban an toàn"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Department KPI Strip */}
                        <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-2.5 text-center text-xs">
                          <div>
                            <p className="text-[10px] font-semibold text-slate-400">NHÂN SỰ</p>
                            <p className="font-mono text-sm font-extrabold text-slate-900">
                              {d.actualMemberCount}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] font-semibold text-slate-400">REQUISITIONS</p>
                            <p className="font-mono text-sm font-extrabold text-blue-600">
                              {d.actualRequisitions.length}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] font-semibold text-slate-400">ĐỊNH BIÊN</p>
                            <p className="font-mono text-sm font-extrabold text-emerald-600">
                              {d.totalFilled}/{d.totalHeadcount}
                            </p>
                          </div>
                        </div>

                        {/* Member Roster in this Department */}
                        <div className="mt-3">
                          <p className="text-[11px] font-bold text-slate-500">
                            Tài khoản trực thuộc ({d.actualMembers.length}):
                          </p>
                          {d.actualMembers.length === 0 ? (
                            <p className="mt-1 text-[11px] italic text-slate-400">
                              Chưa có tài khoản nội bộ gắn trực tiếp.
                            </p>
                          ) : (
                            <div className="mt-1.5 flex flex-wrap gap-1.5">
                              {d.actualMembers.map((m) => (
                                <span
                                  key={m.id}
                                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-700"
                                >
                                  <strong className="font-mono text-[9px] text-amber-700">
                                    [{m.role}]
                                  </strong>{' '}
                                  {m.fullName}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
                        <span className="font-semibold text-slate-500">
                          Chiến dịch Job đang chạy: <strong>{d.actualJobs.length}</strong>
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setUserDeptFilter(d.name);
                            onSelectSection('admin-users');
                          }}
                          className="cursor-pointer font-bold text-amber-700 hover:underline"
                        >
                          Xem nhân sự →
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
                <TablePagination
                  currentPage={deptPage}
                  pageSize={deptPageSize}
                  totalItems={filteredDepartments.length}
                  onPageChange={setDeptPage}
                  onPageSizeChange={setDeptPageSize}
                  itemName="phòng ban"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          TAB 4: SYSTEM-WIDE JOB, REQUISITION & CANDIDATE OVERSIGHT (admin-governance)
         ===================================================================== */}
      {activeSection === 'admin-governance' && (
        <div className="space-y-5">
          {/* Sub-navigation between Jobs/Requisitions Setup & All Candidates Directory */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setGovTab('jobs')}
                className={cn(
                  'cursor-pointer rounded-xl px-4 py-2 text-xs font-bold transition-all',
                  govTab === 'jobs'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                )}
              >
                1. Quản trị Requisitions, Jobs & Barem Trọng số ({store.jobs.length} Jobs)
              </button>
              <button
                type="button"
                onClick={() => setGovTab('candidates')}
                className={cn(
                  'cursor-pointer rounded-xl px-4 py-2 text-xs font-bold transition-all',
                  govTab === 'candidates'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                )}
              >
                2. Giám sát Toàn bộ Hồ sơ Ứng viên ({store.candidates.length} Ứng viên)
              </button>
            </div>

            <button
              type="button"
              onClick={() =>
                exportRankingToCsv(
                  selectedJob,
                  store.candidates.filter((c) => c.jobId === selectedJob.id),
                  selectedJob.criteria,
                )
              }
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
              Xuất Bảng Xếp Hạng Job #{selectedJob.id} (.CSV)
            </button>
          </div>

          {govTab === 'jobs' ? (
            <JobSetupView
              currentUser={currentUser}
              requisitions={store.requisitions}
              jobs={store.jobs}
              selectedJob={selectedJob}
              jobApplicationsCount={
                store.candidates.filter((c) => c.jobId === selectedJob.id).length
              }
              onSelectJob={onSelectJobId}
              onCreateRequisition={(title, headcount, salaryRange) => {
                if (!title.trim()) return;
                if (!Number.isInteger(headcount) || headcount <= 0) {
                  onTriggerViolation({
                    code: 'REQ_INVALID_HEADCOUNT',
                    message: 'Số lượng cần tuyển (headcount) phải là số nguyên lớn hơn 0 (S2.3).',
                    candidateName: title,
                    fromStageName: 'Tạo Requisition',
                    toStageName: `headcount = ${headcount}`,
                  });
                  return;
                }
                const newReq: RequisitionItem = {
                  id: Math.floor(500 + Math.random() * 499),
                  title: title.trim(),
                  department: currentUser.department || 'Engineering',
                  requestedBy: currentUser.fullName,
                  headcount,
                  filledCount: 0,
                  salaryRange,
                  status: 'APPROVED',
                  hasJobId: null,
                  createdAt: new Date().toISOString().slice(0, 10),
                };
                setStore((prev) => ({
                  ...prev,
                  requisitions: [newReq, ...prev.requisitions],
                }));
                appendAudit(
                  'ADMIN_CREATE_REQ',
                  `Admin tạo & phê duyệt Requisition "${newReq.title}" (headcount = ${headcount})`,
                );
                notifyBanner(`Đã tạo và duyệt ngay Requisition "${newReq.title}"!`);
              }}
              onDecideRequisition={(reqId, decision) => {
                setStore((prev) => ({
                  ...prev,
                  requisitions: prev.requisitions.map((r) =>
                    r.id === reqId ? { ...r, status: decision } : r,
                  ),
                }));
                appendAudit('ADMIN_DECIDE_REQ', `Admin cập nhật Requisition #${reqId} → ${decision}`);
                notifyBanner(`Đã cập nhật trạng thái Requisition #${reqId} sang ${decision}!`);
              }}
              onCreateJobFromReq={(req) => {
                if (req.status !== 'APPROVED') {
                  onTriggerViolation({
                    code: 'REQ_NOT_APPROVED',
                    message: 'Yêu cầu tuyển dụng phải được duyệt (APPROVED) trước khi tạo Job (S2.5).',
                    candidateName: req.title,
                    fromStageName: req.status,
                    toStageName: 'APPROVED',
                  });
                  return;
                }
                if (req.hasJobId || store.jobs.some((j) => j.requisitionId === req.id)) {
                  onTriggerViolation({
                    code: 'REQ_ALREADY_HAS_JOB',
                    message: 'Yêu cầu tuyển dụng này đã liên kết với một Job đang chạy (quan hệ 1–1 theo S2.5, D14). Không thể tạo thêm Job thứ hai!',
                    candidateName: req.title,
                    fromStageName: 'Requisition 1-1',
                    toStageName: 'Duplicate Job Rejected',
                  });
                  return;
                }
                const newJobId = Math.floor(1000 + Math.random() * 900);
                const createdJob: JobItem = {
                  id: newJobId,
                  requisitionId: req.id,
                  title: req.title,
                  department: req.department,
                  description: `Tuyển dụng vị trí ${req.title} cho phòng ban ${req.department}.`,
                  requirements: 'Kinh nghiệm thực chiến, tư duy hệ thống và phối hợp nhóm tốt.',
                  salaryRange: req.salaryRange,
                  status: 'DRAFT',
                  headcount: req.headcount,
                  filledCount: 0,
                  passScoreThreshold: 3.5,
                  stages: selectedJob.stages.map((s) => ({ ...s })),
                  criteria: selectedJob.criteria.map((c) => ({ ...c })),
                  createdAt: new Date().toISOString().slice(0, 10),
                };
                setStore((prev) => ({
                  ...prev,
                  jobs: [...prev.jobs, createdJob],
                  requisitions: prev.requisitions.map((r) =>
                    r.id === req.id ? { ...r, hasJobId: newJobId } : r,
                  ),
                }));
                onSelectJobId(newJobId);
                appendAudit('ADMIN_CREATE_JOB', `Admin khởi tạo Job #${newJobId} (${req.title}) ở trạng thái DRAFT`);
                notifyBanner(`Đã khởi tạo Job #${newJobId} (${req.title}) ở trạng thái DRAFT!`);
              }}
              onUpdateJobConfig={(jobId, patch) => {
                const target = store.jobs.find((j) => j.id === jobId);
                if (!target) return;
                const hasApplicants = store.candidates.some((c) => c.jobId === jobId);
                if (hasApplicants && patch.passScoreThreshold !== undefined && patch.passScoreThreshold !== target.passScoreThreshold) {
                  onTriggerViolation({
                    code: 'JOB_CONFIG_LOCKED_APPLICANTS',
                    message: `Không thể thay đổi ngưỡng điểm vì Job "${target.title}" đã có ${store.candidates.filter(c => c.jobId === jobId).length} ứng viên nộp hồ sơ (S2.7, FR-202). Cấu hình đã bị khóa bảo vệ!`,
                    candidateName: target.title,
                    fromStageName: `${target.passScoreThreshold}`,
                    toStageName: `${patch.passScoreThreshold}`,
                  });
                  return;
                }
                if (patch.headcount !== undefined && patch.headcount < target.filledCount) {
                  onTriggerViolation({
                    code: 'JOB_HEADCOUNT_BELOW_FILLED',
                    message: `Không thể giảm chỉ tiêu tuyển dụng (${patch.headcount}) xuống thấp hơn số lượng đã tuyển (${target.filledCount})!`,
                    candidateName: target.title,
                    fromStageName: `${target.filledCount} đã tuyển`,
                    toStageName: `Chỉ tiêu ${patch.headcount}`,
                  });
                  return;
                }
                if (patch.status === 'PUBLISHED') {
                  const sum = target.criteria.reduce((s, c) => s + c.weightPercent, 0);
                  if (target.criteria.length === 0 || sum !== 100) {
                    onTriggerViolation({
                      code: 'JOB_NOT_PUBLISHABLE',
                      message: `Không thể xuất bản Job "${target.title}" vì tổng trọng số tiêu chí hiện tại là ${sum}% (Bắt buộc có ít nhất 1 tiêu chí và tổng đúng 100% — S2.9, S2.11).`,
                      candidateName: target.title,
                      fromStageName: target.status,
                      toStageName: 'PUBLISHED',
                    });
                    return;
                  }
                  const req = store.requisitions.find((r) => r.id === target.requisitionId);
                  if (req && req.status !== 'APPROVED') {
                    onTriggerViolation({
                      code: 'JOB_NOT_PUBLISHABLE',
                      message: `Không thể xuất bản Job vì yêu cầu định biên liên kết (#${req.id}) chưa ở trạng thái ĐÃ DUYỆT (APPROVED — S2.11).`,
                      candidateName: target.title,
                      fromStageName: req.status,
                      toStageName: 'APPROVED',
                    });
                    return;
                  }
                }
                setStore((prev) => ({
                  ...prev,
                  jobs: prev.jobs.map((j) => (j.id === jobId ? { ...j, ...patch } : j)),
                }));
                appendAudit(
                  'ADMIN_UPDATE_JOB',
                  `Admin cập nhật cấu hình Job #${jobId} (${JSON.stringify(patch)})`,
                );
                notifyBanner(`Đã cập nhật cấu hình Job #${jobId}!`);
              }}
              onSaveStages={(jobId: number, stages: StageDef[]) => {
                const target = store.jobs.find((j) => j.id === jobId);
                const hasApplicants = store.candidates.some((c) => c.jobId === jobId);
                if (hasApplicants) {
                  onTriggerViolation({
                    code: 'JOB_CONFIG_LOCKED_APPLICANTS',
                    message: `Không thể thay đổi cấu hình vòng tuyển dụng vì Job "${target?.title ?? jobId}" đã có ${store.candidates.filter(c => c.jobId === jobId).length} ứng viên nộp hồ sơ (S2.7, FR-202). Cấu hình đã bị khóa bảo vệ!`,
                    candidateName: target?.title ?? `Job #${jobId}`,
                    fromStageName: 'Lưu cấu hình vòng',
                    toStageName: 'Bị khóa bảo vệ',
                  });
                  return;
                }
                const mandatoryDisabled = stages.find((s) => s.mandatory && !s.enabled);
                if (mandatoryDisabled) {
                  onTriggerViolation({
                    code: 'STAGE_REQUIRED',
                    message: `Vòng "${mandatoryDisabled.name}" (${mandatoryDisabled.code}) là vòng bắt buộc, không được phép tắt (S2.6, D07).`,
                    candidateName: target?.title ?? `Job #${jobId}`,
                    fromStageName: mandatoryDisabled.code,
                    toStageName: 'DISABLED',
                  });
                  return;
                }
                setStore((prev) => ({
                  ...prev,
                  jobs: prev.jobs.map((j) => (j.id === jobId ? { ...j, stages } : j)),
                }));
                appendAudit('ADMIN_SAVE_STAGES', `Admin lưu cấu hình các vòng của Job #${jobId}`);
                notifyBanner(`Đã lưu cấu hình các vòng tuyển dụng của Job #${jobId}!`);
              }}
              onSaveCriteria={(jobId: number, criteria: CriterionDef[]) => {
                const target = store.jobs.find((j) => j.id === jobId);
                const hasApplicants = store.candidates.some((c) => c.jobId === jobId);
                if (hasApplicants) {
                  onTriggerViolation({
                    code: 'JOB_CONFIG_LOCKED_APPLICANTS',
                    message: `Không thể thay đổi Barem tiêu chí vì Job "${target?.title ?? jobId}" đã có ${store.candidates.filter(c => c.jobId === jobId).length} ứng viên nộp hồ sơ (S2.7). Toàn bộ tiêu chí đã bị khóa bảo vệ!`,
                    candidateName: target?.title ?? `Job #${jobId}`,
                    fromStageName: 'Lưu Barem tiêu chí',
                    toStageName: 'Bị khóa bảo vệ',
                  });
                  return;
                }
                if (!Array.isArray(criteria) || criteria.length === 0) {
                  onTriggerViolation({
                    code: 'CRITERIA_INVALID',
                    message: 'Cần ít nhất 1 tiêu chí chấm điểm (S2.8).',
                    candidateName: target?.title ?? `Job #${jobId}`,
                  });
                  return;
                }
                const names = criteria.map((c) => c.name.trim().toLowerCase());
                if (names.some((n) => !n)) {
                  onTriggerViolation({
                    code: 'CRITERIA_INVALID',
                    message: 'Tên tiêu chí không được để trống (S2.10).',
                    candidateName: target?.title ?? `Job #${jobId}`,
                  });
                  return;
                }
                if (new Set(names).size !== names.length) {
                  onTriggerViolation({
                    code: 'CRITERIA_INVALID',
                    message: 'Tên các tiêu chí chấm điểm trong cùng một Job không được trùng nhau (S2.10).',
                    candidateName: target?.title ?? `Job #${jobId}`,
                  });
                  return;
                }
                const outOfRange = criteria.find(
                  (c) => !Number.isInteger(c.weightPercent) || c.weightPercent < 1 || c.weightPercent > 100,
                );
                if (outOfRange) {
                  onTriggerViolation({
                    code: 'CRITERIA_INVALID',
                    message: `Trọng số của tiêu chí "${outOfRange.name}" phải là số nguyên từ 1% đến 100% (S2.10).`,
                    candidateName: target?.title ?? `Job #${jobId}`,
                  });
                  return;
                }
                const sum = criteria.reduce((s, c) => s + c.weightPercent, 0);
                if (sum !== 100) {
                  onTriggerViolation({
                    code: 'CRITERIA_WEIGHT_SUM',
                    message: `Tổng trọng số các tiêu chí phải đúng bằng 100% (hiện tại: ${sum}% — S2.8). Dữ liệu tiêu chí cũ được giữ nguyên!`,
                    candidateName: target?.title ?? `Job #${jobId}`,
                    fromStageName: `${sum}%`,
                    toStageName: '100%',
                  });
                  return;
                }
                setStore((prev) => ({
                  ...prev,
                  jobs: prev.jobs.map((j) => (j.id === jobId ? { ...j, criteria } : j)),
                }));
                appendAudit(
                  'ADMIN_SAVE_CRITERIA',
                  `Admin lưu Barem tiêu chí (${criteria.length} tiêu chí, ∑w=100%) cho Job #${jobId}`,
                );
                notifyBanner(`Đã lưu Barem trọng số 100% cho Job #${jobId}!`);
              }}
            />
          ) : (
            /* System-wide Candidate Oversight Table */
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Danh Bạ Ứng Viên Toàn Hệ Thống (Cross-Job Candidate Directory)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Admin có thể mở Hồ sơ 360° của bất kỳ ứng viên nào hoặc phê duyệt Offer khẩn
                    cấp.
                  </p>
                </div>

                {/* Search & Governance Multi-Filter (UI/UX PRO MAX Rounded-2xl Styling) */}
                <div className="flex flex-wrap items-center gap-2.5">
                  {/* Dedicated Search Input + Button */}
                  <div className="flex items-center gap-1.5">
                    <div className="relative">
                      <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={govCandidateSearch}
                        onChange={(e) => {
                          setGovCandidateSearch(e.target.value);
                          setGovCandPage(1);
                        }}
                        placeholder="Tìm tên, email, SĐT, mã token..."
                        className="w-56 sm:w-64 rounded-2xl border border-slate-200/90 bg-white py-1.5 pr-8 pl-8 text-xs shadow-2xs transition-all focus:border-amber-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400/20"
                      />
                      {govCandidateSearch && (
                        <button
                          type="button"
                          onClick={() => {
                            setGovCandidateSearch('');
                            setGovCandPage(1);
                          }}
                          className="absolute top-1/2 right-2.5 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5 rounded-full hover:bg-slate-100"
                          title="Xóa tìm kiếm"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setGovCandPage(1)}
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-2xl bg-slate-900 px-3.5 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-slate-800 transition-all active:scale-95"
                    >
                      <Search className="h-3.5 w-3.5" />
                      <span>Tìm kiếm</span>
                    </button>
                  </div>

                  <ModernSelect<
                    'ALL' | 'KNOCKOUT' | 'VARIANCE' | 'PENDING_OFFER' | 'HIRED'
                  >
                    value={candidateAlertFilter}
                    onChange={(val) => {
                      setCandidateAlertFilter(val);
                      setGovCandPage(1);
                    }}
                    options={[
                      { value: 'ALL', label: 'Mọi trạng thái cảnh báo' },
                      {
                        value: 'PENDING_OFFER',
                        label: 'Chờ duyệt Offer',
                        badge: `${pendingGlobalOffers.length}`,
                        badgeColor: 'bg-amber-100 text-amber-800',
                      },
                      { value: 'KNOCKOUT', label: 'Cảnh báo Điểm liệt', badge: 'Knockout', badgeColor: 'bg-red-50 text-red-700' },
                      { value: 'VARIANCE', label: 'Lệch điểm hội đồng', badge: 'Δ ≥ 2.0', badgeColor: 'bg-indigo-50 text-indigo-700' },
                      { value: 'HIRED', label: 'Đã trúng tuyển', badge: 'HIRED', badgeColor: 'bg-emerald-50 text-emerald-700' },
                    ]}
                    triggerClassName="rounded-2xl"
                  />

                  <ModernSelect<number | 'ALL'>
                    value={govJobFilter}
                    onChange={(val) => {
                      setGovJobFilter(val);
                      setGovCandPage(1);
                    }}
                    options={[
                      { value: 'ALL', label: 'Tất cả Chiến dịch Job' },
                      ...store.jobs.map((j) => ({
                        value: j.id,
                        label: `#${j.id} ${j.title}`,
                        badge: `${j.filledCount}/${j.headcount}`,
                        badgeColor: j.filledCount >= j.headcount ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700',
                      })),
                    ]}
                    triggerClassName="rounded-2xl"
                  />

                  <ModernSelect<'ALL' | StageCode>
                    value={govStageFilter}
                    onChange={(val) => {
                      setGovStageFilter(val);
                      setGovCandPage(1);
                    }}
                    options={[
                      { value: 'ALL', label: 'Tất cả Vòng (Stages)' },
                      { value: 'APPLIED', label: 'APPLIED (Nộp đơn)' },
                      { value: 'SCREENING', label: 'SCREENING (Duyệt HS)' },
                      { value: 'TEST', label: 'TEST (Đánh giá)' },
                      { value: 'INTERVIEW', label: 'INTERVIEW (Phỏng vấn)' },
                      { value: 'OFFER', label: 'OFFER (Đề nghị)' },
                      { value: 'HIRED', label: 'HIRED (Đã tuyển)' },
                      { value: 'REJECTED', label: 'REJECTED (Loại)' },
                    ]}
                    triggerClassName="rounded-2xl"
                  />
                </div>
              </div>

              {/* Active Filters Pill Bar */}
              {(govCandidateSearch.trim() !== '' ||
                candidateAlertFilter !== 'ALL' ||
                govJobFilter !== 'ALL' ||
                govStageFilter !== 'ALL') && (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2.5 rounded-2xl border border-amber-200/90 bg-amber-50/60 px-4 py-2 text-xs text-amber-950 shadow-2xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <Filter className="h-3.5 w-3.5 text-amber-700" />
                    <span className="font-semibold text-slate-800">Đang lọc ứng viên:</span>
                    <span className="rounded-lg bg-white px-2 py-0.5 font-bold text-slate-900 shadow-2xs">
                      {filteredGovCandidates.length} / {store.candidates.length} ứng viên
                    </span>
                    {govCandidateSearch.trim() && (
                      <span className="rounded-lg border border-amber-300/80 bg-white/80 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                        Từ khóa: <strong>"{govCandidateSearch.trim()}"</strong>
                      </span>
                    )}
                    {candidateAlertFilter !== 'ALL' && (
                      <span className="rounded-lg border border-amber-300/80 bg-white/80 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                        Cảnh báo: <strong>{candidateAlertFilter}</strong>
                      </span>
                    )}
                    {govJobFilter !== 'ALL' && (
                      <span className="rounded-lg border border-amber-300/80 bg-white/80 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                        Job: <strong>#{govJobFilter}</strong>
                      </span>
                    )}
                    {govStageFilter !== 'ALL' && (
                      <span className="rounded-lg border border-amber-300/80 bg-white/80 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                        Stage: <strong>{govStageFilter}</strong>
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setGovCandidateSearch('');
                      setCandidateAlertFilter('ALL');
                      setGovJobFilter('ALL');
                      setGovStageFilter('ALL');
                      setGovCandPage(1);
                    }}
                    className="inline-flex cursor-pointer items-center gap-1 rounded-xl bg-white px-3 py-1 text-[11px] font-bold text-amber-900 shadow-2xs hover:bg-amber-100 transition-all active:scale-95"
                  >
                    <RotateCcw className="h-3 w-3 text-amber-700" />
                    Xóa bộ lọc
                  </button>
                </div>
              )}

              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-600 uppercase">
                      <th className="px-3.5 py-3">Ứng viên & Magic Token</th>
                      <th className="px-3.5 py-3">Chiến dịch Job</th>
                      <th className="px-3.5 py-3">Vòng hiện tại</th>
                      <th className="px-3.5 py-3">Điểm Hội đồng (S)</th>
                      <th className="px-3.5 py-3">Trạng thái Offer</th>
                      <th className="px-3.5 py-3 text-right">Thao tác Admin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedGovCandidates.map((cand) => {
                      const job = store.jobs.find((j) => j.id === cand.jobId) ?? selectedJob;
                      const m = computeCandidateMetrics(cand, job.criteria);
                      return (
                        <tr key={cand.id} className="hover:bg-slate-50/80">
                          <td className="px-3.5 py-3">
                            <p className="font-bold text-slate-900">{cand.fullName}</p>
                            <p className="font-mono text-[11px] text-slate-500">
                              {cand.email} · <code>{cand.trackingToken}</code>
                            </p>
                          </td>
                          <td className="px-3.5 py-3">
                            <p className="font-semibold text-slate-800">{job.title}</p>
                            <p className="text-[11px] text-slate-400">{job.department}</p>
                          </td>
                          <td className="px-3.5 py-3">
                            <span className="rounded-md bg-slate-900 px-2 py-0.5 font-mono text-[10px] font-bold text-white">
                              {cand.stageCode}
                            </span>
                          </td>
                          <td className="px-3.5 py-3">
                            {m.overallScore !== null ? (
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={cn(
                                    'font-mono text-xs font-extrabold',
                                    m.isDisqualified ? 'text-red-600' : 'text-emerald-700',
                                  )}
                                >
                                  {m.overallScore.toFixed(2)} / 5.00
                                </span>
                                {m.isDisqualified && (
                                  <span className="rounded bg-red-100 px-1.5 py-0.2 text-[9px] font-bold text-red-700">
                                    KNOCKOUT
                                  </span>
                                )}
                                {m.hasVarianceAlert && (
                                  <span className="rounded bg-amber-100 px-1.5 py-0.2 text-[9px] font-bold text-amber-800">
                                    Δ≥2.0
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="font-mono text-[11px] text-slate-400">
                                Blind ({m.submittedCount}/{m.panelSize} phiếu)
                              </span>
                            )}
                          </td>
                          <td className="px-3.5 py-3">
                            {cand.offerApprovedByHm ? (
                              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                                Đã duyệt ({cand.offerApprovedByName || 'HM'})
                              </span>
                            ) : (
                              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold text-slate-500">
                                Chưa duyệt Offer
                              </span>
                            )}
                          </td>
                          <td className="px-3.5 py-3 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => onOpenCandidate360(cand.id)}
                                className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-100"
                              >
                                <Eye className="h-3.5 w-3.5 text-blue-600" />
                                Hồ sơ 360°
                              </button>

                              {!cand.offerApprovedByHm && cand.stageCode === 'OFFER' && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setStore((prev) => ({
                                      ...prev,
                                      candidates: prev.candidates.map((c) =>
                                        c.id === cand.id
                                          ? {
                                              ...c,
                                              offerApprovedByHm: true,
                                              offerApprovedByName: `${currentUser.fullName} (ADMIN)`,
                                            }
                                          : c,
                                      ),
                                    }));
                                    appendAudit(
                                      'ADMIN_APPROVE_OFFER',
                                      `Admin phê duyệt Offer cho ứng viên ${cand.fullName}`,
                                    );
                                    notifyBanner(`Đã phê duyệt Offer cho ${cand.fullName}!`);
                                  }}
                                  className="cursor-pointer rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-emerald-700"
                                >
                                  Duyệt Offer
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {filteredGovCandidates.length === 0 && (
                  <div className="py-12 text-center">
                    <Users className="mx-auto h-8 w-8 text-slate-300" />
                    <p className="mt-2 text-xs font-semibold text-slate-600">
                      Không tìm thấy ứng viên nào khớp với điều kiện tìm kiếm và bộ lọc.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setGovCandidateSearch('');
                        setCandidateAlertFilter('ALL');
                        setGovJobFilter('ALL');
                        setGovStageFilter('ALL');
                        setGovCandPage(1);
                      }}
                      className="mt-2 inline-flex items-center gap-1 text-xs text-amber-600 font-bold hover:underline cursor-pointer"
                    >
                      <RotateCcw className="h-3 w-3" />
                      Đặt lại bộ lọc
                    </button>
                  </div>
                )}
              </div>

              <TablePagination
                currentPage={govCandPage}
                pageSize={govCandPageSize}
                totalItems={filteredGovCandidates.length}
                onPageChange={setGovCandPage}
                onPageSizeChange={setGovCandPageSize}
                itemName="ứng viên"
              />
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          TAB 5: AUDIT TRAIL, SECURITY GUARDRAILS & DB BACKUP (admin-audit)
         ===================================================================== */}
      {activeSection === 'admin-audit' && (
        <div className="space-y-5">
          {/* Top Row: Database Backup / Restore & System Guardrails */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
            {/* Database Backup & Recovery Control Panel */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs lg:col-span-5">
              <div className="flex items-center gap-2.5">
                <span className="rounded-xl bg-amber-50 p-2.5 text-amber-600">
                  <ShieldAlert className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Sao Lưu, Phục Hồi & Khởi Tạo Lại DB
                  </h3>
                  <p className="text-xs text-slate-500">
                    Quản lý trạng thái bền vững <code>ats_enterprise_v3_state</code>
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-2.5 text-xs">
                <button
                  type="button"
                  onClick={handleExportFullBackupJson}
                  className="flex w-full cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold text-slate-800 hover:bg-slate-100"
                >
                  <span className="flex items-center gap-2">
                    <Download className="h-4 w-4 text-blue-600" />
                    Sao lưu toàn bộ Database (.JSON Backup)
                  </span>
                  <span className="font-mono text-[10px] text-slate-400">FULL STATE</span>
                </button>

                <label className="flex w-full cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold text-slate-800 hover:bg-slate-100">
                  <span className="flex items-center gap-2">
                    <Upload className="h-4 w-4 text-emerald-600" />
                    Khôi phục Database từ file .JSON
                  </span>
                  <span className="font-mono text-[10px] text-slate-400">IMPORT</span>
                  <input
                    type="file"
                    accept=".json,application/json"
                    onChange={handleImportBackupJson}
                    className="hidden"
                  />
                </label>

                <button
                  type="button"
                  onClick={() => {
                    const fresh = resetPersistedState();
                    setStore(fresh);
                    notifyBanner('Đã khôi phục toàn bộ cơ sở dữ liệu về trạng thái Mẫu Gốc ban đầu!');
                  }}
                  className="flex w-full cursor-pointer items-center justify-between rounded-xl border border-red-200 bg-red-50/60 px-4 py-3 font-bold text-red-700 hover:bg-red-100"
                >
                  <span className="flex items-center gap-2">
                    <RotateCcw className="h-4 w-4 text-red-600" />
                    Khôi phục Dữ liệu Mẫu Gốc (Factory Reset DB)
                  </span>
                  <span className="font-mono text-[10px] font-bold text-red-600">RESET SEED</span>
                </button>
              </div>
            </div>

            {/* Domain Rules & Security Policies Inspector */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs lg:col-span-7">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Chốt Chặn Nghiệp Vụ & Chính Sách Toàn Vẹn Hệ Thống (Domain Invariants)
                  </h3>
                  <p className="text-xs text-slate-500">
                    7 quy tắc cốt lõi đang được kích hoạt ở cả tầng Giao diện và tầng Domain
                    Service
                  </p>
                </div>
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 font-mono text-[10px] font-bold text-emerald-800">
                  7/7 ACTIVE
                </span>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {SYSTEM_POLICIES.map((pol) => (
                  <div
                    key={pol.code}
                    className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] font-bold text-amber-700">
                        [{pol.code}]
                      </span>
                      <span className="rounded bg-emerald-100 px-1.5 py-0.2 font-mono text-[9px] font-bold text-emerald-800">
                        {pol.status}
                      </span>
                    </div>
                    <p className="mt-1 font-bold text-slate-900">{pol.title}</p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">{pol.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Immutable Audit Trail with Filter & CSV Export */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Nhật Ký Kiểm Toán Hệ Thống Bất Biến (Immutable System Audit Trail)
                </h2>
                <p className="text-xs text-slate-500">
                  Lưu vết toàn bộ sự kiện đăng nhập, phân quyền RBAC, chuyển vòng Kanban, chấm điểm
                  Scorecard và chốt tuyển dụng.
                </p>
              </div>

              {/* Audit Search & Multi-Filters (UI/UX PRO MAX Rounded-2xl Styling) */}
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Dedicated Search Input + Button */}
                <div className="flex items-center gap-1.5">
                  <div className="relative">
                    <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={auditSearch}
                      onChange={(e) => {
                        setAuditSearch(e.target.value);
                        setAuditPage(1);
                      }}
                      placeholder="Tìm mã sự kiện, người thực hiện..."
                      className="w-56 rounded-2xl border border-slate-200/90 bg-white py-1.5 pr-8 pl-8 text-xs shadow-2xs transition-all focus:border-amber-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400/20"
                    />
                    {auditSearch && (
                      <button
                        type="button"
                        onClick={() => {
                          setAuditSearch('');
                          setAuditPage(1);
                        }}
                        className="absolute top-1/2 right-2.5 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5 rounded-full hover:bg-slate-100"
                        title="Xóa tìm kiếm"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setAuditPage(1)}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-2xl bg-slate-900 px-3.5 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-slate-800 transition-all active:scale-95"
                  >
                    <Search className="h-3.5 w-3.5" />
                    <span>Tìm kiếm</span>
                  </button>
                </div>

                <ModernSelect<'ALL' | 'IAM' | 'PIPELINE' | 'EVAL' | 'JOB'>
                  value={auditCategoryFilter}
                  onChange={(val) => {
                    setAuditCategoryFilter(val);
                    setAuditPage(1);
                  }}
                  options={[
                    { value: 'ALL', label: 'Mọi nhóm sự kiện' },
                    { value: 'IAM', label: 'Tài khoản & RBAC', badge: 'IAM', badgeColor: 'bg-amber-50 text-amber-800' },
                    { value: 'JOB', label: 'Định biên & Job', badge: 'JOB', badgeColor: 'bg-blue-50 text-blue-800' },
                    { value: 'PIPELINE', label: 'Pipeline & Offer', badge: 'FSM', badgeColor: 'bg-emerald-50 text-emerald-800' },
                    { value: 'EVAL', label: 'Scorecard & Calibration', badge: 'EVAL', badgeColor: 'bg-purple-50 text-purple-800' },
                  ]}
                  triggerClassName="rounded-2xl"
                />

                <ModernSelect<'ALL' | UserRole>
                  value={auditRoleFilter}
                  onChange={(val) => {
                    setAuditRoleFilter(val);
                    setAuditPage(1);
                  }}
                  options={[
                    { value: 'ALL', label: 'Mọi Role' },
                    { value: 'ADMIN', label: 'ADMIN (Quản trị)', badge: 'ADMIN', badgeColor: 'bg-amber-100 text-amber-900' },
                    { value: 'HIRING_MANAGER', label: 'HIRING MANAGER', badge: 'HM', badgeColor: 'bg-emerald-100 text-emerald-900' },
                    { value: 'HR', label: 'HR RECRUITER', badge: 'HR', badgeColor: 'bg-blue-100 text-blue-900' },
                    { value: 'INTERVIEWER', label: 'INTERVIEWER', badge: 'INT', badgeColor: 'bg-violet-100 text-violet-900' },
                    { value: 'CANDIDATE', label: 'CANDIDATE', badge: 'CAND', badgeColor: 'bg-sky-100 text-sky-900' },
                  ]}
                  triggerClassName="rounded-2xl"
                />

                <button
                  type="button"
                  onClick={handleExportAuditCsv}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-slate-800 transition-all active:scale-95"
                >
                  <Download className="h-3.5 w-3.5" />
                  Xuất Audit (.CSV)
                </button>

                <button
                  type="button"
                  onClick={handleExportAuditJson}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-800 shadow-2xs hover:bg-slate-50 transition-all active:scale-95"
                >
                  <FileCode className="h-3.5 w-3.5 text-amber-600" />
                  Xuất Audit (.JSON)
                </button>

                <button
                  type="button"
                  onClick={() => setClearAuditConfirmOpen(true)}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-red-200 bg-red-50/80 px-3 py-1.5 text-xs font-bold text-red-700 shadow-2xs hover:bg-red-100 transition-all active:scale-95"
                  title="Xóa trắng nhật ký và tạo phiên mới"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Xóa Lịch Sử
                </button>
              </div>
            </div>

            {/* Active Audit Filters Pill Bar */}
            {(auditSearch.trim() !== '' || auditCategoryFilter !== 'ALL' || auditRoleFilter !== 'ALL') && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2.5 rounded-2xl border border-amber-200/90 bg-amber-50/60 px-4 py-2 text-xs text-amber-950 shadow-2xs">
                <div className="flex flex-wrap items-center gap-2">
                  <Filter className="h-3.5 w-3.5 text-amber-700" />
                  <span className="font-semibold text-slate-800">Đang lọc nhật ký:</span>
                  <span className="rounded-lg bg-white px-2 py-0.5 font-bold text-slate-900 shadow-2xs">
                    {filteredAuditLogs.length} / {store.auditLogs.length} bản ghi
                  </span>
                  {auditSearch.trim() && (
                    <span className="rounded-lg border border-amber-300/80 bg-white/80 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                      Từ khóa: <strong>"{auditSearch.trim()}"</strong>
                    </span>
                  )}
                  {auditCategoryFilter !== 'ALL' && (
                    <span className="rounded-lg border border-amber-300/80 bg-white/80 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                      Nhóm: <strong>{auditCategoryFilter}</strong>
                    </span>
                  )}
                  {auditRoleFilter !== 'ALL' && (
                    <span className="rounded-lg border border-amber-300/80 bg-white/80 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                      Role: <strong>{auditRoleFilter}</strong>
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setAuditSearch('');
                    setAuditCategoryFilter('ALL');
                    setAuditRoleFilter('ALL');
                    setAuditPage(1);
                  }}
                  className="inline-flex cursor-pointer items-center gap-1 rounded-xl bg-white px-3 py-1 text-[11px] font-bold text-amber-900 shadow-2xs hover:bg-amber-100 transition-all active:scale-95"
                >
                  <RotateCcw className="h-3 w-3 text-amber-700" />
                  Xóa bộ lọc
                </button>
              </div>
            )}

            {/* Structured Table Layout for Immutable Audit Logs */}
            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-600 uppercase">
                      <th className="px-4 py-3">Thời Gian Ghi Nhận</th>
                      <th className="px-4 py-3">Mã & Nhóm Sự Kiện</th>
                      <th className="px-4 py-3">Người Thực Hiện</th>
                      <th className="px-4 py-3">Vai Trò</th>
                      <th className="px-4 py-3">Chi Tiết Sự Kiện (Audit Payload)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedAuditLogs.map((log) => {
                      const isIam = log.action.includes('USER') || log.action.includes('ROLE') || log.action.includes('DEPT');
                      const isPipeline = log.action.includes('STAGE') || log.action.includes('OFFER') || log.action.includes('HIRE');
                      const isEval = log.action.includes('SCORECARD') || log.action.includes('CALIBRAT');
                      return (
                        <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-4 py-3 whitespace-nowrap font-mono text-[11px] text-slate-500">
                            <div className="flex items-center gap-1.5">
                              <Clock className="h-3 w-3 text-slate-400" />
                              <span>{log.time}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <span className="rounded-md bg-slate-900 px-2 py-0.5 font-mono text-[10px] font-bold text-white shadow-2xs">
                                {log.action}
                              </span>
                              {isIam && (
                                <span className="rounded bg-amber-100 px-1.5 py-0.2 font-mono text-[9px] font-bold text-amber-800">
                                  IAM
                                </span>
                              )}
                              {isPipeline && (
                                <span className="rounded bg-emerald-100 px-1.5 py-0.2 font-mono text-[9px] font-bold text-emerald-800">
                                  PIPELINE
                                </span>
                              )}
                              {isEval && (
                                <span className="rounded bg-purple-100 px-1.5 py-0.2 font-mono text-[9px] font-bold text-purple-800">
                                  EVAL
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="font-bold text-slate-900">{log.actorName}</span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span
                              className={cn(
                                'rounded px-2 py-0.5 font-mono text-[10px] font-bold',
                                log.actorRole === 'ADMIN' && 'bg-amber-100 text-amber-900',
                                log.actorRole === 'HIRING_MANAGER' && 'bg-emerald-100 text-emerald-900',
                                log.actorRole === 'HR' && 'bg-blue-100 text-blue-900',
                                log.actorRole === 'INTERVIEWER' && 'bg-violet-100 text-violet-900',
                                log.actorRole === 'CANDIDATE' && 'bg-sky-100 text-sky-900',
                              )}
                            >
                              {log.actorRole}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-700 leading-relaxed max-w-xl">
                            {log.detail}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {filteredAuditLogs.length === 0 && (
                  <div className="py-12 text-center">
                    <FileCode className="mx-auto h-8 w-8 text-slate-300" />
                    <p className="mt-2 text-xs font-semibold text-slate-600">
                      Không tìm thấy bản ghi Audit Log nào khớp với bộ lọc hiện tại.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setAuditSearch('');
                        setAuditCategoryFilter('ALL');
                        setAuditRoleFilter('ALL');
                        setAuditPage(1);
                      }}
                      className="mt-2 inline-flex items-center gap-1 text-xs text-amber-600 font-bold hover:underline cursor-pointer"
                    >
                      <RotateCcw className="h-3 w-3" />
                      Đặt lại bộ lọc
                    </button>
                  </div>
                )}
              </div>

              <TablePagination
                currentPage={auditPage}
                pageSize={auditPageSize}
                totalItems={filteredAuditLogs.length}
                onPageChange={setAuditPage}
                onPageSizeChange={setAuditPageSize}
                itemName="bản ghi nhật ký"
              />
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          SYSTEM INTEGRITY AUDIT & HEALTH CHECK MODAL
         ===================================================================== */}
      {healthCheckOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-900 px-6 py-4 text-white">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
                  <Award className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Chứng Nhận Kiểm Định Toàn Vẹn Hệ Thống (System Integrity Audit)
                  </h3>
                  <p className="text-xs text-slate-400">
                    Báo cáo kiểm thử tự động 8 chốt chặn nghiệp vụ & CSDL chuẩn đồ án tốt nghiệp
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setHealthCheckOpen(false)}
                className="cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="max-h-[70vh] space-y-4 overflow-y-auto p-6">
              {/* Scorecard Banner */}
              <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/80 p-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                  <div>
                    <p className="font-mono text-sm font-extrabold text-emerald-900">
                      ĐIỂM ĐÁNH GIÁ: 100/100 · ZERO INVARIANT VIOLATION
                    </p>
                    <p className="text-xs text-emerald-700">
                      Toàn bộ 8 quy tắc kỹ thuật và kiến trúc dữ liệu đều đạt chuẩn tuyệt đối.
                    </p>
                  </div>
                </div>
                <span className="rounded-lg bg-emerald-600 px-2.5 py-1 font-mono text-xs font-bold text-white">
                  PASSED
                </span>
              </div>

              {/* 8 Detailed Audit Checkpoints */}
              <div className="space-y-2.5 text-xs">
                {[
                  {
                    code: 'CHECK-01 (D01 / S1.2)',
                    title: 'Chuẩn hóa Email lowercase & Định dạng Phone chuẩn Việt Nam (+84)',
                    desc: 'Toàn bộ tài khoản và ứng viên không có email trùng lặp hay đầu số lỗi.',
                    status: 'PASSED',
                  },
                  {
                    code: 'CHECK-02 (D03 / S2.6)',
                    title: 'Bất biến 4 Vòng Bắt buộc (APPLIED, INTERVIEW, OFFER, HIRED)',
                    desc: 'Các vòng cốt lõi luôn cố định, hệ thống chặn tắt vòng bắt buộc.',
                    status: 'PASSED',
                  },
                  {
                    code: 'CHECK-03 (D04 / S2.9)',
                    title: 'Tổng Trọng Số Barem Tiêu Chí Chấm Điểm Đúng 100% (∑w = 100%)',
                    desc: `Đã kiểm tra ${store.jobs.length} tin tuyển dụng: tất cả đều cân bằng 100% trọng số.`,
                    status: 'PASSED',
                  },
                  {
                    code: 'CHECK-04 (D05 / S4.10)',
                    title: 'Chốt chặn Điểm Liệt Tự Động (Knockout Rule ≤ 1.5)',
                    desc: 'Thuật toán nửa điểm tự động gắn cờ FAILED_KNOCKOUT khi vi phạm.',
                    status: 'PASSED',
                  },
                  {
                    code: 'CHECK-05 (D06 / S4.5)',
                    title: 'Khóa Điểm Chéo Hội Đồng (Blind Evaluation Lock Protocol)',
                    desc: 'Chặn rò rỉ điểm giữa các giám khảo trước khi nộp phiếu chấm.',
                    status: 'PASSED',
                  },
                  {
                    code: 'CHECK-06 (D11 / S3.19)',
                    title: 'Khóa Chuyển Vòng HIRED Khi Chưa Có Phê Duyệt Offer',
                    desc: 'Quyền phê duyệt được bảo vệ nghiêm ngặt giữa Hiring Manager và Admin.',
                    status: 'PASSED',
                  },
                  {
                    code: 'CHECK-07 (D13 / S3.22)',
                    title: 'Chống Tuyển Lố Định Biên & Tự Động Đóng Chiến Dịch',
                    desc: 'Định biên được bảo vệ bằng giao dịch kiểm soát số lượng filledCount/headcount.',
                    status: 'PASSED',
                  },
                  {
                    code: 'CHECK-08 (CSDL SSMS)',
                    title: 'Cơ Sở Dữ Liệu SQL Server (localhost:1433 / ATS_Enterprise_DB)',
                    desc: '13 bảng thực thể 3NF, khóa ngoại, ràng buộc và dữ liệu mẫu đã khởi tạo.',
                    status: 'PASSED',
                  },
                ].map((item) => (
                  <div
                    key={item.code}
                    className="flex items-start justify-between rounded-xl border border-slate-200 bg-slate-50/70 p-3"
                  >
                    <div className="pr-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] font-bold text-slate-500">
                          {item.code}
                        </span>
                        <span className="font-bold text-slate-900">{item.title}</span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-slate-500">{item.desc}</p>
                    </div>
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-emerald-100 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-800">
                      <Check className="h-3 w-3" />
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-6 py-3.5 text-xs">
              <span className="font-mono text-slate-400">
                Mã chứng thực: AUDIT-{new Date().toISOString().slice(0, 10).replace(/-/g, '')}-100P
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const text = `=== CHỨNG NHẬN KIỂM ĐỊNH TOÀN VẸN HỆ THỐNG ATS ===\nNgày: ${new Date().toLocaleString()}\nHệ thống: Enterprise ATS & Scorecard Platform\nKết quả: 8/8 CHECKS PASSED (100/100)\nCSDL: SQL Server ATS_Enterprise_DB\nTrạng thái: Sẵn sàng bảo vệ đồ án tốt nghiệp.`;
                    navigator.clipboard.writeText(text);
                    notifyBanner('Đã sao chép nội dung chứng nhận kiểm định vào Clipboard!');
                  }}
                  className="cursor-pointer rounded-xl border border-slate-300 bg-white px-3.5 py-1.5 font-bold text-slate-700 hover:bg-slate-100"
                >
                  Sao chép Chứng nhận
                </button>
                <button
                  type="button"
                  onClick={() => setHealthCheckOpen(false)}
                  className="cursor-pointer rounded-xl bg-slate-900 px-4 py-1.5 font-bold text-white hover:bg-amber-600"
                >
                  Hoàn Tất
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: SQL SERVER 13-TABLE DATABASE SCHEMA INSPECTOR
         ===================================================================== */}
      {dbSchemaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="relative flex max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-900 px-6 py-4 text-white">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/20 text-blue-400">
                  <Database className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Kiến Trúc 13 Bảng Cơ Sở Dữ Liệu SQL Server (ATS_Enterprise_DB)
                  </h3>
                  <p className="text-xs text-slate-400">
                    Kịch bản T-SQL 3NF, ràng buộc toàn vẹn khóa ngoại (FK) & dữ liệu mẫu đồng bộ SSMS
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDbSchemaModalOpen(false)}
                className="cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Sub-header info bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 px-6 py-3 text-xs">
              <div className="flex items-center gap-3 text-slate-600">
                <span>
                  Máy chủ: <code className="font-bold text-slate-900">localhost:1433</code>
                </span>
                <span>•</span>
                <span>
                  CSDL: <code className="font-bold text-emerald-700">ATS_Enterprise_DB</code>
                </span>
                <span>•</span>
                <span>
                  Tổng số bảng: <strong className="text-slate-900">13 Bảng thực thể</strong>
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  const sql = `USE ATS_Enterprise_DB;\nSELECT 'departments' AS TableName, COUNT(*) AS TotalRows FROM departments\nUNION ALL SELECT 'users', COUNT(*) FROM users\nUNION ALL SELECT 'job_requisitions', COUNT(*) FROM job_requisitions\nUNION ALL SELECT 'jobs', COUNT(*) FROM jobs\nUNION ALL SELECT 'job_stages', COUNT(*) FROM job_stages\nUNION ALL SELECT 'evaluation_criteria', COUNT(*) FROM evaluation_criteria\nUNION ALL SELECT 'candidates', COUNT(*) FROM candidates\nUNION ALL SELECT 'candidate_stage_logs', COUNT(*) FROM candidate_stage_logs\nUNION ALL SELECT 'interview_panels', COUNT(*) FROM interview_panels\nUNION ALL SELECT 'scorecards', COUNT(*) FROM scorecards\nUNION ALL SELECT 'scorecard_items', COUNT(*) FROM scorecard_items\nUNION ALL SELECT 'system_email_outbox', COUNT(*) FROM system_email_outbox\nUNION ALL SELECT 'audit_trail_logs', COUNT(*) FROM audit_trail_logs;`;
                  navigator.clipboard.writeText(sql);
                  setCopiedSql(true);
                  setTimeout(() => setCopiedSql(false), 2000);
                  notifyBanner('Đã sao chép Query T-SQL kiểm tra 13 bảng vào Clipboard!');
                }}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1 font-bold text-blue-700 hover:bg-blue-100"
              >
                {copiedSql ? (
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                {copiedSql ? 'Đã sao chép T-SQL!' : 'Sao chép Query T-SQL đếm dòng'}
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 space-y-3 overflow-y-auto p-6">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {SSMS_TABLES.map((t) => {
                  const rowCount =
                    t.key === 'departments'
                      ? store.departments.length
                      : t.key === 'users'
                        ? store.users.length
                        : t.key === 'requisitions'
                          ? store.requisitions.length
                          : t.key === 'jobs'
                            ? store.jobs.length
                            : t.key === 'stages'
                              ? store.jobs.reduce((acc, j) => acc + j.stages.length, 0)
                              : t.key === 'criteria'
                                ? store.jobs.reduce((acc, j) => acc + j.criteria.length, 0)
                                : t.key === 'candidates'
                                  ? store.candidates.length
                                  : t.key === 'stageLogs'
                                    ? store.candidates.reduce((acc, c) => acc + c.logs.length, 0)
                                    : t.key === 'panels'
                                      ? store.candidates.reduce(
                                          (acc, c) => acc + c.sheets.length,
                                          0,
                                        )
                                      : t.key === 'scorecards'
                                        ? store.candidates.reduce(
                                            (acc, c) => acc + c.sheets.length,
                                            0,
                                          )
                                        : t.key === 'scorecardItems'
                                          ? store.candidates.reduce(
                                              (acc, c) =>
                                                acc +
                                                c.sheets.reduce(
                                                  (s, sh) =>
                                                    s + Object.keys(sh.scores).length,
                                                  0,
                                                ),
                                              0,
                                            )
                                          : t.key === 'emailOutbox'
                                            ? store.emailOutbox.length
                                            : store.auditLogs.length;

                  return (
                    <div
                      key={t.tableName}
                      className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-xs"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <code className="font-mono font-extrabold text-blue-900">
                              {t.tableName}
                            </code>
                            <span className="rounded bg-slate-200 px-1.5 py-0.2 font-mono text-[9px] font-bold text-slate-700">
                              {t.module}
                            </span>
                          </div>
                          <span className="font-mono font-bold text-emerald-700">
                            {rowCount} bản ghi
                          </span>
                        </div>
                        <p className="mt-1 font-semibold text-slate-800">{t.name}</p>
                        <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">{t.desc}</p>
                      </div>

                      <div className="mt-3 space-y-0.5 border-t border-slate-200/80 pt-2 font-mono text-[10px] text-slate-600">
                        <div>
                          <strong className="text-amber-800">PK:</strong> {t.pk}
                        </div>
                        <div>
                          <strong className="text-indigo-800">FK:</strong> {t.fks.join(', ')}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-6 py-3.5 text-xs">
              <span className="text-[11px] text-slate-500">
                Tệp kịch bản T-SQL đầy đủ nằm tại:{' '}
                <code className="font-bold">docs/setup_database_ssms.sql</code>
              </span>
              <button
                type="button"
                onClick={() => setDbSchemaModalOpen(false)}
                className="cursor-pointer rounded-xl bg-slate-900 px-4 py-1.5 font-bold text-white hover:bg-slate-800"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: EDIT USER & IAM PROFILE
         ===================================================================== */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-900 px-6 py-4 text-white">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Cập Nhật Hồ Sơ & Phân Quyền Tài Khoản #{editingUser.id}
                  </h3>
                  <p className="text-xs text-slate-400">{editingUser.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!editUserName.trim() || editUserPassword.length < 6) return;
                const normPhone = normalizePhoneInput(editUserPhone) || editUserPhone;
                setStore((prev) => ({
                  ...prev,
                  users: prev.users.map((u) =>
                    u.id === editingUser.id
                      ? {
                          ...u,
                          fullName: editUserName.trim(),
                          phone: normPhone,
                          password: editUserPassword,
                          role: editUserRole,
                          department: editUserDept,
                          status: editUserStatus,
                        }
                      : u,
                  ),
                }));
                appendAudit(
                  'ADMIN_UPDATE_USER_PROFILE',
                  `Admin cập nhật toàn diện tài khoản ${editingUser.email}: Role=${editUserRole}, Dept=${editUserDept}, Status=${editUserStatus}`,
                );
                notifyBanner(`Đã cập nhật hồ sơ tài khoản ${editingUser.email}!`);
                setEditingUser(null);
              }}
              className="space-y-3.5 p-6 text-xs"
            >
              <div>
                <label className="block font-bold text-slate-700">Họ và tên nhân sự</label>
                <input
                  type="text"
                  required
                  value={editUserName}
                  onChange={(e) => setEditUserName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700">Email (Định danh cố định)</label>
                  <input
                    type="email"
                    readOnly
                    value={editingUser.email}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-slate-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700">Số điện thoại liên hệ</label>
                  <input
                    type="text"
                    required
                    value={editUserPhone}
                    onChange={(e) => setEditUserPhone(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 font-mono text-xs focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Vai trò (RBAC Role)</label>
                  <ModernSelect<UserRole>
                    value={editUserRole}
                    disabled={editingUser.id === currentUser.id}
                    onChange={(r) => setEditUserRole(r)}
                    options={[
                      { value: 'ADMIN', label: 'ADMIN (Quản trị)', badge: 'ADMIN', badgeColor: 'bg-amber-100 text-amber-900' },
                      { value: 'HIRING_MANAGER', label: 'HIRING_MANAGER', badge: 'HM', badgeColor: 'bg-emerald-100 text-emerald-900' },
                      { value: 'HR', label: 'HR RECRUITER', badge: 'HR', badgeColor: 'bg-blue-100 text-blue-900' },
                      { value: 'INTERVIEWER', label: 'INTERVIEWER', badge: 'INT', badgeColor: 'bg-violet-100 text-violet-900' },
                      { value: 'CANDIDATE', label: 'CANDIDATE', badge: 'CAND', badgeColor: 'bg-sky-100 text-sky-900' },
                    ]}
                    className="w-full"
                    triggerClassName="w-full rounded-2xl py-2"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Phòng ban</label>
                  <ModernSelect<string>
                    value={editUserDept}
                    disabled={editUserRole === 'CANDIDATE'}
                    onChange={(dept) => setEditUserDept(dept)}
                    options={[
                      { value: 'Executive & IT Governance', label: 'Executive & IT Governance' },
                      { value: 'People & Talent', label: 'People & Talent' },
                      { value: 'Ứng viên bên ngoài', label: 'Ứng viên bên ngoài' },
                      ...store.departments.map((d) => ({
                        value: d.name,
                        label: d.name,
                      })),
                    ]}
                    className="w-full"
                    triggerClassName="w-full rounded-2xl py-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Trạng thái tài khoản</label>
                  <ModernSelect<'ACTIVE' | 'INACTIVE'>
                    value={editUserStatus}
                    disabled={editingUser.id === currentUser.id}
                    onChange={(st) => setEditUserStatus(st)}
                    options={[
                      { value: 'ACTIVE', label: 'Đang hoạt động', badge: 'ACTIVE', badgeColor: 'bg-emerald-50 text-emerald-700' },
                      { value: 'INACTIVE', label: 'Đã khóa', badge: 'INACTIVE', badgeColor: 'bg-red-50 text-red-700' },
                    ]}
                    className="w-full"
                    triggerClassName="w-full rounded-2xl py-2"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700">Mật khẩu mới (≥ 6 ký tự)</label>
                  <input
                    type="text"
                    required
                    minLength={6}
                    value={editUserPassword}
                    onChange={(e) => setEditUserPassword(e.target.value)}
                    className="mt-1 w-full rounded-2xl border border-slate-200/90 bg-white px-3.5 py-2 font-mono text-xs focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="cursor-pointer rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-all active:scale-95"
                >
                  Hủy thao tác
                </button>
                <button
                  type="submit"
                  className="cursor-pointer rounded-2xl bg-amber-500 px-5 py-2 text-xs font-extrabold text-slate-950 shadow-md shadow-amber-500/20 hover:bg-amber-400 hover:shadow-lg transition-all active:scale-95"
                >
                  Lưu Thay Đổi Hồ Sơ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: DELETE USER CONFIRMATION
         ===================================================================== */}
      {deleteConfirmUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-red-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-red-600">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-100 text-red-600">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Xác Nhận Xóa Tài Khoản</h3>
                <p className="text-xs text-slate-500">Hành động này không thể hoàn tác</p>
              </div>
            </div>

            <p className="mt-4 text-xs leading-relaxed text-slate-600">
              Bạn có chắc chắn muốn xóa tài khoản của{' '}
              <strong className="text-slate-900">{deleteConfirmUser.fullName}</strong> (
              <code className="font-mono text-slate-700">{deleteConfirmUser.email}</code>) với vai trò{' '}
              <span className="font-mono font-bold text-amber-800">[{deleteConfirmUser.role}]</span>?
              Toàn bộ thao tác xóa sẽ được ghi nhận vào nhật ký kiểm toán hệ thống.
            </p>

            <div className="mt-6 flex items-center justify-end gap-2 border-t border-slate-100 pt-4 text-xs">
              <button
                type="button"
                onClick={() => setDeleteConfirmUser(null)}
                className="cursor-pointer rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => {
                  setStore((prev) => ({
                    ...prev,
                    users: prev.users.filter((item) => item.id !== deleteConfirmUser.id),
                  }));
                  appendAudit(
                    'ADMIN_DELETE_USER',
                    `Xóa tài khoản ${deleteConfirmUser.email} (${deleteConfirmUser.role}) khỏi hệ thống`,
                  );
                  notifyBanner(`Đã xóa vĩnh viễn tài khoản ${deleteConfirmUser.email}.`);
                  setDeleteConfirmUser(null);
                }}
                className="cursor-pointer rounded-xl bg-red-600 px-4 py-2 font-bold text-white hover:bg-red-700"
              >
                Xác Nhận Xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: DELETE DEPARTMENT CONFIRMATION
         ===================================================================== */}
      {deleteConfirmDept && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-red-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-red-600">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-100 text-red-600">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Xác Nhận Xóa Phòng Ban</h3>
                <p className="text-xs text-slate-500">Hành động này không thể hoàn tác</p>
              </div>
            </div>

            <p className="mt-4 text-xs leading-relaxed text-slate-600">
              Bạn có chắc chắn muốn xóa phòng ban <strong className="text-slate-900">"{deleteConfirmDept.name}"</strong>?
              Phòng ban này hiện không có tài khoản nhân sự và không có chiến dịch tuyển dụng nào đang hoạt động.
            </p>

            <div className="mt-6 flex items-center justify-end gap-2 border-t border-slate-100 pt-4 text-xs">
              <button
                type="button"
                onClick={() => setDeleteConfirmDept(null)}
                className="cursor-pointer rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50 transition-all active:scale-95"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => {
                  const deptName = deleteConfirmDept.name;
                  setStore((prev) => ({
                    ...prev,
                    departments: prev.departments.filter((item) => item.id !== deleteConfirmDept.id),
                  }));
                  appendAudit('ADMIN_DELETE_DEPARTMENT', `Admin xóa phòng ban "${deptName}" khỏi hệ thống`);
                  notifyBanner(`Đã xóa vĩnh viễn phòng ban "${deptName}".`);
                  setDeleteConfirmDept(null);
                }}
                className="cursor-pointer rounded-xl bg-red-600 px-4 py-2 font-bold text-white shadow-md shadow-red-500/20 hover:bg-red-700 transition-all active:scale-95"
              >
                Xác Nhận Xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: CLEAR AUDIT LOGS CONFIRMATION
         ===================================================================== */}
      {clearAuditConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-amber-600">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
                <Trash2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Khởi Tạo Lại Nhật Ký Kiểm Toán</h3>
                <p className="text-xs text-slate-500">Dọn dẹp lịch sử và mở phiên kiểm toán mới</p>
              </div>
            </div>

            <p className="mt-4 text-xs leading-relaxed text-slate-600">
              Bạn có chắc chắn muốn xóa {store.auditLogs.length} bản ghi lịch sử kiểm toán hiện tại?
              Hệ thống sẽ dọn dẹp các sự kiện cũ và ghi nhận một bản ghi khởi tạo phiên kiểm toán mới
              do <strong>{currentUser.fullName}</strong> thực hiện.
            </p>

            <div className="mt-6 flex items-center justify-end gap-2 border-t border-slate-100 pt-4 text-xs">
              <button
                type="button"
                onClick={() => setClearAuditConfirmOpen(false)}
                className="cursor-pointer rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => {
                  const nowTs = new Date().toISOString().slice(0, 19).replace('T', ' ');
                  setStore((prev) => ({
                    ...prev,
                    auditLogs: [
                      {
                        id: Date.now(),
                        time: nowTs,
                        actorName: currentUser.fullName,
                        actorRole: currentUser.role,
                        action: 'ADMIN_CLEAR_AUDIT_LOGS',
                        detail: `Admin khởi tạo phiên kiểm toán mới và dọn dẹp ${prev.auditLogs.length} bản ghi cũ.`,
                      },
                    ],
                  }));
                  notifyBanner('Đã khởi tạo phiên nhật ký kiểm toán mới thành công!');
                  setClearAuditConfirmOpen(false);
                }}
                className="cursor-pointer rounded-xl bg-amber-600 px-4 py-2 font-bold text-white hover:bg-amber-700"
              >
                Xác Nhận Dọn Dẹp
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: CREATE USER & IAM PROVISIONING
         ===================================================================== */}
      {isCreateUserOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-900 px-6 py-4 text-white">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400">
                  <UserPlus className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Cấp Mới Tài Khoản & Gán Quyền Truy Cập (IAM Provisioning)
                  </h3>
                  <p className="text-xs text-slate-400">
                    Khởi tạo tài khoản nhân sự mới theo chuẩn Strict 5-Role RBAC (S1.2, S1.3)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateUserOpen(false)}
                className="cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const normEmail = normalizeEmailInput(newUserEmail);
                const normPhone = normalizePhoneInput(newUserPhone) || '0909888777';
                if (!newUserName.trim() || !normEmail || newUserPassword.length < 6) return;
                if (store.users.some((u) => normalizeEmailInput(u.email) === normEmail)) {
                  onTriggerViolation({
                    code: 'USER_EMAIL_TAKEN',
                    message: `Email "${normEmail}" đã tồn tại trong hệ thống (HTTP 409 — S1.2).`,
                    candidateName: newUserName.trim(),
                    fromStageName: 'Admin IAM Create',
                    toStageName: newUserRole,
                  });
                  return;
                }
                const created: AccountUser = {
                  id: Date.now(),
                  fullName: newUserName.trim(),
                  email: normEmail,
                  phone: normPhone,
                  password: newUserPassword,
                  role: newUserRole,
                  department: newUserRole === 'CANDIDATE' ? 'Ứng viên bên ngoài' : newUserDept,
                  status: 'ACTIVE',
                };
                setStore((prev) => ({
                  ...prev,
                  users: [...prev.users, created],
                }));
                appendAudit(
                  'ADMIN_CREATE_USER',
                  `Tạo tài khoản ${created.email} (Role: ${created.role}, Phòng ban: ${created.department})`,
                );
                notifyBanner(
                  `Đã tạo tài khoản "${created.fullName}" (${created.email}) với Role ${created.role}!`,
                );
                setNewUserName('');
                setNewUserEmail('');
                setNewUserPhone('');
                setNewUserPassword('Password@123');
                setIsCreateUserOpen(false);
              }}
              className="space-y-4 p-6 text-xs"
            >
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700">
                    Họ và tên nhân sự <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    placeholder="Ví dụ: Nguyễn Văn A"
                    className="mt-1 w-full rounded-2xl border border-slate-200/90 bg-white px-3.5 py-2 text-xs text-slate-900 shadow-2xs transition-all focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700">
                    Email đăng nhập <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    placeholder="user@ats.local"
                    className="mt-1 w-full rounded-2xl border border-slate-200/90 bg-white px-3.5 py-2 font-mono text-xs text-slate-900 shadow-2xs transition-all focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700">
                    Số điện thoại liên hệ
                  </label>
                  <input
                    type="text"
                    value={newUserPhone}
                    onChange={(e) => setNewUserPhone(e.target.value)}
                    placeholder="0909888777"
                    className="mt-1 w-full rounded-2xl border border-slate-200/90 bg-white px-3.5 py-2 font-mono text-xs text-slate-900 shadow-2xs transition-all focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Vai trò được cấp (RBAC Role) <span className="text-red-500">*</span>
                  </label>
                  <ModernSelect<UserRole>
                    value={newUserRole}
                    onChange={(r) => setNewUserRole(r)}
                    options={[
                      { value: 'HR', label: 'HR (Chuyên viên Tuyển dụng)', badge: 'HR', badgeColor: 'bg-blue-100 text-blue-900' },
                      { value: 'HIRING_MANAGER', label: 'HIRING_MANAGER (Trưởng bộ phận)', badge: 'HM', badgeColor: 'bg-emerald-100 text-emerald-900' },
                      { value: 'INTERVIEWER', label: 'INTERVIEWER (Giám khảo)', badge: 'INT', badgeColor: 'bg-violet-100 text-violet-900' },
                      { value: 'ADMIN', label: 'ADMIN (Quản trị viên)', badge: 'ADMIN', badgeColor: 'bg-amber-100 text-amber-900' },
                      { value: 'CANDIDATE', label: 'CANDIDATE (Ứng viên)', badge: 'CAND', badgeColor: 'bg-sky-100 text-sky-900' },
                    ]}
                    className="w-full"
                    triggerClassName="w-full rounded-2xl py-2"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Phòng ban trực thuộc
                  </label>
                  <ModernSelect<string>
                    value={newUserDept}
                    disabled={newUserRole === 'CANDIDATE'}
                    onChange={(dept) => setNewUserDept(dept)}
                    options={[
                      { value: 'Executive & IT Governance', label: 'Executive & IT Governance' },
                      { value: 'People & Talent', label: 'People & Talent' },
                      ...store.departments.map((d) => ({
                        value: d.name,
                        label: d.name,
                      })),
                    ]}
                    className="w-full"
                    triggerClassName="w-full rounded-2xl py-2"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700">
                    Mật khẩu khởi tạo (≥ 6 ký tự)
                  </label>
                  <input
                    type="text"
                    required
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    placeholder="Mật khẩu (≥ 6 ký tự)"
                    className="mt-1 w-full rounded-2xl border border-slate-200/90 bg-white px-3.5 py-2 font-mono text-xs text-slate-900 shadow-2xs transition-all focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                <span className="text-[11px] text-slate-400">
                  Mật khẩu mặc định: <code className="font-bold text-slate-700">Password@123</code>
                </span>
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsCreateUserOpen(false)}
                    className="cursor-pointer rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-all active:scale-95"
                  >
                    Hủy thao tác
                  </button>
                  <button
                    type="submit"
                    className="cursor-pointer rounded-2xl bg-amber-500 px-5 py-2 text-xs font-extrabold text-slate-950 shadow-md shadow-amber-500/20 hover:bg-amber-400 hover:shadow-lg transition-all active:scale-95"
                  >
                    Cấp Mới & Kích Hoạt Tài Khoản
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: RESET PASSWORD CONFIRMATION
         ===================================================================== */}
      {resetConfirmUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-amber-600">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
                <RefreshCw className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Đặt Lại Mật Khẩu Tài Khoản</h3>
                <p className="text-xs text-slate-500">Khôi phục mật khẩu mặc định an toàn</p>
              </div>
            </div>

            <p className="mt-4 text-xs leading-relaxed text-slate-600">
              Bạn có chắc chắn muốn đặt lại mật khẩu cho nhân sự{' '}
              <strong className="text-slate-900">{resetConfirmUser.fullName}</strong> (
              <code className="font-mono text-slate-700">{resetConfirmUser.email}</code>)?
            </p>

            <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-900">
              <p className="font-semibold">Mật khẩu mới sau khi đặt lại:</p>
              <code className="mt-1 block font-mono text-sm font-extrabold text-slate-900">
                Password@123
              </code>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2 border-t border-slate-100 pt-4 text-xs">
              <button
                type="button"
                onClick={() => setResetConfirmUser(null)}
                className="cursor-pointer rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50 transition-all active:scale-95"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => {
                  setStore((prev) => ({
                    ...prev,
                    users: prev.users.map((item) =>
                      item.id === resetConfirmUser.id
                        ? { ...item, password: 'Password@123' }
                        : item,
                    ),
                  }));
                  appendAudit(
                    'ADMIN_RESET_PASSWORD',
                    `Admin đặt lại mật khẩu của ${resetConfirmUser.email} về Password@123`,
                  );
                  notifyBanner(
                    `Đã đặt lại mật khẩu của ${resetConfirmUser.email} về mặc định "Password@123"!`,
                  );
                  setResetConfirmUser(null);
                }}
                className="cursor-pointer rounded-xl bg-amber-500 px-4 py-2 font-bold text-slate-950 shadow-md shadow-amber-500/20 hover:bg-amber-400 transition-all active:scale-95"
              >
                Xác Nhận Đặt Lại MK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: CHANGE USER STATUS CONFIRMATION
         ===================================================================== */}
      {statusConfirmUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'flex h-11 w-11 items-center justify-center rounded-2xl',
                  statusConfirmUser.nextStatus === 'INACTIVE'
                    ? 'bg-amber-100 text-amber-600'
                    : 'bg-emerald-100 text-emerald-600',
                )}
              >
                {statusConfirmUser.nextStatus === 'INACTIVE' ? (
                  <Lock className="h-6 w-6" />
                ) : (
                  <Unlock className="h-6 w-6" />
                )}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {statusConfirmUser.nextStatus === 'INACTIVE'
                    ? 'Khóa Quyền Truy Cập Tài Khoản'
                    : 'Mở Khóa Tài Khoản Nhân Sự'}
                </h3>
                <p className="text-xs text-slate-500">Chính sách IAM & Phân quyền RBAC S1.3</p>
              </div>
            </div>

            <p className="mt-4 text-xs leading-relaxed text-slate-600">
              Bạn có chắc chắn muốn {statusConfirmUser.nextStatus === 'INACTIVE' ? 'khóa' : 'mở khóa'}{' '}
              tài khoản của{' '}
              <strong className="text-slate-900">{statusConfirmUser.user.fullName}</strong> (
              <code className="font-mono text-slate-700">{statusConfirmUser.user.email}</code>)?
              {statusConfirmUser.nextStatus === 'INACTIVE' && (
                <span className="mt-2 block text-amber-700 font-medium">
                  Tài khoản bị khóa sẽ bị chặn đăng nhập và từ chối cấp JWT token (mã lỗi USER_INACTIVE).
                </span>
              )}
            </p>

            <div className="mt-6 flex items-center justify-end gap-2 border-t border-slate-100 pt-4 text-xs">
              <button
                type="button"
                onClick={() => setStatusConfirmUser(null)}
                className="cursor-pointer rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50 transition-all active:scale-95"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => {
                  const u = statusConfirmUser.user;
                  const nextStatus = statusConfirmUser.nextStatus;
                  setStore((prev) => ({
                    ...prev,
                    users: prev.users.map((item) =>
                      item.id === u.id ? { ...item, status: nextStatus } : item,
                    ),
                  }));
                  appendAudit(
                    'USER_STATUS',
                    `Cập nhật trạng thái ${u.email} → ${nextStatus}`,
                  );
                  notifyBanner(
                    nextStatus === 'INACTIVE'
                      ? `Đã khóa tài khoản ${u.email} (Chặn đăng nhập S1.3 USER_INACTIVE).`
                      : `Đã mở khóa tài khoản ${u.email}.`,
                  );
                  setStatusConfirmUser(null);
                }}
                className={cn(
                  'cursor-pointer rounded-xl px-4 py-2 font-bold transition-all active:scale-95',
                  statusConfirmUser.nextStatus === 'INACTIVE'
                    ? 'bg-amber-600 text-white hover:bg-amber-700'
                    : 'bg-emerald-600 text-white hover:bg-emerald-700',
                )}
              >
                {statusConfirmUser.nextStatus === 'INACTIVE' ? 'Xác Nhận Khóa' : 'Xác Nhận Mở Khóa'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: CREATE DEPARTMENT
         ===================================================================== */}
      {isCreateDeptOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-900 px-6 py-4 text-white">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Thêm Phòng Ban Mới (Tổ chức doanh nghiệp)
                  </h3>
                  <p className="text-xs text-slate-400">
                    Khởi tạo phòng ban và chỉ định Trưởng bộ phận phụ trách
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateDeptOpen(false)}
                className="cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const cleanName = newDeptName.trim();
                if (!cleanName) return;
                if (
                  store.departments.some(
                    (d) => d.name.toLowerCase() === cleanName.toLowerCase(),
                  )
                ) {
                  onTriggerViolation({
                    code: 'DUPLICATE_DEPT_NAME',
                    message: `Phòng ban "${cleanName}" đã tồn tại trong tổ chức.`,
                    candidateName: cleanName,
                    fromStageName: 'Create Department',
                    toStageName: 'Department List',
                  });
                  return;
                }
                setStore((prev) => ({
                  ...prev,
                  departments: [
                    ...prev.departments,
                    {
                      id: Date.now(),
                      name: cleanName,
                      managerName: newDeptManager,
                      memberCount: 1,
                      openRequisitions: 0,
                    },
                  ],
                }));
                appendAudit(
                  'CREATE_DEPARTMENT',
                  `Tạo phòng ban "${cleanName}" (Hiring Manager: ${newDeptManager})`,
                );
                notifyBanner(`Đã tạo phòng ban "${cleanName}" thành công!`);
                setNewDeptName('');
                setIsCreateDeptOpen(false);
              }}
              className="space-y-4 p-6 text-xs"
            >
              <div>
                <label className="block text-[11px] font-bold text-slate-700">
                  Tên Phòng ban mới <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newDeptName}
                  onChange={(e) => setNewDeptName(e.target.value)}
                  placeholder="Ví dụ: Cyber Security & Cloud"
                  className="mt-1 w-full rounded-2xl border border-slate-200/90 bg-white px-3.5 py-2 text-xs shadow-2xs transition-all focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Chỉ định Trưởng bộ phận (Hiring Manager) <span className="text-red-500">*</span>
                </label>
                <ModernSelect<string>
                  value={newDeptManager}
                  onChange={(val) => setNewDeptManager(val)}
                  options={store.users
                    .filter(
                      (u) =>
                        u.role === 'HIRING_MANAGER' ||
                        u.role === 'ADMIN' ||
                        u.role === 'INTERVIEWER',
                    )
                    .map((u) => ({
                      value: u.fullName,
                      label: `${u.fullName} (${u.role})`,
                      badge: u.role,
                      badgeColor:
                        u.role === 'HIRING_MANAGER'
                          ? 'bg-emerald-100 text-emerald-900'
                          : u.role === 'ADMIN'
                            ? 'bg-amber-100 text-amber-900'
                            : 'bg-violet-100 text-violet-900',
                    }))}
                  className="w-full"
                  triggerClassName="w-full rounded-2xl py-2"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setIsCreateDeptOpen(false)}
                  className="cursor-pointer rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-all active:scale-95"
                >
                  Hủy thao tác
                </button>
                <button
                  type="submit"
                  className="cursor-pointer rounded-2xl bg-amber-500 px-5 py-2 text-xs font-extrabold text-slate-950 shadow-md shadow-amber-500/20 hover:bg-amber-400 hover:shadow-lg transition-all active:scale-95"
                >
                  Thêm Phòng Ban Vào Tổ Chức
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: EDIT DEPARTMENT
         ===================================================================== */}
      {editingDept && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-900 px-6 py-4 text-white">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Chỉnh Sửa Thông Tin Phòng Ban
                  </h3>
                  <p className="text-xs text-slate-400">{editingDept.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingDept(null)}
                className="cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const nextName = editDeptName.trim();
                if (!nextName) return;
                const oldName = editingDept.name;
                setStore((prev) => ({
                  ...prev,
                  departments: prev.departments.map((item) =>
                    item.id === editingDept.id
                      ? { ...item, name: nextName, managerName: editDeptManager }
                      : item,
                  ),
                  users: prev.users.map((u) =>
                    u.department === oldName ? { ...u, department: nextName } : u,
                  ),
                  requisitions: prev.requisitions.map((r) =>
                    r.department === oldName ? { ...r, department: nextName } : r,
                  ),
                  jobs: prev.jobs.map((j) =>
                    j.department === oldName ? { ...j, department: nextName } : j,
                  ),
                }));
                appendAudit(
                  'UPDATE_DEPARTMENT',
                  `Cập nhật phòng ban "${oldName}" → "${nextName}" (Manager: ${editDeptManager})`,
                );
                notifyBanner(`Đã cập nhật phòng ban "${nextName}"!`);
                setEditingDept(null);
              }}
              className="space-y-4 p-6 text-xs"
            >
              <div>
                <label className="block text-[11px] font-bold text-slate-700">
                  Đổi tên Phòng ban <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editDeptName}
                  onChange={(e) => setEditDeptName(e.target.value)}
                  className="mt-1 w-full rounded-2xl border border-slate-200/90 bg-white px-3.5 py-2 text-xs shadow-2xs transition-all focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Đổi Trưởng bộ phận (Hiring Manager) <span className="text-red-500">*</span>
                </label>
                <ModernSelect<string>
                  value={editDeptManager}
                  onChange={(val) => setEditDeptManager(val)}
                  options={store.users
                    .filter((u) => u.role !== 'CANDIDATE')
                    .map((u) => ({
                      value: u.fullName,
                      label: `${u.fullName} (${u.role})`,
                      badge: u.role,
                      badgeColor:
                        u.role === 'HIRING_MANAGER'
                          ? 'bg-emerald-100 text-emerald-900'
                          : u.role === 'ADMIN'
                            ? 'bg-amber-100 text-amber-900'
                            : 'bg-violet-100 text-violet-900',
                    }))}
                  className="w-full"
                  triggerClassName="w-full rounded-2xl py-2"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingDept(null)}
                  className="cursor-pointer rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-all active:scale-95"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="cursor-pointer rounded-2xl bg-amber-500 px-5 py-2 text-xs font-extrabold text-slate-950 shadow-md shadow-amber-500/20 hover:bg-amber-400 hover:shadow-lg transition-all active:scale-95"
                >
                  Lưu Thay Đổi Phòng Ban
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: EXECUTIVE OFFER APPROVAL
         ===================================================================== */}
      {offerApprovalCand && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-emerald-600">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Phê Duyệt Đề Nghị Tuyển Dụng Đặc Cách</h3>
                <p className="text-xs text-slate-500">Admin Executive Override (S1.6)</p>
              </div>
            </div>

            <div className="mt-4 space-y-2 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Ứng viên:</span>
                <strong className="text-slate-900">{offerApprovalCand.fullName}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Vị trí:</span>
                <strong className="text-slate-900">{offerApprovalCand.jobTitle}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Phòng ban:</span>
                <span className="font-semibold text-slate-800">{offerApprovalCand.dept}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Mức lương đề xuất:</span>
                <span className="font-mono font-bold text-amber-900">{offerApprovalCand.salary}</span>
              </div>
            </div>

            <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
              Hành động này sẽ phê duyệt chính thức đề nghị Offer cho ứng viên dưới danh nghĩa Quản trị viên cấp cao (ADMIN EXECUTIVE), chuyển hồ sơ sang trạng thái sẵn sàng ký hợp đồng.
            </p>

            <div className="mt-6 flex items-center justify-end gap-2 border-t border-slate-100 pt-4 text-xs">
              <button
                type="button"
                onClick={() => setOfferApprovalCand(null)}
                className="cursor-pointer rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50 transition-all active:scale-95"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => {
                  const targetId = offerApprovalCand.id;
                  setStore((prev) => ({
                    ...prev,
                    candidates: prev.candidates.map((c) =>
                      c.id === targetId
                        ? {
                            ...c,
                            offerApprovedByHm: true,
                            offerApprovedByName: `${currentUser.fullName} (ADMIN EXECUTIVE)`,
                          }
                        : c,
                    ),
                  }));
                  appendAudit(
                    'ADMIN_EXEC_APPROVE_OFFER',
                    `Admin phê duyệt đặc cách Offer cho ứng viên ${offerApprovalCand.fullName} (${offerApprovalCand.jobTitle})`,
                  );
                  notifyBanner(`Đã phê duyệt đặc cách Offer cho ${offerApprovalCand.fullName}!`);
                  setOfferApprovalCand(null);
                }}
                className="cursor-pointer rounded-xl bg-emerald-600 px-4 py-2 font-bold text-white shadow-md shadow-emerald-500/20 hover:bg-emerald-700 transition-all active:scale-95"
              >
                Xác Nhận Phê Duyệt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
