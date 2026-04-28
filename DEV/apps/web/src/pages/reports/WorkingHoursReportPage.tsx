import { useState } from 'react';
import { useWorkingHours, useExportWorkingHours } from '@/hooks/useReports';
import { usePermission } from '@/hooks/usePermission';
import { safeArray } from '@/lib/safeArray';
import { Download } from 'lucide-react';
import { format } from 'date-fns';
import type { IWorkingHoursParams, IWorkingHoursRow } from '@/api/reports.api';
import { UserAvatar } from '@/components/UserAvatar';
import { StaffPickerButton, type SelectedStaff } from '@/components/staff/StaffPickerButton';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

function defaultStartDate(): string {
  const d = new Date();
  d.setDate(1);
  return format(d, 'yyyy-MM-dd');
}

function utilizationColor(pct: number | null): string {
  if (pct === null) return 'text-muted-foreground';
  if (pct >= 90) return 'text-green-600 font-semibold';
  if (pct >= 70) return 'text-yellow-600 font-semibold';
  return 'text-red-600 font-semibold';
}

function StaffPhoto({ photo, firstName, surname }: { photo: string | null; firstName: string; surname: string }) {
  return <UserAvatar src={photo} firstName={firstName} surname={surname} size="sm" />;
}

// ── Filter bar ────────────────────────────────────────────────────────────────

interface FilterState {
  startDate: string;
  endDate: string;
  companyId: string;
  officeId: string;
  clientId: string;
  teamId: string;
  selectedStaff: SelectedStaff | null;
}

function FilterBar({
  onApply,
  isExporting,
  onExport,
  canExport,
}: {
  onApply: (p: IWorkingHoursParams, staffId: string | undefined) => void;
  isExporting: boolean;
  onExport: (p: IWorkingHoursParams) => void;
  canExport: boolean;
}) {
  const [local, setLocal] = useState<FilterState>({
    startDate: defaultStartDate(),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    companyId: '',
    officeId: '',
    clientId: '',
    teamId: '',
    selectedStaff: null,
  });

  function toParams(): IWorkingHoursParams {
    return {
      startDate: local.startDate,
      endDate: local.endDate,
      companyId: local.companyId || undefined,
      officeId: local.officeId || undefined,
      clientId: local.clientId || undefined,
      teamId: local.teamId || undefined,
      clientTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
  }

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">Start Date *</label>
          <input
            type="date"
            value={local.startDate}
            onChange={(e) => setLocal((p) => ({ ...p, startDate: e.target.value }))}
            className="h-9 rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">End Date *</label>
          <input
            type="date"
            value={local.endDate}
            onChange={(e) => setLocal((p) => ({ ...p, endDate: e.target.value }))}
            className="h-9 rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <StaffPickerButton
          value={local.selectedStaff}
          onSelect={(s) => setLocal((p) => ({ ...p, selectedStaff: s }))}
          label="Staff"
          placeholder="All staff"
        />
        {(
          [
            { key: 'officeId', label: 'Office ID' },
            { key: 'clientId', label: 'Client ID' },
            { key: 'teamId', label: 'Team ID' },
          ] as { key: keyof FilterState; label: string }[]
        ).map(({ key, label }) => (
          <div key={key} className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">{label}</label>
            <input
              type="text"
              placeholder="Optional"
              value={local[key] as string}
              onChange={(e) => setLocal((p) => ({ ...p, [key]: e.target.value }))}
              className="h-9 w-32 rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        ))}
        <button
          onClick={() => onApply(toParams(), local.selectedStaff?.id)}
          disabled={!local.startDate || !local.endDate}
          className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          Generate
        </button>
        {canExport && (
          <button
            onClick={() => onExport(toParams())}
            disabled={!local.startDate || !local.endDate || isExporting}
            className="h-9 inline-flex items-center gap-2 rounded-md border bg-background px-4 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50"
          >
            <Download size={14} />
            {isExporting ? 'Exporting...' : 'Export Excel'}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Table row ─────────────────────────────────────────────────────────────────

function WorkingHoursRow({ row }: { row: IWorkingHoursRow }) {
  const pct = row.utilization;
  const pctLabel = pct !== null ? `${pct.toFixed(1)}%` : '—';

  return (
    <tr className="hover:bg-muted/30">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <StaffPhoto photo={row.photo} firstName={row.firstName} surname={row.surname} />
          <span className="font-medium text-sm">{row.firstName} {row.surname}</span>
        </div>
      </td>
      <td className="px-4 py-3 text-right text-sm">{formatDuration(row.shiftSeconds)}</td>
      <td className="px-4 py-3 text-right text-sm">{formatDuration(row.actualWorkingSeconds)}</td>
      <td className="px-4 py-3 text-right text-sm">{formatDuration(row.breakSeconds)}</td>
      <td className="px-4 py-3 text-right text-sm">{formatDuration(row.overtimeSeconds)}</td>
      <td className={`px-4 py-3 text-right text-sm ${utilizationColor(pct)}`}>{pctLabel}</td>
    </tr>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function WorkingHoursReportPage() {
  const [queryParams, setQueryParams] = useState<IWorkingHoursParams | null>(null);
  const [staffIdFilter, setStaffIdFilter] = useState<string | undefined>(undefined);
  const exportMutation = useExportWorkingHours();
  const canExport = usePermission('R05', null, 'EXPORT');

  const { data, isLoading } = useWorkingHours(
    queryParams ?? { startDate: '', endDate: '' },
  );

  const allRows = safeArray(data?.data);
  const rows = staffIdFilter ? allRows.filter((r) => r.staffId === staffIdFilter) : allRows;

  function handleExport(params: IWorkingHoursParams) {
    exportMutation.mutate(params);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Working Hours Report</h1>
        <p className="text-sm text-muted-foreground">
          Shift vs actual hours, breaks, overtime and utilization per staff
        </p>
      </div>

      <FilterBar
        onApply={(p, staffId) => { setQueryParams(p); setStaffIdFilter(staffId); }}
        isExporting={exportMutation.isPending}
        onExport={handleExport}
        canExport={canExport}
      />

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Utilization &ge; 90%</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500 inline-block" /> 70–89%</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> &lt; 70%</span>
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-x-auto">
        {isLoading ? (
          <div className="animate-pulse space-y-2 p-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex gap-3">
                {[...Array(6)].map((__, j) => (
                  <div key={j} className="h-4 bg-muted rounded flex-1" />
                ))}
              </div>
            ))}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">Staff Name</th>
                <th className="px-4 py-3 font-medium text-right">Shift Hours</th>
                <th className="px-4 py-3 font-medium text-right">Actual Working</th>
                <th className="px-4 py-3 font-medium text-right">Break Hours</th>
                <th className="px-4 py-3 font-medium text-right">Overtime</th>
                <th className="px-4 py-3 font-medium text-right">Utilization</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-sm text-muted-foreground">
                    {queryParams
                      ? 'No data for the selected period'
                      : 'Select a date range and click Generate'}
                  </td>
                </tr>
              ) : (
                rows.map((r) => <WorkingHoursRow key={r.staffId} row={r} />)
              )}
            </tbody>
          </table>
        )}
      </div>

      {data && (
        <p className="text-xs text-muted-foreground text-right">
          {data.total} staff member{data.total !== 1 ? 's' : ''} shown
        </p>
      )}
    </div>
  );
}
