import * as AlertDialog from '@radix-ui/react-alert-dialog';
import * as Dialog from '@radix-ui/react-dialog';
import { AlertTriangle, Calendar, ShieldAlert, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import React from 'react';
import { resolveGuardMessage } from '@/lib/errors';

export interface GuardViolationState {
  open: boolean;
  code: string;
  message: string;
  candidateName?: string;
  fromStageName?: string;
  toStageName?: string;
  onActionClick?: () => void;
  actionLabel?: string;
}

interface GuardAlertDialogProps {
  violation: GuardViolationState | null;
  onClose: () => void;
}

/**
 * Điểm "Ăn tiền" #2: Animate UI Guard Alert Dialog & Spring Dialog
 * Khi vi phạm State Guard hoặc dính Điểm liệt (Knock-out), hộp thoại bung ra bằng lò xo
 * đồng thời kích hoạt hiệu ứng rung ngang tinh tế (Shake Keyframes) báo hiệu chốt chặn.
 */
export const GuardAlertDialog: React.FC<GuardAlertDialogProps> = ({ violation, onClose }) => {
  const open = Boolean(violation?.open);
  const resolved = resolveGuardMessage(violation?.code, violation?.message);
  const isKnockout = violation?.code === 'GUARD_DISQUALIFIED';

  return (
    <AlertDialog.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <AnimatePresence>
        {open && violation && (
          <AlertDialog.Portal forceMount>
            <AlertDialog.Overlay asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="fixed inset-0 z-50 bg-slate-900/55 backdrop-blur-xs"
              />
            </AlertDialog.Overlay>
            <AlertDialog.Content asChild>
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <motion.div
                  initial={{ opacity: 0, scale: 0.92, y: 12 }}
                  animate={{
                    opacity: 1,
                    scale: 1,
                    y: 0,
                    x: [0, -10, 10, -7, 7, -4, 4, 0],
                  }}
                  exit={{ opacity: 0, scale: 0.94, y: 8 }}
                  transition={{
                    scale: { type: 'spring', stiffness: 380, damping: 26 },
                    x: { duration: 0.44, ease: 'easeInOut' },
                  }}
                  className="w-full max-w-md rounded-2xl border border-red-200 bg-white p-6 shadow-2xl"
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                        isKnockout
                          ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {isKnockout ? (
                        <ShieldAlert className="h-6 w-6" />
                      ) : (
                        <AlertTriangle className="h-6 w-6" />
                      )}
                    </div>
                    <div className="flex-1">
                      <span className="inline-block rounded-md bg-red-50 px-2 py-0.5 font-mono text-[11px] font-semibold text-red-700">
                        {violation.code}
                      </span>
                      <AlertDialog.Title className="mt-1.5 text-base font-bold text-slate-900">
                        {resolved.title}
                      </AlertDialog.Title>
                      {violation.candidateName && (
                        <p className="mt-1 text-xs font-medium text-slate-600">
                          Ứng viên: <strong className="text-slate-900">{violation.candidateName}</strong>{' '}
                          ({violation.fromStageName} → {violation.toStageName})
                        </p>
                      )}
                      <AlertDialog.Description className="mt-2 text-xs leading-relaxed text-slate-600">
                        {violation.message || resolved.description}
                      </AlertDialog.Description>
                    </div>
                  </div>

                  <div className="mt-6 flex items-center justify-end gap-2.5 border-t border-slate-100 pt-4">
                    <AlertDialog.Cancel asChild>
                      <button
                        type="button"
                        onClick={onClose}
                        className="cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                      >
                        Đã hiểu
                      </button>
                    </AlertDialog.Cancel>
                    {violation.onActionClick && violation.actionLabel && (
                      <AlertDialog.Action asChild>
                        <button
                          type="button"
                          onClick={() => {
                            const fn = violation.onActionClick;
                            onClose();
                            fn?.();
                          }}
                          className="cursor-pointer rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-blue-600/25 transition-colors hover:bg-blue-700"
                        >
                          {violation.actionLabel}
                        </button>
                      </AlertDialog.Action>
                    )}
                  </div>
                </motion.div>
              </div>
            </AlertDialog.Content>
          </AlertDialog.Portal>
        )}
      </AnimatePresence>
    </AlertDialog.Root>
  );
};

interface AnimatedModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export const AnimatedSpringDialog: React.FC<AnimatedModalProps> = ({
  open,
  onOpenChange,
  title,
  subtitle,
  children,
}) => {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs"
              />
            </Dialog.Overlay>
            <Dialog.Content asChild>
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <motion.div
                  initial={{ opacity: 0, scale: 0.93, y: 16 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  transition={{ type: 'spring', stiffness: 360, damping: 28 }}
                  className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
                >
                  <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                        <Calendar className="h-5 w-5" />
                      </div>
                      <div>
                        <Dialog.Title className="text-base font-bold text-slate-900">
                          {title}
                        </Dialog.Title>
                        {subtitle && (
                          <Dialog.Description className="text-xs text-slate-500">
                            {subtitle}
                          </Dialog.Description>
                        )}
                      </div>
                    </div>
                    <Dialog.Close asChild>
                      <button
                        type="button"
                        aria-label="Đóng hộp thoại"
                        className="cursor-pointer rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </Dialog.Close>
                  </div>
                  <div className="mt-4">{children}</div>
                </motion.div>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
};

