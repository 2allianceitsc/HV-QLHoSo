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
  useTeams,
  useCreateTeam,
  useUpdateTeam,
  useDeleteTeam,
} from '@/hooks/useTeam';
import { useCompanies } from '@/hooks/useCompany';
import { useClients } from '@/hooks/useClient';
import type { ITeam } from '@/api/org.api';
import { safeArray } from '@/lib/safeArray';
import { getApiErrorMessage, buildErrorToast } from '@/lib/apiError';
import { EntitySelect } from '@/components/entity/EntitySelect';
import { EntityOptionRow } from '@/components/entity/entityVisuals';
import { VisualIdentityFields } from '@/components/entity/VisualIdentityFields';

const teamSchema = z.object({
  teamName: z.string().min(1, 'Name is required'),
  companyId: z.string().min(1, 'Company is required'),
  teamCode: z.string().optional(),
  clientId: z.string().optional(),
  colorHex: z.string().optional(),
  iconId: z.string().optional(),
  orderNo: z.preprocess((v) => (v === '' || v == null ? undefined : Number(v)), z.number().int().min(0).optional()),
});

type TeamFormValues = z.infer<typeof teamSchema>;

function TeamNameCell({ row }: { row: { original: ITeam } }) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      className="text-left hover:underline hover:text-primary transition-colors"
      onClick={() => navigate(`/settings/teams/${row.original.id}`)}
    >
      <EntityOptionRow option={row.original} hideSecondary />
    </button>
  );
}

const columns: ColumnDef<ITeam>[] = [
  { accessorKey: 'orderNo', header: 'Order', cell: ({ row }) => row.original.orderNo ?? 0 },
  { accessorKey: 'code', header: 'Code', cell: ({ row }) => row.original.code ?? '—' },
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => <TeamNameCell row={row} />,
  },
  {
    accessorKey: 'company',
    header: 'Company',
    cell: ({ row }) => row.original.company?.name ?? '—',
  },
  {
    id: 'client',
    header: 'Client',
    cell: () => <span className="text-muted-foreground text-xs">— (wire up EP06)</span>,
  },
  {
    id: 'manager',
    header: 'Manager',
    cell: () => <span className="text-muted-foreground text-xs">— (wire up EP04)</span>,
  },
];

export function TeamsPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ITeam | null>(null);
  const perm = useCrudPermissions('S05');

  const { toast } = useToast();
  const errToast = buildErrorToast(toast);
  const { data, isLoading } = useTeams({ page, limit: 20, search });
  const { data: companiesData } = useCompanies({ limit: 100 });
  const { data: clientsData } = useClients({ limit: 100 });
  const createMutation = useCreateTeam();
  const updateMutation = useUpdateTeam();
  const deleteMutation = useDeleteTeam();

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<TeamFormValues>({
    resolver: zodResolver(teamSchema) as Resolver<TeamFormValues>,
  });

  function handleAdd() {
    setEditTarget(null);
    reset({});
    setDialogOpen(true);
  }

  function handleEdit(row: ITeam) {
    setEditTarget(row);
    reset({
      teamName: row.name,
      teamCode: row.code ?? '',
      companyId: row.companyId,
      clientId: row.clientId ?? '',
      colorHex: row.colorHex ?? '#64748b',
      iconId: row.iconId ?? '',
      orderNo: row.orderNo ?? 0,
    });
    setDialogOpen(true);
  }

  async function handleDelete(row: ITeam) {
    try {
      await deleteMutation.mutateAsync(row.id);
      toast({ title: 'Team deleted' });
    } catch (err: unknown) {
      toast({ title: getApiErrorMessage(err, 'Failed to delete team'), variant: 'destructive' });
    }
  }

  async function onSubmit(values: TeamFormValues) {
    try {
      const dto = {
        ...values,
        clientId: values.clientId || undefined,
        colorHex: values.colorHex || undefined,
        iconId: values.iconId || undefined,
        orderNo: values.orderNo ?? 0,
      };
      if (editTarget) {
        await updateMutation.mutateAsync({ id: editTarget.id, dto });
        toast({ title: 'Team updated' });
      } else {
        await createMutation.mutateAsync(dto);
        toast({ title: 'Team created' });
      }
      setDialogOpen(false);
    } catch (err: unknown) {
      errToast(err, editTarget ? 'Failed to update team' : 'Failed to create team');
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Teams</h1>
        <p className="text-sm text-muted-foreground">Manage teams</p>
      </div>

      <CrudTable
        columns={columns}
        data={safeArray(data?.data)}
        isLoading={isLoading}
        pagination={data?.pagination}
        onAdd={perm.canCreate ? handleAdd : undefined}
        onView={(row) => navigate(`/settings/teams/${row.id}`)}
        onEdit={perm.canUpdate ? handleEdit : undefined}
        onDelete={perm.canDelete ? handleDelete : undefined}
        onSearch={setSearch}
        onPageChange={setPage}
        addLabel="Add Team"
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editTarget ? 'Edit Team' : 'Add Team'}</DialogTitle>
          </DialogHeader>
          <form id="teams-form" onSubmit={handleSubmit(onSubmit)} className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-4">
            <div className="space-y-1">
              <Label htmlFor="teamName">Name *</Label>
              <Input id="teamName" {...register('teamName')} />
              {errors.teamName && (
                <p className="text-xs text-destructive">{errors.teamName.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="teamCode">Code</Label>
              <Input id="teamCode" {...register('teamCode')} />
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
                    testId="team-company-select"
                  />
                )}
              />
              {errors.companyId && (
                <p className="text-xs text-destructive">{errors.companyId.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="clientId">Client</Label>
              <Controller
                control={control}
                name="clientId"
                render={({ field }) => (
                  <EntitySelect
                    value={field.value}
                    onValueChange={field.onChange}
                    options={clientsData?.data ?? []}
                    placeholder="Select client"
                    emptyLabel="No client"
                    entityType="CLIENT"
                    testId="team-client-select"
                  />
                )}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="orderNo">Order No</Label>
              <Input id="orderNo" type="number" min={0} {...register('orderNo')} placeholder="0" />
            </div>

            <input type="hidden" {...register('colorHex')} />
            <input type="hidden" {...register('iconId')} />
            <VisualIdentityFields
              previewLabel={watch('teamName') || 'Team'}
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
            <Button type="submit" form="teams-form" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
