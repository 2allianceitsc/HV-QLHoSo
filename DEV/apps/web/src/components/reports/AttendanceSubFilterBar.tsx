import { format } from 'date-fns';
import { useAuthStore } from '@/stores/auth.store';
import { DateRangePresetPicker } from '@/components/filters/DateRangePresetPicker';
import { EntitySelect } from '@/components/entity/EntitySelect';
import { StaffPickerButton, type SelectedStaff } from '@/components/staff/StaffPickerButton';
import { Button } from '@/components/ui/button';
import { useCompanies } from '@/hooks/useCompany';
import { useDepartments } from '@/hooks/useDepartment';
import { useTeams } from '@/hooks/useTeam';

export interface AttendanceSharedFilter {
  startDate: string;
  endDate: string;
  companyId: string;
  departmentId: string;
  teamId: string;
  staff: SelectedStaff | null;
}

export function getDefaultSharedFilter(): AttendanceSharedFilter {
  const today = format(new Date(), 'yyyy-MM-dd');
  return {
    startDate: today,
    endDate: today,
    companyId: '',
    departmentId: '',
    teamId: '',
    staff: null,
  };
}

interface AttendanceSubFilterBarProps {
  value: AttendanceSharedFilter;
  onChange: (value: AttendanceSharedFilter) => void;
  onExport?: () => void;
  isExporting?: boolean;
  testIdPrefix?: string;
}

export function AttendanceSubFilterBar({
  value,
  onChange,
  onExport,
  isExporting,
  testIdPrefix = 'subfilter',
}: AttendanceSubFilterBarProps) {
  const roles = useAuthStore((s) => s.user?.roles ?? []);
  const isSuperAdmin = roles.includes('SUPER_ADMIN');

  const { data: companiesData } = useCompanies({ limit: 100 });
  const { data: deptsData } = useDepartments({ companyId: value.companyId || undefined, limit: 200 });
  const { data: teamsData } = useTeams({ companyId: value.companyId || undefined, limit: 200 });

  const today = format(new Date(), 'yyyy-MM-dd');
  const hasFilters = !!value.companyId || !!value.departmentId || !!value.teamId || !!value.staff || value.startDate !== today || value.endDate !== today;

  function resetFilter() {
    onChange(getDefaultSharedFilter());
  }

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-end gap-3">
        <DateRangePresetPicker
          value={{ startDate: value.startDate, endDate: value.endDate }}
          onChange={({ startDate: s, endDate: e }) => onChange({ ...value, startDate: s ?? today, endDate: e ?? today })}
          className="w-full sm:w-[20rem]"
          testId={`${testIdPrefix}-date-range`}
        />
        {isSuperAdmin && (
          <EntitySelect
            label="Company"
            value={value.companyId}
            onValueChange={(id) => onChange({ ...value, companyId: id, departmentId: '', teamId: '', staff: null })}
            options={companiesData?.data ?? []}
            emptyLabel="All companies"
            placeholder="Filter by company"
            entityType="COMPANY"
            triggerClassName="min-w-[13rem]"
            testId={`${testIdPrefix}-company-select`}
          />
        )}
        <EntitySelect
          label="Department"
          value={value.departmentId}
          onValueChange={(id) => onChange({ ...value, departmentId: id, staff: null })}
          options={deptsData?.data ?? []}
          emptyLabel="All departments"
          placeholder="Filter by department"
          entityType="DEPARTMENT"
          triggerClassName="min-w-[13rem]"
          testId={`${testIdPrefix}-department-select`}
        />
        <EntitySelect
          label="Team"
          value={value.teamId}
          onValueChange={(id) => onChange({ ...value, teamId: id, staff: null })}
          options={teamsData?.data ?? []}
          emptyLabel="All teams"
          placeholder="Filter by team"
          entityType="TEAM"
          triggerClassName="min-w-[11rem]"
          testId={`${testIdPrefix}-team-select`}
        />
        <StaffPickerButton
          value={value.staff}
          onSelect={(s) => onChange({ ...value, staff: s })}
          label="Staff"
          placeholder="All staff"
          testId={`${testIdPrefix}-staff-picker`}
        />
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground invisible" aria-hidden="true">Actions</span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={resetFilter} disabled={!hasFilters} className="h-11 rounded-xl" data-testid={`${testIdPrefix}-reset-button`}>
              Reset
            </Button>
            {onExport && (
              <Button
                variant="outline"
                onClick={onExport}
                disabled={isExporting}
                className="h-11 rounded-xl"
                data-testid={`${testIdPrefix}-export-button`}
              >
                {isExporting ? 'Exporting…' : 'Export Excel'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
