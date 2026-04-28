import { useState } from 'react';
import { useCrudPermissions } from '@/hooks/useCrudPermissions';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { ColumnDef } from '@tanstack/react-table';
import { CrudTable } from '@/components/CrudTable';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FormTextField } from '@/components/form/FormTextField';
import { useToast } from '@/hooks/use-toast';
import {
  usePositions,
  useCreatePosition,
  useUpdatePosition,
  useDeletePosition,
} from '@/hooks/usePosition';
import { useCompanies } from '@/hooks/useCompany';
import type { IPosition } from '@/api/org.api';
import { safeArray } from '@/lib/safeArray';
import { getApiErrorMessage, buildErrorToast } from '@/lib/apiError';
import { optionalText, requiredCode, requiredName } from '@/lib/validation';
import { EntitySelect } from '@/components/entity/EntitySelect';
import { EntityOptionRow } from '@/components/entity/entityVisuals';
import { VisualIdentityFields } from '@/components/entity/VisualIdentityFields';
import { INPUT_LENGTH } from '@shared/constants/input-length';

const positionSchema = z.object({
  positionCode: requiredCode('Code'),
  positionName: requiredName('Name'),
  companyId: z.string().min(1, 'Company is required'),
  description: optionalText('Description'),
  level: z.preprocess((v) => (v === '' || v == null ? undefined : Number(v)), z.number().int().min(0).optional()),
  colorHex: optionalText('Color'),
  iconId: optionalText('Icon'),
  orderNo: z.preprocess((v) => (v === '' || v == null ? undefined : Number(v)), z.number().int().min(0).optional()),
});

type PositionFormValues = z.infer<typeof positionSchema>;

const columns: ColumnDef<IPosition>[] = [
  { accessorKey: 'orderNo', header: 'Order', cell: ({ row }) => row.original.orderNo ?? 0 },
  { accessorKey: 'code', header: 'Code', cell: ({ row }) => row.original.code ?? '—' },
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => <EntityOptionRow option={row.original} hideSecondary />,
  },
  {
    accessorKey: 'company',
    header: 'Company',
    cell: ({ row }) => row.original.company?.name ?? '—',
  },
  { accessorKey: 'note', header: 'Description', cell: ({ row }) => row.original.note ?? '—' },
  { accessorKey: 'level', header: 'Level', cell: ({ row }) => row.original.level ?? '—' },
];

export function PositionsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<IPosition | null>(null);

  const { toast } = useToast();
  const errToast = buildErrorToast(toast);
  const { data, isLoading } = usePositions({ page, limit: 20, search });
  const { data: companiesData } = useCompanies({ limit: 100 });
  const perm = useCrudPermissions('S04');
  const createMutation = useCreatePosition();
  const updateMutation = useUpdatePosition();
  const deleteMutation = useDeletePosition();

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<PositionFormValues>({
    resolver: zodResolver(positionSchema) as import('react-hook-form').Resolver<PositionFormValues>,
  });

  function handleAdd() {
    setEditTarget(null);
    reset({});
    setDialogOpen(true);
  }

  function handleEdit(row: IPosition) {
    setEditTarget(row);
    reset({
      positionCode: row.code ?? '',
      positionName: row.name,
      companyId: row.companyId,
      description: row.note ?? '',
      level: row.level ?? undefined,
      colorHex: row.colorHex ?? '#64748b',
      iconId: row.iconId ?? '',
      orderNo: row.orderNo ?? 0,
    });
    setDialogOpen(true);
  }

  async function handleDelete(row: IPosition) {
    try {
      await deleteMutation.mutateAsync(row.id);
      toast({ title: 'Position deleted' });
    } catch (err: unknown) {
      toast({ title: getApiErrorMessage(err, 'Failed to delete position'), variant: 'destructive' });
    }
  }

  async function onSubmit(values: PositionFormValues) {
    try {
      const dto = {
        ...values,
        colorHex: values.colorHex || undefined,
        iconId: values.iconId || undefined,
        orderNo: values.orderNo ?? 0,
      };
      if (editTarget) {
        await updateMutation.mutateAsync({ id: editTarget.id, dto });
        toast({ title: 'Position updated' });
      } else {
        await createMutation.mutateAsync(dto);
        toast({ title: 'Position created' });
      }
      setDialogOpen(false);
    } catch (err: unknown) {
      errToast(err, editTarget ? 'Failed to update position' : 'Failed to create position');
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Positions</h1>
        <p className="text-sm text-muted-foreground">Manage job positions</p>
      </div>

      <CrudTable
        columns={columns}
        data={safeArray(data?.data)}
        isLoading={isLoading}
        pagination={data?.pagination}
        onAdd={perm.canCreate ? handleAdd : undefined}
        onEdit={perm.canUpdate ? handleEdit : undefined}
        onDelete={perm.canDelete ? handleDelete : undefined}
        onSearch={setSearch}
        onPageChange={setPage}
        addLabel="Add Position"
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editTarget ? 'Edit Position' : 'Add Position'}</DialogTitle>
          </DialogHeader>
          <form id="positions-form" onSubmit={handleSubmit(onSubmit)} className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-4">
            <FormTextField
              id="positionCode"
              label="Code"
              required
              registration={register('positionCode')}
              current={watch('positionCode')}
              maxLength={INPUT_LENGTH.code}
              error={errors.positionCode?.message}
            />

            <FormTextField
              id="positionName"
              label="Name"
              required
              registration={register('positionName')}
              current={watch('positionName')}
              maxLength={INPUT_LENGTH.name}
              error={errors.positionName?.message}
            />

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
                    testId="position-company-select"
                  />
                )}
              />
              {errors.companyId && (
                <p className="text-xs text-destructive">{errors.companyId.message}</p>
              )}
            </div>

            <FormTextField
              id="description"
              label="Description"
              registration={register('description')}
              current={watch('description')}
              maxLength={INPUT_LENGTH.text}
              error={errors.description?.message}
            />

            <div className="space-y-1">
              <Label htmlFor="level">Level</Label>
              <Input id="level" type="number" min={0} {...register('level')} />
              {errors.level && (
                <p className="text-xs text-destructive">{errors.level.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="orderNo">Order No</Label>
              <Input id="orderNo" type="number" min={0} {...register('orderNo')} placeholder="0" />
            </div>

            <input type="hidden" {...register('colorHex')} />
            <input type="hidden" {...register('iconId')} />
            <VisualIdentityFields
              previewLabel={watch('positionName') || 'Position'}
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
            <Button type="submit" form="positions-form" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
