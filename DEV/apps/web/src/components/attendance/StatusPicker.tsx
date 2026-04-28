import { Button } from '@/components/ui/button';
import type { IStatusDefinition } from '@/api/attendance.api';
import { safeArray } from '@/lib/safeArray';
import { LogOut, Circle } from 'lucide-react';
import { AppIcon } from '@/components/AppIcon';
import {
  STATUS_PICKER_MIN_CARD_WIDTH_REM,
  formatStatusMaxDuration,
} from './attendance-ui';

interface StatusPickerProps {
  statuses: IStatusDefinition[];
  currentStatusId?: string | null;
  isLoading?: boolean;
  cooldownRemaining?: number;
  onSelect: (statusId: string) => void;
  onLogout: () => void;
}

export function StatusPicker({
  statuses: statusesProp,
  currentStatusId,
  isLoading,
  cooldownRemaining = 0,
  onSelect,
  onLogout,
}: StatusPickerProps) {
  const statuses = safeArray(statusesProp).filter((status) => !status.isLoginStatus);
  const isCooldown = cooldownRemaining > 0;
  return (
    <div data-testid="status-picker" className="rounded-xl border bg-card p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">Change Status</p>
        {isCooldown && (
          <p className="text-xs text-muted-foreground">
            Wait <span className="font-mono font-semibold text-foreground">{cooldownRemaining}s</span> before changing again
          </p>
        )}
      </div>
      <div
        className="grid gap-2"
        style={{
          gridTemplateColumns: `repeat(auto-fit, minmax(${STATUS_PICKER_MIN_CARD_WIDTH_REM}rem, 1fr))`,
        }}
      >
        {statuses.map((status) => {
          const isCurrent = status.id === currentStatusId;
          const isLogout = status.isLogoutStatus;
          const iconColor = isCurrent ? '#ffffff' : status.colorHex ?? '#6b7280';
          const maxDurationLabel = formatStatusMaxDuration(status.maxDurationSeconds);
          const badgeStyle = status.colorHex
            ? {
                color: isCurrent ? '#ffffff' : status.colorHex,
                backgroundColor: isCurrent ? 'rgba(255,255,255,0.22)' : `${status.colorHex}18`,
                borderColor: isCurrent ? 'rgba(255,255,255,0.28)' : `${status.colorHex}33`,
              }
            : undefined;

          return (
            <Button
              key={status.id}
              data-testid={`status-btn-${status.id}`}
              variant={isCurrent ? 'default' : 'outline'}
              className="relative flex h-20 min-w-0 flex-col items-center justify-center gap-1.5 px-2 text-xs"
              style={
                isCurrent && status.colorHex
                  ? { backgroundColor: status.colorHex, borderColor: status.colorHex }
                  : {}
              }
              disabled={isCurrent || isLoading || (isCooldown && !isLogout)}
              onClick={() => {
                if (isLogout) {
                  onLogout();
                } else {
                  onSelect(status.id);
                }
              }}
            >
              <span
                className="flex h-8 w-8 items-center justify-center rounded-full"
                style={{
                  color: iconColor,
                  backgroundColor: isCurrent ? 'rgba(255,255,255,0.18)' : `${status.colorHex ?? '#6b7280'}18`,
                }}
              >
                {isLogout ? (
                  <LogOut className="h-4.5 w-4.5" />
                ) : (
                  <AppIcon
                    iconId={status.iconId}
                    alt={status.displayName ?? status.name}
                    className="h-4.5 w-4.5"
                    fallback={<Circle className="h-4 w-4 opacity-70" />}
                  />
                )}
              </span>
              <span
                className="block w-full max-w-full truncate px-1 text-center font-medium"
                title={status.displayName ?? status.name}
              >
                {status.displayName ?? status.name}
              </span>
              {maxDurationLabel && !isLogout && (
                <span
                  className="absolute right-1.5 top-1.5 rounded-full border px-1.5 py-0.5 text-[10px] font-medium leading-none"
                  style={badgeStyle}
                >
                  {maxDurationLabel}
                </span>
              )}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
