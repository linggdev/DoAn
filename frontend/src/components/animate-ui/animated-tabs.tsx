import * as Accordion from '@radix-ui/react-accordion';
import * as Tabs from '@radix-ui/react-tabs';
import { ChevronDown } from 'lucide-react';
import { motion } from 'motion/react';
import React from 'react';
import { cn } from '@/lib/utils';

export interface AnimatedTabItem {
  value: string;
  label: string;
  badge?: string | number;
  icon?: React.ReactNode;
}

interface AnimatedTabsProps {
  tabs: AnimatedTabItem[];
  value: string;
  onValueChange: (val: string) => void;
  layoutId?: string;
  className?: string;
}

/**
 * Điểm "Ăn tiền" #3: Animate UI Sliding Tabs & Smooth Accordion
 * Thanh gạch chân và pill nền trượt mượt theo tab đang chọn bằng layoutId (Shared Layout Animation).
 */
export const AnimatedTabsList: React.FC<AnimatedTabsProps> = ({
  tabs,
  value,
  onValueChange,
  layoutId = 'animate-ui-tabs-indicator',
  className,
}) => {
  return (
    <Tabs.Root value={value} onValueChange={onValueChange}>
      <Tabs.List
        className={cn(
          'relative inline-flex items-center gap-1 rounded-xl border border-slate-200/80 bg-slate-100/90 p-1',
          className,
        )}
      >
        {tabs.map((tab) => {
          const isActive = value === tab.value;
          return (
            <Tabs.Trigger
              key={tab.value}
              value={tab.value}
              className={cn(
                'relative z-10 flex cursor-pointer items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors outline-none',
                isActive ? 'text-blue-700' : 'text-slate-600 hover:text-slate-900',
              )}
            >
              {isActive && (
                <motion.div
                  layoutId={layoutId}
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  className="absolute inset-0 rounded-lg bg-white shadow-xs ring-1 ring-slate-200/70"
                />
              )}
              <span className="relative z-10 flex items-center gap-1.5">
                {tab.icon}
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span
                    className={cn(
                      'rounded-md px-1.5 py-0.2 font-mono text-[10px] font-bold tabular-nums',
                      isActive ? 'bg-blue-50 text-blue-700' : 'bg-slate-200/80 text-slate-600',
                    )}
                  >
                    {tab.badge}
                  </span>
                )}
              </span>
            </Tabs.Trigger>
          );
        })}
      </Tabs.List>
    </Tabs.Root>
  );
};

export interface AccordionSectionItem {
  id: string;
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  content: React.ReactNode;
}

export const AnimatedAccordion: React.FC<{
  items: AccordionSectionItem[];
  defaultValue?: string[];
}> = ({ items, defaultValue }) => {
  return (
    <Accordion.Root
      type="multiple"
      defaultValue={defaultValue ?? items.map((i) => i.id)}
      className="space-y-2.5"
    >
      {items.map((item) => (
        <Accordion.Item
          key={item.id}
          value={item.id}
          className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs"
        >
          <Accordion.Header className="flex">
            <Accordion.Trigger className="group flex flex-1 cursor-pointer items-center justify-between px-4 py-3 text-left text-xs font-semibold text-slate-900 transition-colors hover:bg-slate-50">
              <div>
                <div className="flex items-center gap-2">
                  <span>{item.title}</span>
                  {item.badge}
                </div>
                {item.subtitle && (
                  <p className="mt-0.5 text-[11px] font-normal text-slate-500">{item.subtitle}</p>
                )}
              </div>
              <ChevronDown className="h-4 w-4 text-slate-400 transition-transform duration-200 group-data-[state=open]:rotate-180" />
            </Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Content className="border-t border-slate-100 px-4 py-3 text-xs text-slate-700 data-[state=closed]:animate-none">
            {item.content}
          </Accordion.Content>
        </Accordion.Item>
      ))}
    </Accordion.Root>
  );
};

