'use client';

import { cn } from '@/lib/utils';
import { Sparkline } from './Sparkline';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface StatusCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  color: string;
  trend?: { value: number; label: string };
  sparklineData?: number[];
  className?: string;
}

export function StatusCard({
  label,
  value,
  icon: Icon,
  color,
  trend,
  sparklineData,
  className,
}: StatusCardProps) {
  const TrendIcon = trend
    ? trend.value > 0
      ? TrendingUp
      : trend.value < 0
        ? TrendingDown
        : Minus
    : null;

  return (
    <div className={cn('glass-card rounded-2xl p-5 group', className)}>
      <div className="flex items-start justify-between mb-3">
        <div
          className={cn('p-2.5 rounded-xl transition-colors')}
          style={{ backgroundColor: `color-mix(in srgb, ${color} 10%, transparent)` }}
        >
          <Icon size={18} style={{ color }} />
        </div>
        {sparklineData && sparklineData.length > 1 && (
          <Sparkline data={sparklineData} color={color} width={80} height={24} />
        )}
      </div>
      <p className="number-display text-2xl font-bold tracking-tight">
        {value}
      </p>
      <div className="flex items-center justify-between mt-1">
        <p className="text-[13px] text-muted-foreground">{label}</p>
        {trend && TrendIcon && (
          <span
            className={cn(
              'inline-flex items-center gap-1 text-[11px] font-medium',
              trend.value > 0
                ? 'text-[var(--error)]'
                : trend.value < 0
                  ? 'text-[var(--success)]'
                  : 'text-muted-foreground'
            )}
          >
            <TrendIcon size={10} />
            {Math.abs(trend.value)}% {trend.label}
          </span>
        )}
      </div>
    </div>
  );
}
