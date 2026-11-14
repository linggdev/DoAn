import {
  AlertTriangle,
  ArrowRight,
  Award,
  BookOpen,
  Briefcase,
  Building2,
  Calendar,
  CalendarCheck2,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Download,
  Eye,
  EyeOff,
  FileText,
  Filter,
  Info,
  LayoutGrid,
  Lock,
  RotateCcw,
  Scale,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Table as TableIcon,
  Unlock,
  UserCheck,
  Users,
  Video,
  X,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { AnimatedSpringDialog } from '@/components/animate-ui/guard-dialog';
import { ModernSelect } from '@/components/animate-ui/modern-select';
import { TablePagination } from '@/components/animate-ui/table-pagination';
import { EvaluationStudioView } from '@/components/portals/evaluation-studio';
import {
  AccountUser,
  AtsPersistentState,
  CandidateCardData,
  computeCandidateMetrics,
  downloadIcsFile,
  InterviewEvalSheet,
  JobItem,
  RecommendationType,
} from '@/lib/store';
import { cn } from '@/lib/utils';

export interface InterviewerPortalViewProps {
  activeSection: string;
  onSelectSection: (section: string) => void;
  currentUser: AccountUser;
  store: AtsPersistentState;
  selectedJob: JobItem;
  onSelectJobId: (jobId: number) => void;
  selectedEvalCandidateId: number;
  onSelectEvalCandidateId: (id: number) => void;
  onUpdateSheetScore: (
    candId: number,
    interviewerId: number,
    criterionId: number,
    score: number,
  ) => void;
  onUpdateSheetCriterionComment: (
    candId: number,
    interviewerId: number,
    criterionId: number,
    comment: string,
  ) => void;
  onUpdateSheetMeta: (
    candId: number,
    interviewerId: number,
    recommendation: RecommendationType,
    overallComment: string,
  ) => void;
  onSubmitSheet: (candId: number, interviewerId: number) => void;
}

const BARS_ANCHORS = [
  {
    score: '1.0',
    title: 'Kém / Vi phạm Điểm liệt',
    desc: 'Không nắm được kiến thức cơ bản, trả lời sai lệch bản chất. Kích hoạt cờ Knock-out nếu là tiêu chí bắt buộc (D05).',
    badgeClass: 'bg-red-50 text-red-700 ring-red-200',
  },
  {
    score: '2.0',
    title: 'Cần cải thiện',
    desc: 'Hiểu lý thuyết sơ bộ nhưng thiếu kinh nghiệm thực tế, cần hỗ trợ nhiều mới giải quyết được bài toán.',
    badgeClass: 'bg-orange-50 text-orange-800 ring-orange-200',
  },
  {
    score: '3.0',
    title: 'Đạt chuẩn yêu cầu',
    desc: 'Đáp ứng đầy đủ yêu cầu công việc, làm việc độc lập và xử lý tốt các tình huống tiêu chuẩn.',
    badgeClass: 'bg-sky-50 text-sky-800 ring-sky-200',
  },
  {
    score: '4.0',
    title: 'Tốt / Vượt kỳ vọng',
    desc: 'Nắm sâu kiến trúc hệ thống, chủ động tối ưu hiệu năng và có khả năng dẫn dắt kỹ thuật trong nhóm.',
    badgeClass: 'bg-indigo-50 text-indigo-800 ring-indigo-200',
  },
  {
    score: '5.0',
    title: 'Xuất sắc / Hình mẫu',
    desc: 'Chuyên gia đầu ngành trong lĩnh vực, giải quyết xuất sắc bài toán phức tạp và nâng tầm tiêu chuẩn đội ngũ.',
    badgeClass: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  },
];

export const InterviewerPortalView: React.FC<InterviewerPortalViewProps> = ({
  activeSection,
  onSelectSection,
  currentUser,
  store,
  selectedJob,
  onSelectJobId,
  selectedEvalCandidateId,
  onSelectEvalCandidateId,
  onUpdateSheetScore,
  onUpdateSheetCriterionComment,
  onUpdateSheetMeta,
  onSubmitSheet,
}) => {
  // ---------------------------------------------------------------------------
  // STATE: SECTION 1 — ASSIGNED SCHEDULE & QUEUE (int-schedule)
  // ---------------------------------------------------------------------------
  const [schedSearch, setSchedSearch] = useState('');
  const [schedJobFilter, setSchedJobFilter] = useState<'ALL' | number>('ALL');
  const [schedStatusFilter, setSchedStatusFilter] = useState<
    'ALL' | 'PENDING' | 'SUBMITTED' | 'UNLOCKED'
  >('ALL');
  const [schedBlindFilter, setSchedBlindFilter] = useState<'ALL' | 'LOCKED' | 'UNLOCKED'>('ALL');
  const [schedViewMode, setSchedViewMode] = useState<'CARDS' | 'TABLE'>('CARDS');
  const [schedPage, setSchedPage] = useState<number>(1);
  const [schedPageSize, setSchedPageSize] = useState<number>(10);

  // ---------------------------------------------------------------------------
  // STATE: SECTION 3 — RUBRIC & SCORECARD ARCHIVE (int-rubric)
  // ---------------------------------------------------------------------------
  const [archiveSearch, setArchiveSearch] = useState('');
  const [archiveJobFilter, setArchiveJobFilter] = useState<'ALL' | number>('ALL');
  const [archiveRecFilter, setArchiveRecFilter] = useState<'ALL' | RecommendationType>('ALL');
  const [archiveStatusFilter, setArchiveStatusFilter] = useState<'ALL' | 'SUBMITTED' | 'PENDING'>(
    'ALL',
  );
  const [archivePage, setArchivePage] = useState<number>(1);
  const [archivePageSize, setArchivePageSize] = useState<number>(10);

  // ---------------------------------------------------------------------------
  // STATE: ISOLATED MODALS
  // ---------------------------------------------------------------------------
  const [prepModalCand, setPrepModalCand] = useState<{
    cand: CandidateCardData;
    job: JobItem;
    mySheet: InterviewEvalSheet;
  } | null>(null);

  const [inspectModalCand, setInspectModalCand] = useState<{
    cand: CandidateCardData;
    job: JobItem;
    mySheet: InterviewEvalSheet;
  } | null>(null);

  // ---------------------------------------------------------------------------
  // COMPUTED DATA: ASSIGNED CANDIDATES FOR THIS INTERVIEWER
  // ---------------------------------------------------------------------------
  const assignedItems = useMemo(() => {
    return store.candidates
      .filter((c) =>
        c.sheets.some(
          (s) =>
            s.interviewerId === currentUser.id ||
            s.interviewerEmail.toLowerCase() === currentUser.email.toLowerCase(),
        ),
      )
      .map((cand) => {
        const job = store.jobs.find((j) => j.id === cand.jobId) ?? selectedJob;
        const mySheet =
          cand.sheets.find(
            (s) =>
              s.interviewerId === currentUser.id ||
              s.interviewerEmail.toLowerCase() === currentUser.email.toLowerCase(),
          ) ?? cand.sheets[0];
        const metrics = computeCandidateMetrics(cand, job.criteria);

        // Compute my personal weighted score
        const myWeightedScore =
          job.criteria.reduce(
            (acc, crit) => acc + (crit.weightPercent / 100) * (mySheet.scores[crit.id] ?? 3.0),
            0,
          ) || 3.0;

        const myKnockoutTriggered = job.criteria.some(
          (crit) => crit.isKnockout && (mySheet.scores[crit.id] ?? 3.0) <= 1.5,
        );

        return {
          cand,
          job,
          mySheet,
          metrics,
          myWeightedScore: Math.round(myWeightedScore * 100) / 100,
          myKnockoutTriggered,
        };
      });
  }, [store.candidates, store.jobs, currentUser, selectedJob]);

  const kpiCounts = useMemo(() => {
    const total = assignedItems.length;
    const pending = assignedItems.filter((i) => !i.mySheet.submitted).length;
    const submitted = assignedItems.filter((i) => i.mySheet.submitted).length;
    const unlocked = assignedItems.filter((i) => i.metrics.allSubmitted).length;
    return { total, pending, submitted, unlocked };
  }, [assignedItems]);

  // Filtered Schedule Items
  const filteredScheduleItems = useMemo(() => {
    return assignedItems.filter(({ cand, job, mySheet, metrics }) => {
      if (schedSearch.trim()) {
        const q = schedSearch.toLowerCase().trim();
        const matchName = cand.fullName.toLowerCase().includes(q);
        const matchEmail = cand.email.toLowerCase().includes(q);
        const matchJob = job.title.toLowerCase().includes(q);
        const matchDept = job.department.toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchJob && !matchDept) return false;
      }

      if (schedJobFilter !== 'ALL' && job.id !== schedJobFilter) return false;

      if (schedStatusFilter === 'PENDING' && mySheet.submitted) return false;
      if (schedStatusFilter === 'SUBMITTED' && !mySheet.submitted) return false;
      if (schedStatusFilter === 'UNLOCKED' && !metrics.allSubmitted) return false;

      if (schedBlindFilter === 'LOCKED' && metrics.allSubmitted) return false;
      if (schedBlindFilter === 'UNLOCKED' && !metrics.allSubmitted) return false;

      return true;
    });
  }, [assignedItems, schedSearch, schedJobFilter, schedStatusFilter, schedBlindFilter]);

  const paginatedScheduleItems = useMemo(() => {
    const start = (schedPage - 1) * schedPageSize;
    return filteredScheduleItems.slice(start, start + schedPageSize);
  }, [filteredScheduleItems, schedPage, schedPageSize]);

  // Filtered Archive Items (for Section 3)
  const filteredArchiveItems = useMemo(() => {
    return assignedItems.filter(({ cand, job, mySheet }) => {
      if (archiveSearch.trim()) {
        const q = archiveSearch.toLowerCase().trim();
        const matchName = cand.fullName.toLowerCase().includes(q);
        const matchJob = job.title.toLowerCase().includes(q);
        const matchComment = (mySheet.comment || '').toLowerCase().includes(q);
        if (!matchName && !matchJob && !matchComment) return false;
      }

      if (archiveJobFilter !== 'ALL' && job.id !== archiveJobFilter) return false;
      if (archiveRecFilter !== 'ALL' && mySheet.recommendation !== archiveRecFilter) return false;
      if (archiveStatusFilter === 'SUBMITTED' && !mySheet.submitted) return false;
      if (archiveStatusFilter === 'PENDING' && mySheet.submitted) return false;

      return true;
    });
  }, [assignedItems, archiveSearch, archiveJobFilter, archiveRecFilter, archiveStatusFilter]);

  const paginatedArchiveItems = useMemo(() => {
    const start = (archivePage - 1) * archivePageSize;
    return filteredArchiveItems.slice(start, start + archivePageSize);
  }, [filteredArchiveItems, archivePage, archivePageSize]);

  // Candidates for the currently selected Job in Studio
  const studioJobCandidates = useMemo(
    () => store.candidates.filter((c) => c.jobId === selectedJob.id),
    [store.candidates, selectedJob.id],
  );

  return (
    <div className="space-y-6">
      {/* =====================================================================
          INTERVIEWER EXECUTIVE HERO BANNER (LUMINOUS VIOLET-INDIGO GRADIENT)
         ===================================================================== */}
      <div className="relative overflow-hidden rounded-3xl border border-violet-300/60 bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 p-6 sm:p-7 text-white shadow-xl">
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-6">
          <div className="max-w-2xl space-y-2">
            <div className="inline-flex items-center gap-2 rounded-xl bg-white/20 px-3 py-1 font-mono text-[11px] font-bold text-white shadow-2xs backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              INTERVIEWER BLIND EVALUATION STUDIO (SPEC 004 — D04, D05, D06)
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white drop-shadow-xs">
              Hội Đồng Thẩm Định Độc Lập — {currentUser.fullName}
            </h2>
            <p className="text-xs sm:text-sm text-violet-100/95 leading-relaxed">
              Chấm điểm ứng viên theo Barem trọng số ($\sum w_i = 100\%$), tự động kích hoạt quy tắc
              Điểm liệt (Knock-out Rule $\le 1.5$) và bảo vệ tính khách quan tuyệt đối nhờ chốt chặn{' '}
              <strong>Blind Evaluation Lock (D06)</strong>.
            </p>
          </div>

          {/* 4 Live KPI Stat Badges */}
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 w-full lg:w-auto">
            <div className="rounded-2xl border border-white/20 bg-white/10 p-3 backdrop-blur-md text-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-violet-200">
                Được phân công
              </p>
              <p className="mt-1 font-mono text-2xl font-black text-white">{kpiCounts.total}</p>
              <p className="text-[10px] text-violet-200/80">Hồ sơ phỏng vấn</p>
            </div>

            <div className="rounded-2xl border border-white/20 bg-white/10 p-3 backdrop-blur-md text-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-violet-200">
                Cần bạn chấm
              </p>
              <p className="mt-1 font-mono text-2xl font-black text-amber-300">
                {kpiCounts.pending}
              </p>
              <p className="text-[10px] text-violet-200/80">Phiếu đang chờ</p>
            </div>

            <div className="rounded-2xl border border-white/20 bg-white/10 p-3 backdrop-blur-md text-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-violet-200">
                Đã nộp bất biến
              </p>
              <p className="mt-1 font-mono text-2xl font-black text-emerald-300">
                {kpiCounts.submitted}
              </p>
              <p className="text-[10px] text-violet-200/80">Locked Scorecards</p>
            </div>

            <div className="rounded-2xl border border-white/20 bg-white/10 p-3 backdrop-blur-md text-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-violet-200">
                Mở khóa HĐ
              </p>
              <p className="mt-1 font-mono text-2xl font-black text-sky-300">
                {kpiCounts.unlocked}
              </p>
              <p className="text-[10px] text-violet-200/80">100% Panel Done</p>
            </div>
          </div>
        </div>

        <div className="pointer-events-none absolute -right-12 -bottom-12 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute left-1/3 -top-12 h-48 w-48 rounded-full bg-amber-400/20 blur-xl" />
      </div>

      {/* =====================================================================
          SECTION 1: LỊCH PHỎNG VẤN ĐƯỢC GIAO & HÀNG ĐỢI CHẤM (int-schedule)
         ===================================================================== */}
      {activeSection === 'int-schedule' && (
        <div className="space-y-5">
          {/* Interactive KPI Filter Pills */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              {
                id: 'ALL' as const,
                label: 'TẤT CẢ PHÂN CÔNG',
                count: kpiCounts.total,
                sub: 'Toàn bộ hội đồng của bạn',
              },
              {
                id: 'PENDING' as const,
                label: 'CẦN BẠN CHẤM ĐIỂM',
                count: kpiCounts.pending,
                sub: 'Chưa nộp phiếu độc lập',
              },
              {
                id: 'SUBMITTED' as const,
                label: 'ĐÃ NỘP BẤT BIẾN',
                count: kpiCounts.submitted,
                sub: 'Đã khóa phiếu (S4.3)',
              },
              {
                id: 'UNLOCKED' as const,
                label: 'ĐÃ MỞ KHÓA BLIND LOCK',
                count: kpiCounts.unlocked,
                sub: 'Đủ 100% giám khảo nộp',
              },
            ].map((pill) => {
              const active = schedStatusFilter === pill.id;
              return (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => {
                    setSchedStatusFilter(pill.id);
                    setSchedPage(1);
                  }}
                  className={cn(
                    'cursor-pointer rounded-2xl border p-4 text-left transition-all',
                    active
                      ? 'border-amber-500 bg-amber-50/70 shadow-xs ring-1 ring-amber-400/40'
                      : 'border-slate-200/90 bg-white hover:bg-slate-50',
                  )}
                >
                  <p className="font-mono text-[10px] font-bold text-slate-500 uppercase">
                    {pill.label}
                  </p>
                  <p className="mt-1 font-mono text-2xl font-extrabold text-slate-900">
                    {pill.count}
                  </p>
                  <p className="text-[11px] text-slate-500">{pill.sub}</p>
                </button>
              );
            })}
          </div>

          {/* Search, Multi-Filters & View Mode Card */}
          <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <CalendarCheck2 className="h-5 w-5 text-violet-600" />
                  Danh Sách Phỏng Vấn Được Phân Công ({filteredScheduleItems.length} ứng viên)
                </h3>
                <p className="text-xs text-slate-500">
                  Tra cứu lịch họp Google Meet, tải tệp lịch <code>.ics</code>, chuẩn bị bộ câu hỏi
                  theo Barem và mở Studio chấm điểm độc lập.
                </p>
              </div>

              {/* View Mode Switcher: Cards vs Table */}
              <div className="flex items-center gap-1 rounded-2xl border border-slate-200 bg-slate-50 p-1">
                <button
                  type="button"
                  onClick={() => setSchedViewMode('CARDS')}
                  className={cn(
                    'inline-flex cursor-pointer items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all',
                    schedViewMode === 'CARDS'
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900',
                  )}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  Thẻ Bento
                </button>
                <button
                  type="button"
                  onClick={() => setSchedViewMode('TABLE')}
                  className={cn(
                    'inline-flex cursor-pointer items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all',
                    schedViewMode === 'TABLE'
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900',
                  )}
                >
                  <TableIcon className="h-3.5 w-3.5" />
                  Bảng Chi Tiết
                </button>
              </div>
            </div>

            {/* Filter Toolbar */}
            <div className="mt-4 flex flex-wrap items-center gap-3">
              {/* Dedicated Search Input + Button */}
              <div className="flex items-center gap-1.5">
                <div className="relative">
                  <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={schedSearch}
                    onChange={(e) => {
                      setSchedSearch(e.target.value);
                      setSchedPage(1);
                    }}
                    placeholder="Tìm tên ứng viên, vị trí, phòng ban..."
                    className="w-56 sm:w-64 rounded-2xl border border-slate-200/90 bg-white py-1.5 pr-8 pl-8 text-xs shadow-2xs transition-all focus:border-amber-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400/20"
                  />
                  {schedSearch && (
                    <button
                      type="button"
                      onClick={() => {
                        setSchedSearch('');
                        setSchedPage(1);
                      }}
                      className="absolute top-1/2 right-2.5 -translate-y-1/2 cursor-pointer rounded-full p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                      title="Xóa tìm kiếm"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setSchedPage(1)}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-2xl border border-amber-300/80 bg-amber-500 hover:bg-amber-400 px-3.5 py-1.5 text-xs font-extrabold text-slate-950 shadow-xs hover:shadow transition-all active:scale-95"
                >
                  <Search className="h-3.5 w-3.5" />
                  <span>Tìm kiếm</span>
                </button>
              </div>

              {/* Filter by Job */}
              <ModernSelect<'ALL' | number>
                value={schedJobFilter}
                onChange={(val) => {
                  setSchedJobFilter(val);
                  setSchedPage(1);
                }}
                options={[
                  { value: 'ALL', label: 'Tất cả chiến dịch Job' },
                  ...store.jobs.map((j) => ({
                    value: j.id,
                    label: j.title,
                    badge: j.department,
                    badgeColor: 'bg-sky-50 text-sky-700',
                  })),
                ]}
                placeholder="Chọn chiến dịch Job..."
                icon={Briefcase}
              />

              {/* Filter by Scorecard Status */}
              <ModernSelect<'ALL' | 'PENDING' | 'SUBMITTED' | 'UNLOCKED'>
                value={schedStatusFilter}
                onChange={(val) => {
                  setSchedStatusFilter(val);
                  setSchedPage(1);
                }}
                options={[
                  { value: 'ALL', label: 'Mọi trạng thái phiếu của bạn' },
                  {
                    value: 'PENDING',
                    label: 'Cần bạn chấm điểm',
                    badge: 'Pending',
                    badgeColor: 'bg-amber-50 text-amber-800',
                  },
                  {
                    value: 'SUBMITTED',
                    label: 'Bạn đã nộp bất biến',
                    badge: 'Submitted',
                    badgeColor: 'bg-emerald-50 text-emerald-700',
                  },
                  {
                    value: 'UNLOCKED',
                    label: 'Đã mở khóa 100% Hội đồng',
                    badge: 'Unlocked',
                    badgeColor: 'bg-violet-50 text-violet-700',
                  },
                ]}
                placeholder="Trạng thái phiếu..."
                icon={ClipboardCheck}
              />

              {/* Filter by Blind Lock */}
              <ModernSelect<'ALL' | 'LOCKED' | 'UNLOCKED'>
                value={schedBlindFilter}
                onChange={(val) => {
                  setSchedBlindFilter(val);
                  setSchedPage(1);
                }}
                options={[
                  { value: 'ALL', label: 'Mọi chế độ Blind Lock' },
                  {
                    value: 'LOCKED',
                    label: 'Đang khóa Blind Mode',
                    badge: 'D06 Lock',
                    badgeColor: 'bg-violet-50 text-violet-700',
                  },
                  {
                    value: 'UNLOCKED',
                    label: 'Đã mở khóa đồng thuận',
                    badge: '100% HĐ',
                    badgeColor: 'bg-emerald-50 text-emerald-700',
                  },
                ]}
                placeholder="Chế độ Blind Lock..."
                icon={Lock}
              />

              {(schedSearch ||
                schedJobFilter !== 'ALL' ||
                schedStatusFilter !== 'ALL' ||
                schedBlindFilter !== 'ALL') && (
                <button
                  type="button"
                  onClick={() => {
                    setSchedSearch('');
                    setSchedJobFilter('ALL');
                    setSchedStatusFilter('ALL');
                    setSchedBlindFilter('ALL');
                    setSchedPage(1);
                  }}
                  className="inline-flex cursor-pointer items-center gap-1 rounded-2xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-all active:scale-95"
                >
                  <RotateCcw className="h-3 w-3 text-slate-400" />
                  Đặt lại lọc
                </button>
              )}
            </div>
          </div>

          {/* VIEW 1: BENTO CARDS MODE */}
          {schedViewMode === 'CARDS' && (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {paginatedScheduleItems.map(
                ({ cand, job, mySheet, metrics, myWeightedScore, myKnockoutTriggered }) => (
                  <div
                    key={cand.id}
                    className="flex flex-col justify-between rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs transition-all hover:border-slate-300 hover:shadow-md"
                  >
                    <div>
                      {/* Status & Panel Progress Header */}
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-[11px] font-bold ring-1',
                            mySheet.submitted
                              ? 'bg-emerald-50 text-emerald-800 ring-emerald-200'
                              : 'bg-amber-50 text-amber-800 ring-amber-200',
                          )}
                        >
                          {mySheet.submitted ? (
                            <>
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                              Đã nộp phiếu bất biến
                            </>
                          ) : (
                            <>
                              <Clock className="h-3.5 w-3.5 text-amber-600" />
                              Cần bạn chấm điểm
                            </>
                          )}
                        </span>

                        <span
                          className={cn(
                            'inline-flex items-center gap-1 rounded-xl px-2.5 py-1 font-mono text-[11px] font-bold ring-1',
                            metrics.allSubmitted
                              ? 'bg-violet-50 text-violet-800 ring-violet-200'
                              : 'bg-slate-100 text-slate-700 ring-slate-200',
                          )}
                        >
                          {metrics.allSubmitted ? (
                            <Unlock className="h-3 w-3 text-violet-600" />
                          ) : (
                            <Lock className="h-3 w-3 text-slate-500" />
                          )}
                          HĐ: {metrics.submittedCount}/{metrics.panelSize}
                        </span>
                      </div>

                      {/* Candidate & Job Identity */}
                      <div className="mt-3">
                        <span className="inline-flex items-center gap-1 rounded-lg bg-sky-50 px-2.5 py-0.5 font-mono text-[10px] font-bold text-sky-700">
                          <Building2 className="h-3 w-3 text-sky-600" />
                          {job.title} ({job.department})
                        </span>
                        <h4 className="mt-1.5 text-base font-extrabold text-slate-900">
                          {cand.fullName}
                        </h4>
                        <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">
                          {cand.experience}
                        </p>
                      </div>

                      {/* Interview Schedule Box */}
                      <div className="mt-3.5 space-y-1.5 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3.5 font-mono text-[11px] text-slate-700">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-violet-600 shrink-0" />
                          <span className="font-bold text-slate-900">
                            {cand.interviewScheduledAt || 'Chưa xếp lịch'} (
                            {cand.interviewDurationMinutes} phút)
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Video className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                          <span className="truncate text-blue-700 underline">
                            {cand.meetingLink || cand.interviewLocation || 'Google Meet'}
                          </span>
                        </div>
                      </div>

                      {/* Personal Score Summary */}
                      <div className="mt-3 flex items-center justify-between rounded-2xl border border-slate-100 bg-white px-3.5 py-2 text-xs">
                        <span className="text-slate-500">Điểm phiếu của bạn:</span>
                        <div className="flex items-center gap-1.5">
                          {myKnockoutTriggered && (
                            <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-700">
                              Điểm liệt
                            </span>
                          )}
                          <span className="font-mono font-extrabold text-slate-900">
                            {myWeightedScore.toFixed(2)} / 5.0
                          </span>
                          <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-700">
                            {mySheet.recommendation}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Card Footer Actions */}
                    <div className="mt-4 space-y-2 border-t border-slate-100 pt-3.5">
                      <div className="grid grid-cols-3 gap-1.5">
                        <button
                          type="button"
                          onClick={() => downloadIcsFile(cand, job.title)}
                          className="inline-flex cursor-pointer items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-50 transition-all"
                          title="Tải tệp lịch phỏng vấn .ics"
                        >
                          <Download className="h-3.5 w-3.5 text-blue-600" />
                          Lịch .ics
                        </button>

                        <button
                          type="button"
                          onClick={() => setPrepModalCand({ cand, job, mySheet })}
                          className="inline-flex cursor-pointer items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-50 transition-all"
                        >
                          <BookOpen className="h-3.5 w-3.5 text-violet-600" />
                          Câu hỏi
                        </button>

                        <button
                          type="button"
                          onClick={() => setInspectModalCand({ cand, job, mySheet })}
                          className="inline-flex cursor-pointer items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-50 transition-all"
                        >
                          <Eye className="h-3.5 w-3.5 text-emerald-600" />
                          Xem phiếu
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          onSelectJobId(cand.jobId);
                          onSelectEvalCandidateId(cand.id);
                          onSelectSection('int-studio');
                        }}
                        className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-2xl border border-amber-300/80 bg-amber-500 hover:bg-amber-400 py-2.5 text-xs font-extrabold text-slate-950 shadow-xs transition-all active:scale-98"
                      >
                        <span>
                          {mySheet.submitted
                            ? 'Xem Trong Split-Screen Studio'
                            : 'Mở Split-Screen Studio Chấm Điểm'}
                        </span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ),
              )}
            </div>
          )}

          {/* VIEW 2: TABLE MODE */}
          {schedViewMode === 'TABLE' && (
            <div className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold text-slate-600 uppercase">
                      <th className="px-4 py-3.5">Ứng Viên & Kinh Nghiệm</th>
                      <th className="px-3.5 py-3.5">Chiến Dịch Job</th>
                      <th className="px-3.5 py-3.5">Lịch Phỏng Vấn</th>
                      <th className="px-3.5 py-3.5 text-center">Tiến Độ HĐ (Blind Lock)</th>
                      <th className="px-3.5 py-3.5 text-center">Phiếu Của Bạn</th>
                      <th className="px-4 py-3.5 text-right">Thao Tác Thẩm Định</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedScheduleItems.map(
                      ({ cand, job, mySheet, metrics, myWeightedScore }) => (
                        <tr key={cand.id} className="transition-colors hover:bg-slate-50/60">
                          <td className="px-4 py-3.5">
                            <p className="font-extrabold text-slate-900">{cand.fullName}</p>
                            <p className="font-mono text-[11px] text-slate-500">{cand.email}</p>
                          </td>
                          <td className="px-3.5 py-3.5">
                            <p className="font-bold text-slate-800">{job.title}</p>
                            <span className="inline-block rounded bg-sky-50 px-2 py-0.5 font-mono text-[10px] font-bold text-sky-700">
                              {job.department}
                            </span>
                          </td>
                          <td className="px-3.5 py-3.5 font-mono text-[11px]">
                            <p className="font-bold text-slate-800">
                              {cand.interviewScheduledAt || '—'}
                            </p>
                            <p className="text-blue-600 truncate max-w-[180px]">
                              {cand.meetingLink || cand.interviewLocation}
                            </p>
                          </td>
                          <td className="px-3.5 py-3.5 text-center">
                            <span
                              className={cn(
                                'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-mono text-[11px] font-bold',
                                metrics.allSubmitted
                                  ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200'
                                  : 'bg-violet-50 text-violet-800 ring-1 ring-violet-200',
                              )}
                            >
                              {metrics.allSubmitted ? '🔓' : '🔒'} {metrics.submittedCount}/
                              {metrics.panelSize}
                            </span>
                          </td>
                          <td className="px-3.5 py-3.5 text-center">
                            <div className="inline-flex flex-col items-center">
                              <span
                                className={cn(
                                  'rounded-full px-2.5 py-0.5 text-[10px] font-bold',
                                  mySheet.submitted
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-amber-100 text-amber-800',
                                )}
                              >
                                {mySheet.submitted ? '✓ Đã nộp' : '⏳ Chờ chấm'}
                              </span>
                              <span className="mt-0.5 font-mono text-[11px] font-bold text-slate-700">
                                S = {myWeightedScore.toFixed(2)} ({mySheet.recommendation})
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-right space-x-1.5">
                            <button
                              type="button"
                              onClick={() => setPrepModalCand({ cand, job, mySheet })}
                              className="cursor-pointer rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                            >
                              Câu hỏi
                            </button>
                            <button
                              type="button"
                              onClick={() => setInspectModalCand({ cand, job, mySheet })}
                              className="cursor-pointer rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                            >
                              Xem phiếu
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                onSelectJobId(cand.jobId);
                                onSelectEvalCandidateId(cand.id);
                                onSelectSection('int-studio');
                              }}
                              className="cursor-pointer rounded-xl border border-amber-300/80 bg-amber-500 hover:bg-amber-400 px-3 py-1.5 text-xs font-extrabold text-slate-950 shadow-2xs"
                            >
                              Chấm điểm →
                            </button>
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {filteredScheduleItems.length === 0 && (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center text-xs text-slate-500">
              <CalendarCheck2 className="mx-auto mb-2 h-8 w-8 text-slate-400" />
              <p className="text-sm font-bold text-slate-800">
                Không tìm thấy lịch phỏng vấn nào khớp với bộ lọc
              </p>
              <p className="mt-1">
                Hãy thử đặt lại bộ lọc hoặc chuyển sang chiến dịch tuyển dụng khác.
              </p>
            </div>
          )}

          {filteredScheduleItems.length > 0 && (
            <TablePagination
              currentPage={schedPage}
              pageSize={schedPageSize}
              totalItems={filteredScheduleItems.length}
              onPageChange={setSchedPage}
              onPageSizeChange={(sz) => {
                setSchedPageSize(sz);
                setSchedPage(1);
              }}
              itemName="buổi phỏng vấn"
            />
          )}
        </div>
      )}

      {/* =====================================================================
          SECTION 2: SPLIT-SCREEN SCORECARD STUDIO (int-studio)
         ===================================================================== */}
      {activeSection === 'int-studio' && (
        <div className="space-y-4">
          {/* Job Campaign Selector Toolbar for Studio */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-slate-200/90 bg-white px-5 py-3.5 shadow-xs">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-extrabold text-slate-700 flex items-center gap-1.5">
                <Briefcase className="h-4 w-4 text-violet-600" />
                Chiến dịch Job đang chấm:
              </span>
              <ModernSelect<number>
                value={selectedJob.id}
                onChange={(jid) => {
                  onSelectJobId(jid);
                  const firstCand = store.candidates.find((c) => c.jobId === jid);
                  if (firstCand) onSelectEvalCandidateId(firstCand.id);
                }}
                options={store.jobs.map((j) => ({
                  value: j.id,
                  label: j.title,
                  badge: j.department,
                  badgeColor: 'bg-sky-50 text-sky-700',
                }))}
                icon={Building2}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-xl bg-slate-100 px-3 py-1 font-mono font-bold text-slate-700">
                Ngưỡng đạt: {selectedJob.passScoreThreshold.toFixed(1)} / 5.0
              </span>
              <span className="rounded-xl bg-emerald-50 px-3 py-1 font-mono font-bold text-emerald-800 ring-1 ring-emerald-200">
                Tổng trọng số: {selectedJob.criteria.reduce((a, b) => a + b.weightPercent, 0)}%
              </span>
              <button
                type="button"
                onClick={() => onSelectSection('int-schedule')}
                className="cursor-pointer rounded-xl border border-slate-200 bg-white px-3 py-1 font-bold text-slate-700 hover:bg-slate-50"
              >
                ← Về Lịch Phỏng Vấn
              </button>
            </div>
          </div>

          <EvaluationStudioView
            currentUser={currentUser}
            jobTitle={selectedJob.title}
            passThreshold={selectedJob.passScoreThreshold}
            criteria={selectedJob.criteria}
            candidates={studioJobCandidates}
            selectedCandidateId={selectedEvalCandidateId}
            onSelectCandidate={onSelectEvalCandidateId}
            onUpdateSheetScore={onUpdateSheetScore}
            onUpdateSheetCriterionComment={onUpdateSheetCriterionComment}
            onUpdateSheetMeta={onUpdateSheetMeta}
            onSubmitSheet={onSubmitSheet}
          />
        </div>
      )}

      {/* =====================================================================
          SECTION 3: BAREM TIÊU CHÍ & LỊCH SỬ PHIẾU CHẤM (int-rubric)
         ===================================================================== */}
      {activeSection === 'int-rubric' && (
        <div className="space-y-5">
          {/* Part 1: BARS 1.0 - 5.0 Standard Guide */}
          <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs">
            <div className="border-b border-slate-100 pb-3.5">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Scale className="h-5 w-5 text-violet-600" />
                Khung Tham Chiếu Thang Điểm Chuẩn Hóa BARS (1.0 – 5.0) & Quy Tắc Điểm Liệt (D05)
              </h3>
              <p className="text-xs text-slate-500">
                Hướng dẫn định lượng điểm số thống nhất giữa các thành viên hội đồng nhằm giảm thiểu
                độ lệch chuẩn $\Delta_i \ge 2.0$.
              </p>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {BARS_ANCHORS.map((b) => (
                <div
                  key={b.score}
                  className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-3.5 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span
                        className={cn(
                          'rounded-xl px-2.5 py-0.5 font-mono text-xs font-black ring-1',
                          b.badgeClass,
                        )}
                      >
                        Mức {b.score} / 5.0
                      </span>
                    </div>
                    <p className="mt-2 text-xs font-extrabold text-slate-900">{b.title}</p>
                    <p className="mt-1 text-[11px] leading-relaxed text-slate-600">{b.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Part 2: Scorecard Archive Table */}
          <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <ClipboardCheck className="h-5 w-5 text-emerald-600" />
                  Nhật Ký & Lịch Sử Phiếu Chấm Điểm Của {currentUser.fullName} (
                  {filteredArchiveItems.length} phiếu)
                </h3>
                <p className="text-xs text-slate-500">
                  Tra cứu toàn bộ các phiếu chấm điểm độc lập, trạng thái khóa bất biến (S4.3) và đối
                  chiếu đồng thuận hội đồng.
                </p>
              </div>
            </div>

            {/* Filter Toolbar */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5">
                <div className="relative">
                  <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={archiveSearch}
                    onChange={(e) => {
                      setArchiveSearch(e.target.value);
                      setArchivePage(1);
                    }}
                    placeholder="Tìm ứng viên, vị trí, nhận xét..."
                    className="w-56 sm:w-64 rounded-2xl border border-slate-200/90 bg-white py-1.5 pr-8 pl-8 text-xs shadow-2xs transition-all focus:border-amber-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400/20"
                  />
                  {archiveSearch && (
                    <button
                      type="button"
                      onClick={() => {
                        setArchiveSearch('');
                        setArchivePage(1);
                      }}
                      className="absolute top-1/2 right-2.5 -translate-y-1/2 cursor-pointer rounded-full p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setArchivePage(1)}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-2xl border border-amber-300/80 bg-amber-500 hover:bg-amber-400 px-3.5 py-1.5 text-xs font-extrabold text-slate-950 shadow-xs transition-all active:scale-95"
                >
                  <Search className="h-3.5 w-3.5" />
                  <span>Tìm kiếm</span>
                </button>
              </div>

              <ModernSelect<'ALL' | number>
                value={archiveJobFilter}
                onChange={(val) => {
                  setArchiveJobFilter(val);
                  setArchivePage(1);
                }}
                options={[
                  { value: 'ALL', label: 'Tất cả chiến dịch Job' },
                  ...store.jobs.map((j) => ({
                    value: j.id,
                    label: j.title,
                  })),
                ]}
                icon={Briefcase}
              />

              <ModernSelect<'ALL' | RecommendationType>
                value={archiveRecFilter}
                onChange={(val) => {
                  setArchiveRecFilter(val);
                  setArchivePage(1);
                }}
                options={[
                  { value: 'ALL', label: 'Mọi mức khuyến nghị' },
                  {
                    value: 'STRONG_HIRE',
                    label: 'STRONG_HIRE (Tuyển gấp)',
                    badgeColor: 'bg-emerald-100 text-emerald-900',
                  },
                  {
                    value: 'HIRE',
                    label: 'HIRE (Đề xuất tuyển)',
                    badgeColor: 'bg-emerald-50 text-emerald-700',
                  },
                  {
                    value: 'NO_HIRE',
                    label: 'NO_HIRE (Không đạt)',
                    badgeColor: 'bg-amber-50 text-amber-800',
                  },
                  {
                    value: 'STRONG_NO_HIRE',
                    label: 'STRONG_NO_HIRE (Loại thẳng)',
                    badgeColor: 'bg-red-50 text-red-700',
                  },
                ]}
                icon={Award}
              />

              <ModernSelect<'ALL' | 'SUBMITTED' | 'PENDING'>
                value={archiveStatusFilter}
                onChange={(val) => {
                  setArchiveStatusFilter(val);
                  setArchivePage(1);
                }}
                options={[
                  { value: 'ALL', label: 'Mọi trạng thái nộp' },
                  {
                    value: 'SUBMITTED',
                    label: 'Đã nộp bất biến',
                    badge: 'Immutable',
                    badgeColor: 'bg-emerald-50 text-emerald-700',
                  },
                  {
                    value: 'PENDING',
                    label: 'Đang lưu nháp',
                    badge: 'Draft',
                    badgeColor: 'bg-amber-50 text-amber-800',
                  },
                ]}
                icon={Filter}
              />

              {(archiveSearch ||
                archiveJobFilter !== 'ALL' ||
                archiveRecFilter !== 'ALL' ||
                archiveStatusFilter !== 'ALL') && (
                <button
                  type="button"
                  onClick={() => {
                    setArchiveSearch('');
                    setArchiveJobFilter('ALL');
                    setArchiveRecFilter('ALL');
                    setArchiveStatusFilter('ALL');
                    setArchivePage(1);
                  }}
                  className="inline-flex cursor-pointer items-center gap-1 rounded-2xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  <RotateCcw className="h-3 w-3 text-slate-400" />
                  Đặt lại lọc
                </button>
              )}
            </div>

            {/* Archive Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold text-slate-600 uppercase">
                    <th className="px-3.5 py-3">Ứng Viên</th>
                    <th className="px-3.5 py-3">Vị Trí Tuyển Dụng</th>
                    <th className="px-3.5 py-3 text-center">Điểm Trọng Số Của Bạn</th>
                    <th className="px-3.5 py-3 text-center">Khuyến Nghị</th>
                    <th className="px-3.5 py-3">Nhận Xét Tổng Kết</th>
                    <th className="px-3.5 py-3 text-center">Trạng Thái Phiếu</th>
                    <th className="px-3.5 py-3 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedArchiveItems.map(
                    ({ cand, job, mySheet, myWeightedScore, myKnockoutTriggered }) => (
                      <tr key={cand.id} className="hover:bg-slate-50/60">
                        <td className="px-3.5 py-3">
                          <p className="font-extrabold text-slate-900">{cand.fullName}</p>
                          <p className="font-mono text-[10px] text-slate-400">
                            Vòng: {cand.stageCode}
                          </p>
                        </td>
                        <td className="px-3.5 py-3">
                          <p className="font-bold text-slate-800">{job.title}</p>
                          <p className="text-[11px] text-slate-500">Phòng {job.department}</p>
                        </td>
                        <td className="px-3.5 py-3 text-center">
                          <span
                            className={cn(
                              'font-mono text-sm font-black',
                              myKnockoutTriggered
                                ? 'text-red-600'
                                : myWeightedScore >= job.passScoreThreshold
                                  ? 'text-emerald-700'
                                  : 'text-amber-700',
                            )}
                          >
                            {myWeightedScore.toFixed(2)} / 5.0
                          </span>
                          {myKnockoutTriggered && (
                            <span className="ml-1.5 rounded bg-red-100 px-1.5 py-0.5 text-[9px] font-bold text-red-700">
                              Knock-out
                            </span>
                          )}
                        </td>
                        <td className="px-3.5 py-3 text-center">
                          <span className="rounded-lg bg-slate-100 px-2.5 py-1 font-mono text-[11px] font-bold text-slate-800">
                            {mySheet.recommendation}
                          </span>
                        </td>
                        <td className="px-3.5 py-3 max-w-xs truncate text-slate-600 italic">
                          "{mySheet.comment || 'Chưa nhập nhận xét tổng quát'}"
                        </td>
                        <td className="px-3.5 py-3 text-center">
                          <span
                            className={cn(
                              'rounded-full px-2.5 py-0.5 text-[10px] font-bold',
                              mySheet.submitted
                                ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200'
                                : 'bg-amber-50 text-amber-800 ring-1 ring-amber-200',
                            )}
                          >
                            {mySheet.submitted
                              ? `✓ Bất biến (${mySheet.submittedAt || 'Đã khóa'})`
                              : '⏳ Bản nháp'}
                          </span>
                        </td>
                        <td className="px-3.5 py-3 text-right space-x-1.5">
                          <button
                            type="button"
                            onClick={() => setInspectModalCand({ cand, job, mySheet })}
                            className="cursor-pointer rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                          >
                            Chi tiết phiếu
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              onSelectJobId(cand.jobId);
                              onSelectEvalCandidateId(cand.id);
                              onSelectSection('int-studio');
                            }}
                            className="cursor-pointer rounded-xl border border-amber-300/80 bg-amber-500 hover:bg-amber-400 px-3 py-1.5 text-xs font-extrabold text-slate-950"
                          >
                            Mở Studio →
                          </button>
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>

            {filteredArchiveItems.length > 0 && (
              <TablePagination
                currentPage={archivePage}
                pageSize={archivePageSize}
                totalItems={filteredArchiveItems.length}
                onPageChange={setArchivePage}
                onPageSizeChange={(sz) => {
                  setArchivePageSize(sz);
                  setArchivePage(1);
                }}
                itemName="phiếu chấm điểm"
              />
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          ISOLATED MODAL 1: BỘ CÂU HỎI & HỒ SƠ CHUẨN BỊ PHỎNG VẤN (prepModalCand)
         ===================================================================== */}
      <AnimatedSpringDialog
        open={Boolean(prepModalCand)}
        onOpenChange={(open) => !open && setPrepModalCand(null)}
        title={`Cẩm Nang Phỏng Vấn & Hồ Sơ: ${prepModalCand?.cand.fullName ?? ''}`}
        subtitle={`Vị trí: ${prepModalCand?.job.title ?? ''} • Lịch hẹn: ${prepModalCand?.cand.interviewScheduledAt ?? 'Chưa xếp lịch'}`}
      >
        {prepModalCand && (
          <div className="space-y-4 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-violet-200 bg-gradient-to-r from-violet-50/90 via-indigo-50/50 to-white p-4">
              <div>
                <p className="font-bold text-slate-900">
                  Phòng họp trực tuyến:{' '}
                  <span className="font-mono text-violet-700 underline">
                    {prepModalCand.cand.meetingLink || 'Google Meet'}
                  </span>
                </p>
                <p className="mt-0.5 text-[11px] text-slate-600">
                  Kinh nghiệm ứng viên: {prepModalCand.cand.experience}
                </p>
              </div>
              <button
                type="button"
                onClick={() => downloadIcsFile(prepModalCand.cand, prepModalCand.job.title)}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-violet-600 px-3.5 py-2 font-bold text-white hover:bg-violet-700"
              >
                <Download className="h-3.5 w-3.5" />
                Tải Lịch .ics
              </button>
            </div>

            <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
              <p className="font-bold text-slate-800">
                Danh sách tiêu chí Barem & Câu hỏi gợi ý thẩm định ({prepModalCand.job.criteria.length}{' '}
                tiêu chí = 100%):
              </p>
              {prepModalCand.job.criteria.map((c, idx) => (
                <div
                  key={c.id}
                  className="rounded-2xl border border-slate-200 bg-white p-3.5 space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-slate-900">
                      {idx + 1}. {c.name} (Trọng số {c.weightPercent}%)
                    </span>
                    {c.isKnockout && (
                      <span className="rounded bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">
                        Điểm liệt nếu ≤ 1.5
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-600">
                    • Câu hỏi gợi ý: Yêu cầu ứng viên trình bày tình huống thực tế (STAR) liên quan
                    đến <strong>{c.name}</strong> và cách đo lường kết quả đạt được.
                  </p>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setPrepModalCand(null)}
                className="cursor-pointer rounded-2xl border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-600 hover:bg-slate-50"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = prepModalCand;
                  setPrepModalCand(null);
                  onSelectJobId(target.cand.jobId);
                  onSelectEvalCandidateId(target.cand.id);
                  onSelectSection('int-studio');
                }}
                className="cursor-pointer rounded-2xl border border-amber-300/80 bg-amber-500 hover:bg-amber-400 px-5 py-2 font-extrabold text-slate-950 shadow-xs"
              >
                Vào Studio Chấm Điểm Ngay →
              </button>
            </div>
          </div>
        )}
      </AnimatedSpringDialog>

      {/* =====================================================================
          ISOLATED MODAL 2: CHI TIẾT PHIẾU ĐIỂM & ĐỐI CHIẾU HỘI ĐỒNG (inspectModalCand)
         ===================================================================== */}
      <AnimatedSpringDialog
        open={Boolean(inspectModalCand)}
        onOpenChange={(open) => !open && setInspectModalCand(null)}
        title={`Chi Tiết Phiếu Đánh Giá — ${inspectModalCand?.cand.fullName ?? ''}`}
        subtitle={`Chiến dịch: ${inspectModalCand?.job.title ?? ''} • Giám khảo: ${inspectModalCand?.mySheet.interviewerName ?? ''}`}
      >
        {inspectModalCand &&
          (() => {
            const m = computeCandidateMetrics(
              inspectModalCand.cand,
              inspectModalCand.job.criteria,
            );
            const myTotal = inspectModalCand.job.criteria.reduce(
              (acc, c) =>
                acc +
                (c.weightPercent / 100) * (inspectModalCand.mySheet.scores[c.id] ?? 3.0),
              0,
            );

            return (
              <div className="space-y-4 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
                  <div>
                    <span className="text-[11px] text-slate-500">Điểm tổng hợp phiếu của bạn:</span>
                    <p className="font-mono text-base font-black text-blue-700">
                      S = {myTotal.toFixed(2)} / 5.0 ({inspectModalCand.mySheet.recommendation})
                    </p>
                  </div>
                  <span
                    className={cn(
                      'rounded-xl px-3 py-1 font-mono text-[11px] font-bold',
                      inspectModalCand.mySheet.submitted
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800',
                    )}
                  >
                    {inspectModalCand.mySheet.submitted
                      ? '✓ ĐÃ NỘP BẤT BIẾN (S4.3)'
                      : '⏳ BẢN NHÁP CHƯA NỘP'}
                  </span>
                </div>

                <div className="space-y-2">
                  <p className="font-bold text-slate-800">Chi tiết điểm từng tiêu chí của bạn:</p>
                  {inspectModalCand.job.criteria.map((c) => {
                    const val = inspectModalCand.mySheet.scores[c.id] ?? 3.0;
                    const note = inspectModalCand.mySheet.criterionComments?.[c.id];
                    return (
                      <div
                        key={c.id}
                        className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900">
                            {c.name} ({c.weightPercent}%)
                          </span>
                          <span className="font-mono font-extrabold text-blue-700">
                            {val.toFixed(1)} / 5.0
                          </span>
                        </div>
                        {note && <p className="mt-1 text-[11px] text-slate-500 italic">"{note}"</p>}
                      </div>
                    );
                  })}
                </div>

                {/* Blind Lock Status for Other Panelists */}
                <div
                  className={cn(
                    'rounded-2xl border p-3.5',
                    m.allSubmitted
                      ? 'border-emerald-200 bg-emerald-50/70'
                      : 'border-violet-200 bg-violet-50/70',
                  )}
                >
                  <p className="font-bold text-slate-900">
                    {m.allSubmitted
                      ? `🔓 Đã mở khóa đồng thuận (${m.submittedCount}/${m.panelSize} phiếu) — Điểm TB Hội đồng: ${m.overallScore?.toFixed(2) ?? '—'}`
                      : `🔒 Chốt chặn Blind Lock đang bật (${m.submittedCount}/${m.panelSize} phiếu): Điểm của giám khảo khác được giữ kín cho đến khi 100% hội đồng hoàn tất.`}
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setInspectModalCand(null)}
                    className="cursor-pointer rounded-2xl border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Đóng
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const target = inspectModalCand;
                      setInspectModalCand(null);
                      onSelectJobId(target.cand.jobId);
                      onSelectEvalCandidateId(target.cand.id);
                      onSelectSection('int-studio');
                    }}
                    className="cursor-pointer rounded-2xl border border-amber-300/80 bg-amber-500 hover:bg-amber-400 px-5 py-2 font-extrabold text-slate-950 shadow-xs"
                  >
                    Mở Trong Split-Screen Studio →
                  </button>
                </div>
              </div>
            );
          })()}
      </AnimatedSpringDialog>
    </div>
  );
};
