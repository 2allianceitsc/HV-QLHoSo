import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Building2, Users, UserCog, Trash2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useTabState } from '@/hooks/useTabState';
import { useOffice, useUpdateOffice } from '@/hooks/useOffice';
import {
  getOfficeManagers,
  removeOfficeManager,
  replaceOfficeManagers,
  getOfficeEmployees,
} from '@/api/org.api';
import { safeArray } from '@/lib/safeArray';
import { buildErrorToast } from '@/lib/apiError';
import { UserAvatar } from '@/components/UserAvatar';
import { EntityAvatar } from '@/components/entity/entityVisuals';
import { VisualIdentityFields } from '@/components/entity/VisualIdentityFields';
import { StaffMultiPickerButton } from '@/components/staff/StaffMultiPickerButton';
import type { SelectedStaff } from '@/components/staff/StaffMultiPickerButton';
import { TimezoneSelect } from '@/components/ui/TimezoneSelect';
import { INPUT_LENGTH } from '@shared/constants/input-length';
import { optionalText, requiredCode, requiredName, requiredText } from '@/lib/validation';

// ── Schemas ───────────────────────────────────────────────────────────────────

const officeSchema = z.object({
  officeCode: requiredCode('Code'),
  officeName: requiredName('Name'),
  companyId: requiredText('Company'),
  officeAddress: optionalText('Address'),
  city: optionalText('City'),
  country: optionalText('Country'),
  timezone: optionalText('Timezone'),
  colorHex: optionalText('Color hex'),
  iconId: optionalText('Icon'),
});

type OfficeFormValues = z.infer<typeof officeSchema>;

// ── Tabs ──────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'general', label: 'General', icon: Building2 },
  { id: 'managers', label: 'Managers', icon: UserCog },
  { id: 'employees', label: 'Employees', icon: Users },
] as const;

type TabId = typeof TABS[number]['id'];

function isOfficeTab(v: unknown): v is TabId {
  return TABS.some((t) => t.id === v);
}

// ── General Tab ───────────────────────────────────────────────────────────────

