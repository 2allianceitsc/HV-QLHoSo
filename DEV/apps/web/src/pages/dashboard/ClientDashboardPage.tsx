import { useClientDashboard } from '@/hooks/useDashboard';
import { StatusBadge } from '@/components/dashboard/StatusBadge';

export function ClientDashboardPage() {
  const { data, isLoading, isError } = useClientDashboard();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
        Failed to load client dashboard. Please try again.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{data.client.name}</h1>
        {data.client.code && (
          <p className="text-sm text-muted-foreground mt-0.5">Code: {data.client.code}</p>
        )}
      </div>

      {/* Assigned Staff table */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">
            Assigned Staff ({data.assignedStaff.length})
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Name
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Employee ID
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Department
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Current Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.assignedStaff.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No staff assigned to this client.
                  </td>
                </tr>
              ) : (
                data.assignedStaff.map((s) => (
                  <tr key={s.staffId} className="hover:bg-accent/30 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-foreground">
                      {s.firstName} {s.surname}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{s.employeeId}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {s.department ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      {s.currentStatus ? (
                        <StatusBadge statusName={s.currentStatus.name} colorHex={s.currentStatus.colorHex} />
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
