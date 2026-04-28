import { useMemo, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import type { IBirthdayStaff } from '@/api/reports.api';
import { DateRangePresetPicker } from '@/components/filters/DateRangePresetPicker';
import { FilterBar } from '@/components/filters';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EntitySelect } from '@/components/entity/EntitySelect';
import { Download, CheckCircle2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserAvatar } from '@/components/UserAvatar';
import { useHRReport, useHrBirthdays, useHrHeadcount, useWeeklyGrid, useExportWeeklyGrid, useDisabledManagers } from '@/hooks/useReports';
import { useCompanies } from '@/hooks/useCompany';
import { useDepartments } from '@/hooks/useDepartment';
import { useTeams } from '@/hooks/useTeam';
import { StaffPickerButton } from '@/components/staff/StaffPickerButton';
import { useAuthStore } from '@/stores/auth.store';
import type { IWeeklyGridStaff, IWeeklyGridDay, IDisabledManagerRow } from '@/api/reports.api';
import type { SelectedStaff } from '@/components/staff/StaffPickerButton';
import { safeArray } from '@/lib/safeArray';
import {
  removeCompanyManager,
  removeDepartmentManager,
  removeOfficeManager,
  removeTeamManager,
} from '@/api/org.api';

function defaultStartDate(): string {
  const d = new Date();
  d.setDate(1);
  return format(d, 'yyyy-MM-dd');
}

function formatHours(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatBirthday(isoDate: string): string {
  return format(new Date(isoDate), 'MMM dd');
}

function fullName(firstName: string, surname: string): string {
  return `${firstName} ${surname}`.trim();
}

function normalizeText(value: string | null | undefined): string {
  return value?.trim().toLowerCase() ?? '';
}

function hasValue(value: string | null | undefined): value is string {
  return Boolean(value?.trim());
}

type ReportTab = 'overview' | 'headcount' | 'birthdays' | 'weekly-grid' | 'disabled-managers';

function isReportTab(value: unknown): value is ReportTab {
  return value === 'overview' || value === 'headcount' || value === 'birthdays' || value === 'weekly-grid' || value === 'disabled-managers';
}

function BirthdayAvatar({ photo, fallback }: { photo: string | null; fallback: string }) {
  return <UserAvatar src={photo} name={fallback} size="sm" className="h-12 w-12 text-sm border" />;
}

function BirthdayCard({ staff }: { staff: IBirthdayStaff }) {
  const name = fullName(staff.firstName, staff.surname);
  const isToday = staff.daysUntilBirthday === 0;

  return (
    <article className="rounded-xl border bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start gap-3">
        <BirthdayAvatar photo={staff.photoBirthday ?? staff.photo} fallback={name} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate text-sm font-semibold text-foreground">{name}</p>
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                isToday ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}
            >
              {isToday ? 'Today' : `${staff.daysUntilBirthday}d`}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {staff.department ?? 'No Department'} - {staff.office ?? 'No Office'}
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Birthday</p>
          <p className="mt-0.5 font-medium text-foreground">{formatBirthday(staff.dateOfBirth)}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Age</p>
          <p className="mt-0.5 font-medium text-foreground">{staff.age}</p>
        </div>
        <div className="col-span-2">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Favorite Cake</p>
          <p className="mt-0.5 truncate font-medium text-foreground">{staff.favoriteCake ?? 'Not set'}</p>
        </div>
      </div>
    </article>
  );
}

