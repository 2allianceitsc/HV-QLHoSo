import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { useAttendanceReport, useExportReport, useLateArrivals, useOverBreaks, useAutoLogouts, useAbsences, useOvertime, useDailyLog, useExportDailyLog } from '@/hooks/useReports';
import { usePersistentState } from '@/hooks/usePersistentState';
import { useTabState } from '@/hooks/useTabState';
import { usePermission } from '@/hooks/usePermission';
import { AttendanceSubFilterBar, AttendanceSharedFilter, getDefaultSharedFilter } from '@/components/reports/AttendanceSubFilterBar';

import { ReportFilterBar, defaultReportFilter, toAttendanceParams } from '@/components/reports/ReportFilterBar';
import type { ReportFilterValue } from '@/components/reports/ReportFilterBar';
import { ReportTable } from '@/components/reports/ReportTable';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { safeArray } from '@/lib/safeArray';
import type { IAttendanceSubParams, ILateArrivalStaff, IOverBreakStaff, IAutoLogoutStaff, IAbsenceStaff, IOvertimeStaff, IDailyLogRow } from '@/api/reports.api';
import { UserAvatar } from '@/components/UserAvatar';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}



function StaffPhoto({ photo, firstName, surname }: { photo: string | null; firstName: string; surname: string }) {
  return <UserAvatar src={photo} firstName={firstName} surname={surname} size="sm" />;
}

