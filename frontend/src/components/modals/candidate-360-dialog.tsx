import * as Dialog from '@radix-ui/react-dialog';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  EyeOff,
  FileText,
  Lock,
  Mail,
  Phone,
  ShieldAlert,
  Trash2,
  UserCheck,
  Video,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import React, { useState } from 'react';
import { UserRole } from '@/components/animate-ui/animated-sidebar';
import { AnimatedTabsList } from '@/components/animate-ui/animated-tabs';
import {
  CandidateCardData,
  computeCandidateMetrics,
  CriterionDef,
  downloadIcsFile,
  EmailOutboxItem,
} from '@/lib/store';
import { cn } from '@/lib/utils';

interface Candidate360DialogProps {
  candidate: CandidateCardData | null;
  jobTitle: string;
  criteria: CriterionDef[];
  passThreshold: number;
  viewerId: number;
  viewerRole: UserRole;
  onClose: () => void;
  onCancelInterview: (candidateId: number) => void;
  onOpenScheduleModal: (candidateId: number) => void;
  onOpenCalibrationModal: (candidateId: number) => void;
}

export const Candidate360Dialog: React.FC<Candidate360DialogProps> = ({
  candidate,
  jobTitle,
  criteria,
  passThreshold,
  viewerId,
  viewerRole,
  onClose,
  onCancelInterview,
  onOpenScheduleModal,
  onOpenCalibrationModal,
}) => {
  const [activeTab, setActiveTab] = useState<string>('overview');

  if (!candidate) return null;

  const metrics = computeCandidateMetrics(candidate, criteria);
  const canManageInterview = viewerRole === 'HR' || viewerRole === 'ADMIN';

  return (
    <Dialog.Root open={Boolean(candidate)} onOpenChange={(open) => !open && onClose()}>
      <AnimatePresence>
        {candidate && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs"
              />
            </Dialog.Overlay>
            <Dialog.Content asChild>
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 14 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  transition={{ type: 'spring', stiffness: 360, damping: 28 }}
                  className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
                >
                  {/* Header */}
                  <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200/80 bg-gradient-to-r from-slate-50 via-blue-50/30 to-white px-6 py-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-md bg-blue-600 px-2.5 py-0.5 font-mono text-[11px] font-bold text-white shadow-2xs">
                          HỒ SƠ ỨNG VIÊN 360°
                        </span>
                        <span className="rounded-md border border-slate-200 bg-white px-2.5 py-0.5 font-mono text-[11px] font-bold text-slate-700 shadow-2xs">
                          Vòng: {candidate.stageCode}
                        </span>
                        {candidate.isReturningCandidate && (
                          <span className="rounded-md bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-800 ring-1 ring-amber-300">
                            ⚠️ Ứng viên cũ (Trùng lịch sử D09)
                          </span>
                        )}
                      </div>
                      <Dialog.Title className="mt-1.5 text-lg font-extrabold text-slate-900">
                        {candidate.fullName} —{' '}
                        <span className="text-blue-600">{jobTitle}</span>
                      </Dialog.Title>
                      <Dialog.Description className="mt-0.5 font-mono text-xs text-slate-500">
                        {candidate.email} · {candidate.phone} · Mã tra cứu:{' '}
                        <code className="text-slate-800 font-bold">{candidate.trackingToken}</code>
                      </Dialog.Description>
                    </div>

                    <Dialog.Close asChild>
                      <button
                        type="button"
                        onClick={onClose}
                        className="cursor-pointer rounded-xl border border-slate-200 bg-white p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 shadow-2xs transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </Dialog.Close>
                  </div>

                  {/* Tabs Bar */}
                  <div className="border-b border-slate-200 bg-slate-50 px-6 py-2.5">
                    <AnimatedTabsList
                      layoutId="cand-360-tabs"
                      value={activeTab}
                      onValueChange={setActiveTab}
                      tabs={[
                        {
                          value: 'overview',
                          label: '1. Tổng quan & CV PDF',
                          icon: <FileText className="h-3.5 w-3.5" />,
                        },
                        {
                          value: 'interview',
                          label: '2. Lịch Phỏng vấn & Hội đồng (.ics)',
                          badge: candidate.interviewScheduledAt ? '1' : '0',
                          icon: <Calendar className="h-3.5 w-3.5" />,
                        },
                        {
                          value: 'scorecard',
                          label: '3. Điểm Scorecard & Blind Lock',
                          badge: `${metrics.submittedCount}/${metrics.panelSize}`,
                          icon: <UserCheck className="h-3.5 w-3.5" />,
                        },
                        {
                          value: 'logs',
                          label: '4. Lịch sử Chuyển vòng (Logs)',
                          badge: candidate.logs.length,
                          icon: <Clock className="h-3.5 w-3.5" />,
                        },
                      ]}
                    />
                  </div>

                  {/* Body */}
                  <div className="flex-1 overflow-y-auto p-6">
                    {activeTab === 'overview' && (
                      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
                        <div className="space-y-4 lg:col-span-5">
                          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs">
                            <h4 className="font-bold text-slate-900 uppercase">
                              Thông tin Liên hệ & Hồ sơ
                            </h4>
                            <div className="mt-3 space-y-2 text-slate-700">
                              <p className="flex items-center gap-2">
                                <Mail className="h-3.5 w-3.5 text-slate-400" />
                                <span className="font-mono">{candidate.email}</span>
                              </p>
                              <p className="flex items-center gap-2">
                                <Phone className="h-3.5 w-3.5 text-slate-400" />
                                <span className="font-mono">{candidate.phone}</span>
                              </p>
                              <p>
                                <strong>Kinh nghiệm:</strong> {candidate.experience}
                              </p>
                              <p>
                                <strong>File CV Snapshot (D09):</strong>{' '}
                                <code className="rounded bg-white px-1.5 py-0.5 font-mono text-blue-700">
                                  {candidate.resumeFileName}
                                </code>
                              </p>
                            </div>
                          </div>

                          {candidate.isReturningCandidate && (
                            <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-900">
                              <p className="font-bold">
                                🔍 Kết quả Quét trùng Ứng viên (Deduplication D09)
                              </p>
                              <p className="mt-1">
                                {candidate.previousApplicationsNote ||
                                  'Ứng viên đã từng nộp hồ sơ trước đây trong hệ thống.'}
                              </p>
                            </div>
                          )}

                          <div className="rounded-xl border border-slate-200 p-4 text-xs">
                            <h4 className="font-bold text-slate-900 uppercase">
                              Thông tin Đề nghị Nhận việc (Offer)
                            </h4>
                            <p className="mt-2 text-slate-600">
                              Mức lương đề xuất:{' '}
                              <strong className="font-mono text-slate-900">
                                {candidate.offerSalary}
                              </strong>
                            </p>
                            {candidate.offerBenefits && (
                              <p className="mt-1 text-slate-600">
                                Phúc lợi: {candidate.offerBenefits}
                              </p>
                            )}
                            <p className="mt-2">
                              Trạng thái HM duyệt:{' '}
                              {candidate.offerApprovedByHm ? (
                                <span className="font-bold text-emerald-700">
                                  ✓ Đã phê duyệt bởi {candidate.offerApprovedByName || 'Hiring Manager'}
                                </span>
                              ) : (
                                <span className="font-bold text-amber-700">
                                  ⏳ Chưa phê duyệt
                                </span>
                              )}
                            </p>
                          </div>
                        </div>

                        {/* CV PDF Snapshot Viewer */}
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 lg:col-span-7">
                          <div className="mb-3 flex items-center justify-between text-xs text-slate-800">
                            <span className="font-mono font-bold">
                              📄 {candidate.resumeFileName}
                            </span>
                            {candidate.resumeDataUrl && (
                              <a
                                href={candidate.resumeDataUrl}
                                download={candidate.resumeFileName}
                                className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1 font-bold text-white hover:bg-blue-700"
                              >
                                <Download className="h-3.5 w-3.5" />
                                Tải PDF gốc
                              </a>
                            )}
                          </div>

                          {candidate.resumeDataUrl ? (
                            <iframe
                              title={candidate.resumeFileName}
                              src={candidate.resumeDataUrl}
                              className="h-[360px] w-full rounded-lg bg-white"
                            />
                          ) : (
                            <div className="rounded-xl bg-white p-6 text-xs text-slate-800 shadow-lg">
                              <div className="border-b border-slate-200 pb-3">
                                <span className="rounded bg-blue-50 px-2 py-0.5 font-mono text-[10px] font-bold text-blue-700">
                                  SNAPSHOT CV TẠI THỜI ĐIỂM ỨNG TUYỂN (D09)
                                </span>
                                <h3 className="mt-1 text-base font-extrabold text-slate-900">
                                  {candidate.fullName}
                                </h3>
                                <p className="text-slate-500">
                                  {candidate.email} · {candidate.phone}
                                </p>
                              </div>
                              <div className="mt-3 space-y-2.5 leading-relaxed">
                                <p>
                                  <strong>Tóm tắt năng lực:</strong> {candidate.experience}
                                </p>
                                <p>
                                  <strong>Vị trí ứng tuyển:</strong> {jobTitle}
                                </p>
                                <p className="text-slate-500">
                                  Hồ sơ này được lưu trữ cố định (snapshot) theo từng đơn ứng tuyển.
                                  Nếu ứng viên nộp đơn mới vào vị trí khác với CV mới, đơn cũ vẫn
                                  bảo toàn đúng bản CV tại thời điểm nộp (S3.7).
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {activeTab === 'interview' && (
                      <div className="space-y-4 text-xs">
                        {candidate.interviewScheduledAt ? (
                          <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-5">
                            <div className="flex flex-wrap items-start justify-between gap-4">
                              <div>
                                <span className="rounded-md bg-blue-600 px-2 py-0.5 font-mono text-[10px] font-bold text-white">
                                  SCHEDULED INTERVIEW
                                </span>
                                <h4 className="mt-1.5 text-base font-bold text-slate-900">
                                  Lịch phỏng vấn: {candidate.interviewScheduledAt} (
                                  {candidate.interviewDurationMinutes} phút)
                                </h4>
                                <p className="mt-1 flex items-center gap-1.5 text-slate-600">
                                  <Video className="h-4 w-4 text-blue-600" />
                                  <span>
                                    Phòng họp:{' '}
                                    <strong className="font-mono text-slate-900">
                                      {candidate.meetingLink || candidate.interviewLocation}
                                    </strong>
                                  </span>
                                </p>
                              </div>

                              <div className="flex flex-wrap items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => downloadIcsFile(candidate, jobTitle)}
                                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 font-bold text-white shadow-sm hover:bg-blue-700"
                                >
                                  <Download className="h-3.5 w-3.5" />
                                  Tải File Lịch .ics (S3.13)
                                </button>
                                {canManageInterview && (
                                  <button
                                    type="button"
                                    onClick={() => onCancelInterview(candidate.id)}
                                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-red-200 bg-white px-3.5 py-2 font-bold text-red-600 hover:bg-red-50"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    Hủy Lịch (S3.14)
                                  </button>
                                )}
                              </div>
                            </div>

                            <div className="mt-4 border-t border-blue-200/70 pt-4">
                              <p className="font-bold text-slate-800">
                                Danh sách Hội đồng Phỏng vấn ({candidate.sheets.length} người):
                              </p>
                              <div className="mt-2 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                                {candidate.sheets.map((sh) => (
                                  <div
                                    key={sh.interviewerId}
                                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3"
                                  >
                                    <div>
                                      <p className="font-bold text-slate-900">
                                        {sh.interviewerName}
                                      </p>
                                      <p className="font-mono text-[11px] text-slate-500">
                                        {sh.interviewerEmail}
                                      </p>
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
                                ))}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center">
                            <p className="font-bold text-slate-700">
                              Ứng viên này hiện chưa có lịch phỏng vấn đang hoạt động.
                            </p>
                            {canManageInterview && (
                              <button
                                type="button"
                                onClick={() => {
                                  onClose();
                                  onOpenScheduleModal(candidate.id);
                                }}
                                className="mt-3 cursor-pointer rounded-xl bg-blue-600 px-4 py-2 font-bold text-white hover:bg-blue-700"
                              >
                                + Tạo Lịch Phỏng Vấn & Chọn Hội Đồng Ngay
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {activeTab === 'scorecard' && (
                      <div className="space-y-4 text-xs">
                        {!metrics.allSubmitted ? (
                          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                            <p className="flex items-center gap-2 font-bold text-blue-950">
                              <Lock className="h-4 w-4 text-blue-600" />
                              Đang bật Chế độ Chấm Điểm Mù (Blind Evaluation Lock — S4.5, S4.7)
                            </p>
                            <p className="mt-1 text-slate-600">
                              Hội đồng mới nộp {metrics.submittedCount}/{metrics.panelSize} phiếu.
                              Điểm tổng kết và nhận xét của các giám khảo khác chỉ được mở khóa khi
                              100% thành viên hội đồng hoàn tất nộp phiếu.
                            </p>
                          </div>
                        ) : (
                          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                            <div>
                              <p className="font-bold text-slate-900">
                                Điểm tổng kết trọng số:{' '}
                                <span
                                  className={cn(
                                    'font-mono text-base font-extrabold',
                                    metrics.isDisqualified
                                      ? 'text-red-600'
                                      : (metrics.overallScore ?? 0) >= passThreshold
                                        ? 'text-emerald-600'
                                        : 'text-amber-600',
                                  )}
                                >
                                  S = {metrics.overallScore?.toFixed(2)} / 5.00
                                </span>{' '}
                                (Ngưỡng chuẩn: {passThreshold.toFixed(2)})
                              </p>
                              {candidate.calibrated && (
                                <p className="mt-1 text-emerald-700">
                                  ✓ Biên bản Calibration: "{candidate.calibrationNote}"
                                </p>
                              )}
                            </div>

                            {metrics.hasVarianceAlert && !candidate.calibrated && canManageInterview && (
                              <button
                                type="button"
                                onClick={() => {
                                  onClose();
                                  onOpenCalibrationModal(candidate.id);
                                }}
                                className="cursor-pointer rounded-xl bg-amber-500 px-3.5 py-2 font-bold text-white hover:bg-amber-600"
                              >
                                Ghi Biên Bản Họp Calibration
                              </button>
                            )}
                          </div>
                        )}

                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                          {candidate.sheets.map((sh) => {
                            const canViewSheet =
                              metrics.allSubmitted ||
                              (sh.interviewerId === viewerId && sh.submitted);
                            return (
                              <div
                                key={sh.interviewerId}
                                className="rounded-xl border border-slate-200 p-4"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-slate-900">
                                    {sh.interviewerName}
                                  </span>
                                  <span
                                    className={cn(
                                      'rounded-md px-2 py-0.5 text-[10px] font-bold',
                                      sh.submitted
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : 'bg-amber-100 text-amber-800',
                                    )}
                                  >
                                    {sh.submitted ? 'Đã nộp phiếu' : 'Chưa nộp'}
                                  </span>
                                </div>

                                {canViewSheet ? (
                                  <div className="mt-3 space-y-2">
                                    <p>
                                      Khuyến nghị:{' '}
                                      <strong className="font-mono text-blue-700">
                                        {sh.recommendation}
                                      </strong>
                                    </p>
                                    <p className="italic text-slate-600">
                                      "{sh.comment || 'Không có nhận xét chung'}"
                                    </p>
                                    <div className="space-y-1 border-t border-slate-100 pt-2">
                                      {criteria.map((c) => (
                                        <div key={c.id} className="flex justify-between text-[11px]">
                                          <span className="text-slate-600">{c.name}:</span>
                                          <span className="font-mono font-bold text-slate-900">
                                            {(sh.scores[c.id] ?? 3.0).toFixed(1)} đ
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ) : (
                                  <p className="mt-3 flex items-center gap-1.5 text-slate-400 italic">
                                    <EyeOff className="h-3.5 w-3.5" />
                                    Ẩn bởi Blind Evaluation Lock (S4.5–S4.7)
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {activeTab === 'logs' && (
                      <div className="space-y-2.5 text-xs">
                        {candidate.logs.map((log) => (
                          <div
                            key={log.id}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3"
                          >
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className="rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-0.5 font-mono text-[10px] font-extrabold text-blue-700 shadow-2xs">
                                  {log.fromStageCode ? `${log.fromStageCode} → ` : ''}
                                  {log.toStageCode}
                                </span>
                                <span className="font-bold text-slate-900">{log.actorName}</span>
                                <span className="text-[11px] text-slate-400">
                                  ({log.actorRole})
                                </span>
                              </div>
                              <p className="text-slate-600">{log.note}</p>
                            </div>
                            <span className="font-mono text-[11px] text-slate-400">
                              {log.createdAt}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
};

interface EmailOutboxDialogProps {
  open: boolean;
  onClose: () => void;
  emails: EmailOutboxItem[];
  candidates: CandidateCardData[];
  jobTitle: string;
}

export const EmailOutboxDialog: React.FC<EmailOutboxDialogProps> = ({
  open,
  onClose,
  emails,
  candidates,
  jobTitle,
}) => {
  return (
    <Dialog.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs"
              />
            </Dialog.Overlay>
            <Dialog.Content asChild>
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 12 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 8 }}
                  className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
                >
                  <div className="flex items-center justify-between border-b border-slate-200/80 bg-gradient-to-r from-slate-50 via-blue-50/30 to-white px-6 py-4">
                    <div>
                      <Dialog.Title className="text-base font-extrabold text-slate-900">
                        📬 Hộp Thư Tự Động Hệ Thống (Transactional Email Outbox — D16)
                      </Dialog.Title>
                      <Dialog.Description className="text-xs text-slate-500">
                        Toàn bộ email mời phỏng vấn (.ics), xác nhận ứng tuyển, Offer & thông báo tự
                        động đóng Job được gửi sau khi Transaction commit thành công.
                      </Dialog.Description>
                    </div>
                    <Dialog.Close asChild>
                      <button
                        type="button"
                        onClick={onClose}
                        className="cursor-pointer rounded-xl border border-slate-200 bg-white p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 shadow-2xs transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </Dialog.Close>
                  </div>

                  <div className="flex-1 space-y-3 overflow-y-auto p-6 text-xs">
                    {emails.map((em) => {
                      const targetCand = candidates.find((c) => c.id === em.candidateId);
                      return (
                        <div
                          key={em.id}
                          className="rounded-xl border border-slate-200 bg-slate-50/70 p-4"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="rounded-md bg-blue-100 px-2 py-0.5 font-mono text-[10px] font-bold text-blue-800">
                              {em.category}
                            </span>
                            <span className="font-mono text-[11px] text-slate-400">
                              {em.sentAt}
                            </span>
                          </div>
                          <h4 className="mt-1.5 text-sm font-bold text-slate-900">{em.subject}</h4>
                          <p className="mt-1 font-mono text-[11px] text-slate-500">
                            Tới: {em.toEmails.join(', ')}
                          </p>
                          <p className="mt-2 text-slate-700">{em.bodyPreview}</p>
                          {em.hasIcsAttachment && targetCand && (
                            <button
                              type="button"
                              onClick={() => downloadIcsFile(targetCand, jobTitle)}
                              className="mt-2.5 inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-blue-700"
                            >
                              <Download className="h-3.5 w-3.5" />
                              Tải Đính Kèm invite.ics
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
};

