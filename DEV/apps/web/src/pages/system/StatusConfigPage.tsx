import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { safeArray } from '@/lib/safeArray';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { FormTextField } from '@/components/form/FormTextField';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Circle, ArrowRight, Eye, EyeOff, Search, X, CheckCircle2, AlertTriangle } from 'lucide-react';
import {
  useSystemStatuses,
  useCreateSystemStatus,
  useUpdateSystemStatus,
  useDeleteSystemStatus,
} from '@/hooks/useSystem';
import type { IStatusDefinition, ICreateStatusDto } from '@/api/system.api';
import { getApiErrorMessage, buildErrorToast } from '@/lib/apiError';
import { useCompanies } from '@/hooks/useCompany';
import { useOffices } from '@/hooks/useOffice';
import { useClients } from '@/hooks/useClient';
import { useTeams } from '@/hooks/useTeam';
import { useTabState } from '@/hooks/useTabState';
import { useCrudPermissions } from '@/hooks/useCrudPermissions';
import { AppIcon, resolveLucideIconName } from '@/components/AppIcon';
import { EntitySelect } from '@/components/entity/EntitySelect';
import { INPUT_LENGTH } from '@shared/constants/input-length';
import { optionalText, requiredName } from '@/lib/validation';

// ── Zod schema ────────────────────────────────────────────────────────────────

const statusSchema = z.object({
  name: requiredName('Name'),
  description: optionalText('Description'),
  colorHex: optionalText('Color hex', INPUT_LENGTH.code),
  iconId: optionalText('Icon', INPUT_LENGTH.name),
  companyId: z.string().optional(),
  officeId: z.string().optional(),
  clientId: z.string().optional(),
  teamId: z.string().optional(),
  isLoginStatus: z.boolean().optional(),
  isLogoutStatus: z.boolean().optional(),
  isWorkingInStatus: z.boolean().optional(),
  isWorkingOutStatus: z.boolean().optional(),
  isBreak: z.boolean().optional(),
  isAbsent: z.boolean().optional(),
  isIdleStatus: z.boolean().optional(),
  isNormalDayOff: z.boolean().optional(),
  isHalfDayOff: z.boolean().optional(),
  isPaid: z.boolean().optional(),
  // valueAsNumber: true on an empty input yields NaN
  maxDurationSeconds: z.union([
    z.number().nonnegative(),
    z.nan().transform(() => undefined)
  ]).optional(),
  orderNo: z.union([
    z.number().int().nonnegative(),
    z.nan().transform(() => undefined)
  ]).optional(),
});

type StatusFormValues = z.infer<typeof statusSchema>;

function normalizeStatusIconId(iconId?: string) {
  return resolveLucideIconName(iconId) ?? iconId?.trim() ?? undefined;
}

function formatMaxDuration(seconds?: number | null) {
  if (!seconds || seconds <= 0) return null;

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  const parts = [
    hours > 0 ? `${hours}h` : null,
    minutes > 0 ? `${minutes}m` : null,
    remainingSeconds > 0 ? `${remainingSeconds}s` : null,
  ].filter(Boolean);

  return parts.join(' ');
}

// ── Sort rule (CR-015) ────────────────────────────────────────────────────────
// Ascending by (orderNo, name). Server returns the same order; client sorts
// again so optimistic edits to orderNo reflow the row without a re-fetch wait.
function sortByOrder(list: IStatusDefinition[]) {
  return [...list].sort(
    (a, b) => (a.orderNo ?? 0) - (b.orderNo ?? 0) || a.name.localeCompare(b.name),
  );
}

// ── Status Row ────────────────────────────────────────────────────────────────
// Inline OrderNo input commits on blur / Enter. Blank / NaN / unchanged values
// do not trigger a request (CR-015 acceptance criteria).

