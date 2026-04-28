import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { ColumnDef } from '@tanstack/react-table';
import { CrudTable } from '@/components/CrudTable';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FormTextField } from '@/components/form/FormTextField';
import { useToast } from '@/hooks/use-toast';
import {
  useSystemRoles,
  useCreateRole,
  useUpdateRole,
  useDeleteRole,
} from '@/hooks/useSystem';
import type { ISystemRole } from '@/api/system.api';
import { getApiErrorMessage, buildErrorToast } from '@/lib/apiError';
import { safeArray } from '@/lib/safeArray';
import { EntityOptionRow } from '@/components/entity/entityVisuals';
import { VisualIdentityFields } from '@/components/entity/VisualIdentityFields';
import { INPUT_LENGTH } from '@shared/constants/input-length';
import { optionalText, requiredName } from '@/lib/validation';

const roleSchema = z.object({
  name: requiredName('Name'),
  displayName: optionalText('Display Name', INPUT_LENGTH.name),
  description: optionalText('Description'),
  colorHex: z.string().optional(),
  iconId: z.string().optional(),
});

type RoleFormValues = z.infer<typeof roleSchema>;

const columns: ColumnDef<ISystemRole>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => <EntityOptionRow option={row.original} hideSecondary />,
  },
  { accessorKey: 'displayName', header: 'Display Name', cell: ({ row }) => row.original.displayName ?? '—' },
  { accessorKey: 'description', header: 'Description', cell: ({ row }) => row.original.description ?? '—' },
  { accessorKey: 'staffCount', header: 'Staff Count' },
];

export function RolesPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ISystemRole | null>(null);

  const { toast } = useToast();
  const errToast = buildErrorToast(toast, { 'already exists': 'Role name already exists' });
  const { data: roles, isLoading } = useSystemRoles();
  const createMutation = useCreateRole();
  const updateMutation = useUpdateRole();
  const deleteMutation = useDeleteRole();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RoleFormValues>({
    resolver: zodResolver(roleSchema),
  });

  function handleAdd() {
    setEditTarget(null);
    reset({});
    setDialogOpen(true);
  }

  function handleEdit(row: ISystemRole) {
    setEditTarget(row);
    reset({
      name: row.name,
      displayName: row.displayName ?? '',
      description: row.description ?? '',
      colorHex: row.colorHex ?? '#64748b',
      iconId: row.iconId ?? '',
    });
    setDialogOpen(true);
  }

  async function handleDelete(row: ISystemRole) {
    try {
      await deleteMutation.mutateAsync(row.id);
      toast({ title: 'Role deleted' });
    } catch (err: unknown) {
      toast({ title: getApiErrorMessage(err, 'Failed to delete role'), variant: 'destructive' });
    }
  }

  async function onSubmit(values: RoleFormValues) {
    try {
      const dto = {
        ...values,
        colorHex: values.colorHex || undefined,
        iconId: values.iconId || undefined,
      };
      if (editTarget) {
        await updateMutation.mutateAsync({ id: editTarget.id, dto });
        toast({ title: 'Role updated' });
      } else {
        await createMutation.mutateAsync(dto);
        toast({ title: 'Role created' });
      }
      setDialogOpen(false);
    } catch (err: unknown) {
      errToast(err, editTarget ? 'Failed to update role' : 'Failed to create role');
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Roles</h1>
        <p className="text-sm text-muted-foreground">Manage system roles</p>
      </div>

      <CrudTable
        columns={columns}
        data={safeArray(roles)}
        isLoading={isLoading}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        addLabel="Add Role"
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editTarget ? 'Edit Role' : 'Add Role'}</DialogTitle>
          </DialogHeader>
          <form id="roles-form" onSubmit={handleSubmit(onSubmit)} className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-4">
            <FormTextField
              id="name"
              label="Name"
              required
              registration={register('name')}
              current={watch('name')}
              maxLength={INPUT_LENGTH.name}
              error={errors.name?.message}
            />

            <FormTextField
              id="displayName"
              label="Display Name"
              registration={register('displayName')}
              current={watch('displayName')}
              maxLength={INPUT_LENGTH.name}
              error={errors.displayName?.message}
            />

            <FormTextField
              id="description"
              label="Description"
              registration={register('description')}
              current={watch('description')}
              maxLength={INPUT_LENGTH.text}
              error={errors.description?.message}
            />

            <input type="hidden" {...register('colorHex')} />
            <input type="hidden" {...register('iconId')} />
            <VisualIdentityFields
              previewLabel={watch('displayName') || watch('name') || 'Role'}
              colorHex={watch('colorHex')}
              iconId={watch('iconId')}
              onColorHexChange={(value) => setValue('colorHex', value, { shouldDirty: true, shouldTouch: true })}
              onIconIdChange={(value) => setValue('iconId', value, { shouldDirty: true, shouldTouch: true })}
              iconChoices={['ShieldCheck', 'UserRoundCog', 'Users', 'BriefcaseBusiness', 'Handshake', 'BadgeCheck', 'User', 'Building2']}
            />

          </form>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="roles-form" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
