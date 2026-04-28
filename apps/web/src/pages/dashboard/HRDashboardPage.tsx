import { useNavigate, Link } from 'react-router-dom';
import { Users, CheckCircle2, Coffee, UserX, WifiOff, UserCog, Briefcase, BarChart3, AlertTriangle } from 'lucide-react';
import { useHRDashboard } from '@/hooks/useDashboard';
import { MetricCard } from '@/components/dashboard/MetricCard';

export function HRDashboardPage() {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useHRDashboard();

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
        Failed to load HR dashboard. Please try again.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">HR Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{data.date}</p>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <MetricCard
          title="Total Staff"
          value={data.totalStaff}
          icon={<Users className="h-4 w-4" />}
          colorClass="bg-blue-500/10 text-blue-600"
        />
        <MetricCard
          title="Working"
          value={data.working}
          icon={<CheckCircle2 className="h-4 w-4" />}
          colorClass="bg-green-500/10 text-green-600"
        />
        <MetricCard
          title="On Break"
          value={data.onBreak}
          icon={<Coffee className="h-4 w-4" />}
          colorClass="bg-amber-500/10 text-amber-600"
        />
        <MetricCard
          title="Absent"
          value={data.absent}
          icon={<UserX className="h-4 w-4" />}
          colorClass="bg-red-500/10 text-red-600"
        />
        <MetricCard
          title="Offline"
          value={data.offline}
          icon={<WifiOff className="h-4 w-4" />}
          colorClass="bg-slate-500/10 text-slate-600"
        />
      </div>

      {/* Disabled managers warning banner */}
      {(data.disabledManagersCount ?? 0) > 0 && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-yellow-400/60 bg-yellow-50/80 dark:bg-yellow-900/20 px-4 py-3 text-sm text-yellow-800 dark:text-yellow-200">
          <AlertTriangle size={16} className="flex-shrink-0 text-yellow-500" />
          <span>
            <strong>{data.disabledManagersCount}</strong> manager assignment{(data.disabledManagersCount ?? 0) > 1 ? 's' : ''} belong to disabled staff.{' '}
            <Link to="/reports/hr?tab=disabled-managers" className="underline font-medium">Review in HR Report →</Link>
          </span>
        </div>
      )}

      {/* By Department table */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">By Department</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Department
                </th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Total
                </th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Working
                </th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Break
                </th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Absent
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.byDepartment.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No department data available.
                  </td>
                </tr>
              ) : (
                data.byDepartment.map((dept) => (
                  <tr key={dept.departmentName} className="hover:bg-accent/30 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-foreground">{dept.departmentName}</td>
                    <td className="px-4 py-3 text-sm text-center text-foreground tabular-nums">{dept.total}</td>
                    <td className="px-4 py-3 text-sm text-center tabular-nums">
                      <span className="text-green-600 font-medium">{dept.working}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-center tabular-nums">
                      <span className="text-amber-600 font-medium">{dept.onBreak}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-center tabular-nums">
                      <span className="text-red-600 font-medium">{dept.absent}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-semibold text-foreground mb-3">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => void navigate('/employees')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-border bg-background text-sm font-medium hover:bg-accent transition-colors"
          >
            <UserCog className="h-4 w-4" />
            Manage Employees
          </button>
          <button
            onClick={() => void navigate('/clients')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-border bg-background text-sm font-medium hover:bg-accent transition-colors"
          >
            <Briefcase className="h-4 w-4" />
            Manage Clients
          </button>
          <button
            onClick={() => void navigate('/reports/attendance')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-border bg-background text-sm font-medium hover:bg-accent transition-colors"
          >
            <BarChart3 className="h-4 w-4" />
            Reports
          </button>
        </div>
      </div>
    </div>
  );
}
