import { format } from 'date-fns';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DateRangePresetPicker } from '@/components/filters/DateRangePresetPicker';
import { StatusSelect } from '@/components/status/StatusSelect';
import { EntitySelect } from '@/components/entity/EntitySelect';
import { StaffPickerButton, type SelectedStaff } from '@/components/staff/StaffPickerButton';
import { useStatuses } from '@/hooks/useAttendance';
import { useDepartments } from '@/hooks/useDepartment';
import type { IAttendanceReportParams } from '@/api/reports.api';
import { safeArray } from '@/lib/safeArray';

// ── Public types ──────────────────────────────────────────────────────────────

export interface ReportFilterValue {
  startDate: string;
  endDate: string;
  statusId: string;
  departmentId: string;
  /** Full staff object for display; only `id` goes to the API */
  selectedStaff: SelectedStaff | null;
}

export function defaultReportFilter(): ReportFilterValue {
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  return {
    startDate: format(firstOfMonth, 'yyyy-MM-dd'),
    endDate: format(now, 'yyyy-MM-dd'),
    statusId: '',
    departmentId: '',
    selectedStaff: null,
  };
}

export function toAttendanceParams(
  v: ReportFilterValue,
): Omit<IAttendanceReportParams, 'page' | 'limit'> {
  return {
    startDate: v.startDate,
    endDate: v.endDate,
    statusId: v.statusId || undefined,
    departmentId: v.departmentId || undefined,
    staffId: v.selectedStaff?.id || undefined,
    clientTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

interface ReportFilterBarSlots {
  staff?: boolean;
  department?: boolean;
  export?: boolean;
}

interface ReportFilterBarProps {
  value: ReportFilterValue;
  onChange: (next: ReportFilterValue) => void;
  onReset?: () => void;
  onExport?: () => void;
  isExporting?: boolean;
  slots?: ReportFilterBarSlots;
}

export function ReportFilterBar({
  value,
  onChange,
  onReset,
  onExport,
  isExporting = false,
  slots = {},
}: ReportFilterBarProps) {
  const showStaff = slots.staff ?? false;
  const showDepartment = slots.department ?? false;
  const showExport = slots.export ?? true;

  const { data: rawStatuses } = useStatuses();
  const statuses = safeArray(rawStatuses);
  const { data: departmentsData } = useDepartments();
  const departments = safeArray(departmentsData?.data);

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-end gap-3">
        <DateRangePresetPicker
          value={{ startDate: value.startDate, endDate: value.endDate }}
          onChange={({ startDate, endDate }) =>
            onChange({ ...value, startDate: startDate ?? '', endDate: endDate ?? '' })
          }
          className="w-full sm:w-[20rem]"
          testId="attendance-report-date-range-filter"
        />

        <StatusSelect
          label="Status"
          value={value.statusId}
          options={statuses}
          placeholder="Choose a status to filter"
          emptyLabel="All statuses"
          onValueChange={(v) => onChange({ ...value, statusId: v })}
          className="w-full sm:w-[18rem]"
          triggerClassName="w-full"
          testId="report-status-filter"
        />

        {showDepartment && (
          <EntitySelect
            label="Department"
            value={value.departmentId}
            onValueChange={(v) => onChange({ ...value, departmentId: v })}
            options={departments}
            emptyLabel="All departments"
            placeholder="Filter by department"
            entityType="DEPARTMENT"
            className="w-full sm:w-auto"
            triggerClassName="w-full sm:min-w-[15rem]"
            testId="report-department-filter"
          />
        )}

        {showStaff && (
          <StaffPickerButton
            value={value.selectedStaff}
            onSelect={(staff) => onChange({ ...value, selectedStaff: staff })}
            label="Staff"
            placeholder="All staff"
            testId="attendance-report-staff-filter"
          />
        )}

        <div className="flex gap-2 self-end">
          {onReset && (
            <Button
              variant="outline"
              onClick={onReset}
              data-testid="attendance-report-reset-button"
            >
              Reset
            </Button>
          )}
          {showExport && onExport && (
            <Button
              variant="outline"
              onClick={onExport}
              disabled={isExporting}
              data-testid="attendance-report-export-button"
            >
              <Download className="mr-2 h-4 w-4" />
              {isExporting ? 'Exporting...' : 'Export Excel'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
