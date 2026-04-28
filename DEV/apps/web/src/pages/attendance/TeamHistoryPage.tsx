import { useState } from 'react';
import { formatDateTime } from '@/lib/dateFormat';
import { useTeamHistory } from '@/hooks/useAttendance';
import { Button } from '@/components/ui/button';
import { DateRangePresetPicker, useFilterState } from '@/components/filters';
import { TablePagination } from '@/components/ui/TablePagination';
import { OverbreakBadge, calcOverbreakSeconds } from '@/components/attendance/OverbreakBadge';
import { getMultiStaffAttendanceEndDisplay } from '@/lib/attendanceEndStatus';
import { safeArray } from '@/lib/safeArray';
import { StaffPickerButton, type SelectedStaff } from '@/components/staff/StaffPickerButton';
import { useAuthStore } from '@/stores/auth.store';

function formatDuration(seconds: number | null | undefined): string {
  if (!seconds) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${seconds % 60}s`;
}

// Staff object persisted for display; only `id` goes to the API
type TeamHistoryFilter = {
  startDate: string;
  endDate: string;
  selectedStaff: SelectedStaff | null;
} & Record<string, unknown>;
const DEFAULT_FILTER: TeamHistoryFilter = { startDate: '', endDate: '', selectedStaff: null };

export function TeamHistoryPage() {
  const { user } = useAuthStore();
  const isSuperAdmin = user?.roles?.includes('SUPER_ADMIN') ?? false;
  const [page, setPage] = useState(1);
  const [filter, setFilter, resetFilter] = useFilterState<TeamHistoryFilter>({
    key: 'hvflow.team-history.filter',
    defaultValue: DEFAULT_FILTER,
    mode: 'localStorage',
  });

  const { data, isLoading } = useTeamHistory({
    page,
    limit: 20,
    staffId: filter.selectedStaff?.id || undefined,
    startDate: filter.startDate || undefined,
    endDate: filter.endDate || undefined,
    clientTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });

  const records = safeArray(data?.data);
  const pagination = data?.pagination;

  function updateFilter(patch: Partial<TeamHistoryFilter>) {
    setFilter((f) => ({ ...f, ...patch }));
    setPage(1);
  }

  const handleReset = () => {
    resetFilter();
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Team Attendance</h1>
        <p className="text-sm text-muted-foreground">View your team's attendance records</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-end gap-3 rounded-xl border bg-card p-4 shadow-sm">
        <StaffPickerButton
          value={filter.selectedStaff}
          onSelect={(s) => updateFilter({ selectedStaff: s })}
          label="Staff"
          placeholder="All staff"
        />
        <DateRangePresetPicker
          value={{ startDate: filter.startDate, endDate: filter.endDate }}
          onChange={({ startDate: nextStartDate, endDate: nextEndDate }) =>
            updateFilter({ startDate: nextStartDate ?? '', endDate: nextEndDate ?? '' })
          }
          className="w-full sm:w-[20rem]"
        />
        <div className="flex flex-col gap-1">
          <span className="text-xs invisible select-none" aria-hidden="true">Reset</span>
          <Button variant="outline" onClick={handleReset} className="h-10 w-full sm:w-auto">Reset</Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card shadow-sm">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex h-32 items-center justify-center">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : records.length === 0 ? (
            <div className="flex h-32 items-center justify-center">
              <p className="text-sm text-muted-foreground">No records found</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
                  <th className="px-6 py-3 font-medium">Staff</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">Start</th>
                  <th className="px-6 py-3 font-medium">End</th>
                  <th className="px-6 py-3 font-medium">Duration</th>
                  <th className="px-6 py-3 font-medium">Overbreak</th>
                  <th className="px-6 py-3 font-medium">Notes</th>
                  {isSuperAdmin && <th className="px-6 py-3 font-medium">Debug Info</th>}
                  <th className="px-6 py-3 font-medium">Created At</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {records.map((record, index) => {
                  const endDisplay = getMultiStaffAttendanceEndDisplay(records, index, (item) => item.staffId);

                  return <tr key={record.id} className="hover:bg-muted/30">
                    <td className="px-6 py-3">
                      <div>
                        <p className="font-medium">
                          {record.staff?.firstName} {record.staff?.surname}
                        </p>
                        <p className="text-xs text-muted-foreground">{record.staff?.employeeId ?? '—'}</p>
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-block h-2 w-2 rounded-full"
                          style={{ backgroundColor: record.status.colorHex ?? '#6b7280' }}
                        />
                        {record.status.displayName ?? record.status.name}
                      </div>
                    </td>
                    <td className="px-6 py-3 font-mono text-xs">
                      {formatDateTime(record.startTime)}
                    </td>
                    <td className="px-6 py-3 font-mono text-xs">
                      {record.endTime
                        ? formatDateTime(record.endTime)
                        : <span className={endDisplay?.className}>{endDisplay?.label}</span>}
                    </td>
                    <td className="px-6 py-3 font-mono text-xs">
                      {formatDuration(record.durationSeconds)}
                    </td>
                    <td className="px-6 py-3">
                      <OverbreakBadge
                        overbreakSeconds={calcOverbreakSeconds(
                          record.durationSeconds,
                          record.status.isBreak,
                          record.status.maxDurationSeconds,
                        )}
                      />
                    </td>
                    <td className="px-6 py-3 text-xs text-muted-foreground">
                      {record.notes ?? '—'}
                    </td>
                    {isSuperAdmin && (
                      <td className="px-6 py-3 font-mono text-xs text-muted-foreground">
                        {record.debugInfo ?? '—'}
                      </td>
                    )}
                    <td className="px-6 py-3 font-mono text-xs text-muted-foreground">
                      {formatDateTime(record.logCreatedAt)}
                    </td>
                  </tr>;
                })}
              </tbody>
            </table>
          )}
        </div>

        {pagination && (
          <TablePagination
            page={page}
            totalPages={pagination.totalPages}
            total={pagination.total}
            onPageChange={setPage}
          />
        )}
      </div>
    </div>
  );
}
