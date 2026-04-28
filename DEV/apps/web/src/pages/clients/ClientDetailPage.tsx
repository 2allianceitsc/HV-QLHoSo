import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useTabState } from '@/hooks/useTabState';
import { usePermission } from '@/hooks/usePermission';
import { useClient, useUpdateClient } from '@/hooks/useClient';
import { buildErrorToast } from '@/lib/apiError';
import { EntityAvatar } from '@/components/entity/entityVisuals';
import { VisualIdentityFields } from '@/components/entity/VisualIdentityFields';
import { ClientDepartmentsTab } from './tabs/ClientDepartmentsTab';
import { ClientContactsTab } from './tabs/ClientContactsTab';
import { ClientProjectsTab } from './tabs/ClientProjectsTab';
import { ClientEmployeesTab } from './tabs/ClientEmployeesTab';
import { INPUT_LENGTH, INPUT_LENGTH_OVERRIDE } from '@shared/constants/input-length';
import { optionalEmail, optionalText, requiredCode, requiredName } from '@/lib/validation';
import { CharacterCount } from '@/components/form/CharacterCount';

const infoSchema = z.object({
  name: requiredName('Name'),
  code: requiredCode('Code', INPUT_LENGTH_OVERRIDE.clientCode),
  address: optionalText('Address'),
  phone: optionalText('Phone'),
  email: optionalEmail('Email'),
  website: optionalText('Website'),
  colorHex: optionalText('Color hex'),
  iconId: optionalText('Icon'),
  timezone: optionalText('Timezone'),
  defaultStartTime: optionalText('Default start time'),
  defaultEndTime: optionalText('Default end time'),
  country: optionalText('Country'),
});
type InfoFormValues = z.infer<typeof infoSchema>;

type ClientDetailTabId = 'info' | 'departments' | 'projects' | 'contacts' | 'employees';

function isClientDetailTab(value: unknown): value is ClientDetailTabId {
  return (
    value === 'info' ||
    value === 'departments' ||
    value === 'projects' ||
    value === 'contacts' ||
    value === 'employees'
  );
}

