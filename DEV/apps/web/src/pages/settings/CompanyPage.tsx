import { useState } from 'react';
import { useCrudPermissions } from '@/hooks/useCrudPermissions';
import { useNavigate } from 'react-router-dom';
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
  useCompanies,
  useCreateCompany,
  useUpdateCompany,
  useDeleteCompany,
} from '@/hooks/useCompany';
import type { ICompany } from '@/api/org.api';
import { safeArray } from '@/lib/safeArray';
import { getApiErrorMessage, buildErrorToast } from '@/lib/apiError';
import { EntityOptionRow } from '@/components/entity/entityVisuals';
import { VisualIdentityFields } from '@/components/entity/VisualIdentityFields';
import { INPUT_LENGTH } from '@shared/constants/input-length';
import { optionalEmail, optionalText, requiredName } from '@/lib/validation';
import { CharacterCount } from '@/components/form/CharacterCount';

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
  companyContactFirstName: optionalText('Contact first name', INPUT_LENGTH.name),
  companyContactSurname: optionalText('Contact surname', INPUT_LENGTH.name),
  companyContactEmailAddress: optionalEmail('Contact email'),
  companyContactMobile: optionalText('Contact mobile'),
});

type CompanyFormValues = z.infer<typeof companySchema>;

const columns: ColumnDef<ICompany>[] = [
  {
    accessorKey: 'logoUrl',
    header: 'Logo',
    cell: ({ row }) =>
      row.original.logoUrl ? (
        <img
          src={row.original.logoUrl}
          alt="logo"
          className="h-8 w-8 rounded object-cover"
        />
      ) : (
        <div className="h-8 w-8 rounded bg-muted flex items-center justify-center text-xs text-muted-foreground">
          N/A
        </div>
      ),
  },
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => <EntityOptionRow option={row.original} hideSecondary />,
  },
  { accessorKey: 'code', header: 'Code', cell: ({ row }) => row.original.code ?? '—' },
  { accessorKey: 'address', header: 'Address', cell: ({ row }) => row.original.address ?? '—' },
  { accessorKey: 'taxCode', header: 'TIN', cell: ({ row }) => row.original.taxCode ?? '—' },
  { accessorKey: 'phone', header: 'Phone', cell: ({ row }) => row.original.phone ?? '—' },
];

