import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCrudPermissions } from '@/hooks/useCrudPermissions';
import { Controller, useForm, type Resolver } from 'react-hook-form';
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
  useOffices,
  useCreateOffice,
  useUpdateOffice,
  useDeleteOffice,
} from '@/hooks/useOffice';
import { useCompanies } from '@/hooks/useCompany';
import type { IOffice } from '@/api/org.api';
import { safeArray } from '@/lib/safeArray';
import { getApiErrorMessage, buildErrorToast } from '@/lib/apiError';
import { EntitySelect } from '@/components/entity/EntitySelect';
import { EntityOptionRow } from '@/components/entity/entityVisuals';
import { VisualIdentityFields } from '@/components/entity/VisualIdentityFields';
import { TimezoneSelect } from '@/components/ui/TimezoneSelect';
import { optionalEmail, optionalText, requiredCode, requiredName, requiredText } from '@/lib/validation';
import { INPUT_LENGTH } from '@shared/constants/input-length';
import { CharacterCount } from '@/components/form/CharacterCount';

const officeSchema = z.object({
  officeCode: requiredCode('Code'),
  officeName: requiredName('Name'),
  companyId: requiredText('Company'),
  officeAddress: optionalText('Address'),
  city: optionalText('City'),
  country: optionalText('Country'),
  timezone: optionalText('Timezone'),
  officeContactEmail: optionalEmail('Contact email'),
  officeContactMobile: optionalText('Contact mobile'),
  colorHex: optionalText('Color hex'),
  iconId: optionalText('Icon'),
  orderNo: z.preprocess((v) => (v === '' || v == null ? undefined : Number(v)), z.number().int().min(0).optional()),
});

type OfficeFormValues = z.infer<typeof officeSchema>;

function OfficeNameCell({ row }: { row: { original: IOffice } }) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      className="text-left hover:underline hover:text-primary transition-colors"
      onClick={() => navigate(`/settings/offices/${row.original.id}`)}
    >
      <EntityOptionRow option={row.original} hideSecondary />
    </button>
  );
}

const columns: ColumnDef<IOffice>[] = [
  { accessorKey: 'orderNo', header: 'Order', cell: ({ row }) => row.original.orderNo ?? 0 },
  { accessorKey: 'code', header: 'Code', cell: ({ row }) => row.original.code ?? '—' },
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => <OfficeNameCell row={row} />,
  },
  {
    accessorKey: 'company',
    header: 'Company',
    cell: ({ row }) => row.original.company?.name ?? '—',
  },
  { accessorKey: 'city', header: 'City', cell: ({ row }) => row.original.city ?? '—' },
  { accessorKey: 'country', header: 'Country', cell: ({ row }) => row.original.country ?? '—' },
];