function TableSkeleton({ cols }: { cols: number }) {
  return (
    <div className="animate-pulse space-y-2 p-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex gap-3">
          {[...Array(cols)].map((__, j) => (
            <div key={j} className="h-4 bg-muted rounded flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <tr>
      <td colSpan={99} className="px-6 py-8 text-center text-sm text-muted-foreground">
        No data for the selected period
      </td>
    </tr>
  );
}

// ── Sub-tab filter bar ────────────────────────────────────────────────────────

function toSubParams(filter: AttendanceSharedFilter): IAttendanceSubParams {
  return {
    startDate: filter.startDate,
    endDate: filter.endDate,
    companyId: filter.companyId || undefined,
    departmentId: filter.departmentId || undefined,
    teamId: filter.teamId || undefined,
    staffId: filter.staff?.id || undefined,
    clientTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
}

// ── T2: Late Arrivals ─────────────────────────────────────────────────────────

function LateArrivalRow({ row }: { row: ILateArrivalStaff }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <>
      <tr
        className="hover:bg-muted/30 cursor-pointer"
        onClick={() => setExpanded((p) => !p)}
      >
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <StaffPhoto photo={row.photo} firstName={row.firstName} surname={row.surname} />
            <span className="font-medium">{row.firstName} {row.surname}</span>
          </div>
        </td>
        <td className="px-4 py-3 text-right">{row.lateCount}</td>
        <td className="px-4 py-3 text-right">{row.avgLateMinutes.toFixed(1)} min</td>
        <td className="px-4 py-3 text-right text-muted-foreground text-xs">{expanded ? '▲' : '▼'} {row.details.length} days</td>
      </tr>
      {expanded && row.details.map((d, i) => (
        <tr key={i} className="bg-muted/20 text-xs text-muted-foreground">
          <td className="px-8 py-2" colSpan={1}>{d.date}</td>
          <td className="px-4 py-2" colSpan={1}>In: {d.startTime} / Limit: {d.latestStartTime}</td>
          <td className="px-4 py-2 text-right" colSpan={2}>Late by {d.lateMinutes} min</td>
        </tr>
      ))}
    </>
  );
}

function LateArrivalsTab({ filter, onFilterChange }: { filter: AttendanceSharedFilter; onFilterChange: (v: AttendanceSharedFilter) => void }) {
  const { data, isLoading } = useLateArrivals(toSubParams(filter));
  const rows = safeArray(data?.data);

  return (
    <div className="space-y-4">
      <AttendanceSubFilterBar value={filter} onChange={onFilterChange} testIdPrefix="late-arrivals" />
      <div className="rounded-xl border bg-card shadow-sm overflow-x-auto">
        {isLoading ? (
          <TableSkeleton cols={4} />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">Staff</th>
                <th className="px-4 py-3 font-medium text-right">Late Count</th>
                <th className="px-4 py-3 font-medium text-right">Avg Late (min)</th>
                <th className="px-4 py-3 font-medium text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.length === 0 ? <EmptyState /> : rows.map((r) => <LateArrivalRow key={r.staffId} row={r} />)}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── T3: Over-Break ────────────────────────────────────────────────────────────

function OverBreakRow({ row }: { row: IOverBreakStaff }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <>
      <tr className="hover:bg-muted/30 cursor-pointer" onClick={() => setExpanded((p) => !p)}>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <StaffPhoto photo={row.photo} firstName={row.firstName} surname={row.surname} />
            <span className="font-medium">{row.firstName} {row.surname}</span>
          </div>
        </td>
        <td className="px-4 py-3 text-right">{row.overBreakCount}</td>
        <td className="px-4 py-3 text-right">{formatDuration(row.totalExcessSeconds)}</td>
        <td className="px-4 py-3 text-right text-muted-foreground text-xs">{expanded ? '▲' : '▼'} {row.details.length} days</td>
      </tr>
      {expanded && row.details.map((d, i) => (
        <tr key={i} className="bg-muted/20 text-xs text-muted-foreground">
          <td className="px-8 py-2">
            <div className="flex flex-col gap-0.5">
              <span>{d.date}</span>
              <span className="flex items-center gap-1">
                {d.statusColorHex && (
                  <span className="inline-block h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: d.statusColorHex }} />
                )}
                <span className="font-medium text-foreground">{d.statusName}</span>
              </span>
            </div>
          </td>
          <td className="px-4 py-2">Duration: {formatDuration(d.durationSeconds)} / Limit: {formatDuration(d.maxBreakSeconds)}</td>
          <td className="px-4 py-2 text-right" colSpan={2}>Excess: {formatDuration(d.excessSeconds)}{d.notes ? ` — ${d.notes}` : ''}</td>
        </tr>
      ))}
    </>
  );
}

function OverBreakTab({ filter, onFilterChange }: { filter: AttendanceSharedFilter; onFilterChange: (v: AttendanceSharedFilter) => void }) {
  const { data, isLoading } = useOverBreaks(toSubParams(filter));
  const rows = safeArray(data?.data);

  return (
    <div className="space-y-4">
      <AttendanceSubFilterBar value={filter} onChange={onFilterChange} testIdPrefix="over-break" />
      <div className="rounded-xl border bg-card shadow-sm overflow-x-auto">
        {isLoading ? (
          <TableSkeleton cols={4} />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">Staff</th>
                <th className="px-4 py-3 font-medium text-right">Over-Break Count</th>
                <th className="px-4 py-3 font-medium text-right">Total Excess</th>
                <th className="px-4 py-3 font-medium text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.length === 0 ? <EmptyState /> : rows.map((r) => <OverBreakRow key={r.staffId} row={r} />)}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── T4: Auto-Logout ───────────────────────────────────────────────────────────

function AutoLogoutRow({ row }: { row: IAutoLogoutStaff }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <>
      <tr className="hover:bg-muted/30 cursor-pointer" onClick={() => setExpanded((p) => !p)}>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <StaffPhoto photo={row.photo} firstName={row.firstName} surname={row.surname} />
            <span className="font-medium">{row.firstName} {row.surname}</span>
          </div>
        </td>
        <td className="px-4 py-3 text-right">{row.totalCount}</td>
        <td className="px-4 py-3 text-right">{row.shiftEndCount}</td>
        <td className="px-4 py-3 text-right">{row.endOfDayCount}</td>
        <td className="px-4 py-3 text-right text-muted-foreground text-xs">{expanded ? '▲' : '▼'} {row.details.length}</td>
      </tr>
      {expanded && row.details.map((d, i) => (
        <tr key={i} className="bg-muted/20 text-xs text-muted-foreground">
          <td className="px-8 py-2" colSpan={2}>{d.date} at {d.time}</td>
          <td className="px-4 py-2 text-right" colSpan={3}>
            <span className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${d.type === 'shift-end' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
              {d.type === 'shift-end' ? 'Shift End' : 'End of Day'}
            </span>
          </td>
        </tr>
      ))}
    </>
  );
}

function AutoLogoutTab({ filter, onFilterChange }: { filter: AttendanceSharedFilter; onFilterChange: (v: AttendanceSharedFilter) => void }) {
  const { data, isLoading } = useAutoLogouts(toSubParams(filter));
  const rows = safeArray(data?.data);

  return (
    <div className="space-y-4">
      <AttendanceSubFilterBar value={filter} onChange={onFilterChange} testIdPrefix="auto-logout" />
      <div className="rounded-xl border bg-card shadow-sm overflow-x-auto">
        {isLoading ? (
          <TableSkeleton cols={5} />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">Staff</th>
                <th className="px-4 py-3 font-medium text-right">Total</th>
                <th className="px-4 py-3 font-medium text-right">Shift End</th>
                <th className="px-4 py-3 font-medium text-right">End of Day</th>
                <th className="px-4 py-3 font-medium text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.length === 0 ? <EmptyState /> : rows.map((r) => <AutoLogoutRow key={r.staffId} row={r} />)}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── T5: Absences ──────────────────────────────────────────────────────────────

function AbsencesTab({ filter, onFilterChange }: { filter: AttendanceSharedFilter; onFilterChange: (v: AttendanceSharedFilter) => void }) {
  const { data, isLoading } = useAbsences(toSubParams(filter));
  const rows = safeArray(data?.data);

  return (
    <div className="space-y-4">
      <AttendanceSubFilterBar value={filter} onChange={onFilterChange} testIdPrefix="absences" />
      <div className="rounded-xl border bg-card shadow-sm overflow-x-auto">
        {isLoading ? (
          <TableSkeleton cols={5} />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">Staff</th>
                <th className="px-4 py-3 font-medium text-right">Absent Days</th>
                <th className="px-4 py-3 font-medium text-right">Normal Day Off</th>
                <th className="px-4 py-3 font-medium text-right">Half Day Off</th>
                <th className="px-4 py-3 font-medium text-right">Total Days</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.length === 0 ? (
                <EmptyState />
              ) : (
                rows.map((r: IAbsenceStaff) => (
                  <tr key={r.staffId} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <StaffPhoto photo={r.photo} firstName={r.firstName} surname={r.surname} />
                        <span className="font-medium">{r.firstName} {r.surname}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">{r.absentDays}</td>
                    <td className="px-4 py-3 text-right">{r.normalDayOff}</td>
                    <td className="px-4 py-3 text-right">{r.halfDayOff}</td>
                    <td className="px-4 py-3 text-right font-medium">{r.totalDays}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── T6: Overtime ──────────────────────────────────────────────────────────────

function OvertimeRow({ row }: { row: IOvertimeStaff }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <>
      <tr className="hover:bg-muted/30 cursor-pointer" onClick={() => setExpanded((p) => !p)}>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <StaffPhoto photo={row.photo} firstName={row.firstName} surname={row.surname} />
            <span className="font-medium">{row.firstName} {row.surname}</span>
          </div>
        </td>
        <td className="px-4 py-3 text-right">{formatDuration(row.totalOvertimeSeconds)}</td>
        <td className="px-4 py-3 text-right text-muted-foreground text-xs">{expanded ? '▲' : '▼'} {row.details.length} days</td>
      </tr>
      {expanded && row.details.map((d, i) => (
        <tr key={i} className="bg-muted/20 text-xs text-muted-foreground">
          <td className="px-8 py-2" colSpan={2}>{d.date}</td>
          <td className="px-4 py-2 text-right">{formatDuration(d.overtimeSeconds)}</td>
        </tr>
      ))}
    </>
  );
}

function OvertimeTab({ filter, onFilterChange }: { filter: AttendanceSharedFilter; onFilterChange: (v: AttendanceSharedFilter) => void }) {
  const { data, isLoading } = useOvertime(toSubParams(filter));
  const rows = safeArray(data?.data);

  return (
    <div className="space-y-4">
      <AttendanceSubFilterBar value={filter} onChange={onFilterChange} testIdPrefix="overtime" />
      <div className="rounded-xl border bg-card shadow-sm overflow-x-auto">
        {isLoading ? (
          <TableSkeleton cols={3} />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">Staff</th>
                <th className="px-4 py-3 font-medium text-right">Total Overtime</th>
                <th className="px-4 py-3 font-medium text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.length === 0 ? <EmptyState /> : rows.map((r) => <OvertimeRow key={r.staffId} row={r} />)}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}


// ── T7: Daily Log ─────────────────────────────────────────────────────────────

function FlagBadge({ value }: { value: boolean }) {
  return value ? (
    <span className="inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium bg-red-100 text-red-700">Yes</span>
  ) : (
    <span className="inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium bg-green-100 text-green-700">No</span>
  );
}

function formatHHMM(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

function formatTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}


function DailyLogTab({ filter, onFilterChange }: { filter: AttendanceSharedFilter; onFilterChange: (v: AttendanceSharedFilter) => void }) {
  const params = toSubParams(filter);
  const { data, isLoading } = useDailyLog(params);
  const exportMutation = useExportDailyLog();
  const rows: IDailyLogRow[] = data?.data ?? [];

  return (
    <div className="space-y-4">
      <AttendanceSubFilterBar 
        value={filter} 
        onChange={onFilterChange} 
        onExport={() => exportMutation.mutate(params)}
        isExporting={exportMutation.isPending}
        testIdPrefix="daily-log" 
      />
      <div className="rounded-xl border bg-card shadow-sm overflow-x-auto">
        {isLoading ? (
          <TableSkeleton cols={11} />
        ) : (
          <table className="w-full text-sm whitespace-nowrap">
            <thead>
              <tr className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
                <th className="px-3 py-3 font-medium">Staff Name</th>
                <th className="px-3 py-3 font-medium">Date</th>
                <th className="px-3 py-3 font-medium">On Duty</th>
                <th className="px-3 py-3 font-medium">Off Duty</th>
                <th className="px-3 py-3 font-medium">Login</th>
                <th className="px-3 py-3 font-medium">Logout</th>
                <th className="px-3 py-3 font-medium text-right">Hours Worked</th>
                <th className="px-3 py-3 font-medium text-center">Late Arrival</th>
                <th className="px-3 py-3 font-medium text-center">Early Departure</th>
                <th className="px-3 py-3 font-medium text-center">Break Exceeded</th>
                <th className="px-3 py-3 font-medium text-center">Auto Logout</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.length === 0 ? (
                <EmptyState />
              ) : (
                rows.map((r, i) => (
                  <tr key={`${r.staffId}-${r.date}-${i}`} className="hover:bg-muted/30">
                    <td className="px-3 py-2 font-medium">{r.staffName}</td>
                    <td className="px-3 py-2">{r.date}</td>
                    <td className="px-3 py-2 text-muted-foreground">{r.onDuty ?? '—'}</td>
                    <td className="px-3 py-2 text-muted-foreground">{r.offDuty ?? '—'}</td>
                    <td className="px-3 py-2">{formatTime(r.login)}</td>
                    <td className="px-3 py-2">{formatTime(r.logout)}</td>
                    <td className="px-3 py-2 text-right">{r.login ? formatHHMM(r.hoursWorkedSeconds) : '—'}</td>
                    <td className="px-3 py-2 text-center"><FlagBadge value={r.lateArrival} /></td>
                    <td className="px-3 py-2 text-center"><FlagBadge value={r.earlyDeparture} /></td>
                    <td className="px-3 py-2 text-center"><FlagBadge value={r.breakExceeded} /></td>
                    <td className="px-3 py-2 text-center"><FlagBadge value={r.autoLogout} /></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
      {rows.length > 0 && (
        <p className="text-right text-xs text-muted-foreground">{rows.length} row(s)</p>
      )}
    </div>
  );
}
// ── Main page ─────────────────────────────────────────────────────────────────

export function AttendanceReportPage() {
  type AttendanceTabId =
    | 'summary'
    | 'late-arrivals'
    | 'over-break'
    | 'auto-logout'
    | 'absences'
    | 'overtime'
    | 'daily-log';

  function isAttendanceTab(value: unknown): value is AttendanceTabId {
    return (
      value === 'summary' ||
      value === 'late-arrivals' ||
      value === 'over-break' ||
      value === 'auto-logout' ||
      value === 'absences' ||
      value === 'overtime' ||
      value === 'daily-log'
    );
  }

  const user = useAuthStore((s) => s.user);
  const roles = user?.roles ?? [];

  const isHrOrAdmin = roles.includes('HR_ADMIN') || roles.includes('SUPER_ADMIN');
  const isManager = roles.includes('MANAGER');
  const isClient = roles.includes('CLIENT');
  const canSeeSubTabs = isHrOrAdmin || isManager;

  const showStaffFilter = isHrOrAdmin || isManager || isClient;
  const showDepartmentFilter = isHrOrAdmin;
  // Export is permission-driven — R01 EXPORT is seeded for MANAGER/HR/CLIENT.
  const showExportButton = usePermission('R01', null, 'EXPORT');

  const isHrOrSuperAdmin = isHrOrAdmin || roles.includes('SUPER_ADMIN');

  const visibleTabs: AttendanceTabId[] = canSeeSubTabs
    ? ['summary', 'late-arrivals', 'over-break', 'auto-logout', 'absences', 'overtime', ...(isHrOrSuperAdmin ? ['daily-log' as const] : [])]
    : ['summary'];

  const [activeTab, setActiveTab] = useTabState<AttendanceTabId>('summary', isAttendanceTab);

  useEffect(() => {
    if (visibleTabs.includes(activeTab)) return;
    setActiveTab('summary');
  }, [activeTab, setActiveTab, visibleTabs]);

  const [page, setPage] = useState(1);
  const [filterValue, setFilterValue] = useState<ReportFilterValue>(defaultReportFilter);

  const [sharedFilter, setSharedFilter] = usePersistentState<AttendanceSharedFilter>('vibe365.attendance.subfilter', getDefaultSharedFilter());

  const summaryParams = toAttendanceParams(filterValue);
  const { data, isLoading } = useAttendanceReport({ ...summaryParams, page, limit: 20 });
  const exportMutation = useExportReport();

  function handleFilterChange(next: ReportFilterValue) {
    setFilterValue(next);
    setPage(1);
  }

  function handleReset() {
    setFilterValue(defaultReportFilter());
    setPage(1);
  }

  function handleExport() {
    exportMutation.mutate(summaryParams);
  }

  const rows = safeArray(data?.data);
  const pagination = data?.pagination;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Attendance Report</h1>
        <p className="text-sm text-muted-foreground">View and export attendance records</p>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as AttendanceTabId)}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="summary">Summary</TabsTrigger>
          {canSeeSubTabs && (
            <>
              <TabsTrigger value="late-arrivals">Late Arrivals</TabsTrigger>
              <TabsTrigger value="over-break">Over-Break</TabsTrigger>
              <TabsTrigger value="auto-logout">Auto-Logout</TabsTrigger>
              <TabsTrigger value="absences">Absences</TabsTrigger>
              <TabsTrigger value="overtime">Overtime</TabsTrigger>
            {isHrOrSuperAdmin && <TabsTrigger value="daily-log">Daily Log</TabsTrigger>}
            </>
          )}
        </TabsList>

        <TabsContent value="summary" className="space-y-4 mt-4">
          <ReportFilterBar
            value={filterValue}
            onChange={handleFilterChange}
            onReset={handleReset}
            onExport={handleExport}
            isExporting={exportMutation.isPending}
            slots={{ staff: showStaffFilter, department: showDepartmentFilter, export: showExportButton }}
          />
          <ReportTable
            rows={rows}
            pagination={pagination}
            isLoading={isLoading}
            page={page}
            onPageChange={setPage}
          />
        </TabsContent>

        {canSeeSubTabs && (
          <>
            <TabsContent value="late-arrivals" className="mt-4">
              <LateArrivalsTab filter={sharedFilter} onFilterChange={setSharedFilter} />
            </TabsContent>
            <TabsContent value="over-break" className="mt-4">
              <OverBreakTab filter={sharedFilter} onFilterChange={setSharedFilter} />
            </TabsContent>
            <TabsContent value="auto-logout" className="mt-4">
              <AutoLogoutTab filter={sharedFilter} onFilterChange={setSharedFilter} />
            </TabsContent>
            <TabsContent value="absences" className="mt-4">
              <AbsencesTab filter={sharedFilter} onFilterChange={setSharedFilter} />
            </TabsContent>
            <TabsContent value="overtime" className="mt-4">
              <OvertimeTab filter={sharedFilter} onFilterChange={setSharedFilter} />
            </TabsContent>
          </>
        )}
        {isHrOrSuperAdmin && (
          <TabsContent value="daily-log" className="mt-4">
            <DailyLogTab filter={sharedFilter} onFilterChange={setSharedFilter} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
