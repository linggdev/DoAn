import {
  Briefcase,
  Building2,
  Calendar,
  CheckCircle2,
  Compass,
  Copy,
  Download,
  FileSearch,
  FileText,
  Search,
  Sparkles,
  Upload,
  Video,
} from 'lucide-react';
import React, { useState } from 'react';
import { AnimatedSpringDialog } from '@/components/animate-ui/guard-dialog';
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

export const CandidatePortalView: React.FC<CandidatePortalProps> = ({
  activeSection,
  currentUser,
  jobs,
  candidates,
  onApplyJob,
  onTriggerGuard,
  onSelectSection,
}) => {
  const [searchKeyword, setSearchKeyword] = useState('');
  const [applyModalJob, setApplyModalJob] = useState<JobItem | null>(null);
  const [applyFullName, setApplyFullName] = useState(currentUser.fullName);
  const [applyEmail, setApplyEmail] = useState(currentUser.email);
  const [applyPhone, setApplyPhone] = useState(currentUser.phone);
  const [applyExperience, setApplyExperience] = useState(
    '3.5 năm phát triển hệ thống phần mềm doanh nghiệp, nắm vững kiến trúc & CSDL.',
  );
  const [resumeFileName, setResumeFileName] = useState(
    `CV_${currentUser.fullName.replace(/\s+/g, '_')}.pdf`,
  );
  const [resumeDataUrl, setResumeDataUrl] = useState<string | undefined>(undefined);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Magic link tracking state
  const [tokenInput, setTokenInput] = useState(candidates[0]?.trackingToken ?? '');
  const [searchedToken, setSearchedToken] = useState(candidates[0]?.trackingToken ?? '');

  const publishedJobs = jobs.filter(
    (j) =>
      j.status === 'PUBLISHED' &&
      (j.title.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        j.department.toLowerCase().includes(searchKeyword.toLowerCase())),
  );

  const myNormalizedEmail = normalizeEmailInput(currentUser.email);
  const myNormalizedPhone = normalizePhoneInput(currentUser.phone);

  const myApplications = candidates.filter(
    (c) =>
      normalizeEmailInput(c.email) === myNormalizedEmail ||
      (myNormalizedPhone && normalizePhoneInput(c.phone) === myNormalizedPhone),
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isPdf =
      file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
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

  const renderStepTracker = (cand: CandidateCardData, job?: JobItem) => {
    const stepMap: Record<StageCode, number> = {
      APPLIED: 1,
      SCREENING: 1,
      TEST: 1,
      INTERVIEW: 2,
      OFFER: 3,
      HIRED: 4,
      REJECTED: 4,
    };
    const currentStep = stepMap[cand.stageCode];
    const steps = [
      {
        idx: 1,
        label: 'Đang xem xét hồ sơ',
        desc: 'Hồ sơ đã được hệ thống ghi nhận & đang sàng lọc chuyên môn.',
      },
      {
        idx: 2,
        label: 'Mời phỏng vấn',
        desc: 'Bạn có lịch phỏng vấn với hội đồng chuyên môn.',
      },
      {
        idx: 3,
        label: 'Đề nghị nhận việc',
        desc: 'Bộ phận Nhân sự đang hoàn tất thư mời nhận việc (Offer).',
      },
      {
        idx: 4,
        label: cand.stageCode === 'REJECTED' ? 'Đã có kết quả' : 'Trúng tuyển',
        desc:
          cand.stageCode === 'REJECTED'
            ? 'Cảm ơn bạn đã quan tâm. Hồ sơ của bạn được lưu cho các cơ hội tiếp theo.'
            : 'Chúc mừng bạn đã chính thức trúng tuyển!',
      },
    ];

    return (
      <div
        key={cand.id}
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs"
      >
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-sky-50 px-2.5 py-0.5 font-mono text-[11px] font-bold text-sky-700">
                Mã tra cứu: {cand.trackingToken}
              </span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(cand.trackingToken);
                }}
                className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-600 hover:bg-slate-50"
              >
                <Copy className="h-3 w-3" />
                Sao chép mã
              </button>
              {cand.isReturningCandidate && (
                <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800 ring-1 ring-amber-200">
                  Hồ sơ liên kết lịch sử (D09)
                </span>
              )}
            </div>
            <h3 className="mt-1.5 text-base font-extrabold text-slate-900">
              {job?.title ?? 'Senior Backend Engineer'}
            </h3>
            <p className="text-xs text-slate-500">
              Ứng viên: <strong className="text-slate-800">{cand.fullName}</strong> · Nộp lúc:{' '}
              {cand.appliedAt} · File CV: <code>{cand.resumeFileName}</code>
            </p>
          </div>

          <span
            className={cn(
              'rounded-full px-3.5 py-1 text-xs font-bold',
              cand.stageCode === 'HIRED'
                ? 'bg-emerald-600 text-white'
                : cand.stageCode === 'REJECTED'
                  ? 'bg-slate-700 text-white'
                  : 'bg-sky-600 text-white',
            )}
          >
            {steps[currentStep - 1].label}
          </span>
        </div>

        {/* 4-Step Visual Progress Bar */}
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-4">
          {steps.map((st) => {
            const done = st.idx <= currentStep;
            const isCurrent = st.idx === currentStep;
            return (
              <div
                key={st.idx}
                className={cn(
                  'rounded-xl border p-3.5 transition-all',
                  isCurrent
                    ? 'border-sky-600 bg-sky-50/90 ring-2 ring-sky-500/20'
                    : done
                      ? 'border-emerald-300 bg-emerald-50/50 text-emerald-950'
                      : 'border-slate-200 bg-slate-50/50 text-slate-400',
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] font-bold">BƯỚC 0{st.idx}</span>
                  {done && <CheckCircle2 className="h-4 w-4 text-sky-600" />}
                </div>
                <p className="mt-1 text-xs font-extrabold text-slate-900">{st.label}</p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">{st.desc}</p>
              </div>
            );
          })}
        </div>

        {/* Interview Schedule Banner */}
        {cand.stageCode === 'INTERVIEW' && cand.interviewScheduledAt && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50/80 p-4 text-xs text-blue-950">
            <div className="space-y-1">
              <p className="flex items-center gap-1.5 font-bold">
                <Calendar className="h-4 w-4 text-blue-600" />
                Lịch hẹn phỏng vấn của bạn: {cand.interviewScheduledAt} (
                {cand.interviewDurationMinutes} phút)
              </p>
              <p className="flex items-center gap-1.5 text-slate-700">
                <Video className="h-4 w-4 text-blue-600" />
                Link tham gia:{' '}
                <span className="font-mono font-bold underline">
                  {cand.meetingLink || cand.interviewLocation}
                </span>
              </p>
            </div>
            <button
              type="button"
              onClick={() => downloadIcsFile(cand, job?.title ?? 'Phỏng vấn ATS')}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 font-bold text-white shadow-sm hover:bg-blue-700"
            >
              <Download className="h-3.5 w-3.5" />
              Tải Lịch .ics Vào Máy
            </button>
          </div>
        )}

        {/* Offer Banner */}
        {(cand.stageCode === 'OFFER' || cand.stageCode === 'HIRED') && (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/80 p-4 text-xs text-emerald-950">
            <p className="font-bold">
              🎉 Thư Đề Nghị Nhận Việc (Offer): Mức lương đề xuất{' '}
              <span className="font-mono text-sm font-extrabold">{cand.offerSalary}</span>
            </p>
            {cand.offerBenefits && <p className="mt-1">Phúc lợi: {cand.offerBenefits}</p>}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {/* SCREEN 1: KHÁM PHÁ VIỆC LÀM & NỘP CV PDF */}
      {activeSection === 'cand-jobs' && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-sky-200 bg-gradient-to-r from-sky-950 via-cyan-900 to-slate-900 p-6 text-white shadow-lg">
            <div>
              <span className="rounded-md bg-sky-400/20 px-2.5 py-1 font-mono text-[10px] font-bold text-sky-300 uppercase">
                CANDIDATE CAREER EXPLORER (S2.13, S3.1–S3.7)
              </span>
              <h2 className="mt-2 text-xl font-extrabold">
                Khám Phá Cơ Hội Nghề Nghiệp Tại Doanh Nghiệp
              </h2>
              <p className="mt-1 max-w-2xl text-xs text-sky-100/90">
                Chỉ hiển thị các vị trí đang mở tuyển (`PUBLISHED`). Nộp CV định dạng PDF (≤ 5MB),
                tự động nhận diện hồ sơ ứng viên cũ (`D09`) và cấp mã tra cứu Magic Link.
              </p>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="absolute top-2.5 left-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="Tìm theo vị trí hoặc phòng ban..."
                className="w-full rounded-xl border border-slate-700 bg-slate-900/90 py-2 pr-3 pl-9 text-xs text-white placeholder:text-slate-400 focus:border-sky-400 focus:outline-none"
              />
            </div>
          </div>

          {successBanner && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-xs font-semibold text-emerald-900">
              <span>✓ {successBanner}</span>
              <button
                type="button"
                onClick={() => onSelectSection('cand-applications')}
                className="cursor-pointer rounded-xl bg-emerald-600 px-3.5 py-1.5 font-bold text-white hover:bg-emerald-700"
              >
                Xem Đơn Ứng Tuyển Của Tôi →
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {publishedJobs.map((job) => {
              const alreadyApplied = myApplications.some((c) => c.jobId === job.id);
              return (
                <div
                  key={job.id}
                  className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-xs transition-all hover:shadow-md"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-sky-50 px-2.5 py-1 font-mono text-[11px] font-bold text-sky-700">
                        <Building2 className="h-3.5 w-3.5" />
                        Phòng {job.department}
                      </span>
                      <span className="rounded-lg bg-emerald-50 px-2.5 py-1 font-mono text-[11px] font-bold text-emerald-700">
                        Còn nhận: {job.headcount - job.filledCount}/{job.headcount} vị trí
                      </span>
                    </div>

                    <h3 className="mt-3 text-lg font-extrabold text-slate-900">{job.title}</h3>
                    <p className="mt-1 font-mono text-xs font-bold text-blue-600">
                      Mức lương: {job.salaryRange}
                    </p>

                    <div className="mt-3 space-y-2 rounded-xl bg-slate-50 p-3.5 text-xs text-slate-600">
                      <p>
                        <strong className="text-slate-900">Mô tả công việc:</strong>{' '}
                        {job.description}
                      </p>
                      <p className="whitespace-pre-line">
                        <strong className="text-slate-900">Yêu cầu:</strong>
                        {'\n'}
                        {job.requirements}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                    {alreadyApplied ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                        <CheckCircle2 className="h-4 w-4" />
                        Bạn đã ứng tuyển vị trí này
                      </span>
                    ) : (
                      <span className="text-xs text-slate-500">
                        Đính kèm CV định dạng .PDF (≤ 5MB)
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        if (alreadyApplied) {
                          onTriggerGuard(
                            'APPLY_DUPLICATE_JOB',
                            `Bạn đã nộp hồ sơ cho vị trí "${job.title}" trước đó (S3.6 — HTTP 409). Không được nộp trùng nhiều đơn vào cùng 1 Job!`,
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
                        'cursor-pointer rounded-xl px-4 py-2.5 text-xs font-bold text-white shadow-md transition-all',
                        alreadyApplied
                          ? 'bg-slate-600 hover:bg-slate-700'
                          : 'bg-sky-600 shadow-sky-600/20 hover:bg-sky-700',
                      )}
                    >
                      {alreadyApplied ? 'Thử Nộp Lại (Test Chặn S3.6)' : 'Ứng Tuyển Ngay (CV PDF)'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SCREEN 2: ĐƠN ỨNG TUYỂN CỦA TÔI */}
      {activeSection === 'cand-applications' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <h2 className="text-base font-extrabold text-slate-900">
              Đơn Ứng Tuyển Của Tôi ({myApplications.length} hồ sơ)
            </h2>
            <p className="text-xs text-slate-500">
              Tự động đồng bộ các đơn ứng tuyển khớp với email{' '}
              <code className="font-mono font-bold text-slate-800">{currentUser.email}</code> hoặc
              SĐT <code className="font-mono font-bold text-slate-800">{currentUser.phone}</code>.
            </p>
          </div>

          {myApplications.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-xs text-slate-500">
              Bạn chưa có đơn ứng tuyển nào. Hãy chuyển sang mục{' '}
              <button
                type="button"
                onClick={() => onSelectSection('cand-jobs')}
                className="font-bold text-sky-600 underline"
              >
                Khám phá Việc làm
              </button>{' '}
              để nộp CV!
            </div>
          ) : (
            <div className="space-y-4">
              {myApplications.map((cand) =>
                renderStepTracker(
                  cand,
                  jobs.find((j) => j.id === cand.jobId),
                ),
              )}
            </div>
          )}
        </div>
      )}

      {/* SCREEN 3: TRA CỨU NHANH BẰNG MÃ MAGIC LINK (/track/:token) */}
      {activeSection === 'cand-track' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <h2 className="text-base font-extrabold text-slate-900">
              Tra Cứu Tiến Độ Công Khai Bằng Mã Magic Link (`/api/public/track/:token` — D15)
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Theo quyết định kiến trúc <strong>D15</strong>, trang tra cứu công khai hiển thị tiến
              trình 4 bước và lịch phỏng vấn nhưng <strong>tuyệt đối không lộ điểm số nội bộ</strong>{' '}
              hay nhận xét của giám khảo.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setSearchedToken(tokenInput.trim());
              }}
              className="mt-4 flex flex-wrap gap-2.5 text-xs"
            >
              <input
                type="text"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="Nhập mã tracking_token (VD: 8f91a2c0-1122-4b33-9900-atsdemo00101)..."
                className="flex-1 rounded-xl border border-slate-200 px-3.5 py-2.5 font-mono"
              />
              <button
                type="submit"
                className="cursor-pointer rounded-xl bg-sky-600 px-5 py-2.5 font-bold text-white shadow-sm hover:bg-sky-700"
              >
                <FileSearch className="mr-1.5 inline h-4 w-4" />
                Tra Cứu Hồ Sơ
              </button>
            </form>

            <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px]">
              <span className="font-semibold text-slate-400">Mã mẫu có sẵn:</span>
              {candidates.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setTokenInput(c.trackingToken);
                    setSearchedToken(c.trackingToken);
                  }}
                  className={cn(
                    'cursor-pointer rounded-lg px-2.5 py-1 font-mono font-semibold',
                    searchedToken === c.trackingToken
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200',
                  )}
                >
                  {c.fullName} ({c.stageCode})
                </button>
              ))}
            </div>
          </div>

          {(() => {
            const found = candidates.find((c) => c.trackingToken === searchedToken);
            if (!found) {
              return (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-xs font-bold text-red-700">
                  Không tìm thấy hồ sơ ứng tuyển nào khớp với mã tra cứu "{searchedToken}" (HTTP 404
                  TRACK_NOT_FOUND).
                </div>
              );
            }
            return renderStepTracker(
              found,
              jobs.find((j) => j.id === found.jobId),
            );
          })()}
        </div>
      )}

      {/* MODAL NỘP CV PDF */}
      <AnimatedSpringDialog
        open={Boolean(applyModalJob)}
        onOpenChange={(open) => !open && setApplyModalJob(null)}
        title={`Nộp Hồ Sơ Ứng Tuyển — ${applyModalJob?.title ?? ''}`}
        subtitle="Hệ thống tự động chuẩn hóa Email/SĐT (D09), kiểm tra file PDF ≤ 5MB (S3.2) và lưu Snapshot CV (S3.7)"
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
                `Đã nộp hồ sơ vào vị trí "${applyModalJob.title}"! Mã tra cứu Magic Link của bạn: ${token}`,
              );
              setTokenInput(token);
              setSearchedToken(token);
              setApplyModalJob(null);
            }
          }}
          className="space-y-3.5 text-xs"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block font-bold text-slate-700">Họ và tên ứng viên</label>
              <input
                type="text"
                required
                value={applyFullName}
                onChange={(e) => setApplyFullName(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
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
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700">Email liên hệ</label>
            <input
              type="email"
              required
              value={applyEmail}
              onChange={(e) => setApplyEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 font-mono"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700">Tóm tắt kinh nghiệm nổi bật</label>
            <textarea
              rows={2}
              required
              value={applyExperience}
              onChange={(e) => setApplyExperience(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 p-2.5"
            />
          </div>

          <div className="rounded-xl border border-dashed border-sky-300 bg-sky-50/50 p-3.5">
            <label className="flex cursor-pointer items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Upload className="h-4 w-4 text-sky-600" />
                <div>
                  <p className="font-bold text-slate-800">
                    Chọn file CV định dạng .PDF (Tối đa 5MB — S3.2)
                  </p>
                  <p className="font-mono text-[11px] text-sky-700">
                    Đang chọn: {resumeFileName}
                  </p>
                </div>
              </div>
              <input
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileChange}
                className="hidden"
              />
              <span className="rounded-lg bg-white px-3 py-1.5 font-semibold text-sky-700 shadow-2xs ring-1 ring-sky-200">
                Chọn file PDF...
              </span>
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setApplyModalJob(null)}
              className="cursor-pointer rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-600"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="cursor-pointer rounded-xl bg-sky-600 px-5 py-2 font-bold text-white shadow-md hover:bg-sky-700"
            >
              Xác Nhận Nộp Hồ Sơ
            </button>
          </div>
        </form>
      </AnimatedSpringDialog>
    </div>
  );
};

