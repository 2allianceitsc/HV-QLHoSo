import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Building2, Users, UserCog, Trash2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useTabState } from '@/hooks/useTabState';
import { useTeam, useUpdateTeam } from '@/hooks/useTeam';
import {
  getTeamManagers,
  removeTeamManager,
  replaceTeamManagers,
  getTeamEmployees,
} from '@/api/org.api';
import { safeArray } from '@/lib/safeArray';
import { buildErrorToast } from '@/lib/apiError';
import { UserAvatar } from '@/components/UserAvatar';
import { EntityAvatar } from '@/components/entity/entityVisuals';
import { VisualIdentityFields } from '@/components/entity/VisualIdentityFields';
import { StaffMultiPickerButton } from '@/components/staff/StaffMultiPickerButton';
import type { SelectedStaff } from '@/components/staff/StaffMultiPickerButton';
import { INPUT_LENGTH } from '@shared/constants/input-length';
import { optionalText, requiredName } from '@/lib/validation';

// ── Schemas ───────────────────────────────────────────────────────────────────

const teamSchema = z.object({
  teamName: requiredName('Name'),
  teamCode: optionalText('Code'),
  colorHex: optionalText('Color hex'),
  iconId: optionalText('Icon'),
});

type TeamFormValues = z.infer<typeof teamSchema>;

// ── Tabs ──────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'general', label: 'General', icon: Building2 },
  { id: 'managers', label: 'Managers', icon: UserCog },
  { id: 'employees', label: 'Employees', icon: Users },
] as const;

type TabId = typeof TABS[number]['id'];

function isTeamTab(v: unknown): v is TabId {
  return TABS.some((t) => t.id === v);
}

// ── General Tab ───────────────────────────────────────────────────────────────

