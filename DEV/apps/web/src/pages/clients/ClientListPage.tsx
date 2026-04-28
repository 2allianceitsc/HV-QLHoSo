import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SearchInput, useFilterState } from '@/components/filters';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { ColumnDef } from '@tanstack/react-table';
import { CrudTable } from '@/components/CrudTable';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  useClients,
  useCreateClient,
  useUpdateClient,
  useDeleteClient,
} from '@/hooks/useClient';
import { usePermission } from '@/hooks/usePermission';
import type { IClient } from '@/api/client.api';
import { safeArray } from '@/lib/safeArray';
import { getApiErrorMessage, buildErrorToast } from '@/lib/apiError';
import { EntityOptionRow } from '@/components/entity/entityVisuals';
import { VisualIdentityFields } from '@/components/entity/VisualIdentityFields';
import { INPUT_LENGTH, INPUT_LENGTH_OVERRIDE } from '@shared/constants/input-length';
import { optionalEmail, optionalText, requiredCode, requiredName } from '@/lib/validation';
import { CharacterCount } from '@/components/form/CharacterCount';

const clientSchema = z.object({
  name: requiredName('Name'),
  code: requiredCode('Code', INPUT_LENGTH_OVERRIDE.clientCode),
  address: optionalText('Address'),
  phone: optionalText('Phone'),
  email: optionalEmail('Email'),
  website: optionalText('Website'),
  colorHex: optionalText('Color hex'),
  iconId: optionalText('Icon'),
  timezone: optionalText('Timezone'),
  defaultStartTime: optionalText('Default start time'),
  defaultEndTime: optionalText('Default end time'),
  country: optionalText('Country'),
});
type ClientFormValues = z.infer<typeof clientSchema>;

function renderTruncatedText(
  value: string | null | undefined,
  className = 'max-w-[10rem]',
  title?: string | null,
) {
  if (!value) {
    return '—';
  }

  return (
    <span className={`inline-block truncate align-bottom ${className}`} title={title ?? value}>
      {value}
    </span>
  );
}

const columns: ColumnDef<IClient>[] = [
  {
    accessorKey: 'code',
    header: 'Code',
    cell: ({ row }) => renderTruncatedText(row.original.code, 'max-w-[9rem] font-mono text-xs', row.original.code),
  },
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => <EntityOptionRow option={row.original} hideSecondary />,
  },
  { accessorKey: 'country', header: 'Country', cell: ({ row }) => row.original.country ?? '—' },
  {
    accessorKey: 'website',
    header: 'Website',
    meta: { mobileHidden: true },
    cell: ({ row }) => renderTruncatedText(row.original.website, 'max-w-[12rem]', row.original.website),
  },
  {
    accessorKey: 'timezone',
    header: 'Timezone',
    meta: { mobileHidden: true },
    cell: ({ row }) => renderTruncatedText(row.original.timezone, 'max-w-[11rem]', row.original.timezone),
  },
  { accessorKey: 'phone', header: 'Phone', cell: ({ row }) => row.original.phone ?? '—' },
  {
    accessorKey: 'email',
    header: 'Email',
    cell: ({ row }) => renderTruncatedText(row.original.email, 'max-w-[14rem]', row.original.email),
  },
  {
    id: 'departmentCount',
    header: 'Departments',
    meta: { mobileHidden: true },
    cell: ({ row }) => row.original._count?.departments ?? 0,
  },
  {
    id: 'projectCount',
    header: 'Projects',
    meta: { mobileHidden: true },
    cell: ({ row }) => row.original._count?.projects ?? 0,
  },
  {
    id: 'contactCount',
    header: 'Contacts',
    meta: { mobileHidden: true },
    cell: ({ row }) => row.original._count?.contacts ?? 0,
  },
  {
    id: 'staffCount',
    header: 'Staff',
    cell: ({ row }) => row.original._count?.clientStaff ?? 0,
  },
];