export function HRReportPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  // Read tab from URL (BA Convention 3.2: shareable links via URL params)
  const tabFromUrl = searchParams.get('tab') ?? 'overview';
  const tab = isReportTab(tabFromUrl) ? tabFromUrl : 'overview';

  function handleTabChange(newTab: ReportTab) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', newTab);
      return next;
    });
  }

  const [startDate, setStartDate] = useState(defaultStartDate());
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [submitted, setSubmitted] = useState(false);
  const [queryDates, setQueryDates] = useState({ startDate: '', endDate: '' });

  const [headcountGroupBy, setHeadcountGroupBy] = useState<'department' | 'office' | 'team' | 'client'>('department');
  const [birthdayPeriod, setBirthdayPeriod] = useState<'this-month' | 'next-month' | 'next-week'>('this-month');
  const [birthdaySearch, setBirthdaySearch] = useState('');
  const [birthdayDepartment, setBirthdayDepartment] = useState('all');
  const [birthdayOffice, setBirthdayOffice] = useState('all');

  const { data, isLoading } = useHRReport(queryDates);
  const { data: headcountData, isLoading: isHeadcountLoading } = useHrHeadcount({ groupBy: headcountGroupBy });
  const { data: birthdaysData, isLoading: isBirthdaysLoading } = useHrBirthdays(birthdayPeriod);

  const birthdayStaffs = safeArray(birthdaysData?.staffs);
  const birthdayDepartments = useMemo(
    () => Array.from(new Set(birthdayStaffs.map((staff) => staff.department?.trim()).filter(hasValue))).sort(),
    [birthdayStaffs],
  );
  const birthdayOffices = useMemo(
    () => Array.from(new Set(birthdayStaffs.map((staff) => staff.office?.trim()).filter(hasValue))).sort(),
    [birthdayStaffs],
  );
  const filteredBirthdayStaffs = useMemo(() => {
    const searchTerm = normalizeText(birthdaySearch);

    return birthdayStaffs.filter((staff) => {
      const matchesSearch =
        !searchTerm ||
        normalizeText(fullName(staff.firstName, staff.surname)).includes(searchTerm) ||
        normalizeText(staff.department).includes(searchTerm) ||
        normalizeText(staff.office).includes(searchTerm) ||
        normalizeText(staff.favoriteCake).includes(searchTerm);

      const matchesDepartment = birthdayDepartment === 'all' || staff.department?.trim() === birthdayDepartment;
      const matchesOffice = birthdayOffice === 'all' || staff.office?.trim() === birthdayOffice;

      return matchesSearch && matchesDepartment && matchesOffice;
    });
  }, [birthdayDepartment, birthdayOffice, birthdaySearch, birthdayStaffs]);
  const hasBirthdayFilters =
    birthdaySearch.trim().length > 0 || birthdayDepartment !== 'all' || birthdayOffice !== 'all';
  const birthdayVisibleCount = hasBirthdayFilters ? filteredBirthdayStaffs.length : birthdayStaffs.length;


  const [weeklyGridWeekStart, setWeeklyGridWeekStart] = useState(() => {
    const d = new Date();
    const day = d.getUTCDay();
    const diff = day === 0 ? 6 : day - 1;
    d.setUTCDate(d.getUTCDate() - diff);
    return d.toISOString().slice(0, 10);
  });
  const [weeklyGridCompanyId, setWeeklyGridCompanyId] = useState('');
  const [weeklyGridDeptId, setWeeklyGridDeptId] = useState('');
  const [weeklyGridTeamId, setWeeklyGridTeamId] = useState('');
  const [weeklyGridStaff, setWeeklyGridStaff] = useState<SelectedStaff | null>(null);

  const gridRoles = useAuthStore((s) => s.user?.roles ?? []);
  const isSuperAdmin = gridRoles.includes('SUPER_ADMIN');

  const { data: companiesData } = useCompanies({ limit: 100 });
  const { data: deptsData } = useDepartments({ companyId: weeklyGridCompanyId || undefined, limit: 200 });
  const { data: teamsData } = useTeams({ companyId: weeklyGridCompanyId || undefined, limit: 200 });

  // ── Disabled Managers tab ─────────────────────────────────────────────────
  const { data: disabledManagersData, isLoading: isDisabledManagersLoading } = useDisabledManagers();
  const disabledManagerRows = safeArray(disabledManagersData) as IDisabledManagerRow[];

  const removeManagerMutation = useMutation({
    mutationFn: ({ scopeType, scopeId, staffId }: { scopeType: IDisabledManagerRow['scopeType']; scopeId: string; staffId: string }) => {
      if (scopeType === 'Company') return removeCompanyManager(scopeId, staffId);
      if (scopeType === 'Department') return removeDepartmentManager(scopeId, staffId);
      if (scopeType === 'Office') return removeOfficeManager(scopeId, staffId);
      return removeTeamManager(scopeId, staffId);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['reports', 'disabled-managers'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard', 'hr'] });
    },
  });

  const { data: weeklyGridData, isLoading: isWeeklyGridLoading } = useWeeklyGrid({
    weekStart: weeklyGridWeekStart,
    companyId: weeklyGridCompanyId || undefined,
    departmentId: weeklyGridDeptId || undefined,
    teamId: weeklyGridTeamId || undefined,
    staffId: weeklyGridStaff?.id,
    clientTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });
  const exportWeeklyGridMutation = useExportWeeklyGrid();

  const hasGridFilters = !!weeklyGridCompanyId || !!weeklyGridDeptId || !!weeklyGridTeamId || !!weeklyGridStaff;

  function resetGridFilters() {
    setWeeklyGridCompanyId('');
    setWeeklyGridDeptId('');
    setWeeklyGridTeamId('');
    setWeeklyGridStaff(null);
  }
  function weekRangeLabel(monday: string): string {
    const s = new Date(monday + 'T12:00:00Z');
    const e = new Date(s); e.setUTCDate(s.getUTCDate() + 4);
    return s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' – ' + e.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
  function shiftWeek(offset: number) {
    const d = new Date(weeklyGridWeekStart + 'T12:00:00Z');
    d.setUTCDate(d.getUTCDate() + offset * 7);
    setWeeklyGridWeekStart(d.toISOString().slice(0, 10));
  }
  const VIOLATION_KEYS: (keyof IWeeklyGridDay)[] = ['late', 'undertime', 'unproductive', 'overBreak', 'absent'];
  const VIOLATION_LABELS = ['L', 'U', 'P', 'O', 'A'];
  const VIOLATION_FULL = ['Late', 'Undertime', 'Unproductive', 'Over-break', 'Absent'];
  const VIOLATION_COLORS = ['bg-red-500 text-white', 'bg-blue-300 text-white', 'bg-green-400 text-white', 'bg-orange-400 text-white', 'bg-gray-800 text-white'];
  const VIOLATION_CELL_COLORS = ['bg-red-100', 'bg-blue-100', 'bg-green-100', 'bg-orange-100', 'bg-gray-100'];

  function handleGenerate() {
    setQueryDates({ startDate, endDate });
    setSubmitted(true);
  }

  function handleResetOverview() {
    const resetStart = defaultStartDate();
    const resetEnd = format(new Date(), 'yyyy-MM-dd');
    setStartDate(resetStart);
    setEndDate(resetEnd);
    setQueryDates({ startDate: '', endDate: '' });
    setSubmitted(false);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">HR Report</h1>
        <p className="text-sm text-muted-foreground">Workforce summary and analytics</p>
      </div>

      <Tabs value={tab} onValueChange={(value) => handleTabChange(value as ReportTab)}>
        <TabsList className="h-auto flex-wrap gap-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="headcount">Headcount</TabsTrigger>
          <TabsTrigger value="birthdays" data-testid="hr-report-birthdays-tab-trigger">Birthdays</TabsTrigger>
          <TabsTrigger value="weekly-grid" data-testid="hr-report-weekly-grid-tab-trigger">Weekly Grid</TabsTrigger>
          <TabsTrigger value="disabled-managers" data-testid="hr-report-disabled-managers-tab-trigger">Disabled Managers</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <FilterBar
            title="Period"
            actions={
              <>
                <Button onClick={handleGenerate} disabled={!startDate || !endDate}>
                  Generate
                </Button>
                <Button variant="outline" onClick={handleResetOverview} data-testid="hr-report-overview-reset">
                  Reset
                </Button>
              </>
            }
          >
            <DateRangePresetPicker
              value={{ startDate, endDate }}
              onChange={({ startDate: nextStartDate, endDate: nextEndDate }) => {
                setStartDate(nextStartDate ?? '');
                setEndDate(nextEndDate ?? '');
              }}
              label="Period"
              className="sm:col-span-2"
            />
          </FilterBar>

          {isLoading && submitted && (
            <div className="flex h-32 items-center justify-center">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          )}

          {data && !isLoading && (
            <>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="rounded-xl border bg-card p-4 shadow-sm">
                  <p className="text-xs text-muted-foreground">Total Staff</p>
                  <p className="mt-1 text-2xl font-bold">{data.totalStaff}</p>
                </div>
                <div className="rounded-xl border bg-card p-4 shadow-sm">
                  <p className="text-xs text-muted-foreground">Active Staff</p>
                  <p className="mt-1 text-2xl font-bold text-green-600">{data.activeStaff}</p>
                </div>
                <div className="rounded-xl border bg-card p-4 shadow-sm">
                  <p className="text-xs text-muted-foreground">Working Days</p>
                  <p className="mt-1 text-2xl font-bold">{data.totalWorkingDays}</p>
                </div>
                <div className="rounded-xl border bg-card p-4 shadow-sm">
                  <p className="text-xs text-muted-foreground">Avg Daily Attendance</p>
                  <p className="mt-1 text-2xl font-bold">{data.avgDailyAttendance}</p>
                </div>
              </div>

              <div className="rounded-xl border bg-card shadow-sm">
                <div className="border-b px-6 py-3">
                  <p className="font-medium text-foreground">By Department</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
                        <th className="px-6 py-3 font-medium">Department</th>
                        <th className="px-6 py-3 font-medium text-right">Staff</th>
                        <th className="px-6 py-3 font-medium text-right">Working Days</th>
                        <th className="px-6 py-3 font-medium text-right">Avg Daily</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {data.byDepartment.map((dept) => (
                        <tr key={dept.departmentId || dept.departmentName} className="hover:bg-muted/30">
                          <td className="px-6 py-3 font-medium">{dept.departmentName}</td>
                          <td className="px-6 py-3 text-right">{dept.staffCount}</td>
                          <td className="px-6 py-3 text-right">{dept.totalWorkingDays}</td>
                          <td className="px-6 py-3 text-right">{dept.avgDailyAttendance}</td>
                        </tr>
                      ))}
                      {data.byDepartment.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-6 py-4 text-center text-muted-foreground">
                            No department data for this period
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="rounded-xl border bg-card shadow-sm">
                <div className="border-b px-6 py-3">
                  <p className="font-medium text-foreground">By Status</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
                        <th className="px-6 py-3 font-medium">Status</th>
                        <th className="px-6 py-3 font-medium text-right">Records</th>
                        <th className="px-6 py-3 font-medium text-right">Total Hours</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {data.byStatus.map((s) => (
                        <tr key={s.statusName} className="hover:bg-muted/30">
                          <td className="px-6 py-3">{s.statusName}</td>
                          <td className="px-6 py-3 text-right">{s.totalRecords}</td>
                          <td className="px-6 py-3 text-right">{formatHours(s.totalDurationSeconds)}</td>
                        </tr>
                      ))}
                      {data.byStatus.length === 0 && (
                        <tr>
                          <td colSpan={3} className="px-6 py-4 text-center text-muted-foreground">
                            No status data for this period
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {!data && !isLoading && submitted && (
            <div className="flex h-32 items-center justify-center rounded-xl border bg-card">
              <p className="text-sm text-muted-foreground">No data available for this period</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="headcount" className="space-y-4">
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              {([
                { label: 'Department', value: 'department' },
                { label: 'Office', value: 'office' },
                { label: 'Team', value: 'team' },
                { label: 'Client', value: 'client' },
              ] as const).map((option) => (
                <Button
                  key={option.value}
                  size="sm"
                  variant={headcountGroupBy === option.value ? 'default' : 'outline'}
                  onClick={() => setHeadcountGroupBy(option.value)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border bg-card shadow-sm">
            <div className="flex items-center justify-between border-b px-6 py-3">
              <p className="font-medium text-foreground">Headcount by {headcountGroupBy}</p>
              <p className="text-sm text-muted-foreground">Total: {headcountData?.total ?? 0}</p>
            </div>

            {isHeadcountLoading ? (
              <div className="flex h-32 items-center justify-center">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
                      <th className="px-6 py-3 font-medium">Group</th>
                      <th className="px-6 py-3 font-medium text-right">Count</th>
                      <th className="px-6 py-3 font-medium text-right">Percentage</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {safeArray(headcountData?.groups).map((group) => (
                      <tr key={group.label} className="hover:bg-muted/30">
                        <td className="px-6 py-3 font-medium">{group.label}</td>
                        <td className="px-6 py-3 text-right">{group.count}</td>
                        <td className="px-6 py-3 text-right">{group.percentage}%</td>
                      </tr>
                    ))}
                    {safeArray(headcountData?.groups).length === 0 && (
                      <tr>
                        <td colSpan={3} className="px-6 py-4 text-center text-muted-foreground">
                          No headcount data
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="birthdays" className="space-y-4">
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="rounded-lg border bg-muted/20 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant={birthdayPeriod === 'this-month' ? 'default' : 'outline'}
                  onClick={() => setBirthdayPeriod('this-month')}
                  data-testid="birthday-period-this-month-btn"
                >
                  This month
                </Button>
                <Button
                  size="sm"
                  variant={birthdayPeriod === 'next-month' ? 'default' : 'outline'}
                  onClick={() => setBirthdayPeriod('next-month')}
                  data-testid="birthday-period-next-month-btn"
                >
                  Next month
                </Button>
                <Button
                  size="sm"
                  variant={birthdayPeriod === 'next-week' ? 'default' : 'outline'}
                  onClick={() => setBirthdayPeriod('next-week')}
                  data-testid="birthday-period-next-week-btn"
                >
                  Next week
                </Button>
              </div>

              <p className="mt-3 text-sm text-muted-foreground">
                {isBirthdaysLoading
                  ? 'Loading birthday data...'
                  : hasBirthdayFilters
                    ? `There ${filteredBirthdayStaffs.length === 1 ? 'is' : 'are'} ${filteredBirthdayStaffs.length} matching ${filteredBirthdayStaffs.length === 1 ? 'birthday' : 'birthdays'} out of ${birthdayStaffs.length} in this period.`
                    : birthdayStaffs.length === 0
                      ? 'There are no birthdays in this period.'
                      : birthdayStaffs.length === 1
                        ? 'There is 1 person with a birthday in this period.'
                        : `There are ${birthdayStaffs.length} people with birthdays in this period.`}
                <span
                  data-testid="birthday-count-value"
                  aria-label="Birthday count"
                  className="ml-3 inline-flex min-w-8 items-center justify-center rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground"
                >
                  {isBirthdaysLoading ? '-' : birthdayVisibleCount}
                </span>
              </p>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1.4fr)_repeat(2,minmax(0,0.8fr))_auto]">
              <Input
                value={birthdaySearch}
                onChange={(event) => setBirthdaySearch(event.target.value)}
                placeholder="Search by name, department, office, or favorite cake"
                className="h-11 rounded-xl border-border/70 bg-background/90"
                data-testid="birthday-search-input"
              />

              <Select value={birthdayDepartment} onValueChange={setBirthdayDepartment}>
                <SelectTrigger
                  className="h-11 rounded-xl border-border/70 bg-background/90"
                  data-testid="birthday-department-select"
                >
                  <SelectValue placeholder="All departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All departments</SelectItem>
                  {birthdayDepartments.map((department) => (
                    <SelectItem key={department} value={department}>
                      {department}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={birthdayOffice} onValueChange={setBirthdayOffice}>
                <SelectTrigger
                  className="h-11 rounded-xl border-border/70 bg-background/90"
                  data-testid="birthday-office-select"
                >
                  <SelectValue placeholder="All offices" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All offices</SelectItem>
                  {birthdayOffices.map((office) => (
                    <SelectItem key={office} value={office}>
                      {office}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-xl"
                onClick={() => {
                  setBirthdaySearch('');
                  setBirthdayDepartment('all');
                  setBirthdayOffice('all');
                }}
                disabled={!hasBirthdayFilters}
                data-testid="birthday-clear-filters-btn"
              >
                Clear filters
              </Button>
            </div>

            {hasBirthdayFilters && !isBirthdaysLoading ? (
              <p className="mt-3 text-xs text-muted-foreground">
                Showing {filteredBirthdayStaffs.length} of {birthdayStaffs.length} birthdays for this period.
              </p>
            ) : null}

            {isBirthdaysLoading ? (
              <div className="flex h-32 items-center justify-center">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : birthdayStaffs.length === 0 ? (
              <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
                No birthday staff for this period.
              </div>
            ) : filteredBirthdayStaffs.length === 0 ? (
              <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
                No staff match the current search and filters.
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                <div className="hidden overflow-hidden rounded-xl border bg-card md:block">
                  <div className="grid grid-cols-[minmax(0,1.6fr)_110px_80px_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)] border-b bg-muted/40 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <p className="px-4 py-3">Staff</p>
                    <p className="px-4 py-3">Birthday</p>
                    <p className="px-4 py-3">Age</p>
                    <p className="px-4 py-3">Department</p>
                    <p className="px-4 py-3">Office</p>
                    <p className="px-4 py-3">Favorite Cake</p>
                  </div>

                  {filteredBirthdayStaffs.map((staff) => {
                    const name = fullName(staff.firstName, staff.surname);
                    const isToday = staff.daysUntilBirthday === 0;

                    return (
                      <div
                        key={staff.id}
                        className="grid grid-cols-[minmax(0,1.6fr)_110px_80px_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)] items-center border-b text-sm last:border-b-0"
                      >
                        <div className="flex min-w-0 items-center gap-3 px-4 py-3">
                          <BirthdayAvatar photo={staff.photoBirthday ?? staff.photo} fallback={name} />
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-foreground">{name}</p>
                            <p className="text-xs text-muted-foreground">
                              {isToday ? 'Today' : `${staff.daysUntilBirthday} days left`}
                            </p>
                          </div>
                        </div>
                        <p className="px-4 py-3 font-medium text-foreground">{formatBirthday(staff.dateOfBirth)}</p>
                        <p className="px-4 py-3 text-foreground">{staff.age}</p>
                        <p className="truncate px-4 py-3 text-foreground">{staff.department ?? 'No Department'}</p>
                        <p className="truncate px-4 py-3 text-foreground">{staff.office ?? 'No Office'}</p>
                        <p className="truncate px-4 py-3 text-foreground">{staff.favoriteCake ?? 'Not set'}</p>
                      </div>
                    );
                  })}
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:hidden">
                  {filteredBirthdayStaffs.map((staff) => (
                    <BirthdayCard key={staff.id} staff={staff} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </TabsContent>
        <TabsContent value="weekly-grid" className="space-y-4">
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="flex flex-wrap items-end gap-3">
              {/* Week navigation */}
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-muted-foreground">Week</span>
                <div className="flex items-center gap-1">
                  <Button variant="outline" onClick={() => shiftWeek(-1)} data-testid="weekly-grid-prev-week" className="h-11 px-3 rounded-xl">←</Button>
                  <span className="px-2 text-sm font-medium" data-testid="weekly-grid-week-label">{weekRangeLabel(weeklyGridWeekStart)}</span>
                  <Button variant="outline" onClick={() => shiftWeek(1)} data-testid="weekly-grid-next-week" className="h-11 px-3 rounded-xl">→</Button>
                </div>
              </div>

              {isSuperAdmin && (
                <EntitySelect
                  label="Company"
                  value={weeklyGridCompanyId}
                  onValueChange={(id) => { setWeeklyGridCompanyId(id); setWeeklyGridDeptId(''); setWeeklyGridTeamId(''); setWeeklyGridStaff(null); }}
                  options={companiesData?.data ?? []}
                  emptyLabel="All companies"
                  placeholder="Filter by company"
                  entityType="COMPANY"
                  triggerClassName="min-w-[13rem]"
                  testId="weekly-grid-company-select"
                />
              )}

              <EntitySelect
                label="Department"
                value={weeklyGridDeptId}
                onValueChange={(id) => { setWeeklyGridDeptId(id); setWeeklyGridStaff(null); }}
                options={deptsData?.data ?? []}
                emptyLabel="All departments"
                placeholder="Filter by department"
                entityType="DEPARTMENT"
                triggerClassName="min-w-[13rem]"
                testId="weekly-grid-department-select"
              />

              <EntitySelect
                label="Team"
                value={weeklyGridTeamId}
                onValueChange={(id) => { setWeeklyGridTeamId(id); setWeeklyGridStaff(null); }}
                options={teamsData?.data ?? []}
                emptyLabel="All teams"
                placeholder="Filter by team"
                entityType="TEAM"
                triggerClassName="min-w-[11rem]"
                testId="weekly-grid-team-select"
              />

              <StaffPickerButton
                value={weeklyGridStaff}
                onSelect={setWeeklyGridStaff}
                label="Staff"
                placeholder="All staff"
                testId="weekly-grid-staff-picker"
              />

              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-muted-foreground invisible" aria-hidden="true">Actions</span>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={resetGridFilters} disabled={!hasGridFilters} data-testid="weekly-grid-reset-button" className="h-11 rounded-xl">
                    Reset
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => exportWeeklyGridMutation.mutate({ weekStart: weeklyGridWeekStart, companyId: weeklyGridCompanyId || undefined, departmentId: weeklyGridDeptId || undefined, teamId: weeklyGridTeamId || undefined, staffId: weeklyGridStaff?.id, clientTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone })}
                    disabled={exportWeeklyGridMutation.isPending}
                    data-testid="weekly-grid-export-button"
                    className="h-11 rounded-xl"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    {exportWeeklyGridMutation.isPending ? 'Exporting...' : 'Export Excel'}
                  </Button>
                </div>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {VIOLATION_FULL.map((label, i) => (
                <span key={label} className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium ${VIOLATION_COLORS[i]}`}>{VIOLATION_LABELS[i]} — {label}</span>
              ))}
            </div>
          </div>
          <div className="rounded-xl border bg-card shadow-sm overflow-x-auto">
            {isWeeklyGridLoading ? (
              <div className="flex h-32 items-center justify-center"><div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
            ) : (
              <table className="text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-xs text-muted-foreground">
                    <th className="px-3 py-2 font-medium w-10">No.</th>
                    <th className="px-3 py-2 font-medium">Employee No.</th>
                    <th className="px-3 py-2 font-medium min-w-[140px]">Staff Name</th>
                    {(weeklyGridData?.weekDates ?? []).map((date) => (
                      <th key={date} colSpan={5} className="px-1 py-2 font-medium text-center border-l">
                        {new Date(date + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </th>
                    ))}
                  </tr>
                  <tr className="border-b text-xs">
                    <th colSpan={3} />
                    {(weeklyGridData?.weekDates ?? []).flatMap((date) =>
                      VIOLATION_LABELS.map((label, i) => (
                        <th key={`${date}-${label}`} className={`w-7 py-1 text-center font-bold ${VIOLATION_COLORS[i]} border-l`}>{label}</th>
                      ))
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(weeklyGridData?.data ?? []).length === 0 ? (
                    <tr><td colSpan={3 + (weeklyGridData?.weekDates.length ?? 5) * 5} className="px-6 py-8 text-center text-sm text-muted-foreground">No data for this week</td></tr>
                  ) : (
                    (weeklyGridData?.data ?? []).map((row: IWeeklyGridStaff) => (
                      <tr key={row.staffId} className="hover:bg-muted/20">
                        <td className="px-3 py-2 text-center text-muted-foreground">{row.no}</td>
                        <td className="px-3 py-2 text-muted-foreground">{row.employeeNo}</td>
                        <td className="px-3 py-2 font-medium whitespace-nowrap">{row.staffName}</td>
                        {row.days.flatMap((day: IWeeklyGridDay, di: number) =>
                          VIOLATION_KEYS.map((key, vi) => {
                            const violated = Boolean(day[key]);
                            const tooltip = !violated ? '' : key === 'late' ? `Late ${day.lateMinutes}m` : key === 'undertime' ? `Undertime ${day.undertimeMinutes}m` : key === 'overBreak' ? `Over break ${day.overBreakCount}x` : key === 'absent' ? 'Absent' : 'Unproductive';
                            return (
                              <td key={`${di}-${vi}`} title={tooltip} className={`w-7 py-2 text-center text-xs font-bold border-l ${violated ? VIOLATION_CELL_COLORS[vi] : ''}`}>{violated ? 'X' : ''}</td>
                            );
                          })
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
          {(weeklyGridData?.data ?? []).length > 0 && (
            <p className="text-right text-xs text-muted-foreground">{weeklyGridData!.data.length} staff</p>
          )}
        </TabsContent>

        <TabsContent value="disabled-managers" className="space-y-4">
          {isDisabledManagersLoading ? (
            <div className="flex h-32 items-center justify-center">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : disabledManagerRows.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-green-200 bg-green-50/80 dark:bg-green-900/20 px-6 py-10 text-center">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
              <p className="text-sm font-medium text-green-800 dark:text-green-200">
                No disabled managers found — all manager assignments are active.
              </p>
            </div>
          ) : (
            <div className="rounded-xl border bg-card shadow-sm overflow-x-auto">
              <div className="flex items-center justify-between border-b px-6 py-3">
                <p className="font-medium text-foreground">Disabled Manager Assignments</p>
                <p className="text-sm text-muted-foreground">{disabledManagerRows.length} row{disabledManagerRows.length !== 1 ? 's' : ''}</p>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Scope Type</th>
                    <th className="px-4 py-3 font-medium">Scope Name</th>
                    <th className="px-4 py-3 font-medium">Staff Name</th>
                    <th className="px-4 py-3 font-medium">Employee ID</th>
                    <th className="px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {disabledManagerRows.map((row) => (
                    <tr key={row.rowId} className="hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground">
                          {row.scopeType}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium">{row.scopeName}</td>
                      <td className="px-4 py-3">{row.staffName}</td>
                      <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{row.staffEmployeeId}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={removeManagerMutation.isPending}
                            onClick={() =>
                              removeManagerMutation.mutate({
                                scopeType: row.scopeType,
                                scopeId: row.scopeId,
                                staffId: row.staffId,
                              })
                            }
                          >
                            Remove
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => void navigate(`/employees/${row.staffId}`)}
                          >
                            View Employee
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

      </Tabs>
    </div>
  );
}
