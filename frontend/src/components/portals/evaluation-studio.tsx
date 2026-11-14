import * as Slider from '@radix-ui/react-slider';
import {
  Clock,
  Download,
  Eye,
  EyeOff,
  FileText,
  Lock,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { AnimatedAccordion, AnimatedTabsList } from '@/components/animate-ui/animated-tabs';
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

  const evalCandidate =
    candidates.find((c) => c.id === selectedCandidateId) ?? candidates[0];

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
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-xs text-slate-500">
        Hiện chưa có ứng viên nào trong danh sách chấm điểm của vị trí này.
      </div>
    );
  }

  // HR chỉ được xem theo Blind Policy (S4.7), không được chấm thay hội đồng (S4.2)
  const isReadOnly = !isAssignedInterviewer || activeSheet.submitted;

  return (
    <div className="space-y-4">
      {/* Top Bar: Candidate Selector & Active Panel Member Identity */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-700">Chọn ứng viên:</span>
          {candidates.map((c) => {
            const m = computeCandidateMetrics(c, criteria);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onSelectCandidate(c.id)}
                className={cn(
                  'cursor-pointer rounded-xl px-3 py-1.5 text-xs font-semibold transition-all',
                  c.id === evalCandidate.id
                    ? 'bg-amber-500 text-slate-950 font-extrabold shadow-sm shadow-amber-500/20'
                    : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
                )}
              >
                {c.fullName}{' '}
                <span className="ml-1 font-mono text-[10px] opacity-80">
                  ({m.submittedCount}/{m.panelSize})
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 text-xs">
          {isAssignedInterviewer ? (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1 font-bold text-white">
              <UserCheck className="h-3.5 w-3.5" />
              Giám khảo: {currentUser.fullName}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1 font-bold text-white">
              <Lock className="h-3.5 w-3.5" />
              Chế độ Quan sát ({currentUser.role}) — Áp dụng Blind Policy S4.7
            </span>
          )}
        </div>
      </div>

      {/* Split-Screen Grid */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* LEFT PANE: CV SNAPSHOT + BLIND LOCK STATUS + LOGS */}
        <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-xs lg:col-span-6">
          <div className="mb-4 border-b border-slate-100 pb-3">
            <AnimatedTabsList
              layoutId="studio-left-tabs"
              value={leftPaneTab}
              onValueChange={setLeftPaneTab}
              tabs={[
                {
                  value: 'pdf',
                  label: 'CV PDF Snapshot (D09)',
                  icon: <FileText className="h-3.5 w-3.5" />,
                },
                {
                  value: 'blind',
                  label: 'Hội đồng & Blind Lock',
                  badge: `${evalMetrics.submittedCount}/${evalMetrics.panelSize}`,
                  icon: evalMetrics.allSubmitted ? (
                    <Eye className="h-3.5 w-3.5" />
                  ) : (
                    <EyeOff className="h-3.5 w-3.5" />
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

          {leftPaneTab === 'pdf' && (
            <div className="flex-1 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="mb-3 flex items-center justify-between text-xs text-slate-800">
                <span className="font-mono font-bold">📄 {evalCandidate.resumeFileName}</span>
                {evalCandidate.interviewScheduledAt && (
                  <button
                    type="button"
                    onClick={() => downloadIcsFile(evalCandidate, jobTitle)}
                    className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1 font-bold text-white hover:bg-blue-700"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Tải Lịch .ics
                  </button>
                )}
              </div>

              {evalCandidate.resumeDataUrl ? (
                <iframe
                  title={evalCandidate.resumeFileName}
                  src={evalCandidate.resumeDataUrl}
                  className="h-[460px] w-full rounded-lg bg-white"
                />
              ) : (
                <div className="mx-auto rounded-xl bg-white p-6 text-slate-900 shadow-xl">
                  <div className="flex items-start justify-between border-b border-slate-200 pb-4">
                    <div>
                      <span className="inline-block rounded-md bg-blue-50 px-2 py-0.5 font-mono text-[10px] font-bold text-blue-700">
                        CURRICULUM VITAE — SNAPSHOT PDF (S3.7)
                      </span>
                      <h2 className="mt-1 text-lg font-extrabold text-slate-900">
                        {evalCandidate.fullName}
                      </h2>
                      <p className="text-xs font-semibold text-blue-600">
                        Vị trí ứng tuyển: {jobTitle}
                      </p>
                    </div>
                    <div className="text-right font-mono text-[11px] text-slate-500">
                      <p>{evalCandidate.email}</p>
                      <p>{evalCandidate.phone}</p>
                    </div>
                  </div>
                  <div className="mt-4 space-y-3 text-xs leading-relaxed text-slate-700">
                    <div>
                      <h4 className="font-bold text-slate-900 uppercase">
                        1. Kinh nghiệm Chuyên môn
                      </h4>
                      <p className="mt-1">{evalCandidate.experience}</p>
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 uppercase">
                        2. Thông tin Buổi phỏng vấn
                      </h4>
                      <p className="mt-1">
                        Thời gian: <strong>{evalCandidate.interviewScheduledAt || 'Chưa xếp lịch'}</strong> ·
                        Địa điểm/Link:{' '}
                        <span className="font-mono text-blue-700">
                          {evalCandidate.meetingLink || evalCandidate.interviewLocation || '—'}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {leftPaneTab === 'blind' && (
            <div className="space-y-3">
              <div
                className={cn(
                  'rounded-xl border p-4',
                  evalMetrics.allSubmitted
                    ? 'border-emerald-200 bg-emerald-50/70'
                    : 'border-blue-200 bg-blue-50/70',
                )}
              >
                <p className="text-xs font-bold text-slate-900">
                  {evalMetrics.allSubmitted
                    ? '🔓 Đã mở khóa Blind Mode (100% Hội đồng đã nộp phiếu — S4.8)'
                    : '🔒 Đang khóa Blind Mode (Chống hiệu ứng đám đông Groupthink Bias — S4.5–S4.7)'}
                </p>
                <p className="mt-1 text-[11px] text-slate-600">
                  {evalMetrics.allSubmitted
                    ? 'Tất cả thành viên hội đồng đã hoàn tất nộp phiếu. Điểm trung bình, độ lệch Δ_i và nhận xét chi tiết đã được mở khóa.'
                    : 'Khi chưa đủ 100% hội đồng nộp phiếu, mỗi giám khảo chỉ thấy được phiếu của chính mình; HR chỉ thấy tiến độ đã nộp (S4.7).'}
                </p>
              </div>

              {evalCandidate.sheets.map((sh) => {
                const isMine =
                  sh.interviewerId === currentUser.id ||
                  sh.interviewerEmail.toLowerCase() === currentUser.email.toLowerCase();
                const canSee = evalMetrics.allSubmitted || (isMine && sh.submitted);
                return (
                  <div
                    key={sh.interviewerId}
                    className="rounded-xl border border-slate-200 p-4 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-bold text-slate-900">{sh.interviewerName}</span>
                        <span className="ml-2 font-mono text-[11px] text-slate-400">
                          ({sh.interviewerEmail})
                        </span>
                      </div>
                      <span
                        className={cn(
                          'rounded-md px-2 py-0.5 text-[10px] font-bold',
                          sh.submitted
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800',
                        )}
                      >
                        {sh.submitted ? '✓ Đã nộp phiếu' : '⏳ Chưa nộp'}
                      </span>
                    </div>

                    {canSee ? (
                      <div className="mt-3 space-y-2 border-t border-slate-100 pt-2.5 text-slate-700">
                        <p>
                          Khuyến nghị:{' '}
                          <strong className="font-mono text-blue-700">{sh.recommendation}</strong>
                        </p>
                        <p className="italic">"{sh.comment || 'Không có nhận xét tổng quát'}"</p>
                        <div className="space-y-1">
                          {criteria.map((c) => (
                            <div key={c.id} className="flex justify-between text-[11px]">
                              <span className="text-slate-500">{c.name}:</span>
                              <span className="font-mono font-bold text-slate-900">
                                {(sh.scores[c.id] ?? 3.0).toFixed(1)} / 5.0
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="mt-2.5 flex items-center gap-1.5 text-slate-400 italic">
                        <EyeOff className="h-3.5 w-3.5" />
                        Điểm & nhận xét đang được bảo mật bởi Blind Evaluation Guard
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {leftPaneTab === 'history' && (
            <AnimatedAccordion
              items={[
                {
                  id: 'dedup',
                  title: 'Kiểm tra Trùng lặp Hồ sơ (Candidate Deduplication D09)',
                  content: evalCandidate.isReturningCandidate ? (
                    <p className="text-amber-800">
                      ⚠️ Phát hiện ứng viên cũ: {evalCandidate.previousApplicationsNote}
                    </p>
                  ) : (
                    <p className="text-emerald-700">
                      ✓ Hồ sơ mới hoàn toàn, không trùng Email/SĐT trước đây.
                    </p>
                  ),
                },
                {
                  id: 'logs',
                  title: `Nhật ký Chuyển vòng (${evalCandidate.logs.length} bước)`,
                  content: (
                    <div className="space-y-2">
                      {evalCandidate.logs.map((l) => (
                        <div key={l.id} className="flex justify-between text-[11px]">
                          <span>
                            <strong>{l.toStageCode}</strong> — {l.note}
                          </span>
                          <span className="font-mono text-slate-400">{l.createdAt}</span>
                        </div>
                      ))}
                    </div>
                  ),
                },
              ]}
            />
          )}
        </div>

        {/* RIGHT PANE: WEIGHTED SCORECARD SLIDERS, CRITERION COMMENTS & IMMUTABLE SUBMIT */}
        <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs lg:col-span-6">
          <div className="space-y-4">
            <AnimatedScoreTicker
              score={livePreviewScore}
              threshold={passThreshold}
              isKnockoutTriggered={liveKnockoutTriggered}
              hasVarianceAlert={evalMetrics.hasVarianceAlert}
            />

            {!isAssignedInterviewer && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                Bạn đang đăng nhập với vai trò <strong>{currentUser.role}</strong> (không thuộc hội
                đồng chấm của buổi phỏng vấn này — S4.2). Để trực tiếp chấm điểm, hãy Đăng xuất và
                Đăng nhập bằng tài khoản giám khảo được phân công (ví dụ:{' '}
                <code className="font-mono font-bold">int2@ats.local</code>).
              </div>
            )}

            {isAssignedInterviewer && activeSheet.submitted && (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-900">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                Phiếu đánh giá của bạn đã được nộp lúc {activeSheet.submittedAt || 'hôm nay'} và được
                khóa bất biến (Immutable Scorecard — D06, S4.3).
              </div>
            )}

            <div className="space-y-3">
              {criteria.map((criterion) => {
                const val = activeSheet.scores[criterion.id] ?? 3.0;
                const critComment = activeSheet.criterionComments?.[criterion.id] ?? '';
                const isCritKnockoutAlert = criterion.isKnockout && val <= 1.5;

                return (
                  <div
                    key={criterion.id}
                    className={cn(
                      'rounded-xl border p-4 transition-colors',
                      isCritKnockoutAlert
                        ? 'border-red-300 bg-red-50/60'
                        : 'border-slate-200 bg-slate-50/60',
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900">{criterion.name}</span>
                        <span className="rounded-md bg-blue-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-blue-800 tabular-nums">
                          {criterion.weightPercent}%
                        </span>
                        {criterion.isKnockout && (
                          <span className="rounded-md bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-700">
                            Điểm liệt (Knock-out)
                          </span>
                        )}
                      </div>
                      <span
                        className={cn(
                          'font-mono text-lg font-extrabold tabular-nums',
                          isCritKnockoutAlert ? 'text-red-600' : 'text-blue-600',
                        )}
                      >
                        {val.toFixed(1)}
                      </span>
                    </div>

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
                      placeholder={`Nhận xét riêng cho tiêu chí "${criterion.name}"...`}
                      className="mt-2.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 focus:border-blue-600 focus:outline-none disabled:bg-slate-100"
                    />
                  </div>
                );
              })}
            </div>

            {/* Recommendation & Overall Comment */}
            <div className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-xs sm:grid-cols-2">
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
                    { value: 'STRONG_HIRE', label: 'STRONG_HIRE (Tuyển gấp)', badge: 'Ưu tiên', badgeColor: 'bg-emerald-100 text-emerald-900' },
                    { value: 'HIRE', label: 'HIRE (Đề xuất tuyển)', badge: 'Đạt', badgeColor: 'bg-emerald-50 text-emerald-700' },
                    { value: 'NO_HIRE', label: 'NO_HIRE (Không đạt)', badge: 'Chưa đạt', badgeColor: 'bg-amber-50 text-amber-800' },
                    { value: 'STRONG_NO_HIRE', label: 'STRONG_NO_HIRE (Loại thẳng)', badge: 'Loại', badgeColor: 'bg-red-50 text-red-700' },
                  ]}
                  className="w-full mt-1"
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
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-800 disabled:bg-slate-100"
                />
              </div>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
            <span className="text-xs font-semibold text-slate-600">
              Trạng thái phiếu của <strong>{activeSheet.interviewerName}</strong>:{' '}
              <strong className={activeSheet.submitted ? 'text-emerald-600' : 'text-amber-600'}>
                {activeSheet.submitted ? 'ĐÃ NỘP (BẤT BIẾN)' : 'CHƯA NỘP PHIẾU'}
              </strong>
            </span>

            {isAssignedInterviewer && (
              <button
                type="button"
                onClick={() => onSubmitSheet(evalCandidate.id, activeSheet.interviewerId)}
                className={cn(
                  'cursor-pointer rounded-xl px-4 py-2.5 text-xs font-bold text-white shadow-md transition-all',
                  activeSheet.submitted
                    ? 'bg-slate-600 hover:bg-slate-700'
                    : 'bg-blue-600 shadow-blue-600/25 hover:bg-blue-700',
                )}
              >
                {activeSheet.submitted
                  ? 'Thử Nộp Lại (Test Chặn Bất Biến S4.3)'
                  : '✓ Nộp Phiếu Đánh Giá Độc Lập (S4.1)'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