export function OfficesPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<IOffice | null>(null);

  const { toast } = useToast();
  const errToast = buildErrorToast(toast);
  const { data, isLoading } = useOffices({ page, limit: 20, search });
  const { data: companiesData } = useCompanies({ limit: 100 });
  const createMutation = useCreateOffice();
  const updateMutation = useUpdateOffice();
  const perm = useCrudPermissions('S03');
  const deleteMutation = useDeleteOffice();

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<OfficeFormValues>({
    resolver: zodResolver(officeSchema) as Resolver<OfficeFormValues>,
  });

  function handleAdd() {
    setEditTarget(null);
    reset({});
    setDialogOpen(true);
  }

  function handleEdit(row: IOffice) {
    setEditTarget(row);
    reset({
      officeCode: row.code ?? '',
      officeName: row.name,
      companyId: row.companyId,
      officeAddress: row.address ?? '',
      city: row.city ?? '',
      country: row.country ?? '',
      timezone: row.timezone ?? '',
      colorHex: row.colorHex ?? '#64748b',
      iconId: row.iconId ?? '',
      orderNo: row.orderNo ?? 0,
    });
    setDialogOpen(true);
  }

  async function handleDelete(row: IOffice) {
    try {
      await deleteMutation.mutateAsync(row.id);
      toast({ title: 'Office deleted' });
    } catch (err: unknown) {
      toast({ title: getApiErrorMessage(err, 'Failed to delete office'), variant: 'destructive' });
    }
  }

  async function onSubmit(values: OfficeFormValues) {
    try {
      const dto = {
        ...values,
        colorHex: values.colorHex || undefined,
        iconId: values.iconId || undefined,
        orderNo: values.orderNo ?? 0,
      };
      if (editTarget) {
        await updateMutation.mutateAsync({ id: editTarget.id, dto });
        toast({ title: 'Office updated' });
      } else {
        await createMutation.mutateAsync(dto);
        toast({ title: 'Office created' });
      }
      setDialogOpen(false);
    } catch (err: unknown) {
      errToast(err, editTarget ? 'Failed to update office' : 'Failed to create office');
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Offices</h1>
        <p className="text-sm text-muted-foreground">Manage office locations</p>
      </div>

      <CrudTable
        columns={columns}
        data={safeArray(data?.data)}
        isLoading={isLoading}
        pagination={data?.pagination}
        onAdd={perm.canCreate ? handleAdd : undefined}
        onView={(row) => navigate(`/settings/offices/${row.id}`)}
        onEdit={perm.canUpdate ? handleEdit : undefined}
        onDelete={perm.canDelete ? handleDelete : undefined}
        onSearch={setSearch}
        onPageChange={setPage}
        addLabel="Add Office"
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editTarget ? 'Edit Office' : 'Add Office'}</DialogTitle>
          </DialogHeader>
          <form id="offices-form" onSubmit={handleSubmit(onSubmit)} className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-4">
            <div className="space-y-1">
              <Label htmlFor="officeCode">Code *</Label>
              <Input id="officeCode" maxLength={INPUT_LENGTH.code} {...register('officeCode')} />
              <CharacterCount current={watch('officeCode')} max={INPUT_LENGTH.code} />
              {errors.officeCode && (
                <p className="text-xs text-destructive">{errors.officeCode.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="officeName">Name *</Label>
              <Input id="officeName" maxLength={INPUT_LENGTH.name} {...register('officeName')} />
              <CharacterCount current={watch('officeName')} max={INPUT_LENGTH.name} />
              {errors.officeName && (
                <p className="text-xs text-destructive">{errors.officeName.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="companyId">Company *</Label>
              <Controller
                control={control}
                name="companyId"
                render={({ field }) => (
                  <EntitySelect
                    value={field.value}
                    onValueChange={field.onChange}
                    options={companiesData?.data ?? []}
                    placeholder="Select company"
                    emptyLabel="Select company"
                    entityType="COMPANY"
                    testId="office-company-select"
                  />
                )}
              />
              {errors.companyId && (
                <p className="text-xs text-destructive">{errors.companyId.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="officeAddress">Address</Label>
              <Input id="officeAddress" maxLength={INPUT_LENGTH.text} {...register('officeAddress')} />
            </div>

            <div className="grid grid-cols-2 gap-2">
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
              <Label>Timezone</Label>
              <Controller
                control={control}
                name="timezone"
                render={({ field }) => (
                  <TimezoneSelect
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Select timezone…"
                  />
                )}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="officeContactEmail">Contact Email</Label>
              <Input id="officeContactEmail" type="email" maxLength={INPUT_LENGTH.text} {...register('officeContactEmail')} />
              {errors.officeContactEmail && (
                <p className="text-xs text-destructive">{errors.officeContactEmail.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="officeContactMobile">Contact Mobile</Label>
              <Input id="officeContactMobile" maxLength={INPUT_LENGTH.text} {...register('officeContactMobile')} />
            </div>

            <div className="space-y-1">
              <Label htmlFor="orderNo">Order No</Label>
              <Input id="orderNo" type="number" min={0} max={999999} {...register('orderNo')} placeholder="0" />
            </div>

            <input type="hidden" {...register('colorHex')} />
            <input type="hidden" {...register('iconId')} />
            <VisualIdentityFields
              previewLabel={watch('officeName') || 'Office'}
              colorHex={watch('colorHex')}
              iconId={watch('iconId')}
              onColorHexChange={(value) => setValue('colorHex', value, { shouldDirty: true, shouldTouch: true })}
              onIconIdChange={(value) => setValue('iconId', value, { shouldDirty: true, shouldTouch: true })}
            />

          </form>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="offices-form" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
