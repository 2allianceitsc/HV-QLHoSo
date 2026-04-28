import { useState } from 'react';
import { useTimezoneReport } from '@/hooks/useReports';
import { useTabState } from '@/hooks/useTabState';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { safeArray } from '@/lib/safeArray';
import { AlertTriangle } from 'lucide-react';
import type { ITimezoneScopeParams, ITimezoneGroup, ITimezoneMismatchStaff } from '@/api/reports.api';
import { UserAvatar } from '@/components/UserAvatar';
import { StaffPickerButton, type SelectedStaff } from '@/components/staff/StaffPickerButton';
import { useCompanies } from '@/hooks/useCompany';
import { useOffices } from '@/hooks/useOffice';
import { useClients } from '@/hooks/useClient';
import { useTeams } from '@/hooks/useTeam';
import { EntitySelect } from '@/components/entity/EntitySelect';

// ── Helpers ───────────────────────────────────────────────────────────────────

function StaffPhoto({ photo, fullName }: { photo: string | null; fullName: string }) {
  return <UserAvatar src={photo} name={fullName} size="sm" />;
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

// ── Scope filter bar ──────────────────────────────────────────────────────────

interface ScopeFilterValue extends ITimezoneScopeParams {
  staffId?: string;
}

function ScopeFilterBar({
  value,
  onChange,
}: {
  value: ScopeFilterValue;
  onChange: (v: ScopeFilterValue) => void;
}) {
  const [local, setLocal] = useState<ITimezoneScopeParams>(value);
  const [selectedStaff, setSelectedStaff] = useState<SelectedStaff | null>(null);

  const { data: companiesData } = useCompanies({ limit: 200 });
  const { data: officesData } = useOffices({ limit: 200, companyId: local.companyId });
  const { data: clientsData } = useClients({ limit: 200 });
  const { data: teamsData } = useTeams({ limit: 200, companyId: local.companyId });

  const companies = safeArray(companiesData?.data);
  const offices = safeArray(officesData?.data);
  const clients = safeArray(clientsData?.data);
  const teams = safeArray(teamsData?.data);

  function handleCompanyChange(id: string) {
    setLocal((p) => ({ ...p, companyId: id || undefined, officeId: undefined, teamId: undefined }));
  }

  function apply() {
    onChange({
      companyId: local.companyId || undefined,
      officeId: local.officeId || undefined,
      clientId: local.clientId || undefined,
      teamId: local.teamId || undefined,
      staffId: selectedStaff?.id,
    });
  }

  function reset() {
    setLocal({});
    setSelectedStaff(null);
    onChange({});
  }

  const isDirty = !!(local.companyId || local.officeId || local.clientId || local.teamId || selectedStaff);

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <p className="mb-3 text-sm font-medium text-foreground">Scope Filters</p>
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">Company</label>
          <EntitySelect
            value={local.companyId ?? ''}
            onValueChange={handleCompanyChange}
            options={companies}
            placeholder="All companies"
            emptyLabel="All companies"
            entityType="COMPANY"
            triggerClassName="w-44 h-10"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">Office</label>
          <EntitySelect
            value={local.officeId ?? ''}
            onValueChange={(id) => setLocal((p) => ({ ...p, officeId: id || undefined }))}
            options={offices}
            placeholder="All offices"
            emptyLabel="All offices"
            entityType="OFFICE"
            triggerClassName="w-44 h-10"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">Client</label>
          <EntitySelect
            value={local.clientId ?? ''}
            onValueChange={(id) => setLocal((p) => ({ ...p, clientId: id || undefined }))}
            options={clients}
            placeholder="All clients"
            emptyLabel="All clients"
            entityType="CLIENT"
            triggerClassName="w-44 h-10"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">Team</label>
          <EntitySelect
            value={local.teamId ?? ''}
            onValueChange={(id) => setLocal((p) => ({ ...p, teamId: id || undefined }))}
            options={teams}
            placeholder="All teams"
            emptyLabel="All teams"
            entityType="TEAM"
            triggerClassName="w-44 h-10"
          />
        </div>
        <StaffPickerButton
          value={selectedStaff}
          onSelect={setSelectedStaff}
          label="Staff"
          placeholder="All staff"
        />
        <button
          onClick={apply}
          className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Apply
        </button>
        <button
          onClick={reset}
          disabled={!isDirty}
          className="h-10 rounded-md border bg-background px-4 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Reset
        </button>
      </div>
    </div>
  );
}

// ── Tab 1: Timezone Inventory ─────────────────────────────────────────────────

