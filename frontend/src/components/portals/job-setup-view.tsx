import {
  Briefcase,
  CheckCircle2,
  Lock,
  Plus,
  Rocket,
  Sliders,
  Trash2,
  X,
} from 'lucide-react';
import React, { useState } from 'react';
import { ModernSelect } from '@/components/animate-ui/modern-select';
import {
  AccountUser,
  CriterionDef,
  JobItem,
  RequisitionItem,
  StageCode,
  StageDef,
} from '@/lib/store';
import { cn } from '@/lib/utils';

interface JobSetupViewProps {
  currentUser: AccountUser;
  requisitions: RequisitionItem[];
  jobs: JobItem[];
  selectedJob: JobItem;
  jobApplicationsCount: number;
  onSelectJob: (jobId: number) => void;
  onCreateRequisition: (title: string, headcount: number, salaryRange: string) => void;
  onDecideRequisition: (reqId: number, decision: 'APPROVED' | 'REJECTED') => void;
  onCreateJobFromReq: (req: RequisitionItem) => void;
  onUpdateJobConfig: (
    jobId: number,
    patch: Partial<Pick<JobItem, 'headcount' | 'passScoreThreshold' | 'status'>>,
  ) => void;
  onSaveStages: (jobId: number, stages: StageDef[]) => void;
  onSaveCriteria: (jobId: number, criteria: CriterionDef[]) => void;
}

