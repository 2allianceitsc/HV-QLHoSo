import { useState } from 'react';
import { useCrudPermissions } from '@/hooks/useCrudPermissions';
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
import { useCompanies } from '@/hooks/useCompany';
import {
  useCompanyContacts,
  useCreateCompanyContact,
  useUpdateCompanyContact,
  useDeleteCompanyContact,
} from '@/hooks/useCompanyContact';
import type { ICompanyContact } from '@/api/org.api';
import { getApiErrorMessage, buildErrorToast } from '@/lib/apiError';
import { EntitySelect } from '@/components/entity/EntitySelect';
import { optionalEmail, optionalText, requiredName } from '@/lib/validation';
import { INPUT_LENGTH } from '@shared/constants/input-length';

const contactSchema = z.object({
  firstName: requiredName('First name'),
  surname: requiredName('Surname'),
  emailAddress: optionalEmail('Email address'),
  mobileCountryCode: optionalText('Mobile country code'),
  mobileNumber: optionalText('Mobile number'),
  landlineCountryCode: optionalText('Landline country code'),
  landlineAreaCode: optionalText('Landline area code'),
  landlineNumber: optionalText('Landline number'),
  streetAddress: optionalText('Street address'),
  suburb: optionalText('Suburb'),
  city: optionalText('City'),
  state: optionalText('State'),
  country: optionalText('Country'),
  postcode: optionalText('Postcode'),
});

type ContactFormValues = z.infer<typeof contactSchema>;

const columns: ColumnDef<ICompanyContact>[] = [
  {
    id: 'name',
    header: 'Name',
    cell: ({ row }) => `${row.original.firstName} ${row.original.surname}`,
  },
  {
    accessorKey: 'emailAddress',
    header: 'Email',
    cell: ({ row }) => row.original.emailAddress ?? '—',
  },
  {
    id: 'mobile',
    header: 'Mobile',
    cell: ({ row }) => {
      const { mobileCountryCode, mobileNumber } = row.original;
      if (!mobileNumber) return '—';
      return mobileCountryCode ? `${mobileCountryCode} ${mobileNumber}` : mobileNumber;
    },
  },
  {
    id: 'location',
    header: 'City / Country',
    cell: ({ row }) => {
      const parts = [row.original.city, row.original.country].filter(Boolean);
      return parts.length ? parts.join(', ') : '—';
    },
  },
];