export function ClientListPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [filter, setFilter, resetFilter] = useFilterState<{ search: string } & Record<string, unknown>>({
    key: 'vibe365.clients.filter',
    defaultValue: { search: '' },
    mode: 'localStorage',
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<IClient | null>(null);
  const { toast } = useToast();
  const errToast = buildErrorToast(toast, { 'already exists': 'Client code already in use', 'already in use': 'Client code already in use' });

  const { data, isLoading } = useClients({ page, limit: 20, search: filter.search || undefined });
  const createMutation = useCreateClient();
  const updateMutation = useUpdateClient();
  const deleteMutation = useDeleteClient();

  const canCreate = usePermission('C01', null, 'CREATE');
  const canUpdate = usePermission('C01', null, 'UPDATE');
  const canDelete = usePermission('C01', null, 'DELETE');

  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
  });

  function handleAdd() {
    setEditTarget(null);
    reset({});
    setDialogOpen(true);
  }

  function handleEdit(row: IClient) {
    setEditTarget(row);
    reset({
      name: row.name,
      code: row.code ?? '',
      address: row.address ?? '',
      phone: row.phone ?? '',
      email: row.email ?? '',
      website: row.website ?? '',
      colorHex: row.colorHex ?? '',
      iconId: row.iconId ?? '',
      timezone: row.timezone ?? '',
      defaultStartTime: row.defaultStartTime ?? '',
      defaultEndTime: row.defaultEndTime ?? '',
      country: row.country ?? '',
    });
    setDialogOpen(true);
  }

  async function handleDelete(row: IClient) {
    try {
      await deleteMutation.mutateAsync(row.id);
      toast({ title: 'Client deleted' });
    } catch (err: unknown) {
      toast({ title: getApiErrorMessage(err, 'Failed to delete client'), variant: 'destructive' });
    }
  }

  function handleRowClick(row: IClient) {
    navigate(`/clients/${row.id}`);
  }

  async function onSubmit(values: ClientFormValues) {
    try {
      const dto = {
        ...values,
        email: values.email || undefined,
        colorHex: values.colorHex || undefined,
        iconId: values.iconId || undefined,
        timezone: values.timezone || undefined,
        defaultStartTime: values.defaultStartTime || undefined,
        defaultEndTime: values.defaultEndTime || undefined,
      };
      if (editTarget) {
        await updateMutation.mutateAsync({ id: editTarget.id, dto });
        toast({ title: 'Client updated' });
      } else {
        await createMutation.mutateAsync(dto);
        toast({ title: 'Client created' });
      }
      setDialogOpen(false);
    } catch (err: unknown) {
      errToast(err, editTarget ? 'Failed to update client' : 'Failed to create client');
    }
  }

  // Extend columns to make name clickable
  const clickableColumns: ColumnDef<IClient>[] = columns.map((col) => {
    if ('accessorKey' in col && col.accessorKey === 'name') {
      return {
        ...col,
        cell: ({ row }) => (
          <button
            className="text-left hover:opacity-90"
            onClick={() => handleRowClick(row.original)}
          >
            <EntityOptionRow option={row.original} hideSecondary />
          </button>
        ),
      };
    }
    return col;
  });

  return (
    <div className="space-y-6" data-testid="client-list-page">
      <div>
        <h1 className="text-2xl font-bold">Clients</h1>
        <p className="text-sm text-muted-foreground">Manage business client records</p>
      </div>

      <div className="flex items-center gap-2">
        <SearchInput
          value={filter.search}
          onChange={(v) => { setFilter((f) => ({ ...f, search: v })); setPage(1); }}
          debounceMs={300}
          placeholder="Search by name or code..."
          className="max-w-xs flex-1"
          testId="client-search"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => { resetFilter(); setPage(1); }}
          disabled={!filter.search}
          data-testid="client-reset-filter"
        >
          Reset
        </Button>
      </div>

      <CrudTable
        showSearch={false}
        columns={clickableColumns}
        data={safeArray(data?.data)}
        isLoading={isLoading}
        pagination={data?.pagination}
        onAdd={canCreate ? handleAdd : undefined}
        onView={(row) => navigate(`/clients/${row.id}`)}
        onEdit={canUpdate ? handleEdit : undefined}
        onDelete={canDelete ? handleDelete : undefined}
        onSearch={() => {}}
        onPageChange={setPage}
        addLabel="Add Client"
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editTarget ? 'Edit Client' : 'Add Client'}</DialogTitle>
          </DialogHeader>
          <form id="client-form" onSubmit={handleSubmit(onSubmit)} className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-4">
            <div className="space-y-1">
              <Label htmlFor="name">Name *</Label>
              <Input id="name" maxLength={INPUT_LENGTH.name} {...register('name')} />
              <CharacterCount current={watch('name')} max={INPUT_LENGTH.name} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>

            <div className="space-y-1">
              <Label htmlFor="code">Code *</Label>
              <Input id="code" maxLength={INPUT_LENGTH_OVERRIDE.clientCode} {...register('code')} />
              <CharacterCount current={watch('code')} max={INPUT_LENGTH_OVERRIDE.clientCode} />
              {errors.code && <p className="text-xs text-destructive">{errors.code.message}</p>}
            </div>

            <div className="space-y-1">
              <Label htmlFor="country">Country</Label>
              <Input id="country" maxLength={INPUT_LENGTH.text} {...register('country')} />
            </div>

            <div className="space-y-1">
              <Label htmlFor="address">Address</Label>
              <Input id="address" maxLength={INPUT_LENGTH.text} {...register('address')} />
            </div>

            <div className="space-y-1">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" maxLength={INPUT_LENGTH.text} {...register('phone')} />
            </div>

            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" maxLength={INPUT_LENGTH.text} {...register('email')} />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>

            <div className="space-y-1">
              <Label htmlFor="website">Website</Label>
              <Input id="website" maxLength={INPUT_LENGTH.text} {...register('website')} />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="colorHex">Color (hex)</Label>
                <Input id="colorHex" maxLength={INPUT_LENGTH.text} placeholder="#ffffff" {...register('colorHex')} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="timezone">Timezone</Label>
                <Input id="timezone" maxLength={INPUT_LENGTH.text} placeholder="Australia/Sydney" {...register('timezone')} />
              </div>
            </div>

            <input type="hidden" {...register('iconId')} />
            <VisualIdentityFields
              previewLabel={watch('name') || 'Client'}
              colorHex={watch('colorHex')}
              iconId={watch('iconId')}
              onColorHexChange={(value) => setValue('colorHex', value, { shouldDirty: true, shouldTouch: true })}
              onIconIdChange={(value) => setValue('iconId', value, { shouldDirty: true, shouldTouch: true })}
              iconChoices={['Handshake', 'Building2', 'Landmark', 'BriefcaseBusiness', 'Users', 'Globe', 'ShieldCheck', 'MapPinned']}
            />

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="defaultStartTime">Default Start</Label>
                <Input id="defaultStartTime" maxLength={INPUT_LENGTH.text} placeholder="09:00" {...register('defaultStartTime')} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="defaultEndTime">Default End</Label>
                <Input id="defaultEndTime" maxLength={INPUT_LENGTH.text} placeholder="17:00" {...register('defaultEndTime')} />
              </div>
            </div>

          </form>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button type="submit" form="client-form" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
