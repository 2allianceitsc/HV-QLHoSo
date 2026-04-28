import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Building2, Users, MapPin, BookUser, UserCog, Trash2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useTabState } from '@/hooks/useTabState';
import { useCompany, useUpdateCompany } from '@/hooks/useCompany';
import {
  useCompanyContacts,
  useCreateCompanyContact,
  useUpdateCompanyContact,
  useDeleteCompanyContact,
} from '@/hooks/useCompanyContact';
import { useDepartments } from '@/hooks/useDepartment';
import { useOffices } from '@/hooks/useOffice';
import type { ICompanyContact } from '@/api/org.api';
import {
  getCompanyManagers,
  removeCompanyManager,
  replaceCompanyManagers,
  getCompanyEmployees,
} from '@/api/org.api';
import { safeArray } from '@/lib/safeArray';
import { getApiErrorMessage, buildErrorToast } from '@/lib/apiError';
import { VisualIdentityFields } from '@/components/entity/VisualIdentityFields';
import { EntityOptionRow } from '@/components/entity/entityVisuals';
import { TimezoneSelect } from '@/components/ui/TimezoneSelect';
import { INPUT_LENGTH } from '@shared/constants/input-length';
import { optionalEmail, optionalText, requiredName } from '@/lib/validation';
import { UserAvatar } from '@/components/UserAvatar';
import { StaffMultiPickerButton } from '@/components/staff/StaffMultiPickerButton';
import type { SelectedStaff } from '@/components/staff/StaffMultiPickerButton';

// ── Schemas ───────────────────────────────────────────────────────────────────

const companySchema = z.object({
  companyName: requiredName('Company name'),
  companyCode: optionalText('Code', INPUT_LENGTH.code),
  companyAddress: optionalText('Address'),
  companyTinNumber: optionalText('TIN number'),
  companyLogoUrl: optionalText('Logo URL'),
  companyPhone: optionalText('Phone'),
  companyWebsite: optionalText('Website'),
  colorHex: optionalText('Color hex'),
  iconId: optionalText('Icon'),
  defaultTimezone: optionalText('Default timezone'),
});

const contactSchema = z.object({
  firstName: requiredName('First name'),
  surname: requiredName('Surname'),
  emailAddress: optionalEmail('Email address'),
  mobileCountryCode: optionalText('Mobile country code'),
  mobileNumber: optionalText('Mobile number'),
  streetAddress: optionalText('Street address'),
  suburb: optionalText('Suburb'),
  city: optionalText('City'),
  state: optionalText('State'),
  country: optionalText('Country'),
  postcode: optionalText('Postcode'),
});

type CompanyFormValues = z.infer<typeof companySchema>;
type ContactFormValues = z.infer<typeof contactSchema>;

// ── Tabs ──────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'overview', label: 'Overview', icon: Building2 },
  { id: 'managers', label: 'Managers', icon: UserCog },
  { id: 'employees', label: 'Employees', icon: Users },
  { id: 'contacts', label: 'Contacts', icon: BookUser },
  { id: 'departments', label: 'Departments', icon: Users },
  { id: 'offices', label: 'Offices', icon: MapPin },
] as const;

type TabId = typeof TABS[number]['id'];

function isCompanyDetailTab(value: unknown): value is TabId {
  return TABS.some((tab) => tab.id === value);
}

// ── Overview Tab ──────────────────────────────────────────────────────────────

