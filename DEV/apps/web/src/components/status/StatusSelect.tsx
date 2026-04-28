import * as React from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { BriefcaseBusiness, Check, CircleOff, Coffee, LogOut, Sparkles, X } from 'lucide-react';
import { AppIcon } from '@/components/AppIcon';
import {
  Select,
  SelectContent,
  SelectTrigger,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useDropdownDisplayConfigs } from '@/hooks/useDropdownDisplay';
import { resolvePrimary, resolveSecondary } from '@/lib/dropdownFieldResolver';

// Custom SelectItem — check indicator on RIGHT so it doesn't overlap the status icon on the left.
const StatusSelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      'relative flex w-full cursor-default select-none items-center rounded-lg py-2 pl-2 pr-8 text-sm outline-none',
      'focus:bg-muted/70',
      'data-[state=checked]:bg-primary/5 data-[state=checked]:ring-1 data-[state=checked]:ring-primary/25',
      'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      className,
    )}
    {...props}
  >
    <SelectPrimitive.ItemText asChild>
      <span className="flex-1">{children}</span>
    </SelectPrimitive.ItemText>
    <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center text-primary">
      <SelectPrimitive.ItemIndicator>
        <Check className="h-4 w-4" />
      </SelectPrimitive.ItemIndicator>
    </span>
  </SelectPrimitive.Item>
));
StatusSelectItem.displayName = 'StatusSelectItem';

const EMPTY_VALUE = '__all_statuses__';
const DEFAULT_STATUS_COLOR = '#6b7280';

type StatusSelectOption = {
  id: string;
  name: string;
  displayName?: string | null;
  colorHex?: string | null;
  iconId?: string | null;
  isLogoutStatus?: boolean;
  isWorkingInStatus?: boolean;
  isWorkingOutStatus?: boolean;
  isBreak?: boolean;
  isAbsent?: boolean;
  maxDurationSeconds?: number | null;
};

interface StatusSelectProps {
  value?: string;
  onValueChange: (value: string) => void;
  options: StatusSelectOption[];
  placeholder?: string;
  emptyLabel?: string;
  label?: string;
  className?: string;
  triggerClassName?: string;
  contentClassName?: string;
  testId?: string;
}

function getStatusLabel(status?: Pick<StatusSelectOption, 'name' | 'displayName'> | null) {
  return status?.displayName?.trim() || status?.name || 'Unknown status';
}