function GeneralTab({ officeId }: { officeId: string }) {
  const { toast } = useToast();
  const { data: office, isLoading } = useOffice(officeId);
  const updateMutation = useUpdateOffice();
  const [editing, setEditing] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<OfficeFormValues>({
    resolver: zodResolver(officeSchema),
  });

  function startEdit() {
    if (!office) return;
    reset({
      officeCode: office.code ?? '',
      officeName: office.name,
      companyId: office.companyId,
      officeAddress: office.address ?? '',
      city: office.city ?? '',
      country: office.country ?? '',
      timezone: office.timezone ?? '',
      colorHex: office.colorHex ?? '',
      iconId: office.iconId ?? '',
    });
    setEditing(true);
  }

  async function onSubmit(values: OfficeFormValues) {
    try {
      await updateMutation.mutateAsync({
        id: officeId,
        dto: {
          officeCode: values.officeCode,
          officeName: values.officeName,
          officeAddress: values.officeAddress,
          city: values.city,
          country: values.country,
          timezone: values.timezone,
          colorHex: values.colorHex || undefined,
          iconId: values.iconId || undefined,
        },
      });
      toast({ title: 'Office updated' });
      setEditing(false);
    } catch (err) {
      buildErrorToast(toast)(err, 'Failed to update office');
    }
  }

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!office) return <p className="text-sm text-destructive">Office not found.</p>;

  if (!editing) {
    return (
      <div className="space-y-6 max-w-2xl">
        <div className="flex items-start gap-4">
          <EntityAvatar
            name={office.name}
            colorHex={office.colorHex}
            iconId={office.iconId}
            className="h-16 w-16 text-2xl"
            iconClassName="h-8 w-8"
          />
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold">{office.name}</h2>
            {office.code && <p className="text-sm text-muted-foreground font-mono">{office.code}</p>}
          </div>
          <Button size="sm" variant="outline" onClick={startEdit}>Edit</Button>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          {[
            { label: 'Company', value: office.company?.name },
            { label: 'Address', value: office.address },
            { label: 'City', value: office.city },
            { label: 'Country', value: office.country },
            { label: 'Timezone', value: office.timezone },
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
        <Label htmlFor="officeCode">Code *</Label>
        <Input id="officeCode" maxLength={INPUT_LENGTH.code} {...register('officeCode')} />
        {errors.officeCode && <p className="text-xs text-destructive">{errors.officeCode.message}</p>}
      </div>
      <div className="space-y-1">
        <Label htmlFor="officeName">Name *</Label>
        <Input id="officeName" maxLength={INPUT_LENGTH.name} {...register('officeName')} />
        {errors.officeName && <p className="text-xs text-destructive">{errors.officeName.message}</p>}
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label htmlFor="city">City</Label>
          <Input id="city" maxLength={INPUT_LENGTH.text} {...register('city')} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="country">Country</Label>
          <Input id="country" maxLength={INPUT_LENGTH.text} {...register('country')} />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="officeAddress">Address</Label>
        <Input id="officeAddress" maxLength={INPUT_LENGTH.text} {...register('officeAddress')} />
      </div>
      <div className="space-y-1">
        <Label>Timezone</Label>
        <Controller
          control={control}
          name="timezone"
          render={({ field }) => (
            <TimezoneSelect value={field.value} onChange={field.onChange} placeholder="Select timezone…" />
          )}
        />
      </div>
      <input type="hidden" {...register('colorHex')} />
      <input type="hidden" {...register('iconId')} />
      <VisualIdentityFields
        previewLabel={watch('officeName') || office.name}
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

function ManagersTab({ officeId }: { officeId: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const qKey = ['offices', officeId, 'managers'];

  const { data: managers, isLoading } = useQuery({
    queryKey: qKey,
    queryFn: () => getOfficeManagers(officeId),
  });

  const replaceMutation = useMutation({
    mutationFn: (staffIds: string[]) => replaceOfficeManagers(officeId, staffIds),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: qKey }); toast({ title: 'Managers updated' }); },
    onError: (err) => buildErrorToast(toast)(err, 'Failed to update managers'),
  });

  const removeMutation = useMutation({
    mutationFn: (staffId: string) => removeOfficeManager(officeId, staffId),
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
        <p className="text-sm text-muted-foreground">Assign and manage office-level managers.</p>
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

function EmployeesTab({ officeId }: { officeId: string }) {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['offices', officeId, 'employees', page, search],
    queryFn: () => getOfficeEmployees(officeId, { page, limit: 50, search: search || undefined }),
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
          No employees assigned to this office.
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

export function OfficeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: office } = useOffice(id ?? '');
  const [activeTab, setActiveTab] = useTabState<TabId>('general', isOfficeTab);

  if (!id) return <p className="text-sm text-destructive">No office ID provided.</p>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/settings/offices')}>
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          Offices
        </Button>
        <div className="h-5 w-px bg-border" />
        <div className="flex items-center gap-3">
          <EntityAvatar
            name={office?.name ?? ''}
            colorHex={office?.colorHex}
            iconId={office?.iconId}
            className="h-10 w-10"
            iconClassName="h-5 w-5"
          />
          <div>
            <h1 className="text-2xl font-bold leading-tight">{office?.name ?? '…'}</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {office?.code && <span className="font-mono">{office.code}</span>}
              {office?.code && office?.company && <span>·</span>}
              {office?.company && <span>{office.company.name}</span>}
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
        {activeTab === 'general' && <GeneralTab officeId={id} />}
        {activeTab === 'managers' && <ManagersTab officeId={id} />}
        {activeTab === 'employees' && <EmployeesTab officeId={id} />}
      </div>
    </div>
  );
}
