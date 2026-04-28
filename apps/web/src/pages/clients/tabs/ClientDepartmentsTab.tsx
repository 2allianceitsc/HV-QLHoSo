import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { ColumnDef } from '@tanstack/react-table';
import { CrudTable } from '@/components/CrudTable';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  useClientDepartments,
  useCreateClientDepartment,
  useUpdateClientDepartment,
  useDeleteClientDepartment,
} from '@/hooks/useClient';
import type { IClientDepartment } from '@/api/client.api';
import { getApiErrorMessage, buildErrorToast } from '@/lib/apiError';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  code: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

const columns: ColumnDef<IClientDepartment>[] = [
  { accessorKey: 'code', header: 'Code', cell: ({ row }) => row.original.code ?? '—' },
  { accessorKey: 'name', header: 'Name' },
];

interface Props {
  clientId: string;
}

export function ClientDepartmentsTab({ clientId }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<IClientDepartment | null>(null);
  const { toast } = useToast();
  const errToast = buildErrorToast(toast);

  const { data = [], isLoading } = useClientDepartments(clientId);
  const createMutation = useCreateClientDepartment(clientId);
  const updateMutation = useUpdateClientDepartment(clientId);
  const deleteMutation = useDeleteClientDepartment(clientId);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  function handleAdd() {
    setEditTarget(null);
    reset({});
    setDialogOpen(true);
  }

  function handleEdit(row: IClientDepartment) {
    setEditTarget(row);
    reset({ name: row.name, code: row.code ?? '' });
    setDialogOpen(true);
  }

  async function handleDelete(row: IClientDepartment) {
    try {
      await deleteMutation.mutateAsync(row.id);
      toast({ title: 'Department deleted' });
    } catch (err: unknown) {
      toast({ title: getApiErrorMessage(err, 'Failed to delete department'), variant: 'destructive' });
    }
  }

  async function onSubmit(values: FormValues) {
    try {
      if (editTarget) {
        await updateMutation.mutateAsync({ deptId: editTarget.id, dto: values });
        toast({ title: 'Department updated' });
      } else {
        await createMutation.mutateAsync(values);
        toast({ title: 'Department created' });
      }
      setDialogOpen(false);
    } catch (err: unknown) {
      errToast(err, editTarget ? 'Failed to update department' : 'Failed to create department');
    }
  }

  return (
    <>
      <CrudTable
        columns={columns}
        data={data}
        isLoading={isLoading}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        addLabel="Add Department"
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editTarget ? 'Edit Department' : 'Add Department'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
            <div className="space-y-1">
              <Label htmlFor="name">Name *</Label>
              <Input id="name" {...register('name')} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="code">Code</Label>
              <Input id="code" {...register('code')} />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
