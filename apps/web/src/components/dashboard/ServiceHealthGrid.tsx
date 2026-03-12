'use client';

import { cn } from '@/lib/utils';
import { Network } from 'lucide-react';

interface ServiceHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  errorRate: number;
  avgLatencyMs: number;
  requestCount: number;
}

interface ServiceHealthGridProps {
  services: ServiceHealth[];
  className?: string;
}

export function ServiceHealthGrid({
  services,
  className,
}: ServiceHealthGridProps) {
  if (services.length === 0) {
    return (
      <div className={cn('text-center py-8', className)}>
        <Network size={24} className="mx-auto text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">No services detected</p>
      </div>
    );
  }

  return (
    <div className={cn('grid grid-cols-2 md:grid-cols-3 gap-3', className)}>
      {services.map((service) => (
        <div
          key={service.name}
          className={cn(
            'rounded-xl p-3 border transition-colors',
            service.status === 'healthy'
              ? 'border-[var(--success)]/20 bg-[var(--success)]/[0.03]'
              : service.status === 'degraded'
                ? 'border-[var(--warning)]/20 bg-[var(--warning)]/[0.03]'
                : 'border-[var(--error)]/20 bg-[var(--error)]/[0.03]'
          )}
        >
          <div className="flex items-center gap-2 mb-2">
            <div
              className={cn(
                'w-2 h-2 rounded-full',
                service.status === 'healthy'
                  ? 'bg-[var(--success)]'
                  : service.status === 'degraded'
                    ? 'bg-[var(--warning)]'
                    : 'bg-[var(--error)]'
              )}
            />
            <span className="text-[12px] font-semibold truncate">
              {service.name}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <div>
              <p className="number-display text-sm font-bold">
                {service.errorRate.toFixed(1)}%
              </p>
              <p className="text-[9px] text-muted-foreground">Error rate</p>
            </div>
            <div>
              <p className="number-display text-sm font-bold">
                {service.avgLatencyMs}ms
              </p>
              <p className="text-[9px] text-muted-foreground">Latency</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
