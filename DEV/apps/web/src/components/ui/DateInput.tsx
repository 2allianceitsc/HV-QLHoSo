import { forwardRef } from 'react';
import DatePicker, { registerLocale } from 'react-datepicker';
import { vi } from 'date-fns/locale';
import { format } from 'date-fns';
import { CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';
import 'react-datepicker/dist/react-datepicker.css';

registerLocale('vi', vi);

function parseIso(v?: string): Date | null {
  if (!v) return null;
  const [y, m, d] = v.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return isNaN(dt.getTime()) ? null : dt;
}

export interface DateInputProps {
  value?: string;           // YYYY-MM-DD
  onChange?: (v: string) => void;
  onBlur?: () => void;
  name?: string;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}

// Inner input forwarded to react-datepicker; calendar icon is pointer-events-none
// so clicks fall through to the underlying <input>, which opens the picker.
const InnerInput = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <div className="relative w-full">
      <input
        ref={ref}
        {...props}
        className={cn(
          'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 pr-8 text-sm shadow-sm transition-colors',
          'placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
      />
      <CalendarDays
        size={14}
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
      />
    </div>
  ),
);
InnerInput.displayName = 'InnerInput';

export function DateInput({
  value,
  onChange,
  onBlur,
  name,
  className,
  placeholder = 'DD/MM/YYYY',
  disabled,
}: DateInputProps) {
  return (
    <DatePicker
      selected={parseIso(value)}
      onChange={(date) => onChange?.(date ? format(date, 'yyyy-MM-dd') : '')}
      onBlur={onBlur}
      name={name}
      dateFormat="dd/MM/yyyy"
      locale="vi"
      placeholderText={placeholder}
      disabled={disabled}
      wrapperClassName="w-full"
      popperProps={{ strategy: 'fixed' }}
      portalId="date-input-portal"
      customInput={<InnerInput className={className} />}
    />
  );
}
