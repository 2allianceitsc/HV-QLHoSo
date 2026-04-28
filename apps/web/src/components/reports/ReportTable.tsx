import { format } from 'date-fns';
import type { IAttendanceRow, IPagination } from '@/api/reports.api';
import { TablePagination } from '@/components/ui/TablePagination';
import { OverbreakBadge } from '@/components/attendance/OverbreakBadge';
import { getMultiStaffAttendanceEndDisplay } from '@/lib/attendanceEndStatus';

interface ReportTableProps {
  rows: IAttendanceRow[];
  pagination: IPagination | undefined;
  isLoading: boolean;
  page: number;
  onPageChange: (page: number) => void;
}

function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

function formatLocalTime(iso: string): string {
  return format(new Date(iso), 'HH:mm');
}

function formatLocalDate(dateStr: string): string {
  return format(new Date(dateStr), 'dd/MM/yyyy');
}

export function ReportTable({
  rows,
  pagination,
  isLoading,
  page,
  onPageChange,
}: ReportTableProps) {
  return (
    <div className="rounded-xl border bg-card shadow-sm">
      {/* Summary */}
      {pagination && (
        <div className="border-b px-6 py-3">
          <p className="text-sm font-medium text-foreground">
            Results{' '}
            <span className="text-muted-foreground">({pagination.total} records)</span>
          </p>
        </div>
      )}

      <div className="overflow-x-auto">
        {isLoading ? (
          <div className="flex h-32 items-center justify-center">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : rows.length === 0 ? (
          <div className="flex h-32 items-center justify-center">
            <p className="text-sm text-muted-foreground">No records found. Generate a report to see data.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">Employee</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Start (local)</th>
                <th className="px-4 py-3 font-medium">End (local)</th>
                <th className="px-4 py-3 font-medium">Duration</th>
                <th className="px-4 py-3 font-medium">Overbreak</th>
                <th className="px-4 py-3 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((row, idx) => {
                const endDisplay = getMultiStaffAttendanceEndDisplay(rows, idx, (item) => item.staffId);

                return <tr key={`${row.staffId}-${row.startTime}-${idx}`} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium">
                        {row.firstName} {row.surname}
                      </p>
                      <p className="text-xs text-muted-foreground">{row.employeeId}</p>
                      {row.department && (
                        <p className="text-xs text-muted-foreground">{row.department}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: row.statusColorHex ?? '#6b7280' }}
                      />
                      <span>{row.statusName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {formatLocalDate(row.date)}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {formatLocalTime(row.startTime)}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {row.endTime
                      ? formatLocalTime(row.endTime)
                      : <span className={endDisplay?.className}>{endDisplay?.label}</span>}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {formatDuration(row.durationSeconds)}
                  </td>
                  <td className="px-4 py-3">
                    <OverbreakBadge overbreakSeconds={row.overbreakSeconds} />
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {row.notes ?? '—'}
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
          onPageChange={onPageChange}
        />
      )}
    </div>
  );
}
