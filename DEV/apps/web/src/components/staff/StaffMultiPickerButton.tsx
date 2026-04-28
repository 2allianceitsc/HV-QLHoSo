import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, X, Check, Plus, ChevronDown } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserAvatar } from '@/components/UserAvatar';
import { getEmployees } from '@/api/employee.api';
import { safeArray } from '@/lib/safeArray';
import type { IEmployee } from '@/api/employee.api';
import { cn } from '@/lib/utils';
import type { SelectedStaff } from './StaffPickerButton';

export type { SelectedStaff };

export interface StaffMultiPickerButtonProps {
  value: SelectedStaff[];
  onSelect: (staff: SelectedStaff[]) => void;
  label?: string;
  placeholder?: string;
  className?: string;
  testId?: string;
}

function useDebounce(value: string, delay: number): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export function StaffMultiPickerButton({
  value,
  onSelect,
  label,
  placeholder = 'Assign managers',
  className,
  testId,
}: StaffMultiPickerButtonProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  // internal selection state — initialized from value on open
  const [selection, setSelection] = useState<SelectedStaff[]>([]);
  const debouncedSearch = useDebounce(search, 300);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['employees', 'multi-picker', debouncedSearch],
    queryFn: () => getEmployees({ search: debouncedSearch || undefined, limit: 30 }),
    enabled: open,
    staleTime: 30_000,
  });
  const employees = safeArray(data?.data);

  // Sync selection from value when dialog opens; clear search on close
  useEffect(() => {
    if (open) {
      setSelection(value);
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setSearch('');
    }
  }, [open]); // intentionally omit `value` — snapshot on open

  function isSelected(id: string) {
    return selection.some((s) => s.id === id);
  }

  function toggleEmployee(emp: IEmployee) {
    const staff: SelectedStaff = {
      id: emp.id,
      firstName: emp.firstName,
      surname: emp.surname,
      employeeId: emp.employeeId,
      photo: emp.photoBusiness ?? null,
    };
    setSelection((prev) =>
      prev.some((s) => s.id === emp.id)
        ? prev.filter((s) => s.id !== emp.id)
        : [...prev, staff],
    );
  }

  function removeSelected(id: string) {
    setSelection((prev) => prev.filter((s) => s.id !== id));
  }

  function handleCancel() {
    setOpen(false);
  }

  function handleDone() {
    onSelect(selection);
    setOpen(false);
  }

  function handleClearAll(e: React.MouseEvent) {
    e.stopPropagation();
    onSelect([]);
  }

  const hasValue = value.length > 0;
  const avatarsToShow = value.slice(0, 3);

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {label && (
        <label className="text-xs font-medium text-muted-foreground">{label}</label>
      )}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => setOpen(true)}
          data-testid={testId}
          className={cn(
            'flex h-11 min-w-[14rem] items-center justify-between gap-2 rounded-xl border border-border/70 bg-gradient-to-br from-background via-background to-muted/40 px-3 text-sm shadow-sm transition-colors hover:border-primary/40',
            hasValue ? 'text-foreground' : 'text-muted-foreground',
          )}
        >
          <div className="flex items-center gap-2 min-w-0">
            {hasValue ? (
              <>
                {/* overlapping avatars */}
                <div className="flex -space-x-1.5">
                  {avatarsToShow.map((s) => (
                    <UserAvatar
                      key={s.id}
                      src={s.photo}
                      firstName={s.firstName}
                      surname={s.surname}
                      size="xs"
                      className="ring-2 ring-background"
                    />
                  ))}
                </div>
                <span className="truncate">{value.length} selected</span>
              </>
            ) : (
              <span className="truncate">{placeholder}</span>
            )}
          </div>
          <ChevronDown size={14} className="text-muted-foreground flex-shrink-0" />
        </button>
        {hasValue && (
          <button
            type="button"
            onClick={handleClearAll}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-border/70 bg-gradient-to-br from-background via-background to-muted/40 shadow-sm hover:border-primary/40 text-muted-foreground hover:text-foreground transition-colors"
            title="Clear all"
          >
            <X size={14} />
          </button>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md p-0" aria-describedby={undefined}>
          <DialogHeader className="px-4 pt-4 pb-2">
            <DialogTitle>Select Managers</DialogTitle>
          </DialogHeader>

          {/* Search */}
          <div className="px-4 pb-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={inputRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or employee ID..."
                className="pl-8"
              />
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto border-t">
            {/* Selected section */}
            {selection.length > 0 && (
              <>
                <div className="px-4 py-1.5 bg-muted/40">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Selected ({selection.length})
                  </p>
                </div>
                {selection.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center gap-3 px-4 py-2.5 bg-primary/5"
                  >
                    <UserAvatar src={s.photo} firstName={s.firstName} surname={s.surname} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{s.firstName} {s.surname}</p>
                      <p className="text-xs text-muted-foreground">{s.employeeId}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeSelected(s.id)}
                      className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      title="Remove"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
                <div className="border-t border-border/50" />
              </>
            )}

            {/* Results section */}
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : employees.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">No staff found</p>
            ) : (
              employees.map((emp) => {
                const sel = isSelected(emp.id);
                return (
                  <button
                    key={emp.id}
                    type="button"
                    onClick={() => toggleEmployee(emp)}
                    className={cn(
                      'flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors hover:bg-muted/50',
                      sel && 'bg-primary/10',
                    )}
                  >
                    <UserAvatar
                      src={emp.photoBusiness}
                      firstName={emp.firstName}
                      surname={emp.surname}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{emp.firstName} {emp.surname}</p>
                      <p className="text-xs text-muted-foreground">{emp.employeeId}</p>
                    </div>
                    <span className={cn(
                      'flex h-5 w-5 items-center justify-center rounded-full border flex-shrink-0 transition-colors',
                      sel
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border text-muted-foreground',
                    )}>
                      {sel ? <Check size={11} /> : <Plus size={11} />}
                    </span>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="border-t px-4 py-3 flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={handleCancel}>Cancel</Button>
            <Button size="sm" onClick={handleDone}>
              Done {selection.length > 0 && `(${selection.length})`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
