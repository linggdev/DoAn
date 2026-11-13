import { AlertOctagon, CheckCircle2, Flame } from 'lucide-react';
import { motion, useSpring, useTransform } from 'motion/react';
import React, { useEffect } from 'react';
import { cn } from '@/lib/utils';

interface AnimatedScoreTickerProps {
  score: number;
  threshold: number;
  isKnockoutTriggered: boolean;
  hasVarianceAlert?: boolean;
}

/**
 * Điểm "Ăn tiền" #4: Animate UI Counting Number & Dynamic Color Progress
 * Khi kéo thanh trượt chấm điểm Scorecard, điểm tổng kết S nhảy số mượt mà bằng lò xo (useSpring)
 * và thanh tiến trình tự động đổi màu từ Xanh sang Đỏ ngay lập tức nếu dính điểm liệt (<= 1.5).
 */
export const AnimatedScoreTicker: React.FC<AnimatedScoreTickerProps> = ({
  score,
  threshold,
  isKnockoutTriggered,
  hasVarianceAlert = false,
}) => {
  const springValue = useSpring(score, {
    stiffness: 260,
    damping: 28,
    mass: 0.6,
  });

  useEffect(() => {
    springValue.set(score);
  }, [score, springValue]);

  const formattedScore = useTransform(springValue, (latest) => latest.toFixed(2));
  const percent = Math.min(100, Math.max(0, (score / 5) * 100));
  const thresholdPercent = (threshold / 5) * 100;

  const statusTheme = isKnockoutTriggered
    ? {
        border: 'border-red-300 bg-red-50/90',
        barColor: '#dc2626',
        badgeBg: 'bg-red-600 text-white',
        scoreColor: 'text-red-700',
        label: 'DÍNH ĐIỂM LIỆT (KNOCK-OUT ≤ 1.5)',
        icon: <AlertOctagon className="h-4 w-4 text-red-600" />,
      }
    : score >= threshold
      ? {
          border: 'border-emerald-200 bg-emerald-50/70',
          barColor: '#059669',
          badgeBg: 'bg-emerald-600 text-white',
          scoreColor: 'text-emerald-700',
          label: `ĐẠT NGƯỠNG CHUẨN (≥ ${threshold.toFixed(2)})`,
          icon: <CheckCircle2 className="h-4 w-4 text-emerald-600" />,
        }
      : {
          border: 'border-amber-200 bg-amber-50/80',
          barColor: '#d97706',
          badgeBg: 'bg-amber-600 text-white',
          scoreColor: 'text-amber-700',
          label: `CHƯA ĐẠT NGƯỠNG (< ${threshold.toFixed(2)})`,
          icon: <Flame className="h-4 w-4 text-amber-600" />,
        };

  return (
    <motion.div
      layout
      animate={
        isKnockoutTriggered
          ? { x: [0, -6, 6, -4, 4, 0] }
          : { x: 0 }
      }
      transition={{ duration: 0.35 }}
      className={cn(
        'rounded-2xl border p-4 transition-colors duration-300',
        statusTheme.border,
      )}
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            {statusTheme.icon}
            <span className="text-[11px] font-bold tracking-wider text-slate-600 uppercase">
              Điểm Tổng Kết Trọng Số (Weighted Score S)
            </span>
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            <span
              className={cn(
                'inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold',
                statusTheme.badgeBg,
              )}
            >
              {statusTheme.label}
            </span>
            {hasVarianceAlert && !isKnockoutTriggered && (
              <span className="inline-flex items-center rounded-md border border-amber-300 bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                Lệch quan điểm Δ ≥ 2.0
              </span>
            )}
          </div>
        </div>

        {/* Số nhảy Counting Number */}
        <div className="text-right">
          <div className="flex items-baseline justify-end gap-1">
            <motion.span
              className={cn(
                'font-mono text-3xl font-extrabold tracking-tight tabular-nums',
                statusTheme.scoreColor,
              )}
            >
              {formattedScore}
            </motion.span>
            <span className="font-mono text-sm font-semibold text-slate-400 tabular-nums">
              / 5.00
            </span>
          </div>
          <p className="font-mono text-[11px] text-slate-500 tabular-nums">
            Ngưỡng đậu: {threshold.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Thanh tiến trình động đổi màu mượt mà */}
      <div className="relative mt-3.5 h-3 w-full overflow-hidden rounded-full bg-slate-200/90">
        {/* Vạch đánh dấu ngưỡng đậu (Pass Threshold Marker) */}
        <div
          style={{ left: `${thresholdPercent}%` }}
          title={`Ngưỡng đậu ${threshold.toFixed(2)}`}
          className="absolute top-0 bottom-0 z-10 w-0.5 bg-slate-900/70"
        />
        <motion.div
          initial={false}
          animate={{
            width: `${percent}%`,
            backgroundColor: statusTheme.barColor,
          }}
          transition={{ type: 'spring', stiffness: 260, damping: 28 }}
          className="h-full rounded-full"
        />
      </div>
    </motion.div>
  );
};

