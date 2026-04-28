import { Circle } from 'lucide-react';
import { AppIcon } from '@/components/AppIcon';
import { cn } from '@/lib/utils';
import { useDropdownDisplayConfigs } from '@/hooks/useDropdownDisplay';
import { resolvePrimary, resolveSecondary } from '@/lib/dropdownFieldResolver';
import type { DropdownEntityType } from '@shared/constants/dropdown-display';

export interface VisualEntityOption {
  id: string;
  name: string;
  displayName?: string | null;
  code?: string | null;
  colorHex?: string | null;
  iconId?: string | null;
}

export const DEFAULT_VISUAL_COLOR = '#64748b';

export function getVisualLabel(option?: Pick<VisualEntityOption, 'name' | 'displayName'> | null) {
  return option?.displayName?.trim() || option?.name || 'Unnamed';
}

export function getVisualColor(colorHex?: string | null) {
  const normalized = colorHex?.trim();
  return normalized || DEFAULT_VISUAL_COLOR;
}

export function toRgba(hexColor: string, alpha: number) {
  const normalized = hexColor.replace('#', '').trim();
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return `rgba(100, 116, 139, ${alpha})`;
  }

  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function getFallbackInitial(label: string) {
  return label.trim().charAt(0).toUpperCase() || '•';
}

interface EntityAvatarProps {
  name?: string;
  colorHex?: string | null;
  iconId?: string | null;
  className?: string;
  iconClassName?: string;
}

export function EntityAvatar({ name, colorHex, iconId, className, iconClassName }: EntityAvatarProps) {
  const label = name?.trim() || 'Entity';
  const color = getVisualColor(colorHex);

  return (
    <span
      className={cn('flex shrink-0 items-center justify-center rounded-full border', className)}
      style={{
        color,
        borderColor: toRgba(color, 0.22),
        backgroundColor: toRgba(color, 0.14),
      }}
      aria-hidden
    >
      {iconId ? (
        <AppIcon iconId={iconId} alt={label} className={cn('h-4 w-4', iconClassName)} fallback={<Circle className={cn('h-4 w-4', iconClassName)} />} />
      ) : (
        <span className="text-[0.7rem] font-semibold uppercase leading-none">{getFallbackInitial(label)}</span>
      )}
    </span>
  );
}

interface EntityOptionRowProps {
  option?: VisualEntityOption | null;
  fallbackLabel?: string;
  metaLabel?: string | null;
  className?: string;
  hideSecondary?: boolean;
  /**
   * When provided, the row reads the S09 company-wide display config for this
   * entity type and renders primary/secondary lines accordingly. When omitted,
   * falls back to the legacy (name + code) layout — keeps untouched callers
   * working.
   */
  entityType?: DropdownEntityType;
  /**
   * Optional override so S09 preview can render using a config that is NOT
   * yet saved to the server.
   */
  configOverride?: { primaryField: string; secondaryFields: string[] };
}

export function EntityOptionRow({
  option,
  fallbackLabel,
  metaLabel,
  className,
  hideSecondary,
  entityType,
  configOverride,
}: EntityOptionRowProps) {
  const { configsMap } = useDropdownDisplayConfigs();

  if (!option) {
    return (
      <div className={cn('flex min-w-0 items-center gap-2', className)}>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-dashed border-border bg-muted text-muted-foreground">
          <Circle className="h-3.5 w-3.5 fill-current" aria-hidden />
        </span>
        <div className="min-w-0 text-left">
          <p className="truncate font-medium">{fallbackLabel ?? 'No selection'}</p>
          {!hideSecondary && <p className="truncate text-xs text-muted-foreground">Choose an option</p>}
        </div>
      </div>
    );
  }

  // Config-driven rendering (opt-in via entityType prop).
  if (entityType || configOverride) {
    const cfg = configOverride ?? configsMap[entityType!];
    const primary = resolvePrimary(option, cfg.primaryField);
    const secondary = resolveSecondary(option, cfg.secondaryFields);

    return (
      <div className={cn('flex min-w-0 items-center gap-2', className)}>
        <EntityAvatar name={primary} colorHex={option.colorHex} iconId={option.iconId} className="h-8 w-8" />
        <div className="min-w-0 flex-1 text-left">
          <p className="truncate font-medium text-foreground">{primary}</p>
          {!hideSecondary && secondary && (
            <p className="truncate text-xs text-muted-foreground">{secondary}</p>
          )}
        </div>
      </div>
    );
  }

  // Legacy behaviour — unchanged for callers that haven't migrated.
  const label = getVisualLabel(option);
  const secondary = metaLabel ?? option.code?.trim() ?? null;

  return (
    <div className={cn('flex min-w-0 items-center gap-2', className)}>
      <EntityAvatar name={label} colorHex={option.colorHex} iconId={option.iconId} className="h-8 w-8" />
      <div className="min-w-0 flex-1 text-left">
        <p className="truncate font-medium text-foreground">{label}</p>
        {!hideSecondary && <p className="truncate text-xs text-muted-foreground">{secondary || 'Visual option'}</p>}
      </div>
    </div>
  );
}