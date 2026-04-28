import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useCreateEmployee } from '@/hooks/useEmployee';
import { useCompanies } from '@/hooks/useCompany';
import { useDepartments } from '@/hooks/useDepartment';
import { useOffices } from '@/hooks/useOffice';
import { usePositions } from '@/hooks/usePosition';
import { useTeams } from '@/hooks/useTeam';
import { ArrowLeft } from 'lucide-react';
import { TimezoneSelect } from '@/components/ui/TimezoneSelect';
import { apiClient } from '@/lib/axios';
import { getApiErrorMessage } from '@/lib/apiError';
import { useQuery } from '@tanstack/react-query';
import type { IRole } from '@/api/employee.api';
import { safeArray } from '@/lib/safeArray';
import { EntitySelect } from '@/components/entity/EntitySelect';
import { EntityAvatar } from '@/components/entity/entityVisuals';
import { INPUT_LENGTH, INPUT_LENGTH_OVERRIDE } from '@shared/constants/input-length';
import { optionalText, requiredName, requiredText } from '@/lib/validation';
import { CharacterCount } from '@/components/form/CharacterCount';

const schema = z.object({
  email: z.string().email('Invalid email'),
  firstName: requiredName('First name'),
  middleName: optionalText('Middle name', INPUT_LENGTH.name),
  surname: requiredName('Surname'),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  companyId: requiredText('Company'),
  employeeId: optionalText('Employee ID', INPUT_LENGTH_OVERRIDE.employeeId),
  departmentId: optionalText('Department'),
  officeId: optionalText('Office'),
  positionId: optionalText('Position'),
  teamId: optionalText('Team'),
  mobileNumber: optionalText('Mobile number'),
  shiftStartTime: optionalText('Shift start time'),
  shiftEndTime: optionalText('Shift end time'),
  latestStartTime: optionalText('Latest start time'),
  latestEndShiftTime: optionalText('Latest end shift time'),
  shiftEndDayOffset: z.number().int().min(0).max(1).optional(),
  timezone: optionalText('Timezone'),
});

type FormValues = z.infer<typeof schema>;

