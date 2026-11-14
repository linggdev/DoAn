import {
  AlertCircle,
  Award,
  BookOpen,
  Briefcase,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  CheckSquare,
  ChevronRight,
  Clock,
  Compass,
  Copy,
  DollarSign,
  Download,
  ExternalLink,
  Eye,
  FileCheck2,
  FileSearch,
  FileText,
  Filter,
  GraduationCap,
  HelpCircle,
  Info,
  LayoutGrid,
  MapPin,
  PartyPopper,
  RotateCcw,
  Search,
  Send,
  Share2,
  ShieldCheck,
  Sparkles,
  Table as TableIcon,
  Tag,
  Upload,
  UserCheck,
  Users,
  Video,
  X,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { AnimatedSpringDialog } from '@/components/animate-ui/guard-dialog';
import { ModernSelect, ModernSelectOption } from '@/components/animate-ui/modern-select';
import { TablePagination } from '@/components/animate-ui/table-pagination';
import {
  AccountUser,
  CandidateCardData,
  downloadIcsFile,
  JobItem,
  normalizeEmailInput,
  normalizePhoneInput,
  StageCode,
} from '@/lib/store';
import { cn } from '@/lib/utils';

interface CandidatePortalProps {
  activeSection: string;
  currentUser: AccountUser;
  jobs: JobItem[];
  candidates: CandidateCardData[];
  onApplyJob: (payload: {
    jobId: number;
    fullName: string;
    email: string;
    phone: string;
    experience: string;
    resumeFileName: string;
    resumeDataUrl?: string;
  }) => string | null;
  onTriggerGuard: (code: string, message: string, jobTitle: string) => void;
  onSelectSection: (section: string) => void;
}

const STAGE_META: Record<
  StageCode,
  {
    stepIndex: number;
    label: string;
    shortLabel: string;
    description: string;
    color: string;
    badgeBg: string;
    badgeText: string;
  }
> = {
  APPLIED: {
    stepIndex: 1,
    label: '1. Tiếp Nhận Hồ Sơ',
    shortLabel: 'Tiếp nhận',
    description: 'Hồ sơ đã được ghi nhận trên hệ thống và cấp mã Magic Link bảo mật.',
    color: 'bg-blue-500',
    badgeBg: 'bg-blue-50',
    badgeText: 'text-blue-700',
  },
  SCREENING: {
    stepIndex: 2,
    label: '2. Sàng Lọc Hồ Sơ',
    shortLabel: 'Sàng lọc CV',
    description: 'Chuyên viên Nhân sự đang đối chiếu kỹ năng và kinh nghiệm với barem yêu cầu.',
    color: 'bg-sky-500',
    badgeBg: 'bg-sky-50',
    badgeText: 'text-sky-700',
  },
  TEST: {
    stepIndex: 3,
    label: '3. Đánh Giá Kỹ Thuật',
    shortLabel: 'Bài Test',
    description: 'Ứng viên thực hiện bài kiểm tra năng lực chuyên môn hoặc coding assessment.',
    color: 'bg-indigo-500',
    badgeBg: 'bg-indigo-50',
    badgeText: 'text-indigo-700',
  },
  INTERVIEW: {
    stepIndex: 4,
    label: '4. Phỏng Vấn Chuyên Môn',
    shortLabel: 'Phỏng vấn',
    description: 'Hội đồng chuyên môn phỏng vấn trực tiếp hoặc trực tuyến qua Google Meet.',
    color: 'bg-violet-500',
    badgeBg: 'bg-violet-50',
    badgeText: 'text-violet-700',
  },
  OFFER: {
    stepIndex: 5,
    label: '5. Thư Đề Nghị Nhận Việc',
    shortLabel: 'Offer',
    description: 'Trưởng bộ phận đã phê duyệt mức đãi ngộ và HR đã phát hành thư mời nhận việc.',
    color: 'bg-amber-500',
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-800',
  },
  HIRED: {
    stepIndex: 6,
    label: '6. Chính Thức Gia Nhập',
    shortLabel: 'Trúng tuyển',
    description: 'Chúc mừng bạn đã hoàn tất mọi thủ tục và chính thức trở thành thành viên!',
    color: 'bg-emerald-500',
    badgeBg: 'bg-emerald-50',
    badgeText: 'text-emerald-700',
  },
  REJECTED: {
    stepIndex: 6,
    label: 'Hoàn Tất Xem Xét',
    shortLabel: 'Lưu hồ sơ',
    description: 'Hồ sơ được lưu trữ an toàn trong Talent Pool cho các cơ hội phù hợp sắp tới.',
    color: 'bg-slate-500',
    badgeBg: 'bg-slate-100',
    badgeText: 'text-slate-700',
  },
};

export const CandidatePortalView: React.FC<CandidatePortalProps> = ({
  activeSection,
  currentUser,
  jobs,
  candidates,
  onApplyJob,
  onTriggerGuard,
  onSelectSection,
}) => {
  // ---------------------------------------------------------------------------
  // SECTION 1: CAREER OPPORTUNITIES STATE (cand-jobs)
  // ---------------------------------------------------------------------------
  const [jobSearch, setJobSearch] = useState('');
  const [jobDeptFilter, setJobDeptFilter] = useState<'ALL' | string>('ALL');
  const [jobLevelFilter, setJobLevelFilter] = useState<
    'ALL' | 'JUNIOR' | 'MIDDLE' | 'SENIOR' | 'LEAD'
  >('ALL');
  const [jobAppliedFilter, setJobAppliedFilter] = useState<
    'ALL' | 'NOT_APPLIED' | 'APPLIED'
  >('ALL');
  const [jobViewMode, setJobViewMode] = useState<'CARDS' | 'TABLE'>('CARDS');
  const [jobPage, setJobPage] = useState<number>(1);
  const [jobPageSize, setJobPageSize] = useState<number>(10);

  // Job Detail & Apply Modals
  const [viewingJob, setViewingJob] = useState<JobItem | null>(null);
  const [applyModalJob, setApplyModalJob] = useState<JobItem | null>(null);
  const [applyFullName, setApplyFullName] = useState(currentUser.fullName);
  const [applyEmail, setApplyEmail] = useState(currentUser.email);
  const [applyPhone, setApplyPhone] = useState(currentUser.phone);
  const [applyExperience, setApplyExperience] = useState(
    '3.5 năm phát triển hệ thống phần mềm doanh nghiệp, nắm vững kiến trúc microservices & CSDL quan hệ.',
  );
  const [resumeFileName, setResumeFileName] = useState(
    `CV_${currentUser.fullName.replace(/\s+/g, '_')}.pdf`,
  );
  const [resumeDataUrl, setResumeDataUrl] = useState<string | undefined>(undefined);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // SECTION 2: MY APPLICATIONS STATE (cand-applications)
  // ---------------------------------------------------------------------------
  const [myAppSearch, setMyAppSearch] = useState('');
  const [myAppStageFilter, setMyAppStageFilter] = useState<'ALL' | StageCode>('ALL');
  const [myAppPage, setMyAppPage] = useState<number>(1);
  const [myAppPageSize, setMyAppPageSize] = useState<number>(10);

  // Candidate Actions & Viewers
  const [viewingOfferCand, setViewingOfferCand] = useState<{
    cand: CandidateCardData;
    job?: JobItem;
  } | null>(null);
  const [interviewPrepCand, setInterviewPrepCand] = useState<{
    cand: CandidateCardData;
    job?: JobItem;
  } | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [acceptedOfferId, setAcceptedOfferId] = useState<number | null>(null);

  // ---------------------------------------------------------------------------
  // SECTION 3: MAGIC TOKEN TRACKING STATE (cand-track)
  // ---------------------------------------------------------------------------
  const [tokenInput, setTokenInput] = useState(candidates[0]?.trackingToken ?? '');
  const [searchedToken, setSearchedToken] = useState(candidates[0]?.trackingToken ?? '');

  // ---------------------------------------------------------------------------
  // COMPUTED DATA: MY APPLICATIONS & FILTERING
  // ---------------------------------------------------------------------------
  const myNormalizedEmail = normalizeEmailInput(currentUser.email);
  const myNormalizedPhone = normalizePhoneInput(currentUser.phone);

  const myApplications = useMemo(() => {
    return candidates.filter(
      (c) =>
        normalizeEmailInput(c.email) === myNormalizedEmail ||
        (myNormalizedPhone && normalizePhoneInput(c.phone) === myNormalizedPhone),
    );
  }, [candidates, myNormalizedEmail, myNormalizedPhone]);

  // Distinct Departments with open jobs
  const distinctDepartments = useMemo(() => {
    const set = new Set<string>();
    jobs.forEach((j) => {
      if (j.department) set.add(j.department);
    });
    return Array.from(set).sort();
  }, [jobs]);

  // Filtered Published Jobs
  const filteredPublishedJobs = useMemo(() => {
    return jobs.filter((j) => {
      if (j.status !== 'PUBLISHED') return false;

      // Search keyword filter
      if (jobSearch.trim()) {
        const query = jobSearch.toLowerCase().trim();
        const matchTitle = j.title.toLowerCase().includes(query);
        const matchDept = j.department.toLowerCase().includes(query);
        const matchReq = j.requirements.toLowerCase().includes(query);
        const matchDesc = j.description.toLowerCase().includes(query);
        if (!matchTitle && !matchDept && !matchReq && !matchDesc) return false;
      }

      // Department filter
      if (jobDeptFilter !== 'ALL' && j.department !== jobDeptFilter) {
        return false;
      }

      // Level filter (heuristic based on title)
      if (jobLevelFilter !== 'ALL') {
        const titleUpper = j.title.toUpperCase();
        if (jobLevelFilter === 'JUNIOR' && !titleUpper.includes('JUNIOR') && !titleUpper.includes('FRESHER')) {
          return false;
        }
        if (jobLevelFilter === 'MIDDLE' && !titleUpper.includes('MID') && !titleUpper.includes('CHUYÊN VIÊN')) {
          return false;
        }
        if (jobLevelFilter === 'SENIOR' && !titleUpper.includes('SENIOR') && !titleUpper.includes('SR')) {
          return false;
        }
        if (jobLevelFilter === 'LEAD' && !titleUpper.includes('LEAD') && !titleUpper.includes('TRƯỞNG') && !titleUpper.includes('PRINCIPAL')) {
          return false;
        }
      }

      // Applied filter
      const alreadyApplied = myApplications.some((c) => c.jobId === j.id);
      if (jobAppliedFilter === 'APPLIED' && !alreadyApplied) return false;
      if (jobAppliedFilter === 'NOT_APPLIED' && alreadyApplied) return false;

      return true;
    });
  }, [jobs, jobSearch, jobDeptFilter, jobLevelFilter, jobAppliedFilter, myApplications]);

  // Paginated Published Jobs
  const paginatedPublishedJobs = useMemo(() => {
    const startIndex = (jobPage - 1) * jobPageSize;
    return filteredPublishedJobs.slice(startIndex, startIndex + jobPageSize);
  }, [filteredPublishedJobs, jobPage, jobPageSize]);

  // Filtered My Applications
  const filteredMyApplications = useMemo(() => {
    return myApplications.filter((c) => {
      const job = jobs.find((j) => j.id === c.jobId);

      // Search query
      if (myAppSearch.trim()) {
        const q = myAppSearch.toLowerCase().trim();
        const matchToken = c.trackingToken.toLowerCase().includes(q);
        const matchJob = job?.title.toLowerCase().includes(q);
        const matchDept = job?.department.toLowerCase().includes(q);
        if (!matchToken && !matchJob && !matchDept) return false;
      }

      // Stage filter
      if (myAppStageFilter !== 'ALL' && c.stageCode !== myAppStageFilter) {
        return false;
      }

      return true;
    });
  }, [myApplications, jobs, myAppSearch, myAppStageFilter]);

  // Paginated My Applications
  const paginatedMyApplications = useMemo(() => {
    const startIndex = (myAppPage - 1) * myAppPageSize;
    return filteredMyApplications.slice(startIndex, startIndex + myAppPageSize);
  }, [filteredMyApplications, myAppPage, myAppPageSize]);

  // ---------------------------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------------------------
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      onTriggerGuard(
        'APPLY_INVALID_FILE',
        `File "${file.name}" không đúng định dạng. Hệ thống chỉ chấp nhận file CV định dạng .PDF (S3.2).`,
        applyModalJob?.title ?? 'Ứng tuyển',
      );
      e.target.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      onTriggerGuard(
        'APPLY_INVALID_FILE',
        `File "${file.name}" vượt quá dung lượng cho phép (> 5MB — S3.2).`,
        applyModalJob?.title ?? 'Ứng tuyển',
      );
      e.target.value = '';
      return;
    }
    setResumeFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setResumeDataUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const copyToClipboard = (token: string) => {
    navigator.clipboard?.writeText(token);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2500);
  };

  // ---------------------------------------------------------------------------
  // STEPPER PROGRESS VISUALIZER COMPONENT
  // ---------------------------------------------------------------------------
  const renderCandidateJourneyCard = (cand: CandidateCardData, job?: JobItem) => {
    const currentMeta = STAGE_META[cand.stageCode];
    const isHired = cand.stageCode === 'HIRED';
    const isRejected = cand.stageCode === 'REJECTED';

    const pipelineSteps: {
      code: StageCode;
      label: string;
      desc: string;
      stepNum: number;
    }[] = [
      {
        code: 'APPLIED',
        label: 'Nộp Hồ Sơ',
        desc: 'Hồ sơ đã được lưu trữ & cấp mã Magic Link bảo mật.',
        stepNum: 1,
      },
      {
        code: 'SCREENING',
        label: 'Sàng Lọc CV',
        desc: 'HR đang đối chiếu kỹ năng & kinh nghiệm theo barem.',
        stepNum: 2,
      },
      {
        code: 'TEST',
        label: 'Đánh Giá Năng Lực',
        desc: 'Kiểm tra kỹ thuật & đánh giá chuyên môn.',
        stepNum: 3,
      },
      {
        code: 'INTERVIEW',
        label: 'Phỏng Vấn Hội Đồng',
        desc: 'Phỏng vấn chuyên sâu cùng Ban tuyển dụng.',
        stepNum: 4,
      },
      {
        code: 'OFFER',
        label: 'Thư Đề Nghị Nhận Việc',
        desc: 'Xem xét chế độ đãi ngộ & ký nhận việc.',
        stepNum: 5,
      },
      {
        code: isRejected ? 'REJECTED' : 'HIRED',
        label: isRejected ? 'Lưu Trữ Hồ Sơ' : 'Gia Nhập Doanh Nghiệp',
        desc: isRejected
          ? 'Hồ sơ được lưu trữ an toàn trong Talent Pool cho vị trí kế tiếp.'
          : 'Chào mừng bạn chính thức trở thành thành viên!',
        stepNum: 6,
      },
    ];

    return (
      <div
        key={cand.id}
        className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs transition-all hover:border-slate-300 hover:shadow-md"
      >
        {/* Card Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-sky-50 px-3 py-1 font-mono text-xs font-bold text-sky-700 ring-1 ring-sky-200/70">
                <FileSearch className="h-3.5 w-3.5 text-sky-600" />
                Mã tra cứu: {cand.trackingToken.slice(0, 18)}...
              </span>
              <button
                type="button"
                onClick={() => copyToClipboard(cand.trackingToken)}
                className="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 transition-all active:scale-95"
                title="Sao chép toàn bộ mã Magic Link"
              >
                {copiedToken === cand.trackingToken ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                    <span className="text-emerald-700">Đã sao chép!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5 text-slate-500" />
                    <span>Sao chép mã</span>
                  </>
                )}
              </button>

              {cand.isReturningCandidate && (
                <span className="inline-flex items-center gap-1 rounded-xl bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800 ring-1 ring-amber-300">
                  <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                  Ứng viên liên kết lịch sử (D09)
                </span>
              )}
            </div>

            <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
              {job?.title ?? 'Vị trí chuyên môn'}
              <span className="rounded-lg bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                Phòng {job?.department ?? 'Doanh nghiệp'}
              </span>
            </h3>

            <p className="text-xs text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-1">
              <span>
                Ứng viên: <strong className="text-slate-800">{cand.fullName}</strong>
              </span>
              <span>•</span>
              <span>
                Nộp lúc: <strong className="text-slate-800">{cand.appliedAt}</strong> ({cand.appliedDaysAgo} ngày trước)
              </span>
              <span>•</span>
              <span>
                Tệp CV: <code className="font-mono text-slate-700 font-bold">{cand.resumeFileName}</code>
              </span>
            </p>
          </div>

          <div className="flex flex-col items-end gap-1.5">
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-extrabold shadow-2xs ring-1',
                cand.stageCode === 'HIRED' && 'bg-emerald-50 text-emerald-800 ring-emerald-300',
                cand.stageCode === 'OFFER' && 'bg-amber-50 text-amber-900 ring-amber-300',
                cand.stageCode === 'INTERVIEW' && 'bg-violet-50 text-violet-800 ring-violet-300',
                cand.stageCode === 'TEST' && 'bg-indigo-50 text-indigo-800 ring-indigo-300',
                cand.stageCode === 'SCREENING' && 'bg-sky-50 text-sky-800 ring-sky-300',
                cand.stageCode === 'APPLIED' && 'bg-blue-50 text-blue-800 ring-blue-300',
                cand.stageCode === 'REJECTED' && 'bg-slate-100 text-slate-700 ring-slate-300',
              )}
            >
              <span className={cn('h-2 w-2 rounded-full', currentMeta.color)} />
              {currentMeta.label}
            </span>
            <span className="text-[11px] text-slate-400">
              SLA phản hồi: Trong vòng 48h làm việc
            </span>
          </div>
        </div>

        {/* 6-Stage Visual Stepper */}
        <div className="mt-5">
          <p className="text-xs font-bold text-slate-700 mb-3 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Compass className="h-4 w-4 text-blue-600" />
              Lộ trình ứng tuyển 6 giai đoạn (Candidate Pipeline Progress)
            </span>
            <span className="text-[11px] font-mono text-slate-500 font-normal">
              Quy tắc D15: Công khai tiến trình — Bảo mật điểm số nội bộ
            </span>
          </p>

          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
            {pipelineSteps.map((step) => {
              const isPast = step.stepNum < currentMeta.stepIndex;
              const isCurrent = step.stepNum === currentMeta.stepIndex;
              const isFuture = step.stepNum > currentMeta.stepIndex;

              return (
                <div
                  key={step.code}
                  className={cn(
                    'relative rounded-2xl border p-3.5 transition-all flex flex-col justify-between',
                    isCurrent && !isRejected && 'border-amber-400 bg-amber-50/70 shadow-xs ring-2 ring-amber-400/30',
                    isCurrent && isRejected && 'border-slate-300 bg-slate-100/80 shadow-xs',
                    isPast && 'border-emerald-200 bg-emerald-50/40 text-emerald-950',
                    isFuture && 'border-slate-200/80 bg-slate-50/60 text-slate-400',
                  )}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] font-extrabold uppercase">
                        Bước 0{step.stepNum}
                      </span>
                      {isPast && <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />}
                      {isCurrent && !isRejected && (
                        <span className="h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
                      )}
                      {isCurrent && isRejected && (
                        <AlertCircle className="h-4 w-4 text-slate-500 shrink-0" />
                      )}
                    </div>
                    <p
                      className={cn(
                        'mt-1.5 text-xs font-extrabold leading-snug',
                        isCurrent ? 'text-slate-950' : isPast ? 'text-emerald-900' : 'text-slate-600',
                      )}
                    >
                      {step.label}
                    </p>
                  </div>
                  <p className="mt-2 text-[10px] leading-relaxed text-slate-500">
                    {step.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Specialized Stage 4: Interview Hub Box */}
        {cand.stageCode === 'INTERVIEW' && cand.interviewScheduledAt && (
          <div className="mt-5 rounded-2xl border border-violet-200/90 bg-gradient-to-r from-violet-50/90 via-purple-50/50 to-white p-5 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="rounded-lg bg-violet-600 px-2.5 py-0.5 text-[11px] font-bold text-white uppercase tracking-wider">
                    LỊCH PHỎNG VẤN ĐÃ XÁC NHẬN
                  </span>
                  <span className="font-mono text-xs font-bold text-violet-800">
                    {cand.interviewDurationMinutes} phút
                  </span>
                </div>
                <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-violet-600" />
                  Thời gian: {cand.interviewScheduledAt}
                </h4>
                <p className="text-xs text-slate-600 flex items-center gap-2">
                  <Video className="h-4 w-4 text-violet-600" />
                  Phòng họp trực tuyến / Địa điểm:{' '}
                  <span className="font-mono font-bold text-violet-900 underline">
                    {cand.meetingLink || cand.interviewLocation || 'Google Meet (Đường dẫn riêng)'}
                  </span>
                </p>
                <p className="text-[11px] text-slate-500">
                  Hội đồng phỏng vấn đã được phân công theo nguyên tắc Khóa Điểm Chéo (D06 / S4.5).
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setInterviewPrepCand({ cand, job })}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-2xl border border-violet-200 bg-white px-4 py-2 text-xs font-bold text-violet-800 shadow-2xs hover:bg-violet-50 transition-all active:scale-95"
                >
                  <BookOpen className="h-3.5 w-3.5 text-violet-600" />
                  Hướng dẫn chuẩn bị
                </button>
                <button
                  type="button"
                  onClick={() => downloadIcsFile(cand, job?.title ?? 'Phỏng vấn Tuyển dụng')}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-2xl border border-violet-400/80 bg-violet-600 hover:bg-violet-700 px-4 py-2 text-xs font-extrabold text-white shadow-xs transition-all active:scale-95"
                >
                  <Download className="h-3.5 w-3.5" />
                  Tải lịch .ics vào Máy
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Specialized Stage 5: Offer Letter Studio Box */}
        {(cand.stageCode === 'OFFER' || cand.stageCode === 'HIRED') && (
          <div className="mt-5 rounded-2xl border border-amber-300/80 bg-gradient-to-r from-amber-50/90 via-orange-50/50 to-white p-5 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="rounded-lg bg-amber-500 px-2.5 py-0.5 text-[11px] font-extrabold text-slate-950 uppercase tracking-wider">
                    {cand.stageCode === 'HIRED' ? '🎉 ĐÃ CHẤP NHẬN OFFER' : '🎉 THƯ MỜI NHẬN VIỆC (JOB OFFER)'}
                  </span>
                  {cand.offerApprovedByHm && (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 ring-1 ring-emerald-300">
                      <ShieldCheck className="h-3 w-3 text-emerald-700" />
                      HM đã phê duyệt (D11)
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-baseline gap-3">
                  <h4 className="text-base font-extrabold text-slate-900">
                    Mức lương đề xuất:{' '}
                    <span className="font-mono text-lg font-black text-emerald-700">
                      {cand.offerSalary || 'Thỏa thuận hấp dẫn'}
                    </span>
                  </h4>
                  {cand.offerStartDate && (
                    <span className="text-xs text-slate-600">
                      • Ngày bắt đầu làm việc: <strong>{cand.offerStartDate}</strong>
                    </span>
                  )}
                </div>

                {cand.offerBenefits && (
                  <p className="text-xs text-slate-600">
                    <strong className="text-slate-800">Chế độ đãi ngộ & phúc lợi:</strong>{' '}
                    {cand.offerBenefits}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setViewingOfferCand({ cand, job })}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-2xl border border-amber-300/80 bg-amber-500 hover:bg-amber-400 px-4 py-2 text-xs font-extrabold text-slate-950 shadow-xs transition-all active:scale-95"
                >
                  <Award className="h-3.5 w-3.5" />
                  Mở Thư Mời Nhận Việc Đầy Đủ →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Specialized Stage: Rejection Notice with Compassion */}
        {cand.stageCode === 'REJECTED' && (
          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-xs text-slate-600">
            <div className="flex items-start gap-3">
              <Info className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-slate-800">
                  Thông báo về tiến trình xét duyệt hồ sơ
                </p>
                <p className="mt-1 leading-relaxed">
                  Cảm ơn bạn đã dành thời gian và tâm huyết tham gia ứng tuyển vị trí này. Do số lượng
                  chỉ tiêu có hạn ({job?.headcount ?? 1} vị trí), hội đồng đã lựa chọn ứng viên có độ
                  tương thích sát nhất với giai đoạn hiện tại. Dữ liệu hồ sơ của bạn đã được đưa vào
                  mạng lưới nhân tài ưu tiên (Talent Network) để liên hệ ngay khi có vị trí phù hợp tiếp theo.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* =======================================================================
          CANDIDATE HERO & EXPERIENCE OVERVIEW
         ======================================================================= */}
      <div className="relative overflow-hidden rounded-3xl border border-sky-300/60 bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 p-6 sm:p-7 text-white shadow-xl">
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-6">
          <div className="max-w-2xl space-y-2">
            <div className="inline-flex items-center gap-2 rounded-xl bg-white/20 px-3 py-1 font-mono text-[11px] font-bold text-white shadow-2xs backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              CANDIDATE CAREER & JOURNEY HUB (S2.13, S3.1–S3.7, D15)
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white drop-shadow-xs">
              Trung Tâm Cơ Hội Nghề Nghiệp & Hành Trình Tuyển Dụng
            </h2>
            <p className="text-xs sm:text-sm text-sky-100/95 leading-relaxed">
              Khám phá các vị trí mở tuyển, nộp hồ sơ chuẩn hóa PDF, tra cứu tiến độ thời gian thực
              bằng mã Magic Link độc lập và nhận thông báo lịch phỏng vấn một cách minh bạch.
            </p>
          </div>

          {/* 4 Stat Badges */}
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 w-full lg:w-auto">
            <div className="rounded-2xl border border-white/20 bg-white/10 p-3 backdrop-blur-md text-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-sky-200">Vị trí mở tuyển</p>
              <p className="mt-1 font-mono text-2xl font-black text-white">
                {jobs.filter((j) => j.status === 'PUBLISHED').length}
              </p>
              <p className="text-[10px] text-sky-200/80">Requisitions</p>
            </div>

            <div className="rounded-2xl border border-white/20 bg-white/10 p-3 backdrop-blur-md text-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-sky-200">Đơn đã nộp</p>
              <p className="mt-1 font-mono text-2xl font-black text-amber-300">
                {myApplications.length}
              </p>
              <p className="text-[10px] text-sky-200/80">Hồ sơ ứng tuyển</p>
            </div>

            <div className="rounded-2xl border border-white/20 bg-white/10 p-3 backdrop-blur-md text-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-sky-200">SLA Phản hồi</p>
              <p className="mt-1 font-mono text-xl font-black text-emerald-300">
                ≤ 48 Giờ
              </p>
              <p className="text-[10px] text-sky-200/80">Ngày làm việc</p>
            </div>

            <div className="rounded-2xl border border-white/20 bg-white/10 p-3 backdrop-blur-md text-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-sky-200">Bảo mật D15</p>
              <p className="mt-1 font-mono text-xs font-black text-white">
                100% PRIVATE
              </p>
              <p className="text-[10px] text-sky-200/80">Zero Leakage</p>
            </div>
          </div>
        </div>

        {/* Decorative background orbs */}
        <div className="pointer-events-none absolute -right-12 -bottom-12 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute left-1/3 -top-12 h-48 w-48 rounded-full bg-amber-400/20 blur-xl" />
      </div>

      {/* Global Success Notification Banner */}
      {successBanner && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-300/90 bg-emerald-50 p-4 text-xs font-semibold text-emerald-950 shadow-xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <span>{successBanner}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onSelectSection('cand-applications')}
              className="cursor-pointer rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-extrabold text-white shadow-xs hover:bg-emerald-700 transition-all active:scale-95"
            >
              Xem Đơn Của Tôi →
            </button>
            <button
              type="button"
              onClick={() => setSuccessBanner(null)}
              className="text-emerald-800 hover:text-emerald-950 p-1"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* =======================================================================
          SECTION 1: KHÁM PHÁ VIỆC LÀM & NỘP CV (cand-jobs)
         ======================================================================= */}
      {activeSection === 'cand-jobs' && (
        <div className="space-y-5">
          {/* Filter, Search & View Controls Card */}
          <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Compass className="h-5 w-5 text-blue-600" />
                  Danh Sách Vị Trí Đang Mở Tuyển ({filteredPublishedJobs.length} vị trí)
                </h3>
                <p className="text-xs text-slate-500">
                  Lọc theo phòng ban, cấp bậc, tìm kiếm từ khóa và chọn nộp CV chuẩn định dạng PDF (≤ 5MB — S3.2).
                </p>
              </div>

              {/* View Mode Switcher: Cards vs Table */}
              <div className="flex items-center gap-1 rounded-2xl border border-slate-200 bg-slate-50 p-1">
                <button
                  type="button"
                  onClick={() => setJobViewMode('CARDS')}
                  className={cn(
                    'inline-flex cursor-pointer items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all',
                    jobViewMode === 'CARDS'
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900',
                  )}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  Thẻ Bento
                </button>
                <button
                  type="button"
                  onClick={() => setJobViewMode('TABLE')}
                  className={cn(
                    'inline-flex cursor-pointer items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all',
                    jobViewMode === 'TABLE'
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900',
                  )}
                >
                  <TableIcon className="h-3.5 w-3.5" />
                  Bảng Chi Tiết
                </button>
              </div>
            </div>

            {/* Filter Controls Row */}
            <div className="mt-4 flex flex-wrap items-center gap-3">
              {/* Dedicated Search Input + Button */}
              <div className="flex items-center gap-1.5">
                <div className="relative">
                  <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={jobSearch}
                    onChange={(e) => {
                      setJobSearch(e.target.value);
                      setJobPage(1);
                    }}
                    placeholder="Tìm theo vị trí, kỹ năng, phòng ban..."
                    className="w-56 sm:w-72 rounded-2xl border border-slate-200/90 bg-white py-1.5 pr-8 pl-8 text-xs shadow-2xs transition-all focus:border-amber-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400/20"
                  />
                  {jobSearch && (
                    <button
                      type="button"
                      onClick={() => {
                        setJobSearch('');
                        setJobPage(1);
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
                  onClick={() => setJobPage(1)}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-2xl border border-amber-300/80 bg-amber-500 hover:bg-amber-400 px-3.5 py-1.5 text-xs font-extrabold text-slate-950 shadow-xs hover:shadow transition-all active:scale-95"
                >
                  <Search className="h-3.5 w-3.5" />
                  <span>Tìm kiếm</span>
                </button>
              </div>

              {/* Department Filter with ModernSelect */}
              <ModernSelect<string>
                value={jobDeptFilter}
                onChange={(val) => {
                  setJobDeptFilter(val);
                  setJobPage(1);
                }}
                options={[
                  { value: 'ALL', label: 'Tất cả phòng ban' },
                  ...distinctDepartments.map((dept) => ({
                    value: dept,
                    label: `Phòng ${dept}`,
                  })),
                ]}
                placeholder="Chọn phòng ban..."
                icon={Building2}
              />

              {/* Level Filter with ModernSelect */}
              <ModernSelect<'ALL' | 'JUNIOR' | 'MIDDLE' | 'SENIOR' | 'LEAD'>
                value={jobLevelFilter}
                onChange={(val) => {
                  setJobLevelFilter(val);
                  setJobPage(1);
                }}
                options={[
                  { value: 'ALL', label: 'Tất cả cấp bậc kinh nghiệm' },
                  { value: 'JUNIOR', label: 'Junior / Fresher', badge: '1-2 năm', badgeColor: 'bg-emerald-50 text-emerald-700' },
                  { value: 'MIDDLE', label: 'Middle / Chuyên viên', badge: '2-4 năm', badgeColor: 'bg-blue-50 text-blue-700' },
                  { value: 'SENIOR', label: 'Senior / Chuyên gia', badge: '4-7 năm', badgeColor: 'bg-violet-50 text-violet-700' },
                  { value: 'LEAD', label: 'Lead / Trưởng nhóm', badge: '7+ năm', badgeColor: 'bg-amber-50 text-amber-800' },
                ]}
                placeholder="Chọn cấp bậc..."
                icon={GraduationCap}
              />

              {/* Application Status Filter with ModernSelect */}
              <ModernSelect<'ALL' | 'NOT_APPLIED' | 'APPLIED'>
                value={jobAppliedFilter}
                onChange={(val) => {
                  setJobAppliedFilter(val);
                  setJobPage(1);
                }}
                options={[
                  { value: 'ALL', label: 'Mọi tình trạng nộp đơn' },
                  { value: 'NOT_APPLIED', label: 'Chưa ứng tuyển', badge: 'Sẵn sàng', badgeColor: 'bg-sky-50 text-sky-700' },
                  { value: 'APPLIED', label: 'Đã nộp hồ sơ', badge: 'Đã nộp', badgeColor: 'bg-emerald-50 text-emerald-700' },
                ]}
                placeholder="Tình trạng đơn..."
                icon={CheckSquare}
              />

              {/* Active filters reset */}
              {(jobSearch || jobDeptFilter !== 'ALL' || jobLevelFilter !== 'ALL' || jobAppliedFilter !== 'ALL') && (
                <button
                  type="button"
                  onClick={() => {
                    setJobSearch('');
                    setJobDeptFilter('ALL');
                    setJobLevelFilter('ALL');
                    setJobAppliedFilter('ALL');
                    setJobPage(1);
                  }}
                  className="inline-flex cursor-pointer items-center gap-1 rounded-2xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-all active:scale-95"
                >
                  <RotateCcw className="h-3 w-3 text-slate-400" />
                  Đặt lại lọc
                </button>
              )}
            </div>
          </div>

          {/* Jobs Listing: Cards Mode */}
          {jobViewMode === 'CARDS' && (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {paginatedPublishedJobs.map((job) => {
                const alreadyApplied = myApplications.some((c) => c.jobId === job.id);
                const remainingSlots = Math.max(0, job.headcount - job.filledCount);

                return (
                  <div
                    key={job.id}
                    className="flex flex-col justify-between rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs transition-all hover:border-slate-300 hover:shadow-md"
                  >
                    <div>
                      {/* Department and Headcount badges */}
                      <div className="flex items-start justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-xl bg-sky-50 px-2.5 py-1 font-mono text-[11px] font-bold text-sky-700 ring-1 ring-sky-200/60">
                          <Building2 className="h-3 w-3 text-sky-600" />
                          Phòng {job.department}
                        </span>

                        <span
                          className={cn(
                            'rounded-xl px-2.5 py-1 font-mono text-[11px] font-bold ring-1',
                            remainingSlots > 0
                              ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                              : 'bg-amber-50 text-amber-800 ring-amber-200',
                          )}
                        >
                          Còn {remainingSlots}/{job.headcount} chỉ tiêu
                        </span>
                      </div>

                      {/* Job Title and Salary */}
                      <h3 className="mt-3 text-base font-extrabold text-slate-900 leading-snug line-clamp-2">
                        {job.title}
                      </h3>

                      <p className="mt-1 font-mono text-xs font-extrabold text-emerald-700 flex items-center gap-1">
                        <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
                        Mức lương: {job.salaryRange}
                      </p>

                      {/* Description snippet */}
                      <div className="mt-3.5 rounded-2xl bg-slate-50/70 p-3.5 text-xs text-slate-600 space-y-2">
                        <p className="line-clamp-2">
                          <strong className="text-slate-900">Mô tả:</strong> {job.description}
                        </p>
                        <p className="line-clamp-2 font-mono text-[11px] text-slate-500">
                          <strong className="text-slate-900">Yêu cầu:</strong> {job.requirements}
                        </p>
                      </div>
                    </div>

                    {/* Card Actions Footer */}
                    <div className="mt-5 border-t border-slate-100 pt-4 space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        {alreadyApplied ? (
                          <span className="inline-flex items-center gap-1.5 font-bold text-emerald-700">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            Đã nộp hồ sơ
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400">
                            Chấp nhận CV PDF (≤ 5MB)
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => setViewingJob(job)}
                          className="inline-flex cursor-pointer items-center gap-1 font-bold text-blue-600 hover:text-blue-800 transition-colors"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Xem chi tiết
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (alreadyApplied) {
                            onTriggerGuard(
                              'APPLY_DUPLICATE_JOB',
                              `Bạn đã nộp hồ sơ cho vị trí "${job.title}" trước đó (S3.6 — HTTP 409). Hệ thống chặn việc nộp trùng nhiều đơn vào cùng 1 chiến dịch.`,
                              job.title,
                            );
                            return;
                          }
                          setApplyModalJob(job);
                          setApplyFullName(currentUser.fullName);
                          setApplyEmail(currentUser.email);
                          setApplyPhone(currentUser.phone);
                        }}
                        className={cn(
                          'w-full cursor-pointer rounded-2xl py-2.5 text-xs font-extrabold shadow-xs transition-all active:scale-98 flex items-center justify-center gap-1.5',
                          alreadyApplied
                            ? 'border border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200'
                            : 'border border-amber-300/80 bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/10',
                        )}
                      >
                        {alreadyApplied ? (
                          <>
                            <CheckCircle2 className="h-4 w-4 text-slate-600" />
                            Đã Nộp (Thử Kiểm Tra Chặn S3.6)
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4" />
                            Ứng Tuyển Ngay (Nộp CV PDF)
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Jobs Listing: Table Mode */}
          {jobViewMode === 'TABLE' && (
            <div className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold text-slate-600 uppercase">
                      <th className="px-4 py-3.5">Vị Trí Tuyển Dụng</th>
                      <th className="px-3.5 py-3.5">Phòng Ban</th>
                      <th className="px-3.5 py-3.5">Mức Lương Đề Xuất</th>
                      <th className="px-3.5 py-3.5 text-center">Chỉ Tiêu Còn Lại</th>
                      <th className="px-3.5 py-3.5">Trạng Thái Hồ Sơ</th>
                      <th className="px-4 py-3.5 text-right">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedPublishedJobs.map((job) => {
                      const alreadyApplied = myApplications.some((c) => c.jobId === job.id);
                      const remainingSlots = Math.max(0, job.headcount - job.filledCount);

                      return (
                        <tr key={job.id} className="transition-colors hover:bg-slate-50/60">
                          <td className="px-4 py-3.5">
                            <div>
                              <p className="font-extrabold text-slate-900">{job.title}</p>
                              <p className="mt-0.5 line-clamp-1 text-[11px] text-slate-500 max-w-sm">
                                {job.description}
                              </p>
                            </div>
                          </td>
                          <td className="px-3.5 py-3.5">
                            <span className="inline-flex items-center gap-1 rounded-lg bg-sky-50 px-2 py-0.5 font-mono text-[11px] font-bold text-sky-700">
                              <Building2 className="h-3 w-3 text-sky-600" />
                              {job.department}
                            </span>
                          </td>
                          <td className="px-3.5 py-3.5 font-mono font-bold text-emerald-700">
                            {job.salaryRange}
                          </td>
                          <td className="px-3.5 py-3.5 text-center">
                            <span
                              className={cn(
                                'rounded-full px-2.5 py-0.5 font-mono text-[11px] font-bold',
                                remainingSlots > 0
                                  ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200'
                                  : 'bg-amber-50 text-amber-800 ring-1 ring-amber-200',
                              )}
                            >
                              {remainingSlots} / {job.headcount}
                            </span>
                          </td>
                          <td className="px-3.5 py-3.5">
                            {alreadyApplied ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                Đã nộp hồ sơ
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                                Chưa nộp đơn
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-right space-x-2">
                            <button
                              type="button"
                              onClick={() => setViewingJob(job)}
                              className="cursor-pointer rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all active:scale-95"
                            >
                              Chi tiết
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (alreadyApplied) {
                                  onTriggerGuard(
                                    'APPLY_DUPLICATE_JOB',
                                    `Bạn đã nộp hồ sơ cho vị trí "${job.title}" trước đó (S3.6 — HTTP 409).`,
                                    job.title,
                                  );
                                  return;
                                }
                                setApplyModalJob(job);
                                setApplyFullName(currentUser.fullName);
                                setApplyEmail(currentUser.email);
                                setApplyPhone(currentUser.phone);
                              }}
                              className={cn(
                                'cursor-pointer rounded-xl px-3 py-1.5 text-xs font-extrabold transition-all active:scale-95',
                                alreadyApplied
                                  ? 'border border-slate-300 bg-slate-100 text-slate-600 hover:bg-slate-200'
                                  : 'border border-amber-300/80 bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-xs',
                              )}
                            >
                              {alreadyApplied ? 'Nộp Lại' : 'Ứng Tuyển'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Empty state */}
          {filteredPublishedJobs.length === 0 && (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center text-xs text-slate-500">
              <Search className="mx-auto h-8 w-8 text-slate-400 mb-2" />
              <p className="font-bold text-slate-800 text-sm">Không tìm thấy vị trí tuyển dụng phù hợp</p>
              <p className="mt-1 text-slate-500">
                Hãy thử thay đổi từ khóa tìm kiếm hoặc đặt lại các bộ lọc phòng ban và cấp bậc.
              </p>
              <button
                type="button"
                onClick={() => {
                  setJobSearch('');
                  setJobDeptFilter('ALL');
                  setJobLevelFilter('ALL');
                  setJobAppliedFilter('ALL');
                  setJobPage(1);
                }}
                className="mt-4 cursor-pointer rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-2xs"
              >
                Đặt lại tất cả bộ lọc
              </button>
            </div>
          )}

          {/* Pagination */}
          {filteredPublishedJobs.length > 0 && (
            <TablePagination
              currentPage={jobPage}
              pageSize={jobPageSize}
              totalItems={filteredPublishedJobs.length}
              onPageChange={setJobPage}
              onPageSizeChange={(sz) => {
                setJobPageSize(sz);
                setJobPage(1);
              }}
              itemName="vị trí tuyển dụng"
            />
          )}
        </div>
      )}

      {/* =======================================================================
          SECTION 2: ĐƠN ỨNG TUYỂN CỦA TÔI (cand-applications)
         ======================================================================= */}
      {activeSection === 'cand-applications' && (
        <div className="space-y-5">
          {/* Controls Bar */}
          <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-blue-600" />
                  Hồ Sơ Đã Nộp Của Bạn ({myApplications.length} đơn ứng tuyển)
                </h3>
                <p className="text-xs text-slate-500">
                  Tự động đồng bộ các đơn khớp với định danh Email:{' '}
                  <strong className="text-slate-800">{currentUser.email}</strong> hoặc SĐT:{' '}
                  <strong className="text-slate-800">{currentUser.phone}</strong>.
                </p>
              </div>

              <button
                type="button"
                onClick={() => onSelectSection('cand-jobs')}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-2xl border border-amber-300/80 bg-amber-500 hover:bg-amber-400 px-4 py-2 text-xs font-extrabold text-slate-950 shadow-xs transition-all active:scale-95"
              >
                <Compass className="h-3.5 w-3.5" />
                Ứng Tuyển Thêm Vị Trí Mới →
              </button>
            </div>

            {/* Filter row */}
            <div className="mt-4 flex flex-wrap items-center gap-3">
              {/* Dedicated Search Input + Button */}
              <div className="flex items-center gap-1.5">
                <div className="relative">
                  <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={myAppSearch}
                    onChange={(e) => {
                      setMyAppSearch(e.target.value);
                      setMyAppPage(1);
                    }}
                    placeholder="Tìm theo tên vị trí, mã tracking..."
                    className="w-56 sm:w-64 rounded-2xl border border-slate-200/90 bg-white py-1.5 pr-8 pl-8 text-xs shadow-2xs transition-all focus:border-amber-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400/20"
                  />
                  {myAppSearch && (
                    <button
                      type="button"
                      onClick={() => {
                        setMyAppSearch('');
                        setMyAppPage(1);
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
                  onClick={() => setMyAppPage(1)}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-2xl border border-amber-300/80 bg-amber-500 hover:bg-amber-400 px-3.5 py-1.5 text-xs font-extrabold text-slate-950 shadow-xs hover:shadow transition-all active:scale-95"
                >
                  <Search className="h-3.5 w-3.5" />
                  <span>Tìm kiếm</span>
                </button>
              </div>

              {/* Stage Filter with ModernSelect */}
              <ModernSelect<'ALL' | StageCode>
                value={myAppStageFilter}
                onChange={(val) => {
                  setMyAppStageFilter(val);
                  setMyAppPage(1);
                }}
                options={[
                  { value: 'ALL', label: 'Tất cả giai đoạn tiến trình' },
                  { value: 'APPLIED', label: '1. Tiếp nhận hồ sơ (APPLIED)', badgeColor: 'bg-blue-50 text-blue-700' },
                  { value: 'SCREENING', label: '2. Sàng lọc hồ sơ (SCREENING)', badgeColor: 'bg-sky-50 text-sky-700' },
                  { value: 'TEST', label: '3. Đánh giá kỹ thuật (TEST)', badgeColor: 'bg-indigo-50 text-indigo-700' },
                  { value: 'INTERVIEW', label: '4. Phỏng vấn hội đồng (INTERVIEW)', badgeColor: 'bg-violet-50 text-violet-700' },
                  { value: 'OFFER', label: '5. Thư mời nhận việc (OFFER)', badgeColor: 'bg-amber-50 text-amber-800' },
                  { value: 'HIRED', label: '6. Chính thức gia nhập (HIRED)', badgeColor: 'bg-emerald-50 text-emerald-700' },
                  { value: 'REJECTED', label: '7. Hoàn tất xem xét (REJECTED)', badgeColor: 'bg-slate-100 text-slate-700' },
                ]}
                placeholder="Lọc giai đoạn..."
                icon={Filter}
              />

              {/* Active filters reset */}
              {(myAppSearch || myAppStageFilter !== 'ALL') && (
                <button
                  type="button"
                  onClick={() => {
                    setMyAppSearch('');
                    setMyAppStageFilter('ALL');
                    setMyAppPage(1);
                  }}
                  className="inline-flex cursor-pointer items-center gap-1 rounded-2xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-all active:scale-95"
                >
                  <RotateCcw className="h-3 w-3 text-slate-400" />
                  Đặt lại lọc
                </button>
              )}
            </div>
          </div>

          {/* Applications list */}
          {filteredMyApplications.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center text-xs text-slate-500">
              <Briefcase className="mx-auto h-8 w-8 text-slate-400 mb-2" />
              <p className="font-bold text-slate-800 text-sm">
                {myApplications.length === 0
                  ? 'Bạn chưa nộp đơn ứng tuyển nào'
                  : 'Không có đơn ứng tuyển khớp với bộ lọc'}
              </p>
              <p className="mt-1 text-slate-500">
                {myApplications.length === 0
                  ? 'Hãy chuyển sang mục Khám phá Việc làm để tìm vị trí yêu thích và nộp CV.'
                  : 'Hãy thử xóa từ khóa tìm kiếm hoặc chọn tất cả giai đoạn.'}
              </p>
              {myApplications.length === 0 && (
                <button
                  type="button"
                  onClick={() => onSelectSection('cand-jobs')}
                  className="mt-4 cursor-pointer rounded-2xl border border-amber-300/80 bg-amber-500 hover:bg-amber-400 px-5 py-2 text-xs font-extrabold text-slate-950 shadow-xs"
                >
                  Khám Phá Việc Làm Ngay →
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {paginatedMyApplications.map((cand) =>
                renderCandidateJourneyCard(
                  cand,
                  jobs.find((j) => j.id === cand.jobId),
                ),
              )}
            </div>
          )}

          {/* Pagination */}
          {filteredMyApplications.length > 0 && (
            <TablePagination
              currentPage={myAppPage}
              pageSize={myAppPageSize}
              totalItems={filteredMyApplications.length}
              onPageChange={setMyAppPage}
              onPageSizeChange={(sz) => {
                setMyAppPageSize(sz);
                setMyAppPage(1);
              }}
              itemName="đơn ứng tuyển"
            />
          )}
        </div>
      )}

      {/* =======================================================================
          SECTION 3: TRA CỨU TIẾN ĐỘ BẰNG MÃ MAGIC LINK (/track/:token — D15)
         ======================================================================= */}
      {activeSection === 'cand-track' && (
        <div className="space-y-5">
          <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs">
            <div className="border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <span className="rounded-lg bg-sky-50 px-2.5 py-0.5 font-mono text-xs font-bold text-sky-700">
                  PUBLIC TRACKING ENDPOINT (D15 / SPEC 001)
                </span>
                <span className="rounded-lg bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                  Bảo mật tuyệt đối
                </span>
              </div>
              <h3 className="mt-2 text-base font-extrabold text-slate-900">
                Tra Cứu Tiến Trình Tuyển Dụng Công Khai Bằng Mã Magic Link
              </h3>
              <p className="mt-1 text-xs text-slate-500 max-w-3xl leading-relaxed">
                Theo quyết định kiến trúc <strong>D15</strong>, ứng viên có thể tra cứu trạng thái
                tiến trình 6 giai đoạn và lịch phỏng vấn một cách minh bạch nhưng{' '}
                <strong>tuyệt đối không bị rò rỉ điểm số nội bộ hay nhận xét của hội đồng</strong>.
              </p>
            </div>

            {/* Dedicated Search Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setSearchedToken(tokenInput.trim());
              }}
              className="mt-5 flex flex-wrap gap-2.5 text-xs"
            >
              <div className="relative flex-1 min-w-[280px]">
                <FileSearch className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder="Nhập mã tracking_token (VD: 8f91a2c0-1122-4b33-9900-atsdemo00101)..."
                  className="w-full rounded-2xl border border-slate-200/90 bg-white py-2.5 pr-8 pl-10 font-mono text-xs shadow-2xs transition-all focus:border-amber-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400/20"
                />
                {tokenInput && (
                  <button
                    type="button"
                    onClick={() => setTokenInput('')}
                    className="absolute top-1/2 right-3 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5 rounded-full hover:bg-slate-100"
                    title="Xóa mã"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <button
                type="submit"
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-2xl border border-amber-300/80 bg-amber-500 hover:bg-amber-400 px-5 py-2.5 text-xs font-extrabold text-slate-950 shadow-xs hover:shadow transition-all active:scale-95"
              >
                <Search className="h-4 w-4" />
                <span>Tra Cứu Hồ Sơ</span>
              </button>
            </form>

            {/* Quick Token Selector Chips */}
            <div className="mt-4 pt-3 border-t border-slate-100">
              <span className="text-[11px] font-bold text-slate-500 block mb-2">
                Mã tra cứu khả dụng trong hệ thống (Nhấn để tra cứu nhanh):
              </span>
              <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                {candidates.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setTokenInput(c.trackingToken);
                      setSearchedToken(c.trackingToken);
                    }}
                    className={cn(
                      'cursor-pointer rounded-xl px-3 py-1 font-mono transition-all',
                      searchedToken === c.trackingToken
                        ? 'border border-amber-400 bg-amber-500 text-slate-950 font-bold shadow-xs'
                        : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
                    )}
                  >
                    {c.fullName} ({c.stageCode})
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Searched Token Result */}
          {(() => {
            const found = candidates.find((c) => c.trackingToken === searchedToken);
            if (!found) {
              return (
                <div className="rounded-3xl border border-red-200 bg-red-50/70 p-8 text-center text-xs font-bold text-red-700 shadow-xs">
                  <AlertCircle className="mx-auto h-8 w-8 text-red-500 mb-2" />
                  <p className="text-sm">Không tìm thấy hồ sơ tương ứng</p>
                  <p className="mt-1 font-mono text-[11px] font-normal text-red-600">
                    Mã tra cứu "{searchedToken}" không tồn tại trên hệ thống (HTTP 404 TRACK_NOT_FOUND).
                  </p>
                  <p className="mt-2 text-slate-500 font-normal">
                    Vui lòng kiểm tra lại mã Magic Link trong email xác nhận hoặc chọn một mã trong danh sách gợi ý phía trên.
                  </p>
                </div>
              );
            }
            return renderCandidateJourneyCard(
              found,
              jobs.find((j) => j.id === found.jobId),
            );
          })()}
        </div>
      )}

      {/* =======================================================================
          MODAL 1: JOB DETAIL DIALOG
         ======================================================================= */}
      <AnimatedSpringDialog
        open={Boolean(viewingJob)}
        onOpenChange={(open) => !open && setViewingJob(null)}
        title={`Chi Tiết Vị Trí: ${viewingJob?.title ?? ''}`}
        subtitle={`Phòng ban: ${viewingJob?.department ?? ''} • Chỉ tiêu: ${viewingJob?.headcount ?? 1} nhân sự`}
      >
        {viewingJob && (
          <div className="space-y-4 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-slate-50 p-3.5 border border-slate-200/80">
              <div>
                <span className="text-[11px] text-slate-500">Mức đãi ngộ dự kiến:</span>
                <p className="font-mono text-base font-extrabold text-emerald-700">
                  {viewingJob.salaryRange}
                </p>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-slate-500">Định biên tuyển dụng:</span>
                <p className="font-mono text-xs font-bold text-slate-900">
                  Đã tuyển {viewingJob.filledCount} / {viewingJob.headcount} vị trí
                </p>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-slate-900 mb-1">Mô tả công việc (Job Description)</h4>
              <div className="rounded-2xl border border-slate-200 bg-white p-3.5 text-slate-700 leading-relaxed">
                {viewingJob.description}
              </div>
            </div>

            <div>
              <h4 className="font-bold text-slate-900 mb-1">Yêu cầu chuyên môn (Requirements)</h4>
              <div className="rounded-2xl border border-slate-200 bg-white p-3.5 text-slate-700 leading-relaxed whitespace-pre-line">
                {viewingJob.requirements}
              </div>
            </div>

            <div className="rounded-2xl border border-sky-200 bg-sky-50/50 p-3.5 space-y-1">
              <p className="font-bold text-sky-950 flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-sky-600" />
                Chính sách bảo mật hồ sơ & Cam kết phản hồi
              </p>
              <p className="text-[11px] text-sky-900 leading-relaxed">
                Hồ sơ của bạn được mã hóa an toàn trên hệ thống. Sau khi nộp, hệ thống sẽ tự động cấp mã Magic Link để bạn theo dõi tiến trình trực tuyến mà không cần đăng nhập phức tạp.
              </p>
            </div>

            <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setViewingJob(null)}
                className="cursor-pointer rounded-2xl border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-600 hover:bg-slate-50"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = viewingJob;
                  setViewingJob(null);
                  setApplyModalJob(target);
                  setApplyFullName(currentUser.fullName);
                  setApplyEmail(currentUser.email);
                  setApplyPhone(currentUser.phone);
                }}
                className="cursor-pointer rounded-2xl border border-amber-300/80 bg-amber-500 hover:bg-amber-400 px-5 py-2 font-extrabold text-slate-950 shadow-xs"
              >
                Ứng Tuyển Vị Trí Này →
              </button>
            </div>
          </div>
        )}
      </AnimatedSpringDialog>

      {/* =======================================================================
          MODAL 2: 1-CLICK APPLY WITH CV PDF MODAL
         ======================================================================= */}
      <AnimatedSpringDialog
        open={Boolean(applyModalJob)}
        onOpenChange={(open) => !open && setApplyModalJob(null)}
        title={`Nộp Hồ Sơ Ứng Tuyển: ${applyModalJob?.title ?? ''}`}
        subtitle="Hệ thống tự động chuẩn hóa Email/SĐT (D09), kiểm tra file PDF ≤ 5MB (S3.2) và tạo mã Magic Link theo dõi"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!applyModalJob) return;
            const token = onApplyJob({
              jobId: applyModalJob.id,
              fullName: applyFullName,
              email: applyEmail,
              phone: applyPhone,
              experience: applyExperience,
              resumeFileName,
              resumeDataUrl,
            });
            if (token) {
              setSuccessBanner(
                `Đã nộp thành công hồ sơ vào vị trí "${applyModalJob.title}"! Mã tra cứu Magic Link của bạn: ${token}`,
              );
              setTokenInput(token);
              setSearchedToken(token);
              setApplyModalJob(null);
            }
          }}
          className="space-y-4 text-xs"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block font-bold text-slate-700">Họ và tên ứng viên</label>
              <input
                type="text"
                required
                value={applyFullName}
                onChange={(e) => setApplyFullName(e.target.value)}
                className="mt-1 w-full rounded-2xl border border-slate-200/90 bg-white px-3.5 py-2 text-xs shadow-2xs focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700">
                Số điện thoại (tự chuẩn hóa +84 → 0)
              </label>
              <input
                type="text"
                required
                value={applyPhone}
                onChange={(e) => setApplyPhone(e.target.value)}
                className="mt-1 w-full rounded-2xl border border-slate-200/90 bg-white px-3.5 py-2 font-mono text-xs shadow-2xs focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700">Email liên hệ nhận kết quả</label>
            <input
              type="email"
              required
              value={applyEmail}
              onChange={(e) => setApplyEmail(e.target.value)}
              className="mt-1 w-full rounded-2xl border border-slate-200/90 bg-white px-3.5 py-2 font-mono text-xs shadow-2xs focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700">Tóm tắt năng lực & kinh nghiệm cốt lõi</label>
            <textarea
              rows={2}
              required
              value={applyExperience}
              onChange={(e) => setApplyExperience(e.target.value)}
              className="mt-1 w-full rounded-2xl border border-slate-200/90 bg-white p-3 text-xs shadow-2xs focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20"
            />
          </div>

          {/* CV Upload Box */}
          <div className="rounded-2xl border border-dashed border-sky-300 bg-sky-50/50 p-4">
            <label className="flex cursor-pointer items-center justify-between">
              <div className="flex items-center gap-3">
                <Upload className="h-5 w-5 text-sky-600 shrink-0" />
                <div>
                  <p className="font-bold text-slate-800">
                    Đính kèm tệp CV định dạng .PDF (Tối đa 5MB — S3.2)
                  </p>
                  <p className="font-mono text-[11px] text-sky-700 font-bold">
                    Tệp đang chọn: {resumeFileName}
                  </p>
                </div>
              </div>
              <input
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileChange}
                className="hidden"
              />
              <span className="rounded-xl border border-sky-300 bg-white px-3.5 py-1.5 font-bold text-sky-700 shadow-2xs hover:bg-sky-50">
                Chọn file PDF...
              </span>
            </label>
          </div>

          {/* Returning Candidate Hint */}
          <div className="rounded-2xl bg-amber-50/70 p-3 border border-amber-200/80 text-[11px] text-amber-900 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-600 shrink-0" />
            <span>
              <strong>Cơ chế D09:</strong> Nếu bạn từng ứng tuyển vị trí khác tại doanh nghiệp, hệ
              thống sẽ tự động nhận diện và liên kết lịch sử để tối ưu hóa quá trình xét duyệt.
            </span>
          </div>

          <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setApplyModalJob(null)}
              className="cursor-pointer rounded-2xl border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-600 hover:bg-slate-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="cursor-pointer rounded-2xl border border-amber-300/80 bg-amber-500 hover:bg-amber-400 px-5 py-2 font-extrabold text-slate-950 shadow-xs"
            >
              Xác Nhận Nộp Hồ Sơ
            </button>
          </div>
        </form>
      </AnimatedSpringDialog>

      {/* =======================================================================
          MODAL 3: DIGITAL OFFER LETTER STUDIO DIALOG
         ======================================================================= */}
      <AnimatedSpringDialog
        open={Boolean(viewingOfferCand)}
        onOpenChange={(open) => !open && setViewingOfferCand(null)}
        title="Thư Đề Nghị Nhận Việc Chính Thức (Official Job Offer)"
        subtitle={`Vị trí: ${viewingOfferCand?.job?.title ?? 'Kỹ sư chuyên môn'} • Ứng viên: ${viewingOfferCand?.cand.fullName ?? ''}`}
      >
        {viewingOfferCand && (
          <div className="space-y-4 text-xs">
            {/* Offer Certificate Layout */}
            <div className="rounded-3xl border border-amber-200 bg-gradient-to-b from-amber-50/40 via-white to-amber-50/20 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-amber-100 pb-3">
                <div>
                  <h4 className="text-base font-black text-slate-900">CHỨNG NHẬN ĐỀ NGHỊ VIỆC LÀM</h4>
                  <p className="text-[11px] text-slate-500">
                    Phát hành bởi Phòng Nhân sự & Trưởng bộ phận phụ trách
                  </p>
                </div>
                <span className="rounded-xl bg-emerald-100 px-3 py-1 font-mono text-xs font-bold text-emerald-800 ring-1 ring-emerald-300">
                  APPROVED (D11)
                </span>
              </div>

              {/* Offer Details Grid */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-white p-3 border border-slate-200/80 shadow-2xs">
                  <span className="text-[11px] text-slate-500 block">Vị trí đảm nhận:</span>
                  <span className="font-bold text-slate-900 text-sm">
                    {viewingOfferCand.job?.title ?? 'Chuyên viên cao cấp'}
                  </span>
                </div>

                <div className="rounded-2xl bg-white p-3 border border-slate-200/80 shadow-2xs">
                  <span className="text-[11px] text-slate-500 block">Phòng ban công tác:</span>
                  <span className="font-bold text-slate-900 text-sm">
                    Phòng {viewingOfferCand.job?.department ?? 'Công nghệ'}
                  </span>
                </div>

                <div className="rounded-2xl bg-white p-3 border border-slate-200/80 shadow-2xs">
                  <span className="text-[11px] text-slate-500 block">Mức lương chính thức (Gross):</span>
                  <span className="font-mono font-black text-emerald-700 text-base">
                    {viewingOfferCand.cand.offerSalary || 'Thỏa thuận'}
                  </span>
                </div>

                <div className="rounded-2xl bg-white p-3 border border-slate-200/80 shadow-2xs">
                  <span className="text-[11px] text-slate-500 block">Ngày dự kiến bắt đầu:</span>
                  <span className="font-bold text-slate-900 text-sm">
                    {viewingOfferCand.cand.offerStartDate || 'Sau 2 tuần kể từ ngày ký'}
                  </span>
                </div>
              </div>

              {/* Compensation & Benefits Breakdown */}
              <div className="rounded-2xl bg-white p-4 border border-slate-200/80 shadow-2xs space-y-2">
                <h5 className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Award className="h-4 w-4 text-amber-600" />
                  Gói đãi ngộ & Quyền lợi nhân sự:
                </h5>
                <ul className="list-disc pl-5 space-y-1 text-slate-700">
                  <li>
                    <strong>Mức lương thử việc:</strong> 85% mức lương chính thức (theo Bộ luật Lao động Việt Nam).
                  </li>
                  <li>
                    <strong>Chế độ bảo hiểm:</strong> Đóng 100% BHXH, BHYT, BHTN trên tổng lương hợp đồng; gói bảo hiểm sức khỏe cao cấp mở rộng.
                  </li>
                  <li>
                    <strong>Thời gian làm việc:</strong> Thứ Hai – Thứ Sáu (Linh hoạt giờ giấc, hỗ trợ Hybrid working).
                  </li>
                  <li>
                    <strong>Ngày phép:</strong> 15 ngày phép năm + 3 ngày phép nghỉ ốm nguyên lương.
                  </li>
                  {viewingOfferCand.cand.offerBenefits && (
                    <li>
                      <strong>Phúc lợi bổ sung:</strong> {viewingOfferCand.cand.offerBenefits}
                    </li>
                  )}
                </ul>
              </div>

              {/* HM Approval Verification Badge */}
              <div className="flex items-center justify-between rounded-2xl bg-emerald-50/80 p-3 border border-emerald-200 text-xs text-emerald-950">
                <span className="flex items-center gap-1.5 font-bold">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  Chữ ký điện tử: Đã phê duyệt bởi Trưởng bộ phận (D11 / S3.19)
                </span>
                <span className="font-mono text-[11px] text-emerald-800">
                  Xác thực hệ thống ATS
                </span>
              </div>
            </div>

            {/* CTAs */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-100">
              <span className="text-[11px] text-slate-500">
                Hiệu lực phản hồi: 07 ngày làm việc kể từ ngày nhận thư
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setViewingOfferCand(null)}
                  className="cursor-pointer rounded-2xl border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Đóng
                </button>

                {acceptedOfferId === viewingOfferCand.cand.id ? (
                  <span className="inline-flex items-center gap-1.5 rounded-2xl bg-emerald-600 px-5 py-2 font-extrabold text-white shadow-xs">
                    <Check className="h-4 w-4" />
                    Đã Xác Nhận Nhận Việc
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setAcceptedOfferId(viewingOfferCand.cand.id);
                      setSuccessBanner(
                        `Chúc mừng bạn đã đồng ý tiếp nhận Thư mời nhận việc vị trí "${viewingOfferCand.job?.title}"! Bộ phận HR sẽ liên hệ để hướng dẫn chuẩn bị hồ sơ Onboarding.`,
                      );
                      setTimeout(() => setViewingOfferCand(null), 1200);
                    }}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-2xl border border-amber-300/80 bg-amber-500 hover:bg-amber-400 px-5 py-2 font-extrabold text-slate-950 shadow-xs transition-all active:scale-95"
                  >
                    <Check className="h-4 w-4" />
                    Đồng Ý Tiếp Nhận Offer
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </AnimatedSpringDialog>

      {/* =======================================================================
          MODAL 4: INTERVIEW PREPARATION GUIDE DIALOG
         ======================================================================= */}
      <AnimatedSpringDialog
        open={Boolean(interviewPrepCand)}
        onOpenChange={(open) => !open && setInterviewPrepCand(null)}
        title="Hướng Dẫn Chuẩn Bị Phỏng Vấn Chuyên Môn"
        subtitle={`Vị trí: ${interviewPrepCand?.job?.title ?? 'Kỹ sư chuyên môn'} • Thời lượng: ${interviewPrepCand?.cand.interviewDurationMinutes ?? 45} phút`}
      >
        {interviewPrepCand && (
          <div className="space-y-4 text-xs">
            <div className="rounded-2xl bg-violet-50/70 p-4 border border-violet-200/80 space-y-1.5">
              <h4 className="font-bold text-violet-950 flex items-center gap-1.5">
                <Video className="h-4 w-4 text-violet-600" />
                Thông tin kết nối & Phòng họp
              </h4>
              <p className="text-slate-700">
                Thời gian:{' '}
                <strong className="text-slate-900">{interviewPrepCand.cand.interviewScheduledAt}</strong>
              </p>
              <p className="text-slate-700">
                Đường dẫn:{' '}
                <span className="font-mono font-bold text-violet-800 underline">
                  {interviewPrepCand.cand.meetingLink || 'Google Meet (Đã gửi qua email)'}
                </span>
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-bold text-slate-900">Lời khuyên giúp bạn đạt kết quả tốt nhất:</h4>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-3 space-y-1">
                  <p className="font-bold text-slate-800">1. Thiết bị & Kết nối</p>
                  <p className="text-slate-500 text-[11px] leading-relaxed">
                    Kiểm tra camera, microphone và đường truyền mạng trước giờ phỏng vấn ít nhất 10 phút.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-3 space-y-1">
                  <p className="font-bold text-slate-800">2. Phương pháp STAR</p>
                  <p className="text-slate-500 text-[11px] leading-relaxed">
                    Trả lời các câu hỏi tình huống theo mô hình: Situation (Hoàn cảnh) - Task (Nhiệm vụ) - Action (Hành động) - Result (Kết quả).
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-3 space-y-1">
                  <p className="font-bold text-slate-800">3. Minh bạch chuyên môn</p>
                  <p className="text-slate-500 text-[11px] leading-relaxed">
                    Hội đồng đánh giá cao sự trung thực về điểm mạnh, điểm cần cải thiện và tư duy giải quyết vấn đề.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-3 space-y-1">
                  <p className="font-bold text-slate-800">4. Đặt câu hỏi cho Hội đồng</p>
                  <p className="text-slate-500 text-[11px] leading-relaxed">
                    Hãy chuẩn bị 2-3 câu hỏi về văn hóa đội ngũ, dự án trọng điểm hoặc lộ trình phát triển.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setInterviewPrepCand(null)}
                className="cursor-pointer rounded-2xl border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-600 hover:bg-slate-50"
              >
                Đã hiểu
              </button>
              <button
                type="button"
                onClick={() => downloadIcsFile(interviewPrepCand.cand, interviewPrepCand.job?.title ?? 'Phỏng vấn Tuyển dụng')}
                className="cursor-pointer rounded-2xl border border-violet-400/80 bg-violet-600 hover:bg-violet-700 px-4 py-2 font-extrabold text-white shadow-xs"
              >
                Tải Lịch .ics
              </button>
            </div>
          </div>
        )}
      </AnimatedSpringDialog>
    </div>
  );
};
