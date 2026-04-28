import { useState } from 'react';
import { useStaffAllocation } from '@/hooks/useReports';
import { safeArray } from '@/lib/safeArray';
import { ChevronDown, ChevronRight, Users, Briefcase } from 'lucide-react';
import type {
  IStaffAllocationClient,
  IStaffAllocationTeam,
  IStaffAllocationProject,
  IStaffAllocationStaff,
} from '@/api/reports.api';
import { UserAvatar } from '@/components/UserAvatar';
import { StaffPickerButton, type SelectedStaff } from '@/components/staff/StaffPickerButton';

// ── Helpers ───────────────────────────────────────────────────────────────────

function StaffPhoto({
  photo,
  firstName,
  surname,
}: {
  photo: string | null;
  firstName: string;
  surname: string;
}) {
  return <UserAvatar src={photo} firstName={firstName} surname={surname} size="sm" />;
}

// ── Level 3: Staff list ───────────────────────────────────────────────────────

function StaffList({ staffs }: { staffs: IStaffAllocationStaff[] }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {staffs.map((s) => (
        <div key={s.id} className="flex items-center gap-2 rounded-lg border bg-background p-2">
          <StaffPhoto photo={s.photo} firstName={s.firstName} surname={s.surname} />
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {s.firstName} {s.surname}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {[s.position, s.office].filter(Boolean).join(' · ') || 'No info'}
            </p>
          </div>
        </div>
      ))}
      {staffs.length === 0 && (
        <p className="text-xs text-muted-foreground col-span-full">No staff assigned</p>
      )}
    </div>
  );
}

// ── Level 2: Team row ─────────────────────────────────────────────────────────

function TeamRow({ team }: { team: IStaffAllocationTeam }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        className="w-full flex items-center gap-3 px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
        onClick={() => setExpanded((p) => !p)}
      >
        {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <span className="font-medium text-sm text-foreground flex-1">{team.name}</span>
        {team.managerName && (
          <span className="text-xs text-muted-foreground mr-2">Manager: {team.managerName}</span>
        )}
        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
          <Users size={10} />
          {team.staffCount}
        </span>
      </button>
      {expanded && (
        <div className="p-4">
          <StaffList staffs={team.staffs} />
        </div>
      )}
    </div>
  );
}

// ── Projects section ──────────────────────────────────────────────────────────

function ProjectsSection({ projects }: { projects: IStaffAllocationProject[] }) {
  const [expanded, setExpanded] = useState(false);

  if (projects.length === 0) return null;

  return (
    <div className="mt-4">
      <button
        className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors"
        onClick={() => setExpanded((p) => !p)}
      >
        {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <Briefcase size={14} />
        Projects ({projects.length})
      </button>
      {expanded && (
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {projects.map((proj) => (
            <div key={proj.id} className="rounded-lg border bg-background p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-foreground">{proj.name}</p>
                  {proj.code && (
                    <p className="text-xs text-muted-foreground font-mono">{proj.code}</p>
                  )}
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground flex-shrink-0">
                  <Users size={10} />
                  {proj.staffCount}
                </span>
              </div>
              {proj.staffs.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {proj.staffs.map((s) => (
                    <span
                      key={s.id}
                      className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                    >
                      {s.firstName} {s.surname}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Level 1: Client card ──────────────────────────────────────────────────────

function ClientCard({ client }: { client: IStaffAllocationClient }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
      {/* Header */}
      <button
        className="w-full flex items-center gap-3 px-6 py-4 text-left hover:bg-muted/30 transition-colors"
        onClick={() => setExpanded((p) => !p)}
      >
        {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground truncate">{client.clientName}</p>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-shrink-0">
          <span className="inline-flex items-center gap-1">
            <Users size={12} />
            {client.staffCount} staff
          </span>
          <span>{client.teamCount} team{client.teamCount !== 1 ? 's' : ''}</span>
          <span>{client.projectCount} project{client.projectCount !== 1 ? 's' : ''}</span>
        </div>
      </button>

      {/* Expanded body */}
      {expanded && (
        <div className="px-6 pb-6 pt-2 border-t space-y-3">
          {/* Teams */}
          {client.teams.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                Teams
              </p>
              <div className="space-y-2">
                {client.teams.map((team) => (
                  <TeamRow key={team.id} team={team} />
                ))}
              </div>
            </div>
          )}

          {/* Projects */}
          <ProjectsSection projects={client.projects} />
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

function filterClientsByStaff(
  clients: IStaffAllocationClient[],
  staffId: string,
): IStaffAllocationClient[] {
  return clients
    .map((client) => {
      const teams = client.teams
        .map((team) => ({
          ...team,
          staffs: team.staffs.filter((s) => s.id === staffId),
        }))
        .filter((team) => team.staffs.length > 0);

      const projects = client.projects
        .map((proj) => ({
          ...proj,
          staffs: proj.staffs.filter((s) => s.id === staffId),
        }))
        .filter((proj) => proj.staffs.length > 0);

      return { ...client, teams, projects };
    })
    .filter((c) => c.teams.length > 0 || c.projects.length > 0);
}

export function StaffAllocationPage() {
  const [companyId, setCompanyId] = useState('');
  const [appliedCompanyId, setAppliedCompanyId] = useState<string | undefined>(undefined);
  const [selectedStaff, setSelectedStaff] = useState<SelectedStaff | null>(null);

  const { data, isLoading } = useStaffAllocation(appliedCompanyId);
  const allClients = safeArray(data?.clients);
  const clients = selectedStaff
    ? filterClientsByStaff(allClients, selectedStaff.id)
    : allClients;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Staff Allocation</h1>
        <p className="text-sm text-muted-foreground">
          Staff distribution by client, team, and project
        </p>
      </div>

      {/* Filters */}
      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">Company ID</label>
            <input
              type="text"
              placeholder="All companies"
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              className="h-9 w-48 rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <StaffPickerButton
            value={selectedStaff}
            onSelect={setSelectedStaff}
            label="Staff"
            placeholder="All staff"
          />
          <button
            onClick={() => setAppliedCompanyId(companyId || undefined)}
            className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Apply
          </button>
          <button
            onClick={() => { setCompanyId(''); setAppliedCompanyId(undefined); setSelectedStaff(null); }}
            className="h-9 rounded-md border bg-background px-4 text-sm font-medium text-foreground hover:bg-muted"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="animate-pulse space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-muted" />
          ))}
        </div>
      ) : clients.length === 0 ? (
        <div className="flex h-32 items-center justify-center rounded-xl border bg-card">
          <p className="text-sm text-muted-foreground">No allocation data available</p>
        </div>
      ) : (
        <div className="space-y-4">
          {clients.map((client) => (
            <ClientCard key={client.id} client={client} />
          ))}
        </div>
      )}
    </div>
  );
}