export function AddEmployeePage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);

  const createMutation = useCreateEmployee();
  const { data: companiesData } = useCompanies({ limit: 100 });
  const { data: deptData } = useDepartments({ limit: 100 });
  const { data: officesData } = useOffices({ limit: 100 });
  const { data: positionsData } = usePositions({ limit: 100 });
  const { data: teamsData } = useTeams({ limit: 100 });
  const { data: rolesData } = useQuery<IRole[]>({
    queryKey: ['roles-meta'],
    queryFn: async () => {
      const res = await apiClient.get('/employees/meta/roles');
      return res.data.data ?? res.data;
    },
  });

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      shiftEndDayOffset: 0,
    },
  });

  const watchedCompanyId = useWatch({ control, name: 'companyId' });

  // Auto-fill timezone from company's defaultTimezone when company changes
  useEffect(() => {
    if (!watchedCompanyId || !companiesData?.data) return;
    const company = companiesData.data.find((c) => c.id === watchedCompanyId);
    if (company?.defaultTimezone) {
      setValue('timezone', company.defaultTimezone, { shouldDirty: false });
    }
  }, [watchedCompanyId, companiesData?.data, setValue]);

  function handleToggleRole(roleId: string) {
    setSelectedRoleIds((prev) =>
      prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId],
    );
  }

  async function onSubmit(values: FormValues) {
    try {
      // Strip empty strings for optional FK fields to avoid FK constraint violations
      const payload = {
        ...values,
        employeeId: values.employeeId || undefined,
        departmentId: values.departmentId || undefined,
        officeId: values.officeId || undefined,
        positionId: values.positionId || undefined,
        teamId: values.teamId || undefined,
        shiftEndDayOffset: values.shiftEndDayOffset ?? 0,
        roleIds: selectedRoleIds,
      };
      const created = await createMutation.mutateAsync(payload);
      toast({ title: 'Employee created', description: 'Username auto-generated and sent via welcome notification.' });
      navigate(`/employees/${created.id}`);
    } catch (err: unknown) {
      const msg = getApiErrorMessage(err, 'Failed to create employee');
      if (msg === 'Email already exists') {
        setError('email', { message: 'This email is already registered' });
        toast({ title: 'Email already taken', variant: 'destructive' });
      } else if (msg === 'Employee ID already exists') {
        setError('employeeId', { message: 'This Employee ID is already in use' });
        toast({ title: 'Employee ID already in use', variant: 'destructive' });
      } else {
        toast({ title: 'Failed to create employee', description: msg, variant: 'destructive' });
      }
    }
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/employees')}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Add Employee</h1>
          <p className="text-sm text-muted-foreground">Create a new employee account</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Account section */}
        <section className="space-y-4">
          <h2 className="text-base font-semibold border-b pb-2">Account</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Email *</Label>
              <Input id="emp-email" type="email" maxLength={INPUT_LENGTH.text} {...register('email')} />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
            <div className="rounded-md bg-muted px-4 py-3 text-sm text-muted-foreground md:self-end">
              Username and password are auto-generated and sent to the employee via welcome notification.
            </div>
          </div>
        </section>

        {/* Personal section */}
        <section className="space-y-4">
          <h2 className="text-base font-semibold border-b pb-2">Personal Info</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>First Name *</Label>
              <Input id="emp-first-name" maxLength={INPUT_LENGTH.name} {...register('firstName')} />
              <CharacterCount current={watch('firstName')} max={INPUT_LENGTH.name} />
              {errors.firstName && <p className="text-xs text-destructive">{errors.firstName.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Middle Name</Label>
              <Input id="emp-middle-name" maxLength={INPUT_LENGTH.name} {...register('middleName')} />
            </div>
            <div className="space-y-1">
              <Label>Surname *</Label>
              <Input id="emp-surname" maxLength={INPUT_LENGTH.name} {...register('surname')} />
              <CharacterCount current={watch('surname')} max={INPUT_LENGTH.name} />
              {errors.surname && <p className="text-xs text-destructive">{errors.surname.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Date of Birth *</Label>
              <Input id="emp-date-of-birth" type="date" min="1900-01-01" max="9999-12-31" {...register('dateOfBirth')} />
              {errors.dateOfBirth && <p className="text-xs text-destructive">{errors.dateOfBirth.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Mobile Number</Label>
              <Input id="emp-mobile-number" maxLength={INPUT_LENGTH.text} {...register('mobileNumber')} />
            </div>
          </div>
        </section>

        {/* Work section */}
        <section className="space-y-4">
          <h2 className="text-base font-semibold border-b pb-2">Work Info</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Employee ID</Label>
              <Input id="emp-employee-id" maxLength={INPUT_LENGTH_OVERRIDE.employeeId} {...register('employeeId')} placeholder="Auto-generated if empty" />
              <CharacterCount current={watch('employeeId')} max={INPUT_LENGTH_OVERRIDE.employeeId} />
            </div>
            <div className="space-y-1">
              <Label>Company *</Label>
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
                    triggerClassName="w-full"
                    testId="employee-company-select"
                  />
                )}
              />
              {errors.companyId && <p className="text-xs text-destructive">{errors.companyId.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Department</Label>
              <Controller
                control={control}
                name="departmentId"
                render={({ field }) => (
                  <EntitySelect
                    value={field.value}
                    onValueChange={field.onChange}
                    options={deptData?.data ?? []}
                    placeholder="Select department"
                    emptyLabel="No department"
                    entityType="DEPARTMENT"
                    triggerClassName="w-full"
                    testId="employee-department-select"
                  />
                )}
              />
            </div>
            <div className="space-y-1">
              <Label>Office</Label>
              <Controller
                control={control}
                name="officeId"
                render={({ field }) => (
                  <EntitySelect
                    value={field.value}
                    onValueChange={field.onChange}
                    options={officesData?.data ?? []}
                    placeholder="Select office"
                    emptyLabel="No office"
                    entityType="OFFICE"
                    triggerClassName="w-full"
                    testId="employee-office-select"
                  />
                )}
              />
            </div>
            <div className="space-y-1">
              <Label>Position</Label>
              <Controller
                control={control}
                name="positionId"
                render={({ field }) => (
                  <EntitySelect
                    value={field.value}
                    onValueChange={field.onChange}
                    options={positionsData?.data ?? []}
                    placeholder="Select position"
                    emptyLabel="No position"
                    entityType="POSITION"
                    triggerClassName="w-full"
                    testId="employee-position-select"
                  />
                )}
              />
            </div>
            <div className="space-y-1">
              <Label>Team</Label>
              <Controller
                control={control}
                name="teamId"
                render={({ field }) => (
                  <EntitySelect
                    value={field.value}
                    onValueChange={field.onChange}
                    options={teamsData?.data ?? []}
                    placeholder="Select team"
                    emptyLabel="No team"
                    entityType="TEAM"
                    triggerClassName="w-full"
                    testId="employee-team-select"
                  />
                )}
              />
            </div>
            <div className="space-y-1">
              <Label>Shift Start</Label>
              <Input id="emp-shift-start-time" type="time" maxLength={INPUT_LENGTH.text} {...register('shiftStartTime')} />
            </div>
            <div className="space-y-1">
              <Label>Shift End</Label>
              <Input id="emp-shift-end-time" type="time" maxLength={INPUT_LENGTH.text} {...register('shiftEndTime')} />
            </div>
            <div className="space-y-1">
              <Label>Latest Start</Label>
              <Input id="emp-latest-start-time" type="time" maxLength={INPUT_LENGTH.text} {...register('latestStartTime')} />
            </div>
            <div className="space-y-1">
              <Label>Latest End Shift</Label>
              <Input id="emp-latest-end-shift-time" type="time" maxLength={INPUT_LENGTH.text} {...register('latestEndShiftTime')} />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label htmlFor="emp-shift-end-day-offset" className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  id="emp-shift-end-day-offset"
                  type="checkbox"
                  checked={(watch('shiftEndDayOffset') ?? 0) === 1}
                  onChange={(e) => setValue('shiftEndDayOffset', e.target.checked ? 1 : 0)}
                  className="h-4 w-4"
                />
                Overnight Shift (ends next day)
              </Label>
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>Timezone</Label>
              <p className="text-xs text-muted-foreground mb-1">Auto-filled from company default — override if needed.</p>
              <Controller
                control={control}
                name="timezone"
                render={({ field }) => (
                  <TimezoneSelect
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Select timezone…"
                  />
                )}
              />
            </div>
          </div>
        </section>

        {/* Roles section */}
        <section className="space-y-4">
          <h2 className="text-base font-semibold border-b pb-2">Roles</h2>
          <div className="flex flex-wrap gap-2">
            {safeArray(rolesData).map((role) => {
              const isSelected = selectedRoleIds.includes(role.id);
              return (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => handleToggleRole(role.id)}
                  className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                    isSelected
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'bg-background text-foreground border-input hover:border-primary'
                  }`}
                >
                  <EntityAvatar name={role.displayName ?? role.name} colorHex={role.colorHex} iconId={role.iconId} className="h-6 w-6" iconClassName="h-3.5 w-3.5" />
                  {role.displayName ?? role.name}
                </button>
              );
            })}
          </div>
        </section>

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" onClick={() => navigate('/employees')}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create Employee'}
          </Button>
        </div>
      </form>
    </div>
  );
}
