import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import {
  AlertTriangle,
  ArrowRight,
  Award,
  BarChart3,
  Briefcase,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock,
  Download,
  Eye,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  Filter,
  GripVertical,
  Inbox,
  Kanban,
  Lock,
  Mail,
  MessageSquare,
  Plus,
  RotateCcw,
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
import { AnimatePresence, motion } from 'motion/react';
import React, { useMemo, useState } from 'react';
import { GuardViolationState } from '@/components/animate-ui/guard-dialog';
import { ModernSelect } from '@/components/animate-ui/modern-select';
import { EvaluationStudioView } from '@/components/portals/evaluation-studio';
import { JobSetupView } from '@/components/portals/job-setup-view';
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
  StageDef,
} from '@/lib/store';
import { cn } from '@/lib/utils';

export type KanbanFilterType = 'ALL' | 'RETURNING' | 'VARIANCE' | 'KNOCKOUT' | 'PENDING_OFFER';

// =========================================================================
// KANBAN DRAGGABLE CARD COMPONENT
// =========================================================================
export const DraggableKanbanCard: React.FC<{
  card: CandidateCardData;
  stage: StageDef;
  enabledStages: StageDef[];
  criteria: CriterionDef[];
  passThreshold: number;
  onAttemptMove: (candidateId: number, toStageCode: StageCode) => void;
  onOpen360: (candidateId: number) => void;
}> = ({
  card,
  stage,
  enabledStages,
  criteria,
  passThreshold,
  onAttemptMove,
  onOpen360,
}) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `card-${card.id}`,
    data: { candidateId: card.id, fromStageCode: card.stageCode },
  });

  const style = transform
    ? {
        transform: CSS.Translate.toString(transform),
      }
    : undefined;

  const m = computeCandidateMetrics(card, criteria);
  const nonTerminalOrdered = enabledStages
    .filter((s) => s.code !== 'REJECTED')
    .sort((a, b) => a.order - b.order);
  const currIdx = nonTerminalOrdered.findIndex((s) => s.code === stage.code);
  const nextStageObj =
    currIdx >= 0 && currIdx + 1 < nonTerminalOrdered.length
      ? nonTerminalOrdered[currIdx + 1]
      : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group relative flex flex-col justify-between rounded-2xl border bg-white p-3.5 shadow-xs transition-all hover:shadow-md',
        isDragging && 'z-40 scale-105 rotate-1 opacity-85 shadow-2xl ring-2 ring-blue-500',
        m.isDisqualified
          ? 'border-red-300 ring-1 ring-red-100'
          : m.hasVarianceAlert && !card.calibrated
            ? 'border-amber-300 ring-1 ring-amber-100'
            : 'border-slate-200/90',
      )}
    >
      <div>
        <div className="mb-2 flex items-start justify-between gap-1.5">
          <div className="flex flex-wrap items-center gap-1">
            {card.isReturningCandidate && (
              <span
                title={card.previousApplicationsNote}
                className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-800"
              >
                Ứng viên cũ
              </span>
            )}
            {m.isDisqualified && (
              <span className="inline-flex items-center gap-1 rounded-md bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                <ShieldAlert className="h-3 w-3" />
                Điểm liệt
              </span>
            )}
            {m.hasVarianceAlert && !m.isDisqualified && (
              <span
                className={cn(
                  'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold',
                  card.calibrated
                    ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-300'
                    : 'bg-amber-100 text-amber-900 ring-1 ring-amber-400',
                )}
              >
                <AlertTriangle className="h-3 w-3" />
                {card.calibrated ? 'Đã Calibration' : 'Lệch Δ ≥ 2.0'}
              </span>
            )}
          </div>

          <button
            type="button"
            {...listeners}
            {...attributes}
            title="Giữ chuột để kéo-thả thẻ sang cột khác"
            className="cursor-grab rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 active:cursor-grabbing"
          >
            <GripVertical className="h-4 w-4" />
          </button>
        </div>

        <h3 className="text-xs font-bold text-slate-900">{card.fullName}</h3>
        <p className="mt-0.5 line-clamp-2 text-[11px] text-slate-500">{card.experience}</p>

        <div className="mt-2.5 flex items-center justify-between rounded-xl bg-slate-50 px-2.5 py-1.5 text-[11px]">
          <span className="font-medium text-slate-600">
            HĐ:{' '}
            <strong className="font-mono text-slate-900 tabular-nums">
              {m.submittedCount}/{m.panelSize}
            </strong>
          </span>
          {m.allSubmitted && m.overallScore !== null ? (
            <span
              className={cn(
                'font-mono font-bold tabular-nums',
                m.isDisqualified
                  ? 'text-red-600'
                  : m.overallScore >= passThreshold
                    ? 'text-emerald-600'
                    : 'text-amber-600',
              )}
            >
              S = {m.overallScore.toFixed(2)}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 font-semibold text-blue-600">
              <Lock className="h-3 w-3" />
              Blind Lock
            </span>
          )}
        </div>

        {card.stageCode === 'OFFER' && (
          <div className="mt-2 flex items-center justify-between rounded-xl border border-slate-200 px-2.5 py-1.5 text-[10px]">
            <span className="font-semibold text-slate-600">HM Duyệt Offer:</span>
            {card.offerApprovedByHm ? (
              <span className="inline-flex items-center gap-1 font-bold text-emerald-700">
                <CheckCircle2 className="h-3 w-3" />
                Đã duyệt
              </span>
            ) : (
              <span className="font-bold text-amber-700">Chờ HM duyệt</span>
            )}
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center gap-1.5 border-t border-slate-100 pt-2.5">
        {nextStageObj && card.stageCode !== 'HIRED' && card.stageCode !== 'REJECTED' && (
          <button
            type="button"
            onClick={() => onAttemptMove(card.id, nextStageObj.code)}
            className="flex-1 cursor-pointer rounded-lg bg-slate-900 px-2 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-blue-600"
          >
            → {nextStageObj.code}
          </button>
        )}
        <button
          type="button"
          onClick={() => onOpen360(card.id)}
          className="cursor-pointer rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-[10px] font-bold text-blue-700 hover:bg-blue-100"
        >
          Hồ sơ 360°
        </button>
      </div>
    </div>
  );
};

