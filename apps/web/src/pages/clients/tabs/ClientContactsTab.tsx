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
import { useToast } from '@/hooks/use-toast';
import {
  useClientContacts,
  useCreateClientContact,
  useUpdateClientContact,
  useDeleteClientContact,
} from '@/hooks/useClient';
import type { IClientContact } from '@/api/client.api';
import { getApiErrorMessage, buildErrorToast } from '@/lib/apiError';
import { optionalEmail, optionalText, requiredName } from '@/lib/validation';
import { INPUT_LENGTH } from '@shared/constants/input-length';

const schema = z.object({
  firstName: requiredName('First name'),
  surname: requiredName('Surname'),
  emailAddress: optionalEmail('Email address'),
  mobileCountryCode: optionalText('Mobile country code'),
  mobileNumber: optionalText('Mobile number'),
  streetAddress: optionalText('Street address'),
  suburb: optionalText('Suburb'),
  city: optionalText('City'),
  state: optionalText('State'),
  country: optionalText('Country'),
  postcodeZipcode: optionalText('Postcode/zip code'),
});
type FormValues = z.infer<typeof schema>;

function postcodLabel(country?: string | null) {
  if (country?.toUpperCase() === 'US') return 'ZIP Code';
  return 'Postcode';
}

interface Props {
  clientId: string;
}

export function ClientContactsTab({ clientId }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<IClientContact | null>(null);
  const { toast } = useToast();
  const errToast = buildErrorToast(toast);

  const { data = [], isLoading } = useClientContacts(clientId);
  const createMutation = useCreateClientContact(clientId);
  const updateMutation = useUpdateClientContact(clientId);
  const deleteMutation = useDeleteClientContact(clientId);

  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const watchedCountry = watch('country');

  const columns: ColumnDef<IClientContact>[] = [
    {
      id: 'name',
      header: 'Name',
      cell: ({ row }) => `${row.original.firstName} ${row.original.surname}`,
    },
    { accessorKey: 'emailAddress', header: 'Email', cell: ({ row }) => row.original.emailAddress ?? '—' },
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
      id: 'address',
      header: 'Address',
      cell: ({ row }) => {
        const { suburb, city, country, postcodeZipcode } = row.original;
        return [suburb, city, country, postcodeZipcode].filter(Boolean).join(', ') || '—';
      },
    },
  ];

  function handleAdd() {
    setEditTarget(null);
    reset({});
    setDialogOpen(true);
  }

  function handleEdit(row: IClientContact) {
    setEditTarget(row);
    reset({
      firstName: row.firstName,
      surname: row.surname,
      emailAddress: row.emailAddress ?? '',
      mobileCountryCode: row.mobileCountryCode ?? '',
      mobileNumber: row.mobileNumber ?? '',
      streetAddress: row.streetAddress ?? '',
      suburb: row.suburb ?? '',
      city: row.city ?? '',
      state: row.state ?? '',
      country: row.country ?? '',
      postcodeZipcode: row.postcodeZipcode ?? '',
    });
    setDialogOpen(true);
  }

  async function handleDelete(row: IClientContact) {
    try {
      await deleteMutation.mutateAsync(row.id);
      toast({ title: 'Contact deleted' });
    } catch (err: unknown) {
      toast({ title: getApiErrorMessage(err, 'Failed to delete contact'), variant: 'destructive' });
    }
  }

  async function onSubmit(values: FormValues) {
    try {
      if (editTarget) {
        await updateMutation.mutateAsync({ contactId: editTarget.id, dto: values });
        toast({ title: 'Contact updated' });
      } else {
        await createMutation.mutateAsync(values);
        toast({ title: 'Contact created' });
      }
      setDialogOpen(false);
    } catch (err: unknown) {
      errToast(err, editTarget ? 'Failed to update contact' : 'Failed to create contact');
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
        addLabel="Add Contact"
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editTarget ? 'Edit Contact' : 'Add Contact'}</DialogTitle>
          </DialogHeader>
          <form id="client-contacts-form" onSubmit={handleSubmit(onSubmit)} className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="firstName">First Name *</Label>
                <Input id="firstName" maxLength={INPUT_LENGTH.name} {...register('firstName')} />
                {errors.firstName && <p className="text-xs text-destructive">{errors.firstName.message}</p>}
              </div>
              <div className="space-y-1">
                <Label htmlFor="surname">Surname *</Label>
                <Input id="surname" maxLength={INPUT_LENGTH.name} {...register('surname')} />
                {errors.surname && <p className="text-xs text-destructive">{errors.surname.message}</p>}
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="emailAddress">Email</Label>
              <Input id="emailAddress" type="email" maxLength={INPUT_LENGTH.text} {...register('emailAddress')} />
              {errors.emailAddress && <p className="text-xs text-destructive">{errors.emailAddress.message}</p>}
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label htmlFor="mobileCountryCode">Country Code</Label>
                <Input id="mobileCountryCode" maxLength={INPUT_LENGTH.text} placeholder="+61" {...register('mobileCountryCode')} />
              </div>
              <div className="col-span-2 space-y-1">
                <Label htmlFor="mobileNumber">Mobile Number</Label>
                <Input id="mobileNumber" maxLength={INPUT_LENGTH.text} {...register('mobileNumber')} />
              </div>
            </div>

            <div className="border-t pt-4">
              <p className="text-sm font-medium text-muted-foreground mb-3">Address</p>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="streetAddress">Street Address</Label>
                  <Input id="streetAddress" maxLength={INPUT_LENGTH.text} {...register('streetAddress')} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="suburb">Suburb</Label>
                  <Input id="suburb" maxLength={INPUT_LENGTH.text} {...register('suburb')} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="city">City</Label>
                    <Input id="city" maxLength={INPUT_LENGTH.text} {...register('city')} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="state">State</Label>
                    <Input id="state" maxLength={INPUT_LENGTH.text} {...register('state')} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="country">Country</Label>
                    <Input id="country" maxLength={INPUT_LENGTH.text} {...register('country')} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="postcodeZipcode">{postcodLabel(watchedCountry)}</Label>
                    <Input id="postcodeZipcode" maxLength={INPUT_LENGTH.text} {...register('postcodeZipcode')} />
                  </div>
                </div>
              </div>
            </div>

          </form>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button type="submit" form="client-contacts-form" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