function TimezoneGroupRow({ group }: { group: ITimezoneGroup }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <tr
        className="hover:bg-muted/30 cursor-pointer"
        onClick={() => setExpanded((p) => !p)}
      >
        <td className="px-4 py-3 font-medium font-mono text-sm">
          {group.timezone || <span className="italic text-muted-foreground">Not set</span>}
        </td>
        <td className="px-4 py-3 text-right">{group.staffCount}</td>
        <td className="px-4 py-3 text-right text-muted-foreground text-xs">
          {expanded ? '▲' : '▼'} Details
        </td>
      </tr>
      {expanded && group.staffs.map((staff) => (
        <tr key={staff.id} className="bg-muted/20">
          <td className="px-8 py-2" colSpan={3}>
            <div className="flex items-center gap-3">
              <StaffPhoto photo={staff.photo} fullName={staff.fullName} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">{staff.fullName}</span>
                  {staff.isDifferentFromOffice && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">
                      <AlertTriangle size={10} />
                      Different from office
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {[
                    staff.office && `Office: ${staff.office}`,
                    staff.team && `Team: ${staff.team}`,
                    staff.client && `Client: ${staff.client}`,
                    `Source: ${staff.timezoneSource}`,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </div>
              </div>
            </div>
          </td>
        </tr>
      ))}
    </>
  );
}

function InventoryTab({ scopeParams }: { scopeParams: ScopeFilterValue }) {
  const { staffId, ...apiParams } = scopeParams;
  const { data, isLoading } = useTimezoneReport(apiParams);

  const rawGroups = safeArray(data?.tab1?.groups);
  const groups = rawGroups
    .map((g) => ({
      ...g,
      staffs: staffId ? g.staffs.filter((s) => s.id === staffId) : g.staffs,
    }))
    .filter((g) => !staffId || g.staffs.length > 0)
    .slice()
    .sort((a, b) => {
      if (!a.timezone) return 1;
      if (!b.timezone) return -1;
      return a.timezone.localeCompare(b.timezone);
    });

  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-x-auto">
      {isLoading ? (
        <TableSkeleton cols={3} />
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
              <th className="px-4 py-3 font-medium">Timezone (IANA)</th>
              <th className="px-4 py-3 font-medium text-right">Staff Count</th>
              <th className="px-4 py-3 font-medium text-right">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {groups.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-6 py-8 text-center text-sm text-muted-foreground">
                  No data for the selected scope
                </td>
              </tr>
            ) : (
              groups.map((g, i) => <TimezoneGroupRow key={g.timezone || `notset-${i}`} group={g} />)
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ── Tab 2: Timezone Mismatch ──────────────────────────────────────────────────

function MismatchBadge({ label, hasMismatch }: { label: string; hasMismatch: boolean }) {
  if (!hasMismatch) return <span className="text-foreground">{label || <span className="text-muted-foreground italic">—</span>}</span>;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
      <AlertTriangle size={10} />
      {label || '—'}
    </span>
  );
}

function MismatchRow({ staff }: { staff: ITimezoneMismatchStaff }) {
  return (
    <tr className="hover:bg-muted/30">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <StaffPhoto photo={staff.photo} fullName={staff.fullName} />
          <span className="font-medium text-sm">{staff.fullName}</span>
        </div>
      </td>
      <td className="px-4 py-3 font-mono text-xs">{staff.staffTimezone ?? <span className="italic text-muted-foreground">Not set</span>}</td>
      <td className="px-4 py-3 text-xs">
        <MismatchBadge label={staff.officeTimezone ?? '—'} hasMismatch={staff.mismatches.includes('office')} />
      </td>
      <td className="px-4 py-3 text-xs">
        <MismatchBadge label={staff.companyTimezone ?? '—'} hasMismatch={staff.mismatches.includes('company')} />
      </td>
      <td className="px-4 py-3 text-xs">
        <MismatchBadge label={staff.clientTimezone ?? '—'} hasMismatch={staff.mismatches.includes('client')} />
      </td>
    </tr>
  );
}

function MismatchTab({ scopeParams }: { scopeParams: ScopeFilterValue }) {
  const { staffId, ...apiParams } = scopeParams;
  const { data, isLoading } = useTimezoneReport(apiParams);
  const allStaffs = safeArray(data?.tab2?.staffs);
  const staffs = staffId ? allStaffs.filter((s) => s.id === staffId) : allStaffs;

  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-x-auto">
      {isLoading ? (
        <TableSkeleton cols={5} />
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
              <th className="px-4 py-3 font-medium">Staff Name</th>
              <th className="px-4 py-3 font-medium">Staff TZ</th>
              <th className="px-4 py-3 font-medium">Office TZ</th>
              <th className="px-4 py-3 font-medium">Company TZ</th>
              <th className="px-4 py-3 font-medium">Client TZ</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {staffs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-sm text-muted-foreground">
                  No mismatches found for the selected scope
                </td>
              </tr>
            ) : (
              staffs.map((s) => <MismatchRow key={s.id} staff={s} />)
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function TimezoneReportPage() {
  type TimezoneTabId = 'inventory' | 'mismatch';

  function isTimezoneTab(value: unknown): value is TimezoneTabId {
    return value === 'inventory' || value === 'mismatch';
  }

  const [scopeParams, setScopeParams] = useState<ScopeFilterValue>({});
  const [activeTab, setActiveTab] = useTabState<TimezoneTabId>('inventory', isTimezoneTab);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Timezone Review</h1>
        <p className="text-sm text-muted-foreground">
          Inventory of staff timezones and mismatch alerts
        </p>
      </div>

      <ScopeFilterBar value={scopeParams} onChange={setScopeParams} />

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TimezoneTabId)}>
        <TabsList>
          <TabsTrigger value="inventory">Timezone Inventory</TabsTrigger>
          <TabsTrigger value="mismatch">Mismatch Alert</TabsTrigger>
        </TabsList>

        <TabsContent value="inventory" className="mt-4">
          <InventoryTab scopeParams={scopeParams} />
        </TabsContent>

        <TabsContent value="mismatch" className="mt-4">
          <MismatchTab scopeParams={scopeParams} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