// =========================================================================
// KANBAN DROPPABLE COLUMN COMPONENT
// =========================================================================
export const DroppableKanbanColumn: React.FC<{
  stage: StageDef;
  children: React.ReactNode;
  count: number;
}> = ({ stage, children, count }) => {
  const { isOver, setNodeRef } = useDroppable({
    id: `stage-${stage.code}`,
    data: { stageCode: stage.code },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex min-h-[520px] flex-col rounded-2xl border p-3 transition-all',
        isOver
          ? 'border-blue-500 bg-blue-50/60 ring-2 ring-blue-500/20'
          : stage.code === 'REJECTED'
            ? 'border-rose-200/80 bg-rose-50/35'
            : 'border-slate-200/90 bg-slate-100/75',
      )}
    >
      <div className="mb-3 flex items-center justify-between px-1">
        <span className="text-xs font-bold text-slate-800">{stage.name}</span>
        <span className="rounded-lg bg-white px-2 py-0.5 font-mono text-xs font-bold text-slate-700 shadow-2xs ring-1 ring-slate-200 tabular-nums">
          {count}
        </span>
      </div>
      <div className="flex-1 space-y-2.5">{children}</div>
    </div>
  );
};

// =========================================================================
// MAIN HR PORTAL VIEW INTERFACE
// =========================================================================
export interface HrPortalViewProps {
  activeSection: string;
  onSelectSection: (section: string) => void;
  currentUser: AccountUser;
  store: AtsPersistentState;
  setStore: React.Dispatch<React.SetStateAction<AtsPersistentState>>;
  selectedJob: JobItem;
  onSelectJobId: (jobId: number) => void;
  onOpenCandidate360: (candidateId: number) => void;
  onOpenEmailOutbox: () => void;
  onTriggerViolation: (v: Omit<GuardViolationState, 'open'>) => void;
  appendAudit: (action: string, detail: string) => void;
  // Kanban Drag & Move Actions
  onAttemptMoveStage: (candidateId: number, toStageCode: StageCode) => void;
  onOpenScheduleModal: (candidateId: number) => void;
  onOpenCalibrationModal: (candidateId: number) => void;
  // Job & Criteria Setup Actions
  onCreateRequisition: (title: string, headcount: number, salaryRange: string) => void;
  onDecideRequisition: (reqId: number, decision: 'APPROVED' | 'REJECTED') => void;
  onCreateJobFromReq: (req: RequisitionItem) => void;
  onUpdateJobConfig: (
    jobId: number,
    patch: Partial<Pick<JobItem, 'headcount' | 'passScoreThreshold' | 'status'>>,
  ) => void;
  onSaveStages: (jobId: number, stages: StageDef[]) => void;
  onSaveCriteria: (jobId: number, criteria: CriterionDef[]) => void;
  // Studio actions (when HR views Studio under Blind Lock)
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

export const HrPortalView: React.FC<HrPortalViewProps> = ({
  activeSection,
  onSelectSection,
  currentUser,
  store,
  setStore,
  selectedJob,
  onSelectJobId,
  onOpenCandidate360,
  onOpenEmailOutbox,
  onTriggerViolation,
  appendAudit,
  onAttemptMoveStage,
  onOpenScheduleModal,
  onOpenCalibrationModal,
  onCreateRequisition,
  onDecideRequisition,
  onCreateJobFromReq,
  onUpdateJobConfig,
  onSaveStages,
  onSaveCriteria,
  selectedEvalCandidateId,
  onSelectEvalCandidateId,
  onUpdateSheetScore,
  onUpdateSheetCriterionComment,
  onUpdateSheetMeta,
  onSubmitSheet,
}) => {
  // Local Kanban state
  const [kanbanSearch, setKanbanSearch] = useState('');
  const [kanbanFilter, setKanbanFilter] = useState<KanbanFilterType>('ALL');
  const [activeDragCardId, setActiveDragCardId] = useState<number | null>(null);

  // DnD Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );

  // Candidates belonging to the currently selected Job
  const jobCandidates = useMemo(() => {
    return store.candidates.filter((c) => c.jobId === selectedJob.id);
  }, [store.candidates, selectedJob.id]);

  // Candidates filtered for the Kanban board
  const filteredKanbanCandidates = useMemo(() => {
    return jobCandidates.filter((cand) => {
      if (kanbanSearch.trim()) {
        const q = kanbanSearch.toLowerCase();
        const match =
          cand.fullName.toLowerCase().includes(q) ||
          cand.email.toLowerCase().includes(q) ||
          cand.phone.includes(q);
        if (!match) return false;
      }
      const m = computeCandidateMetrics(cand, selectedJob.criteria);
      if (kanbanFilter === 'RETURNING') return cand.isReturningCandidate;
      if (kanbanFilter === 'VARIANCE') return m.hasVarianceAlert;
      if (kanbanFilter === 'KNOCKOUT') return m.isDisqualified;
      if (kanbanFilter === 'PENDING_OFFER') return cand.stageCode === 'OFFER' && !cand.offerApprovedByHm;
      return true;
    });
  }, [jobCandidates, kanbanSearch, kanbanFilter, selectedJob.criteria]);

  const activeDragCard = useMemo(
    () => store.candidates.find((c) => c.id === activeDragCardId),
    [store.candidates, activeDragCardId],
  );

  const handleDragStart = (event: DragStartEvent) => {
    const id = event.active.data.current?.candidateId as number | undefined;
    if (id) setActiveDragCardId(id);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragCardId(null);
    const candidateId = event.active.data.current?.candidateId as number | undefined;
    const toStageCode = event.over?.data.current?.stageCode as StageCode | undefined;
    if (candidateId && toStageCode) {
      onAttemptMoveStage(candidateId, toStageCode);
    }
  };

  // KPI Calculations across entire ATS for HR Hub
  const totalPublishedJobs = useMemo(
    () => store.jobs.filter((j) => j.status === 'PUBLISHED').length,
    [store.jobs],
  );

  const totalActivePipelineCandidates = useMemo(() => {
    return store.candidates.filter(
      (c) => c.stageCode !== 'HIRED' && c.stageCode !== 'REJECTED',
    ).length;
  }, [store.candidates]);

  const totalAllHeadcount = useMemo(
    () => store.jobs.reduce((sum, j) => sum + j.headcount, 0),
    [store.jobs],
  );

  const totalAllFilled = useMemo(
    () => store.jobs.reduce((sum, j) => sum + j.filledCount, 0),
    [store.jobs],
  );

  const pendingRequisitionsCount = useMemo(
    () => store.requisitions.filter((r) => r.status === 'PENDING').length,
    [store.requisitions],
  );

  const totalVarianceAlerts = useMemo(() => {
    return store.candidates.filter((c) => {
      const cJob = store.jobs.find((j) => j.id === c.jobId) ?? selectedJob;
      const m = computeCandidateMetrics(c, cJob.criteria);
      return m.hasVarianceAlert && !c.calibrated;
    }).length;
  }, [store.candidates, store.jobs, selectedJob]);

  return (
    <div className="space-y-6">
      {/* =========================================================================
          TOP EXECUTIVE HERO: HR OPERATIONS HUB COCKPIT
         ========================================================================= */}
      <div className="relative overflow-hidden rounded-3xl border border-blue-400/30 bg-gradient-to-br from-blue-950 via-indigo-950 to-slate-950 p-6 text-white shadow-xl sm:p-8">
        <div className="absolute right-0 top-0 -mt-10 -mr-10 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-500/20 px-3 py-1 font-mono text-[11px] font-bold tracking-wider text-blue-300 uppercase ring-1 ring-blue-400/30">
                <Sparkles className="h-3.5 w-3.5 text-blue-400" />
                HR RECRUITMENT OPERATIONS HUB (S3.8–S3.22, S5.5, S5.10)
              </span>
              <span className="rounded-lg bg-white/10 px-3 py-1 font-mono text-[11px] font-semibold text-slate-300">
                Chuyên viên: {currentUser.fullName}
              </span>
            </div>
            <h1 className="mt-3 text-2xl font-black tracking-tight text-white sm:text-3xl">
              Trung Tâm Điều Phối Tuyển Dụng & Vận Hành Pipeline
            </h1>
            <p className="mt-1.5 max-w-2xl text-xs text-blue-100/80 leading-relaxed sm:text-sm">
              Điều phối toàn diện luồng ứng viên qua bảng Kanban FSM, duyệt phiếu định biên từ các
              trưởng bộ phận, cấu hình barem điểm $\sum w_i = 100\%$ và theo dõi phễu chuyển đổi.
            </p>
          </div>

          {/* Quick Tab Switcher */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => onSelectSection('hr-kanban')}
              className={cn(
                'cursor-pointer inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all shadow-sm',
                activeSection === 'hr-kanban'
                  ? 'bg-blue-500 text-white shadow-blue-500/30'
                  : 'bg-white/10 text-white hover:bg-white/20',
              )}
            >
              <Kanban className="h-4 w-4" />
              Bảng Kanban ({jobCandidates.length})
            </button>
            <button
              type="button"
              onClick={() => onSelectSection('hr-jobs')}
              className={cn(
                'cursor-pointer inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all shadow-sm',
                activeSection === 'hr-jobs'
                  ? 'bg-blue-500 text-white shadow-blue-500/30'
                  : 'bg-white/10 text-white hover:bg-white/20',
              )}
            >
              <Sliders className="h-4 w-4" />
              Job & Định Biên {pendingRequisitionsCount > 0 && `(${pendingRequisitionsCount})`}
            </button>
            <button
              type="button"
              onClick={() => onSelectSection('hr-calibration')}
              className={cn(
                'cursor-pointer inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all shadow-sm',
                activeSection === 'hr-calibration'
                  ? 'bg-blue-500 text-white shadow-blue-500/30'
                  : 'bg-white/10 text-white hover:bg-white/20',
              )}
            >
              <Scale className="h-4 w-4" />
              Calibration {totalVarianceAlerts > 0 && `(${totalVarianceAlerts})`}
            </button>
            <button
              type="button"
              onClick={() => onSelectSection('hr-analytics')}
              className={cn(
                'cursor-pointer inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all shadow-sm',
                activeSection === 'hr-analytics'
                  ? 'bg-blue-500 text-white shadow-blue-500/30'
                  : 'bg-white/10 text-white hover:bg-white/20',
              )}
            >
              <BarChart3 className="h-4 w-4" />
              Phễu Analytics
            </button>
          </div>
        </div>

        {/* 4 KPI METRIC PILLS */}
        <div className="mt-6 grid grid-cols-2 gap-3 border-t border-blue-500/20 pt-6 sm:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xs">
            <span className="text-[11px] font-semibold text-blue-200/70 uppercase">
              Chiến Dịch Đang Mở
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-mono text-2xl font-black text-white tabular-nums">
                {totalPublishedJobs}
              </span>
              <span className="text-xs text-blue-300">/ {store.jobs.length} Jobs</span>
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              {pendingRequisitionsCount} phiếu định biên chờ duyệt
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xs">
            <span className="text-[11px] font-semibold text-blue-200/70 uppercase">
              Ứng Viên Đang Xử Lý
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-mono text-2xl font-black text-blue-300 tabular-nums">
                {totalActivePipelineCandidates}
              </span>
              <span className="text-xs text-blue-200">hồ sơ trong luồng</span>
            </div>
            <p className="mt-1 text-[11px] text-slate-400">Tổng {store.candidates.length} hồ sơ toàn hệ thống</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xs">
            <span className="text-[11px] font-semibold text-blue-200/70 uppercase">
              Tỷ Lệ Đáp Ứng Định Biên
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-mono text-2xl font-black text-emerald-300 tabular-nums">
                {totalAllFilled}
              </span>
              <span className="text-xs text-emerald-200">
                / {totalAllHeadcount}{' '}
                {totalAllHeadcount > 0
                  ? `(${Math.round((totalAllFilled / totalAllHeadcount) * 100)}%)`
                  : ''}
              </span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full bg-emerald-400 rounded-full"
                style={{
                  width: `${
                    totalAllHeadcount > 0
                      ? Math.min(100, (totalAllFilled / totalAllHeadcount) * 100)
                      : 0
                  }%`,
                }}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-blue-200/70 uppercase">
                Hộp Thư Tự Động
              </span>
              <button
                type="button"
                onClick={onOpenEmailOutbox}
                className="cursor-pointer font-bold text-xs text-blue-300 hover:text-white underline"
              >
                Mở Outbox
              </button>
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-mono text-2xl font-black text-indigo-300 tabular-nums">
                {store.emailOutbox.length}
              </span>
              <span className="text-xs text-indigo-200">email đã gửi</span>
            </div>
            <p className="mt-1 text-[11px] text-indigo-300/80">Kèm file .ics RFC 5545 tự động</p>
          </div>
        </div>
      </div>

      {/* =========================================================================
          SECTION 1: HR-KANBAN (DRAG & DROP KANBAN PIPELINE)
         ========================================================================= */}
      {activeSection === 'hr-kanban' && (
        <div className="space-y-4">
          {/* Search, Multi-Filter & S3.22 Race Condition Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
            <div className="flex flex-wrap items-center gap-2">
              {/* Job Campaign Selector in Kanban Toolbar (ModernSelect UI/UX PRO MAX) */}
              <ModernSelect<number>
                value={selectedJob.id}
                onChange={(val) => onSelectJobId(Number(val))}
                options={store.jobs.map((j) => ({
                  value: j.id,
                  label: `#${j.id} ${j.title}`,
                  badge: `${j.filledCount}/${j.headcount}`,
                  badgeColor:
                    j.filledCount >= j.headcount
                      ? 'bg-red-50 text-red-700'
                      : 'bg-emerald-50 text-emerald-700',
                }))}
                triggerClassName="rounded-2xl"
              />

              <div className="relative w-56">
                <Search className="absolute top-2.5 left-3 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={kanbanSearch}
                  onChange={(e) => setKanbanSearch(e.target.value)}
                  placeholder="Tìm tên, email, SĐT..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-1.5 pr-3 pl-8 text-xs focus:border-blue-600 focus:bg-white focus:outline-none"
                />
              </div>

              {(
                [
                  { id: 'ALL', label: `Tất cả (${jobCandidates.length})` },
                  { id: 'RETURNING', label: 'Ứng viên cũ (D09)' },
                  { id: 'VARIANCE', label: 'Lệch Δ ≥ 2.0' },
                  { id: 'KNOCKOUT', label: 'Điểm liệt' },
                  { id: 'PENDING_OFFER', label: 'Chờ HM duyệt Offer' },
                ] as { id: KanbanFilterType; label: string }[]
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setKanbanFilter(f.id)}
                  className={cn(
                    'cursor-pointer rounded-xl px-3 py-1.5 text-xs font-semibold transition-all',
                    kanbanFilter === f.id
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                onTriggerViolation({
                  code: 'GUARD_HEADCOUNT_FULL',
                  message:
                    'Mô phỏng S3.22 (2 HR đồng thời chốt 2 ứng viên vào 1 chỗ trống cuối cùng): Giao dịch #1 thành công (filled_count = headcount), Giao dịch #2 bị chặn nguyên tử bởi UPDATE ... WHERE filled_count < headcount!',
                  candidateName: 'Kiểm thử Đồng thời (S3.22 Concurrency Guard)',
                  fromStageName: 'OFFER',
                  toStageName: 'HIRED',
                });
              }}
              className="cursor-pointer rounded-xl border border-indigo-200 bg-indigo-50/70 px-3.5 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100"
            >
              ⚡ Mô phỏng 2 HR Chốt Tuyển Đồng Thời (S3.22)
            </button>
          </div>

          {/* Kanban Columns */}
          <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="grid grid-cols-1 gap-3 md:grid-cols-4 xl:grid-cols-7">
              {selectedJob.stages
                .filter((s) => s.enabled)
                .map((stage) => {
                  const stageCards = filteredKanbanCandidates.filter(
                    (c) => c.stageCode === stage.code,
                  );
                  return (
                    <DroppableKanbanColumn
                      key={stage.code}
                      stage={stage}
                      count={stageCards.length}
                    >
                      {stageCards.length === 0 ? (
                        <div className="flex h-36 items-center justify-center rounded-xl border border-dashed border-slate-300/80 p-4 text-center text-[11px] text-slate-400">
                          Kéo thẻ thả vào đây
                        </div>
                      ) : (
                        stageCards.map((card) => (
                          <DraggableKanbanCard
                            key={card.id}
                            card={card}
                            stage={stage}
                            enabledStages={selectedJob.stages.filter((s) => s.enabled)}
                            criteria={selectedJob.criteria}
                            passThreshold={selectedJob.passScoreThreshold}
                            onAttemptMove={onAttemptMoveStage}
                            onOpen360={onOpenCandidate360}
                          />
                        ))
                      )}
                    </DroppableKanbanColumn>
                  );
                })}
            </div>

            <DragOverlay>
              {activeDragCard && (
                <div className="w-60 rotate-2 rounded-2xl border-2 border-blue-600 bg-white p-3.5 shadow-2xl">
                  <p className="text-xs font-extrabold text-slate-900">
                    {activeDragCard.fullName}
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    Đang kéo từ vòng {activeDragCard.stageCode}...
                  </p>
                </div>
              )}
            </DragOverlay>
          </DndContext>
        </div>
      )}

      {/* =========================================================================
          SECTION 2: HR-JOBS (JOB & REQUISITION MANAGEMENT)
         ========================================================================= */}
      {activeSection === 'hr-jobs' && (
        <JobSetupView
          currentUser={currentUser}
          requisitions={store.requisitions}
          jobs={store.jobs}
          selectedJob={selectedJob}
          jobApplicationsCount={jobCandidates.length}
          onSelectJob={onSelectJobId}
          onCreateRequisition={onCreateRequisition}
          onDecideRequisition={onDecideRequisition}
          onCreateJobFromReq={onCreateJobFromReq}
          onUpdateJobConfig={onUpdateJobConfig}
          onSaveStages={onSaveStages}
          onSaveCriteria={onSaveCriteria}
        />
      )}

      {/* =========================================================================
          SECTION 3: HR-CALIBRATION (COMPARISON MATRIX & CSV EXPORT)
         ========================================================================= */}
      {activeSection === 'hr-calibration' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Bảng So Sánh Xếp Hạng & Họp Calibration (Δ_i ≥ 2.0 — S4.16–S4.19)
              </h2>
              <p className="text-xs text-slate-500">
                Xếp hạng ứng viên theo điểm tổng $S$ giảm dần. Tô vàng ô có $\Delta_i \ge
                2.0$, tô đỏ Điểm liệt, và ẩn điểm các đơn chưa chấm đủ (Blind Lock).
              </p>
            </div>

            <button
              type="button"
              onClick={() => exportRankingToCsv(selectedJob, jobCandidates, selectedJob.criteria)}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              <Download className="h-3.5 w-3.5" />
              Xuất Bảng Xếp Hạng CSV (S4.19)
            </button>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-600 uppercase">
                <tr>
                  <th className="p-3">Hạng</th>
                  <th className="p-3">Ứng viên</th>
                  <th className="p-3">Vòng hiện tại</th>
                  <th className="p-3 text-center">Tiến độ HĐ</th>
                  {selectedJob.criteria.map((c) => (
                    <th key={c.id} className="p-3 text-center">
                      {c.name} ({c.weightPercent}%)
                    </th>
                  ))}
                  <th className="p-3 text-right">Điểm Tổng (S)</th>
                  <th className="p-3 text-center">Trạng Thái</th>
                  <th className="p-3 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {jobCandidates
                  .slice()
                  .sort((a, b) => {
                    const ma = computeCandidateMetrics(a, selectedJob.criteria);
                    const mb = computeCandidateMetrics(b, selectedJob.criteria);
                    return (mb.overallScore ?? -1) - (ma.overallScore ?? -1);
                  })
                  .map((cand, idx) => {
                    const m = computeCandidateMetrics(cand, selectedJob.criteria);
                    return (
                      <tr key={cand.id} className="hover:bg-slate-50/60">
                        <td className="p-3 font-mono font-bold text-slate-400">#{idx + 1}</td>
                        <td className="p-3 font-semibold text-slate-900">
                          {cand.fullName}
                          {cand.isReturningCandidate && (
                            <span className="ml-1 rounded bg-amber-100 px-1 text-[9px] font-bold text-amber-800">
                              Cũ
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-semibold text-slate-700">
                            {cand.stageCode}
                          </span>
                        </td>
                        <td className="p-3 text-center font-mono text-slate-600">
                          {m.submittedCount}/{m.panelSize}
                        </td>
                        {selectedJob.criteria.map((c) => {
                          const critStat = m.perCriterion.find((p) => p.criterionId === c.id);
                          if (!m.allSubmitted || !critStat) {
                            return (
                              <td
                                key={c.id}
                                className="p-3 text-center font-mono text-slate-400 italic"
                              >
                                —
                              </td>
                            );
                          }
                          return (
                            <td
                              key={c.id}
                              className={cn(
                                'p-3 text-center font-mono font-bold tabular-nums',
                                critStat.knockoutFail
                                  ? 'bg-red-50 text-red-700'
                                  : critStat.varianceFlag
                                    ? 'bg-amber-50 text-amber-800'
                                    : 'text-slate-800',
                              )}
                            >
                              {critStat.mean.toFixed(1)}
                              {critStat.varianceFlag && (
                                <span className="ml-1 text-[10px] font-normal text-amber-600">
                                  (Δ{critStat.delta.toFixed(1)})
                                </span>
                              )}
                            </td>
                          );
                        })}
                        <td className="p-3 text-right">
                          {m.allSubmitted && m.overallScore !== null ? (
                            <span
                              className={cn(
                                'font-mono text-sm font-extrabold tabular-nums',
                                m.isDisqualified
                                  ? 'text-red-600'
                                  : m.overallScore >= selectedJob.passScoreThreshold
                                    ? 'text-emerald-600'
                                    : 'text-amber-600',
                              )}
                            >
                              {m.overallScore.toFixed(2)}
                            </span>
                          ) : (
                            <span className="font-mono text-slate-400 italic">Blind Lock</span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          {m.isDisqualified ? (
                            <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">
                              Dính điểm liệt
                            </span>
                          ) : m.hasVarianceAlert ? (
                            <span
                              className={cn(
                                'rounded-full px-2 py-0.5 text-[10px] font-bold',
                                cand.calibrated
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800',
                              )}
                            >
                              {cand.calibrated ? 'Đã Calibration' : 'Lệch điểm'}
                            </span>
                          ) : m.allSubmitted ? (
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                              Đạt chuẩn
                            </span>
                          ) : (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                              Đang chấm
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => onOpenCandidate360(cand.id)}
                            className="cursor-pointer text-[11px] font-bold text-blue-600 hover:underline"
                          >
                            Hồ sơ 360°
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

      {/* =========================================================================
          SECTION 4: HR-STUDIO (BLIND EVALUATION STUDIO MONITOR)
         ========================================================================= */}
      {activeSection === 'hr-studio' && (
        <EvaluationStudioView
          currentUser={currentUser}
          jobTitle={selectedJob.title}
          passThreshold={selectedJob.passScoreThreshold}
          criteria={selectedJob.criteria}
          candidates={jobCandidates}
          selectedCandidateId={selectedEvalCandidateId}
          onSelectCandidate={onSelectEvalCandidateId}
          onUpdateSheetScore={onUpdateSheetScore}
          onUpdateSheetCriterionComment={onUpdateSheetCriterionComment}
          onUpdateSheetMeta={onUpdateSheetMeta}
          onSubmitSheet={onSubmitSheet}
        />
      )}

      {/* =========================================================================
          SECTION 5: HR-ANALYTICS (CONVERSION FUNNEL & TIME-TO-HIRE)
         ========================================================================= */}
      {activeSection === 'hr-analytics' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                label: 'Tổng hồ sơ ứng tuyển (Job hiện tại)',
                value: `${jobCandidates.length} hồ sơ`,
                sub: 'Quét trùng tự động theo Email & SĐT (D09)',
                color: 'text-blue-600',
              },
              {
                label: 'Average Time-to-Hire (S5.11)',
                value: '14.5 ngày',
                sub: 'Tính từ applied_at → log HIRED',
                color: 'text-emerald-600',
              },
              {
                label: 'Tiến độ Định biên',
                value: `${selectedJob.filledCount} / ${selectedJob.headcount}`,
                sub:
                  selectedJob.status === 'CLOSED'
                    ? 'Đã tự động đóng Job (D13)'
                    : 'Đang mở nhận hồ sơ',
                color: 'text-slate-900',
              },
              {
                label: 'Email Tự Động Đã Gửi',
                value: `${store.emailOutbox.length} email`,
                sub: 'Kèm lịch .ics chuẩn RFC 5545',
                color: 'text-indigo-600',
              },
            ].map((kpi) => (
              <div
                key={kpi.label}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs"
              >
                <p className="text-xs font-semibold text-slate-500">{kpi.label}</p>
                <p
                  className={cn(
                    'mt-1.5 font-mono text-2xl font-extrabold tabular-nums',
                    kpi.color,
                  )}
                >
                  {kpi.value}
                </p>
                <p className="mt-1 text-[11px] text-slate-400">{kpi.sub}</p>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <h2 className="text-base font-bold text-slate-900">
              Biểu Đồ Phễu Chuyển Đổi Lũy Kế (Historical Conversion Funnel — D17, S5.10)
            </h2>
            <p className="text-xs text-slate-500">
              Tính toán trực tiếp từ <code>application_logs</code>: đếm số DISTINCT ứng viên đã
              từng bước vào mỗi vòng của <strong>{selectedJob.title}</strong>.
            </p>
            <div className="mt-4 space-y-3">
              {selectedJob.stages
                .filter((s) => s.enabled && s.code !== 'REJECTED')
                .map((st) => {
                  const reachedCount = jobCandidates.filter((c) =>
                    c.logs.some((l) => l.toStageCode === st.code),
                  ).length;
                  const total = Math.max(1, jobCandidates.length);
                  const pct = Math.round((reachedCount / total) * 1000) / 10;
                  return (
                    <div key={st.code} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-slate-800">
                          {st.order}. {st.name} ({st.code})
                        </span>
                        <span className="font-mono font-bold text-slate-700 tabular-nums">
                          {reachedCount} ứng viên ({pct}%)
                        </span>
                      </div>
                      <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ type: 'spring', stiffness: 200, damping: 26 }}
                          className="h-full rounded-full bg-blue-600"
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
