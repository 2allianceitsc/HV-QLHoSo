import * as React from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, X } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectTrigger,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { EntityOptionRow, type VisualEntityOption } from './entityVisuals';
import type { DropdownEntityType } from '@shared/constants/dropdown-display';

// Custom SelectItem that puts the ✓ indicator on the RIGHT so it doesn't
// clash with the entity avatar/icon on the left.
const EntitySelectItem = React.forwardRef<
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
))
EntitySelectItem.displayName = 'EntitySelectItem';

const EMPTY_VALUE = '__entity_select_empty__';

interface EntitySelectProps<TOption extends VisualEntityOption> {
  value?: string;
  onValueChange: (value: string) => void;
  options: TOption[];
  placeholder?: string;
  emptyLabel?: string;
  label?: string;
  className?: string;
  triggerClassName?: string;
  contentClassName?: string;
  testId?: string;
  getMetaLabel?: (option: TOption) => string | null | undefined;
  /** Enable S09 config-driven display for this dropdown. */
  entityType?: DropdownEntityType;
}

export function EntitySelect<TOption extends VisualEntityOption>({
  value = '',
  onValueChange,
  options,
  placeholder = 'Select item',
  emptyLabel = 'All items',
  label,
  className,
  triggerClassName,
  contentClassName,
  testId,
  getMetaLabel,
  entityType,
}: EntitySelectProps<TOption>) {
  const selectedOption = options.find((option) => option.id === value) ?? null;
  const resolvedValue = value || EMPTY_VALUE;

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {label ? <label className="text-xs font-medium text-muted-foreground">{label}</label> : null}
      <Select value={resolvedValue} onValueChange={(nextValue) => onValueChange(nextValue === EMPTY_VALUE ? '' : nextValue)}>
        <SelectTrigger
          data-testid={testId}
          aria-label={label ?? placeholder}
          className={cn(
            'h-11 min-w-[15rem] rounded-xl border-border/70 bg-gradient-to-br from-background via-background to-muted/40 px-3 shadow-sm transition-colors hover:border-primary/40',
            triggerClassName,
          )}
        >
          <div className="flex min-w-0 flex-1 items-center">
            <EntityOptionRow
              option={selectedOption}
              fallbackLabel={selectedOption ? undefined : emptyLabel}
              metaLabel={selectedOption && getMetaLabel ? getMetaLabel(selectedOption) : undefined}
              entityType={entityType}
            />
          </div>
          {selectedOption && (
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
          <EntitySelectItem value={EMPTY_VALUE}>
            <EntityOptionRow fallbackLabel={emptyLabel} />
          </EntitySelectItem>
          {options.map((option) => (
            <EntitySelectItem key={option.id} value={option.id}>
              <EntityOptionRow
                option={option}
                metaLabel={getMetaLabel ? getMetaLabel(option) : undefined}
                entityType={entityType}
              />
            </EntitySelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}