export function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [editingInfo, setEditingInfo] = useState(false);
  const [activeTab, setActiveTab] = useTabState<ClientDetailTabId>('info', isClientDetailTab);

  const { data: client, isLoading } = useClient(id ?? '');
  const updateMutation = useUpdateClient();

  // Tab visibility — FE `employees` tab maps to the DB catalog code `staff`.
  // `info` is the screen-level view and is shown to anyone with C02 VIEW.
  const canViewDepartments = usePermission('C02', 'departments', 'VIEW');
  const canViewProjects    = usePermission('C02', 'projects',    'VIEW');
  const canViewContacts    = usePermission('C02', 'contacts',    'VIEW');
  const canViewStaff       = usePermission('C02', 'staff',       'VIEW');
  const canUpdateScreen    = usePermission('C02', null, 'UPDATE');

  // Reset activeTab if it's pointing at a tab the user can't see.
  useEffect(() => {
    const visible: Record<ClientDetailTabId, boolean> = {
      info: true,
      departments: canViewDepartments,
      projects:    canViewProjects,
      contacts:    canViewContacts,
      employees:   canViewStaff,
    };
    if (!visible[activeTab]) setActiveTab('info');
  }, [activeTab, setActiveTab, canViewDepartments, canViewProjects, canViewContacts, canViewStaff]);

  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<InfoFormValues>({
    resolver: zodResolver(infoSchema),
  });

  function handleStartEdit() {
    if (!client) return;
    reset({
      name: client.name,
      code: client.code ?? '',
      address: client.address ?? '',
      phone: client.phone ?? '',
      email: client.email ?? '',
      website: client.website ?? '',
      colorHex: client.colorHex ?? '',
      iconId: client.iconId ?? '',
      timezone: client.timezone ?? '',
      defaultStartTime: client.defaultStartTime ?? '',
      defaultEndTime: client.defaultEndTime ?? '',
      country: client.country ?? '',
    });
    setEditingInfo(true);
  }

  async function onSubmitInfo(values: InfoFormValues) {
    if (!id) return;
    try {
      await updateMutation.mutateAsync({
        id,
        dto: {
          ...values,
          email: values.email || undefined,
          colorHex: values.colorHex || undefined,
          iconId: values.iconId || undefined,
        },
      });
      toast({ title: 'Client updated' });
      setEditingInfo(false);
    } catch (err: unknown) {
      buildErrorToast(toast)(err, 'Failed to update client');
    }
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="p-6">
        <p className="text-destructive">Client not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/clients')}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Clients
        </Button>
        <div className="h-5 w-px bg-border" />
        <div className="flex items-center gap-3">
          <EntityAvatar name={client.name} colorHex={client.colorHex} iconId={client.iconId} className="h-10 w-10" iconClassName="h-5 w-5" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold leading-tight">{client.name}</h1>
              {client.code && (
                <Badge variant="secondary" className="font-mono text-xs">{client.code}</Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {client.country && <span>{client.country}</span>}
              {client.country && client._count && <span>·</span>}
              {client._count && (
                <span>{client._count.clientStaff} staff · {client._count.departments} depts · {client._count.projects} projects</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ClientDetailTabId)}>
        <TabsList>
          <TabsTrigger value="info">Info</TabsTrigger>
          {canViewDepartments && <TabsTrigger value="departments">Departments</TabsTrigger>}
          {canViewProjects && <TabsTrigger value="projects">Projects</TabsTrigger>}
          {canViewContacts && <TabsTrigger value="contacts">Contacts</TabsTrigger>}
          {canViewStaff && <TabsTrigger value="employees">Employees</TabsTrigger>}
        </TabsList>

        {/* Info Tab */}
        <TabsContent value="info" className="pt-4">
          {editingInfo ? (
            <form onSubmit={handleSubmit(onSubmitInfo)} className="max-w-lg space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="name">Name *</Label>
                  <Input id="name" maxLength={INPUT_LENGTH.name} {...register('name')} />
                  <CharacterCount current={watch('name')} max={INPUT_LENGTH.name} />
                  {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="code">Code *</Label>
                  <Input id="code" maxLength={INPUT_LENGTH_OVERRIDE.clientCode} {...register('code')} />
                  <CharacterCount current={watch('code')} max={INPUT_LENGTH_OVERRIDE.clientCode} />
                  {errors.code && <p className="text-xs text-destructive">{errors.code.message}</p>}
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="country">Country</Label>
                <Input id="country" maxLength={INPUT_LENGTH.text} {...register('country')} />
              </div>

              <div className="space-y-1">
                <Label htmlFor="address">Address</Label>
                <Input id="address" maxLength={INPUT_LENGTH.text} {...register('address')} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" maxLength={INPUT_LENGTH.text} {...register('phone')} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" maxLength={INPUT_LENGTH.text} {...register('email')} />
                  {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="website">Website</Label>
                <Input id="website" maxLength={INPUT_LENGTH.text} {...register('website')} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="colorHex">Color (hex)</Label>
                  <Input id="colorHex" maxLength={INPUT_LENGTH.text} placeholder="#ffffff" {...register('colorHex')} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Input id="timezone" maxLength={INPUT_LENGTH.text} {...register('timezone')} />
                </div>
              </div>

              <input type="hidden" {...register('iconId')} />
              <VisualIdentityFields
                previewLabel={watch('name') || 'Client'}
                colorHex={watch('colorHex')}
                iconId={watch('iconId')}
                onColorHexChange={(value) => setValue('colorHex', value, { shouldDirty: true, shouldTouch: true })}
                onIconIdChange={(value) => setValue('iconId', value, { shouldDirty: true, shouldTouch: true })}
                iconChoices={['Handshake', 'Building2', 'Landmark', 'BriefcaseBusiness', 'Users', 'Globe', 'ShieldCheck', 'MapPinned']}
              />

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="defaultStartTime">Default Start</Label>
                  <Input id="defaultStartTime" maxLength={INPUT_LENGTH.text} placeholder="09:00" {...register('defaultStartTime')} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="defaultEndTime">Default End</Label>
                  <Input id="defaultEndTime" maxLength={INPUT_LENGTH.text} placeholder="17:00" {...register('defaultEndTime')} />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setEditingInfo(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <div className="max-w-lg space-y-4">
              <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Name</p>
                  <p className="font-medium">{client.name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Code</p>
                  <p className="font-mono">{client.code ?? '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Country</p>
                  <p>{client.country ?? '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Timezone</p>
                  <p>{client.timezone ?? '—'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground">Address</p>
                  <p>{client.address ?? '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Phone</p>
                  <p>{client.phone ?? '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Email</p>
                  <p>{client.email ?? '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Website</p>
                  <p>{client.website ?? '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Color</p>
                  <div className="flex items-center gap-2">
                    {client.colorHex ? (
                      <>
                        <span
                          className="inline-block h-4 w-4 rounded border border-border"
                          style={{ backgroundColor: client.colorHex }}
                        />
                        <span>{client.colorHex}</span>
                      </>
                    ) : '—'}
                  </div>
                </div>
                <div>
                  <p className="text-muted-foreground">Icon</p>
                  <div className="flex items-center gap-2">
                    <EntityAvatar name={client.name} colorHex={client.colorHex} iconId={client.iconId} className="h-6 w-6" iconClassName="h-3.5 w-3.5" />
                    <span>{client.iconId ?? 'Color only'}</span>
                  </div>
                </div>
                <div>
                  <p className="text-muted-foreground">Default Hours</p>
                  <p>
                    {client.defaultStartTime && client.defaultEndTime
                      ? `${client.defaultStartTime} — ${client.defaultEndTime}`
                      : '—'}
                  </p>
                </div>
              </div>

              {canUpdateScreen && <Button size="sm" onClick={handleStartEdit}>Edit Info</Button>}
            </div>
          )}
        </TabsContent>

        <TabsContent value="departments" className="pt-4">
          <ClientDepartmentsTab clientId={id!} />
        </TabsContent>

        <TabsContent value="projects" className="pt-4">
          <ClientProjectsTab clientId={id!} />
        </TabsContent>

        <TabsContent value="contacts" className="pt-4">
          <ClientContactsTab clientId={id!} />
        </TabsContent>

        <TabsContent value="employees" className="pt-4">
          <ClientEmployeesTab clientId={id!} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
