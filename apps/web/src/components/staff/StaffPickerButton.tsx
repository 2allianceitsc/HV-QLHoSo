import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, X, ChevronDown } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserAvatar } from '@/components/UserAvatar';
import { getEmployees } from '@/api/employee.api';
import { safeArray } from '@/lib/safeArray';
import type { IEmployee } from '@/api/employee.api';
import { cn } from '@/lib/utils';

export interface SelectedStaff {
  id: string;
  firstName: string;
  surname: string;
  employeeId: string;
  photo: string | null;
}

interface StaffPickerButtonProps {
  value: SelectedStaff | null;
  onSelect: (staff: SelectedStaff | null) => void;
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

export function StaffPickerButton({
  value,
  onSelect,
  label = 'Staff',
  placeholder = 'All staff',
  className,
  testId,
}: StaffPickerButtonProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['employees', 'picker', debouncedSearch],
    queryFn: () => getEmployees({ search: debouncedSearch || undefined, limit: 30 }),
    enabled: open,
    staleTime: 30_000,
  });
  const employees = safeArray(data?.data);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setSearch('');
    }
  }, [open]);

  function handleSelect(emp: IEmployee) {
    onSelect({
      id: emp.id,
      firstName: emp.firstName,
      surname: emp.surname,
      employeeId: emp.employeeId,
      photo: emp.photoBusiness ?? null,
    });
    setOpen(false);
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    onSelect(null);
  }

  const displayName = value ? `${value.firstName} ${value.surname}` : placeholder;
  const hasValue = !!value;

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
            'flex h-11 min-w-[12rem] items-center justify-between gap-2 rounded-xl border border-border/70 bg-gradient-to-br from-background via-background to-muted/40 px-3 text-sm shadow-sm transition-colors hover:border-primary/40',
            hasValue ? 'text-foreground' : 'text-muted-foreground',
          )}
        >
          <div className="flex items-center gap-2 min-w-0">
            {hasValue && (
              <UserAvatar
                src={value!.photo}
                firstName={value!.firstName}
                surname={value!.surname}
                size="xs"
              />
            )}
            <span className="truncate">{displayName}</span>
          </div>
          <ChevronDown size={14} className="text-muted-foreground flex-shrink-0" />
        </button>
        {hasValue && (
          <button
            type="button"
            onClick={handleClear}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-border/70 bg-gradient-to-br from-background via-background to-muted/40 shadow-sm hover:border-primary/40 text-muted-foreground hover:text-foreground transition-colors"
            title="Clear"
          >
            <X size={14} />
          </button>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md p-0" aria-describedby={undefined}>
          <DialogHeader className="px-4 pt-4 pb-2">
            <DialogTitle>Select Staff</DialogTitle>
          </DialogHeader>

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

          <div className="max-h-72 overflow-y-auto border-t">
            {/* Clear option */}
            <button
              type="button"
              onClick={() => { onSelect(null); setOpen(false); }}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-muted-foreground hover:bg-muted/50 transition-colors"
            >
              <span className="italic">All staff</span>
            </button>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : employees.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">No staff found</p>
            ) : (
              employees.map((emp) => {
                const isSelected = value?.id === emp.id;
                return (
                  <button
                    key={emp.id}
                    type="button"
                    onClick={() => handleSelect(emp)}
                    className={cn(
                      'flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors hover:bg-muted/50',
                      isSelected && 'bg-primary/10',
                    )}
                  >
                    <UserAvatar
                      src={emp.photoBusiness}
                      firstName={emp.firstName}
                      surname={emp.surname}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">
                        {emp.firstName} {emp.surname}
                      </p>
                      <p className="text-xs text-muted-foreground">{emp.employeeId}</p>
                    </div>
                    {isSelected && (
                      <span className="text-xs text-primary font-medium flex-shrink-0">Selected</span>
                    )}
                  </button>
                );
              })
            )}
          </div>

          <div className="border-t px-4 py-3 flex justify-end">
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
