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
  useDepartments,
  useCreateDepartment,
  useUpdateDepartment,
  useDeleteDepartment,
} from '@/hooks/useDepartment';
import { useCompanies } from '@/hooks/useCompany';
import type { IDepartment } from '@/api/org.api';
import { safeArray } from '@/lib/safeArray';
import { getApiErrorMessage, buildErrorToast } from '@/lib/apiError';
import { EntitySelect } from '@/components/entity/EntitySelect';
import { EntityOptionRow } from '@/components/entity/entityVisuals';
import { VisualIdentityFields } from '@/components/entity/VisualIdentityFields';
import { INPUT_LENGTH } from '@shared/constants/input-length';
import { optionalText, requiredCode, requiredName, requiredText } from '@/lib/validation';
import { CharacterCount } from '@/components/form/CharacterCount';

const departmentSchema = z.object({
  departmentCode: requiredCode('Code'),
  departmentName: requiredName('Name'),
  companyId: requiredText('Company'),
  description: optionalText('Description', INPUT_LENGTH.note),
  headOfDepartmentId: optionalText('Head of department id'),
  colorHex: optionalText('Color hex'),
  iconId: optionalText('Icon'),
  orderNo: z.preprocess((v) => (v === '' || v == null ? undefined : Number(v)), z.number().int().min(0).optional()),
});

type DepartmentFormValues = z.infer<typeof departmentSchema>;

function DepartmentNameCell({ row }: { row: { original: IDepartment } }) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      className="text-left hover:underline hover:text-primary transition-colors"
      onClick={() => navigate(`/settings/departments/${row.original.id}`)}
    >
      <EntityOptionRow option={row.original} hideSecondary />
    </button>
  );
}

const columns: ColumnDef<IDepartment>[] = [
  { accessorKey: 'orderNo', header: 'Order', cell: ({ row }) => row.original.orderNo ?? 0 },
  { accessorKey: 'code', header: 'Code', cell: ({ row }) => row.original.code ?? '—' },
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => <DepartmentNameCell row={row} />,
  },
  {
    accessorKey: 'company',
    header: 'Company',
    cell: ({ row }) => row.original.company?.name ?? '—',
  },
  { accessorKey: 'note', header: 'Description', cell: ({ row }) => row.original.note ?? '—' },
];

export function DepartmentsPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<IDepartment | null>(null);

  const { toast } = useToast();
  const errToast = buildErrorToast(toast);
  const { data, isLoading } = useDepartments({ page, limit: 20, search });
  const { data: companiesData } = useCompanies({ limit: 100 });
  const createMutation = useCreateDepartment();
  const updateMutation = useUpdateDepartment();
  const deleteMutation = useDeleteDepartment();
  const perm = useCrudPermissions('S02');

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<DepartmentFormValues>({
    resolver: zodResolver(departmentSchema) as Resolver<DepartmentFormValues>,
  });

  function handleAdd() {
    setEditTarget(null);
    reset({});
    setDialogOpen(true);
  }

  function handleEdit(row: IDepartment) {
    setEditTarget(row);
    reset({
      departmentCode: row.code ?? '',
      departmentName: row.name,
      companyId: row.companyId,
      description: row.note ?? '',
      colorHex: row.colorHex ?? '#64748b',
      iconId: row.iconId ?? '',
      orderNo: row.orderNo ?? 0,
    });
    setDialogOpen(true);
  }

  async function handleDelete(row: IDepartment) {
    try {
      await deleteMutation.mutateAsync(row.id);
      toast({ title: 'Department deleted' });
    } catch (err: unknown) {
      toast({ title: getApiErrorMessage(err, 'Failed to delete department'), variant: 'destructive' });
    }
  }

  async function onSubmit(values: DepartmentFormValues) {
    try {
      const dto = {
        ...values,
        colorHex: values.colorHex || undefined,
        iconId: values.iconId || undefined,
        orderNo: values.orderNo ?? 0,
      };
      if (editTarget) {
        await updateMutation.mutateAsync({ id: editTarget.id, dto });
        toast({ title: 'Department updated' });
      } else {
        await createMutation.mutateAsync(dto);
        toast({ title: 'Department created' });
      }
      setDialogOpen(false);
    } catch (err: unknown) {
      errToast(err, editTarget ? 'Failed to update department' : 'Failed to create department');
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Departments</h1>
        <p className="text-sm text-muted-foreground">Manage department records</p>
      </div>

      <CrudTable
        columns={columns}
        data={safeArray(data?.data)}
        isLoading={isLoading}
        pagination={data?.pagination}
        onAdd={perm.canCreate ? handleAdd : undefined}
        onView={(row) => navigate(`/settings/departments/${row.id}`)}
        onEdit={perm.canUpdate ? handleEdit : undefined}
        onDelete={perm.canDelete ? handleDelete : undefined}
        onSearch={setSearch}
        onPageChange={setPage}
        addLabel="Add Department"
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editTarget ? 'Edit Department' : 'Add Department'}</DialogTitle>
          </DialogHeader>
          <form id="departments-form" onSubmit={handleSubmit(onSubmit)} className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-4">
            <div className="space-y-1">
              <Label htmlFor="departmentCode">Code *</Label>
              <Input id="departmentCode" maxLength={INPUT_LENGTH.code} {...register('departmentCode')} />
              <CharacterCount current={watch('departmentCode')} max={INPUT_LENGTH.code} />
              {errors.departmentCode && (
                <p className="text-xs text-destructive">{errors.departmentCode.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="departmentName">Name *</Label>
              <Input id="departmentName" maxLength={INPUT_LENGTH.name} {...register('departmentName')} />
              <CharacterCount current={watch('departmentName')} max={INPUT_LENGTH.name} />
              {errors.departmentName && (
                <p className="text-xs text-destructive">{errors.departmentName.message}</p>
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
                    testId="department-company-select"
                  />
                )}
              />
              {errors.companyId && (
                <p className="text-xs text-destructive">{errors.companyId.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="description">Description</Label>
              <Input id="description" maxLength={INPUT_LENGTH.note} {...register('description')} />
              <CharacterCount current={watch('description')} max={INPUT_LENGTH.note} />
            </div>

            <div className="space-y-1">
              <Label htmlFor="headOfDepartmentId">
                Head of Department <span className="text-xs text-muted-foreground">(Staff ID — wire up in EP04)</span>
              </Label>
              <Input id="headOfDepartmentId" maxLength={INPUT_LENGTH.text} {...register('headOfDepartmentId')} placeholder="Staff ID" />
            </div>

            <div className="space-y-1">
              <Label htmlFor="orderNo">Order No</Label>
              <Input id="orderNo" type="number" min={0} max={999999} {...register('orderNo')} placeholder="0" />
            </div>

            <input type="hidden" {...register('colorHex')} />
            <input type="hidden" {...register('iconId')} />
            <VisualIdentityFields
              previewLabel={watch('departmentName') || 'Department'}
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
            <Button type="submit" form="departments-form" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
