import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface IMetricCardProps {
  title: string;
  value: number | string;
  icon?: ReactNode;
  colorClass?: string;
  subtitle?: string;
}

export function MetricCard({ title, value, icon, colorClass, subtitle }: IMetricCardProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-5 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">{title}</span>
        {icon && (
          <span className={cn('h-8 w-8 rounded-full flex items-center justify-center text-sm', colorClass ?? 'bg-primary/10 text-primary')}>
            {icon}
          </span>
        )}
      </div>
      <span className={cn('text-3xl font-bold', colorClass ? `text-${colorClass.split('-')[1] ?? 'foreground'}` : 'text-foreground')}>
        {value}
      </span>
      {subtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}
    </div>
  );
}
