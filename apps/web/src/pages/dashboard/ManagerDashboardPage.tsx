import { useNavigate } from 'react-router-dom';
import { Users, CheckCircle2, Coffee, UserX } from 'lucide-react';
import { useManagerDashboard } from '@/hooks/useDashboard';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { StaffStatusRow } from '@/components/dashboard/StaffStatusRow';

export function ManagerDashboardPage() {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useManagerDashboard();

  const handleMemberClick = (staffId: string) => {
    void navigate(`/employees/${staffId}`);
  };

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
        Failed to load manager dashboard. Please try again.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Manager Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{data.teamName}</p>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <MetricCard
          title="Total"
          value={data.total}
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
      </div>

      {/* Team members table */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">Team Members</h2>
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
                  Status
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Duration
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.members.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No team members found.
                  </td>
                </tr>
              ) : (
                data.members.map((member) => (
                  <StaffStatusRow
                    key={member.staffId}
                    staffId={member.staffId}
                    firstName={member.firstName}
                    surname={member.surname}
                    employeeId={member.employeeId}
                    currentStatus={member.currentStatus}
                    elapsedSeconds={member.elapsedSeconds}
                    onClick={handleMemberClick}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
