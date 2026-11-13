import * as Tooltip from '@radix-ui/react-tooltip';
import {
  Activity,
  BarChart3,
  Briefcase,
  Building2,
  CalendarCheck2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Compass,
  FileCheck2,
  FileSearch,
  Kanban,
  LogOut,
  Scale,
  ShieldCheck,
  Sliders,
  Sparkles,
  Users,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import React from 'react';
import { cn } from '@/lib/utils';

export type UserRole = 'ADMIN' | 'HIRING_MANAGER' | 'HR' | 'INTERVIEWER' | 'CANDIDATE';

export interface RoleNavItem {
  id: string;
  label: string;
  badge?: string | number;
  icon: React.ComponentType<{ className?: string }>;
}

export const ROLE_META: Record<
  UserRole,
  {
    portalTitle: string;
    portalSubtitle: string;
    roleBadge: string;
    activePillClass: string;
    iconBgClass: string;
    badgeTextClass: string;
  }
> = {
  ADMIN: {
    portalTitle: 'Admin Command',
    portalSubtitle: 'System & RBAC Governance',
    roleBadge: 'SYSTEM ADMIN',
    activePillClass: 'bg-gradient-to-r from-amber-500 to-orange-600 shadow-amber-500/25',
    iconBgClass: 'bg-gradient-to-br from-amber-500 to-orange-600 shadow-amber-500/30',
    badgeTextClass: 'text-amber-400',
  },
  HIRING_MANAGER: {
    portalTitle: 'Hiring Manager',
    portalSubtitle: 'Department & Offer Portal',
    roleBadge: 'HIRING MANAGER',
    activePillClass: 'bg-gradient-to-r from-emerald-600 to-teal-600 shadow-emerald-600/25',
    iconBgClass: 'bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/30',
    badgeTextClass: 'text-emerald-400',
  },
  HR: {
    portalTitle: 'HR Operations Hub',
    portalSubtitle: 'Pipeline & Calibration Center',
    roleBadge: 'HR RECRUITER',
    activePillClass: 'bg-gradient-to-r from-blue-600 to-indigo-600 shadow-blue-600/25',
    iconBgClass: 'bg-gradient-to-br from-blue-600 to-indigo-600 shadow-blue-600/30',
    badgeTextClass: 'text-blue-400',
  },
  INTERVIEWER: {
    portalTitle: 'Evaluation Studio',
    portalSubtitle: 'Blind Scorecard Workspace',
    roleBadge: 'INTERVIEWER',
    activePillClass: 'bg-gradient-to-r from-violet-600 to-purple-600 shadow-violet-600/25',
    iconBgClass: 'bg-gradient-to-br from-violet-600 to-purple-600 shadow-violet-600/30',
    badgeTextClass: 'text-violet-400',
  },
  CANDIDATE: {
    portalTitle: 'Candidate Portal',
    portalSubtitle: 'Career & Application Tracker',
    roleBadge: 'CANDIDATE',
    activePillClass: 'bg-gradient-to-r from-sky-500 to-cyan-600 shadow-sky-500/25',
    iconBgClass: 'bg-gradient-to-br from-sky-500 to-cyan-600 shadow-sky-500/30',
    badgeTextClass: 'text-sky-400',
  },
};

export const ROLE_NAV_CONFIG: Record<UserRole, RoleNavItem[]> = {
  ADMIN: [
    { id: 'admin-users', label: 'Tài khoản & Phân quyền RBAC', badge: '5 Roles', icon: Users },
    { id: 'admin-departments', label: 'Cơ cấu Phòng ban & Trưởng phòng', icon: Building2 },
    { id: 'admin-audit', label: 'Nhật ký Kiểm toán (Audit Logs)', badge: 'ACID', icon: Activity },
  ],
  HIRING_MANAGER: [
    { id: 'hm-offers', label: 'Hàng đợi Duyệt Offer', badge: 'Ưu tiên', icon: CheckCircle2 },
    { id: 'hm-requisitions', label: 'Yêu cầu Định biên (Requisitions)', icon: FileCheck2 },
    { id: 'hm-calibration', label: 'Calibration Phòng ban (Δ ≥ 2.0)', icon: Scale },
    { id: 'hm-studio', label: 'Chấm điểm Phỏng vấn', icon: ClipboardCheck },
  ],
  HR: [
    { id: 'hr-kanban', label: 'Bảng Kanban Tuyển dụng', badge: 'Drag & Drop', icon: Kanban },
    { id: 'hr-jobs', label: 'Duyệt Định biên & Thiết kế Job', icon: Sliders },
    { id: 'hr-calibration', label: 'So sánh & Họp Calibration', badge: 'Δ ≥ 2.0', icon: Scale },
    { id: 'hr-studio', label: 'Xem Phiếu Chấm & Blind Lock', icon: ClipboardCheck },
    { id: 'hr-analytics', label: 'Phễu & Time-to-Hire Dashboard', icon: BarChart3 },
  ],
  INTERVIEWER: [
    { id: 'int-schedule', label: 'Lịch Phỏng vấn Được giao', badge: 'Assigned', icon: CalendarCheck2 },
    { id: 'int-studio', label: 'Split-Screen Scorecard Studio', badge: 'Blind Lock', icon: ClipboardCheck },
  ],
  CANDIDATE: [
    { id: 'cand-jobs', label: 'Khám phá Việc làm (Careers)', badge: 'Open', icon: Compass },
    { id: 'cand-applications', label: 'Đơn Ứng tuyển của Tôi', icon: Briefcase },
    { id: 'cand-track', label: 'Tra cứu Mã Magic Link', icon: FileSearch },
  ],
};

interface AnimatedSidebarProps {
  role: UserRole;
  userName: string;
  userEmail: string;
  departmentName?: string;
  activeSection: string;
  onSelectSection: (id: string) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onLogout: () => void;
}

export const AnimatedSidebar: React.FC<AnimatedSidebarProps> = ({
  role,
  userName,
  userEmail,
  departmentName,
  activeSection,
  onSelectSection,
  collapsed,
  onToggleCollapsed,
  onLogout,
}) => {
  const meta = ROLE_META[role];
  const navItems = ROLE_NAV_CONFIG[role];

  return (
    <Tooltip.Provider delayDuration={70}>
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 78 : 276 }}
        transition={{ type: 'spring', stiffness: 320, damping: 30, mass: 0.85 }}
        className="relative flex h-screen shrink-0 flex-col border-r border-slate-800/80 bg-slate-950 text-slate-100 select-none"
      >
        {/* Subtle top ambient glow */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-blue-600/10 to-transparent" />

        {/* Portal Brand Header */}
        <div className="relative flex h-16 items-center justify-between border-b border-slate-800/80 px-4">
          <div className="flex items-center gap-3 overflow-hidden">
            <div
              className={cn(
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white shadow-lg',
                meta.iconBgClass,
              )}
            >
              <Sparkles className="h-4.5 w-4.5" />
            </div>
            <AnimatePresence initial={false}>
              {!collapsed && (
                <motion.div
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.15 }}
                  className="whitespace-nowrap"
                >
                  <p className="text-sm font-bold tracking-tight text-white">{meta.portalTitle}</p>
                  <p className="text-[11px] font-medium text-slate-400">{meta.portalSubtitle}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-label={collapsed ? 'Mở rộng Sidebar' : 'Thu gọn Sidebar'}
            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-400 transition-colors hover:border-slate-700 hover:bg-slate-800 hover:text-white"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        {/* Role Section Label */}
        {!collapsed && (
          <div className="px-4 pt-4 pb-1">
            <span className={cn('font-mono text-[10px] font-bold tracking-widest uppercase', meta.badgeTextClass)}>
              {meta.roleBadge} MENU
            </span>
          </div>
        )}

        {/* Role-Dedicated Navigation */}
        <nav className="flex-1 space-y-1.5 px-3 py-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;

            const btn = (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectSection(item.id)}
                className={cn(
                  'group relative flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-semibold transition-colors',
                  isActive
                    ? 'text-white'
                    : 'text-slate-400 hover:bg-slate-900/90 hover:text-slate-100',
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active-pill"
                    transition={{ type: 'spring', stiffness: 360, damping: 30 }}
                    className={cn('absolute inset-0 rounded-xl shadow-lg', meta.activePillClass)}
                  />
                )}
                <Icon
                  className={cn(
                    'relative z-10 h-4.5 w-4.5 shrink-0 transition-transform duration-150 group-hover:scale-105',
                    isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200',
                  )}
                />
                <AnimatePresence initial={false}>
                  {!collapsed && (
                    <motion.div
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.15 }}
                      className="relative z-10 flex flex-1 items-center justify-between overflow-hidden whitespace-nowrap"
                    >
                      <span className="truncate">{item.label}</span>
                      {item.badge !== undefined && (
                        <span
                          className={cn(
                            'ml-2 rounded-md px-1.5 py-0.5 font-mono text-[10px] font-bold',
                            isActive
                              ? 'bg-white/20 text-white'
                              : 'bg-slate-900 text-slate-400 ring-1 ring-slate-800',
                          )}
                        >
                          {item.badge}
                        </span>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </button>
            );

            if (!collapsed) return btn;

            return (
              <Tooltip.Root key={item.id}>
                <Tooltip.Trigger asChild>{btn}</Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content
                    side="right"
                    sideOffset={10}
                    className="z-50 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-xl"
                  >
                    {item.label}
                    <Tooltip.Arrow className="fill-slate-900" />
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>
            );
          })}
        </nav>

        {/* User Profile & Logout Footer */}
        <div className="border-t border-slate-800/80 p-3">
          <div className="rounded-xl border border-slate-800/90 bg-slate-900/80 p-2.5">
            <div className="flex items-center gap-2.5">
              <div
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-mono text-xs font-bold text-white',
                  meta.iconBgClass,
                )}
              >
                {userName.slice(0, 2).toUpperCase()}
              </div>
              <AnimatePresence initial={false}>
                {!collapsed && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="min-w-0 flex-1"
                  >
                    <p className="truncate text-xs font-bold text-white">{userName}</p>
                    <p className="truncate text-[11px] text-slate-400">
                      {departmentName ? `${departmentName} · ` : ''}
                      {userEmail}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button
              type="button"
              onClick={onLogout}
              className={cn(
                'mt-2.5 flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-800 bg-slate-950/80 px-2.5 py-1.5 text-xs font-semibold text-slate-300 transition-colors hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-300',
              )}
            >
              <LogOut className="h-3.5 w-3.5 shrink-0" />
              {!collapsed && <span>Đăng xuất / Đổi tài khoản</span>}
            </button>
          </div>
        </div>
      </motion.aside>
    </Tooltip.Provider>
  );
};