export const JobSetupView: React.FC<JobSetupViewProps> = ({
  currentUser,
  requisitions,
  jobs,
  selectedJob,
  jobApplicationsCount,
  onSelectJob,
  onCreateRequisition,
  onDecideRequisition,
  onCreateJobFromReq,
  onUpdateJobConfig,
  onSaveStages,
  onSaveCriteria,
}) => {
  const [newReqTitle, setNewReqTitle] = useState('');
  const [newReqHeadcount, setNewReqHeadcount] = useState(2);
  const [newReqSalary, setNewReqSalary] = useState('35.000.000 - 48.000.000 VNĐ');
  const [isCreateReqOpen, setIsCreateReqOpen] = useState(false);

  const [draftCriteria, setDraftCriteria] = useState<CriterionDef[]>(selectedJob.criteria);
  const [draftStages, setDraftStages] = useState<StageDef[]>(selectedJob.stages);

  React.useEffect(() => {
    setDraftCriteria(selectedJob.criteria);
    setDraftStages(selectedJob.stages);
  }, [selectedJob]);

  const totalWeight = draftCriteria.reduce((sum, c) => sum + c.weightPercent, 0);
  const isJobLocked = jobApplicationsCount > 0;
  const canEditJob = currentUser.role === 'HR' || currentUser.role === 'ADMIN';
  const canEditJobConfig = canEditJob && !isJobLocked;

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
      {/* LEFT: REQUISITIONS & CREATE JOB */}
      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs lg:col-span-5">
        <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-base font-extrabold text-slate-900">
              1. Yêu Cầu Định Biên Tuyển Dụng (Job Requisitions — S2.1–S2.5)
            </h2>
            <p className="text-xs text-slate-500">
              Hiring Manager xin định biên (`headcount`), HR duyệt (`APPROVED`) và khởi tạo chiến dịch
              Job (liên kết 1–1 theo D14).
            </p>
          </div>

          {(currentUser.role === 'HIRING_MANAGER' || currentUser.role === 'ADMIN') && (
            <button
              type="button"
              onClick={() => {
                setNewReqTitle('');
                setIsCreateReqOpen(true);
              }}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition-all active:scale-95 shrink-0"
            >
              <Plus className="h-3.5 w-3.5" />
              Tạo Định Biên
            </button>
          )}
        </div>

        <div className="space-y-3">
          {requisitions.map((r) => {
            const linkedJob = jobs.find((j) => j.requisitionId === r.id);
            return (
              <div
                key={r.id}
                className="rounded-xl border border-slate-200 p-4 transition-colors hover:bg-slate-50/70"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={cn(
                          'rounded-md px-2 py-0.5 font-mono text-[10px] font-bold',
                          r.status === 'APPROVED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : r.status === 'PENDING'
                              ? 'bg-amber-100 text-amber-800'
                              : r.status === 'CLOSED'
                                ? 'bg-slate-200 text-slate-700'
                                : 'bg-red-100 text-red-700',
                        )}
                      >
                        {r.status}
                      </span>
                      <span className="font-mono text-[10px] text-slate-400">#{r.id}</span>
                    </div>
                    <h3 className="mt-1 text-xs font-bold text-slate-900">{r.title}</h3>
                    <p className="text-[11px] text-slate-500">
                      Phòng {r.department} · Người yêu cầu: {r.requestedBy} · {r.salaryRange}
                    </p>
                  </div>

                  <span className="rounded-lg bg-blue-50 px-2.5 py-1 font-mono text-xs font-extrabold text-blue-700 tabular-nums">
                    {linkedJob ? linkedJob.filledCount : r.filledCount}/
                    {linkedJob ? linkedJob.headcount : r.headcount}
                  </span>
                </div>

                {canEditJob && r.status === 'PENDING' && (
                  <div className="mt-3 flex gap-2 border-t border-slate-100 pt-2.5">
                    <button
                      type="button"
                      onClick={() => onDecideRequisition(r.id, 'APPROVED')}
                      className="cursor-pointer rounded-lg bg-blue-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-blue-700"
                    >
                      ✓ HR Duyệt Định Biên (S2.2)
                    </button>
                    <button
                      type="button"
                      onClick={() => onDecideRequisition(r.id, 'REJECTED')}
                      className="cursor-pointer rounded-lg border border-red-200 px-3 py-1.5 text-[11px] font-bold text-red-600 hover:bg-red-50"
                    >
                      Từ chối
                    </button>
                  </div>
                )}

                {canEditJob && r.status === 'APPROVED' && !linkedJob && (
                  <div className="mt-3 border-t border-slate-100 pt-2.5">
                    <button
                      type="button"
                      onClick={() => onCreateJobFromReq(r)}
                      className="inline-flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-slate-900 py-2 text-xs font-bold text-white hover:bg-blue-600"
                    >
                      <Briefcase className="h-3.5 w-3.5" />
                      + Khởi Tạo Chiến Dịch Job Từ Yêu Cầu Này (S2.4)
                    </button>
                  </div>
                )}

                {linkedJob && (
                  <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5 text-[11px]">
                    <span className="font-semibold text-emerald-700">
                      ✓ Đã liên kết Job #{linkedJob.id} ({linkedJob.status})
                    </span>
                    <button
                      type="button"
                      onClick={() => onSelectJob(linkedJob.id)}
                      className="cursor-pointer font-bold text-blue-600 hover:underline"
                    >
                      Cấu hình Job này →
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* RIGHT: CONFIGURE SELECTED JOB (STAGES & WEIGHTED CRITERIA) */}
      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs lg:col-span-7">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-blue-600 px-2 py-0.5 font-mono text-[10px] font-bold text-white">
                JOB #{selectedJob.id} ({selectedJob.status})
              </span>
              {jobApplicationsCount > 0 && (
                <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800 ring-1 ring-amber-200">
                  <Lock className="h-3 w-3" />
                  Đã có {jobApplicationsCount} đơn (Cấu hình bảo vệ S2.7)
                </span>
              )}
            </div>
            <h2 className="mt-1 text-base font-extrabold text-slate-900">
              2. Thiết Kế Quy Trình Vòng & Trọng Số Tiêu Chí — {selectedJob.title}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <ModernSelect<number>
              value={selectedJob.id}
              onChange={(val) => onSelectJob(Number(val))}
              options={jobs.map((j) => ({
                value: j.id,
                label: `Job #${j.id}: ${j.title}`,
                badge: j.status,
                badgeColor:
                  j.status === 'PUBLISHED'
                    ? 'bg-emerald-100 text-emerald-900'
                    : j.status === 'CLOSED'
                      ? 'bg-red-100 text-red-900'
                      : 'bg-amber-100 text-amber-900',
              }))}
              triggerClassName="rounded-2xl"
            />

            {canEditJob && selectedJob.status !== 'PUBLISHED' && (
              <button
                type="button"
                onClick={() => onUpdateJobConfig(selectedJob.id, { status: 'PUBLISHED' })}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700"
              >
                <Rocket className="h-3.5 w-3.5" />
                Đăng Tuyển (Publish S2.12)
              </button>
            )}
          </div>
        </div>

        {/* Headcount & Pass Score Threshold */}
        <div className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs sm:grid-cols-2">
          <div>
            <span className="font-bold text-slate-700">
              Chỉ tiêu Định biên (`headcount` — Tự đóng khi đủ D13):
            </span>
            <div className="mt-2 flex gap-1.5">
              {[1, 2, 3, 5].map((hc) => {
                const isBelowFilled = hc < selectedJob.filledCount;
                return (
                  <button
                    key={hc}
                    type="button"
                    disabled={!canEditJob || isBelowFilled}
                    onClick={() => onUpdateJobConfig(selectedJob.id, { headcount: hc })}
                    title={
                      isBelowFilled
                        ? `Không thể giảm chỉ tiêu xuống dưới số lượng đã tuyển (${selectedJob.filledCount})`
                        : undefined
                    }
                    className={cn(
                      'rounded-lg px-3 py-1.5 font-mono font-bold transition-all',
                      isBelowFilled
                        ? 'cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400 opacity-60'
                        : 'cursor-pointer',
                      selectedJob.headcount === hc
                        ? 'bg-blue-600 text-white shadow-xs'
                        : !isBelowFilled && 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-100',
                    )}
                  >
                    {hc} người
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <span className="font-bold text-slate-700">
              Ngưỡng Điểm Chuẩn (`pass_score_threshold` ∈ [1.0, 5.0]):
            </span>
            <div className="mt-2 flex gap-1.5">
              {[3.0, 3.5, 4.0, 4.25].map((th) => (
                <button
                  key={th}
                  type="button"
                  disabled={!canEditJobConfig}
                  onClick={() => onUpdateJobConfig(selectedJob.id, { passScoreThreshold: th })}
                  title={
                    isJobLocked
                      ? `Đã có ${jobApplicationsCount} đơn — Ngưỡng điểm chuẩn bị khóa bảo vệ (S2.7)`
                      : undefined
                  }
                  className={cn(
                    'rounded-lg px-3 py-1.5 font-mono font-bold transition-all',
                    !canEditJobConfig ? 'cursor-not-allowed opacity-70' : 'cursor-pointer',
                    selectedJob.passScoreThreshold === th
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-100',
                  )}
                >
                  {th.toFixed(2)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Stage Pipeline Configurator (S2.6) */}
        <div className="rounded-xl border border-slate-200 p-4 text-xs">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900">
                Cấu Hình Các Vòng Tuyển Dụng (`job_stages` — S2.6, D07)
              </h3>
              <p className="text-[11px] text-slate-500">
                Các vòng `SCREENING` và `TEST` là tùy chọn (có thể bật/tắt); 5 vòng cốt lõi là bắt
                buộc.
              </p>
            </div>
            {canEditJob && (
              <button
                type="button"
                disabled={isJobLocked}
                onClick={() => onSaveStages(selectedJob.id, draftStages)}
                title={
                  isJobLocked
                    ? `Đã có ${jobApplicationsCount} đơn — Cấu hình vòng bị khóa bảo vệ (S2.7)`
                    : 'Lưu Cấu Hình Vòng'
                }
                className={cn(
                  'rounded-lg px-3 py-1.5 text-[11px] font-bold transition-all',
                  isJobLocked
                    ? 'cursor-not-allowed bg-slate-200 text-slate-500'
                    : 'cursor-pointer bg-slate-900 text-white hover:bg-blue-600',
                )}
              >
                {isJobLocked ? 'Vòng Bị Khóa (S2.7)' : 'Lưu Cấu Hình Vòng'}
              </button>
            )}
          </div>

          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {draftStages.map((st) => (
              <div
                key={st.code}
                className={cn(
                  'flex items-center justify-between rounded-xl border px-3 py-2',
                  st.enabled
                    ? 'border-slate-200 bg-white'
                    : 'border-dashed border-slate-200 bg-slate-50 opacity-60',
                )}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={st.enabled}
                    disabled={!canEditJobConfig}
                    onChange={(e) => {
                      const nextEnabled = e.target.checked;
                      setDraftStages((prev) =>
                        prev.map((item) =>
                          item.code === st.code ? { ...item, enabled: nextEnabled } : item,
                        ),
                      );
                    }}
                  />
                  <input
                    type="text"
                    value={st.name}
                    disabled={!canEditJobConfig}
                    onChange={(e) => {
                      const nextName = e.target.value;
                      setDraftStages((prev) =>
                        prev.map((item) =>
                          item.code === st.code ? { ...item, name: nextName } : item,
                        ),
                      );
                    }}
                    className="w-36 border-b border-transparent bg-transparent font-semibold text-slate-800 focus:border-blue-600 focus:outline-none"
                  />
                </div>
                <span
                  className={cn(
                    'rounded px-1.5 py-0.5 font-mono text-[10px] font-bold',
                    st.mandatory
                      ? 'bg-slate-100 text-slate-600'
                      : 'bg-blue-50 text-blue-700',
                  )}
                >
                  {st.mandatory ? 'Bắt buộc' : 'Tùy chọn'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Weighted Criteria Editor (S2.8 - S2.10) */}
        <div className="rounded-xl border border-slate-200 p-4 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="font-bold text-slate-900">
                Bộ Tiêu Chí Chấm Điểm Có Trọng Số (`scorecard_criteria` — S2.8–S2.10)
              </h3>
              <p className="text-[11px] text-slate-500">
                Tổng trọng số các tiêu chí bắt buộc bằng đúng 100%.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'rounded-xl px-3 py-1 font-mono text-xs font-extrabold tabular-nums',
                  totalWeight === 100
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-red-100 text-red-700',
                )}
              >
                Tổng = {totalWeight}% / 100%
              </span>
              {canEditJobConfig && (
                <button
                  type="button"
                  onClick={() =>
                    setDraftCriteria((prev) => [
                      ...prev,
                      {
                        id: Date.now(),
                        name: `Tiêu chí mới #${prev.length + 1}`,
                        weightPercent: 10,
                        isKnockout: false,
                      },
                    ])
                  }
                  className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 font-bold text-slate-700 hover:bg-slate-50"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Thêm tiêu chí
                </button>
              )}
            </div>
          </div>

          <div className="mt-3 space-y-2.5">
            {draftCriteria.map((c) => (
              <div
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50/60 p-3"
              >
                <div className="flex-1 min-w-[200px]">
                  <input
                    type="text"
                    disabled={!canEditJobConfig}
                    value={c.name}
                    onChange={(e) => {
                      const val = e.target.value;
                      setDraftCriteria((prev) =>
                        prev.map((item) => (item.id === c.id ? { ...item, name: val } : item)),
                      );
                    }}
                    className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-bold text-slate-900"
                  />
                  <label className="mt-1.5 inline-flex cursor-pointer items-center gap-1.5 text-[11px] text-slate-600">
                    <input
                      type="checkbox"
                      disabled={!canEditJobConfig}
                      checked={c.isKnockout}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setDraftCriteria((prev) =>
                          prev.map((item) =>
                            item.id === c.id ? { ...item, isKnockout: checked } : item,
                          ),
                        );
                      }}
                    />
                    Tiêu chí Điểm liệt (Knock-out Rule: TB &lt; 2.0 ⇒ loại thẳng)
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={100}
                    disabled={!canEditJobConfig}
                    value={c.weightPercent}
                    onChange={(e) => {
                      const val = Number(e.target.value) || 0;
                      setDraftCriteria((prev) =>
                        prev.map((item) =>
                          item.id === c.id ? { ...item, weightPercent: val } : item,
                        ),
                      );
                    }}
                    className="w-16 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-right font-mono font-extrabold text-blue-700 tabular-nums"
                  />
                  <span className="font-mono font-bold text-slate-500">%</span>
                  {canEditJobConfig && draftCriteria.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        setDraftCriteria((prev) => prev.filter((item) => item.id !== c.id))
                      }
                      className="cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {canEditJob && (
            <button
              type="button"
              disabled={isJobLocked}
              onClick={() => onSaveCriteria(selectedJob.id, draftCriteria)}
              title={
                isJobLocked
                  ? `Đã có ${jobApplicationsCount} đơn — Barem tiêu chí bị khóa bảo vệ (S2.7)`
                  : 'Kiểm Tra & Lưu Bộ Tiêu Chí Chấm Điểm'
              }
              className={cn(
                'mt-3 w-full rounded-xl py-2.5 font-bold shadow-md transition-all',
                isJobLocked
                  ? 'cursor-not-allowed bg-slate-200 text-slate-500 shadow-none'
                  : 'cursor-pointer bg-blue-600 text-white hover:bg-blue-700',
              )}
            >
              {isJobLocked
                ? `Barem Đã Bị Khóa Bảo Vệ (S2.7 — Đã có ${jobApplicationsCount} hồ sơ)`
                : 'Kiểm Tra & Lưu Bộ Tiêu Chí Chấm Điểm (Bắt buộc Tổng = 100% — S2.8)'}
            </button>
          )}
        </div>
      </div>

      {/* =====================================================================
          MODAL: CREATE JOB REQUISITION
         ===================================================================== */}
      {isCreateReqOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-900 px-6 py-4 text-white">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
                  <Plus className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Tạo Yêu Cầu Định Biên Mới (Job Requisition — S2.1)
                  </h3>
                  <p className="text-xs text-slate-400">
                    Phòng ban: {currentUser.department}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateReqOpen(false)}
                className="cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newReqTitle.trim()) return;
                onCreateRequisition(newReqTitle.trim(), newReqHeadcount, newReqSalary);
                setNewReqTitle('');
                setIsCreateReqOpen(false);
              }}
              className="space-y-4 p-6 text-xs"
            >
              <div>
                <label className="block text-[11px] font-bold text-slate-700">
                  Chức danh cần tuyển (Job Title) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newReqTitle}
                  onChange={(e) => setNewReqTitle(e.target.value)}
                  placeholder="Ví dụ: Senior Data Engineer..."
                  className="mt-1 w-full rounded-2xl border border-slate-200/90 bg-white px-3.5 py-2 text-xs shadow-2xs transition-all focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700">
                    Số lượng cần tuyển (Headcount) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={newReqHeadcount}
                    onChange={(e) => setNewReqHeadcount(Number(e.target.value))}
                    className="mt-1 w-full rounded-2xl border border-slate-200/90 bg-white px-3.5 py-2 font-mono text-xs font-bold shadow-2xs transition-all focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700">
                    Khung lương dự kiến
                  </label>
                  <input
                    type="text"
                    value={newReqSalary}
                    onChange={(e) => setNewReqSalary(e.target.value)}
                    placeholder="VD: 35.000.000 - 48.000.000 VNĐ"
                    className="mt-1 w-full rounded-2xl border border-slate-200/90 bg-white px-3.5 py-2 text-xs shadow-2xs transition-all focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setIsCreateReqOpen(false)}
                  className="cursor-pointer rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-all active:scale-95"
                >
                  Hủy thao tác
                </button>
                <button
                  type="submit"
                  className="cursor-pointer rounded-2xl bg-emerald-600 px-5 py-2 text-xs font-extrabold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-700 hover:shadow-lg transition-all active:scale-95"
                >
                  Gửi Phiếu Xin Định Biên
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