function StatusRow({
  status,
  onEdit,
  onDelete,
  onToggleDisabled,
  onOrderNoCommit,
  canUpdate,
  canDelete,
}: {
  status: IStatusDefinition;
  onEdit: (s: IStatusDefinition) => void;
  onDelete: (s: IStatusDefinition) => void;
  onToggleDisabled: (s: IStatusDefinition) => void;
  onOrderNoCommit: (s: IStatusDefinition, nextOrderNo: number) => void;
  canUpdate: boolean;
  canDelete: boolean;
}) {
  const maxDurationLabel = formatMaxDuration(status.maxDurationSeconds);
  const [orderInput, setOrderInput] = useState(String(status.orderNo ?? 0));

  useEffect(() => {
    setOrderInput(String(status.orderNo ?? 0));
  }, [status.orderNo]);

  function commit() {
    const parsed = Number.parseInt(orderInput, 10);
    if (!Number.isFinite(parsed) || parsed < 0) {
      setOrderInput(String(status.orderNo ?? 0));
      return;
    }
    if (parsed === (status.orderNo ?? 0)) return;
    onOrderNoCommit(status, parsed);
  }

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 border-b border-border last:border-0 bg-card${status.isDisabled ? ' opacity-50' : ''}`}
    >
      <Input
        type="number"
        min={0}
        step={1}
        value={orderInput}
        onChange={(e) => setOrderInput(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            (e.target as HTMLInputElement).blur();
          }
        }}
        disabled={!canUpdate}
        aria-label={`Order for ${status.name}`}
        className="h-8 w-16 text-center"
      />
      <div
        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-border shadow-sm"
        style={{
          color: status.colorHex ?? '#6b7280',
          backgroundColor: `${status.colorHex ?? '#6b7280'}18`,
        }}
      >
        <AppIcon
          iconId={status.iconId}
          alt={status.name}
          className="h-5 w-5"
          fallback={<Circle className="h-4 w-4 opacity-70" />}
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium">{status.name}</div>
        {maxDurationLabel && (
          <p className="text-xs text-muted-foreground">
            Max Duration: {maxDurationLabel}
          </p>
        )}
      </div>
      <div className="flex gap-1 flex-wrap">
        {status.isDisabled && <Badge variant="secondary" className="text-xs">Disabled</Badge>}
        {status.isLoginStatus && <Badge variant="outline" className="text-xs">Login</Badge>}
        {status.isLogoutStatus && <Badge variant="outline" className="text-xs">Logout</Badge>}
        {status.isWorkingInStatus && <Badge variant="outline" className="text-xs">Work In</Badge>}
        {status.isWorkingOutStatus && <Badge variant="outline" className="text-xs">Work Out</Badge>}
        {status.isBreak && <Badge variant="outline" className="text-xs">Break</Badge>}
        {status.isAbsent && <Badge variant="outline" className="text-xs">Absent</Badge>}
        {status.isIdleStatus && <Badge variant="outline" className="text-xs">Idle</Badge>}
        {status.isNormalDayOff && <Badge variant="outline" className="text-xs">Day Off</Badge>}
        {status.isHalfDayOff && <Badge variant="outline" className="text-xs">Half Off</Badge>}
        {status.isPaid && <Badge variant="outline" className="text-xs">Paid</Badge>}
        {maxDurationLabel && <Badge variant="secondary" className="text-xs">Max {maxDurationLabel}</Badge>}
      </div>
      <div className="flex items-center gap-1">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onToggleDisabled(status)}
          title={status.isDisabled ? 'Enable status' : 'Disable status'}
        >
          {status.isDisabled ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
        </Button>
        {canUpdate && (
          <Button size="sm" variant="ghost" onClick={() => onEdit(status)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        )}
        {canDelete && (
          <Button size="sm" variant="ghost" onClick={() => onDelete(status)} className="text-destructive">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

// ── Scoped Status List ────────────────────────────────────────────────────────

type Scope = 'system' | 'company' | 'office' | 'client' | 'team';

function StatusList({ scope, scopeId }: { scope: Scope; scopeId?: string }) {
  const { toast } = useToast();
  const errToast = buildErrorToast(toast);
  // System scope: no scopeId needed (global rows). Other scopes: require scopeId.
  const listFilter = scope === 'system' ? { scope } : scopeId ? { scope, scopeId } : undefined;
  const { data: rawStatuses, isLoading } = useSystemStatuses(listFilter);
  const statuses = useMemo(() => sortByOrder(safeArray(rawStatuses)), [rawStatuses]);
  const perm = useCrudPermissions('SY03');
  const createMutation = useCreateSystemStatus();
  const updateMutation = useUpdateSystemStatus();
  const deleteMutation = useDeleteSystemStatus();

  const [searchTerm, setSearchTerm] = useState('');
  const filteredStatuses = searchTerm
    ? statuses.filter((s) => s.name.toLowerCase().includes(searchTerm.toLowerCase()))
    : statuses;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<IStatusDefinition | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<IStatusDefinition | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<StatusFormValues>({
    resolver: zodResolver(statusSchema),
    defaultValues: {
      isLoginStatus: false,
      isLogoutStatus: false,
      isWorkingInStatus: false,
      isWorkingOutStatus: false,
      isBreak: false,
      isAbsent: false,
      isIdleStatus: false,
      isNormalDayOff: false,
      isHalfDayOff: false,
      isPaid: false,
    },
  });

  const currentIconId = watch('iconId');
  const currentColorHex = watch('colorHex') ?? '#6b7280';
  const normalizedCurrentIconId = normalizeStatusIconId(currentIconId);
  const iconResolved = !!currentIconId?.trim() && !!resolveLucideIconName(currentIconId);

  function handleAdd() {
    setEditTarget(null);
    reset({
      isLoginStatus: false,
      isLogoutStatus: false,
      isWorkingInStatus: false,
      isWorkingOutStatus: false,
      isBreak: false,
      isAbsent: false,
      isIdleStatus: false,
      isNormalDayOff: false,
      isHalfDayOff: false,
      isPaid: false,
      colorHex: '#6b7280',
      iconId: '',
      description: '',
      orderNo: 0,
    });
    setDialogOpen(true);
  }

  function handleEdit(s: IStatusDefinition) {
    setEditTarget(s);
    reset({
      name: s.name,
      description: s.description ?? '',
      colorHex: s.colorHex ?? '#6b7280',
      iconId: s.iconId ?? '',
      isLoginStatus: s.isLoginStatus,
      isLogoutStatus: s.isLogoutStatus,
      isWorkingInStatus: s.isWorkingInStatus,
      isWorkingOutStatus: s.isWorkingOutStatus,
      isBreak: s.isBreak,
      isAbsent: s.isAbsent,
      isIdleStatus: s.isIdleStatus,
      isNormalDayOff: s.isNormalDayOff,
      isHalfDayOff: s.isHalfDayOff,
      isPaid: s.isPaid,
      maxDurationSeconds: s.maxDurationSeconds ?? undefined,
      orderNo: s.orderNo,
    });
    setDialogOpen(true);
  }

  function handleRequestDelete(s: IStatusDefinition) {
    setDeleteTarget(s);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      toast({ title: 'Status deleted' });
    } catch (err: unknown) {
      toast({ title: getApiErrorMessage(err, 'Failed to delete status'), variant: 'destructive' });
    } finally {
      setDeleteTarget(null);
    }
  }

  async function handleToggleDisabled(s: IStatusDefinition) {
    try {
      await updateMutation.mutateAsync({ id: s.id, dto: { isDisabled: !s.isDisabled } });
      toast({ title: s.isDisabled ? 'Status enabled' : 'Status disabled' });
    } catch (err: unknown) {
      toast({ title: getApiErrorMessage(err, 'Failed to update status'), variant: 'destructive' });
    }
  }

  async function handleOrderNoCommit(s: IStatusDefinition, nextOrderNo: number) {
    try {
      await updateMutation.mutateAsync({ id: s.id, dto: { orderNo: nextOrderNo } });
    } catch (err: unknown) {
      errToast(err, 'Failed to update order');
    }
  }

  async function onSubmit(values: StatusFormValues) {
    try {
      const dto: ICreateStatusDto = {
        ...values,
        description: values.description || undefined,
        iconId: normalizeStatusIconId(values.iconId),
        // System scope → all scope IDs NULL (global row). Otherwise bind to scope.
        ...(scope !== 'system' && scopeId ? { [`${scope}Id`]: scopeId } : {}),
      };
      if (editTarget) {
        await updateMutation.mutateAsync({ id: editTarget.id, dto });
        toast({ title: 'Status updated' });
      } else {
        await createMutation.mutateAsync(dto);
        toast({ title: 'Status created' });
      }
      setDialogOpen(false);
    } catch (err: unknown) {
      errToast(err, editTarget ? 'Failed to update status' : 'Failed to create status');
    }
  }

  const flags: Array<{ key: keyof StatusFormValues; label: string }> = [
    { key: 'isLoginStatus', label: 'Login Status' },
    { key: 'isLogoutStatus', label: 'Logout Status' },
    { key: 'isWorkingInStatus', label: 'Working In' },
    { key: 'isWorkingOutStatus', label: 'Working Out' },
    { key: 'isBreak', label: 'Break' },
    { key: 'isAbsent', label: 'Absent' },
    { key: 'isIdleStatus', label: 'Idle' },
    { key: 'isNormalDayOff', label: 'Full Day Off' },
    { key: 'isHalfDayOff', label: 'Half Day Off' },
    { key: 'isPaid', label: 'Paid' },
  ];

  if (isLoading) return <p className="text-sm text-muted-foreground py-4">Loading...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filter by name..."
            className="pl-8 pr-8 h-9"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        {perm.canCreate && (
          <Button size="sm" onClick={handleAdd} className="ml-auto">
            <Plus className="h-4 w-4 mr-2" />
            Add Status
          </Button>
        )}
      </div>

      <div className="rounded-md border border-border overflow-hidden">
        {filteredStatuses.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">
            {searchTerm ? 'No statuses match your filter.' : 'No statuses found.'}
          </p>
        ) : (
          filteredStatuses.map((s) => (
            <StatusRow
              key={s.id}
              status={s}
              onEdit={handleEdit}
              onDelete={handleRequestDelete}
              onToggleDisabled={handleToggleDisabled}
              onOrderNoCommit={handleOrderNoCommit}
              canUpdate={perm.canUpdate}
              canDelete={perm.canDelete}
            />
          ))
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editTarget ? 'Edit Status' : 'Add Status'}</DialogTitle>
          </DialogHeader>
          <form id="status-config-form" onSubmit={handleSubmit(onSubmit)} className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-4">
            <FormTextField
              id="s-name"
              label="Name"
              required
              registration={register('name')}
              current={watch('name')}
              maxLength={INPUT_LENGTH.name}
              error={errors.name?.message}
            />

            <FormTextField
              id="s-description"
              label="Description"
              multiline
              rows={3}
              registration={register('description')}
              current={watch('description')}
              maxLength={INPUT_LENGTH.text}
              placeholder="Optional description"
              error={errors.description?.message}
            />

            <div className="space-y-1">
              <Label htmlFor="s-color">Color</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  id="s-color"
                  value={watch('colorHex') ?? '#6b7280'}
                  onChange={(e) => setValue('colorHex', e.target.value)}
                  className="h-9 w-16 cursor-pointer rounded-md border border-input bg-background px-1"
                />
                <Input
                  value={watch('colorHex') ?? ''}
                  onChange={(e) => setValue('colorHex', e.target.value)}
                  placeholder="#6b7280"
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="s-icon">Icon Name</Label>
                <a
                  href="https://lucide.dev/icons"
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  Browse all icons <ArrowRight className="h-3 w-3" />
                </a>
              </div>
              <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-3">
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-background shadow-sm"
                  style={{ color: currentColorHex }}
                >
                  <AppIcon
                    iconId={normalizedCurrentIconId}
                    alt="Selected status icon"
                    className="h-6 w-6"
                    fallback={<Circle className="h-5 w-5 opacity-70" />}
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <FormTextField
                    id="s-icon"
                    label="Icon Name"
                    registration={register('iconId')}
                    current={watch('iconId')}
                    maxLength={INPUT_LENGTH.name}
                    placeholder="circle-alert or CircleAlert"
                    onBlur={(event) => {
                      const normalizedIconId = normalizeStatusIconId(event.target.value);
                      setValue('iconId', normalizedIconId ?? '', { shouldDirty: true, shouldTouch: true });
                    }}
                    helperText="Accepts both Lucide website names like `circle-alert` and React export names like `CircleAlert`."
                    error={errors.iconId?.message}
                    wrapperClassName="space-y-1"
                  />
                  {currentIconId?.trim() && (
                    <p className={`flex items-center gap-1 text-xs mt-1 ${iconResolved ? 'text-green-600' : 'text-amber-600'}`}>
                      {iconResolved
                        ? <><CheckCircle2 className="h-3 w-3" /> Icon found</>
                        : <><AlertTriangle className="h-3 w-3" /> Icon not found in Lucide v1.8.0. Browse <a href="https://lucide.dev/icons" target="_blank" rel="noreferrer" className="underline">lucide.dev/icons</a> and pick one from that list.</>

                      }
                    </p>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {['Clock', 'Briefcase', 'Coffee', 'Home', 'Activity', 'CheckCircle', 'Star', 'User', 'Calendar', 'MapPin'].map(iconName => {
                  return (
                    <Button
                      key={iconName}
                      type="button"
                      variant={normalizedCurrentIconId === iconName ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setValue('iconId', iconName, { shouldDirty: true, shouldTouch: true })}
                      className="px-2"
                    >
                      <AppIcon iconId={iconName} className="mr-1 h-4 w-4" />
                      {iconName}
                    </Button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Status Flags</Label>
              <div className="grid grid-cols-2 gap-2">
                {flags
                  .filter(({ key }) =>
                    key === 'isLoginStatus' || key === 'isLogoutStatus' ? scope === 'system' : true,
                  )
                  .map(({ key, label }) => (
                    <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!watch(key)}
                        onChange={(e) => setValue(key, e.target.checked)}
                        className="h-4 w-4 rounded border-border"
                      />
                      {label}
                    </label>
                  ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="s-max">Max Duration (seconds)</Label>
                <Input
                  id="s-max"
                  type="number"
                  min={0}
                  {...register('maxDurationSeconds', { valueAsNumber: true })}
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="s-order-no">Order No</Label>
                <Input
                  id="s-order-no"
                  type="number"
                  min={0}
                  step={1}
                  {...register('orderNo', { valueAsNumber: true })}
                  placeholder="0"
                />
                <p className="text-xs text-muted-foreground">
                  Lower renders first. Ties broken alphabetically.
                </p>
              </div>
            </div>

          </form>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="status-config-form" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Confirm Delete"
        description={`Are you sure you want to delete "${deleteTarget?.name ?? ''}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function StatusConfigPage() {
  type StatusConfigTabId = 'system' | 'company' | 'office' | 'client' | 'team';

  function isStatusConfigTab(value: unknown): value is StatusConfigTabId {
    return (
      value === 'system' ||
      value === 'company' ||
      value === 'office' ||
      value === 'client' ||
      value === 'team'
    );
  }

  const { data: companiesData } = useCompanies({ limit: 100 });
  const { data: officesData } = useOffices({ limit: 100 });
  const { data: clientsData } = useClients({ limit: 100 });
  const { data: teamsData } = useTeams({ limit: 100 });

  const [activeTab, setActiveTab] = useTabState<StatusConfigTabId>('system', isStatusConfigTab);

  const [selectedCompanyId, setSelectedCompanyId] = useState<string | undefined>();
  const [selectedOfficeId, setSelectedOfficeId] = useState<string | undefined>();
  const [selectedClientId, setSelectedClientId] = useState<string | undefined>();
  const [selectedTeamId, setSelectedTeamId] = useState<string | undefined>();

  const effectiveCompanyId = selectedCompanyId ?? companiesData?.data?.[0]?.id;
  const effectiveOfficeId = selectedOfficeId ?? officesData?.data?.[0]?.id;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Status Config</h1>
        <p className="text-sm text-muted-foreground">
          Manage status definitions by scope. Resolution: UNION of scopes the employee belongs to (Company + Office + Client + Team), deduped by Id. System rows (Login/Logout) apply to every company. Rows are sorted by Order then Name — set the order directly in each row.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as StatusConfigTabId)}>
        <TabsList>
          <TabsTrigger value="system">System</TabsTrigger>
          <TabsTrigger value="company">Company</TabsTrigger>
          <TabsTrigger value="office">Office</TabsTrigger>
          <TabsTrigger value="client">Client</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
        </TabsList>

        <TabsContent value="system" className="mt-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            System-wide statuses apply to every company. Login and Logout are managed here — they never appear in the employee status picker and cannot be scoped per company.
          </p>
          <StatusList scope="system" />
        </TabsContent>

        <TabsContent value="company" className="mt-4 space-y-4">
          <EntitySelect
            value={effectiveCompanyId ?? ''}
            onValueChange={setSelectedCompanyId}
            options={companiesData?.data ?? []}
            placeholder="Select company"
            emptyLabel="Select company"
            entityType="COMPANY"
            testId="status-config-company-select"
            triggerClassName="w-64"
          />
          {effectiveCompanyId && <StatusList scope="company" scopeId={effectiveCompanyId} />}
        </TabsContent>

        <TabsContent value="office" className="mt-4 space-y-4">
          <EntitySelect
            value={effectiveOfficeId ?? ''}
            onValueChange={setSelectedOfficeId}
            options={officesData?.data ?? []}
            placeholder="Select office"
            emptyLabel="Select office"
            entityType="OFFICE"
            testId="status-config-office-select"
            triggerClassName="w-64"
          />
          {effectiveOfficeId && <StatusList scope="office" scopeId={effectiveOfficeId} />}
        </TabsContent>

        <TabsContent value="client" className="mt-4 space-y-4">
          <EntitySelect
            value={selectedClientId ?? ''}
            onValueChange={setSelectedClientId}
            options={clientsData?.data ?? []}
            placeholder="Select client"
            emptyLabel="Select client"
            entityType="CLIENT"
            testId="status-config-client-select"
            triggerClassName="w-64"
          />
          {!selectedClientId && (
            <p className="text-sm text-muted-foreground py-4">Select a client above to manage its statuses.</p>
          )}
          {selectedClientId && <StatusList scope="client" scopeId={selectedClientId} />}
        </TabsContent>

        <TabsContent value="team" className="mt-4 space-y-4">
          <EntitySelect
            value={selectedTeamId ?? ''}
            onValueChange={setSelectedTeamId}
            options={teamsData?.data ?? []}
            placeholder="Select team"
            emptyLabel="Select team"
            entityType="TEAM"
            testId="status-config-team-select"
            triggerClassName="w-64"
          />
          {!selectedTeamId && (
            <p className="text-sm text-muted-foreground py-4">Select a team above to manage its statuses.</p>
          )}
          {selectedTeamId && <StatusList scope="team" scopeId={selectedTeamId} />}
        </TabsContent>
      </Tabs>
    </div>
  );
}