export function CompanyContactsPage() {
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ICompanyContact | null>(null);

  const { toast } = useToast();
  const errToast = buildErrorToast(toast);
  const { data: companiesData } = useCompanies({ limit: 100 });
  const { data: contacts = [], isLoading } = useCompanyContacts(selectedCompanyId || null);

  const perm = useCrudPermissions('S01');
  const createMutation = useCreateCompanyContact(selectedCompanyId);
  const updateMutation = useUpdateCompanyContact(selectedCompanyId);
  const deleteMutation = useDeleteCompanyContact(selectedCompanyId);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
  });

  function handleAdd() {
    setEditTarget(null);
    reset({});
    setDialogOpen(true);
  }

  function handleEdit(row: ICompanyContact) {
    setEditTarget(row);
    reset({
      firstName: row.firstName,
      surname: row.surname,
      emailAddress: row.emailAddress ?? '',
      mobileCountryCode: row.mobileCountryCode ?? '',
      mobileNumber: row.mobileNumber ?? '',
      landlineCountryCode: row.landlineCountryCode ?? '',
      landlineAreaCode: row.landlineAreaCode ?? '',
      landlineNumber: row.landlineNumber ?? '',
      streetAddress: row.streetAddress ?? '',
      suburb: row.suburb ?? '',
      city: row.city ?? '',
      state: row.state ?? '',
      country: row.country ?? '',
      postcode: row.postcode ?? '',
    });
    setDialogOpen(true);
  }

  async function handleDelete(row: ICompanyContact) {
    try {
      await deleteMutation.mutateAsync(row.id);
      toast({ title: 'Contact deleted' });
    } catch (err: unknown) {
      toast({ title: getApiErrorMessage(err, 'Failed to delete contact'), variant: 'destructive' });
    }
  }

  async function onSubmit(values: ContactFormValues) {
    // Strip empty strings to undefined so backend receives clean optional fields
    const dto = Object.fromEntries(
      Object.entries(values).map(([k, v]) => [k, v === '' ? undefined : v]),
    ) as ContactFormValues;

    try {
      if (editTarget) {
        await updateMutation.mutateAsync({ id: editTarget.id, dto });
        toast({ title: 'Contact updated' });
      } else {
        await createMutation.mutateAsync(dto);
        toast({ title: 'Contact created' });
      }
      setDialogOpen(false);
    } catch (err: unknown) {
      errToast(err, editTarget ? 'Failed to update contact' : 'Failed to create contact');
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Company Contacts</h1>
        <p className="text-sm text-muted-foreground">Manage contacts for each company</p>
      </div>

      {/* Company selector */}
      <div className="space-y-1 max-w-sm">
        <Label htmlFor="companySelect">Company</Label>
        <EntitySelect
          value={selectedCompanyId}
          onValueChange={setSelectedCompanyId}
          options={companiesData?.data ?? []}
          placeholder="Select company"
          emptyLabel="Select company"
          entityType="COMPANY"
          testId="company-contacts-company-select"
          triggerClassName="w-full"
        />
      </div>

      {/* Contacts table — only shown once a company is selected */}
      {selectedCompanyId ? (
        <CrudTable
          columns={columns}
          data={contacts}
          isLoading={isLoading}
          onAdd={perm.canCreate ? handleAdd : undefined}
          onEdit={perm.canUpdate ? handleEdit : undefined}
          onDelete={perm.canDelete ? handleDelete : undefined}
          addLabel="Add Contact"
        />
      ) : (
        <p className="text-sm text-muted-foreground">Select a company above to view its contacts.</p>
      )}

      {/* Add / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editTarget ? 'Edit Contact' : 'Add Contact'}</DialogTitle>
          </DialogHeader>

          <form id="company-contacts-form" onSubmit={handleSubmit(onSubmit)} className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-4">
            {/* Name row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="firstName">First Name *</Label>
                <Input id="firstName" maxLength={INPUT_LENGTH.name} {...register('firstName')} />
                {errors.firstName && (
                  <p className="text-xs text-destructive">{errors.firstName.message}</p>
                )}
              </div>
              <div className="space-y-1">
                <Label htmlFor="surname">Surname *</Label>
                <Input id="surname" maxLength={INPUT_LENGTH.name} {...register('surname')} />
                {errors.surname && (
                  <p className="text-xs text-destructive">{errors.surname.message}</p>
                )}
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1">
              <Label htmlFor="emailAddress">Email</Label>
              <Input id="emailAddress" type="email" maxLength={INPUT_LENGTH.text} {...register('emailAddress')} />
              {errors.emailAddress && (
                <p className="text-xs text-destructive">{errors.emailAddress.message}</p>
              )}
            </div>

            {/* Mobile */}
            <div className="space-y-1">
              <Label>Mobile</Label>
              <div className="grid grid-cols-3 gap-2">
                <Input placeholder="Country code" maxLength={INPUT_LENGTH.text} {...register('mobileCountryCode')} />
                <Input placeholder="Number" className="col-span-2" maxLength={INPUT_LENGTH.text} {...register('mobileNumber')} />
              </div>
            </div>

            {/* Landline */}
            <div className="space-y-1">
              <Label>Landline</Label>
              <div className="grid grid-cols-4 gap-2">
                <Input placeholder="Country" maxLength={INPUT_LENGTH.text} {...register('landlineCountryCode')} />
                <Input placeholder="Area" maxLength={INPUT_LENGTH.text} {...register('landlineAreaCode')} />
                <Input placeholder="Number" className="col-span-2" maxLength={INPUT_LENGTH.text} {...register('landlineNumber')} />
              </div>
            </div>

            {/* Address */}
            <div className="space-y-1">
              <Label htmlFor="streetAddress">Street Address</Label>
              <Input id="streetAddress" maxLength={INPUT_LENGTH.text} {...register('streetAddress')} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="suburb">Suburb</Label>
                <Input id="suburb" maxLength={INPUT_LENGTH.text} {...register('suburb')} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="city">City</Label>
                <Input id="city" maxLength={INPUT_LENGTH.text} {...register('city')} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="state">State</Label>
                <Input id="state" maxLength={INPUT_LENGTH.text} {...register('state')} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="postcode">Postcode</Label>
                <Input id="postcode" maxLength={INPUT_LENGTH.text} {...register('postcode')} />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="country">Country</Label>
              <Input id="country" maxLength={INPUT_LENGTH.text} {...register('country')} />
            </div>

          </form>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="company-contacts-form" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