function formatStatusDuration(seconds?: number | null) {
  if (!seconds || seconds <= 0) return null;

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m`;
  return `${seconds}s`;
}

function getCategoryLabel(status: StatusSelectOption): string | null {
  if (status.isLogoutStatus) return 'Logout';
  if (status.isBreak) return 'Break';
  if (status.isAbsent) return 'Absent';
  if (status.isWorkingInStatus || status.isWorkingOutStatus) return 'Working';
  return null;
}

/**
 * Hydrate a status option with derived fields so the S09 resolver can read
 * `categoryLabel` / `maxDurationLabel` alongside the raw columns.
 */
function hydrateStatusForResolver(status: StatusSelectOption): Record<string, unknown> {
  const duration = formatStatusDuration(status.maxDurationSeconds);
  const durationLabel = duration ? `max ${duration}` : null;
  return {
    ...status,
    categoryLabel: getCategoryLabel(status),
    maxDurationLabel: durationLabel,
  };
}

function toRgba(hexColor: string, alpha: number) {
  const normalized = hexColor.replace('#', '').trim();
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return `rgba(107, 114, 128, ${alpha})`;
  }

  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function StatusGlyph({ status, className }: { status?: StatusSelectOption | null; className?: string }) {
  if (status?.iconId) {
    return (
      <AppIcon
        iconId={status.iconId}
        alt={getStatusLabel(status)}
        className={className}
        fallback={null}
      />
    );
  }

  if (status?.isLogoutStatus) return <LogOut className={className} aria-hidden />;
  if (status?.isBreak) return <Coffee className={className} aria-hidden />;
  if (status?.isAbsent) return <CircleOff className={className} aria-hidden />;
  if (status?.isWorkingInStatus || status?.isWorkingOutStatus) {
    return <BriefcaseBusiness className={className} aria-hidden />;
  }

  return <Sparkles className={className} aria-hidden />;
}

function StatusOptionRow({
  status,
  fallbackLabel,
}: {
  status?: StatusSelectOption | null;
  fallbackLabel?: string;
}) {
  const { configsMap } = useDropdownDisplayConfigs();

  if (!status) {
    return (
      <div className="flex min-w-0 items-center gap-2">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-dashed border-border bg-muted text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="truncate font-medium">{fallbackLabel ?? 'All statuses'}</p>
          <p className="text-xs text-muted-foreground">No status filter</p>
        </div>
      </div>
    );
  }

  const color = status.colorHex || DEFAULT_STATUS_COLOR;
  const cfg = configsMap.STATUS;
  const hydrated = hydrateStatusForResolver(status);
  const primary = resolvePrimary(hydrated, cfg.primaryField);
  const secondary = resolveSecondary(hydrated, cfg.secondaryFields);

  return (
    <div className="flex min-w-0 items-center gap-2">
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border"
        style={{
          color,
          borderColor: toRgba(color, 0.22),
          backgroundColor: toRgba(color, 0.14),
        }}
      >
        <StatusGlyph status={status} className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-foreground">{primary}</p>
        {secondary && (
          <p className="truncate text-xs text-muted-foreground">{secondary}</p>
        )}
      </div>
    </div>
  );
}

export function StatusSelect({
  value = '',
  onValueChange,
  options,
  placeholder = 'Select status',
  emptyLabel = 'All statuses',
  label,
  className,
  triggerClassName,
  contentClassName,
  testId = 'dropdown-status-picker',
}: StatusSelectProps) {
  const selectedStatus = options.find((status) => status.id === value) ?? null;
  const resolvedValue = value || EMPTY_VALUE;

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {label ? <label className="text-xs font-medium text-muted-foreground">{label}</label> : null}
      <Select value={resolvedValue} onValueChange={(nextValue) => onValueChange(nextValue === EMPTY_VALUE ? '' : nextValue)}>
        <SelectTrigger
          data-testid={testId}
          aria-label={label ?? placeholder}
          className={cn(
            'h-10 min-w-[15rem] rounded-xl border-border/70 bg-gradient-to-br from-background via-background to-muted/40 px-3 shadow-sm transition-colors hover:border-primary/40',
            triggerClassName,
          )}
        >
          <div className="flex min-w-0 flex-1 items-center">
            {selectedStatus ? (
              <StatusOptionRow status={selectedStatus} />
            ) : (
              <div className="flex min-w-0 items-center gap-2 text-muted-foreground">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-dashed border-border bg-muted/70">
                  <Sparkles className="h-4 w-4" aria-hidden />
                </span>
                <div className="min-w-0 text-left">
                  <p className="truncate font-medium">{emptyLabel}</p>
                  <p className="truncate text-xs text-muted-foreground">{placeholder}</p>
                </div>
              </div>
            )}
          </div>
          {selectedStatus && (
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); onValueChange(''); }}
              aria-label="Clear filter"
              className="ml-1 shrink-0 rounded p-0.5 opacity-50 transition-opacity hover:opacity-100"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </SelectTrigger>
        <SelectContent className={cn('rounded-xl border-border/70 p-2 shadow-xl', contentClassName)}>
          <StatusSelectItem value={EMPTY_VALUE}>
            <StatusOptionRow fallbackLabel={emptyLabel} />
          </StatusSelectItem>
          {options.map((status) => (
            <StatusSelectItem key={status.id} value={status.id}>
              <StatusOptionRow status={status} />
            </StatusSelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}