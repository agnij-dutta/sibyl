'use client';

import { cn } from '@/lib/utils';

interface ErrorChartProps {
  data: { hour: string; count: number; level: string }[];
  height?: number;
  className?: string;
}

export function ErrorChart({ data, height = 120, className }: ErrorChartProps) {
  if (data.length === 0) {
    return (
      <div
        className={cn('flex items-center justify-center', className)}
        style={{ height }}
      >
        <p className="text-[11px] text-muted-foreground">
          No error data available
        </p>
      </div>
    );
  }

  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className={cn('relative', className)} style={{ height }}>
      <div className="absolute inset-0 flex items-end gap-px">
        {data.map((d, i) => {
          const barHeight = (d.count / maxCount) * 100;
          return (
            <div
              key={i}
              className="flex-1 group relative"
              style={{ height: '100%' }}
            >
              <div
                className={cn(
                  'absolute bottom-0 left-0 right-0 rounded-t-sm transition-all',
                  d.level === 'error'
                    ? 'bg-[var(--error)]/70 hover:bg-[var(--error)]'
                    : d.level === 'warning'
                      ? 'bg-[var(--warning)]/70 hover:bg-[var(--warning)]'
                      : 'bg-[var(--sibyl)]/40 hover:bg-[var(--sibyl)]/70'
                )}
                style={{ height: `${Math.max(barHeight, 2)}%` }}
              />
              {/* Hover tooltip */}
              <div
                className="absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover:block
                  bg-foreground text-background text-[10px] px-2 py-0.5 rounded font-mono whitespace-nowrap z-10"
              >
                {d.count} {d.level}s
              </div>
            </div>
          );
        })}
      </div>
      {/* Y-axis labels */}
      <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between pointer-events-none">
        <span className="text-[9px] text-muted-foreground font-mono">
          {maxCount}
        </span>
        <span className="text-[9px] text-muted-foreground font-mono">0</span>
      </div>
    </div>
  );
}
