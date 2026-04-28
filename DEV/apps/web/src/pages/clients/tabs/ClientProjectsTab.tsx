import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { ColumnDef } from '@tanstack/react-table';
import { CrudTable } from '@/components/CrudTable';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  useClientProjects,
  useCreateClientProject,
  useUpdateClientProject,
  useDeleteClientProject,
  useClientDepartments,
} from '@/hooks/useClient';
import type { IClientProject } from '@/api/client.api';
import { getApiErrorMessage, buildErrorToast } from '@/lib/apiError';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  code: z.string().optional(),
  departmentId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  completed: 'bg-blue-100 text-blue-800',
  on_hold: 'bg-yellow-100 text-yellow-800',
  cancelled: 'bg-red-100 text-red-800',
};

interface Props {
  clientId: string;
}

export function ClientProjectsTab({ clientId }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<IClientProject | null>(null);
  const { toast } = useToast();
  const errToast = buildErrorToast(toast);

  const { data: projects = [], isLoading } = useClientProjects(clientId);
  const { data: departments = [] } = useClientDepartments(clientId);
  const createMutation = useCreateClientProject(clientId);
  const updateMutation = useUpdateClientProject(clientId);
  const deleteMutation = useDeleteClientProject(clientId);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const columns: ColumnDef<IClientProject>[] = [
    { accessorKey: 'code', header: 'Code', cell: ({ row }) => row.original.code ?? '—' },
    { accessorKey: 'name', header: 'Name' },
    {
      id: 'department',
      header: 'Department',
      cell: ({ row }) => row.original.department?.name ?? '—',
    },
    { accessorKey: 'startDate', header: 'Start Date', cell: ({ row }) => row.original.startDate?.slice(0, 10) ?? '—' },
    { accessorKey: 'endDate', header: 'End Date', cell: ({ row }) => row.original.endDate?.slice(0, 10) ?? '—' },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const s = row.original.status;
        if (!s) return '—';
        const cls = STATUS_COLORS[s] ?? 'bg-gray-100 text-gray-800';
        return <Badge className={`${cls} border-0 text-xs`}>{s.replace('_', ' ')}</Badge>;
      },
    },
  ];

  function handleAdd() {
    setEditTarget(null);
    reset({});
    setDialogOpen(true);
  }

  function handleEdit(row: IClientProject) {
    setEditTarget(row);
    reset({
      name: row.name,
      code: row.code ?? '',
      departmentId: row.departmentId ?? '',
      startDate: row.startDate?.slice(0, 10) ?? '',
      endDate: row.endDate?.slice(0, 10) ?? '',
      status: row.status ?? '',
    });
    setDialogOpen(true);
  }

  async function handleDelete(row: IClientProject) {
    try {
      await deleteMutation.mutateAsync(row.id);
      toast({ title: 'Project deleted' });
    } catch (err: unknown) {
      toast({ title: getApiErrorMessage(err, 'Failed to delete project'), variant: 'destructive' });
    }
  }

  async function onSubmit(values: FormValues) {
    try {
      const dto = {
        ...values,
        departmentId: values.departmentId || undefined,
        startDate: values.startDate || undefined,
        endDate: values.endDate || undefined,
        status: values.status || undefined,
      };
      if (editTarget) {
        await updateMutation.mutateAsync({ projId: editTarget.id, dto });
        toast({ title: 'Project updated' });
      } else {
        await createMutation.mutateAsync(dto);
        toast({ title: 'Project created' });
      }
      setDialogOpen(false);
    } catch (err: unknown) {
      errToast(err, editTarget ? 'Failed to update project' : 'Failed to create project');
    }
  }

  return (
    <>
      <CrudTable
        columns={columns}
        data={projects}
        isLoading={isLoading}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        addLabel="Add Project"
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editTarget ? 'Edit Project' : 'Add Project'}</DialogTitle>
          </DialogHeader>
          <form id="client-projects-form" onSubmit={handleSubmit(onSubmit)} className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-4">
            <div className="space-y-1">
              <Label htmlFor="name">Name *</Label>
              <Input id="name" {...register('name')} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>

            <div className="space-y-1">
              <Label htmlFor="code">Code</Label>
              <Input id="code" {...register('code')} />
            </div>

            <div className="space-y-1">
              <Label htmlFor="departmentId">Department</Label>
              <select
                id="departmentId"
                {...register('departmentId')}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">None</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="startDate">Start Date</Label>
                <Input id="startDate" type="date" {...register('startDate')} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="endDate">End Date</Label>
                <Input id="endDate" type="date" {...register('endDate')} />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                {...register('status')}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">None</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="on_hold">On Hold</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

          </form>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button type="submit" form="client-projects-form" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
