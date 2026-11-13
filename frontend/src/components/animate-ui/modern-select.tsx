import { Check, ChevronDown } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

export interface ModernSelectOption<T extends string | number = string> {
  value: T;
  label: string;
  badge?: string;
  badgeColor?: string;
  icon?: React.ComponentType<{ className?: string }>;
  description?: string;
}

export interface ModernSelectProps<T extends string | number = string> {
  value: T;
  onChange: (value: T) => void;
  options: ModernSelectOption<T>[];
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
  dropdownClassName?: string;
  size?: 'sm' | 'md';
  align?: 'left' | 'right';
  icon?: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
}

export function ModernSelect<T extends string | number = string>({
  value,
  onChange,
  options,
  placeholder = 'Chọn một mục...',
  className,
  triggerClassName,
  dropdownClassName,
  size = 'sm',
  align = 'left',
  icon: TriggerIcon,
  disabled = false,
}: ModernSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [effectiveAlign, setEffectiveAlign] = useState<'left' | 'right'>(align);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  // Auto-detect viewport boundary to prevent overflow on right side (UI/UX PRO MAX)
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const estimatedWidth = 230;
      if (rect.left + estimatedWidth > window.innerWidth - 16) {
        setEffectiveAlign('right');
      } else {
        setEffectiveAlign(align);
      }
    }
  }, [isOpen, align]);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const SelectedIcon = selectedOption?.icon || TriggerIcon;

  return (
    <div className={cn('relative inline-block text-left select-none', className)} ref={containerRef}>
      {/* TRIGGER BUTTON (ROUNDED-2XL UI/UX PRO MAX) */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={cn(
          'group flex cursor-pointer items-center justify-between gap-2.5 rounded-2xl border border-slate-200/90 bg-white text-slate-800 shadow-2xs transition-all duration-150 hover:border-slate-300 hover:bg-slate-50/80 hover:shadow-xs active:scale-98 disabled:cursor-not-allowed disabled:opacity-50',
          size === 'sm' ? 'px-3.5 py-1.5 text-xs' : 'px-4 py-2 text-sm',
          isOpen && 'border-amber-400 bg-amber-50/40 ring-2 ring-amber-400/20',
          triggerClassName,
        )}
      >
        <div className="flex min-w-0 items-center gap-2">
          {SelectedIcon && (
            <SelectedIcon
              className={cn(
                'shrink-0 text-slate-400 transition-colors group-hover:text-slate-600',
                size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4',
              )}
            />
          )}
          <span className="truncate font-bold text-slate-800">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          {selectedOption?.badge && (
            <span
              className={cn(
                'rounded-md px-1.5 py-0.2 font-mono text-[9px] font-bold tracking-wider uppercase',
                selectedOption.badgeColor || 'bg-slate-100 text-slate-600',
              )}
            >
              {selectedOption.badge}
            </span>
          )}
        </div>

        <ChevronDown
          className={cn(
            'shrink-0 text-slate-400 transition-transform duration-200 group-hover:text-slate-600',
            size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4',
            isOpen && 'rotate-180 text-amber-600',
          )}
        />
      </button>

      {/* DROPDOWN MENU (ROUNDED-2XL UI/UX PRO MAX WITH HIGH Z-INDEX & VIEWPORT AWARENESS) */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.96 }}
            transition={{ duration: 0.14, ease: 'easeOut' }}
            className={cn(
              'absolute top-full z-[9999] mt-1.5 min-w-[220px] rounded-2xl border border-slate-200/90 bg-white p-1.5 shadow-2xl shadow-slate-900/15 ring-1 ring-slate-900/5',
              effectiveAlign === 'right' ? 'right-0 origin-top-right' : 'left-0 origin-top-left',
              dropdownClassName,
            )}
            role="listbox"
          >
            <div className="max-h-64 space-y-0.5 overflow-y-auto">
              {options.map((option) => {
                const isSelected = option.value === value;
                const OptionIcon = option.icon;

                return (
                  <button
                    key={String(option.value)}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      onChange(option.value);
                      setIsOpen(false);
                    }}
                    className={cn(
                      'flex w-full cursor-pointer items-center justify-between gap-2.5 rounded-xl px-3 py-2 text-left text-xs transition-colors duration-150',
                      isSelected
                        ? 'bg-amber-500/15 font-bold text-amber-950 ring-1 ring-amber-500/30'
                        : 'font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900',
                    )}
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      {OptionIcon && (
                        <OptionIcon
                          className={cn(
                            'h-3.5 w-3.5 shrink-0',
                            isSelected ? 'text-amber-700' : 'text-slate-400',
                          )}
                        />
                      )}
                      <div className="truncate">
                        <span className="block truncate">{option.label}</span>
                        {option.description && (
                          <span className="block truncate text-[10px] text-slate-400">
                            {option.description}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-1.5 ml-2">
                      {option.badge && (
                        <span
                          className={cn(
                            'rounded-md px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase whitespace-nowrap',
                            option.badgeColor || 'bg-slate-100 text-slate-600',
                          )}
                        >
                          {option.badge}
                        </span>
                      )}
                      {isSelected && <Check className="h-3.5 w-3.5 text-amber-600 shrink-0" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

