import {
  AlertTriangle,
  ArrowRight,
  Award,
  Briefcase,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  DollarSign,
  Download,
  Edit3,
  Eye,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  Filter,
  Info,
  Layers,
  LayoutGrid,
  Lock,
  MessageSquare,
  Plus,
  RotateCcw,
  Scale,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Sparkles,
  Table as TableIcon,
  Trash2,
  TrendingUp,
  Unlock,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { AnimatedSpringDialog, GuardViolationState } from '@/components/animate-ui/guard-dialog';
import { ModernSelect } from '@/components/animate-ui/modern-select';
import { TablePagination } from '@/components/animate-ui/table-pagination';
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

  // ---------------------------------------------------------------------------
  // STATE: SECTION 1 — OFFER APPROVAL QUEUE (hm-offers)
  // ---------------------------------------------------------------------------
  const [offerScopeFilter, setOfferScopeFilter] = useState<'MY_DEPT' | 'ALL'>('MY_DEPT');
  const [offerStatusFilter, setOfferStatusFilter] = useState<'ALL' | 'PENDING_HM' | 'APPROVED_HM'>(
    'ALL',
  );
  const [offerJobFilter, setOfferJobFilter] = useState<'ALL' | number>('ALL');
  const [offerSearch, setOfferSearch] = useState('');
  const [offerViewMode, setOfferViewMode] = useState<'CARDS' | 'TABLE'>('CARDS');
  const [offerPage, setOfferPage] = useState<number>(1);
  const [offerPageSize, setOfferPageSize] = useState<number>(10);

  // Isolated Modals for Offer Sign-off & Rejection
  const [approveModalCand, setApproveModalCand] = useState<CandidateCardData | null>(null);
  const [rejectOfferCandidate, setRejectOfferCandidate] = useState<CandidateCardData | null>(null);
  const [rejectOfferReason, setRejectOfferReason] = useState('');

  // ---------------------------------------------------------------------------
  // STATE: SECTION 2 — REQUISITIONS & BAREM ARCHITECT (hm-requisitions)
  // ---------------------------------------------------------------------------
  const [reqSearch, setReqSearch] = useState('');
  const [reqStatusFilter, setReqStatusFilter] = useState<
    'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'CLOSED'
  >('ALL');
  const [reqJobLinkFilter, setReqJobLinkFilter] = useState<'ALL' | 'LINKED' | 'UNLINKED'>('ALL');
  const [reqViewMode, setReqViewMode] = useState<'CARDS' | 'TABLE'>('CARDS');
  const [reqPage, setReqPage] = useState<number>(1);
  const [reqPageSize, setReqPageSize] = useState<number>(10);

  // Isolated Modal: Create Requisition
  const [isCreateReqOpen, setIsCreateReqOpen] = useState(false);
  const [newReqTitle, setNewReqTitle] = useState('');
  const [newReqHeadcount, setNewReqHeadcount] = useState(1);
  const [newReqSalary, setNewReqSalary] = useState('35.000.000 - 50.000.000 VNĐ');
  const [newReqJustification, setNewReqJustification] = useState('');

  // Isolated Modal: Barem Criteria Architect (∑w_i = 100%)
  const [editingBaremJob, setEditingBaremJob] = useState<JobItem | null>(null);
  const [draftCriteria, setDraftCriteria] = useState<CriterionDef[]>([]);
  const [draftThreshold, setDraftThreshold] = useState<number>(3.5);

  // ---------------------------------------------------------------------------
  // STATE: SECTION 3 — DEPARTMENT PIPELINE (hm-pipeline)
  // ---------------------------------------------------------------------------
  const [pipeSearch, setPipeSearch] = useState('');
  const [pipeStageFilter, setPipeStageFilter] = useState<'ALL' | StageCode>('ALL');
  const [pipeAlertFilter, setPipeAlertFilter] = useState<
    'ALL' | 'PASSED_THRESHOLD' | 'VARIANCE' | 'KNOCKOUT' | 'HM_APPROVED'
  >('ALL');
  const [pipeViewMode, setPipeViewMode] = useState<'BOARD' | 'TABLE'>('TABLE');
  const [pipePage, setPipePage] = useState<number>(1);
  const [pipePageSize, setPipePageSize] = useState<number>(10);

  // ---------------------------------------------------------------------------
  // STATE: SECTION 4 — CALIBRATION WORKBENCH (hm-calibration)
  // ---------------------------------------------------------------------------
  const [calibSearch, setCalibSearch] = useState('');
  const [calibStatusFilter, setCalibStatusFilter] = useState<
    'ALL' | 'NEEDS_CALIB' | 'CALIBRATED' | 'KNOCKOUT' | 'CONSENSUS'
  >('ALL');
  const [calibPage, setCalibPage] = useState<number>(1);
  const [calibPageSize, setCalibPageSize] = useState<number>(10);

  // Isolated Modal: Sign Calibration Minutes
  const [calibratingCandidate, setCalibratingCandidate] = useState<CandidateCardData | null>(null);
  const [calibrationNoteInput, setCalibrationNoteInput] = useState('');

  // ---------------------------------------------------------------------------
  // COMPUTED DATA: DEPARTMENT SCOPED ENTITIES
  // ---------------------------------------------------------------------------
  const departmentJobs = useMemo(() => {
    const matches = store.jobs.filter(
      (j) =>
        j.department.toLowerCase().includes(hmDepartment.toLowerCase()) ||
        store.requisitions.some(
          (r) =>
            r.id === j.requisitionId &&
            r.department.toLowerCase().includes(hmDepartment.toLowerCase()),
        ),
    );
    return matches.length > 0 ? matches : store.jobs;
  }, [store.jobs, store.requisitions, hmDepartment]);

  const departmentRequisitions = useMemo(() => {
    return store.requisitions.filter(
      (r) =>
        r.department.toLowerCase().includes(hmDepartment.toLowerCase()) ||
        r.requestedBy.toLowerCase().includes(currentUser.fullName.toLowerCase()),
    );
  }, [store.requisitions, hmDepartment, currentUser.fullName]);

  const departmentCandidates = useMemo(() => {
    const jobIds = new Set(departmentJobs.map((j) => j.id));
    return store.candidates.filter((c) => jobIds.has(c.jobId));
  }, [store.candidates, departmentJobs]);

  const allOfferCandidates = useMemo(
    () => store.candidates.filter((c) => c.stageCode === 'OFFER'),
    [store.candidates],
  );

  const departmentOfferCandidates = useMemo(() => {
    const jobIds = new Set(departmentJobs.map((j) => j.id));
    return allOfferCandidates.filter((c) => jobIds.has(c.jobId));
  }, [allOfferCandidates, departmentJobs]);

  // Filtered Offers (Section 1)
  const filteredOffers = useMemo(() => {
    const source = offerScopeFilter === 'MY_DEPT' ? departmentOfferCandidates : allOfferCandidates;
    return source.filter((c) => {
      const cJob = store.jobs.find((j) => j.id === c.jobId) ?? selectedJob;

      if (offerSearch.trim()) {
        const q = offerSearch.toLowerCase().trim();
        const matchName = c.fullName.toLowerCase().includes(q);
        const matchEmail = c.email.toLowerCase().includes(q);
        const matchSalary = c.offerSalary.toLowerCase().includes(q);
        const matchJob = cJob.title.toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchSalary && !matchJob) return false;
      }

      if (offerStatusFilter === 'PENDING_HM' && c.offerApprovedByHm) return false;
      if (offerStatusFilter === 'APPROVED_HM' && !c.offerApprovedByHm) return false;

      if (offerJobFilter !== 'ALL' && c.jobId !== offerJobFilter) return false;

      return true;
    });
  }, [
    offerScopeFilter,
    departmentOfferCandidates,
    allOfferCandidates,
    offerSearch,
    offerStatusFilter,
    offerJobFilter,
    store.jobs,
    selectedJob,
  ]);

  const paginatedOffers = useMemo(() => {
    const start = (offerPage - 1) * offerPageSize;
    return filteredOffers.slice(start, start + offerPageSize);
  }, [filteredOffers, offerPage, offerPageSize]);

  // Filtered Requisitions (Section 2)
  const filteredRequisitions = useMemo(() => {
    return departmentRequisitions.filter((req) => {
      const linkedJob = store.jobs.find((j) => j.requisitionId === req.id);

      if (reqSearch.trim()) {
        const q = reqSearch.toLowerCase().trim();
        const matchTitle = req.title.toLowerCase().includes(q);
        const matchSalary = req.salaryRange.toLowerCase().includes(q);
        const matchRequester = req.requestedBy.toLowerCase().includes(q);
        const matchId = String(req.id).includes(q);
        if (!matchTitle && !matchSalary && !matchRequester && !matchId) return false;
      }

      if (reqStatusFilter !== 'ALL' && req.status !== reqStatusFilter) return false;

      if (reqJobLinkFilter === 'LINKED' && !linkedJob) return false;
      if (reqJobLinkFilter === 'UNLINKED' && linkedJob) return false;

      return true;
    });
  }, [departmentRequisitions, store.jobs, reqSearch, reqStatusFilter, reqJobLinkFilter]);

  const paginatedRequisitions = useMemo(() => {
    const start = (reqPage - 1) * reqPageSize;
    return filteredRequisitions.slice(start, start + reqPageSize);
  }, [filteredRequisitions, reqPage, reqPageSize]);

  // Filtered Pipeline Candidates (Section 3)
  const filteredPipelineCandidates = useMemo(() => {
    return departmentCandidates
      .filter((c) => c.jobId === selectedJob.id)
      .filter((c) => {
        const m = computeCandidateMetrics(c, selectedJob.criteria);

        if (pipeSearch.trim()) {
          const q = pipeSearch.toLowerCase().trim();
          const matchName = c.fullName.toLowerCase().includes(q);
          const matchEmail = c.email.toLowerCase().includes(q);
          const matchExp = c.experience.toLowerCase().includes(q);
          if (!matchName && !matchEmail && !matchExp) return false;
        }

        if (pipeStageFilter !== 'ALL' && c.stageCode !== pipeStageFilter) return false;

        if (
          pipeAlertFilter === 'PASSED_THRESHOLD' &&
          (m.overallScore === null || m.overallScore < selectedJob.passScoreThreshold)
        ) {
          return false;
        }
        if (pipeAlertFilter === 'VARIANCE' && !m.hasVarianceAlert) return false;
        if (pipeAlertFilter === 'KNOCKOUT' && !m.isDisqualified) return false;
        if (pipeAlertFilter === 'HM_APPROVED' && !c.offerApprovedByHm) return false;

        return true;
      });
  }, [
    departmentCandidates,
    selectedJob,
    pipeSearch,
    pipeStageFilter,
    pipeAlertFilter,
  ]);

  const paginatedPipelineCandidates = useMemo(() => {
    const start = (pipePage - 1) * pipePageSize;
    return filteredPipelineCandidates.slice(start, start + pipePageSize);
  }, [filteredPipelineCandidates, pipePage, pipePageSize]);

  // Filtered Calibration Ranking Candidates (Section 4)
  const filteredCalibrationCandidates = useMemo(() => {
    return departmentCandidates
      .filter((c) => c.jobId === selectedJob.id)
      .map((cand) => ({
        cand,
        metrics: computeCandidateMetrics(cand, selectedJob.criteria),
      }))
      .filter(({ cand, metrics }) => {
        if (calibSearch.trim()) {
          const q = calibSearch.toLowerCase().trim();
          const matchName = cand.fullName.toLowerCase().includes(q);
          const matchEmail = cand.email.toLowerCase().includes(q);
          const matchNote = (cand.calibrationNote || '').toLowerCase().includes(q);
          if (!matchName && !matchEmail && !matchNote) return false;
        }

        if (calibStatusFilter === 'NEEDS_CALIB' && (!metrics.hasVarianceAlert || cand.calibrated)) {
          return false;
        }
        if (calibStatusFilter === 'CALIBRATED' && !cand.calibrated) return false;
        if (calibStatusFilter === 'KNOCKOUT' && !metrics.isDisqualified) return false;
        if (
          calibStatusFilter === 'CONSENSUS' &&
          (metrics.hasVarianceAlert || metrics.isDisqualified || !metrics.allSubmitted)
        ) {
          return false;
        }

        return true;
      })
      .sort((a, b) => (b.metrics.overallScore ?? -1) - (a.metrics.overallScore ?? -1));
  }, [departmentCandidates, selectedJob, calibSearch, calibStatusFilter]);

  const paginatedCalibrationCandidates = useMemo(() => {
    const start = (calibPage - 1) * calibPageSize;
    return filteredCalibrationCandidates.slice(start, start + calibPageSize);
  }, [filteredCalibrationCandidates, calibPage, calibPageSize]);

  // Department KPIs
  const totalTargetHeadcount = useMemo(
    () => departmentJobs.reduce((sum, j) => sum + j.headcount, 0),
    [departmentJobs],
  );

  const totalFilledHeadcount = useMemo(
    () => departmentJobs.reduce((sum, j) => sum + j.filledCount, 0),
    [departmentJobs],
  );

  const departmentVarianceCount = useMemo(() => {
    return departmentCandidates.filter((c) => {
      const cJob = store.jobs.find((j) => j.id === c.jobId) ?? selectedJob;
      const m = computeCandidateMetrics(c, cJob.criteria);
      return m.hasVarianceAlert && !c.calibrated;
    }).length;
  }, [departmentCandidates, store.jobs, selectedJob]);

  // ---------------------------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------------------------
  const handleConfirmApproveOffer = (cand: CandidateCardData) => {
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
                    ? `Hiring Manager (${currentUser.fullName}) đã phê duyệt chính thức Offer (S3.20, D11)`
                    : `Hiring Manager (${currentUser.fullName}) đã thu hồi phê duyệt Offer`,
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
    setApproveModalCand(null);
  };

  const handleConfirmRejectOffer = () => {
    if (!rejectOfferCandidate) return;
    const reason = rejectOfferReason.trim();
    if (!reason) {
      onTriggerViolation({
        code: 'GUARD_REJECT_REASON_REQUIRED',
        message: 'Vui lòng nhập lý do từ chối hoặc yêu cầu điều chỉnh mức đãi ngộ Offer.',
        candidateName: rejectOfferCandidate.fullName,
        fromStageName: 'Vòng OFFER',
        toStageName: 'Yêu cầu điều chỉnh Offer',
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
                  note: `Hiring Manager yêu cầu điều chỉnh / từ chối Offer: "${reason}"`,
                  createdAt: ts,
                },
              ],
            }
          : c,
      ),
    }));

    appendAudit(
      'OFFER_REJECTED_BY_HM',
      `Hiring Manager từ chối duyệt Offer của ${rejectOfferCandidate.fullName}: ${reason}`,
    );
    setRejectOfferCandidate(null);
    setRejectOfferReason('');
  };

  const handleSubmitRequisition = (e: React.FormEvent) => {
    e.preventDefault();
    const title = newReqTitle.trim();
    if (!title) return;
    if (!Number.isInteger(newReqHeadcount) || newReqHeadcount <= 0) {
      onTriggerViolation({
        code: 'REQ_INVALID_HEADCOUNT',
        message: 'Số lượng định biên (headcount) phải là số nguyên dương ≥ 1 (S2.3).',
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
    setIsCreateReqOpen(false);
  };

  const handleOpenBaremModal = (job: JobItem) => {
    setEditingBaremJob(job);
    setDraftCriteria(job.criteria.map((c) => ({ ...c })));
    setDraftThreshold(job.passScoreThreshold);
  };

  const handleSaveBaremModal = () => {
    if (!editingBaremJob) return;
    const jobApplicantCount = store.candidates.filter((c) => c.jobId === editingBaremJob.id).length;

    // Guard S2.7: Khóa sửa Barem khi đã có ứng viên nộp hồ sơ
    if (jobApplicantCount > 0) {
      onTriggerViolation({
        code: 'JOB_CONFIG_LOCKED_APPLICANTS',
        message: `Không thể thay đổi Barem tiêu chí vì Job "${editingBaremJob.title}" đã có ${jobApplicantCount} ứng viên nộp hồ sơ (S2.7, FR-202). Toàn bộ tiêu chí đã bị khóa bảo vệ tính công bằng!`,
        candidateName: editingBaremJob.title,
        fromStageName: 'Cấu hình Barem',
        toStageName: 'Locked by Applicants (S2.7)',
      });
      return;
    }

    if (draftCriteria.length === 0) {
      onTriggerViolation({
        code: 'CRITERIA_INVALID',
        message: 'Barem chấm điểm cần tối thiểu 1 tiêu chí đánh giá (S2.8).',
        candidateName: editingBaremJob.title,
      });
      return;
    }

    const weightSum = draftCriteria.reduce((acc, c) => acc + Number(c.weightPercent || 0), 0);
    if (weightSum !== 100) {
      onTriggerViolation({
        code: 'CRITERIA_WEIGHT_SUM',
        message: `Tổng trọng số các tiêu chí phải bằng đúng 100% (Hiện tại đang là ${weightSum}% — D04, S2.8).`,
        candidateName: editingBaremJob.title,
        fromStageName: `${weightSum}%`,
        toStageName: '100%',
      });
      return;
    }

    setStore((prev) => ({
      ...prev,
      jobs: prev.jobs.map((j) =>
        j.id === editingBaremJob.id
          ? { ...j, criteria: draftCriteria, passScoreThreshold: draftThreshold }
          : j,
      ),
    }));

    appendAudit(
      'UPDATE_CRITERIA',
      `Hiring Manager ${currentUser.fullName} cập nhật Barem tiêu chí cho Job "${editingBaremJob.title}" (∑w = 100%)`,
    );
    setEditingBaremJob(null);
  };

  const handleSaveCalibrationNote = () => {
    if (!calibratingCandidate) return;
    const note = calibrationNoteInput.trim();
    if (note.length < 10) {
      onTriggerViolation({
        code: 'GUARD_VARIANCE_UNRESOLVED',
        message: 'Biên bản Calibration yêu cầu nội dung giải trình tối thiểu 10 ký tự (D05, S4.18).',
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
          TOP EXECUTIVE HERO: HIRING MANAGER DEPARTMENT COCKPIT (LUMINOUS EMERALD-TEAL)
         ========================================================================= */}
      <div className="relative overflow-hidden rounded-3xl border border-emerald-300/60 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 p-6 text-white shadow-xl sm:p-7">
        <div className="pointer-events-none absolute -right-12 -bottom-12 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute left-1/3 -top-12 h-48 w-48 rounded-full bg-amber-400/20 blur-xl" />

        <div className="relative z-10 flex flex-wrap items-center justify-between gap-6">
          <div className="max-w-2xl space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-white/20 px-3 py-1 font-mono text-[11px] font-bold tracking-wider text-white uppercase shadow-2xs backdrop-blur-md">
                <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                HIRING MANAGER DEPARTMENT COCKPIT (D04, D05, D11, D14)
              </span>
              <span className="rounded-xl bg-white/15 px-3 py-1 font-mono text-[11px] font-bold text-emerald-100 backdrop-blur-md">
                Bộ phận: {hmDepartment}
              </span>
            </div>
            <h1 className="text-xl font-black tracking-tight text-white drop-shadow-xs sm:text-2xl">
              Trung Tâm Quản Trị Định Biên & Phê Duyệt Tuyển Dụng Bộ Phận
            </h1>
            <p className="text-xs leading-relaxed text-emerald-50/95 sm:text-sm">
              Trưởng bộ phận <strong>{currentUser.fullName}</strong> nắm quyền kiểm soát định biên
              nhân sự, thiết kế Barem trọng số ($\sum w_i = 100\%$), chủ trì họp Calibration ($\Delta_i
              \ge 2.0$) và phê duyệt chốt chặn Offer cuối cùng (D11 / S3.19).
            </p>
          </div>

          {/* 4 Live Department KPI Cards */}
          <div className="grid w-full grid-cols-2 gap-2.5 sm:grid-cols-4 lg:w-auto">
            <div className="rounded-2xl border border-white/20 bg-white/10 p-3 text-center backdrop-blur-md">
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-100">
                Định biên lấp đầy
              </p>
              <p className="mt-1 font-mono text-2xl font-black text-white">
                {totalFilledHeadcount}/{totalTargetHeadcount}
              </p>
              <p className="text-[10px] text-emerald-100/80">
                Trên {departmentJobs.length} chiến dịch Job
              </p>
            </div>

            <div className="rounded-2xl border border-white/20 bg-white/10 p-3 text-center backdrop-blur-md">
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-100">
                Offer chờ duyệt
              </p>
              <p className="mt-1 font-mono text-2xl font-black text-amber-300">
                {departmentOfferCandidates.filter((c) => !c.offerApprovedByHm).length}
              </p>
              <p className="text-[10px] text-emerald-100/80">Chốt chặn D11 / S3.19</p>
            </div>

            <div className="rounded-2xl border border-white/20 bg-white/10 p-3 text-center backdrop-blur-md">
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-100">
                Lệch điểm Δ ≥ 2.0
              </p>
              <p className="mt-1 font-mono text-2xl font-black text-sky-200">
                {departmentVarianceCount}
              </p>
              <p className="text-[10px] text-emerald-100/80">Cần ký Calibration</p>
            </div>

            <div className="rounded-2xl border border-white/20 bg-white/10 p-3 text-center backdrop-blur-md">
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-100">
                Phiếu định biên
              </p>
              <p className="mt-1 font-mono text-2xl font-black text-white">
                {departmentRequisitions.length}
              </p>
              <p className="text-[10px] text-emerald-100/80">Requisitions 1–1</p>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          SECTION 1: HM-OFFERS (CHỐT CHẶN PHÊ DUYỆT OFFER & NGÂN SÁCH — D11, S3.19)
         ========================================================================= */}
      {activeSection === 'hm-offers' && (
        <div className="space-y-5">
          {/* Interactive KPI Filter Pills */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              {
                id: 'ALL_DEPT' as const,
                label: `OFFER PHÒNG ${hmDepartment.toUpperCase()}`,
                count: departmentOfferCandidates.length,
                sub: 'Thuộc bộ phận của bạn',
                active: offerScopeFilter === 'MY_DEPT' && offerStatusFilter === 'ALL',
                onClick: () => {
                  setOfferScopeFilter('MY_DEPT');
                  setOfferStatusFilter('ALL');
                  setOfferPage(1);
                },
              },
              {
                id: 'PENDING_HM' as const,
                label: 'CHỜ HM PHÊ DUYỆT (D11)',
                count: departmentOfferCandidates.filter((c) => !c.offerApprovedByHm).length,
                sub: 'Chưa mở khóa chốt HIRED',
                active: offerStatusFilter === 'PENDING_HM',
                onClick: () => {
                  setOfferStatusFilter('PENDING_HM');
                  setOfferPage(1);
                },
              },
              {
                id: 'APPROVED_HM' as const,
                label: 'ĐÃ PHÊ DUYỆT CHÍNH THỨC',
                count: departmentOfferCandidates.filter((c) => c.offerApprovedByHm).length,
                sub: 'Sẵn sàng chuyển sang HIRED',
                active: offerStatusFilter === 'APPROVED_HM',
                onClick: () => {
                  setOfferStatusFilter('APPROVED_HM');
                  setOfferPage(1);
                },
              },
              {
                id: 'ALL_ORG' as const,
                label: 'TOÀN DOANH NGHIỆP',
                count: allOfferCandidates.length,
                sub: 'Tất cả phòng ban',
                active: offerScopeFilter === 'ALL' && offerStatusFilter === 'ALL',
                onClick: () => {
                  setOfferScopeFilter('ALL');
                  setOfferStatusFilter('ALL');
                  setOfferPage(1);
                },
              },
            ].map((pill) => (
              <button
                key={pill.id}
                type="button"
                onClick={pill.onClick}
                className={cn(
                  'cursor-pointer rounded-2xl border p-4 text-left transition-all',
                  pill.active
                    ? 'border-amber-500 bg-amber-50/70 shadow-xs ring-1 ring-amber-400/40'
                    : 'border-slate-200/90 bg-white hover:bg-slate-50',
                )}
              >
                <p className="truncate font-mono text-[10px] font-bold text-slate-500 uppercase">
                  {pill.label}
                </p>
                <p className="mt-1 font-mono text-2xl font-extrabold text-slate-900">
                  {pill.count}
                </p>
                <p className="truncate text-[11px] text-slate-500">{pill.sub}</p>
              </button>
            ))}
          </div>

          {/* Search, Multi-Filters & View Mode Card */}
          <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  Hàng Đợi Phê Duyệt Đề Nghị Nhận Việc ({filteredOffers.length} hồ sơ Offer)
                </h2>
                <p className="text-xs text-slate-500">
                  Theo quy tắc <strong>D11 (S3.19)</strong>, HR không thể chuyển ứng viên sang{' '}
                  <code>HIRED</code> nếu chưa có chữ ký phê duyệt Offer của Hiring Manager.
                </p>
              </div>

              {/* View Mode Toggle */}
              <div className="flex items-center gap-1 rounded-2xl border border-slate-200 bg-slate-50 p-1">
                <button
                  type="button"
                  onClick={() => setOfferViewMode('CARDS')}
                  className={cn(
                    'inline-flex cursor-pointer items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all',
                    offerViewMode === 'CARDS'
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900',
                  )}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  Thẻ Bento
                </button>
                <button
                  type="button"
                  onClick={() => setOfferViewMode('TABLE')}
                  className={cn(
                    'inline-flex cursor-pointer items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all',
                    offerViewMode === 'TABLE'
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
              <div className="flex items-center gap-1.5">
                <div className="relative">
                  <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={offerSearch}
                    onChange={(e) => {
                      setOfferSearch(e.target.value);
                      setOfferPage(1);
                    }}
                    placeholder="Tìm tên ứng viên, email, mức lương..."
                    className="w-56 sm:w-64 rounded-2xl border border-slate-200/90 bg-white py-1.5 pr-8 pl-8 text-xs shadow-2xs transition-all focus:border-amber-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400/20"
                  />
                  {offerSearch && (
                    <button
                      type="button"
                      onClick={() => {
                        setOfferSearch('');
                        setOfferPage(1);
                      }}
                      className="absolute top-1/2 right-2.5 -translate-y-1/2 cursor-pointer rounded-full p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setOfferPage(1)}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-2xl border border-amber-300/80 bg-amber-500 hover:bg-amber-400 px-3.5 py-1.5 text-xs font-extrabold text-slate-950 shadow-xs transition-all active:scale-95"
                >
                  <Search className="h-3.5 w-3.5" />
                  <span>Tìm kiếm</span>
                </button>
              </div>

              <ModernSelect<'MY_DEPT' | 'ALL'>
                value={offerScopeFilter}
                onChange={(val) => {
                  setOfferScopeFilter(val);
                  setOfferPage(1);
                }}
                options={[
                  {
                    value: 'MY_DEPT',
                    label: `Phòng ${hmDepartment}`,
                    badge: `${departmentOfferCandidates.length}`,
                    badgeColor: 'bg-emerald-50 text-emerald-700',
                  },
                  {
                    value: 'ALL',
                    label: 'Tất cả phòng ban',
                    badge: `${allOfferCandidates.length}`,
                    badgeColor: 'bg-sky-50 text-sky-700',
                  },
                ]}
                icon={Building2}
              />

              <ModernSelect<'ALL' | 'PENDING_HM' | 'APPROVED_HM'>
                value={offerStatusFilter}
                onChange={(val) => {
                  setOfferStatusFilter(val);
                  setOfferPage(1);
                }}
                options={[
                  { value: 'ALL', label: 'Mọi trạng thái duyệt Offer' },
                  {
                    value: 'PENDING_HM',
                    label: 'Chờ HM phê duyệt',
                    badge: 'Pending D11',
                    badgeColor: 'bg-amber-50 text-amber-800',
                  },
                  {
                    value: 'APPROVED_HM',
                    label: 'HM đã phê duyệt',
                    badge: 'Approved',
                    badgeColor: 'bg-emerald-50 text-emerald-700',
                  },
                ]}
                icon={Filter}
              />

              <ModernSelect<'ALL' | number>
                value={offerJobFilter}
                onChange={(val) => {
                  setOfferJobFilter(val);
                  setOfferPage(1);
                }}
                options={[
                  { value: 'ALL', label: 'Tất cả vị trí Job' },
                  ...store.jobs.map((j) => ({
                    value: j.id,
                    label: j.title,
                  })),
                ]}
                icon={Briefcase}
              />

              {(offerSearch ||
                offerScopeFilter !== 'MY_DEPT' ||
                offerStatusFilter !== 'ALL' ||
                offerJobFilter !== 'ALL') && (
                <button
                  type="button"
                  onClick={() => {
                    setOfferSearch('');
                    setOfferScopeFilter('MY_DEPT');
                    setOfferStatusFilter('ALL');
                    setOfferJobFilter('ALL');
                    setOfferPage(1);
                  }}
                  className="inline-flex cursor-pointer items-center gap-1 rounded-2xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  <RotateCcw className="h-3 w-3 text-slate-400" />
                  Đặt lại lọc
                </button>
              )}
            </div>
          </div>

          {filteredOffers.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-xs">
              <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-400" />
              <h3 className="mt-3 text-sm font-bold text-slate-900">
                Không có đề nghị nhận việc (Offer) nào khớp bộ lọc
              </h3>
              <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
                Các ứng viên vượt qua vòng phỏng vấn và được HR đề xuất mức lương sẽ xuất hiện tại
                đây để bạn phê duyệt.
              </p>
            </div>
          ) : offerViewMode === 'CARDS' ? (
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
              {paginatedOffers.map((cand) => {
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
                        : 'border-slate-200/90 bg-white hover:border-emerald-300',
                    )}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-lg bg-emerald-100 px-2.5 py-0.5 font-mono text-[10px] font-bold text-emerald-800">
                              {candJob.title}
                            </span>
                            <span className="font-mono text-[10px] text-slate-500">
                              Phòng: {candJob.department}
                            </span>
                            {cand.isReturningCandidate && (
                              <span className="rounded-lg bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                                Ứng viên cũ (D09)
                              </span>
                            )}
                          </div>
                          <h3 className="mt-2 text-lg font-extrabold text-slate-900">
                            {cand.fullName}
                          </h3>
                          <p className="text-xs text-slate-500">
                            {cand.email} · {cand.phone}
                          </p>
                        </div>

                        <div className="text-right">
                          <span
                            className={cn(
                              'inline-block rounded-2xl px-3.5 py-1.5 font-mono text-sm font-black tabular-nums ring-1',
                              isPassedThreshold
                                ? 'bg-emerald-50 text-emerald-800 ring-emerald-300'
                                : 'bg-amber-50 text-amber-900 ring-amber-300',
                            )}
                          >
                            S = {m.overallScore !== null ? m.overallScore.toFixed(2) : '—'} / 5.00
                          </span>
                          <p className="mt-1 text-[10px] font-semibold text-slate-500">
                            Ngưỡng chuẩn Job: ≥ {candJob.passScoreThreshold.toFixed(1)}
                          </p>
                        </div>
                      </div>

                      {/* Compensation Box */}
                      <div className="mt-4 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 text-xs space-y-2">
                        <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                          <span className="font-semibold text-slate-600">
                            Mức lương đề xuất (Gross):
                          </span>
                          <span className="font-mono text-sm font-black text-emerald-700">
                            {cand.offerSalary}
                          </span>
                        </div>
                        <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                          <span className="font-semibold text-slate-600">
                            Khung ngân sách Job:
                          </span>
                          <span className="font-mono text-xs font-bold text-slate-700">
                            {candJob.salaryRange}
                          </span>
                        </div>
                        {cand.offerBenefits && (
                          <div>
                            <span className="font-semibold text-slate-600">Phúc lợi đi kèm:</span>
                            <p className="mt-0.5 text-slate-700">{cand.offerBenefits}</p>
                          </div>
                        )}
                      </div>

                      {/* Panel Recommendations */}
                      <div className="mt-4 space-y-1.5">
                        <p className="text-[11px] font-bold text-slate-700 uppercase">
                          Khuyến nghị từ Hội đồng phỏng vấn ({cand.sheets.length} giám khảo):
                        </p>
                        {cand.sheets.map((s) => (
                          <div
                            key={s.interviewerId}
                            className="flex items-center justify-between rounded-xl border border-slate-100 bg-white px-3 py-2 text-[11px]"
                          >
                            <span className="font-bold text-slate-800">{s.interviewerName}</span>
                            <div className="flex items-center gap-2">
                              <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono font-bold text-slate-800">
                                {s.recommendation}
                              </span>
                              {s.comment && (
                                <span className="max-w-[200px] truncate italic text-slate-500">
                                  "{s.comment}"
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                      <div>
                        {cand.offerApprovedByHm ? (
                          <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800 ring-1 ring-emerald-200">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            Đã ký duyệt bởi {cand.offerApprovedByName || currentUser.fullName}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700">
                            <Clock className="h-3.5 w-3.5" />
                            Chờ phê duyệt D11 để mở khóa HIRED
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onOpenCandidate360(cand.id)}
                          className="cursor-pointer rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
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
                            className="cursor-pointer rounded-xl border border-red-200 bg-red-50/60 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-100"
                          >
                            Yêu cầu điều chỉnh
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => setApproveModalCand(cand)}
                          className={cn(
                            'cursor-pointer rounded-xl px-4 py-2 text-xs font-extrabold shadow-xs transition-all active:scale-95',
                            cand.offerApprovedByHm
                              ? 'border border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200'
                              : 'border border-amber-300/80 bg-amber-500 hover:bg-amber-400 text-slate-950',
                          )}
                        >
                          {cand.offerApprovedByHm
                            ? 'Xem / Thu hồi Duyệt'
                            : '✓ Thẩm Định & Phê Duyệt Offer'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* TABLE MODE FOR OFFERS */
            <div className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold text-slate-600 uppercase">
                      <th className="px-4 py-3.5">Ứng Viên</th>
                      <th className="px-3.5 py-3.5">Vị Trí & Phòng Ban</th>
                      <th className="px-3.5 py-3.5 text-center">Điểm Tổng Hợp S</th>
                      <th className="px-3.5 py-3.5">Mức Lương Đề Nghị</th>
                      <th className="px-3.5 py-3.5 text-center">Trạng Thái Chốt D11</th>
                      <th className="px-4 py-3.5 text-right">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedOffers.map((cand) => {
                      const candJob = store.jobs.find((j) => j.id === cand.jobId) ?? selectedJob;
                      const m = computeCandidateMetrics(cand, candJob.criteria);
                      return (
                        <tr key={cand.id} className="hover:bg-slate-50/60">
                          <td className="px-4 py-3.5">
                            <p className="font-extrabold text-slate-900">{cand.fullName}</p>
                            <p className="font-mono text-[11px] text-slate-500">{cand.email}</p>
                          </td>
                          <td className="px-3.5 py-3.5">
                            <p className="font-bold text-slate-800">{candJob.title}</p>
                            <span className="rounded bg-emerald-50 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-700">
                              {candJob.department}
                            </span>
                          </td>
                          <td className="px-3.5 py-3.5 text-center font-mono font-extrabold text-slate-900">
                            {m.overallScore !== null ? m.overallScore.toFixed(2) : '—'} / 5.0
                          </td>
                          <td className="px-3.5 py-3.5 font-mono font-bold text-emerald-700">
                            {cand.offerSalary}
                          </td>
                          <td className="px-3.5 py-3.5 text-center">
                            {cand.offerApprovedByHm ? (
                              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-800 ring-1 ring-emerald-200">
                                ✓ Đã phê duyệt
                              </span>
                            ) : (
                              <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-800 ring-1 ring-amber-200">
                                ⏳ Chờ HM duyệt
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-right space-x-1.5">
                            <button
                              type="button"
                              onClick={() => onOpenCandidate360(cand.id)}
                              className="cursor-pointer rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                            >
                              360°
                            </button>
                            <button
                              type="button"
                              onClick={() => setApproveModalCand(cand)}
                              className="cursor-pointer rounded-xl border border-amber-300/80 bg-amber-500 hover:bg-amber-400 px-3 py-1.5 text-xs font-extrabold text-slate-950"
                            >
                              {cand.offerApprovedByHm ? 'Chi tiết duyệt' : 'Phê duyệt →'}
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

          {filteredOffers.length > 0 && (
            <TablePagination
              currentPage={offerPage}
              pageSize={offerPageSize}
              totalItems={filteredOffers.length}
              onPageChange={setOfferPage}
              onPageSizeChange={(sz) => {
                setOfferPageSize(sz);
                setOfferPage(1);
              }}
              itemName="đề nghị nhận việc"
            />
          )}
        </div>
      )}

      {/* =========================================================================
          SECTION 2: HM-REQUISITIONS (ĐỊNH BIÊN & THIẾT KẾ BAREM TRỌNG SỐ ∑w = 100%)
         ========================================================================= */}
      {activeSection === 'hm-requisitions' && (
        <div className="space-y-5">
          {/* Top Filter & Action Card */}
          <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <FileCheck2 className="h-5 w-5 text-emerald-600" />
                  Quản Trị Yêu Cầu Định Biên & Thiết Kế Barem Trọng Số ({filteredRequisitions.length}{' '}
                  phiếu)
                </h2>
                <p className="text-xs text-slate-500">
                  Khởi tạo phiếu định biên (Requisition 1–1 theo D14) và cấu hình bộ tiêu chí chấm
                  điểm ($\sum w_i = 100\%$ theo D04) cho từng vị trí thuộc phòng {hmDepartment}.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <div className="flex items-center gap-1 rounded-2xl border border-slate-200 bg-slate-50 p-1">
                  <button
                    type="button"
                    onClick={() => setReqViewMode('CARDS')}
                    className={cn(
                      'inline-flex cursor-pointer items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all',
                      reqViewMode === 'CARDS'
                        ? 'bg-amber-500 text-slate-950 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900',
                    )}
                  >
                    <LayoutGrid className="h-3.5 w-3.5" />
                    Thẻ Bento
                  </button>
                  <button
                    type="button"
                    onClick={() => setReqViewMode('TABLE')}
                    className={cn(
                      'inline-flex cursor-pointer items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all',
                      reqViewMode === 'TABLE'
                        ? 'bg-amber-500 text-slate-950 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900',
                    )}
                  >
                    <TableIcon className="h-3.5 w-3.5" />
                    Bảng Chi Tiết
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setIsCreateReqOpen(true)}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-2xl border border-amber-300/80 bg-amber-500 hover:bg-amber-400 px-4 py-2 text-xs font-extrabold text-slate-950 shadow-xs transition-all active:scale-95"
                >
                  <Plus className="h-4 w-4" />
                  Tạo Yêu Cầu Định Biên Mới
                </button>
              </div>
            </div>

            {/* Filter Toolbar */}
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5">
                <div className="relative">
                  <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={reqSearch}
                    onChange={(e) => {
                      setReqSearch(e.target.value);
                      setReqPage(1);
                    }}
                    placeholder="Tìm chức danh, mã phiếu, khung lương..."
                    className="w-56 sm:w-64 rounded-2xl border border-slate-200/90 bg-white py-1.5 pr-8 pl-8 text-xs shadow-2xs transition-all focus:border-amber-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400/20"
                  />
                  {reqSearch && (
                    <button
                      type="button"
                      onClick={() => {
                        setReqSearch('');
                        setReqPage(1);
                      }}
                      className="absolute top-1/2 right-2.5 -translate-y-1/2 cursor-pointer rounded-full p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setReqPage(1)}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-2xl border border-amber-300/80 bg-amber-500 hover:bg-amber-400 px-3.5 py-1.5 text-xs font-extrabold text-slate-950 shadow-xs transition-all active:scale-95"
                >
                  <Search className="h-3.5 w-3.5" />
                  <span>Tìm kiếm</span>
                </button>
              </div>

              <ModernSelect<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'CLOSED'>
                value={reqStatusFilter}
                onChange={(val) => {
                  setReqStatusFilter(val);
                  setReqPage(1);
                }}
                options={[
                  { value: 'ALL', label: 'Mọi trạng thái Requisition' },
                  {
                    value: 'PENDING',
                    label: 'Đang chờ HR duyệt (PENDING)',
                    badgeColor: 'bg-amber-50 text-amber-800',
                  },
                  {
                    value: 'APPROVED',
                    label: 'Đã phê duyệt (APPROVED)',
                    badgeColor: 'bg-emerald-50 text-emerald-700',
                  },
                  {
                    value: 'CLOSED',
                    label: 'Đã tuyển đủ & Đóng (CLOSED)',
                    badgeColor: 'bg-slate-100 text-slate-700',
                  },
                  {
                    value: 'REJECTED',
                    label: 'Từ chối (REJECTED)',
                    badgeColor: 'bg-red-50 text-red-700',
                  },
                ]}
                icon={Filter}
              />

              <ModernSelect<'ALL' | 'LINKED' | 'UNLINKED'>
                value={reqJobLinkFilter}
                onChange={(val) => {
                  setReqJobLinkFilter(val);
                  setReqPage(1);
                }}
                options={[
                  { value: 'ALL', label: 'Mọi trạng thái liên kết Job (D14)' },
                  {
                    value: 'LINKED',
                    label: 'Đã khởi tạo Chiến dịch Job 1–1',
                    badge: 'Linked',
                    badgeColor: 'bg-sky-50 text-sky-700',
                  },
                  {
                    value: 'UNLINKED',
                    label: 'Chưa tạo Job',
                    badge: 'Unlinked',
                    badgeColor: 'bg-slate-100 text-slate-700',
                  },
                ]}
                icon={Layers}
              />

              {(reqSearch || reqStatusFilter !== 'ALL' || reqJobLinkFilter !== 'ALL') && (
                <button
                  type="button"
                  onClick={() => {
                    setReqSearch('');
                    setReqStatusFilter('ALL');
                    setReqJobLinkFilter('ALL');
                    setReqPage(1);
                  }}
                  className="inline-flex cursor-pointer items-center gap-1 rounded-2xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  <RotateCcw className="h-3 w-3 text-slate-400" />
                  Đặt lại lọc
                </button>
              )}
            </div>
          </div>

          {filteredRequisitions.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center text-xs text-slate-500">
              Không tìm thấy phiếu yêu cầu định biên nào khớp với bộ lọc.
            </div>
          ) : reqViewMode === 'CARDS' ? (
            <div className="space-y-4">
              {paginatedRequisitions.map((req) => {
                const linkedJob = store.jobs.find((j) => j.requisitionId === req.id);
                const currentFilled = linkedJob ? linkedJob.filledCount : req.filledCount;
                const currentHeadcount = linkedJob ? linkedJob.headcount : req.headcount;
                const progressPct =
                  currentHeadcount > 0 ? Math.round((currentFilled / currentHeadcount) * 100) : 0;
                const applicantCount = linkedJob
                  ? store.candidates.filter((c) => c.jobId === linkedJob.id).length
                  : 0;

                return (
                  <div
                    key={req.id}
                    className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs transition-all hover:border-slate-300"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={cn(
                              'rounded-lg px-2.5 py-0.5 font-mono text-[10px] font-bold',
                              req.status === 'APPROVED' && 'bg-emerald-100 text-emerald-800',
                              req.status === 'PENDING' && 'bg-amber-100 text-amber-800',
                              req.status === 'CLOSED' && 'bg-slate-200 text-slate-700',
                              req.status === 'REJECTED' && 'bg-red-100 text-red-700',
                            )}
                          >
                            {req.status}
                          </span>
                          <span className="font-mono text-xs text-slate-400">Mã phiếu #{req.id}</span>
                          <span className="text-xs text-slate-400">· Ngày tạo: {req.createdAt}</span>
                          {linkedJob && (
                            <span className="rounded-lg bg-sky-50 px-2.5 py-0.5 font-mono text-[10px] font-bold text-sky-700 ring-1 ring-sky-200">
                              Job 1–1: #{linkedJob.id} ({applicantCount} hồ sơ)
                            </span>
                          )}
                        </div>
                        <h3 className="text-base font-extrabold text-slate-900">{req.title}</h3>
                        <p className="text-xs text-slate-500">
                          Khung lương đề xuất: <strong className="text-emerald-700">{req.salaryRange}</strong> ·
                          Người đề xuất: <strong>{req.requestedBy}</strong>
                        </p>
                        {req.decisionNote && (
                          <p className="text-xs text-slate-600 italic">"{req.decisionNote}"</p>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3.5 sm:w-60">
                          <div className="flex items-center justify-between text-xs font-bold">
                            <span className="text-slate-600">Tiến độ lấp đầy:</span>
                            <span className="font-mono text-emerald-700 tabular-nums">
                              {currentFilled}/{currentHeadcount} ({progressPct}%)
                            </span>
                          </div>
                          <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                            <div
                              className="h-full rounded-full bg-emerald-600 transition-all"
                              style={{ width: `${Math.min(100, progressPct)}%` }}
                            />
                          </div>
                        </div>

                        {linkedJob && (
                          <div className="flex flex-col gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenBaremModal(linkedJob)}
                              className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-amber-300/80 bg-amber-500 hover:bg-amber-400 px-3.5 py-2 text-xs font-extrabold text-slate-950 shadow-2xs"
                            >
                              <Sliders className="h-3.5 w-3.5" />
                              Cấu Hình Barem (∑w=100%)
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                onSelectJobId(linkedJob.id);
                                onSelectSection('hm-pipeline');
                              }}
                              className="inline-flex cursor-pointer items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                            >
                              Xem Phễu Ứng Viên →
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* TABLE MODE FOR REQUISITIONS */
            <div className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold text-slate-600 uppercase">
                      <th className="px-4 py-3.5">Mã & Chức Danh Tuyển Dụng</th>
                      <th className="px-3.5 py-3.5">Khung Lương Dự Kiến</th>
                      <th className="px-3.5 py-3.5 text-center">Định Biên</th>
                      <th className="px-3.5 py-3.5 text-center">Trạng Thái</th>
                      <th className="px-3.5 py-3.5 text-center">Liên Kết Job (D14)</th>
                      <th className="px-4 py-3.5 text-right">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedRequisitions.map((req) => {
                      const linkedJob = store.jobs.find((j) => j.requisitionId === req.id);
                      const currentFilled = linkedJob ? linkedJob.filledCount : req.filledCount;
                      const currentHeadcount = linkedJob ? linkedJob.headcount : req.headcount;
                      return (
                        <tr key={req.id} className="hover:bg-slate-50/60">
                          <td className="px-4 py-3.5">
                            <p className="font-extrabold text-slate-900">{req.title}</p>
                            <p className="font-mono text-[10px] text-slate-400">
                              #{req.id} · Tạo ngày {req.createdAt}
                            </p>
                          </td>
                          <td className="px-3.5 py-3.5 font-mono font-bold text-emerald-700">
                            {req.salaryRange}
                          </td>
                          <td className="px-3.5 py-3.5 text-center font-mono font-bold">
                            {currentFilled} / {currentHeadcount}
                          </td>
                          <td className="px-3.5 py-3.5 text-center">
                            <span
                              className={cn(
                                'rounded-full px-2.5 py-0.5 font-mono text-[10px] font-bold',
                                req.status === 'APPROVED' && 'bg-emerald-100 text-emerald-800',
                                req.status === 'PENDING' && 'bg-amber-100 text-amber-800',
                                req.status === 'CLOSED' && 'bg-slate-200 text-slate-700',
                                req.status === 'REJECTED' && 'bg-red-100 text-red-700',
                              )}
                            >
                              {req.status}
                            </span>
                          </td>
                          <td className="px-3.5 py-3.5 text-center">
                            {linkedJob ? (
                              <span className="font-mono text-[11px] font-bold text-sky-700">
                                Job #{linkedJob.id} ({linkedJob.criteria.length} tiêu chí)
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">Chờ HR khởi tạo</span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-right space-x-1.5">
                            {linkedJob && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleOpenBaremModal(linkedJob)}
                                  className="cursor-pointer rounded-xl border border-amber-300/80 bg-amber-500 hover:bg-amber-400 px-3 py-1.5 text-xs font-extrabold text-slate-950"
                                >
                                  Barem ∑w=100%
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    onSelectJobId(linkedJob.id);
                                    onSelectSection('hm-pipeline');
                                  }}
                                  className="cursor-pointer rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                                >
                                  Pipeline →
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {filteredRequisitions.length > 0 && (
            <TablePagination
              currentPage={reqPage}
              pageSize={reqPageSize}
              totalItems={filteredRequisitions.length}
              onPageChange={setReqPage}
              onPageSizeChange={(sz) => {
                setReqPageSize(sz);
                setReqPage(1);
              }}
              itemName="phiếu yêu cầu định biên"
            />
          )}
        </div>
      )}

      {/* =========================================================================
          SECTION 3: HM-PIPELINE (GIÁM SÁT PHỄU ỨNG VIÊN BỘ PHẬN)
         ========================================================================= */}
      {activeSection === 'hm-pipeline' && (
        <div className="space-y-5">
          <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <Users className="h-5 w-5 text-emerald-600" />
                  Phễu Ứng Viên Tuyển Dụng Phòng {hmDepartment} ({filteredPipelineCandidates.length}{' '}
                  ứng viên)
                </h2>
                <p className="text-xs text-slate-500">
                  Theo dõi tiến độ chuyển vòng, điểm số hội đồng và mở Hồ sơ 360° cho từng ứng viên.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <ModernSelect<number>
                  value={selectedJob.id}
                  onChange={(val) => {
                    onSelectJobId(Number(val));
                    setPipePage(1);
                  }}
                  options={departmentJobs.map((j) => ({
                    value: j.id,
                    label: j.title,
                    badge: `${j.filledCount}/${j.headcount}`,
                    badgeColor: 'bg-emerald-50 text-emerald-700',
                  }))}
                  icon={Briefcase}
                />

                <div className="flex items-center gap-1 rounded-2xl border border-slate-200 bg-slate-50 p-1">
                  <button
                    type="button"
                    onClick={() => setPipeViewMode('TABLE')}
                    className={cn(
                      'inline-flex cursor-pointer items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all',
                      pipeViewMode === 'TABLE'
                        ? 'bg-amber-500 text-slate-950 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900',
                    )}
                  >
                    <TableIcon className="h-3.5 w-3.5" />
                    Bảng Phân Trang
                  </button>
                  <button
                    type="button"
                    onClick={() => setPipeViewMode('BOARD')}
                    className={cn(
                      'inline-flex cursor-pointer items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all',
                      pipeViewMode === 'BOARD'
                        ? 'bg-amber-500 text-slate-950 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900',
                    )}
                  >
                    <LayoutGrid className="h-3.5 w-3.5" />
                    Cột 6 Vòng
                  </button>
                </div>
              </div>
            </div>

            {/* Filter Toolbar */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5">
                <div className="relative">
                  <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={pipeSearch}
                    onChange={(e) => {
                      setPipeSearch(e.target.value);
                      setPipePage(1);
                    }}
                    placeholder="Tìm tên ứng viên, email, kinh nghiệm..."
                    className="w-56 sm:w-64 rounded-2xl border border-slate-200/90 bg-white py-1.5 pr-8 pl-8 text-xs shadow-2xs transition-all focus:border-amber-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400/20"
                  />
                  {pipeSearch && (
                    <button
                      type="button"
                      onClick={() => {
                        setPipeSearch('');
                        setPipePage(1);
                      }}
                      className="absolute top-1/2 right-2.5 -translate-y-1/2 cursor-pointer rounded-full p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setPipePage(1)}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-2xl border border-amber-300/80 bg-amber-500 hover:bg-amber-400 px-3.5 py-1.5 text-xs font-extrabold text-slate-950 shadow-xs transition-all active:scale-95"
                >
                  <Search className="h-3.5 w-3.5" />
                  <span>Tìm kiếm</span>
                </button>
              </div>

              <ModernSelect<'ALL' | StageCode>
                value={pipeStageFilter}
                onChange={(val) => {
                  setPipeStageFilter(val);
                  setPipePage(1);
                }}
                options={[
                  { value: 'ALL', label: 'Tất cả các vòng (Stages)' },
                  { value: 'APPLIED', label: '1. APPLIED (Mới nộp)' },
                  { value: 'SCREENING', label: '2. SCREENING (Sàng lọc)' },
                  { value: 'TEST', label: '3. TEST (Bài kiểm tra)' },
                  { value: 'INTERVIEW', label: '4. INTERVIEW (Phỏng vấn)' },
                  { value: 'OFFER', label: '5. OFFER (Đề nghị việc)' },
                  { value: 'HIRED', label: '6. HIRED (Trúng tuyển)' },
                  { value: 'REJECTED', label: '7. REJECTED (Đã loại)' },
                ]}
                icon={Layers}
              />

              <ModernSelect<
                'ALL' | 'PASSED_THRESHOLD' | 'VARIANCE' | 'KNOCKOUT' | 'HM_APPROVED'
              >
                value={pipeAlertFilter}
                onChange={(val) => {
                  setPipeAlertFilter(val);
                  setPipePage(1);
                }}
                options={[
                  { value: 'ALL', label: 'Mọi cờ cảnh báo & đánh giá' },
                  {
                    value: 'PASSED_THRESHOLD',
                    label: `Đạt ngưỡng chuẩn (≥ ${selectedJob.passScoreThreshold.toFixed(1)})`,
                    badgeColor: 'bg-emerald-50 text-emerald-700',
                  },
                  {
                    value: 'VARIANCE',
                    label: 'Lệch điểm Δ ≥ 2.0',
                    badgeColor: 'bg-amber-50 text-amber-800',
                  },
                  {
                    value: 'KNOCKOUT',
                    label: 'Dính điểm liệt (Knock-out)',
                    badgeColor: 'bg-red-50 text-red-700',
                  },
                  {
                    value: 'HM_APPROVED',
                    label: 'Đã duyệt Offer (D11)',
                    badgeColor: 'bg-sky-50 text-sky-700',
                  },
                ]}
                icon={Filter}
              />

              {(pipeSearch || pipeStageFilter !== 'ALL' || pipeAlertFilter !== 'ALL') && (
                <button
                  type="button"
                  onClick={() => {
                    setPipeSearch('');
                    setPipeStageFilter('ALL');
                    setPipeAlertFilter('ALL');
                    setPipePage(1);
                  }}
                  className="inline-flex cursor-pointer items-center gap-1 rounded-2xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  <RotateCcw className="h-3 w-3 text-slate-400" />
                  Đặt lại lọc
                </button>
              )}
            </div>
          </div>

          {pipeViewMode === 'TABLE' ? (
            <div className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold text-slate-600 uppercase">
                      <th className="px-4 py-3.5">Ứng Viên</th>
                      <th className="px-3.5 py-3.5">Vòng Hiện Tại</th>
                      <th className="px-3.5 py-3.5 text-center">Tiến Độ HĐ</th>
                      <th className="px-3.5 py-3.5 text-center">Điểm Tổng S</th>
                      <th className="px-3.5 py-3.5">Cờ Cảnh Báo / Phê Duyệt</th>
                      <th className="px-4 py-3.5 text-right">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedPipelineCandidates.map((cand) => {
                      const m = computeCandidateMetrics(cand, selectedJob.criteria);
                      return (
                        <tr key={cand.id} className="hover:bg-slate-50/60">
                          <td className="px-4 py-3.5">
                            <p className="font-extrabold text-slate-900">{cand.fullName}</p>
                            <p className="text-[11px] text-slate-500 line-clamp-1">
                              {cand.experience}
                            </p>
                          </td>
                          <td className="px-3.5 py-3.5">
                            <span className="rounded-lg bg-slate-100 px-2.5 py-1 font-mono text-[11px] font-bold text-slate-800">
                              {cand.stageCode}
                            </span>
                          </td>
                          <td className="px-3.5 py-3.5 text-center font-mono text-[11px]">
                            {m.submittedCount}/{m.panelSize} phiếu
                          </td>
                          <td className="px-3.5 py-3.5 text-center font-mono font-extrabold text-slate-900">
                            {m.overallScore !== null ? m.overallScore.toFixed(2) : '🔒 Blind'}
                          </td>
                          <td className="px-3.5 py-3.5 space-x-1">
                            {cand.offerApprovedByHm && (
                              <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                                ✓ Đã duyệt Offer
                              </span>
                            )}
                            {m.hasVarianceAlert && !cand.calibrated && (
                              <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                                Lệch Δ ≥ 2.0
                              </span>
                            )}
                            {m.isDisqualified && (
                              <span className="rounded-md bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">
                                Điểm liệt
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-right space-x-1.5">
                            <button
                              type="button"
                              onClick={() => onOpenCandidate360(cand.id)}
                              className="cursor-pointer rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                            >
                              Hồ sơ 360°
                            </button>
                            {cand.stageCode === 'OFFER' && (
                              <button
                                type="button"
                                onClick={() => setApproveModalCand(cand)}
                                className="cursor-pointer rounded-xl border border-amber-300/80 bg-amber-500 hover:bg-amber-400 px-3 py-1.5 text-xs font-extrabold text-slate-950"
                              >
                                Duyệt Offer
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* 6-COLUMN BOARD MODE */
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              {(
                ['APPLIED', 'SCREENING', 'TEST', 'INTERVIEW', 'OFFER', 'HIRED'] as StageCode[]
              ).map((stg) => {
                const candsInStage = filteredPipelineCandidates.filter((c) => c.stageCode === stg);
                return (
                  <div
                    key={stg}
                    className="flex flex-col rounded-3xl border border-slate-200/90 bg-slate-50/70 p-3 shadow-2xs"
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
                      {candsInStage.map((cand) => {
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
                                <span className="rounded bg-emerald-50 px-1.5 py-0.5 font-mono text-[10px] font-bold text-emerald-700">
                                  {m.overallScore.toFixed(1)}
                                </span>
                              )}
                            </div>
                            <p className="mt-1 line-clamp-1 text-[11px] text-slate-500">
                              {cand.experience}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {filteredPipelineCandidates.length > 0 && (
            <TablePagination
              currentPage={pipePage}
              pageSize={pipePageSize}
              totalItems={filteredPipelineCandidates.length}
              onPageChange={setPipePage}
              onPageSizeChange={(sz) => {
                setPipePageSize(sz);
                setPipePage(1);
              }}
              itemName="ứng viên trong phễu"
            />
          )}
        </div>
      )}

      {/* =========================================================================
          SECTION 4: HM-CALIBRATION (CHỦ TRÌ CALIBRATION & BẢNG XẾP HẠNG — Δ_i ≥ 2.0)
         ========================================================================= */}
      {activeSection === 'hm-calibration' && (
        <div className="space-y-5">
          <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <Scale className="h-5 w-5 text-violet-600" />
                  Bảng Xếp Hạng & Họp Hiệu Chỉnh Điểm Lệch Calibration ($\Delta_i \ge 2.0$ — S4.16–S4.19)
                </h2>
                <p className="text-xs text-slate-500">
                  Xếp hạng ứng viên theo điểm tổng $S$ giảm dần. Khi $\Delta_i = \max - \min \ge
                  2.0$, Hiring Manager chủ trì họp và ký biên bản Calibration ($\ge 10$ ký tự) để mở
                  khóa vòng Offer.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <ModernSelect<number>
                  value={selectedJob.id}
                  onChange={(val) => {
                    onSelectJobId(Number(val));
                    setCalibPage(1);
                  }}
                  options={departmentJobs.map((j) => ({
                    value: j.id,
                    label: j.title,
                  }))}
                  icon={Briefcase}
                />

                <button
                  type="button"
                  onClick={() =>
                    exportRankingToCsv(selectedJob, departmentCandidates, selectedJob.criteria)
                  }
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-2 text-xs font-extrabold text-emerald-900 hover:bg-emerald-100 transition-all"
                >
                  <FileSpreadsheet className="h-4 w-4 text-emerald-700" />
                  Xuất Bảng Xếp Hạng (.CSV)
                </button>
              </div>
            </div>

            {/* Filter Toolbar */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5">
                <div className="relative">
                  <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={calibSearch}
                    onChange={(e) => {
                      setCalibSearch(e.target.value);
                      setCalibPage(1);
                    }}
                    placeholder="Tìm tên ứng viên, biên bản calibration..."
                    className="w-56 sm:w-64 rounded-2xl border border-slate-200/90 bg-white py-1.5 pr-8 pl-8 text-xs shadow-2xs transition-all focus:border-amber-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400/20"
                  />
                  {calibSearch && (
                    <button
                      type="button"
                      onClick={() => {
                        setCalibSearch('');
                        setCalibPage(1);
                      }}
                      className="absolute top-1/2 right-2.5 -translate-y-1/2 cursor-pointer rounded-full p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setCalibPage(1)}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-2xl border border-amber-300/80 bg-amber-500 hover:bg-amber-400 px-3.5 py-1.5 text-xs font-extrabold text-slate-950 shadow-xs transition-all active:scale-95"
                >
                  <Search className="h-3.5 w-3.5" />
                  <span>Tìm kiếm</span>
                </button>
              </div>

              <ModernSelect<
                'ALL' | 'NEEDS_CALIB' | 'CALIBRATED' | 'KNOCKOUT' | 'CONSENSUS'
              >
                value={calibStatusFilter}
                onChange={(val) => {
                  setCalibStatusFilter(val);
                  setCalibPage(1);
                }}
                options={[
                  { value: 'ALL', label: 'Tất cả trạng thái đồng thuận' },
                  {
                    value: 'NEEDS_CALIB',
                    label: 'Lệch điểm Δ ≥ 2.0 (Chờ ký biên bản)',
                    badge: 'Urgent',
                    badgeColor: 'bg-amber-50 text-amber-800',
                  },
                  {
                    value: 'CALIBRATED',
                    label: 'Đã ký biên bản Calibration',
                    badge: 'Signed',
                    badgeColor: 'bg-emerald-50 text-emerald-700',
                  },
                  {
                    value: 'KNOCKOUT',
                    label: 'Vi phạm Điểm liệt (Knock-out)',
                    badge: 'Failed',
                    badgeColor: 'bg-red-50 text-red-700',
                  },
                  {
                    value: 'CONSENSUS',
                    label: 'Đồng thuận tự nhiên (Δ < 2.0)',
                    badgeColor: 'bg-sky-50 text-sky-700',
                  },
                ]}
                icon={Filter}
              />

              {(calibSearch || calibStatusFilter !== 'ALL') && (
                <button
                  type="button"
                  onClick={() => {
                    setCalibSearch('');
                    setCalibStatusFilter('ALL');
                    setCalibPage(1);
                  }}
                  className="inline-flex cursor-pointer items-center gap-1 rounded-2xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  <RotateCcw className="h-3 w-3 text-slate-400" />
                  Đặt lại lọc
                </button>
              )}
            </div>

            {/* Calibration Matrix Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold text-slate-600 uppercase">
                    <th className="px-3.5 py-3">Hạng</th>
                    <th className="px-3.5 py-3">Ứng Viên & Vòng</th>
                    {selectedJob.criteria.map((c) => (
                      <th key={c.id} className="px-3.5 py-3">
                        {c.name} ({c.weightPercent}%)
                      </th>
                    ))}
                    <th className="px-3.5 py-3 text-right">Điểm Tổng S</th>
                    <th className="px-3.5 py-3 text-right">Calibration & Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedCalibrationCandidates.map(({ cand, metrics }, idx) => {
                    const rank = (calibPage - 1) * calibPageSize + idx + 1;
                    return (
                      <tr key={cand.id} className="hover:bg-slate-50/70">
                        <td className="px-3.5 py-3 font-mono font-extrabold text-slate-500">
                          #{rank}
                        </td>
                        <td className="px-3.5 py-3">
                          <button
                            type="button"
                            onClick={() => onOpenCandidate360(cand.id)}
                            className="cursor-pointer font-extrabold text-slate-900 hover:text-emerald-700 hover:underline"
                          >
                            {cand.fullName}
                          </button>
                          <p className="font-mono text-[10px] text-slate-400">{cand.stageCode}</p>
                        </td>
                        {selectedJob.criteria.map((c) => {
                          const pc = metrics.perCriterion.find((p) => p.criterionId === c.id);
                          if (!metrics.allSubmitted || !pc) {
                            return (
                              <td key={c.id} className="px-3.5 py-3 text-slate-400 italic">
                                🔒 Đang chấm ({metrics.submittedCount}/{metrics.panelSize})
                              </td>
                            );
                          }
                          return (
                            <td
                              key={c.id}
                              className={cn(
                                'px-3.5 py-3 font-mono tabular-nums',
                                pc.knockoutFail
                                  ? 'bg-red-50 font-bold text-red-700'
                                  : pc.varianceFlag
                                    ? 'bg-amber-50 font-bold text-amber-900'
                                    : 'text-slate-700',
                              )}
                            >
                              TB: {pc.mean.toFixed(2)} (Δ={pc.delta.toFixed(1)})
                            </td>
                          );
                        })}
                        <td className="px-3.5 py-3 text-right font-mono font-black tabular-nums text-slate-900">
                          {metrics.overallScore !== null ? metrics.overallScore.toFixed(2) : '—'}
                        </td>
                        <td className="px-3.5 py-3 text-right space-x-1.5">
                          {metrics.isDisqualified ? (
                            <span className="rounded-lg bg-red-100 px-2.5 py-1 text-[11px] font-bold text-red-700">
                              Điểm liệt (D05)
                            </span>
                          ) : metrics.hasVarianceAlert ? (
                            <button
                              type="button"
                              onClick={() => {
                                setCalibratingCandidate(cand);
                                setCalibrationNoteInput(cand.calibrationNote || '');
                              }}
                              className={cn(
                                'cursor-pointer rounded-xl px-3 py-1.5 text-xs font-extrabold transition-all',
                                cand.calibrated
                                  ? 'border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                                  : 'border border-amber-300/80 bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-2xs',
                              )}
                            >
                              {cand.calibrated
                                ? '✓ Xem / Sửa Biên Bản'
                                : '✍️ Ký Biên Bản Calibration'}
                            </button>
                          ) : (
                            <span className="text-[11px] font-semibold text-emerald-700">
                              Đồng thuận
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {filteredCalibrationCandidates.length > 0 && (
              <TablePagination
                currentPage={calibPage}
                pageSize={calibPageSize}
                totalItems={filteredCalibrationCandidates.length}
                onPageChange={setCalibPage}
                onPageSizeChange={(sz) => {
                  setCalibPageSize(sz);
                  setCalibPage(1);
                }}
                itemName="ứng viên xếp hạng"
              />
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          SECTION 5: HM-STUDIO (EVALUATION STUDIO WHEN HM IS ON INTERVIEW PANEL)
         ========================================================================= */}
      {activeSection === 'hm-studio' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-slate-200/90 bg-white px-5 py-3.5 shadow-xs">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-extrabold text-slate-700 flex items-center gap-1.5">
                <Briefcase className="h-4 w-4 text-emerald-600" />
                Vị trí Job thuộc bộ phận {hmDepartment}:
              </span>
              <ModernSelect<number>
                value={selectedJob.id}
                onChange={(jid) => {
                  onSelectJobId(jid);
                  const first = store.candidates.find((c) => c.jobId === jid);
                  if (first) onSelectEvalCandidateId(first.id);
                }}
                options={departmentJobs.map((j) => ({
                  value: j.id,
                  label: j.title,
                  badge: j.department,
                  badgeColor: 'bg-emerald-50 text-emerald-700',
                }))}
                icon={Building2}
              />
            </div>

            <button
              type="button"
              onClick={() => handleOpenBaremModal(selectedJob)}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-amber-300/80 bg-amber-500 hover:bg-amber-400 px-3.5 py-1.5 text-xs font-extrabold text-slate-950 shadow-2xs"
            >
              <Sliders className="h-3.5 w-3.5" />
              Kiểm Tra Barem Trọng Số (∑w=100%)
            </button>
          </div>

          <EvaluationStudioView
            currentUser={currentUser}
            jobTitle={selectedJob.title}
            passThreshold={selectedJob.passScoreThreshold}
            criteria={selectedJob.criteria}
            candidates={store.candidates.filter((c) => c.jobId === selectedJob.id)}
            selectedCandidateId={selectedEvalCandidateId}
            onSelectCandidate={onSelectEvalCandidateId}
            onUpdateSheetScore={onUpdateSheetScore}
            onUpdateSheetCriterionComment={onUpdateSheetCriterionComment}
            onUpdateSheetMeta={onUpdateSheetMeta}
            onSubmitSheet={onSubmitSheet}
          />
        </div>
      )}

      {/* =========================================================================
          ISOLATED MODAL 1: THẨM ĐỊNH & PHÊ DUYỆT ĐỀ NGHỊ NHẬN VIỆC (approveModalCand)
         ========================================================================= */}
      <AnimatedSpringDialog
        open={Boolean(approveModalCand)}
        onOpenChange={(open) => !open && setApproveModalCand(null)}
        title={`Phê Duyệt Đề Nghị Nhận Việc (Offer Sign-off) — ${approveModalCand?.fullName ?? ''}`}
        subtitle="Chốt chặn quyền hạn độc quyền của Hiring Manager theo quy định D11 / S3.19"
      >
        {approveModalCand &&
          (() => {
            const cJob = store.jobs.find((j) => j.id === approveModalCand.jobId) ?? selectedJob;
            const m = computeCandidateMetrics(approveModalCand, cJob.criteria);

            return (
              <div className="space-y-4 text-xs">
                <div className="rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50/90 via-teal-50/50 to-white p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[11px] text-slate-500">Vị trí tuyển dụng:</span>
                      <p className="text-sm font-extrabold text-slate-900">{cJob.title}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] text-slate-500">Điểm phỏng vấn trung bình:</span>
                      <p className="font-mono text-base font-black text-emerald-700">
                        S = {m.overallScore?.toFixed(2) ?? '—'} / 5.0 (Chuẩn ≥{' '}
                        {cJob.passScoreThreshold.toFixed(1)})
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5">
                    <span className="text-[11px] text-slate-500 block">
                      Mức lương HR đề xuất (Gross):
                    </span>
                    <span className="font-mono text-base font-black text-emerald-700">
                      {approveModalCand.offerSalary}
                    </span>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5">
                    <span className="text-[11px] text-slate-500 block">
                      Khung ngân sách định biên:
                    </span>
                    <span className="font-mono text-sm font-bold text-slate-800">
                      {cJob.salaryRange}
                    </span>
                  </div>
                </div>

                <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setApproveModalCand(null)}
                    className="cursor-pointer rounded-2xl border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Đóng
                  </button>
                  <button
                    type="button"
                    onClick={() => handleConfirmApproveOffer(approveModalCand)}
                    className="cursor-pointer rounded-2xl border border-amber-300/80 bg-amber-500 hover:bg-amber-400 px-5 py-2 font-extrabold text-slate-950 shadow-xs"
                  >
                    {approveModalCand.offerApprovedByHm
                      ? 'Thu Hồi Phê Duyệt Offer'
                      : '✓ Ký Phê Duyệt Chính Thức (Mở Khóa HIRED)'}
                  </button>
                </div>
              </div>
            );
          })()}
      </AnimatedSpringDialog>

      {/* =========================================================================
          ISOLATED MODAL 2: YÊU CẦU ĐIỀU CHỈNH / TỪ CHỐI OFFER (rejectOfferCandidate)
         ========================================================================= */}
      <AnimatedSpringDialog
        open={Boolean(rejectOfferCandidate)}
        onOpenChange={(open) => !open && setRejectOfferCandidate(null)}
        title={`Yêu Cầu Điều Chỉnh Đề Nghị Nhận Việc — ${rejectOfferCandidate?.fullName ?? ''}`}
        subtitle="Phản hồi cho bộ phận HR để đàm phán lại khung lương hoặc phúc lợi"
      >
        {rejectOfferCandidate && (
          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700">
                Lý do yêu cầu điều chỉnh / từ chối Offer <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                value={rejectOfferReason}
                onChange={(e) => setRejectOfferReason(e.target.value)}
                placeholder="VD: Mức lương đề xuất vượt khung ngân sách Q4 của phòng, đề nghị HR đàm phán lại ở mức 42.000.000 VNĐ..."
                className="mt-1.5 w-full rounded-2xl border border-slate-200 p-3 text-xs focus:border-amber-400 focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRejectOfferCandidate(null)}
                className="cursor-pointer rounded-2xl border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-600 hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmRejectOffer}
                className="cursor-pointer rounded-2xl border border-red-300 bg-red-600 hover:bg-red-700 px-5 py-2 font-extrabold text-white shadow-xs"
              >
                Gửi Yêu Cầu Điều Chỉnh
              </button>
            </div>
          </div>
        )}
      </AnimatedSpringDialog>

      {/* =========================================================================
          ISOLATED MODAL 3: TẠO YÊU CẦU ĐỊNH BIÊN MỚI (isCreateReqOpen)
         ========================================================================= */}
      <AnimatedSpringDialog
        open={isCreateReqOpen}
        onOpenChange={setIsCreateReqOpen}
        title={`Tạo Yêu Cầu Định Biên Nhân Sự Mới — Phòng ${hmDepartment}`}
        subtitle="Khởi tạo phiếu Requisition gửi bộ phận HR phê duyệt và mở chiến dịch Job 1–1 (D14)"
      >
        <form onSubmit={handleSubmitRequisition} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-700">
                Chức danh vị trí cần tuyển <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={newReqTitle}
                onChange={(e) => setNewReqTitle(e.target.value)}
                placeholder="VD: Senior Backend Engineer (NestJS / Microservices)..."
                className="mt-1 w-full rounded-2xl border border-slate-200 px-3.5 py-2 focus:border-amber-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700">
                Chỉ tiêu (Headcount) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min={1}
                max={20}
                required
                value={newReqHeadcount}
                onChange={(e) => setNewReqHeadcount(Number(e.target.value))}
                className="mt-1 w-full rounded-2xl border border-slate-200 px-3.5 py-2 font-mono font-bold focus:border-amber-400 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700">Khung ngân sách lương dự kiến</label>
            <input
              type="text"
              value={newReqSalary}
              onChange={(e) => setNewReqSalary(e.target.value)}
              className="mt-1 w-full rounded-2xl border border-slate-200 px-3.5 py-2 font-mono focus:border-amber-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700">
              Lý do tuyển dụng / Mục tiêu dự án
            </label>
            <textarea
              rows={2}
              value={newReqJustification}
              onChange={(e) => setNewReqJustification(e.target.value)}
              placeholder="VD: Bổ sung nhân sự cốt lõi cho dự án chuyển đổi số Quý tới..."
              className="mt-1 w-full rounded-2xl border border-slate-200 p-3 focus:border-amber-400 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsCreateReqOpen(false)}
              className="cursor-pointer rounded-2xl border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-600 hover:bg-slate-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="cursor-pointer rounded-2xl border border-amber-300/80 bg-amber-500 hover:bg-amber-400 px-5 py-2 font-extrabold text-slate-950 shadow-xs"
            >
              Gửi Phiếu Định Biên Cho HR
            </button>
          </div>
        </form>
      </AnimatedSpringDialog>

      {/* =========================================================================
          ISOLATED MODAL 4: THIẾT KẾ BAREM TIÊU CHÍ & TRỌNG SỐ ∑w = 100% (editingBaremJob)
         ========================================================================= */}
      <AnimatedSpringDialog
        open={Boolean(editingBaremJob)}
        onOpenChange={(open) => !open && setEditingBaremJob(null)}
        title={`Thiết Kế Barem Trọng Số (∑w = 100%) — ${editingBaremJob?.title ?? ''}`}
        subtitle="Quy tắc bất biến D04 (S2.8): Tổng trọng số các tiêu chí phải bằng đúng 100% và tự động khóa khi đã có ứng viên nộp đơn (S2.7)"
      >
        {editingBaremJob &&
          (() => {
            const sumWeights = draftCriteria.reduce(
              (acc, c) => acc + Number(c.weightPercent || 0),
              0,
            );
            const appCount = store.candidates.filter((c) => c.jobId === editingBaremJob.id).length;

            return (
              <div className="space-y-4 text-xs">
                <div
                  className={cn(
                    'flex items-center justify-between rounded-2xl border p-3.5',
                    sumWeights === 100
                      ? 'border-emerald-200 bg-emerald-50/80 text-emerald-950'
                      : 'border-red-300 bg-red-50/80 text-red-900',
                  )}
                >
                  <div>
                    <span className="font-bold block">
                      Tổng trọng số hiện tại: {sumWeights}% / 100%
                    </span>
                    <span className="text-[11px]">
                      {appCount > 0
                        ? `🔒 Chiến dịch đã có ${appCount} ứng viên (Bị khóa bảo vệ theo S2.7)`
                        : '🔓 Cho phép điều chỉnh tiêu chí trước khi nhận hồ sơ'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold">Ngưỡng đạt:</span>
                    <input
                      type="number"
                      step={0.1}
                      min={1.0}
                      max={5.0}
                      value={draftThreshold}
                      onChange={(e) => setDraftThreshold(Number(e.target.value))}
                      className="w-16 rounded-xl border border-slate-200 bg-white px-2 py-1 text-center font-mono font-bold"
                    />
                  </div>
                </div>

                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                  {draftCriteria.map((crit, index) => (
                    <div
                      key={crit.id}
                      className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-2.5"
                    >
                      <input
                        type="text"
                        value={crit.name}
                        onChange={(e) =>
                          setDraftCriteria((prev) =>
                            prev.map((item, i) =>
                              i === index ? { ...item, name: e.target.value } : item,
                            ),
                          )
                        }
                        className="flex-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold"
                      />
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min={1}
                          max={100}
                          value={crit.weightPercent}
                          onChange={(e) =>
                            setDraftCriteria((prev) =>
                              prev.map((item, i) =>
                                i === index
                                  ? { ...item, weightPercent: Number(e.target.value) }
                                  : item,
                              ),
                            )
                          }
                          className="w-16 rounded-xl border border-slate-200 px-2 py-1.5 text-center font-mono font-bold"
                        />
                        <span className="font-mono font-bold text-slate-500">%</span>
                      </div>
                      <label className="flex cursor-pointer items-center gap-1 rounded-xl bg-red-50 px-2.5 py-1.5 text-[10px] font-bold text-red-700">
                        <input
                          type="checkbox"
                          checked={crit.isKnockout}
                          onChange={(e) =>
                            setDraftCriteria((prev) =>
                              prev.map((item, i) =>
                                i === index ? { ...item, isKnockout: e.target.checked } : item,
                              ),
                            )
                          }
                        />
                        Điểm liệt
                      </label>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setEditingBaremJob(null)}
                    className="cursor-pointer rounded-2xl border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Đóng
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveBaremModal}
                    className="cursor-pointer rounded-2xl border border-amber-300/80 bg-amber-500 hover:bg-amber-400 px-5 py-2 font-extrabold text-slate-950 shadow-xs"
                  >
                    Lưu Barem Trọng Số (∑w=100%)
                  </button>
                </div>
              </div>
            );
          })()}
      </AnimatedSpringDialog>

      {/* =========================================================================
          ISOLATED MODAL 5: KÝ BIÊN BẢN CALIBRATION (calibratingCandidate)
         ========================================================================= */}
      <AnimatedSpringDialog
        open={Boolean(calibratingCandidate)}
        onOpenChange={(open) => !open && setCalibratingCandidate(null)}
        title={`Biên Bản Họp Hiệu Chỉnh Điểm Lệch Calibration — ${calibratingCandidate?.fullName ?? ''}`}
        subtitle="Giải quyết độ lệch điểm Δ_i ≥ 2.0 giữa các giám khảo để mở khóa tiến trình sang vòng Offer (D05 / S4.18)"
      >
        {calibratingCandidate && (
          <div className="space-y-4 text-xs">
            <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-3.5 text-amber-950">
              <p className="font-bold">
                Ứng viên có độ lệch điểm giữa các giám khảo $\Delta_i = \max - \min \ge 2.0$:
              </p>
              <p className="mt-1 text-[11px] leading-relaxed">
                Vui lòng ghi rõ kết luận thống nhất của cuộc họp hội đồng (tối thiểu 10 ký tự) để
                hệ thống ghi vết kiểm toán và mở khóa chuyển sang vòng <code>OFFER</code>.
              </p>
            </div>

            <div>
              <label className="block font-bold text-slate-700">
                Nội dung kết luận cuộc họp Calibration <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={4}
                value={calibrationNoteInput}
                onChange={(e) => setCalibrationNoteInput(e.target.value)}
                placeholder="VD: Hội đồng đã họp rà soát lại tiêu chí System Design, thống nhất ứng viên đáp ứng tốt kiến trúc phân tán và đồng thuận đề xuất tuyển dụng..."
                className="mt-1.5 w-full rounded-2xl border border-slate-200 p-3 text-xs focus:border-amber-400 focus:outline-none"
              />
              <span className="mt-1 block font-mono text-[10px] text-slate-400">
                Độ dài hiện tại: {calibrationNoteInput.trim().length} / 10 ký tự tối thiểu
              </span>
            </div>

            <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCalibratingCandidate(null)}
                className="cursor-pointer rounded-2xl border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-600 hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveCalibrationNote}
                className="cursor-pointer rounded-2xl border border-amber-300/80 bg-amber-500 hover:bg-amber-400 px-5 py-2 font-extrabold text-slate-950 shadow-xs"
              >
                ✓ Ký & Lưu Biên Bản Calibration
              </button>
            </div>
          </div>
        )}
      </AnimatedSpringDialog>
    </div>
  );
};
