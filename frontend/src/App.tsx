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
  Building2,
  Calendar,
  CheckCircle2,
  Copy,
  Download,
  Eye,
  FileSpreadsheet,
  GripVertical,
  Inbox,
  KeyRound,
  Lock,
  LogIn,
  LogOut,
  Mail,
  Plus,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserPlus,
  Video,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import React, { useEffect, useMemo, useState } from 'react';
import {
  AnimatedSidebar,
  ROLE_META,
  ROLE_NAV_CONFIG,
  UserRole,
} from '@/components/animate-ui/animated-sidebar';
import { AnimatedTabsList } from '@/components/animate-ui/animated-tabs';
import { UserProfileMenu } from '@/components/animate-ui/user-profile-menu';
import {
  AnimatedSpringDialog,
  GuardAlertDialog,
  GuardViolationState,
} from '@/components/animate-ui/guard-dialog';
import {
  Candidate360Dialog,
  EmailOutboxDialog,
} from '@/components/modals/candidate-360-dialog';
import { AdminPortalView } from '@/components/portals/admin-portal';
import { CandidatePortalView } from '@/components/portals/candidate-portal';
import { EvaluationStudioView } from '@/components/portals/evaluation-studio';
import { JobSetupView } from '@/components/portals/job-setup-view';
import {
  AccountUser,
  AtsPersistentState,
  CandidateCardData,
  computeCandidateMetrics,
  CriterionDef,
  DEFAULT_STAGES_TEMPLATE,
  downloadIcsFile,
  exportRankingToCsv,
  JobItem,
  loadPersistedState,
  loadSessionUserId,
  normalizeEmailInput,
  normalizePhoneInput,
  RecommendationType,
  RequisitionItem,
  resetPersistedState,
  savePersistedState,
  saveSessionUserId,
  StageCode,
  StageDef,
} from '@/lib/store';
import { cn } from '@/lib/utils';

type KanbanFilterType = 'ALL' | 'RETURNING' | 'VARIANCE' | 'KNOCKOUT' | 'PENDING_OFFER';

