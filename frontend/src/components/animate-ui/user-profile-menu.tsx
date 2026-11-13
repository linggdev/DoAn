import {
  AlertCircle,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  LogOut,
  Mail,
  Phone,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  User,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import React, { useEffect, useRef, useState } from 'react';
import { ROLE_META, UserRole } from '@/components/animate-ui/animated-sidebar';
import { AccountUser } from '@/lib/store';
import { cn } from '@/lib/utils';

interface UserProfileMenuProps {
  currentUser: AccountUser;
  onLogout: () => void;
  onUpdateUser: (updatedUser: AccountUser) => void;
  onChangePassword: (
    oldPass: string,
    newPass: string,
  ) => { success: boolean; message: string };
}

// RBAC Capabilities matrix for each role
const ROLE_CAPABILITIES: Record<
  UserRole,
  {
    title: string;
    description: string;
    permissions: { name: string; desc: string; allowed: boolean }[];
  }
> = {
  ADMIN: {
    title: 'Quản trị viên Hệ thống (System Admin)',
    description:
      'Toàn quyền quản trị cơ sở hạ tầng, tài khoản, cấu hình đồng bộ CSDL SQL Server và giám sát bảo mật hệ thống.',
    permissions: [
      {
        name: 'Quản trị CSDL & SQL Server Sync',
        desc: 'Kết nối đồng bộ 13 bảng dữ liệu với SSMS localhost:1433',
        allowed: true,
      },
      {
        name: 'Quản lý tài khoản & Khóa/Mở RBAC',
        desc: 'Tạo mới, chỉnh sửa, kích hoạt hoặc tạm khóa tài khoản người dùng',
        allowed: true,
      },
      {
        name: 'Giám sát Audit Trail Log',
        desc: 'Truy vết thời gian thực mọi thao tác FSM, chấm điểm và chuyển trạng thái',
        allowed: true,
      },
      {
        name: 'Khôi phục cấu hình xuất xưởng',
        desc: 'Xóa dữ liệu phiên tạm và nạp lại seed data chuẩn enterprise',
        allowed: true,
      },
      {
        name: 'Phê duyệt định biên tuyển dụng',
        desc: 'Giám sát chỉ tiêu tuyển dụng và trạng thái các phòng ban',
        allowed: true,
      },
    ],
  },
  HR: {
    title: 'Chuyên viên Tuyển dụng (Recruiter / Talent Acquisition)',
    description:
      'Chịu trách nhiệm vận hành pipeline tuyển dụng, điều phối phỏng vấn, liên lạc ứng viên và phát hành Offer.',
    permissions: [
      {
        name: 'Vận hành Kanban 6 vòng tuyển dụng',
        desc: 'Kéo thả ứng viên qua Finite State Machine (APPLIED -> HIRED)',
        allowed: true,
      },
      {
        name: 'Xếp lịch phỏng vấn & Hộp thư .ics',
        desc: 'Tạo lịch Google Meet, chỉ định hội đồng và xuất file .ics tự động',
        allowed: true,
      },
      {
        name: 'Kiểm soát Guard & Knock-out Rule',
        desc: 'Xử lý các điều kiện chặn khi ứng viên vi phạm tiêu chuẩn tuyển dụng',
        allowed: true,
      },
      {
        name: 'Phát hành Offer & Chốt HIRED',
        desc: 'Tạo thư mời nhận việc và tự động cập nhật định biên vị trí',
        allowed: true,
      },
      {
        name: 'Xuất báo cáo ứng viên (CSV/Excel)',
        desc: 'Trích xuất bảng xếp hạng điểm và dữ liệu phỏng vấn chi tiết',
        allowed: true,
      },
    ],
  },
  HIRING_MANAGER: {
    title: 'Trưởng bộ phận Tuyển dụng (Hiring Manager)',
    description:
      'Chủ trì định biên nhân sự phòng ban, thiết lập bộ tiêu chí đánh giá và quyết định lựa chọn nhân sự.',
    permissions: [
      {
        name: 'Khởi tạo Yêu cầu tuyển dụng (Requisition)',
        desc: 'Kê khai định biên, ngân sách và mô tả công việc phòng ban',
        allowed: true,
      },
      {
        name: 'Cấu hình Tiêu chí & Trọng số phỏng vấn',
        desc: 'Thiết lập tiêu chí đánh giá và gắn cờ tiêu chí bắt buộc (Knock-out)',
        allowed: true,
      },
      {
        name: 'Duyệt đề xuất Offer tuyển dụng',
        desc: 'Xem xét mức lương và điều kiện đãi ngộ trước khi gửi ứng viên',
        allowed: true,
      },
      {
        name: 'Theo dõi tiến độ tuyển dụng phòng ban',
        desc: 'Báo cáo trực quan tỷ lệ lấp đầy định biên theo thời gian thực',
        allowed: true,
      },
    ],
  },
  INTERVIEWER: {
    title: 'Giám khảo Phỏng vấn (Interviewer / Assessment Panel)',
    description:
      'Tham gia hội đồng phỏng vấn, thực hiện chấm điểm độc lập và cung cấp nhận xét chuyên môn khách quan.',
    permissions: [
      {
        name: 'Phòng chấm điểm độc lập (Evaluation Studio)',
        desc: 'Chấm điểm từng tiêu chí theo thang 1-5 sao và lưu tự động',
        allowed: true,
      },
      {
        name: 'Đánh giá Tiêu chí Liệt (Knock-out)',
        desc: 'Phát hiện ứng viên không đạt tiêu chuẩn bắt buộc của vị trí',
        allowed: true,
      },
      {
        name: 'Đề xuất khuyến nghị (HIRE / HOLD / REJECT)',
        desc: 'Gửi kết luận phỏng vấn kèm phân tích điểm mạnh và điểm cần cải thiện',
        allowed: true,
      },
      {
        name: 'Tham gia phiên Hiệu chuẩn (Calibration)',
        desc: 'Thảo luận làm rõ khi phát hiện độ lệch điểm đánh giá > 1.5 giữa giám khảo',
        allowed: true,
      },
    ],
  },
  CANDIDATE: {
    title: 'Ứng viên Tuyển dụng (Job Candidate)',
    description:
      'Theo dõi tiến trình ứng tuyển trực tuyến minh bạch, nộp hồ sơ mới và phản hồi thư mời làm việc.',
    permissions: [
      {
        name: 'Tra cứu hồ sơ tuyển dụng trực tuyến',
        desc: 'Đăng nhập xem trạng thái hồ sơ theo thời gian thực',
        allowed: true,
      },
      {
        name: 'Nộp đơn ứng tuyển các vị trí mở',
        desc: 'Điền form ứng tuyển trực tiếp vào hệ thống ATS doanh nghiệp',
        allowed: true,
      },
      {
        name: 'Xem chi tiết lịch phỏng vấn & link Meet',
        desc: 'Nhận thông báo thời gian, hội đồng phỏng vấn và link phòng họp',
        allowed: true,
      },
      {
        name: 'Phản hồi Thư mời nhận việc (Offer)',
        desc: 'Xác nhận chấp nhận hoặc từ chối Offer online',
        allowed: true,
      },
    ],
  },
};

export const UserProfileMenu: React.FC<UserProfileMenuProps> = ({
  currentUser,
  onLogout,
  onUpdateUser,
  onChangePassword,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Modals state
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [rbacModalOpen, setRbacModalOpen] = useState(false);

  // Profile Edit State
  const [editName, setEditName] = useState(currentUser.fullName);
  const [editPhone, setEditPhone] = useState(currentUser.phone);
  const [profileSaveSuccess, setProfileSaveSuccess] = useState(false);

  // Password Change State
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [passError, setPassError] = useState<string | null>(null);
  const [passSuccess, setPassSuccess] = useState<string | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);

  const meta = ROLE_META[currentUser.role];
  const rbacInfo = ROLE_CAPABILITIES[currentUser.role];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen]);

  // Sync edit form with currentUser changes
  useEffect(() => {
    setEditName(currentUser.fullName);
    setEditPhone(currentUser.phone);
  }, [currentUser]);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) return;
    onUpdateUser({
      ...currentUser,
      fullName: editName.trim(),
      phone: editPhone.trim(),
    });
    setProfileSaveSuccess(true);
    setTimeout(() => {
      setProfileSaveSuccess(false);
      setProfileModalOpen(false);
    }, 1200);
  };

  const handleChangePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPassError(null);
    setPassSuccess(null);

    if (!currentPass) {
      setPassError('Vui lòng nhập mật khẩu hiện tại.');
      return;
    }
    if (newPass.length < 6) {
      setPassError('Mật khẩu mới phải có độ dài tối thiểu 6 ký tự.');
      return;
    }
    if (newPass !== confirmPass) {
      setPassError('Mật khẩu xác nhận không khớp với mật khẩu mới.');
      return;
    }

    const res = onChangePassword(currentPass, newPass);
    if (!res.success) {
      setPassError(res.message);
    } else {
      setPassSuccess('Đổi mật khẩu thành công! Thông tin đã được cập nhật.');
      setCurrentPass('');
      setNewPass('');
      setConfirmPass('');
      setTimeout(() => {
        setPassSuccess(null);
        setPasswordModalOpen(false);
      }, 1500);
    }
  };

  return (
    <div className="relative z-50 inline-flex items-center" ref={menuRef}>
      {/* 1. USER PROFILE TRIGGER BUTTON */}
      <button
        type="button"
        onClick={() => setDropdownOpen((prev) => !prev)}
        aria-expanded={dropdownOpen}
        aria-haspopup="true"
        className={cn(
          'group flex cursor-pointer items-center gap-2.5 rounded-2xl border border-slate-200/90 bg-white px-2.5 py-1.5 shadow-2xs transition-all duration-150 select-none hover:border-slate-300 hover:bg-slate-50/80 hover:shadow-xs',
          dropdownOpen && 'border-blue-400 bg-blue-50/40 ring-2 ring-blue-500/20',
        )}
      >
        {/* Avatar with Status indicator */}
        <div className="relative">
          <div
            className={cn(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl font-mono text-xs font-black text-white shadow-xs transition-transform duration-150 group-hover:scale-105',
              meta.iconBgClass,
            )}
          >
            {currentUser.fullName.slice(0, 2).toUpperCase()}
          </div>
          <span
            className="absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500 ring-1 ring-emerald-400/50"
            title="Đang hoạt động (Session Active)"
          />
        </div>

        {/* User Info Details */}
        <div className="hidden text-left sm:block">
          <div className="flex items-center gap-1.5">
            <span className="max-w-[130px] truncate text-xs font-bold text-slate-900">
              {currentUser.fullName}
            </span>
            <span
              className={cn(
                'rounded-md px-1.5 py-0.2 font-mono text-[9px] font-bold tracking-wider uppercase',
                meta.badgeTextClass,
                'bg-slate-100',
              )}
            >
              {currentUser.role}
            </span>
          </div>
          <p className="max-w-[150px] truncate font-mono text-[10px] text-slate-500">
            {currentUser.email}
          </p>
        </div>

        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 text-slate-400 transition-transform duration-200 group-hover:text-slate-600',
            dropdownOpen && 'rotate-180 text-blue-600',
          )}
        />
      </button>

      {/* 2. MODERN DROPDOWN POPOVER (HIGHEST PRIORITY Z-INDEX) */}
      <AnimatePresence>
        {dropdownOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.96 }}
            transition={{ duration: 0.14, ease: 'easeOut' }}
            className="absolute top-full right-0 z-[9999] mt-2 w-80 origin-top-right rounded-2xl border border-slate-200/90 bg-white p-2.5 shadow-2xl shadow-slate-900/25 ring-1 ring-slate-900/5"
          >
            {/* Header: User Overview Card */}
            <div className="rounded-xl border border-slate-200/80 bg-slate-50 p-3">
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-mono text-sm font-black text-white shadow-sm',
                    meta.iconBgClass,
                  )}
                >
                  {currentUser.fullName.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h4 className="truncate text-xs font-extrabold text-slate-900">
                      {currentUser.fullName}
                    </h4>
                  </div>
                  <p className="truncate font-mono text-[11px] text-slate-500">
                    {currentUser.email}
                  </p>
                  <div className="mt-1 flex items-center gap-1.5">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-mono text-[9px] font-bold text-white',
                        meta.iconBgClass,
                      )}
                    >
                      {currentUser.role}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      JWT Active
                    </span>
                  </div>
                </div>
              </div>

              {currentUser.department && (
                <div className="mt-2.5 flex items-center gap-1.5 border-t border-slate-200/60 pt-2 text-[11px] text-slate-600">
                  <Building2 className="h-3 w-3 text-slate-400" />
                  <span className="truncate">{currentUser.department}</span>
                </div>
              )}
            </div>

            {/* Quick Actions List */}
            <div className="mt-2 space-y-0.5">
              {/* Profile Details Action */}
              <button
                type="button"
                onClick={() => {
                  setDropdownOpen(false);
                  setProfileModalOpen(true);
                }}
                className="flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900"
              >
                <User className="h-4 w-4 text-blue-600" />
                <span className="flex-1 font-semibold">Xem hồ sơ cá nhân</span>
                <span className="font-mono text-[10px] text-slate-400">Chi tiết</span>
              </button>

              {/* Change Password Action */}
              <button
                type="button"
                onClick={() => {
                  setDropdownOpen(false);
                  setPasswordModalOpen(true);
                }}
                className="flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900"
              >
                <KeyRound className="h-4 w-4 text-amber-600" />
                <span className="flex-1 font-semibold">Đổi mật khẩu</span>
                <span className="font-mono text-[10px] text-slate-400">Bảo mật</span>
              </button>

              {/* RBAC Privileges Matrix */}
              <button
                type="button"
                onClick={() => {
                  setDropdownOpen(false);
                  setRbacModalOpen(true);
                }}
                className="flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900"
              >
                <ShieldCheck className="h-4 w-4 text-indigo-600" />
                <span className="flex-1 font-semibold">Quyền hạn vai trò (RBAC)</span>
                <span className="rounded bg-indigo-50 px-1 font-mono text-[9px] font-bold text-indigo-700">
                  {currentUser.role}
                </span>
              </button>

              {/* Copy Email */}
              <button
                type="button"
                onClick={() => handleCopy(currentUser.email, 'email')}
                className="flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900"
              >
                {copiedField === 'email' ? (
                  <Check className="h-4 w-4 text-emerald-600" />
                ) : (
                  <Copy className="h-4 w-4 text-slate-400" />
                )}
                <span className="flex-1 font-semibold">
                  {copiedField === 'email' ? 'Đã sao chép email!' : 'Sao chép Email'}
                </span>
                <span className="font-mono text-[10px] text-slate-400 truncate max-w-[100px]">
                  {currentUser.email}
                </span>
              </button>
            </div>

            {/* Separator */}
            <div className="my-1.5 border-t border-slate-100" />

            {/* Logout Action */}
            <button
              type="button"
              onClick={() => {
                setDropdownOpen(false);
                onLogout();
              }}
              className="flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-xs font-bold text-red-600 transition-colors hover:bg-red-50 hover:text-red-700"
            >
              <LogOut className="h-4 w-4 text-red-600" />
              <span className="flex-1">Đăng xuất tài khoản</span>
              <span className="text-[10px] font-normal text-red-400">Kết thúc phiên</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* =====================================================================
          MODAL 1: USER PROFILE DETAILS & EDIT
         ===================================================================== */}
      <AnimatePresence>
        {profileModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setProfileModalOpen(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl z-10"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      'flex h-9 w-9 items-center justify-center rounded-xl text-white shadow-xs',
                      meta.iconBgClass,
                    )}
                  >
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">
                      Hồ Sơ Tài Khoản Cá Nhân
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Thông tin tài khoản đăng nhập trong hệ thống ATS
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setProfileModalOpen(false)}
                  className="cursor-pointer rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {profileSaveSuccess && (
                <div className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-50 p-2.5 text-xs font-bold text-emerald-700">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  Cập nhật thông tin tài khoản thành công!
                </div>
              )}

              <form onSubmit={handleSaveProfile} className="mt-4 space-y-3.5">
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700">
                    Họ và tên hiển thị
                  </label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-900 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                {/* Email (Readonly) */}
                <div>
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-700">
                      Địa chỉ Email (Định danh đăng nhập)
                    </label>
                    <span className="font-mono text-[10px] text-slate-400">Cố định</span>
                  </div>
                  <div className="relative mt-1">
                    <Mail className="absolute top-2.5 left-3 h-4 w-4 text-slate-400" />
                    <input
                      type="email"
                      readOnly
                      value={currentUser.email}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pr-3 pl-9 font-mono text-xs font-medium text-slate-600 select-all"
                    />
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-xs font-bold text-slate-700">
                    Số điện thoại liên hệ
                  </label>
                  <div className="relative mt-1">
                    <Phone className="absolute top-2.5 left-3 h-4 w-4 text-slate-400" />
                    <input
                      type="tel"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      placeholder="0909123456"
                      className="w-full rounded-xl border border-slate-200 py-2 pr-3 pl-9 text-xs font-semibold text-slate-900 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Role & Department (Info) */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-2.5">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase">
                      Vai trò (RBAC Role)
                    </span>
                    <span
                      className={cn(
                        'mt-1 inline-block rounded-md px-1.5 py-0.5 font-mono text-[10px] font-bold text-white',
                        meta.iconBgClass,
                      )}
                    >
                      {currentUser.role}
                    </span>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-2.5">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase">
                      Phòng ban
                    </span>
                    <span className="mt-1 block truncate text-xs font-bold text-slate-800">
                      {currentUser.department || '—'}
                    </span>
                  </div>
                </div>

                {/* User ID & System Status */}
                <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2 text-[11px] text-slate-500">
                  <span>Mã tài khoản ID: #{currentUser.id}</span>
                  <span className="font-bold text-emerald-600">Trạng thái: ACTIVE</span>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setProfileModalOpen(false)}
                    className="cursor-pointer rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Đóng
                  </button>
                  <button
                    type="submit"
                    className="cursor-pointer rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-blue-600/20 hover:bg-blue-700"
                  >
                    Lưu thay đổi
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* =====================================================================
          MODAL 2: CHANGE PASSWORD
         ===================================================================== */}
      <AnimatePresence>
        {passwordModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPasswordModalOpen(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl z-10"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500 text-white shadow-xs">
                    <KeyRound className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">
                      Đổi Mật Khẩu Tài Khoản
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Cập nhật mật khẩu để bảo vệ an toàn cho phiên đăng nhập
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPasswordModalOpen(false)}
                  className="cursor-pointer rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {passError && (
                <div className="mt-3 flex items-center gap-2 rounded-xl bg-red-50 p-2.5 text-xs font-bold text-red-700">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                  {passError}
                </div>
              )}

              {passSuccess && (
                <div className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-50 p-2.5 text-xs font-bold text-emerald-700">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  {passSuccess}
                </div>
              )}

              <form onSubmit={handleChangePasswordSubmit} className="mt-4 space-y-3.5">
                {/* Current Password */}
                <div>
                  <label className="block text-xs font-bold text-slate-700">
                    Mật khẩu hiện tại
                  </label>
                  <div className="relative mt-1">
                    <input
                      type={showCurrentPass ? 'text' : 'password'}
                      required
                      value={currentPass}
                      onChange={(e) => setCurrentPass(e.target.value)}
                      placeholder="Nhập mật khẩu hiện tại..."
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 pr-9 text-xs focus:border-amber-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPass(!showCurrentPass)}
                      className="absolute top-2.5 right-3 text-slate-400 hover:text-slate-600"
                    >
                      {showCurrentPass ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div>
                  <label className="block text-xs font-bold text-slate-700">
                    Mật khẩu mới (≥ 6 ký tự)
                  </label>
                  <div className="relative mt-1">
                    <input
                      type={showNewPass ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={newPass}
                      onChange={(e) => setNewPass(e.target.value)}
                      placeholder="Nhập mật khẩu mới..."
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 pr-9 text-xs focus:border-amber-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPass(!showNewPass)}
                      className="absolute top-2.5 right-3 text-slate-400 hover:text-slate-600"
                    >
                      {showNewPass ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Confirm New Password */}
                <div>
                  <label className="block text-xs font-bold text-slate-700">
                    Xác nhận mật khẩu mới
                  </label>
                  <div className="mt-1">
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={confirmPass}
                      onChange={(e) => setConfirmPass(e.target.value)}
                      placeholder="Nhập lại mật khẩu mới..."
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setPasswordModalOpen(false)}
                    className="cursor-pointer rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="cursor-pointer rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-amber-600/20 hover:bg-amber-700"
                  >
                    Xác nhận đổi mật khẩu
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* =====================================================================
          MODAL 3: RBAC PRIVILEGES & CAPABILITIES MATRIX
         ===================================================================== */}
      <AnimatePresence>
        {rbacModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setRbacModalOpen(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl z-10"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">
                      Quyền Hạn Vai Trò (Strict RBAC Boundary)
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Ma trận phân quyền hạn chế truy cập dữ liệu và hành động
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setRbacModalOpen(false)}
                  className="cursor-pointer rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Role Header Banner */}
              <div className="mt-4 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-3.5">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'rounded-lg px-2 py-0.5 font-mono text-[10px] font-bold text-white',
                      meta.iconBgClass,
                    )}
                  >
                    {currentUser.role}
                  </span>
                  <span className="text-xs font-bold text-indigo-950">
                    {rbacInfo.title}
                  </span>
                </div>
                <p className="mt-1.5 text-xs text-indigo-900/80 leading-relaxed">
                  {rbacInfo.description}
                </p>
              </div>

              {/* Permissions list */}
              <div className="mt-4 space-y-2 max-h-72 overflow-y-auto pr-1">
                <p className="font-mono text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                  Danh sách quyền được cấp (Granted Privileges):
                </p>
                {rbacInfo.permissions.map((perm, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2.5 rounded-xl border border-slate-100 bg-slate-50/70 p-2.5 text-xs"
                  >
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900">{perm.name}</p>
                      <p className="text-[11px] text-slate-500">{perm.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3">
                <span className="text-[11px] text-slate-400">
                  Cơ chế bảo mật Strict 5-Role RBAC · ATS Enterprise
                </span>
                <button
                  type="button"
                  onClick={() => setRbacModalOpen(false)}
                  className="cursor-pointer rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800"
                >
                  Đã hiểu
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