function GeneralTab({ teamId }: { teamId: string }) {
  const { toast } = useToast();
  const { data: team, isLoading } = useTeam(teamId);
  const updateMutation = useUpdateTeam();
  const [editing, setEditing] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<TeamFormValues>({
    resolver: zodResolver(teamSchema),
  });

  function startEdit() {
    if (!team) return;
    reset({
      teamName: team.name,
      teamCode: team.code ?? '',
      colorHex: team.colorHex ?? '',
      iconId: team.iconId ?? '',
    });
    setEditing(true);
  }

  async function onSubmit(values: TeamFormValues) {
    try {
      await updateMutation.mutateAsync({
        id: teamId,
        dto: {
          teamName: values.teamName,
          teamCode: values.teamCode || undefined,
          colorHex: values.colorHex || undefined,
          iconId: values.iconId || undefined,
        },
      });
      toast({ title: 'Team updated' });
      setEditing(false);
    } catch (err) {
      buildErrorToast(toast)(err, 'Failed to update team');
    }
  }

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!team) return <p className="text-sm text-destructive">Team not found.</p>;

  if (!editing) {
    return (
      <div className="space-y-6 max-w-2xl">
        <div className="flex items-start gap-4">
          <EntityAvatar
            name={team.name}
            colorHex={team.colorHex}
            iconId={team.iconId}
            className="h-16 w-16 text-2xl"
            iconClassName="h-8 w-8"
          />
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold">{team.name}</h2>
            {team.code && <p className="text-sm text-muted-foreground font-mono">{team.code}</p>}
          </div>
          <Button size="sm" variant="outline" onClick={startEdit}>Edit</Button>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          {[
            { label: 'Company', value: team.company?.name },
            { label: 'Client', value: team.client?.name },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
              <p className="text-sm font-medium">{value ?? '—'}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-2xl">
      <div className="space-y-1">
        <Label htmlFor="teamName">Name *</Label>
        <Input id="teamName" maxLength={INPUT_LENGTH.name} {...register('teamName')} />
        {errors.teamName && <p className="text-xs text-destructive">{errors.teamName.message}</p>}
      </div>
      <div className="space-y-1">
        <Label htmlFor="teamCode">Code</Label>
        <Input id="teamCode" maxLength={INPUT_LENGTH.code} {...register('teamCode')} />
      </div>
      <input type="hidden" {...register('colorHex')} />
      <input type="hidden" {...register('iconId')} />
      <VisualIdentityFields
        previewLabel={watch('teamName') || team.name}
        colorHex={watch('colorHex')}
        iconId={watch('iconId')}
        onColorHexChange={(v) => setValue('colorHex', v, { shouldDirty: true, shouldTouch: true })}
        onIconIdChange={(v) => setValue('iconId', v, { shouldDirty: true, shouldTouch: true })}
      />
      <div className="flex gap-2 pt-2">
        <Button type="submit" size="sm" disabled={isSubmitting}>{isSubmitting ? 'Saving…' : 'Save'}</Button>
        <Button type="button" size="sm" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
      </div>
    </form>
  );
}

// ── Managers Tab ──────────────────────────────────────────────────────────────

function ManagersTab({ teamId }: { teamId: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const qKey = ['teams', teamId, 'managers'];

  const { data: managers, isLoading } = useQuery({
    queryKey: qKey,
    queryFn: () => getTeamManagers(teamId),
  });

  const replaceMutation = useMutation({
    mutationFn: (staffIds: string[]) => replaceTeamManagers(teamId, staffIds),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: qKey }); toast({ title: 'Managers updated' }); },
    onError: (err) => buildErrorToast(toast)(err, 'Failed to update managers'),
  });

  const removeMutation = useMutation({
    mutationFn: (staffId: string) => removeTeamManager(teamId, staffId),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: qKey }); toast({ title: 'Manager removed' }); },
    onError: (err) => buildErrorToast(toast)(err, 'Failed to remove manager'),
  });

  const list = safeArray(managers);

  const pickerValue: SelectedStaff[] = list.map((m) => ({
    id: m.id,
    firstName: m.firstName,
    surname: m.surname,
    employeeId: m.employeeId,
    photo: m.photoBusiness ?? null,
  }));

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Assign and manage team-level managers.</p>
        <StaffMultiPickerButton
          value={pickerValue}
          onSelect={(sel) => replaceMutation.mutate(sel.map((s) => s.id))}
          placeholder="Assign managers"
        />
      </div>
      {list.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          No managers assigned yet.
        </div>
      ) : (
        <div className="divide-y divide-border rounded-lg border overflow-hidden">
          {list.map((m) => (
            <div key={m.id} className="flex items-center gap-3 px-4 py-3">
              <UserAvatar src={m.photoBusiness} firstName={m.firstName} surname={m.surname} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{m.firstName} {m.surname}</p>
                <p className="text-xs text-muted-foreground">{m.employeeId}</p>
              </div>
              {m.position && (
                <span className="text-xs text-muted-foreground hidden sm:block">{m.position.name}</span>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={() => removeMutation.mutate(m.id)}
                disabled={removeMutation.isPending}
              >
                <Trash2 size={14} />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Employees Tab ─────────────────────────────────────────────────────────────

function EmployeesTab({ teamId }: { teamId: string }) {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['teams', teamId, 'employees', page, search],
    queryFn: () => getTeamEmployees(teamId, { page, limit: 50, search: search || undefined }),
  });

  const list = safeArray(data?.data);
  const pagination = data?.pagination;

  return (
    <div className="space-y-4">
      <Input
        placeholder="Search employees..."
        value={search}
        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        className="max-w-xs"
      />
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : list.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          No employees assigned to this team.
        </div>
      ) : (
        <div className="divide-y divide-border rounded-lg border overflow-hidden">
          {list.map((emp) => (
            <button
              key={emp.id}
              type="button"
              className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors"
              onClick={() => navigate(`/employees/${emp.id}`)}
            >
              <UserAvatar src={emp.photoBusiness} firstName={emp.firstName} surname={emp.surname} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{emp.firstName} {emp.surname}</p>
                <p className="text-xs text-muted-foreground">{emp.employeeId}</p>
              </div>
              {emp.department && (
                <span className="text-xs text-muted-foreground hidden sm:block">{emp.department.name}</span>
              )}
              {emp.position && (
                <span className="text-xs text-muted-foreground hidden md:block">{emp.position.name}</span>
              )}
            </button>
          ))}
        </div>
      )}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
          <span className="text-sm text-muted-foreground">Page {page} of {pagination.totalPages}</span>
          <Button size="sm" variant="outline" disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function TeamDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: team } = useTeam(id ?? '');
  const [activeTab, setActiveTab] = useTabState<TabId>('general', isTeamTab);

  if (!id) return <p className="text-sm text-destructive">No team ID provided.</p>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/settings/teams')}>
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          Teams
        </Button>
        <div className="h-5 w-px bg-border" />
        <div className="flex items-center gap-3">
          <EntityAvatar
            name={team?.name ?? ''}
            colorHex={team?.colorHex}
            iconId={team?.iconId}
            className="h-10 w-10"
            iconClassName="h-5 w-5"
          />
          <div>
            <h1 className="text-2xl font-bold leading-tight">{team?.name ?? '…'}</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {team?.code && <span className="font-mono">{team.code}</span>}
              {team?.code && team?.company && <span>·</span>}
              {team?.company && <span>{team.company.name}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="border-b border-border">
        <div className="flex gap-0 overflow-x-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'general' && <GeneralTab teamId={id} />}
        {activeTab === 'managers' && <ManagersTab teamId={id} />}
        {activeTab === 'employees' && <EmployeesTab teamId={id} />}
      </div>
    </div>
  );
}