const DraggableKanbanCard: React.FC<{
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

const DroppableKanbanColumn: React.FC<{
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

export function App() {
  // Persistent State Store (localStorage)
  const [store, setStore] = useState<AtsPersistentState>(() => loadPersistedState());
  const [currentUserId, setCurrentUserId] = useState<number | null>(() => loadSessionUserId());

  useEffect(() => {
    savePersistedState(store);
  }, [store]);

  useEffect(() => {
    saveSessionUserId(currentUserId);
  }, [currentUserId]);

  const currentUser = useMemo(
    () => store.users.find((u) => u.id === currentUserId && u.status === 'ACTIVE') ?? null,
    [store.users, currentUserId],
  );

  // Auth Screen State
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login');
  const [loginEmail, setLoginEmail] = useState('hr@ats.local');
  const [loginPassword, setLoginPassword] = useState('Password@123');
  const [authError, setAuthError] = useState<string | null>(null);

  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRole, setRegRole] = useState<UserRole>('CANDIDATE');
  const [regDepartment, setRegDepartment] = useState('Engineering');

  // Portal Navigation & Selected Job
  const [activeSection, setActiveSection] = useState<string>(() => {
    const u = store.users.find((item) => item.id === loadSessionUserId());
    return u ? ROLE_NAV_CONFIG[u.role][0].id : 'hr-kanban';
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<number>(1001);

  // Kanban Search & Filter State
  const [kanbanSearch, setKanbanSearch] = useState('');
  const [kanbanFilter, setKanbanFilter] = useState<KanbanFilterType>('ALL');

  // Modals & Drawers State
  const [violation, setViolation] = useState<GuardViolationState | null>(null);
  const [candidate360Id, setCandidate360Id] = useState<number | null>(null);
  const [outboxOpen, setOutboxOpen] = useState(false);

  // Interview Scheduling Modal State (Multi-Interviewer Picker S3.13)
  const [scheduleTargetId, setScheduleTargetId] = useState<number | null>(null);
  const [scheduleDateTime, setScheduleDateTime] = useState('2026-11-20 14:00');
  const [scheduleDuration, setScheduleDuration] = useState(60);
  const [scheduleLink, setScheduleLink] = useState('https://meet.google.com/ats-interview-room');
  const [scheduleInterviewerIds, setScheduleInterviewerIds] = useState<number[]>([4, 5]);

  // Calibration & Rejection Reason Modals
  const [calibrationTargetId, setCalibrationTargetId] = useState<number | null>(null);
  const [calibrationInput, setCalibrationInput] = useState('');
  const [rejectTargetId, setRejectTargetId] = useState<number | null>(null);
  const [rejectReasonInput, setRejectReasonInput] = useState('');

  // Evaluation Studio Selected Candidate
  const [selectedEvalCandidateId, setSelectedEvalCandidateId] = useState<number>(103);

  // Drag & Drop Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );
  const [activeDragCardId, setActiveDragCardId] = useState<number | null>(null);

  const selectedJob: JobItem = useMemo(
    () => store.jobs.find((j) => j.id === selectedJobId) ?? store.jobs[0],
    [store.jobs, selectedJobId],
  );

  const jobCandidates = useMemo(
    () => store.candidates.filter((c) => c.jobId === selectedJob.id),
    [store.candidates, selectedJob.id],
  );

  const filteredKanbanCandidates = useMemo(() => {
    return jobCandidates.filter((c) => {
      const q = kanbanSearch.trim().toLowerCase();
      if (
        q &&
        !c.fullName.toLowerCase().includes(q) &&
        !c.email.toLowerCase().includes(q) &&
        !c.phone.includes(q) &&
        !c.experience.toLowerCase().includes(q)
      ) {
        return false;
      }
      const m = computeCandidateMetrics(c, selectedJob.criteria);
      if (kanbanFilter === 'RETURNING') return c.isReturningCandidate;
      if (kanbanFilter === 'VARIANCE') return m.hasVarianceAlert && !c.calibrated;
      if (kanbanFilter === 'KNOCKOUT') return m.isDisqualified;
      if (kanbanFilter === 'PENDING_OFFER') return c.stageCode === 'OFFER' && !c.offerApprovedByHm;
      return true;
    });
  }, [jobCandidates, kanbanSearch, kanbanFilter, selectedJob.criteria]);

  const candidate360 = useMemo(
    () => store.candidates.find((c) => c.id === candidate360Id) ?? null,
    [store.candidates, candidate360Id],
  );

  const availableInterviewers = useMemo(
    () =>
      store.users.filter(
        (u) =>
          u.status === 'ACTIVE' &&
          (u.role === 'INTERVIEWER' || u.role === 'HIRING_MANAGER'),
      ),
    [store.users],
  );

  // Pastikan activeSection luôn thuộc Role của tài khoản đang đăng nhập (Strict RBAC Boundary)
  useEffect(() => {
    if (!currentUser) return;
    const validIds = ROLE_NAV_CONFIG[currentUser.role].map((i) => i.id);
    if (!validIds.includes(activeSection)) {
      setActiveSection(validIds[0]);
    }
  }, [currentUser, activeSection]);

  const nowFormatted = () => {
    const d = new Date();
    return `${d.toISOString().slice(0, 10)} ${d.toTimeString().slice(0, 5)}`;
  };

  const appendAudit = (action: string, detail: string, actor?: AccountUser | null) => {
    const u = actor ?? currentUser;
    if (!u) return;
    setStore((prev) => ({
      ...prev,
      auditLogs: [
        {
          id: Date.now(),
          time: nowFormatted(),
          actorName: u.fullName,
          actorRole: u.role,
          action,
          detail,
        },
        ...prev.auditLogs,
      ],
    }));
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const norm = normalizeEmailInput(loginEmail);
    const found = store.users.find((u) => normalizeEmailInput(u.email) === norm);
    if (!found || found.password !== loginPassword) {
      setAuthError(
        'AUTH_INVALID_CREDENTIALS (401): Email hoặc mật khẩu không chính xác (Mật khẩu mẫu: Password@123).',
      );
      return;
    }
    if (found.status !== 'ACTIVE') {
      setAuthError(
        'AUTH_INVALID_CREDENTIALS (401): Tài khoản này đã bị Quản trị viên (Admin) khóa (INACTIVE).',
      );
      return;
    }
    setAuthError(null);
    setCurrentUserId(found.id);
    setActiveSection(ROLE_NAV_CONFIG[found.role][0].id);
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const normEmail = normalizeEmailInput(regEmail);
    if (!regName.trim() || !normEmail || regPassword.length < 6) {
      setAuthError('USER_INVALID (400): Vui lòng nhập đủ họ tên, email và mật khẩu ≥ 6 ký tự.');
      return;
    }
    if (store.users.some((u) => normalizeEmailInput(u.email) === normEmail)) {
      setAuthError(`USER_EMAIL_TAKEN (409): Email "${normEmail}" đã được đăng ký trước đó.`);
      return;
    }
    const normPhone = normalizePhoneInput(regPhone) || '0909123456';
    const newUser: AccountUser = {
      id: Date.now(),
      fullName: regName.trim(),
      email: normEmail,
      phone: normPhone,
      password: regPassword,
      role: regRole,
      department: regRole === 'CANDIDATE' ? 'Ứng viên bên ngoài' : regDepartment,
      status: 'ACTIVE',
    };
    setStore((prev) => ({
      ...prev,
      users: [...prev.users, newUser],
      auditLogs: [
        {
          id: Date.now() + 1,
          time: nowFormatted(),
          actorName: newUser.fullName,
          actorRole: newUser.role,
          action: 'USER_REGISTER',
          detail: `Đăng ký tài khoản mới (${newUser.email}) với Role cố định: ${newUser.role}`,
        },
        ...prev.auditLogs,
      ],
    }));
    setAuthError(null);
    setCurrentUserId(newUser.id);
    setActiveSection(ROLE_NAV_CONFIG[newUser.role][0].id);
  };

  const handleLogout = () => {
    setCurrentUserId(null);
    setAuthError(null);
  };

  const handleUpdateUser = (updated: AccountUser) => {
    setStore((prev) => ({
      ...prev,
      users: prev.users.map((u) => (u.id === updated.id ? updated : u)),
      auditLogs: [
        {
          id: Date.now(),
          time: nowFormatted(),
          actorName: updated.fullName,
          actorRole: updated.role,
          action: 'USER_PROFILE_UPDATE',
          detail: `Cập nhật hồ sơ tài khoản (${updated.email}): Họ tên="${updated.fullName}", SĐT="${updated.phone}"`,
        },
        ...prev.auditLogs,
      ],
    }));
  };

  const handleChangePassword = (
    oldPass: string,
    newPass: string,
  ): { success: boolean; message: string } => {
    if (!currentUser) return { success: false, message: 'Chưa đăng nhập!' };
    if (currentUser.password !== oldPass) {
      return { success: false, message: 'Mật khẩu hiện tại không chính xác!' };
    }
    if (newPass.length < 6) {
      return { success: false, message: 'Mật khẩu mới phải có ít nhất 6 ký tự!' };
    }
    const updated = { ...currentUser, password: newPass };
    setStore((prev) => ({
      ...prev,
      users: prev.users.map((u) => (u.id === updated.id ? updated : u)),
      auditLogs: [
        {
          id: Date.now(),
          time: nowFormatted(),
          actorName: updated.fullName,
          actorRole: updated.role,
          action: 'USER_PASSWORD_CHANGE',
          detail: `Đổi mật khẩu tài khoản (${updated.email}) thành công`,
        },
        ...prev.auditLogs,
      ],
    }));
    return { success: true, message: 'Đổi mật khẩu thành công!' };
  };

  /**
   * Chuyển vòng ứng viên qua Finite State Machine & Stage Transition Guards (Spec 003)
   */
  const handleAttemptMoveStage = (candidateId: number, toStageCode: StageCode) => {
    const cand = store.candidates.find((c) => c.id === candidateId);
    if (!cand || cand.stageCode === toStageCode) return;

    const job = store.jobs.find((j) => j.id === cand.jobId) ?? selectedJob;
    const enabledStages = job.stages.filter((s) => s.enabled);
    const currentStage =
      enabledStages.find((s) => s.code === cand.stageCode) ??
      job.stages.find((s) => s.code === cand.stageCode)!;
    const targetStage = enabledStages.find((s) => s.code === toStageCode);

    if (!targetStage) return;

    // S3.11: Đã ở trạng thái cuối (HIRED / REJECTED) -> khóa chuyển
    if (cand.stageCode === 'HIRED' || cand.stageCode === 'REJECTED') {
      setViolation({
        open: true,
        code: 'GUARD_TERMINAL_STATE',
        message: `Hồ sơ của "${cand.fullName}" đã ở trạng thái kết thúc (${cand.stageCode} — S3.11), không thể kéo sang vòng khác.`,
        candidateName: cand.fullName,
        fromStageName: currentStage.name,
        toStageName: targetStage.name,
      });
      return;
    }

    // S3.10: Chuyển sang REJECTED bắt buộc phải nhập lý do
    if (toStageCode === 'REJECTED') {
      setRejectTargetId(candidateId);
      setRejectReasonInput('');
      return;
    }

    // S3.8 & S3.9: Chỉ được chuyển tới đúng vòng đang bật kế tiếp
    const orderedFlow = enabledStages
      .filter((s) => s.code !== 'REJECTED')
      .sort((a, b) => a.order - b.order);
    const currIdx = orderedFlow.findIndex((s) => s.code === cand.stageCode);
    const nextExpected = currIdx >= 0 ? orderedFlow[currIdx + 1] : undefined;

    if (!nextExpected || nextExpected.code !== toStageCode) {
      setViolation({
        open: true,
        code: 'GUARD_NOT_NEXT_STAGE',
        message: `Không được nhảy cóc hoặc kéo lùi từ "${currentStage.name}" sang "${targetStage.name}". Vòng kế tiếp hợp lệ là "${nextExpected?.name ?? '—'}" (S3.9, D08).`,
        candidateName: cand.fullName,
        fromStageName: currentStage.name,
        toStageName: targetStage.name,
      });
      return;
    }

    // S3.12: Vào INTERVIEW bắt buộc phải có lịch phỏng vấn hợp lệ với >= 1 giám khảo
    if (
      toStageCode === 'INTERVIEW' &&
      (!cand.interviewScheduledAt || cand.sheets.length === 0)
    ) {
      setViolation({
        open: true,
        code: 'GUARD_INTERVIEW_REQUIRED',
        message: `Ứng viên "${cand.fullName}" chưa có lịch phỏng vấn đang hoạt động (S3.12). Mở hộp thoại chọn Hội đồng & tạo lịch .ics ngay?`,
        candidateName: cand.fullName,
        fromStageName: currentStage.name,
        toStageName: targetStage.name,
        actionLabel: 'Xếp lịch phỏng vấn (.ics)',
        onActionClick: () => setScheduleTargetId(cand.id),
      });
      return;
    }

    // S3.15 - S3.18: Guard vào vòng OFFER
    if (toStageCode === 'OFFER') {
      const m = computeCandidateMetrics(cand, job.criteria);
      if (!m.allSubmitted) {
        setViolation({
          open: true,
          code: 'GUARD_SCORECARDS_INCOMPLETE',
          message: `Hội đồng mới nộp ${m.submittedCount}/${m.panelSize} phiếu chấm (S3.15). Còn ${m.panelSize - m.submittedCount} giám khảo chưa nộp phiếu!`,
          candidateName: cand.fullName,
          fromStageName: currentStage.name,
          toStageName: targetStage.name,
          actionLabel: 'Mở Hồ sơ 360° kiểm tra',
          onActionClick: () => setCandidate360Id(cand.id),
        });
        return;
      }
      if (m.isDisqualified) {
        setViolation({
          open: true,
          code: 'GUARD_DISQUALIFIED',
          message: `Ứng viên "${cand.fullName}" vi phạm tiêu chí ĐIỂM LIỆT (Knock-out Rule: TB tiêu chí bắt buộc < 2.0 — S3.16). Khóa quyền chuyển sang OFFER!`,
          candidateName: cand.fullName,
          fromStageName: currentStage.name,
          toStageName: targetStage.name,
        });
        return;
      }
      if (m.hasVarianceAlert && !cand.calibrated) {
        setViolation({
          open: true,
          code: 'GUARD_VARIANCE_UNRESOLVED',
          message: `Giữa các giám khảo có độ lệch điểm Δ ≥ 2.0 (S3.17). Bắt buộc phải ghi biên bản họp Calibration trước khi chuyển sang OFFER!`,
          candidateName: cand.fullName,
          fromStageName: currentStage.name,
          toStageName: targetStage.name,
          actionLabel: 'Ghi biên bản Calibration',
          onActionClick: () => {
            setCalibrationTargetId(cand.id);
            setCalibrationInput('');
          },
        });
        return;
      }
      if ((m.overallScore ?? 0) < job.passScoreThreshold) {
        setViolation({
          open: true,
          code: 'GUARD_SCORE_BELOW_THRESHOLD',
          message: `Điểm tổng kết trọng số S = ${m.overallScore?.toFixed(2)} chưa đạt ngưỡng chuẩn ${job.passScoreThreshold.toFixed(2)} của vị trí này (S3.18).`,
          candidateName: cand.fullName,
          fromStageName: currentStage.name,
          toStageName: targetStage.name,
        });
        return;
      }
    }

    // S3.19 - S3.22: Guard vào vòng HIRED + Chống tuyển lố + Tự đóng Job khi đủ định biên
    if (toStageCode === 'HIRED') {
      if (!cand.offerApprovedByHm) {
        setViolation({
          open: true,
          code: 'GUARD_OFFER_NOT_APPROVED',
          message: `Offer của "${cand.fullName}" chưa được Trưởng bộ phận (Hiring Manager) phê duyệt (S3.19, D11). Hãy Đăng xuất và Đăng nhập bằng tài khoản Hiring Manager (hm.eng@ats.local) để phê duyệt Offer!`,
          candidateName: cand.fullName,
          fromStageName: currentStage.name,
          toStageName: targetStage.name,
        });
        return;
      }

      if (job.filledCount >= job.headcount) {
        setViolation({
          open: true,
          code: 'GUARD_HEADCOUNT_FULL',
          message: `Vị trí "${job.title}" đã tuyển đủ định biên (${job.filledCount}/${job.headcount} — S3.22). Chặn tuyển lố chỉ tiêu!`,
          candidateName: cand.fullName,
          fromStageName: currentStage.name,
          toStageName: targetStage.name,
        });
        return;
      }

      const nextFilled = job.filledCount + 1;
      const willAutoClose = nextFilled >= job.headcount;
      const ts = nowFormatted();

      setStore((prev) => ({
        ...prev,
        jobs: prev.jobs.map((j) =>
          j.id === job.id
            ? {
                ...j,
                filledCount: nextFilled,
                status: willAutoClose ? 'CLOSED' : j.status,
              }
            : j,
        ),
        requisitions: prev.requisitions.map((r) =>
          r.id === job.requisitionId
            ? {
                ...r,
                filledCount: nextFilled,
                status: willAutoClose ? 'CLOSED' : r.status,
              }
            : r,
        ),
        candidates: prev.candidates.map((c) => {
          if (c.id === candidateId) {
            return {
              ...c,
              stageCode: 'HIRED',
              logs: [
                ...c.logs,
                {
                  id: Date.now(),
                  fromStageCode: cand.stageCode,
                  toStageCode: 'HIRED',
                  actorName: currentUser?.fullName ?? 'HR',
                  actorRole: currentUser?.role ?? 'HR',
                  note: `Chốt tuyển dụng (HIRED). Định biên: ${nextFilled}/${job.headcount}`,
                  createdAt: ts,
                },
              ],
            };
          }
          if (
            willAutoClose &&
            c.jobId === job.id &&
            c.stageCode !== 'HIRED' &&
            c.stageCode !== 'REJECTED'
          ) {
            return {
              ...c,
              stageCode: 'REJECTED',
              rejectReason: 'Vị trí đã tuyển đủ định biên (Auto-closed D13, S3.21)',
              logs: [
                ...c.logs,
                {
                  id: Date.now() + c.id,
                  fromStageCode: c.stageCode,
                  toStageCode: 'REJECTED',
                  actorName: 'SYSTEM_TRANSACTION',
                  actorRole: 'SYSTEM',
                  note: 'Vị trí đã tuyển đủ định biên (Auto-closed D13)',
                  createdAt: ts,
                },
              ],
            };
          }
          return c;
        }),
        emailOutbox: [
          {
            id: Date.now() + 99,
            sentAt: ts,
            toEmails: [cand.email],
            subject: `[ATS Official] Chúc mừng Trúng tuyển — ${job.title}`,
            category: 'HIRED',
            bodyPreview: `Chúc mừng ${cand.fullName} đã chính thức trúng tuyển vị trí ${job.title} (${nextFilled}/${job.headcount}).`,
            candidateId: cand.id,
          },
          ...prev.emailOutbox,
        ],
        auditLogs: [
          {
            id: Date.now() + 100,
            time: ts,
            actorName: currentUser?.fullName ?? 'HR',
            actorRole: currentUser?.role ?? 'HR',
            action: 'HIRE_CANDIDATE',
            detail: `Chốt tuyển ${cand.fullName} (${nextFilled}/${job.headcount})${
              willAutoClose
                ? ' → Tự động đóng Job & chuyển các đơn còn lại sang REJECTED (S3.21)!'
                : ''
            }`,
          },
          ...prev.auditLogs,
        ],
      }));
      return;
    }

    // Các vòng thông thường (SCREENING, TEST, INTERVIEW, OFFER)
    const ts = nowFormatted();
    setStore((prev) => ({
      ...prev,
      candidates: prev.candidates.map((c) =>
        c.id === candidateId
          ? {
              ...c,
              stageCode: toStageCode,
              logs: [
                ...c.logs,
                {
                  id: Date.now(),
                  fromStageCode: cand.stageCode,
                  toStageCode,
                  actorName: currentUser?.fullName ?? 'HR',
                  actorRole: currentUser?.role ?? 'HR',
                  note: `Chuyển từ vòng ${currentStage.name} sang ${targetStage.name}`,
                  createdAt: ts,
                },
              ],
            }
          : c,
      ),
      auditLogs: [
        {
          id: Date.now() + 1,
          time: ts,
          actorName: currentUser?.fullName ?? 'HR',
          actorRole: currentUser?.role ?? 'HR',
          action: 'STAGE_TRANSITION',
          detail: `Chuyển ứng viên ${cand.fullName}: ${cand.stageCode} → ${toStageCode}`,
        },
        ...prev.auditLogs,
      ],
    }));
  };

  // S3.14: Hủy lịch phỏng vấn (chỉ khi chưa có giám khảo nào nộp phiếu)
  const handleCancelInterview = (candidateId: number) => {
    const cand = store.candidates.find((c) => c.id === candidateId);
    if (!cand) return;
    if (cand.sheets.some((s) => s.submitted)) {
      setViolation({
        open: true,
        code: 'INTERVIEW_HAS_SCORECARDS',
        message: `Không thể hủy buổi phỏng vấn của "${cand.fullName}" vì đã có giám khảo nộp phiếu chấm điểm (S3.14).`,
        candidateName: cand.fullName,
        fromStageName: 'INTERVIEW',
        toStageName: 'CANCEL',
      });
      return;
    }
    setStore((prev) => ({
      ...prev,
      candidates: prev.candidates.map((c) =>
        c.id === candidateId
          ? { ...c, interviewScheduledAt: null, meetingLink: null, interviewLocation: null }
          : c,
      ),
    }));
    appendAudit('CANCEL_INTERVIEW', `Hủy lịch phỏng vấn của ${cand.fullName} (chưa ai nộp phiếu)`);
  };

  const handleDragStart = (event: DragStartEvent) => {
    const id = event.active.data.current?.candidateId as number | undefined;
    if (id) setActiveDragCardId(id);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragCardId(null);
    const candidateId = event.active.data.current?.candidateId as number | undefined;
    const toStageCode = event.over?.data.current?.stageCode as StageCode | undefined;
    if (candidateId && toStageCode) {
      handleAttemptMoveStage(candidateId, toStageCode);
    }
  };

  // ============================================================================
  // RENDER 1: UNAUTHENTICATED -> STRICT LOGIN & REGISTER SCREEN (NO BYPASS)
  // ============================================================================
  if (!currentUser) {
    return (
      <div className="flex min-h-screen w-full flex-col bg-slate-100 lg:flex-row">
        {/* LEFT SHOWCASE: SYSTEM ARCHITECTURE & DIRECTORY OF ACCOUNTS */}
        <div className="relative flex flex-1 flex-col justify-between overflow-hidden border-b border-slate-200/90 bg-gradient-to-br from-slate-50 via-blue-50/40 to-indigo-50/50 p-8 text-slate-800 lg:border-r lg:border-b-0 lg:p-12">
          <div className="pointer-events-none absolute -top-24 -left-24 h-96 w-96 rounded-full bg-blue-400/15 blur-3xl" />
          <div className="pointer-events-none absolute right-0 bottom-0 h-96 w-96 rounded-full bg-indigo-400/15 blur-3xl" />

          <div className="relative z-10">
            <div className="inline-flex items-center gap-2.5 rounded-2xl border border-blue-300 bg-blue-50 px-3.5 py-1.5 text-xs font-bold text-blue-700 shadow-2xs">
              <Sparkles className="h-4 w-4 text-blue-600" />
              INTERNAL ENTERPRISE ATS & SCORECARD PLATFORM
            </div>
            <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              Hệ thống Quản trị Tuyển dụng &{' '}
              <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-600 bg-clip-text text-transparent">
                Đánh giá Ứng viên Đa tiêu chí
              </span>
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-600">
              Phân quyền <strong>Strict 5-Role RBAC</strong>: Mỗi tài khoản được gán đúng 1 vai trò
              duy nhất và cố định ở giao diện Portal của vai trò đó sau khi đăng nhập. Toàn bộ dữ
              liệu được lưu trữ bền vững qua các phiên làm việc.
            </p>

            {/* Danh sách tài khoản mẫu để người dùng tra cứu Email khi đăng nhập */}
            <div className="mt-7 rounded-2xl border border-slate-200/90 bg-white/95 p-4 shadow-sm backdrop-blur-md">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <span className="font-mono text-[11px] font-bold tracking-wider text-slate-700 uppercase">
                  📋 Danh bạ Tài khoản Hệ thống (Mật khẩu mặc định: Password@123)
                </span>
                <span className="text-[11px] text-slate-500">
                  Bấm "Điền Email" rồi nhấn nút Đăng nhập bên phải
                </span>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {store.users.map((u) => {
                  const meta = ROLE_META[u.role];
                  return (
                    <div
                      key={u.id}
                      className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2.5 text-xs transition-colors hover:border-slate-300 hover:bg-slate-50"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={cn(
                              'font-mono text-[10px] font-bold uppercase',
                              meta.badgeTextClass,
                            )}
                          >
                            [{u.role}]
                          </span>
                          {u.status === 'INACTIVE' && (
                            <span className="rounded bg-red-100 px-1.5 py-0.2 text-[9px] font-bold text-red-600">
                              INACTIVE
                            </span>
                          )}
                        </div>
                        <p className="truncate font-bold text-slate-900">{u.fullName}</p>
                        <p className="truncate font-mono text-[11px] text-slate-500">{u.email}</p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setAuthTab('login');
                          setLoginEmail(u.email);
                          setLoginPassword('Password@123');
                          setAuthError(null);
                        }}
                        className="shrink-0 cursor-pointer rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 shadow-2xs hover:border-blue-500 hover:bg-blue-50 hover:text-blue-700"
                      >
                        Điền Email
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="relative z-10 mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 pt-5 text-xs text-slate-500">
            <span>GitHub Spec Kit V2 · Persistent Local Store</span>
            <span className="font-mono">Strict RBAC Boundary (No Role Switcher)</span>
          </div>
        </div>

        {/* RIGHT PANEL: LOGIN & REGISTER FORMS */}
        <div className="flex w-full flex-col justify-center bg-white p-8 lg:w-[480px] xl:w-[520px] lg:p-12">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-6">
              <AnimatedTabsList
                layoutId="auth-mode-tabs"
                value={authTab}
                onValueChange={(v) => {
                  setAuthTab(v as 'login' | 'register');
                  setAuthError(null);
                }}
                className="grid w-full grid-cols-2"
                tabs={[
                  {
                    value: 'login',
                    label: 'Đăng nhập Hệ thống',
                    icon: <LogIn className="h-3.5 w-3.5" />,
                  },
                  {
                    value: 'register',
                    label: 'Đăng ký Tài khoản',
                    icon: <UserPlus className="h-3.5 w-3.5" />,
                  },
                ]}
              />
            </div>

            {authError && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700"
              >
                {authError}
              </motion.div>
            )}

            {authTab === 'login' ? (
              <motion.form
                key="login-form"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                onSubmit={handleLoginSubmit}
                className="space-y-4"
              >
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900">Đăng nhập Xác thực</h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Tài khoản được gán Role nào sẽ được điều hướng cố định vào đúng giao diện Portal
                    của Role đó (S1.3, S1.5).
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700">Email tài khoản</label>
                  <div className="relative mt-1.5">
                    <Mail className="absolute top-2.5 left-3 h-4 w-4 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="hr@ats.local"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/60 py-2.5 pr-3 pl-9 font-mono text-xs font-medium text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700">Mật khẩu</label>
                  <div className="relative mt-1.5">
                    <KeyRound className="absolute top-2.5 left-3 h-4 w-4 text-slate-400" />
                    <input
                      type="password"
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/60 py-2.5 pr-3 pl-9 text-xs font-medium text-slate-900 focus:border-blue-600 focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-xs font-bold text-white shadow-lg shadow-blue-600/25 transition-all hover:bg-blue-700"
                >
                  <LogIn className="h-4 w-4" />
                  Xác Thực & Mở Giao Diện Theo Role
                </button>
              </motion.form>
            ) : (
              <motion.form
                key="register-form"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                onSubmit={handleRegisterSubmit}
                className="space-y-3.5"
              >
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900">Đăng ký Tài khoản mới</h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Tài khoản sau khi đăng ký sẽ được lưu bền vững và gắn cố định với Role đã chọn.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700">
                    Vai trò đăng ký (Role)
                  </label>
                  <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                    {(
                      [
                        { role: 'CANDIDATE', title: 'CANDIDATE', sub: 'Ứng viên ứng tuyển' },
                        { role: 'HR', title: 'HR', sub: 'Chuyên viên Tuyển dụng' },
                        { role: 'HIRING_MANAGER', title: 'HIRING_MANAGER', sub: 'Trưởng bộ phận' },
                        { role: 'INTERVIEWER', title: 'INTERVIEWER', sub: 'Giám khảo phỏng vấn' },
                        { role: 'ADMIN', title: 'ADMIN', sub: 'Quản trị hệ thống' },
                      ] as { role: UserRole; title: string; sub: string }[]
                    ).map((item) => (
                      <button
                        key={item.role}
                        type="button"
                        onClick={() => setRegRole(item.role)}
                        className={cn(
                          'cursor-pointer rounded-xl border p-2.5 text-left transition-all',
                          regRole === item.role
                            ? 'border-blue-600 bg-blue-50/80 ring-2 ring-blue-600/15'
                            : 'border-slate-200 bg-white hover:bg-slate-50',
                        )}
                      >
                        <p className="font-mono text-xs font-bold text-slate-900">{item.title}</p>
                        <p className="text-[10px] text-slate-500">{item.sub}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700">Họ và tên</label>
                    <input
                      type="text"
                      required
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder="Nguyễn Văn A"
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700">Số điện thoại</label>
                    <input
                      type="text"
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      placeholder="0912345678"
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 font-mono text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700">Email đăng nhập</label>
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="user@company.vn"
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 font-mono text-xs"
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700">
                      Mật khẩu (≥ 6 ký tự)
                    </label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="••••••••"
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                    />
                  </div>
                  {regRole !== 'CANDIDATE' && (
                    <div>
                      <label className="block text-xs font-bold text-slate-700">Phòng ban</label>
                      <select
                        value={regDepartment}
                        onChange={(e) => setRegDepartment(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"
                      >
                        {store.departments.map((d) => (
                          <option key={d.id} value={d.name}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 text-xs font-bold text-white shadow-lg transition-all hover:bg-blue-600"
                >
                  <UserPlus className="h-4 w-4" />
                  Đăng Ký & Vào Giao Diện {ROLE_META[regRole].roleBadge}
                </button>
              </motion.form>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // RENDER 2: AUTHENTICATED -> STRICT ROLE-LOCKED PORTAL WORKSPACE
  // ============================================================================
  const currentMeta = ROLE_META[currentUser.role];
  const pendingOffers = store.candidates.filter((c) => c.stageCode === 'OFFER');
  const activeDragCard = store.candidates.find((c) => c.id === activeDragCardId) ?? null;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 text-slate-900">
      {/* 1. ROLE-DEDICATED ANIMATED SIDEBAR */}
      <AnimatedSidebar
        role={currentUser.role}
        userName={currentUser.fullName}
        userEmail={currentUser.email}
        departmentName={currentUser.department}
        activeSection={activeSection}
        onSelectSection={setActiveSection}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={() => setSidebarCollapsed((v) => !v)}
      />

      {/* MAIN PORTAL SHELL */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* TOP HEADER: STRICT ROLE IDENTITY + EMAIL OUTBOX + USER PROFILE */}
        <header className="relative z-40 flex h-16 shrink-0 items-center justify-between border-b border-slate-200/90 bg-white px-6 shadow-xs">
          <div className="flex items-center gap-3">
            <span
              className={cn(
                'rounded-lg px-2.5 py-1 font-mono text-[11px] font-bold text-white shadow-xs',
                currentMeta.iconBgClass,
              )}
            >
              {currentMeta.roleBadge}
            </span>
            <div>
              <h1 className="text-sm font-extrabold tracking-tight text-slate-900">
                {currentMeta.portalTitle}
              </h1>
              <p className="text-[11px] text-slate-500">{currentMeta.portalSubtitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* System Email Outbox Button */}
            <button
              type="button"
              onClick={() => setOutboxOpen(true)}
              className="relative inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50"
            >
              <Inbox className="h-4 w-4 text-blue-600" />
              <span className="hidden sm:inline">Hộp thư (.ics)</span>
              <span className="rounded-full bg-blue-600 px-1.5 py-0.2 font-mono text-[10px] font-bold text-white">
                {store.emailOutbox.length}
              </span>
            </button>

            {/* TOP-RIGHT USER IDENTITY & ACTION MENU (MODERN SAAS DROPDOWN) */}
            <UserProfileMenu
              currentUser={currentUser}
              onLogout={handleLogout}
              onUpdateUser={handleUpdateUser}
              onChangePassword={handleChangePassword}
            />
          </div>
        </header>

        {/* PORTAL WORKSPACE BODY */}
        <main className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.16 }}
              className="space-y-5"
            >
              {/* =================================================================
                  PORTAL 1: ADMIN COMMAND CENTER (ONLY WHEN currentUser.role === 'ADMIN')
                 ================================================================= */}
              {currentUser.role === 'ADMIN' && (
                <AdminPortalView
                  activeSection={activeSection}
                  onSelectSection={setActiveSection}
                  currentUser={currentUser}
                  store={store}
                  setStore={setStore}
                  selectedJob={selectedJob}
                  onSelectJobId={setSelectedJobId}
                  onOpenCandidate360={(cid) => setCandidate360Id(cid)}
                  onTriggerViolation={(v) => setViolation({ open: true, ...v })}
                  appendAudit={appendAudit}
                />
              )}

              {/* =================================================================
                  PORTAL 2: HIRING MANAGER OFFER APPROVAL QUEUE (hm-offers)
                 ================================================================= */}
              {currentUser.role === 'HIRING_MANAGER' && activeSection === 'hm-offers' && (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-900 p-6 text-white shadow-lg">
                    <span className="rounded-md bg-emerald-500/20 px-2.5 py-1 font-mono text-[10px] font-bold text-emerald-300 uppercase">
                      HIRING MANAGER EXCLUSIVE AUTHORITY (S3.19, S3.20, D11)
                    </span>
                    <h2 className="mt-2 text-xl font-extrabold">
                      Hàng Đợi Phê Duyệt Đề Nghị Nhận Việc (Offer Approval Queue)
                    </h2>
                    <p className="mt-1 max-w-2xl text-xs text-emerald-100/90">
                      Khi bạn phê duyệt Offer tại đây, trạng thái được lưu bền vững vào hệ thống để
                      chuyên viên HR (`hr@ats.local`) có thể kéo ứng viên sang cột{' '}
                      <code>HIRED</code>.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {pendingOffers.length === 0 ? (
                      <div className="col-span-2 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-xs text-slate-500">
                        Hiện không có ứng viên nào đang ở vòng OFFER.
                      </div>
                    ) : (
                      pendingOffers.map((cand) => {
                        const candJob =
                          store.jobs.find((j) => j.id === cand.jobId) ?? selectedJob;
                        const m = computeCandidateMetrics(cand, candJob.criteria);
                        return (
                          <div
                            key={cand.id}
                            className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs"
                          >
                            <div>
                              <div className="flex items-start justify-between">
                                <div>
                                  <span className="rounded bg-emerald-50 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-700">
                                    {candJob.title}
                                  </span>
                                  <h3 className="mt-1 text-base font-bold text-slate-900">
                                    {cand.fullName}
                                  </h3>
                                  <p className="text-xs text-slate-500">{cand.experience}</p>
                                </div>
                                <span className="rounded-xl bg-emerald-50 px-3 py-1 font-mono text-sm font-extrabold text-emerald-700 tabular-nums">
                                  S = {m.overallScore?.toFixed(2)} / 5.00
                                </span>
                              </div>

                              <div className="mt-4 rounded-xl bg-slate-50 p-3.5 text-xs">
                                <p className="font-semibold text-slate-700">
                                  Mức lương đề xuất:{' '}
                                  <strong className="font-mono text-slate-900">
                                    {cand.offerSalary}
                                  </strong>
                                </p>
                                {cand.offerBenefits && (
                                  <p className="mt-1 text-[11px] text-slate-600">
                                    Phúc lợi: {cand.offerBenefits}
                                  </p>
                                )}
                                {cand.calibrationNote && (
                                  <p className="mt-1 text-[11px] text-slate-600">
                                    Biên bản Calibration: "{cand.calibrationNote}"
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
                              {cand.offerApprovedByHm ? (
                                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                                  <CheckCircle2 className="h-4 w-4" />
                                  Đã phê duyệt bởi {cand.offerApprovedByName || currentUser.fullName}
                                </span>
                              ) : (
                                <span className="text-xs font-semibold text-amber-600">
                                  ⏳ Chờ bạn phê duyệt để mở khóa chốt HIRED
                                </span>
                              )}

                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => setCandidate360Id(cand.id)}
                                  className="cursor-pointer rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                                >
                                  Hồ sơ 360°
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const nextApproved = !cand.offerApprovedByHm;
                                    const ts = nowFormatted();
                                    setStore((prev) => ({
                                      ...prev,
                                      candidates: prev.candidates.map((c) =>
                                        c.id === cand.id
                                          ? {
                                              ...c,
                                              offerApprovedByHm: nextApproved,
                                              offerApprovedByName: currentUser.fullName,
                                              offerApprovedAt: ts,
                                              logs: [
                                                ...c.logs,
                                                {
                                                  id: Date.now(),
                                                  fromStageCode: 'OFFER',
                                                  toStageCode: 'OFFER',
                                                  actorName: currentUser.fullName,
                                                  actorRole: currentUser.role,
                                                  note: nextApproved
                                                    ? `Hiring Manager (${currentUser.fullName}) đã phê duyệt Offer (S3.20)`
                                                    : 'Hiring Manager hủy phê duyệt Offer',
                                                  createdAt: ts,
                                                },
                                              ],
                                            }
                                          : c,
                                      ),
                                    }));
                                    appendAudit(
                                      'OFFER_APPROVAL',
                                      `Hiring Manager ${nextApproved ? 'phê duyệt' : 'hủy duyệt'} Offer cho ${cand.fullName}`,
                                    );
                                  }}
                                  className={cn(
                                    'cursor-pointer rounded-xl px-4 py-2 text-xs font-bold text-white shadow-md transition-all',
                                    cand.offerApprovedByHm
                                      ? 'bg-slate-600 hover:bg-slate-700'
                                      : 'bg-emerald-600 shadow-emerald-600/25 hover:bg-emerald-700',
                                  )}
                                >
                                  {cand.offerApprovedByHm
                                    ? 'Hủy phê duyệt'
                                    : '✓ Phê Duyệt Offer Ngay'}
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* =================================================================
                  REQUISITIONS & MULTI-JOB SETUP (hm-requisitions, hr-jobs)
                 ================================================================= */}
              {(activeSection === 'hm-requisitions' || activeSection === 'hr-jobs') && (
                <JobSetupView
                  currentUser={currentUser}
                  requisitions={store.requisitions}
                  jobs={store.jobs}
                  selectedJob={selectedJob}
                  jobApplicationsCount={jobCandidates.length}
                  onSelectJob={setSelectedJobId}
                  onCreateRequisition={(title, headcount, salaryRange) => {
                    if (!title.trim()) return;
                    if (!Number.isInteger(headcount) || headcount <= 0) {
                      setViolation({
                        open: true,
                        code: 'REQ_INVALID_HEADCOUNT',
                        message: 'Số lượng cần tuyển (headcount) phải là số nguyên lớn hơn 0 (S2.3).',
                        candidateName: title,
                        fromStageName: 'Tạo Requisition',
                        toStageName: `headcount = ${headcount}`,
                      });
                      return;
                    }
                    const newReq: RequisitionItem = {
                      id: Date.now(),
                      title: title.trim(),
                      department: currentUser.department,
                      requestedBy: currentUser.fullName,
                      headcount,
                      filledCount: 0,
                      salaryRange,
                      status: 'PENDING',
                      hasJobId: null,
                      createdAt: nowFormatted().slice(0, 10),
                    };
                    setStore((prev) => ({
                      ...prev,
                      requisitions: [newReq, ...prev.requisitions],
                    }));
                    appendAudit(
                      'CREATE_REQUISITION',
                      `Tạo Requisition "${newReq.title}" (headcount = ${headcount})`,
                    );
                  }}
                  onDecideRequisition={(reqId, decision) => {
                    setStore((prev) => ({
                      ...prev,
                      requisitions: prev.requisitions.map((r) =>
                        r.id === reqId ? { ...r, status: decision } : r,
                      ),
                    }));
                    appendAudit('DECIDE_REQUISITION', `HR cập nhật Requisition #${reqId} → ${decision}`);
                  }}
                  onCreateJobFromReq={(req) => {
                    if (req.status !== 'APPROVED') {
                      setViolation({
                        open: true,
                        code: 'REQ_NOT_APPROVED',
                        message: 'Yêu cầu tuyển dụng phải được duyệt (APPROVED) trước khi tạo Job (S2.5).',
                      });
                      return;
                    }
                    const newJobId = Date.now();
                    const newJob: JobItem = {
                      id: newJobId,
                      requisitionId: req.id,
                      title: req.title,
                      department: req.department,
                      description: `Chiến dịch tuyển dụng vị trí ${req.title} cho phòng ${req.department}.`,
                      requirements: '• Đáp ứng tiêu chuẩn kỹ thuật chuyên môn và văn hóa đội ngũ.',
                      salaryRange: req.salaryRange,
                      status: 'DRAFT',
                      headcount: req.headcount,
                      filledCount: 0,
                      passScoreThreshold: 3.5,
                      stages: DEFAULT_STAGES_TEMPLATE.map((s) => ({ ...s })),
                      criteria: [
                        { id: 1, name: 'Năng lực Chuyên môn Cốt lõi', weightPercent: 50, isKnockout: true },
                        { id: 2, name: 'Giải quyết Vấn đề Thực tế', weightPercent: 30, isKnockout: false },
                        { id: 3, name: 'Giao tiếp & Phối hợp Đội ngũ', weightPercent: 20, isKnockout: false },
                      ],
                      createdAt: nowFormatted().slice(0, 10),
                    };
                    setStore((prev) => ({
                      ...prev,
                      jobs: [newJob, ...prev.jobs],
                      requisitions: prev.requisitions.map((r) =>
                        r.id === req.id ? { ...r, hasJobId: newJobId } : r,
                      ),
                    }));
                    setSelectedJobId(newJobId);
                    appendAudit('CREATE_JOB', `Khởi tạo Job #${newJobId} (${newJob.title}) ở trạng thái DRAFT`);
                  }}
                  onUpdateJobConfig={(jobId, patch) => {
                    const target = store.jobs.find((j) => j.id === jobId);
                    if (!target) return;
                    if (patch.status === 'PUBLISHED') {
                      const sum = target.criteria.reduce((a, b) => a + b.weightPercent, 0);
                      if (target.criteria.length === 0 || sum !== 100) {
                        setViolation({
                          open: true,
                          code: 'JOB_NOT_PUBLISHABLE',
                          message: `Không thể đăng tuyển Job khi tổng trọng số tiêu chí chưa bằng 100% (Hiện tại: ${sum}% — S2.11).`,
                          candidateName: target.title,
                          fromStageName: 'DRAFT',
                          toStageName: 'PUBLISHED',
                        });
                        return;
                      }
                    }
                    setStore((prev) => ({
                      ...prev,
                      jobs: prev.jobs.map((j) => (j.id === jobId ? { ...j, ...patch } : j)),
                    }));
                    appendAudit('UPDATE_JOB', `Cập nhật cấu hình Job #${jobId}`);
                  }}
                  onSaveStages={(jobId, stages) => {
                    const mandatoryDisabled = stages.find((s) => s.mandatory && !s.enabled);
                    if (mandatoryDisabled) {
                      setViolation({
                        open: true,
                        code: 'STAGE_REQUIRED',
                        message: `Vòng "${mandatoryDisabled.name}" (${mandatoryDisabled.code}) là vòng bắt buộc, không được phép tắt (S2.6, D07).`,
                        candidateName: selectedJob.title,
                        fromStageName: mandatoryDisabled.code,
                        toStageName: 'DISABLED',
                      });
                      return;
                    }
                    setStore((prev) => ({
                      ...prev,
                      jobs: prev.jobs.map((j) => (j.id === jobId ? { ...j, stages } : j)),
                    }));
                    appendAudit('UPDATE_STAGES', `Lưu cấu hình vòng tuyển dụng cho Job #${jobId}`);
                  }}
                  onSaveCriteria={(jobId, criteriaList) => {
                    const sum = criteriaList.reduce((a, b) => a + b.weightPercent, 0);
                    if (sum !== 100) {
                      setViolation({
                        open: true,
                        code: 'CRITERIA_WEIGHT_SUM',
                        message: `Tổng trọng số các tiêu chí phải bằng đúng 100% (Hiện tại đang là ${sum}% — S2.8). Dữ liệu tiêu chí cũ được giữ nguyên!`,
                        candidateName: selectedJob.title,
                        fromStageName: `${sum}%`,
                        toStageName: '100%',
                      });
                      return;
                    }
                    const names = criteriaList.map((c) => c.name.trim().toLowerCase());
                    if (new Set(names).size !== names.length) {
                      setViolation({
                        open: true,
                        code: 'CRITERIA_INVALID',
                        message: 'Tên các tiêu chí chấm điểm trong cùng một Job không được trùng nhau (S2.10).',
                        candidateName: selectedJob.title,
                      });
                      return;
                    }
                    setStore((prev) => ({
                      ...prev,
                      jobs: prev.jobs.map((j) =>
                        j.id === jobId ? { ...j, criteria: criteriaList } : j,
                      ),
                    }));
                    appendAudit(
                      'UPDATE_CRITERIA',
                      `Lưu bộ tiêu chí chấm điểm cho Job #${jobId} (Tổng = 100%)`,
                    );
                  }}
                />
              )}

              {/* =================================================================
                  PORTAL 3: HR KANBAN PIPELINE BOARD (hr-kanban)
                 ================================================================= */}
              {currentUser.role === 'HR' && activeSection === 'hr-kanban' && (
                <div className="space-y-4">
                  {/* Search, Multi-Filter & S3.22 Race Condition Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Job Campaign Selector in Kanban Toolbar */}
                      <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs">
                        <span className="font-semibold text-slate-500">Chiến dịch:</span>
                        <select
                          value={selectedJob.id}
                          onChange={(e) => setSelectedJobId(Number(e.target.value))}
                          className="bg-transparent font-bold text-slate-900 focus:outline-none"
                        >
                          {store.jobs.map((j) => (
                            <option key={j.id} value={j.id}>
                              #{j.id} {j.title} ({j.filledCount}/{j.headcount})
                            </option>
                          ))}
                        </select>
                      </div>

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
                        setViolation({
                          open: true,
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
                                    onAttemptMove={handleAttemptMoveStage}
                                    onOpen360={setCandidate360Id}
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

              {/* =================================================================
                  PORTAL 4: INTERVIEWER ASSIGNED SCHEDULE (int-schedule)
                 ================================================================= */}
              {currentUser.role === 'INTERVIEWER' && activeSection === 'int-schedule' && (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-violet-200 bg-gradient-to-r from-violet-950 via-purple-900 to-slate-900 p-6 text-white shadow-lg">
                    <span className="rounded-md bg-violet-500/20 px-2.5 py-1 font-mono text-[10px] font-bold text-violet-300 uppercase">
                      INTERVIEWER EVALUATION STUDIO (S4.1–S4.8)
                    </span>
                    <h2 className="mt-2 text-xl font-extrabold">
                      Lịch Phỏng Vấn Được Phân Công Cho {currentUser.fullName}
                    </h2>
                    <p className="mt-1 max-w-2xl text-xs text-violet-100/90">
                      Mỗi giám khảo chấm điểm độc lập dưới cơ chế{' '}
                      <strong>Blind Evaluation Lock</strong>: điểm của các giám khảo khác bị khóa
                      cho đến khi 100% thành viên hội đồng hoàn tất nộp phiếu.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {store.candidates
                      .filter(
                        (c) =>
                          c.interviewScheduledAt &&
                          c.sheets.some(
                            (s) =>
                              s.interviewerId === currentUser.id ||
                              s.interviewerEmail.toLowerCase() === currentUser.email.toLowerCase(),
                          ),
                      )
                      .map((cand) => {
                        const candJob =
                          store.jobs.find((j) => j.id === cand.jobId) ?? selectedJob;
                        const mySheet =
                          cand.sheets.find(
                            (s) =>
                              s.interviewerId === currentUser.id ||
                              s.interviewerEmail.toLowerCase() === currentUser.email.toLowerCase(),
                          ) ?? cand.sheets[0];
                        const m = computeCandidateMetrics(cand, candJob.criteria);
                        return (
                          <div
                            key={cand.id}
                            className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition-all hover:shadow-md"
                          >
                            <div>
                              <div className="flex items-center justify-between">
                                <span
                                  className={cn(
                                    'rounded-full px-2.5 py-0.5 text-[10px] font-bold',
                                    mySheet.submitted
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-amber-100 text-amber-800',
                                  )}
                                >
                                  {mySheet.submitted
                                    ? '✓ Bạn đã nộp phiếu'
                                    : '⏳ Cần bạn chấm điểm'}
                                </span>
                                <span className="font-mono text-[11px] font-bold text-slate-500">
                                  HĐ: {m.submittedCount}/{m.panelSize}
                                </span>
                              </div>

                              <span className="mt-2 inline-block rounded bg-violet-50 px-2 py-0.5 font-mono text-[10px] font-bold text-violet-700">
                                {candJob.title}
                              </span>
                              <h3 className="mt-1 text-base font-bold text-slate-900">
                                {cand.fullName}
                              </h3>
                              <p className="mt-0.5 text-xs text-slate-500">{cand.experience}</p>

                              <div className="mt-3 space-y-1 rounded-xl bg-slate-50 p-3 font-mono text-[11px] text-slate-600">
                                <div className="flex items-center gap-1.5">
                                  <Calendar className="h-3.5 w-3.5 text-violet-600" />
                                  <span>
                                    {cand.interviewScheduledAt} ({cand.interviewDurationMinutes}{' '}
                                    phút)
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <Video className="h-3.5 w-3.5 text-blue-600" />
                                  <span className="truncate">{cand.meetingLink}</span>
                                </div>
                              </div>
                            </div>

                            <div className="mt-4 flex gap-2">
                              <button
                                type="button"
                                onClick={() => downloadIcsFile(cand, candJob.title)}
                                className="cursor-pointer rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                              >
                                <Download className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedJobId(cand.jobId);
                                  setSelectedEvalCandidateId(cand.id);
                                  setActiveSection('int-studio');
                                }}
                                className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-violet-600 py-2.5 text-xs font-bold text-white shadow-md shadow-violet-600/20 hover:bg-violet-700"
                              >
                                Mở Split-Screen Studio Chấm Điểm
                                <ArrowRight className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* =================================================================
                  SPLIT-SCREEN EVALUATION STUDIO (int-studio, hm-studio, hr-studio)
                 ================================================================= */}
              {(activeSection === 'int-studio' ||
                activeSection === 'hm-studio' ||
                activeSection === 'hr-studio') && (
                <EvaluationStudioView
                  currentUser={currentUser}
                  jobTitle={selectedJob.title}
                  passThreshold={selectedJob.passScoreThreshold}
                  criteria={selectedJob.criteria}
                  candidates={jobCandidates}
                  selectedCandidateId={selectedEvalCandidateId}
                  onSelectCandidate={setSelectedEvalCandidateId}
                  onUpdateSheetScore={(candId, intId, critId, score) => {
                    setStore((prev) => ({
                      ...prev,
                      candidates: prev.candidates.map((c) =>
                        c.id !== candId
                          ? c
                          : {
                              ...c,
                              sheets: c.sheets.map((sh) =>
                                sh.interviewerId === intId && !sh.submitted
                                  ? { ...sh, scores: { ...sh.scores, [critId]: score } }
                                  : sh,
                              ),
                            },
                      ),
                    }));
                  }}
                  onUpdateSheetCriterionComment={(candId, intId, critId, comment) => {
                    setStore((prev) => ({
                      ...prev,
                      candidates: prev.candidates.map((c) =>
                        c.id !== candId
                          ? c
                          : {
                              ...c,
                              sheets: c.sheets.map((sh) =>
                                sh.interviewerId === intId && !sh.submitted
                                  ? {
                                      ...sh,
                                      criterionComments: {
                                        ...sh.criterionComments,
                                        [critId]: comment,
                                      },
                                    }
                                  : sh,
                              ),
                            },
                      ),
                    }));
                  }}
                  onUpdateSheetMeta={(candId, intId, recommendation, overallComment) => {
                    setStore((prev) => ({
                      ...prev,
                      candidates: prev.candidates.map((c) =>
                        c.id !== candId
                          ? c
                          : {
                              ...c,
                              sheets: c.sheets.map((sh) =>
                                sh.interviewerId === intId && !sh.submitted
                                  ? { ...sh, recommendation, comment: overallComment }
                                  : sh,
                              ),
                            },
                      ),
                    }));
                  }}
                  onSubmitSheet={(candId, intId) => {
                    const cand = store.candidates.find((c) => c.id === candId);
                    const sh = cand?.sheets.find((s) => s.interviewerId === intId);
                    if (!cand || !sh) return;
                    if (sh.submitted) {
                      setViolation({
                        open: true,
                        code: 'EVAL_ALREADY_SUBMITTED',
                        message: `Phiếu chấm điểm của "${sh.interviewerName}" đã được nộp trước đó. Theo quy tắc D06 (S4.3), phiếu đã nộp là bất biến và không được phép chỉnh sửa!`,
                        candidateName: cand.fullName,
                        fromStageName: sh.interviewerName,
                        toStageName: 'IMMUTABLE SCORECARD',
                      });
                      return;
                    }
                    const ts = nowFormatted();
                    setStore((prev) => ({
                      ...prev,
                      candidates: prev.candidates.map((c) =>
                        c.id !== candId
                          ? c
                          : {
                              ...c,
                              sheets: c.sheets.map((item) =>
                                item.interviewerId === intId
                                  ? { ...item, submitted: true, submittedAt: ts }
                                  : item,
                              ),
                              logs: [
                                ...c.logs,
                                {
                                  id: Date.now(),
                                  fromStageCode: c.stageCode,
                                  toStageCode: c.stageCode,
                                  actorName: currentUser.fullName,
                                  actorRole: currentUser.role,
                                  note: `Giám khảo ${currentUser.fullName} đã nộp phiếu chấm điểm độc lập (${sh.recommendation})`,
                                  createdAt: ts,
                                },
                              ],
                            },
                      ),
                    }));
                    appendAudit(
                      'SUBMIT_SCORECARD',
                      `${currentUser.fullName} nộp phiếu chấm bất biến cho ứng viên ${cand.fullName}`,
                    );
                  }}
                />
              )}

              {/* =================================================================
                  CALIBRATION MATRIX & CSV EXPORT (hr-calibration, hm-calibration)
                 ================================================================= */}
              {(activeSection === 'hr-calibration' || activeSection === 'hm-calibration') && (
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
                      onClick={() =>
                        exportRankingToCsv(selectedJob, jobCandidates, selectedJob.criteria)
                      }
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700"
                    >
                      <FileSpreadsheet className="h-4 w-4" />
                      Xuất Bảng Xếp Hạng Ra File .CSV (Excel)
                    </button>
                  </div>

                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-600 uppercase">
                          <th className="px-3.5 py-3">Hạng</th>
                          <th className="px-3.5 py-3">Ứng viên</th>
                          <th className="px-3.5 py-3">Vòng</th>
                          {selectedJob.criteria.map((c) => (
                            <th key={c.id} className="px-3.5 py-3">
                              {c.name} ({c.weightPercent}%)
                            </th>
                          ))}
                          <th className="px-3.5 py-3 text-right">Điểm S</th>
                          <th className="px-3.5 py-3 text-right">Calibration</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {jobCandidates
                          .map((cand) => ({
                            cand,
                            metrics: computeCandidateMetrics(cand, selectedJob.criteria),
                          }))
                          .sort(
                            (a, b) =>
                              (b.metrics.overallScore ?? -1) - (a.metrics.overallScore ?? -1),
                          )
                          .map(({ cand, metrics }, idx) => (
                            <tr key={cand.id} className="hover:bg-slate-50/80">
                              <td className="px-3.5 py-3 font-mono font-bold text-slate-500">
                                #{idx + 1}
                              </td>
                              <td className="px-3.5 py-3">
                                <button
                                  type="button"
                                  onClick={() => setCandidate360Id(cand.id)}
                                  className="cursor-pointer font-bold text-slate-900 hover:text-blue-600 hover:underline"
                                >
                                  {cand.fullName}
                                </button>
                              </td>
                              <td className="px-3.5 py-3 font-mono text-[11px]">
                                {cand.stageCode}
                              </td>
                              {selectedJob.criteria.map((c) => {
                                const pc = metrics.perCriterion.find(
                                  (p) => p.criterionId === c.id,
                                );
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
                              <td className="px-3.5 py-3 text-right font-mono font-extrabold tabular-nums">
                                {metrics.overallScore !== null
                                  ? metrics.overallScore.toFixed(2)
                                  : '—'}
                              </td>
                              <td className="px-3.5 py-3 text-right">
                                {metrics.isDisqualified ? (
                                  <span className="rounded-md bg-red-100 px-2 py-1 text-[11px] font-bold text-red-700">
                                    Điểm liệt
                                  </span>
                                ) : metrics.hasVarianceAlert ? (
                                  cand.calibrated ? (
                                    <span
                                      title={cand.calibrationNote || ''}
                                      className="rounded-md bg-emerald-100 px-2 py-1 text-[11px] font-bold text-emerald-800"
                                    >
                                      ✓ Đã Calibration
                                    </span>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setCalibrationTargetId(cand.id);
                                        setCalibrationInput('');
                                      }}
                                      className="cursor-pointer rounded-lg bg-amber-500 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-amber-600"
                                    >
                                      Ghi biên bản Calibration
                                    </button>
                                  )
                                ) : (
                                  <span className="text-[11px] text-slate-400">Đồng thuận</span>
                                )}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* =================================================================
                  ANALYTICS DASHBOARD (hr-analytics)
                 ================================================================= */}
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
                      Tính toán trực tiếp từ <code>application_logs</code>: đếm số DISTINCT ứng viên
                      đã từng bước vào mỗi vòng của <strong>{selectedJob.title}</strong>.
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

              {/* =================================================================
                  PORTAL 5: CANDIDATE CAREER & TRACKING PORTAL (ONLY WHEN role === 'CANDIDATE')
                 ================================================================= */}
              {currentUser.role === 'CANDIDATE' && (
                <CandidatePortalView
                  activeSection={activeSection}
                  currentUser={currentUser}
                  jobs={store.jobs}
                  candidates={store.candidates}
                  onSelectSection={setActiveSection}
                  onTriggerGuard={(code, message, jobTitle) => {
                    setViolation({
                      open: true,
                      code,
                      message,
                      candidateName: currentUser.fullName,
                      fromStageName: 'Candidate Portal',
                      toStageName: jobTitle,
                    });
                  }}
                  onApplyJob={({
                    jobId,
                    fullName,
                    email,
                    phone,
                    experience,
                    resumeFileName,
                    resumeDataUrl,
                  }) => {
                    const normEmail = normalizeEmailInput(email);
                    const normPhone = normalizePhoneInput(phone);
                    const targetJob = store.jobs.find((j) => j.id === jobId);
                    if (!targetJob || targetJob.status !== 'PUBLISHED') {
                      setViolation({
                        open: true,
                        code: 'APPLY_JOB_NOT_OPEN',
                        message: 'Vị trí tuyển dụng này hiện không mở nhận hồ sơ (S3.3).',
                      });
                      return null;
                    }

                    // S3.6: Kiểm tra nộp trùng cùng Job
                    const dupSameJob = store.candidates.find(
                      (c) =>
                        c.jobId === jobId &&
                        (normalizeEmailInput(c.email) === normEmail ||
                          (normPhone && normalizePhoneInput(c.phone) === normPhone)),
                    );
                    if (dupSameJob) {
                      setViolation({
                        open: true,
                        code: 'APPLY_DUPLICATE_JOB',
                        message: `Bạn đã nộp hồ sơ cho vị trí "${targetJob.title}" trước đó (S3.6 — HTTP 409).`,
                        candidateName: fullName,
                        fromStageName: 'Apply',
                        toStageName: targetJob.title,
                      });
                      return null;
                    }

                    // S3.4 & S3.5: Quét trùng ứng viên ở các Job khác
                    const previousApps = store.candidates.filter(
                      (c) =>
                        normalizeEmailInput(c.email) === normEmail ||
                        (normPhone && normalizePhoneInput(c.phone) === normPhone),
                    );
                    const isReturning = previousApps.length > 0;
                    const newToken = `trk-${Date.now().toString(16)}`;
                    const ts = nowFormatted();

                    const newCand: CandidateCardData = {
                      id: Date.now(),
                      jobId,
                      fullName: fullName.trim(),
                      email: normEmail,
                      phone: normPhone,
                      experience: experience.trim(),
                      resumeFileName,
                      resumeDataUrl,
                      stageCode: 'APPLIED',
                      trackingToken: newToken,
                      appliedAt: ts,
                      appliedDaysAgo: 0,
                      isReturningCandidate: isReturning,
                      previousApplicationsNote: isReturning
                        ? `Phát hiện trùng Email/SĐT chuẩn hóa với ${previousApps.length} đơn ứng tuyển trước đó (D09)`
                        : undefined,
                      interviewScheduledAt: null,
                      interviewDurationMinutes: 60,
                      meetingLink: null,
                      interviewLocation: null,
                      offerSalary: targetJob.salaryRange,
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
                          id: Date.now() + 1,
                          fromStageCode: null,
                          toStageCode: 'APPLIED',
                          actorName: fullName.trim(),
                          actorRole: 'CANDIDATE',
                          note: isReturning
                            ? `Ứng viên nộp hồ sơ CV "${resumeFileName}" (Nhận diện ứng viên cũ D09)`
                            : `Ứng viên nộp hồ sơ mới CV "${resumeFileName}"`,
                          createdAt: ts,
                        },
                      ],
                    };

                    setStore((prev) => ({
                      ...prev,
                      candidates: [newCand, ...prev.candidates],
                      emailOutbox: [
                        {
                          id: Date.now() + 2,
                          sentAt: ts,
                          toEmails: [normEmail],
                          subject: `[ATS] Xác nhận đã nhận hồ sơ — ${targetJob.title}`,
                          category: 'APPLY_CONFIRM',
                          bodyPreview: `Cảm ơn ${fullName.trim()} đã ứng tuyển vị trí ${targetJob.title}. Mã tra cứu Magic Link: ${newToken}`,
                          candidateId: newCand.id,
                        },
                        ...prev.emailOutbox,
                      ],
                      auditLogs: [
                        {
                          id: Date.now() + 3,
                          time: ts,
                          actorName: fullName.trim(),
                          actorRole: 'CANDIDATE',
                          action: 'APPLY_JOB',
                          detail: `Nộp CV "${resumeFileName}" vào Job "${targetJob.title}"${
                            isReturning ? ' (Gắn nhãn Ứng viên cũ D09)' : ''
                          }`,
                        },
                        ...prev.auditLogs,
                      ],
                    }));

                    return newToken;
                  }}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* =====================================================================
          GLOBAL MODALS & DRAWERS
         ===================================================================== */}
      <GuardAlertDialog violation={violation} onClose={() => setViolation(null)} />

      <Candidate360Dialog
        candidate={candidate360}
        jobTitle={
          store.jobs.find((j) => j.id === candidate360?.jobId)?.title ?? selectedJob.title
        }
        criteria={
          store.jobs.find((j) => j.id === candidate360?.jobId)?.criteria ??
          selectedJob.criteria
        }
        passThreshold={
          store.jobs.find((j) => j.id === candidate360?.jobId)?.passScoreThreshold ??
          selectedJob.passScoreThreshold
        }
        viewerId={currentUser.id}
        viewerRole={currentUser.role}
        onClose={() => setCandidate360Id(null)}
        onCancelInterview={handleCancelInterview}
        onOpenScheduleModal={(id) => setScheduleTargetId(id)}
        onOpenCalibrationModal={(id) => {
          setCalibrationTargetId(id);
          setCalibrationInput('');
        }}
      />

      <EmailOutboxDialog
        open={outboxOpen}
        onClose={() => setOutboxOpen(false)}
        emails={store.emailOutbox}
        candidates={store.candidates}
        jobTitle={selectedJob.title}
      />

      {/* INTERVIEW SCHEDULING MODAL WITH MULTI-INTERVIEWER PICKER (S3.13) */}
      <AnimatedSpringDialog
        open={scheduleTargetId !== null}
        onOpenChange={(open) => !open && setScheduleTargetId(null)}
        title="Xếp Lịch Phỏng Vấn Hội Đồng & Gửi File Lịch .ics (S3.13)"
        subtitle="Chọn từ 1 đến 5 người phỏng vấn trong danh sách nhân sự chuyên môn"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (scheduleTargetId === null) return;
            if (scheduleInterviewerIds.length < 1 || scheduleInterviewerIds.length > 5) {
              setScheduleTargetId(null);
              setViolation({
                open: true,
                code: 'INTERVIEW_INVALID',
                message: 'Hội đồng phỏng vấn bắt buộc phải có từ 1 đến 5 giám khảo (S3.13).',
              });
              return;
            }
            const targetCand = store.candidates.find((c) => c.id === scheduleTargetId);
            if (!targetCand) return;
            const selectedPanel = availableInterviewers.filter((u) =>
              scheduleInterviewerIds.includes(u.id),
            );
            const ts = nowFormatted();

            setStore((prev) => ({
              ...prev,
              candidates: prev.candidates.map((c) =>
                c.id === scheduleTargetId
                  ? {
                      ...c,
                      interviewScheduledAt: scheduleDateTime,
                      interviewDurationMinutes: scheduleDuration,
                      meetingLink: scheduleLink,
                      stageCode: 'INTERVIEW',
                      sheets: selectedPanel.map((p) => {
                        const existing = c.sheets.find((s) => s.interviewerId === p.id);
                        return (
                          existing ?? {
                            interviewerId: p.id,
                            interviewerName: p.fullName,
                            interviewerEmail: p.email,
                            submitted: false,
                            recommendation: 'HIRE',
                            comment: '',
                            scores: { 1: 4.0, 2: 4.0, 3: 4.0 },
                            criterionComments: {},
                          }
                        );
                      }),
                      logs: [
                        ...c.logs,
                        {
                          id: Date.now(),
                          fromStageCode: c.stageCode,
                          toStageCode: 'INTERVIEW',
                          actorName: currentUser.fullName,
                          actorRole: currentUser.role,
                          note: `Xếp lịch phỏng vấn .ics (${scheduleDateTime}) với hội đồng ${selectedPanel.length} người`,
                          createdAt: ts,
                        },
                      ],
                    }
                  : c,
              ),
              emailOutbox: [
                {
                  id: Date.now() + 1,
                  sentAt: ts,
                  toEmails: [targetCand.email, ...selectedPanel.map((p) => p.email)],
                  subject: `[ATS Invite] Thư mời phỏng vấn — ${selectedJob.title} (${targetCand.fullName})`,
                  category: 'INTERVIEW_ICS',
                  bodyPreview: `Lịch phỏng vấn lúc ${scheduleDateTime} (${scheduleDuration} phút) tại ${scheduleLink}. Hội đồng: ${selectedPanel.map((p) => p.fullName).join(', ')}.`,
                  hasIcsAttachment: true,
                  candidateId: targetCand.id,
                },
                ...prev.emailOutbox,
              ],
            }));
            appendAudit(
              'SCHEDULE_INTERVIEW',
              `Xếp lịch phỏng vấn .ics cho ${targetCand.fullName} với ${selectedPanel.length} giám khảo`,
            );
            setScheduleTargetId(null);
          }}
          className="space-y-3.5 text-xs"
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700">Thời gian phỏng vấn</label>
              <input
                type="text"
                required
                value={scheduleDateTime}
                onChange={(e) => setScheduleDateTime(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 font-mono"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700">Thời lượng (phút)</label>
              <select
                value={scheduleDuration}
                onChange={(e) => setScheduleDuration(Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 font-mono font-bold"
              >
                <option value={30}>30 phút</option>
                <option value={45}>45 phút</option>
                <option value={60}>60 phút</option>
                <option value={90}>90 phút</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700">
              Đường dẫn phòng họp (Google Meet / MS Teams)
            </label>
            <input
              type="text"
              required
              value={scheduleLink}
              onChange={(e) => setScheduleLink(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 font-mono"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700">
              Chọn Hội đồng Phỏng vấn (1–5 giám khảo — S3.13):
            </label>
            <div className="mt-1.5 space-y-1.5 rounded-xl border border-slate-200 bg-slate-50 p-3">
              {availableInterviewers.map((iv) => {
                const checked = scheduleInterviewerIds.includes(iv.id);
                return (
                  <label
                    key={iv.id}
                    className="flex cursor-pointer items-center justify-between rounded-lg bg-white px-3 py-2 shadow-2xs"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setScheduleInterviewerIds((prev) => [...prev, iv.id]);
                          } else {
                            setScheduleInterviewerIds((prev) =>
                              prev.filter((id) => id !== iv.id),
                            );
                          }
                        }}
                      />
                      <span className="font-bold text-slate-900">{iv.fullName}</span>
                    </div>
                    <span className="font-mono text-[11px] text-slate-500">
                      {iv.role} · {iv.email}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setScheduleTargetId(null)}
              className="cursor-pointer rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-600"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="cursor-pointer rounded-xl bg-blue-600 px-4 py-2 font-bold text-white shadow-md hover:bg-blue-700"
            >
              Lưu Lịch, Gửi .ics & Chuyển Sang INTERVIEW
            </button>
          </div>
        </form>
      </AnimatedSpringDialog>

      {/* CALIBRATION RESOLUTION MODAL (S4.16) */}
      <AnimatedSpringDialog
        open={calibrationTargetId !== null}
        onOpenChange={(open) => !open && setCalibrationTargetId(null)}
        title="Ghi Biên Bản Họp Hiệu Chỉnh Điểm (Calibration Resolution — S4.16)"
        subtitle="Giải quyết cảnh báo lệch điểm Δ_i ≥ 2.0 để mở khóa chuyển sang vòng OFFER (tối thiểu 10 ký tự)"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (calibrationTargetId === null) return;
            if (calibrationInput.trim().length < 10) {
              setCalibrationTargetId(null);
              setViolation({
                open: true,
                code: 'CALIB_NOTE_TOO_SHORT',
                message: 'Biên bản họp Calibration bắt buộc phải có tối thiểu 10 ký tự (S4.16).',
              });
              return;
            }
            const ts = nowFormatted();
            setStore((prev) => ({
              ...prev,
              candidates: prev.candidates.map((c) =>
                c.id === calibrationTargetId
                  ? {
                      ...c,
                      calibrated: true,
                      calibrationNote: calibrationInput.trim(),
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
                          note: `[Calibration] ${calibrationInput.trim()}`,
                          createdAt: ts,
                        },
                      ],
                    }
                  : c,
              ),
            }));
            appendAudit(
              'CALIBRATION_RESOLVED',
              `Ghi biên bản Calibration: "${calibrationInput.trim()}"`,
            );
            setCalibrationTargetId(null);
          }}
          className="space-y-3.5 text-xs"
        >
          <div>
            <label className="block font-semibold text-slate-700">
              Nội dung thống nhất của Hội đồng tuyển dụng (tối thiểu 10 ký tự)
            </label>
            <textarea
              rows={3}
              value={calibrationInput}
              onChange={(e) => setCalibrationInput(e.target.value)}
              placeholder="Ví dụ: Hai giám khảo đã thảo luận lại tiêu chí Giải quyết vấn đề và thống nhất ứng viên đạt yêu cầu vào vòng Offer..."
              className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-xs focus:border-blue-600 focus:outline-none"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setCalibrationTargetId(null)}
              className="cursor-pointer rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-600"
            >
              Đóng
            </button>
            <button
              type="submit"
              className="cursor-pointer rounded-xl bg-emerald-600 px-4 py-2 font-bold text-white shadow-md hover:bg-emerald-700"
            >
              Xác Nhận Đã Calibration
            </button>
          </div>
        </form>
      </AnimatedSpringDialog>

      {/* REJECTION REASON MODAL (S3.10) */}
      <AnimatedSpringDialog
        open={rejectTargetId !== null}
        onOpenChange={(open) => !open && setRejectTargetId(null)}
        title="Xác Nhận Loại Hồ Sơ Ứng Viên (Bắt buộc nhập lý do — S3.10)"
        subtitle="Theo quy tắc State Guard S3.10, không thể chuyển sang REJECTED nếu để trống lý do."
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (rejectTargetId === null) return;
            const targetCand = store.candidates.find((c) => c.id === rejectTargetId);
            if (!rejectReasonInput.trim()) {
              setRejectTargetId(null);
              if (targetCand) {
                setViolation({
                  open: true,
                  code: 'GUARD_REJECT_REASON_REQUIRED',
                  message: `Bắt buộc phải nhập lý do khi chuyển ứng viên "${targetCand.fullName}" sang trạng thái Loại hồ sơ (S3.10).`,
                  candidateName: targetCand.fullName,
                  fromStageName: targetCand.stageCode,
                  toStageName: 'REJECTED',
                });
              }
              return;
            }
            const ts = nowFormatted();
            setStore((prev) => ({
              ...prev,
              candidates: prev.candidates.map((c) =>
                c.id === rejectTargetId
                  ? {
                      ...c,
                      stageCode: 'REJECTED',
                      rejectReason: rejectReasonInput.trim(),
                      logs: [
                        ...c.logs,
                        {
                          id: Date.now(),
                          fromStageCode: c.stageCode,
                          toStageCode: 'REJECTED',
                          actorName: currentUser.fullName,
                          actorRole: currentUser.role,
                          note: `Loại hồ sơ: "${rejectReasonInput.trim()}"`,
                          createdAt: ts,
                        },
                      ],
                    }
                  : c,
              ),
            }));
            if (targetCand) {
              appendAudit(
                'STAGE_REJECT',
                `Loại hồ sơ ${targetCand.fullName}: "${rejectReasonInput.trim()}"`,
              );
            }
            setRejectTargetId(null);
          }}
          className="space-y-3.5 text-xs"
        >
          <div>
            <label className="block font-semibold text-slate-700">
              Lý do loại hồ sơ (để trống và bấm Xác nhận để thử nghiệm State Guard S3.10)
            </label>
            <textarea
              rows={3}
              value={rejectReasonInput}
              onChange={(e) => setRejectReasonInput(e.target.value)}
              placeholder="Ví dụ: Chưa đáp ứng yêu cầu kinh nghiệm thiết kế hệ thống phân tán..."
              className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-xs focus:border-red-600 focus:outline-none"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setRejectTargetId(null)}
              className="cursor-pointer rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-600"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="cursor-pointer rounded-xl bg-red-600 px-4 py-2 font-bold text-white shadow-md hover:bg-red-700"
            >
              Xác Nhận Chuyển Sang REJECTED
            </button>
          </div>
        </form>
      </AnimatedSpringDialog>
    </div>
  );
}

export default App;