export function CompanyPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ICompany | null>(null);
  const navigate = useNavigate();

  const { toast } = useToast();
  const errToast = buildErrorToast(toast);
  const { data, isLoading } = useCompanies({ page, limit: 20, search });
  const perm = useCrudPermissions('S01');
  const createMutation = useCreateCompany();
  const updateMutation = useUpdateCompany();
  const deleteMutation = useDeleteCompany();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CompanyFormValues>({
    resolver: zodResolver(companySchema),
  });

  function handleAdd() {
    setEditTarget(null);
    reset({});
    setDialogOpen(true);
  }

  function handleEdit(row: ICompany) {
    setEditTarget(row);
    reset({
      companyName: row.name,
      companyCode: row.code ?? '',
      companyAddress: row.address ?? '',
      companyTinNumber: row.taxCode ?? '',
      companyLogoUrl: row.logoUrl ?? '',
      companyPhone: row.phone ?? '',
      companyWebsite: row.website ?? '',
      colorHex: row.colorHex ?? '#64748b',
      iconId: row.iconId ?? '',
    });
    setDialogOpen(true);
  }

  async function handleDelete(row: ICompany) {
    try {
      await deleteMutation.mutateAsync(row.id);
      toast({ title: 'Company deleted' });
    } catch (err: unknown) {
      toast({ title: getApiErrorMessage(err, 'Failed to delete company'), variant: 'destructive' });
    }
  }

  async function onSubmit(values: CompanyFormValues) {
    try {
      const dto = {
        ...values,
        colorHex: values.colorHex || undefined,
        iconId: values.iconId || undefined,
      };
      if (editTarget) {
        await updateMutation.mutateAsync({ id: editTarget.id, dto });
        toast({ title: 'Company updated' });
      } else {
        await createMutation.mutateAsync(dto);
        toast({ title: 'Company created' });
      }
      setDialogOpen(false);
    } catch (err: unknown) {
      errToast(err, editTarget ? 'Failed to update company' : 'Failed to create company');
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Companies</h1>
        <p className="text-sm text-muted-foreground">Manage company records</p>
      </div>

      <CrudTable
        columns={columns}
        data={safeArray(data?.data)}
        isLoading={isLoading}
        pagination={data?.pagination}
        onAdd={perm.canCreate ? handleAdd : undefined}
        onView={(row) => navigate(`/settings/company/${row.id}`)}
        onEdit={perm.canUpdate ? handleEdit : undefined}
        onDelete={perm.canDelete ? handleDelete : undefined}
        onSearch={setSearch}
        onPageChange={setPage}
        addLabel="Add Company"
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editTarget ? 'Edit Company' : 'Add Company'}</DialogTitle>
          </DialogHeader>
          <form id="company-form" onSubmit={handleSubmit(onSubmit)} className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-4">
            <div className="space-y-1">
              <Label htmlFor="companyName">Company Name *</Label>
              <Input id="companyName" maxLength={INPUT_LENGTH.name} {...register('companyName')} />
              <CharacterCount current={watch('companyName')} max={INPUT_LENGTH.name} />
              {errors.companyName && (
                <p className="text-xs text-destructive">{errors.companyName.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="companyCode">Code</Label>
              <Input id="companyCode" maxLength={INPUT_LENGTH.code} {...register('companyCode')} />
              <CharacterCount current={watch('companyCode')} max={INPUT_LENGTH.code} />
            </div>

            <div className="space-y-1">
              <Label htmlFor="companyAddress">Address</Label>
              <Input id="companyAddress" maxLength={INPUT_LENGTH.text} {...register('companyAddress')} />
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

            <div className="space-y-1">
              <Label htmlFor="companyLogoUrl">Logo URL</Label>
              <Input id="companyLogoUrl" maxLength={INPUT_LENGTH.text} {...register('companyLogoUrl')} placeholder="https://..." />
            </div>

            <input type="hidden" {...register('colorHex')} />
            <input type="hidden" {...register('iconId')} />
            <VisualIdentityFields
              previewLabel={watch('companyName') || 'Company'}
              colorHex={watch('colorHex')}
              iconId={watch('iconId')}
              onColorHexChange={(value) => setValue('colorHex', value, { shouldDirty: true, shouldTouch: true })}
              onIconIdChange={(value) => setValue('iconId', value, { shouldDirty: true, shouldTouch: true })}
            />

            <div className="border-t pt-4">
              <p className="text-sm font-medium text-muted-foreground mb-3">Primary Contact</p>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="companyContactFirstName">First Name</Label>
                    <Input id="companyContactFirstName" maxLength={INPUT_LENGTH.name} {...register('companyContactFirstName')} />
                    <CharacterCount current={watch('companyContactFirstName')} max={INPUT_LENGTH.name} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="companyContactSurname">Surname</Label>
                    <Input id="companyContactSurname" maxLength={INPUT_LENGTH.name} {...register('companyContactSurname')} />
                    <CharacterCount current={watch('companyContactSurname')} max={INPUT_LENGTH.name} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="companyContactEmailAddress">Email</Label>
                  <Input
                    id="companyContactEmailAddress"
                    type="email"
                    maxLength={INPUT_LENGTH.text}
                    {...register('companyContactEmailAddress')}
                  />
                  {errors.companyContactEmailAddress && (
                    <p className="text-xs text-destructive">
                      {errors.companyContactEmailAddress.message}
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="companyContactMobile">Mobile</Label>
                  <Input id="companyContactMobile" maxLength={INPUT_LENGTH.text} {...register('companyContactMobile')} />
                </div>
              </div>
            </div>

          </form>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="company-form" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
