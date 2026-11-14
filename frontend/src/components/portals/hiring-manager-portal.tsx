import {
  AlertTriangle,
  Award,
  Briefcase,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  Filter,
  MessageSquare,
  Plus,
  Scale,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Sparkles,
  TrendingUp,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { GuardViolationState } from '@/components/animate-ui/guard-dialog';
import { ModernSelect } from '@/components/animate-ui/modern-select';
import { EvaluationStudioView } from '@/components/portals/evaluation-studio';
import {
  AccountUser,
  AtsPersistentState,
  CandidateCardData,
  computeCandidateMetrics,
  CriterionDef,
  exportRankingToCsv,
  JobItem,
  RecommendationType,
  RequisitionItem,
  StageCode,
} from '@/lib/store';
import { cn } from '@/lib/utils';

export interface HiringManagerPortalViewProps {
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
  // Evaluation Studio delegated props
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

const formatNow = () => {
  const d = new Date();
  return `${d.toISOString().slice(0, 10)} ${d.toTimeString().slice(0, 5)}`;
};

export const HiringManagerPortalView: React.FC<HiringManagerPortalViewProps> = ({
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
  selectedEvalCandidateId,
  onSelectEvalCandidateId,
  onUpdateSheetScore,
  onUpdateSheetCriterionComment,
  onUpdateSheetMeta,
  onSubmitSheet,
}) => {
  const hmDepartment = currentUser.department || 'Engineering';

  // State: Filter offers
  const [offerScopeFilter, setOfferScopeFilter] = useState<'MY_DEPT' | 'ALL'>('MY_DEPT');
  const [offerSearch, setOfferSearch] = useState('');

  // State: Create requisition
  const [newReqTitle, setNewReqTitle] = useState('');
  const [newReqHeadcount, setNewReqHeadcount] = useState(1);
  const [newReqSalary, setNewReqSalary] = useState('35.000.000 - 50.000.000 VNĐ');
  const [newReqJustification, setNewReqJustification] = useState('');
  const [showReqForm, setShowReqForm] = useState(false);

  // State: Reject Offer Modal
  const [rejectOfferCandidate, setRejectOfferCandidate] = useState<CandidateCardData | null>(null);
  const [rejectOfferReason, setRejectOfferReason] = useState('');

  // State: Calibration Modal / Drawer
  const [calibratingCandidate, setCalibratingCandidate] = useState<CandidateCardData | null>(null);
  const [calibrationNoteInput, setCalibrationNoteInput] = useState('');

  // Department Jobs
  const departmentJobs = useMemo(() => {
    return store.jobs.filter(
      (j) =>
        j.department.toLowerCase().includes(hmDepartment.toLowerCase()) ||
        store.requisitions.some(
          (r) =>
            r.id === j.requisitionId &&
            r.department.toLowerCase().includes(hmDepartment.toLowerCase()),
        ),
    );
  }, [store.jobs, store.requisitions, hmDepartment]);

  // Department Requisitions
  const departmentRequisitions = useMemo(() => {
    return store.requisitions.filter(
      (r) =>
        r.department.toLowerCase().includes(hmDepartment.toLowerCase()) ||
        r.requestedBy.toLowerCase().includes(currentUser.fullName.toLowerCase()),
    );
  }, [store.requisitions, hmDepartment, currentUser.fullName]);

  // Department Candidates
  const departmentCandidates = useMemo(() => {
    const jobIds = new Set(departmentJobs.map((j) => j.id));
    return store.candidates.filter((c) => jobIds.has(c.jobId));
  }, [store.candidates, departmentJobs]);

  // All pending offers
  const allOfferCandidates = useMemo(() => {
    return store.candidates.filter((c) => c.stageCode === 'OFFER');
  }, [store.candidates]);

  // Department pending offers
  const departmentOfferCandidates = useMemo(() => {
    const jobIds = new Set(departmentJobs.map((j) => j.id));
    return allOfferCandidates.filter((c) => jobIds.has(c.jobId));
  }, [allOfferCandidates, departmentJobs]);

  const displayedOffers = useMemo(() => {
    const source = offerScopeFilter === 'MY_DEPT' ? departmentOfferCandidates : allOfferCandidates;
    if (!offerSearch.trim()) return source;
    const q = offerSearch.toLowerCase();
    return source.filter(
      (c) =>
        c.fullName.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.offerSalary.toLowerCase().includes(q),
    );
  }, [offerScopeFilter, departmentOfferCandidates, allOfferCandidates, offerSearch]);

  // Department Headcount KPIs
  const totalTargetHeadcount = useMemo(() => {
    return departmentJobs.reduce((sum, j) => sum + j.headcount, 0);
  }, [departmentJobs]);

  const totalFilledHeadcount = useMemo(() => {
    return departmentJobs.reduce((sum, j) => sum + j.filledCount, 0);
  }, [departmentJobs]);

  const departmentVarianceCandidates = useMemo(() => {
    return departmentCandidates.filter((c) => {
      const cJob = store.jobs.find((j) => j.id === c.jobId) ?? selectedJob;
      const m = computeCandidateMetrics(c, cJob.criteria);
      return m.hasVarianceAlert || c.calibrated;
    });
  }, [departmentCandidates, store.jobs, selectedJob]);

  // Handler: Approve / Revoke Offer
  const handleToggleApproveOffer = (cand: CandidateCardData) => {
    const nextApproved = !cand.offerApprovedByHm;
    const ts = formatNow();

    setStore((prev) => ({
      ...prev,
      candidates: prev.candidates.map((c) =>
        c.id === cand.id
          ? {
              ...c,
              offerApprovedByHm: nextApproved,
              offerApprovedByName: nextApproved ? currentUser.fullName : undefined,
              offerApprovedAt: nextApproved ? ts : undefined,
              logs: [
                ...c.logs,
                {
                  id: Date.now(),
                  fromStageCode: 'OFFER',
                  toStageCode: 'OFFER',
                  actorName: currentUser.fullName,
                  actorRole: currentUser.role,
                  note: nextApproved
                    ? `Hiring Manager (${currentUser.fullName}) đã phê duyệt Offer (S3.20, D11)`
                    : `Hiring Manager (${currentUser.fullName}) đã hủy phê duyệt Offer`,
                  createdAt: ts,
                },
              ],
            }
          : c,
      ),
    }));

    appendAudit(
      'OFFER_APPROVAL',
      `Hiring Manager ${nextApproved ? 'phê duyệt' : 'hủy duyệt'} Offer cho ứng viên ${cand.fullName}`,
    );
  };

  // Handler: Reject Offer
  const handleConfirmRejectOffer = () => {
    if (!rejectOfferCandidate) return;
    const reason = rejectOfferReason.trim();
    if (!reason) {
      onTriggerViolation({
        code: 'GUARD_REJECT_REASON_REQUIRED',
        message: 'Vui lòng nhập lý do từ chối hoặc điều chỉnh Offer',
        candidateName: rejectOfferCandidate.fullName,
        fromStageName: 'Vòng OFFER',
        toStageName: 'Từ chối Offer',
      });
      return;
    }

    const ts = formatNow();
    setStore((prev) => ({
      ...prev,
      candidates: prev.candidates.map((c) =>
        c.id === rejectOfferCandidate.id
          ? {
              ...c,
              offerApprovedByHm: false,
              offerApprovedByName: undefined,
              offerApprovedAt: undefined,
              logs: [
                ...c.logs,
                {
                  id: Date.now(),
                  fromStageCode: 'OFFER',
                  toStageCode: 'OFFER',
                  actorName: currentUser.fullName,
                  actorRole: currentUser.role,
                  note: `Hiring Manager từ chối duyệt Offer: "${reason}"`,
                  createdAt: ts,
                },
              ],
            }
          : c,
      ),
    }));

    appendAudit(
      'OFFER_REJECTED_BY_HM',
      `Hiring Manager từ chối Offer của ${rejectOfferCandidate.fullName}: ${reason}`,
    );
    setRejectOfferCandidate(null);
    setRejectOfferReason('');
  };

  // Handler: Submit new Requisition
  const handleSubmitRequisition = (e: React.FormEvent) => {
    e.preventDefault();
    const title = newReqTitle.trim();
    if (!title) return;
    if (newReqHeadcount <= 0) {
      onTriggerViolation({
        code: 'REQ_INVALID_HEADCOUNT',
        message: 'Số lượng định biên (headcount) phải là số nguyên dương ≥ 1',
        candidateName: currentUser.fullName,
        fromStageName: 'Định biên phòng ban',
        toStageName: title,
      });
      return;
    }

    const newReqId = Date.now();
    const newReqItem: RequisitionItem = {
      id: newReqId,
      title,
      department: hmDepartment,
      requestedBy: currentUser.fullName,
      headcount: newReqHeadcount,
      filledCount: 0,
      salaryRange: newReqSalary.trim() || 'Thỏa thuận',
      status: 'PENDING',
      decisionNote: newReqJustification.trim()
        ? `Lý do tuyển: ${newReqJustification.trim()}`
        : undefined,
      createdAt: formatNow().slice(0, 10),
    };

    setStore((prev) => ({
      ...prev,
      requisitions: [newReqItem, ...prev.requisitions],
    }));

    appendAudit(
      'CREATE_REQUISITION',
      `Hiring Manager ${currentUser.fullName} gửi yêu cầu định biên mới: "${title}" (${newReqHeadcount} người) cho phòng ${hmDepartment}`,
    );

    setNewReqTitle('');
    setNewReqHeadcount(1);
    setNewReqSalary('35.000.000 - 50.000.000 VNĐ');
    setNewReqJustification('');
    setShowReqForm(false);
  };

  // Handler: Submit Calibration Note
  const handleSaveCalibrationNote = () => {
    if (!calibratingCandidate) return;
    const note = calibrationNoteInput.trim();
    if (note.length < 10) {
      onTriggerViolation({
        code: 'GUARD_VARIANCE_UNRESOLVED',
        message: 'Biên bản Calibration yêu cầu nội dung tối thiểu 10 ký tự (D05)',
        candidateName: calibratingCandidate.fullName,
        fromStageName: 'Hội đồng phỏng vấn',
        toStageName: 'Biên bản Calibration',
      });
      return;
    }

    const ts = formatNow();
    setStore((prev) => ({
      ...prev,
      candidates: prev.candidates.map((c) =>
        c.id === calibratingCandidate.id
          ? {
              ...c,
              calibrated: true,
              calibrationNote: note,
              calibratedByName: currentUser.fullName,
              calibratedAt: ts,
              logs: [
                ...c.logs,
                {
                  id: Date.now(),
                  fromStageCode: c.stageCode,
                  toStageCode: c.stageCode,
                  actorName: currentUser.fullName,
                  actorRole: currentUser.role,
                  note: `Họp Calibration: "${note}" (Xử lý lệch điểm D05)`,
                  createdAt: ts,
                },
              ],
            }
          : c,
      ),
    }));

    appendAudit(
      'CALIBRATION_SIGNED',
      `Hiring Manager ${currentUser.fullName} đã ký biên bản Calibration cho ứng viên ${calibratingCandidate.fullName}: "${note}"`,
    );

    setCalibratingCandidate(null);
    setCalibrationNoteInput('');
  };

  return (
    <div className="space-y-6">
      {/* =========================================================================
          TOP EXECUTIVE HERO: HIRING MANAGER DEPARTMENT COCKPIT
         ========================================================================= */}
      <div className="relative overflow-hidden rounded-3xl border border-emerald-300/40 bg-gradient-to-br from-emerald-950 via-teal-900 to-slate-950 p-6 text-white shadow-xl sm:p-8">
        <div className="absolute right-0 top-0 -mt-10 -mr-10 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/20 px-3 py-1 font-mono text-[11px] font-bold tracking-wider text-emerald-300 uppercase ring-1 ring-emerald-400/30">
                <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                DEPARTMENT HIRING WORKSPACE (S3.19, S3.20, D11)
              </span>
              <span className="rounded-lg bg-white/10 px-3 py-1 font-mono text-[11px] font-semibold text-slate-300">
                Phòng ban: {hmDepartment}
              </span>
            </div>
            <h1 className="mt-3 text-2xl font-black tracking-tight text-white sm:text-3xl">
              Không Gian Quản Lý Tuyển Dụng Bộ Phận
            </h1>
            <p className="mt-1.5 max-w-2xl text-xs text-emerald-100/80 leading-relaxed sm:text-sm">
              Xin chào, <strong>{currentUser.fullName}</strong>. Tại đây bạn nắm quyền phê duyệt
              chính thức các đề nghị tuyển dụng (Offer), theo dõi định biên nhân sự, và chủ trì giải
              quyết lệch điểm phỏng vấn của phòng {hmDepartment}.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => onSelectSection('hm-offers')}
              className={cn(
                'cursor-pointer inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all shadow-sm',
                activeSection === 'hm-offers'
                  ? 'bg-emerald-400 text-slate-950 shadow-emerald-400/30'
                  : 'bg-white/10 text-white hover:bg-white/20',
              )}
            >
              <CheckCircle2 className="h-4 w-4" />
              Duyệt Offer ({departmentOfferCandidates.length})
            </button>
            <button
              type="button"
              onClick={() => onSelectSection('hm-requisitions')}
              className={cn(
                'cursor-pointer inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all shadow-sm',
                activeSection === 'hm-requisitions'
                  ? 'bg-emerald-400 text-slate-950 shadow-emerald-400/30'
                  : 'bg-white/10 text-white hover:bg-white/20',
              )}
            >
              <FileCheck2 className="h-4 w-4" />
              Định Biên ({departmentRequisitions.length})
            </button>
            <button
              type="button"
              onClick={() => onSelectSection('hm-pipeline')}
              className={cn(
                'cursor-pointer inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all shadow-sm',
                activeSection === 'hm-pipeline'
                  ? 'bg-emerald-400 text-slate-950 shadow-emerald-400/30'
                  : 'bg-white/10 text-white hover:bg-white/20',
              )}
            >
              <Users className="h-4 w-4" />
              Tiến Độ Ứng Viên ({departmentCandidates.length})
            </button>
            <button
              type="button"
              onClick={() => onSelectSection('hm-calibration')}
              className={cn(
                'cursor-pointer inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all shadow-sm',
                activeSection === 'hm-calibration'
                  ? 'bg-emerald-400 text-slate-950 shadow-emerald-400/30'
                  : 'bg-white/10 text-white hover:bg-white/20',
              )}
            >
              <Scale className="h-4 w-4" />
              Calibration
            </button>
          </div>
        </div>

        {/* 4 KPI METRIC PILLS */}
        <div className="mt-6 grid grid-cols-2 gap-3 border-t border-emerald-500/20 pt-6 sm:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xs">
            <span className="text-[11px] font-semibold text-emerald-200/70 uppercase">
              Chỉ Tiêu Định Biên (Headcount)
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-mono text-2xl font-black text-white tabular-nums">
                {totalTargetHeadcount}
              </span>
              <span className="text-xs text-emerald-300">chỉ tiêu</span>
            </div>
            <p className="mt-1 text-[11px] text-slate-400">Trên {departmentJobs.length} vị trí</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xs">
            <span className="text-[11px] font-semibold text-emerald-200/70 uppercase">
              Đã Tuyển Thành Công (HIRED)
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-mono text-2xl font-black text-emerald-300 tabular-nums">
                {totalFilledHeadcount}
              </span>
              <span className="text-xs text-emerald-200">
                / {totalTargetHeadcount}{' '}
                {totalTargetHeadcount > 0
                  ? `(${Math.round((totalFilledHeadcount / totalTargetHeadcount) * 100)}%)`
                  : ''}
              </span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full bg-emerald-400 rounded-full"
                style={{
                  width: `${
                    totalTargetHeadcount > 0
                      ? Math.min(100, (totalFilledHeadcount / totalTargetHeadcount) * 100)
                      : 0
                  }%`,
                }}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xs">
            <span className="text-[11px] font-semibold text-emerald-200/70 uppercase">
              Offer Cần Phê Duyệt
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-mono text-2xl font-black text-amber-300 tabular-nums">
                {departmentOfferCandidates.filter((c) => !c.offerApprovedByHm).length}
              </span>
              <span className="text-xs text-amber-200">hồ sơ chờ duyệt</span>
            </div>
            <p className="mt-1 text-[11px] text-amber-300/80">Cần phê duyệt để mở khóa HIRED</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xs">
            <span className="text-[11px] font-semibold text-emerald-200/70 uppercase">
              Lệch Điểm Cần Họp (Δ ≥ 2.0)
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-mono text-2xl font-black text-violet-300 tabular-nums">
                {departmentVarianceCandidates.filter((c) => !c.calibrated).length}
              </span>
              <span className="text-xs text-violet-200">cần calibration</span>
            </div>
            <p className="mt-1 text-[11px] text-violet-300/80">Ký biên bản giải phóng qua OFFER</p>
          </div>
        </div>
      </div>

      {/* =========================================================================
          SECTION 1: HM-OFFERS (OFFER APPROVAL QUEUE)
         ========================================================================= */}
      {activeSection === 'hm-offers' && (
        <div className="space-y-5">
          {/* Controls bar */}
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setOfferScopeFilter('MY_DEPT')}
                className={cn(
                  'cursor-pointer rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all',
                  offerScopeFilter === 'MY_DEPT'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100',
                )}
              >
                Phòng {hmDepartment} ({departmentOfferCandidates.length})
              </button>
              <button
                type="button"
                onClick={() => setOfferScopeFilter('ALL')}
                className={cn(
                  'cursor-pointer rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all',
                  offerScopeFilter === 'ALL'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100',
                )}
              >
                Tất cả phòng ban ({allOfferCandidates.length})
              </button>
            </div>

            <div className="relative sm:w-72">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={offerSearch}
                onChange={(e) => setOfferSearch(e.target.value)}
                placeholder="Tìm ứng viên, mức lương..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs outline-none focus:border-emerald-500 focus:bg-white"
              />
            </div>
          </div>

          {displayedOffers.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-xs">
              <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-400" />
              <h3 className="mt-3 text-base font-bold text-slate-900">
                Không Có Đề Nghị Nhận Việc Nào Cần Duyệt
              </h3>
              <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
                Hiện tại không có ứng viên nào đang ở vòng OFFER cần duyệt cho phạm vi lựa chọn này.
                Các ứng viên phỏng vấn đạt ngưỡng sẽ được HR đề xuất vào đây.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
              {displayedOffers.map((cand) => {
                const candJob = store.jobs.find((j) => j.id === cand.jobId) ?? selectedJob;
                const m = computeCandidateMetrics(cand, candJob.criteria);
                const isPassedThreshold =
                  m.overallScore !== null && m.overallScore >= candJob.passScoreThreshold;

                return (
                  <div
                    key={cand.id}
                    className={cn(
                      'flex flex-col justify-between rounded-3xl border p-6 transition-all shadow-xs',
                      cand.offerApprovedByHm
                        ? 'border-emerald-300 bg-emerald-50/20'
                        : 'border-slate-200 bg-white hover:border-emerald-300/80',
                    )}
                  >
                    <div>
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-md bg-emerald-100 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-800">
                              {candJob.title}
                            </span>
                            <span className="font-mono text-[10px] text-slate-400">
                              Phòng: {candJob.department}
                            </span>
                            {cand.isReturningCandidate && (
                              <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                                Ứng viên cũ
                              </span>
                            )}
                          </div>
                          <h3 className="mt-2 text-lg font-extrabold text-slate-900">
                            {cand.fullName}
                          </h3>
                          <p className="text-xs text-slate-500">{cand.email} · {cand.phone}</p>
                        </div>

                        {/* Score pill */}
                        <div className="text-right">
                          <span
                            className={cn(
                              'inline-block rounded-2xl px-3.5 py-1.5 font-mono text-base font-extrabold tabular-nums shadow-2xs',
                              isPassedThreshold
                                ? 'bg-emerald-600 text-white'
                                : 'bg-amber-600 text-white',
                            )}
                          >
                            S = {m.overallScore !== null ? m.overallScore.toFixed(2) : '—'} / 5.00
                          </span>
                          <p className="mt-1 text-[10px] font-semibold text-slate-500">
                            Ngưỡng chuẩn: ≥ {candJob.passScoreThreshold.toFixed(2)}
                          </p>
                        </div>
                      </div>

                      {/* Offer Details Grid */}
                      <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-xs space-y-2">
                        <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                          <span className="font-semibold text-slate-600">Mức lương đề nghị:</span>
                          <span className="font-mono text-sm font-extrabold text-emerald-700">
                            {cand.offerSalary}
                          </span>
                        </div>
                        {cand.offerStartDate && (
                          <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                            <span className="font-semibold text-slate-600">Ngày nhận việc:</span>
                            <span className="font-medium text-slate-800">
                              {cand.offerStartDate}
                            </span>
                          </div>
                        )}
                        {cand.offerBenefits && (
                          <div className="border-b border-slate-200/60 pb-2">
                            <span className="font-semibold text-slate-600">Phúc lợi bổ sung:</span>
                            <p className="mt-0.5 text-slate-700">{cand.offerBenefits}</p>
                          </div>
                        )}
                        {cand.calibrationNote && (
                          <div className="rounded-xl bg-amber-50 p-2.5 text-amber-900 border border-amber-200/80">
                            <span className="font-bold">Biên bản Calibration:</span>{' '}
                            <span>"{cand.calibrationNote}"</span>
                          </div>
                        )}
                      </div>

                      {/* Committee Recommendation Preview */}
                      <div className="mt-4">
                        <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                          Đánh Giá Của Hội Đồng ({cand.sheets.length} Giám Khảo):
                        </p>
                        <div className="mt-2 space-y-1.5">
                          {cand.sheets.map((s, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between rounded-xl border border-slate-100 bg-white p-2.5 text-[11px]"
                            >
                              <div className="flex items-center gap-2">
                                <UserCheck className="h-3.5 w-3.5 text-slate-400" />
                                <span className="font-bold text-slate-800">
                                  {s.interviewerName}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span
                                  className={cn(
                                    'rounded px-2 py-0.5 font-bold',
                                    s.recommendation === 'STRONG_HIRE'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : s.recommendation === 'HIRE'
                                        ? 'bg-blue-100 text-blue-800'
                                        : 'bg-red-100 text-red-800',
                                  )}
                                >
                                  {s.recommendation}
                                </span>
                                {s.comment && (
                                  <span className="text-slate-500 italic max-w-xs truncate">
                                    "{s.comment}"
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Card Footer Actions */}
                    <div className="mt-6 border-t border-slate-100 pt-4 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        {cand.offerApprovedByHm ? (
                          <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            Đã phê duyệt bởi {cand.offerApprovedByName || currentUser.fullName}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600">
                            <Clock className="h-3.5 w-3.5" />
                            Chờ bạn phê duyệt để mở khóa chốt HIRED
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onOpenCandidate360(cand.id)}
                          className="cursor-pointer rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                        >
                          Hồ sơ 360°
                        </button>

                        {!cand.offerApprovedByHm && (
                          <button
                            type="button"
                            onClick={() => {
                              setRejectOfferCandidate(cand);
                              setRejectOfferReason('');
                            }}
                            className="cursor-pointer rounded-xl border border-red-200 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50"
                          >
                            Từ chối / Chỉnh sửa
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleToggleApproveOffer(cand)}
                          className={cn(
                            'cursor-pointer rounded-xl px-4 py-2 text-xs font-bold text-white shadow-md transition-all',
                            cand.offerApprovedByHm
                              ? 'bg-slate-700 hover:bg-slate-800'
                              : 'bg-emerald-600 shadow-emerald-600/30 hover:bg-emerald-700',
                          )}
                        >
                          {cand.offerApprovedByHm ? 'Hủy phê duyệt' : '✓ Phê Duyệt Offer Ngay'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          SECTION 2: HM-REQUISITIONS (DEPARTMENT HEADCOUNT & REQUISITIONS)
         ========================================================================= */}
      {activeSection === 'hm-requisitions' && (
        <div className="space-y-6">
          {/* Top Actions Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-xs">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                Phiếu Yêu Cầu Định Biên Tuyển Dụng Phòng {hmDepartment}
              </h2>
              <p className="text-xs text-slate-500">
                Hiring Manager tạo yêu cầu định biên (Headcount); HR phê duyệt để bắt đầu khởi tạo
                chiến dịch Job (liên kết 1–1 theo D14).
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowReqForm(!showReqForm)}
              className="cursor-pointer inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-emerald-600/25 shadow-md hover:bg-emerald-700"
            >
              <Plus className="h-4 w-4" />
              {showReqForm ? 'Đóng Form' : '+ Tạo Yêu Cầu Định Biên Mới'}
            </button>
          </div>

          {/* Form tạo mới Requisition */}
          {showReqForm && (
            <form
              onSubmit={handleSubmitRequisition}
              className="rounded-3xl border border-emerald-300 bg-emerald-50/40 p-6 shadow-sm space-y-4"
            >
              <div className="flex items-center justify-between border-b border-emerald-200 pb-3">
                <span className="font-extrabold text-emerald-950 text-sm">
                  Phiếu Đề Xuất Bổ Sung Định Biên (Headcount Requisition)
                </span>
                <span className="rounded-md bg-emerald-200/80 px-2 py-0.5 font-mono text-[11px] font-bold text-emerald-900">
                  Phòng {hmDepartment}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700">
                    Chức danh công việc cần tuyển <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newReqTitle}
                    onChange={(e) => setNewReqTitle(e.target.value)}
                    placeholder="VD: Senior Backend Engineer (NestJS / PostgreSQL)..."
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700">
                    Số lượng cần tuyển (Headcount) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    required
                    value={newReqHeadcount}
                    onChange={(e) => setNewReqHeadcount(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-mono font-bold outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700">
                    Khung lương dự kiến (Gross)
                  </label>
                  <input
                    type="text"
                    value={newReqSalary}
                    onChange={(e) => setNewReqSalary(e.target.value)}
                    placeholder="VD: 35.000.000 - 50.000.000 VNĐ"
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700">
                    Lý do / Mục tiêu dự án cần bổ sung nhân sự
                  </label>
                  <input
                    type="text"
                    value={newReqJustification}
                    onChange={(e) => setNewReqJustification(e.target.value)}
                    placeholder="VD: Mở rộng tính năng Real-time & Microservices Quý 1"
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowReqForm(false)}
                  className="cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="cursor-pointer rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-emerald-700"
                >
                  Gửi Đề Xuất Cho HR Phê Duyệt
                </button>
              </div>
            </form>
          )}

          {/* Requisitions List */}
          <div className="space-y-4">
            {departmentRequisitions.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center text-xs text-slate-500">
                Chưa có yêu cầu định biên nào cho phòng {hmDepartment}. Hãy bấm nút "+ Tạo Yêu Cầu
                Định Biên Mới" ở trên.
              </div>
            ) : (
              departmentRequisitions.map((req) => {
                const linkedJob = store.jobs.find((j) => j.requisitionId === req.id);
                const currentFilled = linkedJob ? linkedJob.filledCount : req.filledCount;
                const currentHeadcount = linkedJob ? linkedJob.headcount : req.headcount;
                const progressPct =
                  currentHeadcount > 0 ? Math.round((currentFilled / currentHeadcount) * 100) : 0;

                return (
                  <div
                    key={req.id}
                    className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs transition-all hover:border-slate-300"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              'rounded-md px-2.5 py-0.5 font-mono text-[10px] font-bold',
                              req.status === 'APPROVED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : req.status === 'PENDING'
                                  ? 'bg-amber-100 text-amber-800'
                                  : req.status === 'CLOSED'
                                    ? 'bg-slate-200 text-slate-700'
                                    : 'bg-red-100 text-red-700',
                            )}
                          >
                            {req.status}
                          </span>
                          <span className="font-mono text-xs text-slate-400">#{req.id}</span>
                          <span className="text-xs text-slate-400">· Tạo ngày {req.createdAt}</span>
                        </div>
                        <h3 className="mt-2 text-base font-bold text-slate-900">{req.title}</h3>
                        <p className="text-xs text-slate-500">
                          Khung lương: <strong>{req.salaryRange}</strong> · Người yêu cầu:{' '}
                          <strong>{req.requestedBy}</strong>
                        </p>
                        {req.decisionNote && (
                          <p className="mt-1 text-xs text-slate-600 italic">
                            Ghi chú: "{req.decisionNote}"
                          </p>
                        )}
                      </div>

                      {/* Headcount progress */}
                      <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 sm:w-64">
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className="text-slate-600">Tiến độ tuyển dụng:</span>
                          <span className="font-mono text-emerald-700 tabular-nums">
                            {currentFilled} / {currentHeadcount} ({progressPct}%)
                          </span>
                        </div>
                        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                          <div
                            className="h-full bg-emerald-600 rounded-full transition-all"
                            style={{ width: `${Math.min(100, progressPct)}%` }}
                          />
                        </div>
                        <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                          <span>
                            {req.status === 'CLOSED' ? '✓ Đã hoàn tất' : `Còn thiếu: ${currentHeadcount - currentFilled}`}
                          </span>
                          {linkedJob && (
                            <button
                              type="button"
                              onClick={() => {
                                onSelectJobId(linkedJob.id);
                                onSelectSection('hm-pipeline');
                              }}
                              className="cursor-pointer font-bold text-emerald-600 hover:underline"
                            >
                              Xem Pipeline →
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          SECTION 3: HM-PIPELINE (DEPARTMENT CANDIDATES BY STAGE)
         ========================================================================= */}
      {activeSection === 'hm-pipeline' && (
        <div className="space-y-6">
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                Tiến Độ Ứng Tuyển Các Vị Trí Phòng {hmDepartment}
              </h2>
              <p className="text-xs text-slate-500">
                Theo dõi các hồ sơ ứng viên đang phân bổ qua các vòng tuyển dụng của phòng bạn.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600">Chọn vị trí:</span>
              <ModernSelect<number>
                value={selectedJob.id}
                onChange={(val) => onSelectJobId(Number(val))}
                options={departmentJobs.map((j) => ({
                  value: j.id,
                  label: `${j.title} (${j.filledCount}/${j.headcount})`,
                  badge: `${j.filledCount}/${j.headcount}`,
                }))}
                size="sm"
                className="w-72"
              />
            </div>
          </div>

          {/* Grouped by stage */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {(['APPLIED', 'SCREENING', 'TEST', 'INTERVIEW', 'OFFER', 'HIRED'] as StageCode[]).map(
              (stg) => {
                const candsInStage = departmentCandidates.filter(
                  (c) => c.jobId === selectedJob.id && c.stageCode === stg,
                );

                return (
                  <div
                    key={stg}
                    className="flex flex-col rounded-3xl border border-slate-200 bg-slate-50/70 p-3 shadow-2xs"
                  >
                    <div className="mb-3 flex items-center justify-between border-b border-slate-200 pb-2 px-1">
                      <span className="font-mono text-xs font-extrabold text-slate-800 uppercase">
                        {stg}
                      </span>
                      <span className="rounded-full bg-white px-2 py-0.5 font-mono text-[10px] font-bold text-slate-600 shadow-2xs">
                        {candsInStage.length}
                      </span>
                    </div>

                    <div className="space-y-2.5 flex-1">
                      {candsInStage.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-slate-200 bg-white/60 p-4 text-center text-[11px] text-slate-400">
                          Trống
                        </div>
                      ) : (
                        candsInStage.map((cand) => {
                          const m = computeCandidateMetrics(cand, selectedJob.criteria);

                          return (
                            <div
                              key={cand.id}
                              onClick={() => onOpenCandidate360(cand.id)}
                              className="group cursor-pointer rounded-2xl border border-slate-200 bg-white p-3 shadow-xs transition-all hover:border-emerald-400 hover:shadow-md"
                            >
                              <div className="flex items-start justify-between gap-1">
                                <h4 className="text-xs font-bold text-slate-900 group-hover:text-emerald-700">
                                  {cand.fullName}
                                </h4>
                                {m.overallScore !== null && (
                                  <span className="font-mono text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                                    {m.overallScore.toFixed(1)}
                                  </span>
                                )}
                              </div>
                              <p className="mt-1 text-[11px] text-slate-500 line-clamp-1">
                                {cand.experience}
                              </p>

                              {/* Flags */}
                              <div className="mt-2 flex flex-wrap gap-1">
                                {cand.offerApprovedByHm && (
                                  <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-800">
                                    ✓ Đã duyệt Offer
                                  </span>
                                )}
                                {m.hasVarianceAlert && !cand.calibrated && (
                                  <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-800">
                                    Lệch điểm
                                  </span>
                                )}
                                {m.isDisqualified && (
                                  <span className="rounded bg-red-100 px-1.5 py-0.5 text-[9px] font-bold text-red-800">
                                    Điểm liệt
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              },
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          SECTION 4: HM-CALIBRATION (DEPARTMENT CALIBRATION & RANKING)
         ========================================================================= */}
      {activeSection === 'hm-calibration' && (
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
            <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <span className="rounded-md bg-violet-100 px-2.5 py-1 font-mono text-[10px] font-bold text-violet-800 uppercase">
                  CALIBRATION WORKBENCH (Δ_i ≥ 2.0 — D04, D05)
                </span>
                <h2 className="mt-2 text-lg font-extrabold text-slate-900">
                  Họp & Ký Biên Bản Hiệu Chỉnh Điểm Lệch Phòng {hmDepartment}
                </h2>
                <p className="mt-1 text-xs text-slate-500 max-w-2xl leading-relaxed">
                  Khi các giám khảo chấm lệch điểm ($\Delta_i = \max - \min \ge 2.0$), hệ thống tự
                  động chặn đơn ứng tuyển tiến sang vòng OFFER. Trưởng bộ phận (Hiring Manager) và
                  HR họp bàn và ghi nhận biên bản calibration (≥ 10 ký tự) để mở khóa chuyển vòng.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    exportRankingToCsv(selectedJob, departmentCandidates, selectedJob.criteria)
                  }
                  className="cursor-pointer inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  <Download className="h-4 w-4" />
                  Xuất Bảng Xếp Hạng CSV
                </button>
              </div>
            </div>

            {/* List candidates needing calibration */}
            <div className="mt-6">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
                Danh Sách Ứng Viên Cần Ký Biên Bản Calibration ({departmentVarianceCandidates.length})
              </h3>

              {departmentVarianceCandidates.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-xs text-slate-500">
                  Không có ứng viên nào trong phòng bị lệch điểm hoặc chưa hoàn tất calibration.
                </div>
              ) : (
                <div className="space-y-3">
                  {departmentVarianceCandidates.map((cand) => {
                    const candJob = store.jobs.find((j) => j.id === cand.jobId) ?? selectedJob;
                    const m = computeCandidateMetrics(cand, candJob.criteria);

                    return (
                      <div
                        key={cand.id}
                        className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs transition-all sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-slate-900">{cand.fullName}</h4>
                            <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[10px] text-slate-600">
                              {candJob.title}
                            </span>
                            {cand.calibrated ? (
                              <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                                ✓ Đã ký Calibration
                              </span>
                            ) : (
                              <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                                ⏳ Chờ ký biên bản
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-xs text-slate-500">
                            Điểm tổng: <strong>{m.overallScore?.toFixed(2) ?? '—'}</strong> · Vòng
                            hiện tại: <strong>{cand.stageCode}</strong>
                          </p>
                          {cand.calibrationNote && (
                            <p className="mt-1.5 text-xs text-slate-700 bg-slate-50 p-2 rounded-lg border border-slate-200/60">
                              Biên bản: "{cand.calibrationNote}" (ký bởi {cand.calibratedByName})
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onOpenCandidate360(cand.id)}
                            className="cursor-pointer rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                          >
                            Hồ sơ 360°
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setCalibratingCandidate(cand);
                              setCalibrationNoteInput(cand.calibrationNote || '');
                            }}
                            className="cursor-pointer rounded-xl bg-violet-600 px-4 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-violet-700"
                          >
                            {cand.calibrated ? 'Cập Nhật Biên Bản' : 'Ký Biên Bản Calibration'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          SECTION 5: HM-STUDIO (EVALUATION STUDIO WHEN HM IS INTERVIEWER)
         ========================================================================= */}
      {activeSection === 'hm-studio' && (
        <EvaluationStudioView
          currentUser={currentUser}
          jobTitle={selectedJob.title}
          passThreshold={selectedJob.passScoreThreshold}
          criteria={selectedJob.criteria}
          candidates={departmentCandidates.length > 0 ? departmentCandidates : store.candidates}
          selectedCandidateId={selectedEvalCandidateId}
          onSelectCandidate={onSelectEvalCandidateId}
          onUpdateSheetScore={onUpdateSheetScore}
          onUpdateSheetCriterionComment={onUpdateSheetCriterionComment}
          onUpdateSheetMeta={onUpdateSheetMeta}
          onSubmitSheet={onSubmitSheet}
        />
      )}

      {/* =========================================================================
          MODAL: REJECT / ADJUST OFFER
         ========================================================================= */}
      {rejectOfferCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="font-extrabold text-sm text-slate-900">
                Từ Chối / Yêu Cầu Điều Chỉnh Offer
              </span>
              <button
                type="button"
                onClick={() => setRejectOfferCandidate(null)}
                className="cursor-pointer rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Bạn đang từ chối duyệt Offer cho ứng viên{' '}
              <strong>{rejectOfferCandidate.fullName}</strong>. Vui lòng nhập lý do để chuyên viên
              HR nắm rõ và tiến hành đàm phán lại mức lương hoặc tìm kiếm ứng viên khác.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700">Lý do từ chối / Ghi chú phản hồi</label>
              <textarea
                rows={3}
                value={rejectOfferReason}
                onChange={(e) => setRejectOfferReason(e.target.value)}
                placeholder="VD: Mức lương đề xuất 45 triệu vượt khung ngân sách phòng ban, đề nghị đàm phán lại ở mức 40 triệu..."
                className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-xs outline-none focus:border-red-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRejectOfferCandidate(null)}
                className="cursor-pointer rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmRejectOffer}
                className="cursor-pointer rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-red-700"
              >
                Xác Nhận Từ Chối Offer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: SIGN CALIBRATION MINUTES
         ========================================================================= */}
      {calibratingCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="font-extrabold text-sm text-slate-900">
                Ghi Biên Bản Calibration Cho Ứng Viên
              </span>
              <button
                type="button"
                onClick={() => setCalibratingCandidate(null)}
                className="cursor-pointer rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Ứng viên <strong>{calibratingCandidate.fullName}</strong> có điểm phỏng vấn bị lệch giữa
              các giám khảo ($\Delta_i \ge 2.0$). Nhập biên bản kết luận cuộc họp hội đồng (tối thiểu
              10 ký tự) để mở khóa cho phép HR đề xuất Offer.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700">
                Nội dung kết luận cuộc họp Calibration <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={4}
                value={calibrationNoteInput}
                onChange={(e) => setCalibrationNoteInput(e.target.value)}
                placeholder="VD: Hội đồng đã họp rà soát lại tiêu chí System Design. Độ lệch do giám khảo 1 hỏi sâu về Distributed Cache, thống nhất ứng viên đạt mức Đạt..."
                className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-xs outline-none focus:border-violet-500"
              />
              <span className="text-[10px] text-slate-400">
                Độ dài: {calibrationNoteInput.trim().length} / 10 ký tự tối thiểu
              </span>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCalibratingCandidate(null)}
                className="cursor-pointer rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveCalibrationNote}
                className="cursor-pointer rounded-xl bg-violet-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-violet-700"
              >
                Ký & Lưu Biên Bản
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
