import * as Slider from '@radix-ui/react-slider';
import {
  AlertTriangle,
  Award,
  BookOpen,
  Calendar,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Download,
  Eye,
  EyeOff,
  FileText,
  Filter,
  HelpCircle,
  Info,
  Lock,
  MessageSquare,
  RotateCcw,
  Scale,
  Search,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Unlock,
  UserCheck,
  Video,
  X,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { AnimatedAccordion, AnimatedTabsList } from '@/components/animate-ui/animated-tabs';
import { AnimatedSpringDialog } from '@/components/animate-ui/guard-dialog';
import { ModernSelect } from '@/components/animate-ui/modern-select';
import { AnimatedScoreTicker } from '@/components/animate-ui/score-ticker';
import {
  AccountUser,
  CandidateCardData,
  computeCandidateMetrics,
  CriterionDef,
  downloadIcsFile,
  InterviewEvalSheet,
  RecommendationType,
} from '@/lib/store';
import { cn } from '@/lib/utils';

interface EvaluationStudioProps {
  currentUser: AccountUser;
  jobTitle: string;
  passThreshold: number;
  criteria: CriterionDef[];
  candidates: CandidateCardData[];
  selectedCandidateId: number;
  onSelectCandidate: (id: number) => void;
  onUpdateSheetScore: (
    candidateId: number,
    interviewerId: number,
    criterionId: number,
    score: number,
  ) => void;
  onUpdateSheetCriterionComment: (
    candidateId: number,
    interviewerId: number,
    criterionId: number,
    comment: string,
  ) => void;
  onUpdateSheetMeta: (
    candidateId: number,
    interviewerId: number,
    recommendation: RecommendationType,
    overallComment: string,
  ) => void;
  onSubmitSheet: (candidateId: number, interviewerId: number) => void;
}

const SCORE_PRESETS: { value: number; label: string; short: string; colorClass: string }[] = [
  {
    value: 1.0,
    label: '1.0 — Kém (Điểm liệt)',
    short: '1.0 Kém',
    colorClass: 'border-red-300 bg-red-50 text-red-700 hover:bg-red-100',
  },
  {
    value: 2.0,
    label: '2.0 — Cần cải thiện',
    short: '2.0 Yếu',
    colorClass: 'border-orange-300 bg-orange-50 text-orange-800 hover:bg-orange-100',
  },
  {
    value: 3.0,
    label: '3.0 — Đạt yêu cầu',
    short: '3.0 Đạt',
    colorClass: 'border-sky-300 bg-sky-50 text-sky-800 hover:bg-sky-100',
  },
  {
    value: 3.5,
    label: '3.5 — Khá tốt',
    short: '3.5 Khá',
    colorClass: 'border-blue-300 bg-blue-50 text-blue-800 hover:bg-blue-100',
  },
  {
    value: 4.0,
    label: '4.0 — Tốt / Vượt chuẩn',
    short: '4.0 Tốt',
    colorClass: 'border-indigo-300 bg-indigo-50 text-indigo-800 hover:bg-indigo-100',
  },
  {
    value: 4.5,
    label: '4.5 — Rất xuất sắc',
    short: '4.5 Rất tốt',
    colorClass: 'border-violet-300 bg-violet-50 text-violet-800 hover:bg-violet-100',
  },
  {
    value: 5.0,
    label: '5.0 — Xuất sắc đỉnh cao',
    short: '5.0 Xuất sắc',
    colorClass: 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100',
  },
];

const QUICK_COMMENT_SNIPPETS = [
  'Nắm vững kiến thức nền tảng & trả lời mạch lạc',
  'Kinh nghiệm thực chiến tốt, giải quyết tình huống nhanh',
  'Tư duy hệ thống rõ ràng, phù hợp văn hóa đội ngũ',
  'Cần đào tạo thêm về độ sâu kiến trúc масштаб lớn',
  'Chưa đáp ứng kỳ vọng cốt lõi của tiêu chí này',
];

export const EvaluationStudioView: React.FC<EvaluationStudioProps> = ({
  currentUser,
  jobTitle,
  passThreshold,
  criteria,
  candidates,
  selectedCandidateId,
  onSelectCandidate,
  onUpdateSheetScore,
  onUpdateSheetCriterionComment,
  onUpdateSheetMeta,
  onSubmitSheet,
}) => {
  const [leftPaneTab, setLeftPaneTab] = useState<string>('pdf');
  const [studioSearch, setStudioSearch] = useState<string>('');
  const [studioStatusFilter, setStudioStatusFilter] = useState<
    'ALL' | 'PENDING' | 'SUBMITTED' | 'UNLOCKED'
  >('ALL');

  // Isolated Modals State
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState<boolean>(false);
  const [questionGuideOpen, setQuestionGuideOpen] = useState<boolean>(false);

  // Filter candidates in studio queue
  const filteredCandidates = useMemo(() => {
    return candidates.filter((c) => {
      if (studioSearch.trim()) {
        const q = studioSearch.toLowerCase().trim();
        const matchName = c.fullName.toLowerCase().includes(q);
        const matchEmail = c.email.toLowerCase().includes(q);
        const matchExp = c.experience.toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchExp) return false;
      }

      if (studioStatusFilter !== 'ALL') {
        const mySheet =
          c.sheets.find(
            (s) =>
              s.interviewerId === currentUser.id ||
              s.interviewerEmail.toLowerCase() === currentUser.email.toLowerCase(),
          ) ?? c.sheets[0];
        const m = computeCandidateMetrics(c, criteria);

        if (studioStatusFilter === 'PENDING' && mySheet?.submitted) return false;
        if (studioStatusFilter === 'SUBMITTED' && !mySheet?.submitted) return false;
        if (studioStatusFilter === 'UNLOCKED' && !m.allSubmitted) return false;
      }

      return true;
    });
  }, [candidates, studioSearch, studioStatusFilter, currentUser, criteria]);

  const evalCandidate =
    filteredCandidates.find((c) => c.id === selectedCandidateId) ??
    candidates.find((c) => c.id === selectedCandidateId) ??
    filteredCandidates[0] ??
    candidates[0];

  // Tìm đúng phiếu chấm của tài khoản đang đăng nhập (hoặc phiếu đầu tiên nếu HR đang xem)
  const activeSheet: InterviewEvalSheet | undefined = useMemo(() => {
    if (!evalCandidate) return undefined;
    return (
      evalCandidate.sheets.find(
        (s) =>
          s.interviewerId === currentUser.id ||
          s.interviewerEmail.toLowerCase() === currentUser.email.toLowerCase(),
      ) ?? evalCandidate.sheets[0]
    );
  }, [evalCandidate, currentUser]);

  const isAssignedInterviewer = useMemo(() => {
    if (!evalCandidate) return false;
    return evalCandidate.sheets.some(
      (s) =>
        s.interviewerId === currentUser.id ||
        s.interviewerEmail.toLowerCase() === currentUser.email.toLowerCase(),
    );
  }, [evalCandidate, currentUser]);

  const livePreviewScore = useMemo(() => {
    if (!activeSheet || criteria.length === 0) return 3.0;
    let sum = 0;
    for (const c of criteria) {
      const val = activeSheet.scores[c.id] ?? 3.0;
      sum += (c.weightPercent / 100) * val;
    }
    return Math.round(sum * 100) / 100;
  }, [activeSheet, criteria]);

  const liveKnockoutTriggered = useMemo(() => {
    if (!activeSheet) return false;
    return criteria.some((c) => c.isKnockout && (activeSheet.scores[c.id] ?? 3.0) <= 1.5);
  }, [activeSheet, criteria]);

  const evalMetrics = useMemo(() => {
    if (!evalCandidate) {
      return {
        allSubmitted: false,
        submittedCount: 0,
        panelSize: 0,
        overallScore: null,
        hasVarianceAlert: false,
        isDisqualified: false,
        perCriterion: [],
      };
    }
    return computeCandidateMetrics(evalCandidate, criteria);
  }, [evalCandidate, criteria]);

  if (!evalCandidate || !activeSheet) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-xs text-slate-500 shadow-xs">
        <ClipboardCheck className="mx-auto mb-2 h-8 w-8 text-slate-400" />
        <p className="text-sm font-bold text-slate-800">
          Hiện chưa có ứng viên nào trong danh sách chấm điểm của vị trí này
        </p>
        <p className="mt-1 text-slate-500">
          Khi HR xếp lịch phỏng vấn và phân công hội đồng (S3.13), hồ sơ ứng viên sẽ xuất hiện tại đây.
        </p>
      </div>
    );
  }

  // HR chỉ được xem theo Blind Policy (S4.7), không được chấm thay hội đồng (S4.2)
  const isReadOnly = !isAssignedInterviewer || activeSheet.submitted;

  return (
    <div className="space-y-5">
      {/* =====================================================================
          TOP BAR: SEARCH, MODERN FILTER, CANDIDATE SELECTOR & BLIND LOCK IDENTITY
         ===================================================================== */}
      <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-violet-600" />
              Không Gian Chấm Điểm Độc Lập 2 Màn Hình (Split-Screen Scorecard Studio — D04, D05, D06)
            </h3>
            <p className="text-[11px] text-slate-500">
              Vị trí đang chấm: <strong className="text-slate-800">{jobTitle}</strong> · Ngưỡng điểm qua vòng:{' '}
              <strong className="font-mono text-emerald-700">{passThreshold.toFixed(1)} / 5.0</strong>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => setQuestionGuideOpen(true)}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-2xl border border-violet-200 bg-violet-50/80 px-3.5 py-1.5 text-xs font-bold text-violet-800 shadow-2xs hover:bg-violet-100 transition-all active:scale-95"
            >
              <BookOpen className="h-3.5 w-3.5 text-violet-600" />
              Bộ Câu Hỏi Gợi Ý Theo Barem
            </button>

            {isAssignedInterviewer ? (
              <span className="inline-flex items-center gap-1.5 rounded-2xl bg-violet-100 px-3.5 py-1.5 font-bold text-violet-900 ring-1 ring-violet-300">
                <UserCheck className="h-3.5 w-3.5 text-violet-700" />
                Giám khảo: {currentUser.fullName}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-2xl bg-amber-50 px-3.5 py-1.5 font-bold text-amber-900 ring-1 ring-amber-300">
                <Lock className="h-3.5 w-3.5 text-amber-600" />
                Chế độ Quan sát ({currentUser.role}) — Blind Policy S4.7
              </span>
            )}
          </div>
        </div>

        {/* Search & Filter Controls Row */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Dedicated Search Input + Button */}
            <div className="flex items-center gap-1.5">
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={studioSearch}
                  onChange={(e) => setStudioSearch(e.target.value)}
                  placeholder="Tìm tên ứng viên, email, kỹ năng..."
                  className="w-52 sm:w-64 rounded-2xl border border-slate-200/90 bg-white py-1.5 pr-8 pl-8 text-xs shadow-2xs transition-all focus:border-amber-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400/20"
                />
                {studioSearch && (
                  <button
                    type="button"
                    onClick={() => setStudioSearch('')}
                    className="absolute top-1/2 right-2.5 -translate-y-1/2 cursor-pointer rounded-full p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    title="Xóa tìm kiếm"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  if (filteredCandidates.length > 0) {
                    onSelectCandidate(filteredCandidates[0].id);
                  }
                }}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-2xl border border-amber-300/80 bg-amber-500 hover:bg-amber-400 px-3.5 py-1.5 text-xs font-extrabold text-slate-950 shadow-xs transition-all active:scale-95"
              >
                <Search className="h-3.5 w-3.5" />
                <span>Tìm kiếm</span>
              </button>
            </div>

            {/* Status Filter via ModernSelect */}
            <ModernSelect<'ALL' | 'PENDING' | 'SUBMITTED' | 'UNLOCKED'>
              value={studioStatusFilter}
              onChange={(val) => setStudioStatusFilter(val)}
              options={[
                { value: 'ALL', label: 'Tất cả ứng viên trong Studio' },
                {
                  value: 'PENDING',
                  label: 'Chờ nộp phiếu chấm',
                  badge: 'Pending',
                  badgeColor: 'bg-amber-50 text-amber-800',
                },
                {
                  value: 'SUBMITTED',
                  label: 'Đã nộp phiếu bất biến',
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
              icon={Filter}
            />

            {(studioSearch || studioStatusFilter !== 'ALL') && (
              <button
                type="button"
                onClick={() => {
                  setStudioSearch('');
                  setStudioStatusFilter('ALL');
                }}
                className="inline-flex cursor-pointer items-center gap-1 rounded-2xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                <RotateCcw className="h-3 w-3 text-slate-400" />
                Đặt lại
              </button>
            )}
          </div>

          <span className="text-[11px] font-semibold text-slate-500">
            Hiển thị <strong>{filteredCandidates.length}</strong> / {candidates.length} ứng viên
          </span>
        </div>

        {/* Candidate Selector Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-xs font-bold text-slate-600">Hàng đợi ứng viên:</span>
          {filteredCandidates.map((c) => {
            const m = computeCandidateMetrics(c, criteria);
            const mySh =
              c.sheets.find(
                (s) =>
                  s.interviewerId === currentUser.id ||
                  s.interviewerEmail.toLowerCase() === currentUser.email.toLowerCase(),
              ) ?? c.sheets[0];
            const isSelected = c.id === evalCandidate.id;

            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onSelectCandidate(c.id)}
                className={cn(
                  'inline-flex cursor-pointer items-center gap-1.5 rounded-2xl px-3.5 py-1.5 text-xs font-bold transition-all',
                  isSelected
                    ? 'border border-amber-400 bg-amber-500 text-slate-950 font-extrabold shadow-xs'
                    : 'border border-slate-200 bg-slate-50/70 text-slate-700 hover:bg-white hover:border-slate-300',
                )}
              >
                <span>{c.fullName}</span>
                <span
                  className={cn(
                    'rounded-md px-1.5 py-0.2 font-mono text-[10px] font-bold',
                    isSelected
                      ? 'bg-white/80 text-slate-900'
                      : mySh?.submitted
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800',
                  )}
                >
                  {mySh?.submitted ? '✓' : '⏳'} {m.submittedCount}/{m.panelSize}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* =====================================================================
          SPLIT-SCREEN WORKSPACE (LEFT: CV & BLIND LOCK | RIGHT: SCORECARD)
         ===================================================================== */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* LEFT PANE: CV SNAPSHOT + BLIND LOCK STATUS + LOGS */}
        <div className="flex flex-col rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs lg:col-span-6">
          <div className="mb-4 border-b border-slate-100 pb-3">
            <AnimatedTabsList
              layoutId="studio-left-tabs"
              value={leftPaneTab}
              onValueChange={setLeftPaneTab}
              tabs={[
                {
                  value: 'pdf',
                  label: 'CV PDF Snapshot (S3.7)',
                  icon: <FileText className="h-3.5 w-3.5" />,
                },
                {
                  value: 'blind',
                  label: 'Hội đồng & Blind Lock',
                  badge: `${evalMetrics.submittedCount}/${evalMetrics.panelSize}`,
                  icon: evalMetrics.allSubmitted ? (
                    <Unlock className="h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    <EyeOff className="h-3.5 w-3.5 text-violet-600" />
                  ),
                },
                {
                  value: 'history',
                  label: 'Quét trùng & Nhật ký',
                  icon: <Clock className="h-3.5 w-3.5" />,
                },
              ]}
            />
          </div>

          {/* TAB 1: CV PDF SNAPSHOT */}
          {leftPaneTab === 'pdf' && (
            <div className="flex-1 rounded-2xl border border-slate-200/90 bg-slate-50/70 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-800">
                <div className="flex items-center gap-2">
                  <span className="rounded-xl bg-white px-2.5 py-1 font-mono font-bold text-slate-800 shadow-2xs ring-1 ring-slate-200">
                    📄 {evalCandidate.resumeFileName}
                  </span>
                  {evalCandidate.isReturningCandidate && (
                    <span className="rounded-xl bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-800 ring-1 ring-amber-300">
                      Ứng viên cũ liên kết (D09)
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  {evalCandidate.interviewScheduledAt && (
                    <button
                      type="button"
                      onClick={() => downloadIcsFile(evalCandidate, jobTitle)}
                      className="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 font-bold text-blue-700 hover:bg-blue-100 transition-all"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Tải Lịch .ics
                    </button>
                  )}
                </div>
              </div>

              {evalCandidate.resumeDataUrl ? (
                <iframe
                  title={evalCandidate.resumeFileName}
                  src={evalCandidate.resumeDataUrl}
                  className="h-[480px] w-full rounded-2xl border border-slate-200 bg-white"
                />
              ) : (
                <div className="mx-auto rounded-2xl border border-slate-200/90 bg-white p-6 text-slate-900 shadow-sm space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
                    <div>
                      <span className="inline-block rounded-lg bg-blue-50 px-2.5 py-0.5 font-mono text-[10px] font-bold text-blue-700 ring-1 ring-blue-200/60">
                        CURRICULUM VITAE — SNAPSHOT PDF (S3.7)
                      </span>
                      <h2 className="mt-1.5 text-lg font-extrabold text-slate-900">
                        {evalCandidate.fullName}
                      </h2>
                      <p className="text-xs font-semibold text-blue-600">
                        Ứng tuyển vị trí: {jobTitle} · Vòng hiện tại: {evalCandidate.stageCode}
                      </p>
                    </div>
                    <div className="rounded-xl bg-slate-50 px-3 py-2 text-right font-mono text-[11px] text-slate-600 border border-slate-200/70">
                      <p className="font-bold text-slate-800">{evalCandidate.email}</p>
                      <p>{evalCandidate.phone}</p>
                      <p className="text-[10px] text-slate-400">Nộp ngày: {evalCandidate.appliedAt}</p>
                    </div>
                  </div>

                  <div className="space-y-3.5 text-xs leading-relaxed text-slate-700">
                    <div className="rounded-xl bg-slate-50/80 p-3.5 border border-slate-200/60">
                      <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                        1. Tóm tắt Kinh nghiệm & Năng lực Chuyên môn
                      </h4>
                      <p className="mt-1.5 text-slate-700 leading-relaxed">
                        {evalCandidate.experience}
                      </p>
                    </div>

                    <div className="rounded-xl bg-violet-50/50 p-3.5 border border-violet-200/60">
                      <h4 className="font-bold text-violet-950 uppercase text-[11px] tracking-wider flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-violet-600" />
                        2. Thông tin Buổi phỏng vấn & Hội đồng
                      </h4>
                      <div className="mt-1.5 grid grid-cols-1 gap-2 sm:grid-cols-2 text-[11px]">
                        <p>
                          Thời gian:{' '}
                          <strong className="text-slate-900">
                            {evalCandidate.interviewScheduledAt || 'Chưa xếp lịch'}
                          </strong>{' '}
                          ({evalCandidate.interviewDurationMinutes} phút)
                        </p>
                        <p>
                          Phòng họp:{' '}
                          <span className="font-mono font-bold text-violet-700 underline">
                            {evalCandidate.meetingLink || evalCandidate.interviewLocation || '—'}
                          </span>
                        </p>
                      </div>
                    </div>

                    {/* Quick Rubric Checklist inside CV View */}
                    <div className="rounded-xl border border-slate-200/80 bg-white p-3.5">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider">
                          3. Barem Tiêu chí Cần Thẩm định ({criteria.length} tiêu chí = 100%)
                        </h4>
                        <button
                          type="button"
                          onClick={() => setQuestionGuideOpen(true)}
                          className="cursor-pointer text-[11px] font-bold text-violet-600 hover:underline"
                        >
                          Xem câu hỏi gợi ý →
                        </button>
                      </div>
                      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                        {criteria.map((c) => (
                          <div
                            key={c.id}
                            className="flex items-center justify-between rounded-lg bg-slate-50 px-2.5 py-1.5 text-[11px]"
                          >
                            <span className="font-semibold text-slate-700 truncate pr-2">
                              {c.name}
                            </span>
                            <div className="flex items-center gap-1 shrink-0">
                              {c.isKnockout && (
                                <span className="rounded bg-red-100 px-1.5 py-0.2 text-[9px] font-bold text-red-700">
                                  Knock-out
                                </span>
                              )}
                              <span className="font-mono font-bold text-blue-700">
                                {c.weightPercent}%
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: BLIND EVALUATION LOCK & PANEL COMPARISON */}
          {leftPaneTab === 'blind' && (
            <div className="space-y-3.5">
              <div
                className={cn(
                  'rounded-2xl border p-4',
                  evalMetrics.allSubmitted
                    ? 'border-emerald-200 bg-gradient-to-r from-emerald-50/90 via-teal-50/50 to-white'
                    : 'border-violet-200 bg-gradient-to-r from-violet-50/90 via-indigo-50/50 to-white',
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                    {evalMetrics.allSubmitted ? (
                      <>
                        <Unlock className="h-4 w-4 text-emerald-600" />
                        Đã mở khóa Blind Mode (100% Hội đồng đã nộp phiếu — S4.8)
                      </>
                    ) : (
                      <>
                        <Lock className="h-4 w-4 text-violet-600" />
                        Đang kích hoạt Blind Evaluation Lock (Chống Groupthink Bias — D06, S4.5–S4.7)
                      </>
                    )}
                  </p>
                  <span className="rounded-xl bg-white px-2.5 py-1 font-mono text-xs font-extrabold text-slate-800 shadow-2xs ring-1 ring-slate-200">
                    {evalMetrics.submittedCount}/{evalMetrics.panelSize} phiếu
                  </span>
                </div>
                <p className="mt-1.5 text-[11px] text-slate-600 leading-relaxed">
                  {evalMetrics.allSubmitted
                    ? 'Tất cả thành viên hội đồng đã hoàn tất nộp phiếu độc lập. Điểm trung bình từng tiêu chí, độ lệch Δ_i và nhận xét chéo đã được mở khóa.'
                    : 'Khi chưa đủ 100% hội đồng nộp phiếu, mỗi giám khảo chỉ thấy được phiếu của chính mình; điểm và nhận xét của các thành viên khác được khóa kín hoàn toàn.'}
                </p>
              </div>

              {/* Cross-Panel Variance Summary Table (Only when unlocked) */}
              {evalMetrics.allSubmitted && evalMetrics.perCriterion.length > 0 && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3.5 space-y-2">
                  <p className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Scale className="h-3.5 w-3.5 text-blue-600" />
                    Bảng Tổng Hợp Độ Lệch Hội Đồng (Cross-Panel Calibration Matrix)
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[11px]">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500 uppercase">
                          <th className="py-1.5 pr-2">Tiêu chí</th>
                          <th className="px-2 py-1.5 text-center">Trọng số</th>
                          <th className="px-2 py-1.5 text-center">Điểm TB</th>
                          <th className="px-2 py-1.5 text-center">Độ lệch Δ_i</th>
                          <th className="py-1.5 pl-2 text-right">Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200/60">
                        {criteria.map((c) => {
                          const pc = evalMetrics.perCriterion.find((p) => p.criterionId === c.id);
                          if (!pc) return null;
                          return (
                            <tr key={c.id}>
                              <td className="py-1.5 pr-2 font-semibold text-slate-800">{c.name}</td>
                              <td className="px-2 py-1.5 text-center font-mono">{c.weightPercent}%</td>
                              <td className="px-2 py-1.5 text-center font-mono font-bold text-slate-900">
                                {pc.mean.toFixed(2)}
                              </td>
                              <td className="px-2 py-1.5 text-center font-mono">
                                {pc.delta.toFixed(1)}
                              </td>
                              <td className="py-1.5 pl-2 text-right">
                                {pc.knockoutFail ? (
                                  <span className="rounded bg-red-100 px-1.5 py-0.5 font-bold text-red-700">
                                    Điểm liệt
                                  </span>
                                ) : pc.varianceFlag ? (
                                  <span className="rounded bg-amber-100 px-1.5 py-0.5 font-bold text-amber-900">
                                    Lệch Δ ≥ 2.0
                                  </span>
                                ) : (
                                  <span className="text-emerald-700 font-semibold">Đồng thuận</span>
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

              {/* Individual Panelist Cards */}
              <div className="space-y-2.5">
                {evalCandidate.sheets.map((sh) => {
                  const isMine =
                    sh.interviewerId === currentUser.id ||
                    sh.interviewerEmail.toLowerCase() === currentUser.email.toLowerCase();
                  const canSee = evalMetrics.allSubmitted || (isMine && sh.submitted);

                  return (
                    <div
                      key={sh.interviewerId}
                      className={cn(
                        'rounded-2xl border p-4 text-xs transition-all',
                        isMine
                          ? 'border-violet-200 bg-violet-50/20'
                          : 'border-slate-200 bg-white',
                      )}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{sh.interviewerName}</span>
                          {isMine && (
                            <span className="rounded-md bg-violet-100 px-2 py-0.5 font-mono text-[10px] font-bold text-violet-800">
                              PHIẾU CỦA BẠN
                            </span>
                          )}
                          <span className="font-mono text-[11px] text-slate-400">
                            ({sh.interviewerEmail})
                          </span>
                        </div>
                        <span
                          className={cn(
                            'rounded-xl px-2.5 py-0.5 text-[10px] font-bold ring-1',
                            sh.submitted
                              ? 'bg-emerald-50 text-emerald-800 ring-emerald-200'
                              : 'bg-amber-50 text-amber-800 ring-amber-200',
                          )}
                        >
                          {sh.submitted ? `✓ Đã nộp (${sh.submittedAt || 'Bất biến'})` : '⏳ Đang chấm độc lập'}
                        </span>
                      </div>

                      {canSee ? (
                        <div className="mt-3 space-y-2 border-t border-slate-100 pt-2.5 text-slate-700">
                          <div className="flex items-center justify-between">
                            <span>
                              Khuyến nghị:{' '}
                              <strong className="font-mono text-blue-700">{sh.recommendation}</strong>
                            </span>
                            <span className="font-mono text-[11px] font-bold text-slate-600">
                              Điểm phiếu:{' '}
                              {criteria
                                .reduce(
                                  (acc, c) =>
                                    acc + (c.weightPercent / 100) * (sh.scores[c.id] ?? 3.0),
                                  0,
                                )
                                .toFixed(2)}{' '}
                              / 5.0
                            </span>
                          </div>
                          <p className="rounded-xl bg-slate-50 p-2.5 italic text-slate-600">
                            "{sh.comment || 'Không có nhận xét tổng quát'}"
                          </p>
                          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                            {criteria.map((c) => (
                              <div
                                key={c.id}
                                className="flex justify-between rounded-lg border border-slate-100 bg-white px-2.5 py-1 text-[11px]"
                              >
                                <span className="text-slate-500 truncate pr-2">{c.name}:</span>
                                <span className="font-mono font-bold text-slate-900 shrink-0">
                                  {(sh.scores[c.id] ?? 3.0).toFixed(1)} / 5.0
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="mt-2.5 flex items-center gap-2 rounded-xl border border-dashed border-violet-200 bg-violet-50/40 px-3 py-2 text-[11px] text-violet-800">
                          <EyeOff className="h-3.5 w-3.5 text-violet-600 shrink-0" />
                          <span>
                            Điểm số & nhận xét đang được niêm phong bởi <strong>Blind Evaluation Guard (D06)</strong> cho tới khi đủ {evalMetrics.panelSize}/{evalMetrics.panelSize} phiếu.
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: DEDUPLICATION & AUDIT LOGS */}
          {leftPaneTab === 'history' && (
            <AnimatedAccordion
              items={[
                {
                  id: 'dedup',
                  title: 'Kiểm tra Trùng lặp Hồ sơ (Candidate Deduplication D09)',
                  content: evalCandidate.isReturningCandidate ? (
                    <p className="text-amber-800 font-medium">
                      ⚠️ Phát hiện ứng viên cũ nộp lại: {evalCandidate.previousApplicationsNote}
                    </p>
                  ) : (
                    <p className="text-emerald-700 font-medium">
                      ✓ Hồ sơ mới hoàn toàn, không trùng Email/SĐT trong lịch sử chiến dịch.
                    </p>
                  ),
                },
                {
                  id: 'logs',
                  title: `Nhật ký Chuyển vòng Bất biến (${evalCandidate.logs.length} sự kiện)`,
                  content: (
                    <div className="space-y-2">
                      {evalCandidate.logs.map((l) => (
                        <div
                          key={l.id}
                          className="flex items-start justify-between gap-2 rounded-xl bg-slate-50 p-2.5 text-[11px]"
                        >
                          <span>
                            <strong className="font-mono text-blue-700">{l.toStageCode}</strong> —{' '}
                            {l.note}
                          </span>
                          <span className="font-mono text-slate-400 shrink-0">{l.createdAt}</span>
                        </div>
                      ))}
                    </div>
                  ),
                },
              ]}
            />
          )}
        </div>

        {/* RIGHT PANE: WEIGHTED SCORECARD SLIDERS, PRESETS, COMMENTS & IMMUTABLE SUBMIT */}
        <div className="flex flex-col justify-between rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs lg:col-span-6">
          <div className="space-y-4">
            <AnimatedScoreTicker
              score={livePreviewScore}
              threshold={passThreshold}
              isKnockoutTriggered={liveKnockoutTriggered}
              hasVarianceAlert={evalMetrics.hasVarianceAlert}
            />

            {!isAssignedInterviewer && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50/90 p-3.5 text-xs text-amber-900">
                Bạn đang đăng nhập với vai trò <strong>{currentUser.role}</strong> (không thuộc hội
                đồng chấm trực tiếp của buổi phỏng vấn này — S4.2). Để trực tiếp chấm điểm, hãy Đăng xuất và
                Đăng nhập bằng tài khoản giám khảo được phân công (ví dụ:{' '}
                <code className="font-mono font-bold">int1@ats.local</code> hoặc{' '}
                <code className="font-mono font-bold">int2@ats.local</code>).
              </div>
            )}

            {isAssignedInterviewer && activeSheet.submitted && (
              <div className="flex items-center justify-between gap-2 rounded-2xl border border-emerald-200 bg-emerald-50/90 p-3.5 text-xs font-semibold text-emerald-900">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>
                    Phiếu đánh giá của bạn đã được nộp lúc{' '}
                    <strong>{activeSheet.submittedAt || 'hôm nay'}</strong> và được khóa bất biến
                    (Immutable Scorecard — D06, S4.3).
                  </span>
                </div>
                <span className="rounded-lg bg-emerald-200/80 px-2 py-0.5 font-mono text-[10px] font-extrabold text-emerald-950 shrink-0">
                  LOCKED
                </span>
              </div>
            )}

            {/* Criterion Sliders + Quick Preset Buttons */}
            <div className="space-y-3.5">
              {criteria.map((criterion) => {
                const val = activeSheet.scores[criterion.id] ?? 3.0;
                const critComment = activeSheet.criterionComments?.[criterion.id] ?? '';
                const isCritKnockoutAlert = criterion.isKnockout && val <= 1.5;

                return (
                  <div
                    key={criterion.id}
                    className={cn(
                      'rounded-2xl border p-4 transition-all',
                      isCritKnockoutAlert
                        ? 'border-red-300 bg-red-50/60 ring-1 ring-red-200'
                        : 'border-slate-200/90 bg-slate-50/50 hover:bg-slate-50/90',
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-xs font-extrabold text-slate-900">
                          {criterion.name}
                        </span>
                        <span className="rounded-lg bg-blue-100 px-2 py-0.5 font-mono text-[10px] font-bold text-blue-800 tabular-nums">
                          Trọng số {criterion.weightPercent}%
                        </span>
                        {criterion.isKnockout && (
                          <span className="rounded-lg bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700 ring-1 ring-red-200">
                            Điểm liệt nếu ≤ 1.5 (D05)
                          </span>
                        )}
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span
                          className={cn(
                            'font-mono text-lg font-black tabular-nums',
                            isCritKnockoutAlert ? 'text-red-600' : 'text-blue-600',
                          )}
                        >
                          {val.toFixed(1)}
                        </span>
                        <span className="font-mono text-[10px] text-slate-400">/ 5.0</span>
                      </div>
                    </div>

                    {/* Radix Slider */}
                    <Slider.Root
                      min={1.0}
                      max={5.0}
                      step={0.5}
                      disabled={isReadOnly}
                      value={[val]}
                      onValueChange={([next]) =>
                        onUpdateSheetScore(
                          evalCandidate.id,
                          activeSheet.interviewerId,
                          criterion.id,
                          next,
                        )
                      }
                      className={cn(
                        'relative mt-3 flex h-5 w-full touch-none items-center select-none',
                        isReadOnly && 'opacity-65',
                      )}
                    >
                      <Slider.Track className="relative h-2 grow rounded-full bg-slate-200">
                        <Slider.Range
                          className={cn(
                            'absolute h-full rounded-full',
                            isCritKnockoutAlert ? 'bg-red-600' : 'bg-blue-600',
                          )}
                        />
                      </Slider.Track>
                      <Slider.Thumb
                        aria-label={criterion.name}
                        className={cn(
                          'block h-5 w-5 cursor-pointer rounded-full border-2 bg-white shadow-md transition-transform focus:scale-110 focus:outline-none',
                          isCritKnockoutAlert ? 'border-red-600' : 'border-blue-600',
                        )}
                      />
                    </Slider.Root>

                    {/* Quick Score Tap Presets (Unique Interviewer Speed Feature) */}
                    {!isReadOnly && (
                      <div className="mt-2.5 flex flex-wrap items-center gap-1">
                        <span className="text-[10px] font-semibold text-slate-400 mr-1">
                          Chấm nhanh:
                        </span>
                        {SCORE_PRESETS.map((preset) => {
                          const active = Math.abs(val - preset.value) < 0.01;
                          return (
                            <button
                              key={preset.value}
                              type="button"
                              onClick={() =>
                                onUpdateSheetScore(
                                  evalCandidate.id,
                                  activeSheet.interviewerId,
                                  criterion.id,
                                  preset.value,
                                )
                              }
                              className={cn(
                                'cursor-pointer rounded-lg border px-2 py-0.5 font-mono text-[10px] font-bold transition-all active:scale-95',
                                active
                                  ? 'border-amber-400 bg-amber-500 text-slate-950 shadow-2xs'
                                  : preset.colorClass,
                              )}
                            >
                              {preset.short}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Criterion Specific Comment Input */}
                    <div className="mt-2.5 space-y-1.5">
                      <input
                        type="text"
                        disabled={isReadOnly}
                        value={critComment}
                        onChange={(e) =>
                          onUpdateSheetCriterionComment(
                            evalCandidate.id,
                            activeSheet.interviewerId,
                            criterion.id,
                            e.target.value,
                          )
                        }
                        placeholder={`Ghi chú dẫn chứng thực tế cho tiêu chí "${criterion.name}"...`}
                        className="w-full rounded-xl border border-slate-200/90 bg-white px-3 py-1.5 text-xs text-slate-700 shadow-2xs focus:border-amber-400 focus:outline-none disabled:bg-slate-100"
                      />
                      {!isReadOnly && (
                        <div className="flex flex-wrap items-center gap-1">
                          {QUICK_COMMENT_SNIPPETS.slice(0, 3).map((snip) => (
                            <button
                              key={snip}
                              type="button"
                              onClick={() =>
                                onUpdateSheetCriterionComment(
                                  evalCandidate.id,
                                  activeSheet.interviewerId,
                                  criterion.id,
                                  snip,
                                )
                              }
                              className="cursor-pointer rounded-md bg-white border border-slate-200/80 px-2 py-0.5 text-[10px] text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                            >
                              + {snip}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Recommendation & Overall Comment */}
            <div className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200/90 bg-slate-50/70 p-4 text-xs sm:grid-cols-2">
              <div>
                <label className="block font-bold text-slate-700">
                  Khuyến nghị Tuyển dụng (S4.1)
                </label>
                <ModernSelect<RecommendationType>
                  disabled={isReadOnly}
                  value={activeSheet.recommendation}
                  onChange={(val) =>
                    onUpdateSheetMeta(
                      evalCandidate.id,
                      activeSheet.interviewerId,
                      val,
                      activeSheet.comment,
                    )
                  }
                  options={[
                    {
                      value: 'STRONG_HIRE',
                      label: 'STRONG_HIRE (Tuyển gấp)',
                      badge: 'Ưu tiên',
                      badgeColor: 'bg-emerald-100 text-emerald-900',
                    },
                    {
                      value: 'HIRE',
                      label: 'HIRE (Đề xuất tuyển)',
                      badge: 'Đạt',
                      badgeColor: 'bg-emerald-50 text-emerald-700',
                    },
                    {
                      value: 'NO_HIRE',
                      label: 'NO_HIRE (Không đạt)',
                      badge: 'Chưa đạt',
                      badgeColor: 'bg-amber-50 text-amber-800',
                    },
                    {
                      value: 'STRONG_NO_HIRE',
                      label: 'STRONG_NO_HIRE (Loại thẳng)',
                      badge: 'Loại',
                      badgeColor: 'bg-red-50 text-red-700',
                    },
                  ]}
                  className="mt-1 w-full"
                  triggerClassName="w-full rounded-2xl py-2 font-mono font-bold text-slate-900"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700">
                  Nhận xét Tổng kết của Giám khảo
                </label>
                <input
                  type="text"
                  disabled={isReadOnly}
                  value={activeSheet.comment}
                  onChange={(e) =>
                    onUpdateSheetMeta(
                      evalCandidate.id,
                      activeSheet.interviewerId,
                      activeSheet.recommendation,
                      e.target.value,
                    )
                  }
                  placeholder="Đánh giá chung sau buổi phỏng vấn..."
                  className="mt-1 w-full rounded-2xl border border-slate-200/90 bg-white px-3.5 py-2 text-slate-800 shadow-2xs focus:border-amber-400 focus:outline-none disabled:bg-slate-100"
                />
              </div>
            </div>
          </div>

          {/* Footer Submit Trigger */}
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
            <span className="text-xs font-semibold text-slate-600">
              Phiếu của <strong>{activeSheet.interviewerName}</strong>:{' '}
              <strong className={activeSheet.submitted ? 'text-emerald-600' : 'text-amber-600'}>
                {activeSheet.submitted ? 'ĐÃ NỘP (BẤT BIẾN)' : 'BẢN NHÁP ĐỘC LẬP'}
              </strong>
            </span>

            {isAssignedInterviewer && (
              <button
                type="button"
                onClick={() => {
                  if (activeSheet.submitted) {
                    // Nếu đã nộp, gọi thẳng hàm để kích hoạt Guard EVAL_ALREADY_SUBMITTED (S4.3)
                    onSubmitSheet(evalCandidate.id, activeSheet.interviewerId);
                  } else {
                    // Mở khung xác nhận riêng biệt trước khi khóa bất biến
                    setConfirmSubmitOpen(true);
                  }
                }}
                className={cn(
                  'cursor-pointer rounded-2xl px-5 py-2.5 text-xs font-extrabold shadow-xs transition-all active:scale-95',
                  activeSheet.submitted
                    ? 'border border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200'
                    : 'border border-amber-300/80 bg-amber-500 hover:bg-amber-400 text-slate-950',
                )}
              >
                {activeSheet.submitted
                  ? 'Thử Nộp Lại (Test Chặn Bất Biến S4.3)'
                  : '✓ Xác Nhận & Nộp Phiếu Độc Lập (S4.1)'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* =====================================================================
          ISOLATED MODAL 1: XÁC NHẬN NỘP PHIẾU BẤT BIẾN (IMMUTABLE SUBMIT DIALOG)
         ===================================================================== */}
      <AnimatedSpringDialog
        open={confirmSubmitOpen}
        onOpenChange={setConfirmSubmitOpen}
        title="Xác Nhận Nộp Phiếu Chấm Điểm Bất Biến (Immutable Scorecard)"
        subtitle={`Ứng viên: ${evalCandidate.fullName} • Giám khảo: ${activeSheet.interviewerName} (Quy tắc D06 / S4.3)`}
      >
        <div className="space-y-4 text-xs">
          <div className="rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50/90 via-orange-50/50 to-white p-4 text-amber-950">
            <p className="font-bold flex items-center gap-1.5">
              <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0" />
              Lưu ý quan trọng trước khi khóa phiếu:
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-amber-900">
              Theo quy định <strong>D06 (S4.3)</strong>, sau khi bạn nhấn xác nhận nộp phiếu, toàn
              bộ điểm số và nhận xét sẽ được ghi nhận <strong>bất biến (Immutable)</strong> vào cơ
              sở dữ liệu và không thể chỉnh sửa lại.
            </p>
          </div>

          {/* Score Breakdown Summary */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 space-y-2.5">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="font-bold text-slate-800">Tổng hợp điểm tiêu chí của bạn:</span>
              <span className="font-mono text-sm font-black text-blue-700">
                Tổng điểm S = {livePreviewScore.toFixed(2)} / 5.0
              </span>
            </div>

            <div className="space-y-1.5">
              {criteria.map((c) => {
                const s = activeSheet.scores[c.id] ?? 3.0;
                const isKo = c.isKnockout && s <= 1.5;
                return (
                  <div
                    key={c.id}
                    className="flex items-center justify-between rounded-xl bg-white px-3 py-2 border border-slate-200/80"
                  >
                    <div>
                      <span className="font-bold text-slate-900">{c.name}</span>
                      <span className="ml-2 font-mono text-[10px] text-slate-500">
                        (Trọng số {c.weightPercent}%)
                      </span>
                      {isKo && (
                        <span className="ml-2 rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-700">
                          Cảnh báo Điểm liệt!
                        </span>
                      )}
                    </div>
                    <span
                      className={cn(
                        'font-mono font-extrabold',
                        isKo ? 'text-red-600' : 'text-slate-900',
                      )}
                    >
                      {s.toFixed(1)} / 5.0
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-xs">
              <span>
                Khuyến nghị cuối cùng:{' '}
                <strong className="font-mono text-violet-700">{activeSheet.recommendation}</strong>
              </span>
              <span>
                Ngưỡng đạt Job: <strong className="font-mono">{passThreshold.toFixed(1)}</strong>
              </span>
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setConfirmSubmitOpen(false)}
              className="cursor-pointer rounded-2xl border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-600 hover:bg-slate-50"
            >
              Quay lại kiểm tra
            </button>
            <button
              type="button"
              onClick={() => {
                setConfirmSubmitOpen(false);
                onSubmitSheet(evalCandidate.id, activeSheet.interviewerId);
              }}
              className="cursor-pointer rounded-2xl border border-amber-300/80 bg-amber-500 hover:bg-amber-400 px-5 py-2 font-extrabold text-slate-950 shadow-xs"
            >
              ✓ Khóa & Nộp Phiếu Chính Thức
            </button>
          </div>
        </div>
      </AnimatedSpringDialog>

      {/* =====================================================================
          ISOLATED MODAL 2: BỘ CÂU HỎI GỢI Ý THEO BAREM (INTERVIEW QUESTION BANK)
         ===================================================================== */}
      <AnimatedSpringDialog
        open={questionGuideOpen}
        onOpenChange={setQuestionGuideOpen}
        title={`Cẩm Nang Câu Hỏi Phỏng Vấn Theo Barem — ${jobTitle}`}
        subtitle="Gợi ý câu hỏi tình huống (STAR) và câu hỏi đào sâu kỹ thuật tương ứng với từng tiêu chí trọng số"
      >
        <div className="space-y-3.5 text-xs">
          <div className="rounded-2xl border border-violet-200 bg-violet-50/70 p-3.5 text-violet-950">
            <p className="font-bold flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-violet-600" />
              Hướng dẫn thẩm định độc lập dành cho Giám khảo:
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-violet-900">
              Sử dụng các câu hỏi chuẩn hóa dưới đây để đánh giá khách quan từng tiêu chí trên thang
              điểm 1.0 – 5.0, đặc biệt lưu ý các tiêu chí có gắn cờ <strong>Điểm liệt (Knock-out)</strong>.
            </p>
          </div>

          <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
            {criteria.map((c, idx) => (
              <div
                key={c.id}
                className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xs space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-slate-900">
                    {idx + 1}. {c.name} ({c.weightPercent}%)
                  </span>
                  {c.isKnockout && (
                    <span className="rounded-lg bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">
                      Tiêu chí Điểm liệt (Knock-out)
                    </span>
                  )}
                </div>
                <ul className="list-disc pl-5 space-y-1 text-[11px] text-slate-600">
                  <li>
                    Hãy chia sẻ một dự án thực tế gần đây nhất mà bạn áp dụng sâu năng lực{' '}
                    <strong>{c.name}</strong>? Bạn đã giải quyết bài toán khó nhất ở đó như thế nào?
                  </li>
                  <li>
                    Nếu gặp tình huống xung đột thiết kế hoặc giới hạn tài nguyên liên quan đến{' '}
                    <strong>{c.name}</strong>, bạn ưu tiên đánh đổi (trade-off) theo tiêu chí nào?
                  </li>
                </ul>
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setQuestionGuideOpen(false)}
              className="cursor-pointer rounded-2xl border border-amber-300/80 bg-amber-500 hover:bg-amber-400 px-5 py-2 font-extrabold text-slate-950 shadow-xs"
            >
              Đã hiểu & Quay lại chấm điểm
            </button>
          </div>
        </div>
      </AnimatedSpringDialog>
    </div>
  );
};
