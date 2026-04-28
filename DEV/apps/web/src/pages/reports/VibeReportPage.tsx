import { useDeferredValue, useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import {
  useVibeByEmployee,
  useVibeByTime,
  useVibeTeamStructure,
  useVibeAllStaffs,
  useVibeStaffsByClient,
} from '@/hooks/useReports';
import { safeArray } from '@/lib/safeArray';
import { useTabState } from '@/hooks/useTabState';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/UserAvatar';
import { ChevronDown, ChevronRight, Search, Users, Clock, BarChart3, List, Building2 } from 'lucide-react';
import type { IVibeByEmployeeRow, IVibeByTimeIconGroup, IVibeMoodLogEntry, IVibeTeamLeader } from '@/api/reports.api';
import { AppIcon } from '@/components/AppIcon';

// ── helpers ───────────────────────────────────────────────────────────────────

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function Avatar({ photo, name, size = 8 }: { photo: string | null; name: string; size?: number }) {
  const avatarSize = size <= 6 ? 'xs' : 'sm';
  return <UserAvatar src={photo} name={name} size={avatarSize} />;
}

// ── Tab 1: By Employee ────────────────────────────────────────────────────────

function TabByEmployee() {
  const [date, setDate] = useState(todayISO());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const { data, isLoading } = useVibeByEmployee({ date });
  const rows = safeArray(data?.data);

  function toggle(staffId: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(staffId) ? next.delete(staffId) : next.add(staffId);
      return next;
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-44"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => setDate(todayISO())}
          disabled={date === todayISO()}
        >
          Reset
        </Button>
        <span className="text-sm text-muted-foreground">{rows.length} staffs</span>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          No data for {date}.
        </div>
      ) : (
        <div className="divide-y divide-border rounded-lg border">
          {rows.map((row: IVibeByEmployeeRow) => {
            const isOpen = expanded.has(row.staffId);
            return (
              <div key={row.staffId}>
                <button
                  type="button"
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors text-left"
                  onClick={() => toggle(row.staffId)}
                >
                  {isOpen ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  )}
                  <Avatar photo={row.photo} name={row.fullName} />
                  <span className="font-medium text-sm">{row.fullName}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {row.moodLogs.length} {row.moodLogs.length === 1 ? 'entry' : 'entries'}
                  </span>
                  {row.moodLogs[row.moodLogs.length - 1] && (
                    <AppIcon
                      emojiCode={row.moodLogs[row.moodLogs.length - 1].icon}
                      iconUrl={row.moodLogs[row.moodLogs.length - 1].iconUrl}
                      alt={row.moodLogs[row.moodLogs.length - 1].iconText ?? ''}
                      className="h-6 w-6 text-xl leading-none flex-shrink-0"
                    />
                  )}
                </button>

                {isOpen && (
                  <div className="bg-muted/20 px-4 pb-3 space-y-2">
                    {row.moodLogs.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-2">No mood logs for this day.</p>
                    ) : (
                      row.moodLogs.map((ml, idx) => (
                        <div key={idx} className="flex items-start gap-3 py-2 border-b border-border/50 last:border-0">
                          <AppIcon
                            emojiCode={(ml as IVibeMoodLogEntry).icon}
                            iconUrl={(ml as IVibeMoodLogEntry).iconUrl}
                            alt={ml.iconText ?? ''}
                            className="h-6 w-6 text-xl leading-none mt-0.5 flex-shrink-0"
                            fallback={<span className="text-xl leading-none mt-0.5">😐</span>}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">{ml.iconText ?? '—'}</span>
                              <span className="text-xs text-muted-foreground">
                                {new Date(ml.loggedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            {ml.notes && (
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{ml.notes}</p>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Tab 2: By Time / Icon / Employee ─────────────────────────────────────────

const PERIODS = [
  { label: 'Today', value: 'day' as const },
  { label: 'This Week', value: 'week' as const },
  { label: 'This Month', value: 'month' as const },
  { label: 'This Year', value: 'year' as const },
];

function TabByTime() {
  const [period, setPeriod] = useState<'day' | 'week' | 'month' | 'year'>('day');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const { data, isLoading } = useVibeByTime({ period });
  const icons = safeArray(data?.icons);

  function toggle(iconText: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(iconText) ? next.delete(iconText) : next.add(iconText);
      return next;
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        {PERIODS.map((p) => (
          <Button
            key={p.value}
            size="sm"
            variant={period === p.value ? 'default' : 'outline'}
            onClick={() => setPeriod(p.value)}
          >
            {p.label}
          </Button>
        ))}
        <Button
          size="sm"
          variant="outline"
          onClick={() => setPeriod('day')}
          disabled={period === 'day'}
        >
          Reset
        </Button>
        {data && (
          <span className="ml-auto text-sm text-muted-foreground">
            Total: <span className="font-semibold text-foreground">{data.totalCount}</span> responses
          </span>
        )}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : icons.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          No data for this period.
        </div>
      ) : (
        <div className="divide-y divide-border rounded-lg border">
          {icons.map((group: IVibeByTimeIconGroup) => {
            const isOpen = expanded.has(group.iconText);
            const pct = data?.totalCount ? Math.round((group.count / data.totalCount) * 100) : 0;
            return (
              <div key={group.iconText}>
                <button
                  type="button"
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors text-left"
                  onClick={() => toggle(group.iconText)}
                >
                  {isOpen ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  )}
                  <AppIcon
                    emojiCode={group.icon}
                    iconUrl={group.iconUrl}
                    alt={group.iconText}
                    className="h-7 w-7 text-2xl leading-none flex-shrink-0"
                    fallback={<span className="text-2xl leading-none">😐</span>}
                  />
                  <span className="font-medium text-sm">{group.iconText}</span>
                  <div className="ml-auto flex items-center gap-3">
                    <div className="hidden sm:flex items-center gap-1.5 w-32">
                      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground w-8 text-right">{pct}%</span>
                    </div>
                    <Badge variant="secondary">{group.count}</Badge>
                  </div>
                </button>

                {isOpen && (
                  <div className="bg-muted/20 px-4 pb-3">
                    <div className="divide-y divide-border/50">
                      {group.staff.map((s) => (
                        <div key={`${s.staffId}-${s.loggedAt}`} className="flex items-start gap-3 py-3">
                          <Avatar photo={s.photo} name={s.fullName} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium truncate">{s.fullName}</span>
                              <AppIcon
                                emojiCode={group.icon}
                                iconUrl={group.iconUrl}
                                alt={group.iconText}
                                className="h-5 w-5 text-lg leading-none flex-shrink-0"
                                fallback={<span className="text-lg leading-none">😐</span>}
                              />
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                              <span>{s.department ?? 'No Department'}</span>
                              <span className="text-muted-foreground/40">•</span>
                              <span>{s.team ?? 'No Team'}</span>
                              <span className="text-muted-foreground/40">•</span>
                              <span>{s.position ?? 'No Position'}</span>
                            </div>
                            {s.notes && (
                              <p className="mt-1 text-xs text-muted-foreground break-words">{s.notes}</p>
                            )}
                          </div>
                          <div className="text-right text-xs text-muted-foreground whitespace-nowrap">
                            <p>{new Date(s.loggedAt).toLocaleDateString()}</p>
                            <p>{new Date(s.loggedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Tab 3: Team Leaders & Staffs ──────────────────────────────────────────────

function TabTeamStructure() {
  const { data, isLoading } = useVibeTeamStructure();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading...</p>;

  const teamLeaders = safeArray(data?.teamLeaders);
  const directReports = safeArray(data?.directReports);

  if (teamLeaders.length === 0 && directReports.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
        No team structure found.
      </div>
    );
  }

  if (teamLeaders.length > 0) {
    return (
      <div className="divide-y divide-border rounded-lg border">
        {teamLeaders.map((tl: IVibeTeamLeader) => {
          const isOpen = expanded.has(tl.staffId);
          return (
            <div key={tl.staffId}>
              <button
                type="button"
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors text-left"
                onClick={() => toggle(tl.staffId)}
              >
                {isOpen ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                )}
                <Avatar photo={tl.photo} name={tl.fullName} size={8} />
                <div>
                  <p className="text-sm font-semibold">{tl.fullName}</p>
                  <p className="text-xs text-muted-foreground">Team Leader · {tl.staff.length} staffs</p>
                </div>
              </button>
              {isOpen && (
                <div className="bg-muted/20 pl-10 pr-4 pb-3 space-y-1">
                  {tl.staff.map((s) => (
                    <div key={s.staffId} className="flex items-center gap-3 py-1.5">
                      <Avatar photo={s.photo} name={s.fullName} size={6} />
                      <span className="text-sm">{s.fullName}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // Fallback: direct reports
  return (
    <div className="divide-y divide-border rounded-lg border">
      {directReports.map((s) => (
        <div key={s.staffId} className="flex items-center gap-3 px-4 py-3">
          <Avatar photo={s.photo} name={s.fullName} size={8} />
          <span className="text-sm font-medium">{s.fullName}</span>
        </div>
      ))}
    </div>
  );
}

// ── Tab 4: All Staffs ─────────────────────────────────────────────────────────

function TabAllStaffs() {
  const [searchInput, setSearchInput] = useState('');
  const search = useDeferredValue(searchInput);
  const { data: rows = [], isLoading } = useVibeAllStaffs(search || undefined);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search staff..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSearchInput('')}
          disabled={!searchInput}
        >
          Reset
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          {search ? `No results for "${search}".` : 'No staff found.'}
        </div>
      ) : (
        <div className="divide-y divide-border rounded-lg border">
          {rows.map((s) => (
            <div key={s.staffId} className="flex items-center gap-3 px-4 py-3">
              <Avatar photo={s.photo} name={s.fullName} size={8} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{s.fullName}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {s.clientName && (
                    <span className="text-xs text-muted-foreground">{s.clientName}</span>
                  )}
                  {s.clientName && s.teamName && (
                    <span className="text-muted-foreground/40 text-xs">·</span>
                  )}
                  {s.teamName && (
                    <span className="text-xs text-muted-foreground">{s.teamName}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Tab 5: All Staffs by Client ───────────────────────────────────────────────

function TabStaffsByClient() {
  const [searchInput, setSearchInput] = useState('');
  const search = useDeferredValue(searchInput);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const { data: groups = [], isLoading } = useVibeStaffsByClient(search || undefined);

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search staff..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSearchInput('')}
          disabled={!searchInput}
        >
          Reset
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : groups.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          {search ? `No results for "${search}".` : 'No clients found.'}
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((client) => {
            const isClientOpen = expanded.has(client.clientId);
            const totalStaff = client.teams.reduce((sum, t) => sum + t.staff.length, 0);
            return (
              <div key={client.clientId} className="rounded-lg border overflow-hidden">
                <button
                  type="button"
                  className="w-full flex items-center gap-3 px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
                  onClick={() => toggle(client.clientId)}
                >
                  {isClientOpen ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  )}
                  <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="font-semibold text-sm">{client.clientName}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {client.teams.length} teams · {totalStaff} staffs
                  </span>
                </button>

                {isClientOpen && (
                  <div className="divide-y divide-border">
                    {client.teams.map((team) => {
                      const teamKey = `${client.clientId}-${team.teamId}`;
                      const isTeamOpen = expanded.has(teamKey);
                      return (
                        <div key={team.teamId}>
                          <button
                            type="button"
                            className="w-full flex items-center gap-3 pl-8 pr-4 py-2.5 hover:bg-muted/20 transition-colors text-left"
                            onClick={() => toggle(teamKey)}
                          >
                            {isTeamOpen ? (
                              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                            ) : (
                              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                            )}
                            <Users className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                            <span className="text-sm font-medium">{team.teamName}</span>
                            <span className="ml-auto text-xs text-muted-foreground">
                              {team.staff.length} staffs
                            </span>
                          </button>

                          {isTeamOpen && (
                            <div className="pl-14 pr-4 pb-2 divide-y divide-border/50">
                              {team.staff.map((s) => (
                                <div key={s.staffId} className="flex items-center gap-3 py-2">
                                  <Avatar photo={s.photo} name={s.fullName} size={6} />
                                  <span className="text-sm">{s.fullName}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'by-employee', label: 'By Employee', icon: Users },
  { id: 'by-time', label: 'By Time / Icon', icon: Clock },
  { id: 'team-structure', label: 'Team Leaders & Staffs', icon: BarChart3 },
  { id: 'all-staffs', label: 'All Staffs', icon: List },
  { id: 'staffs-by-client', label: 'All Staffs by Client', icon: Building2 },
] as const;

type TabId = typeof TABS[number]['id'];

function isVibeReportTab(value: unknown): value is TabId {
  return TABS.some((tab) => tab.id === value);
}

export function VibeReportPage() {
  const user = useAuthStore((s) => s.user);
  const roles = user?.roles ?? [];
  const isHrOrAdmin = roles.includes('HR_ADMIN') || roles.includes('SUPER_ADMIN');
  const isManager = roles.includes('MANAGER');
  const isClient = roles.includes('CLIENT');

  const visibleTabs = TABS.filter((t) => {
    if (t.id === 'team-structure') return isManager || isHrOrAdmin;
    if (t.id === 'all-staffs' || t.id === 'staffs-by-client') return isManager || isHrOrAdmin;
    return isManager || isHrOrAdmin || isClient;
  });

  const [activeTab, setActiveTab] = useTabState<TabId>('by-employee', isVibeReportTab);

  useEffect(() => {
    if (visibleTabs.some((tab) => tab.id === activeTab)) return;
    setActiveTab(visibleTabs[0]?.id ?? 'by-employee');
  }, [activeTab, setActiveTab, visibleTabs]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">VIBE Reports</h1>
        <p className="text-sm text-muted-foreground">Mood logs and staff wellbeing overview.</p>
      </div>

      {/* Tab bar */}
      <div className="border-b border-border">
        <div className="flex gap-0 overflow-x-auto">
          {visibleTabs.map((tab) => {
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
        {activeTab === 'by-employee' && <TabByEmployee />}
        {activeTab === 'by-time' && <TabByTime />}
        {activeTab === 'team-structure' && <TabTeamStructure />}
        {activeTab === 'all-staffs' && <TabAllStaffs />}
        {activeTab === 'staffs-by-client' && <TabStaffsByClient />}
      </div>
    </div>
  );
}