function OverviewTab({ companyId }: { companyId: string }) {
  const { toast } = useToast();
  const { data: company, isLoading } = useCompany(companyId);
  const updateMutation = useUpdateCompany();
  const [editing, setEditing] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<CompanyFormValues>({ resolver: zodResolver(companySchema) });

  function startEdit() {
    if (!company) return;
    reset({
      companyName: company.name,
      companyCode: company.code ?? '',
      companyAddress: company.address ?? '',
      companyTinNumber: company.taxCode ?? '',
      companyLogoUrl: company.logoUrl ?? '',
      companyPhone: company.phone ?? '',
      companyWebsite: company.website ?? '',
      colorHex: company.colorHex ?? '#64748b',
      iconId: company.iconId ?? '',
      defaultTimezone: company.defaultTimezone ?? '',
    });
    setEditing(true);
  }

  async function onSubmit(values: CompanyFormValues) {
    try {
      await updateMutation.mutateAsync({ id: companyId, dto: { ...values, colorHex: values.colorHex || undefined, iconId: values.iconId || undefined } });
      toast({ title: 'Company updated' });
      setEditing(false);
    } catch (err: unknown) {
      buildErrorToast(toast)(err, 'Failed to update company');
    }
  }

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!company) return <p className="text-sm text-destructive">Company not found.</p>;

  if (!editing) {
    return (
      <div className="space-y-6 max-w-2xl">
        <div className="flex items-start gap-4">
          {company.logoUrl ? (
            <img src={company.logoUrl} alt="logo" className="h-16 w-16 rounded-lg object-cover border" />
          ) : (
            <div className="h-16 w-16 rounded-lg border bg-muted flex items-center justify-center">
              <Building2 className="h-8 w-8 text-muted-foreground" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold">{company.name}</h2>
            {company.code && <p className="text-sm text-muted-foreground font-mono">{company.code}</p>}
          </div>
          <Button size="sm" variant="outline" onClick={startEdit}>Edit</Button>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {[
            { label: 'Address', value: company.address },
            { label: 'TIN Number', value: company.taxCode },
            { label: 'Phone', value: company.phone },
            { label: 'Website', value: company.website },
            { label: 'Default Timezone', value: company.defaultTimezone },
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
        <Label htmlFor="companyName">Company Name *</Label>
        <Input id="companyName" maxLength={INPUT_LENGTH.name} {...register('companyName')} />
        {errors.companyName && <p className="text-xs text-destructive">{errors.companyName.message}</p>}
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label htmlFor="companyCode">Code</Label>
          <Input id="companyCode" maxLength={INPUT_LENGTH.code} {...register('companyCode')} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="companyTinNumber">TIN Number</Label>
          <Input id="companyTinNumber" maxLength={INPUT_LENGTH.text} {...register('companyTinNumber')} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="companyPhone">Phone</Label>
          <Input id="companyPhone" maxLength={INPUT_LENGTH.text} {...register('companyPhone')} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="companyWebsite">Website</Label>
          <Input id="companyWebsite" maxLength={INPUT_LENGTH.text} {...register('companyWebsite')} />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="companyAddress">Address</Label>
        <Input id="companyAddress" maxLength={INPUT_LENGTH.text} {...register('companyAddress')} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="companyLogoUrl">Logo URL</Label>
        <Input id="companyLogoUrl" maxLength={INPUT_LENGTH.text} {...register('companyLogoUrl')} placeholder="https://..." />
      </div>
      <div className="space-y-1">
        <Label>Default Timezone</Label>
        <Controller
          control={control}
          name="defaultTimezone"
          render={({ field }) => (
            <TimezoneSelect
              value={field.value}
              onChange={field.onChange}
              placeholder="Select default timezone…"
            />
          )}
        />
      </div>
      <input type="hidden" {...register('colorHex')} />
      <input type="hidden" {...register('iconId')} />
      <VisualIdentityFields
        previewLabel={watch('companyName') || 'Company'}
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

// ── Contacts Tab ──────────────────────────────────────────────────────────────

function ContactsTab({ companyId }: { companyId: string }) {
  const { toast } = useToast();
  const { data: contacts, isLoading } = useCompanyContacts(companyId);
  const createMutation = useCreateCompanyContact(companyId);
  const updateMutation = useUpdateCompanyContact(companyId);
  const deleteMutation = useDeleteCompanyContact(companyId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ICompanyContact | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ICompanyContact | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormValues>({ resolver: zodResolver(contactSchema) });

  function handleAdd() {
    setEditTarget(null);
    reset({});
    setDialogOpen(true);
  }

  function handleEdit(contact: ICompanyContact) {
    setEditTarget(contact);
    reset({
      firstName: contact.firstName,
      surname: contact.surname,
      emailAddress: contact.emailAddress ?? '',
      mobileCountryCode: contact.mobileCountryCode ?? '',
      mobileNumber: contact.mobileNumber ?? '',
      streetAddress: contact.streetAddress ?? '',
      suburb: contact.suburb ?? '',
      city: contact.city ?? '',
      state: contact.state ?? '',
      country: contact.country ?? '',
      postcode: contact.postcode ?? '',
    });
    setDialogOpen(true);
  }

  function handleRequestDelete(contact: ICompanyContact) {
    setDeleteTarget(contact);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      toast({ title: 'Contact deleted' });
    } catch (err: unknown) {
      toast({ title: getApiErrorMessage(err, 'Failed to delete contact'), variant: 'destructive' });
    } finally {
      setDeleteTarget(null);
    }
  }

  async function onSubmit(values: ContactFormValues) {
    try {
      const dto = { ...values, emailAddress: values.emailAddress || undefined };
      if (editTarget) {
        await updateMutation.mutateAsync({ id: editTarget.id, dto });
        toast({ title: 'Contact updated' });
      } else {
        await createMutation.mutateAsync(dto);
        toast({ title: 'Contact added' });
      }
      setDialogOpen(false);
    } catch (err: unknown) {
      buildErrorToast(toast)(err, editTarget ? 'Failed to update contact' : 'Failed to add contact');
    }
  }

  const list = safeArray(contacts);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={handleAdd}>Add Contact</Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : list.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          No contacts yet.
        </div>
      ) : (
        <div className="divide-y divide-border rounded-lg border overflow-hidden">
          {list.map((c) => (
            <div key={c.id} className="flex items-center gap-3 px-4 py-3">
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary flex-shrink-0">
                {c.firstName[0]}{c.surname[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{c.firstName} {c.surname}</p>
                <p className="text-xs text-muted-foreground truncate">{c.emailAddress ?? '—'}</p>
              </div>
              {c.mobileNumber && (
                <span className="text-xs text-muted-foreground hidden sm:block">{c.mobileNumber}</span>
              )}
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => handleEdit(c)}>Edit</Button>
                <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => handleRequestDelete(c)}>
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editTarget ? 'Edit Contact' : 'Add Contact'}</DialogTitle>
          </DialogHeader>
          <form id="company-contact-form" onSubmit={handleSubmit(onSubmit)} className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="firstName">First Name *</Label>
                <Input id="firstName" maxLength={INPUT_LENGTH.name} {...register('firstName')} />
                {errors.firstName && <p className="text-xs text-destructive">{errors.firstName.message}</p>}
              </div>
              <div className="space-y-1">
                <Label htmlFor="surname">Surname *</Label>
                <Input id="surname" maxLength={INPUT_LENGTH.name} {...register('surname')} />
                {errors.surname && <p className="text-xs text-destructive">{errors.surname.message}</p>}
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="emailAddress">Email</Label>
              <Input id="emailAddress" type="email" maxLength={INPUT_LENGTH.text} {...register('emailAddress')} />
              {errors.emailAddress && <p className="text-xs text-destructive">{errors.emailAddress.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="mobileCountryCode">Country Code</Label>
                <Input id="mobileCountryCode" maxLength={INPUT_LENGTH.text} {...register('mobileCountryCode')} placeholder="+61" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="mobileNumber">Mobile</Label>
                <Input id="mobileNumber" maxLength={INPUT_LENGTH.text} {...register('mobileNumber')} />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="streetAddress">Street Address</Label>
              <Input id="streetAddress" maxLength={INPUT_LENGTH.text} {...register('streetAddress')} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="city">City</Label>
                <Input id="city" maxLength={INPUT_LENGTH.text} {...register('city')} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="state">State</Label>
                <Input id="state" maxLength={INPUT_LENGTH.text} {...register('state')} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="country">Country</Label>
                <Input id="country" maxLength={INPUT_LENGTH.text} {...register('country')} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="postcode">Postcode</Label>
                <Input id="postcode" maxLength={INPUT_LENGTH.text} {...register('postcode')} />
              </div>
            </div>
          </form>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button type="submit" form="company-contact-form" disabled={isSubmitting}>{isSubmitting ? 'Saving…' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Confirm Delete"
        description={`Are you sure you want to delete "${deleteTarget ? `${deleteTarget.firstName} ${deleteTarget.surname}` : 'this contact'}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}

// ── Managers Tab ─────────────────────────────────────────────────────────────

function ManagersTab({ companyId }: { companyId: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const qKey = ['companies', companyId, 'managers'];

  const { data: managers, isLoading } = useQuery({
    queryKey: qKey,
    queryFn: () => getCompanyManagers(companyId),
  });

  const replaceMutation = useMutation({
    mutationFn: (staffIds: string[]) => replaceCompanyManagers(companyId, staffIds),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: qKey }); toast({ title: 'Managers updated' }); },
    onError: (err) => buildErrorToast(toast)(err, 'Failed to update managers'),
  });

  const removeMutation = useMutation({
    mutationFn: (staffId: string) => removeCompanyManager(companyId, staffId),
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

  function handleSelect(selected: SelectedStaff[]) {
    replaceMutation.mutate(selected.map((s) => s.id));
  }

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Assign and manage company-level managers.</p>
        <StaffMultiPickerButton value={pickerValue} onSelect={handleSelect} placeholder="Assign managers" />
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

function EmployeesTab({ companyId }: { companyId: string }) {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['companies', companyId, 'employees', page, search],
    queryFn: () => getCompanyEmployees(companyId, { page, limit: 50, search: search || undefined }),
  });

  const list = safeArray(data?.data);
  const pagination = data?.pagination;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Input
          placeholder="Search employees..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="max-w-xs"
        />
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : list.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          No employees found.
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

// ── Departments Tab ───────────────────────────────────────────────────────────

function DepartmentsTab({ companyId }: { companyId: string }) {
  const { data, isLoading } = useDepartments({ limit: 100, companyId });
  const list = safeArray(data?.data);

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (list.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
        No departments for this company.
      </div>
    );
  }

  return (
    <div className="divide-y divide-border rounded-lg border overflow-hidden">
      {list.map((d) => (
        <div key={d.id} className="flex items-center gap-3 px-4 py-3">
          <EntityOptionRow option={d} hideSecondary />
        </div>
      ))}
    </div>
  );
}

// ── Offices Tab ───────────────────────────────────────────────────────────────

function OfficesTab({ companyId }: { companyId: string }) {
  const { data, isLoading } = useOffices({ limit: 100, companyId });
  const list = safeArray(data?.data);

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (list.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
        No offices for this company.
      </div>
    );
  }

  return (
    <div className="divide-y divide-border rounded-lg border overflow-hidden">
      {list.map((o) => (
        <div key={o.id} className="flex items-center gap-3 px-4 py-3">
          <EntityOptionRow option={o} hideSecondary />
          {(o.city || o.country) && (
            <span className="text-xs text-muted-foreground ml-auto">{[o.city, o.country].filter(Boolean).join(', ')}</span>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function CompanyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: company } = useCompany(id ?? '');
  const [activeTab, setActiveTab] = useTabState<TabId>('overview', isCompanyDetailTab);

  if (!id) {
    return <p className="text-sm text-destructive">No company ID provided.</p>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/settings/company')}>
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          Companies
        </Button>
        <div className="h-5 w-px bg-border" />
        <div>
          <h1 className="text-2xl font-bold">{company?.name ?? '…'}</h1>
          {company?.code && (
            <p className="text-sm text-muted-foreground font-mono">{company.code}</p>
          )}
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
        {activeTab === 'overview' && <OverviewTab companyId={id} />}
        {activeTab === 'managers' && <ManagersTab companyId={id} />}
        {activeTab === 'employees' && <EmployeesTab companyId={id} />}
        {activeTab === 'contacts' && <ContactsTab companyId={id} />}
        {activeTab === 'departments' && <DepartmentsTab companyId={id} />}
        {activeTab === 'offices' && <OfficesTab companyId={id} />}
      </div>
    </div>
  );
}
