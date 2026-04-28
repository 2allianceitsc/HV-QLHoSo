import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard';
import { UnsavedChangesDialog } from '@/components/UnsavedChangesDialog';
import { Controller, useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { RoleBadge } from '@/components/RoleBadge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useEmployee, useUpdateEmployee, useUpdateRoles, useResetPassword, useEmployee2FAStatus, useAdminRevoke2FA, useAdminSet2FARequired, useEmployeeSessionStatus, useClearSessionBlock } from '@/hooks/useEmployee';
import { usePermission } from '@/hooks/usePermission';
import { useDepartments } from '@/hooks/useDepartment';
import { useOffices } from '@/hooks/useOffice';
import { usePositions } from '@/hooks/usePosition';
import { useTeams } from '@/hooks/useTeam';
import { useCompanies } from '@/hooks/useCompany';
import { useTabState } from '@/hooks/useTabState';
import { ArrowLeft, Edit, Eye, Key, Plus, X, Shield, ShieldOff, ShieldCheck, ShieldAlert, Copy, Check, LockKeyholeOpen, LockKeyhole } from 'lucide-react';
import { apiClient } from '@/lib/axios';
import { useQuery } from '@tanstack/react-query';
import type { IRole, IUpdateEmployeeDto } from '@/api/employee.api';
import { safeArray } from '@/lib/safeArray';
import { getApiErrorMessage } from '@/lib/apiError';
import { EntitySelect } from '@/components/entity/EntitySelect';
import { EntityAvatar } from '@/components/entity/entityVisuals';
import { UserAvatar } from '@/components/UserAvatar';
import { TimezoneSelect } from '@/components/ui/TimezoneSelect';
import { cn } from '@/lib/utils';

type TabId = 'personal' | 'work' | 'roles' | 'hr' | 'security';

function isEmployeeDetailTab(value: unknown): value is TabId {
  return value === 'personal' || value === 'work' || value === 'roles' || value === 'hr' || value === 'security';
}


export function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useTabState<TabId>('personal', isEmployeeDetailTab);
  const [isEditing, setIsEditing] = useState(false);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [resetMode, setResetMode] = useState<'direct' | 'email'>('direct');
  const [newPassword, setNewPassword] = useState('');
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const [copiedGenerated, setCopiedGenerated] = useState(false);

  const { data: employee, isLoading } = useEmployee(id ?? '');
  const updateMutation = useUpdateEmployee();
  const updateRolesMutation = useUpdateRoles();
  const resetPasswordMutation = useResetPassword();
  const { data: twoFAStatus, isLoading: twoFALoading } = useEmployee2FAStatus(id ?? '');
  const revoke2FAMutation = useAdminRevoke2FA(id ?? '');
  const set2FARequiredMutation = useAdminSet2FARequired(id ?? '');
  const { data: sessionStatus } = useEmployeeSessionStatus(id ?? '');
  const clearSessionBlockMutation = useClearSessionBlock(id ?? '');

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

  const { register, handleSubmit, reset, control, watch, setValue, formState: { isDirty } } = useForm<IUpdateEmployeeDto>();
  const { blocker } = useUnsavedChangesGuard(isEditing && isDirty);

  // Tab visibility from the permission matrix — tab code in the DB catalog
  // maps to the FE tab id here. `hr-only` is the DB code; `hr` is the UI key.
  const canViewPersonal = usePermission('E04', 'personal', 'VIEW');
  const canViewWork     = usePermission('E04', 'work',     'VIEW');
  const canViewRoles    = usePermission('E04', 'roles',    'VIEW');
  const canViewHrOnly   = usePermission('E04', 'hr-only',  'VIEW');
  const canViewSecurity = usePermission('E04', 'security', 'VIEW');
  // Write-permission gates for action buttons.
  const canUpdateScreen = usePermission('E04', null, 'UPDATE');
  const canResetPwd     = usePermission('E04', 'security', 'UPDATE');

  const tabs: { id: TabId; label: string; show: boolean }[] = [
    { id: 'personal', label: 'Personal', show: canViewPersonal },
    { id: 'work',     label: 'Work',     show: canViewWork },
    { id: 'roles',    label: 'Roles',    show: canViewRoles },
    { id: 'hr',       label: 'HR Only',  show: canViewHrOnly },
    { id: 'security', label: 'Security', show: canViewSecurity },
  ];
  const visibleTabs = tabs.filter((tab) => tab.show);
  const isActionTab = activeTab === 'roles' || activeTab === 'security';

  useEffect(() => {
    if (visibleTabs.some((tab) => tab.id === activeTab)) return;
    setActiveTab(visibleTabs[0]?.id ?? 'personal');
  }, [activeTab, setActiveTab, visibleTabs]);

  if (isLoading) {
    return <div className="p-6 text-muted-foreground">Loading...</div>;
  }

  if (!employee) {
    return <div className="p-6 text-destructive">Employee not found.</div>;
  }

  const fullName = [employee.firstName, employee.middleName, employee.surname].filter(Boolean).join(' ');

  function handleEditClick() {
    reset({
      firstName: employee!.firstName,
      middleName: employee!.middleName ?? '',
      surname: employee!.surname,
      englishSurname: employee!.englishSurname ?? '',
      mobileNumber: employee!.mobileNumber ?? '',
      dateOfBirth: employee!.dateOfBirth ? employee!.dateOfBirth.split('T')[0] : '',
      homePhoneAreaCode: employee!.homePhoneAreaCode ?? '',
      homePhoneNumber: employee!.homePhoneNumber ?? '',
      favoriteCake: employee!.favoriteCake ?? '',
      employeeId: employee!.employeeId,
      companyId: employee!.companyId ?? '',
      departmentId: employee!.departmentId ?? '',
      officeId: employee!.officeId ?? '',
      positionId: employee!.positionId ?? '',
      teamId: employee!.teamId ?? '',
      shiftStartTime: employee!.shiftStartTime ?? '',
      shiftEndTime: employee!.shiftEndTime ?? '',
      latestStartTime: employee!.latestStartTime ?? '',
      latestEndShiftTime: employee!.latestEndShiftTime ?? '',
      shiftEndDayOffset: employee!.shiftEndDayOffset ?? 0,
      timezone: employee!.timezone ?? '',
      taxIdNumber: employee!.taxIdNumber ?? '',
      sssNumber: employee!.sssNumber ?? '',
      philHealthIdNumber: employee!.philHealthIdNumber ?? '',
      hdmfNumber: employee!.hdmfNumber ?? '',
      nominatedBankName: employee!.nominatedBankName ?? '',
      nominatedBankAccountName: employee!.nominatedBankAccountName ?? '',
      nominatedBankAccountNumber: employee!.nominatedBankAccountNumber ?? '',
    });
    setIsEditing(true);
  }

  async function onSubmit(values: IUpdateEmployeeDto) {
    try {
      await updateMutation.mutateAsync({ id: id!, dto: values });
      toast({ title: 'Employee updated' });
      setIsEditing(false);
    } catch (err: unknown) {
      toast({ title: 'Error', description: getApiErrorMessage(err, 'Update failed'), variant: 'destructive' });
    }
  }

  function handleCancelEdit() {
    if (!isActionTab && isDirty) {
      setShowDiscardDialog(true);
    } else {
      setIsEditing(false);
    }
  }

  async function handleAddRole(roleId: string) {
    const currentIds = employee!.staffRoles.map((sr) => sr.roleId);
    if (currentIds.includes(roleId)) return;
    try {
      await updateRolesMutation.mutateAsync({ id: id!, roleIds: [...currentIds, roleId] });
      toast({ title: 'Role added' });
    } catch (err: unknown) {
      toast({ title: 'Error', description: getApiErrorMessage(err, 'Failed'), variant: 'destructive' });
    }
  }

  async function handleRemoveRole(roleId: string) {
    const newIds = employee!.staffRoles.map((sr) => sr.roleId).filter((rid) => rid !== roleId);
    try {
      await updateRolesMutation.mutateAsync({ id: id!, roleIds: newIds });
      toast({ title: 'Role removed' });
    } catch (err: unknown) {
      toast({ title: 'Error', description: getApiErrorMessage(err, 'Failed'), variant: 'destructive' });
    }
  }

  async function handleResetPassword() {
    try {
      const dto = resetMode === 'direct' ? { newPassword } : {};
      const result = await resetPasswordMutation.mutateAsync({ id: id!, dto });
      if (result.temporaryPassword) {
        await navigator.clipboard.writeText(result.temporaryPassword).catch(() => {});
        setGeneratedPassword(result.temporaryPassword);
        setCopiedGenerated(true);
      } else {
        toast({ title: 'Password updated' });
        setShowResetDialog(false);
        setNewPassword('');
      }
    } catch (err: unknown) {
      toast({ title: 'Error', description: getApiErrorMessage(err, 'Reset failed'), variant: 'destructive' });
    }
  }

  async function handleCopyGeneratedPassword() {
    if (!generatedPassword) return;
    await navigator.clipboard.writeText(generatedPassword).catch(() => {});
    setCopiedGenerated(true);
    setTimeout(() => setCopiedGenerated(false), 2000);
  }

  function handleCloseResetDialog(open: boolean) {
    setShowResetDialog(open);
    if (!open) {
      setNewPassword('');
      setGeneratedPassword(null);
      setCopiedGenerated(false);
    }
  }

  async function handleRevoke2FA() {
    try {
      await revoke2FAMutation.mutateAsync();
      toast({ title: '2FA revoked', description: 'User must set up 2FA again to use it.' });
    } catch (err: unknown) {
      toast({ title: 'Error', description: getApiErrorMessage(err, 'Revoke failed'), variant: 'destructive' });
    }
  }

  async function handleToggle2FARequired(required: boolean) {
    try {
      await set2FARequiredMutation.mutateAsync(required);
      toast({ title: required ? '2FA required' : '2FA no longer required' });
    } catch (err: unknown) {
      toast({ title: 'Error', description: getApiErrorMessage(err, 'Update failed'), variant: 'destructive' });
    }
  }

  async function handleClearSessionBlock() {
    try {
      await clearSessionBlockMutation.mutateAsync();
      toast({ title: 'Session block cleared', description: 'Employee can now log in.' });
    } catch (err: unknown) {
      toast({ title: 'Error', description: getApiErrorMessage(err, 'Clear failed'), variant: 'destructive' });
    }
  }

  return (
    <div className="space-y-6 p-6 max-w-3xl" data-testid="employee-detail-page">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button data-testid="employee-back-btn" variant="ghost" size="sm" onClick={() => navigate('/employees')}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back
        </Button>
      </div>

      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <UserAvatar src={employee.photoBusiness} firstName={employee.firstName} surname={employee.surname} size="xl" />
          <div>
            <h1 className="text-2xl font-bold" data-testid="employee-full-name">{fullName}</h1>
            <p className="text-sm text-muted-foreground" data-testid="employee-id-value">{employee.employeeId}</p>
            <div className="mt-1 flex flex-wrap gap-1">
              {employee.staffRoles.map((sr) => (
                <RoleBadge key={sr.id} roleName={sr.role.name} displayName={sr.role.displayName} colorHex={sr.role.colorHex} iconId={sr.role.iconId} />
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {canResetPwd && (
            <Button
              data-testid="employee-reset-password-btn"
              variant="outline"
              size="sm"
              onClick={() => setShowResetDialog(true)}
            >
              <Key className="mr-1 h-4 w-4" />
              Reset Password
            </Button>
          )}
          {canUpdateScreen && (
            isEditing ? (
              <Button data-testid="employee-cancel-header-btn" size="sm" variant="outline" onClick={handleCancelEdit}>
                <Eye className="mr-1 h-4 w-4" />
                View
              </Button>
            ) : (
              <Button data-testid="employee-edit-btn" size="sm" onClick={handleEditClick}>
                <Edit className="mr-1 h-4 w-4" />
                Edit
              </Button>
            )
          )}
        </div>
      </div>

      {/* Status badge */}
      {employee.isDisabled && (
        <Badge variant="secondary" data-testid="employee-account-disabled-badge">Account Disabled</Badge>
      )}

      {/* Tabs */}
      <div className="border-b" data-testid="employee-tabs">
        <div className="flex gap-1">
          {visibleTabs.map((tab) => (
            <button
              key={tab.id}
              data-testid={`employee-tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content — unified layout: same grid in both view and edit mode */}
      {isActionTab ? (
        <>
          {activeTab === 'roles' && canViewRoles && (
            <div className="space-y-4" data-testid="employee-roles-panel">
              {!isEditing && (
                <p className="text-xs text-muted-foreground">Click Edit to modify roles.</p>
              )}
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Current Roles</p>
                <div className="flex flex-wrap gap-2">
                  {employee.staffRoles.length === 0 && (
                    <span className="text-sm text-muted-foreground">No roles assigned</span>
                  )}
                  {employee.staffRoles.map((sr) => (
                    <div key={sr.id} className="flex items-center gap-1">
                      <RoleBadge roleName={sr.role.name} displayName={sr.role.displayName} colorHex={sr.role.colorHex} iconId={sr.role.iconId} />
                      {isEditing && (
                        <button
                          data-testid={`employee-role-remove-${sr.roleId}`}
                          onClick={() => handleRemoveRole(sr.roleId)}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                          title="Remove role"
                          disabled={updateRolesMutation.isPending}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              {isEditing && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Add Role</p>
                  <div className="flex flex-wrap gap-2">
                    {safeArray(rolesData)
                      .filter((r) => !employee.staffRoles.some((sr) => sr.roleId === r.id))
                      .map((role) => (
                        <button
                          key={role.id}
                          data-testid={`employee-role-add-${role.id}`}
                          onClick={() => handleAddRole(role.id)}
                          className="flex items-center gap-2 rounded-full border border-dashed border-input px-3 py-1.5 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                          disabled={updateRolesMutation.isPending}
                        >
                          <EntityAvatar name={role.displayName ?? role.name} colorHex={role.colorHex} iconId={role.iconId} className="h-6 w-6 border-0" iconClassName="h-3.5 w-3.5" />
                          <Plus className="h-3 w-3" />
                          {role.displayName ?? role.name}
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}
          {activeTab === 'security' && canViewSecurity && (
            <div className="space-y-6" data-testid="employee-security-panel">
              {!isEditing && (
                <p className="text-xs text-muted-foreground">Click Edit to modify security settings.</p>
              )}
              <div>
                <h3 className="text-sm font-semibold mb-4">Two-Factor Authentication</h3>
                {twoFALoading ? (
                  <p className="text-sm text-muted-foreground">Loading...</p>
                ) : (
                  <div className="space-y-4">
                    <div className="rounded-lg border p-4 flex items-start gap-4">
                      <div className="mt-0.5">
                        {twoFAStatus?.enabled
                          ? <ShieldCheck className="h-5 w-5 text-green-500" />
                          : <ShieldOff className="h-5 w-5 text-muted-foreground" />}
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium">
                          {twoFAStatus?.enabled ? '2FA is active' : '2FA is not set up'}
                        </p>
                        {twoFAStatus?.enabled && (
                          <p className="text-xs text-muted-foreground">
                            Method: {twoFAStatus.method === 'Google' ? 'Authenticator App (TOTP)' : 'Email OTP'}
                          </p>
                        )}
                      </div>
                      {twoFAStatus?.enabled && (
                        <Button
                          data-testid="employee-security-revoke-2fa-btn"
                          size="sm"
                          variant="destructive"
                          onClick={handleRevoke2FA}
                          disabled={!isEditing || revoke2FAMutation.isPending}
                        >
                          <ShieldOff className="mr-1 h-3.5 w-3.5" />
                          {revoke2FAMutation.isPending ? 'Revoking...' : 'Revoke 2FA'}
                        </Button>
                      )}
                    </div>
                    <div className="rounded-lg border p-4 flex items-start gap-4">
                      <div className="mt-0.5">
                        {twoFAStatus?.required || twoFAStatus?.systemForced
                          ? <ShieldAlert className="h-5 w-5 text-amber-500" />
                          : <Shield className="h-5 w-5 text-muted-foreground" />}
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium">Require 2FA</p>
                        <p className="text-xs text-muted-foreground">
                          {twoFAStatus?.required
                            ? 'This user is individually required to have 2FA enabled.'
                            : twoFAStatus?.systemForced
                              ? 'Not individually configured — system policy requires 2FA for all users.'
                              : 'Not individually configured — 2FA is optional for this user (follows system policy).'}
                        </p>
                      </div>
                      <Button
                        data-testid="employee-security-require-2fa-btn"
                        size="sm"
                        variant={twoFAStatus?.required ? 'outline' : 'default'}
                        onClick={() => handleToggle2FARequired(!twoFAStatus?.required)}
                        disabled={!isEditing || set2FARequiredMutation.isPending}
                      >
                        {set2FARequiredMutation.isPending
                          ? 'Saving...'
                          : twoFAStatus?.required
                            ? 'Remove Requirement'
                            : 'Require 2FA'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              <div>
                <h3 className="text-sm font-semibold mb-4">Session</h3>
                <div className="rounded-lg border p-4 flex items-start gap-4">
                  <div className="mt-0.5">
                    {sessionStatus?.isBlocked
                      ? <LockKeyhole className="h-5 w-5 text-destructive" />
                      : <LockKeyholeOpen className="h-5 w-5 text-green-500" />}
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium">
                      {sessionStatus?.isBlocked ? 'Session blocked — cannot log in' : 'Session active'}
                    </p>
                    {sessionStatus?.isBlocked && sessionStatus.blockedUntil && (
                      <p className="text-xs text-muted-foreground">
                        Revocation timestamp: {new Date(sessionStatus.blockedUntil).toLocaleString()}
                      </p>
                    )}
                    {!sessionStatus?.isBlocked && (
                      <p className="text-xs text-muted-foreground">No session block in effect.</p>
                    )}
                  </div>
                  {sessionStatus?.isBlocked && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => void handleClearSessionBlock()}
                      disabled={clearSessionBlockMutation.isPending}
                    >
                      <LockKeyholeOpen className="mr-1 h-3.5 w-3.5" />
                      {clearSessionBlockMutation.isPending ? 'Clearing...' : 'Clear Block'}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
          {isEditing && (
            <div className="flex gap-2 pt-2">
              <Button data-testid="employee-action-tab-done-btn" type="button" variant="outline" onClick={() => setIsEditing(false)}>
                Done
              </Button>
            </div>
          )}
        </>
      ) : (
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4"
          data-testid={isEditing ? `employee-edit-form-${activeTab}` : undefined}
        >
          {/* Personal Tab */}
          {activeTab === 'personal' && (
            <div className="grid grid-cols-2 gap-4">
              <EditableField label="First Name" value={employee.firstName} isEditing={isEditing} viewTestId="employee-first-name-value">
                <Input data-testid="employee-first-name-input" {...register('firstName')} />
              </EditableField>
              <EditableField label="Middle Name" value={employee.middleName} isEditing={isEditing} viewTestId="employee-middle-name-value">
                <Input data-testid="employee-middle-name-input" {...register('middleName')} />
              </EditableField>
              <EditableField label="Surname" value={employee.surname} isEditing={isEditing} viewTestId="employee-surname-value">
                <Input data-testid="employee-surname-input" {...register('surname')} />
              </EditableField>
              <EditableField label="Romanised Surname" value={employee.englishSurname} isEditing={isEditing} viewTestId="employee-english-surname-value">
                <Input data-testid="employee-english-surname-input" {...register('englishSurname')} />
              </EditableField>
              <Field label="Email" value={employee.userLogin?.email} testId="employee-email-value" />
              <EditableField label="Mobile" value={employee.mobileNumber} isEditing={isEditing} viewTestId="employee-mobile-value">
                <Input data-testid="employee-mobile-input" {...register('mobileNumber')} />
              </EditableField>
              <EditableField
                label="Date of Birth"
                value={employee.dateOfBirth ? employee.dateOfBirth.split('T')[0] : null}
                isEditing={isEditing}
                viewTestId="employee-dob-value"
              >
                <Input data-testid="employee-dob-input" type="date" {...register('dateOfBirth')} />
              </EditableField>
              {isEditing ? (
                <>
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">Home Phone Area Code</div>
                    <Input data-testid="employee-home-phone-area-input" {...register('homePhoneAreaCode')} />
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">Home Phone Number</div>
                    <Input data-testid="employee-home-phone-number-input" {...register('homePhoneNumber')} />
                  </div>
                </>
              ) : (
                <Field label="Home Phone" value={[employee.homePhoneAreaCode, employee.homePhoneNumber].filter(Boolean).join(' ') || null} testId="employee-home-phone-value" />
              )}
              <Field label="Username" value={employee.userLogin?.username} testId="employee-username-value" />
              <EditableField label="Favorite Cake" value={employee.favoriteCake} isEditing={isEditing} viewTestId="employee-favorite-cake-value">
                <Input data-testid="employee-favorite-cake-input" {...register('favoriteCake')} />
              </EditableField>
            </div>
          )}

          {/* Work Tab */}
          {activeTab === 'work' && (
            <div className="grid grid-cols-2 gap-4">
              <EditableField label="Employee ID" value={employee.employeeId} isEditing={isEditing} viewTestId="employee-work-id-value">
                <Input data-testid="employee-employee-id-input" {...register('employeeId')} />
              </EditableField>
              <EditableField label="Company" value={employee.company?.name} isEditing={isEditing} viewTestId="employee-company-value">
                <Controller
                  control={control}
                  name="companyId"
                  render={({ field }) => (
                    <EntitySelect
                      value={field.value}
                      onValueChange={field.onChange}
                      options={companiesData?.data ?? []}
                      placeholder="Select company"
                      emptyLabel="No company"
                      entityType="COMPANY"
                      triggerClassName="w-full"
                      testId="employee-detail-company-select"
                    />
                  )}
                />
              </EditableField>
              <EditableField label="Department" value={employee.department?.name} isEditing={isEditing} viewTestId="employee-department-value">
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
                      testId="employee-detail-department-select"
                    />
                  )}
                />
              </EditableField>
              <EditableField label="Office" value={employee.office?.name} isEditing={isEditing} viewTestId="employee-office-value">
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
                      testId="employee-detail-office-select"
                    />
                  )}
                />
              </EditableField>
              <EditableField label="Position" value={employee.position?.name} isEditing={isEditing} viewTestId="employee-position-value">
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
                      testId="employee-detail-position-select"
                    />
                  )}
                />
              </EditableField>
              <EditableField label="Team" value={employee.team?.name} isEditing={isEditing} viewTestId="employee-team-value">
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
                      testId="employee-detail-team-select"
                    />
                  )}
                />
              </EditableField>
              <EditableField label="Shift Start" value={employee.shiftStartTime} isEditing={isEditing} viewTestId="employee-shift-start-value">
                <Input data-testid="employee-shift-start-input" type="time" {...register('shiftStartTime')} />
              </EditableField>
              <EditableField label="Shift End" value={employee.shiftEndTime} isEditing={isEditing} viewTestId="employee-shift-end-value">
                <Input data-testid="employee-shift-end-input" type="time" {...register('shiftEndTime')} />
              </EditableField>
              <EditableField label="Latest Start" value={employee.latestStartTime} isEditing={isEditing} viewTestId="employee-latest-start-value">
                <Input data-testid="employee-latest-start-input" type="time" {...register('latestStartTime')} />
              </EditableField>
              <EditableField label="Latest End Shift" value={employee.latestEndShiftTime} isEditing={isEditing} viewTestId="employee-latest-end-shift-value">
                <Input data-testid="employee-latest-end-shift-input" type="time" {...register('latestEndShiftTime')} />
              </EditableField>
              <div className="space-y-1 col-span-2">
                <div className="text-xs text-muted-foreground">Overnight Shift</div>
                {isEditing ? (
                  <label htmlFor="employee-shift-end-day-offset" className="inline-flex items-center gap-2 cursor-pointer text-sm font-medium">
                    <input
                      id="employee-shift-end-day-offset"
                      data-testid="employee-shift-end-day-offset-checkbox"
                      type="checkbox"
                      checked={(watch('shiftEndDayOffset') ?? 0) === 1}
                      onChange={(e) => setValue('shiftEndDayOffset', e.target.checked ? 1 : 0)}
                      className="h-4 w-4"
                    />
                    Ends next day
                  </label>
                ) : (
                  <div className="text-sm font-medium" data-testid="employee-shift-end-day-offset-value">
                    {(employee.shiftEndDayOffset ?? 0) === 1 ? 'Yes' : 'No'}
                  </div>
                )}
              </div>
              <div className="space-y-1 col-span-2">
                <div className="text-xs text-muted-foreground">
                  Timezone{isEditing && <span className="ml-1">(IANA — used for shift &amp; auto-logout)</span>}
                </div>
                {isEditing ? (
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
                ) : (
                  <div className="text-sm font-medium" data-testid="employee-timezone-value">
                    {employee.timezone ?? '—'}
                  </div>
                )}
              </div>
              <Field label="Is Manager" value={employee.isManager ? 'Yes' : 'No'} testId="employee-is-manager-value" />
            </div>
          )}

          {/* HR Only Tab */}
          {activeTab === 'hr' && canViewHrOnly && (
            <div
              className="space-y-6"
              data-testid={isEditing ? 'employee-hr-edit-panel' : 'employee-hr-view-panel'}
            >
              <div>
                <h3 className="text-sm font-semibold mb-3">Government IDs</h3>
                <div className="grid grid-cols-2 gap-4">
                  <EditableField label="Tax ID" value={employee.taxIdNumber} isEditing={isEditing} viewTestId="employee-tax-id-value">
                    <Input data-testid="employee-tax-id-input" {...register('taxIdNumber')} />
                  </EditableField>
                  <EditableField label="SSS Number" value={employee.sssNumber} isEditing={isEditing} viewTestId="employee-sss-number-value">
                    <Input data-testid="employee-sss-number-input" {...register('sssNumber')} />
                  </EditableField>
                  <EditableField label="PhilHealth ID" value={employee.philHealthIdNumber} isEditing={isEditing} viewTestId="employee-philhealth-id-value">
                    <Input data-testid="employee-philhealth-id-input" {...register('philHealthIdNumber')} />
                  </EditableField>
                  <EditableField label="HDMF Number" value={employee.hdmfNumber} isEditing={isEditing} viewTestId="employee-hdmf-number-value">
                    <Input data-testid="employee-hdmf-number-input" {...register('hdmfNumber')} />
                  </EditableField>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold mb-3">Bank Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <EditableField label="Bank Name" value={employee.nominatedBankName} isEditing={isEditing} viewTestId="employee-bank-name-value">
                    <Input data-testid="employee-bank-name-input" {...register('nominatedBankName')} />
                  </EditableField>
                  <EditableField label="Account Name" value={employee.nominatedBankAccountName} isEditing={isEditing} viewTestId="employee-bank-account-name-value">
                    <Input data-testid="employee-bank-account-name-input" {...register('nominatedBankAccountName')} />
                  </EditableField>
                  <EditableField label="Account Number" value={employee.nominatedBankAccountNumber} isEditing={isEditing} viewTestId="employee-bank-account-number-value">
                    <Input data-testid="employee-bank-account-number-input" {...register('nominatedBankAccountNumber')} />
                  </EditableField>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold mb-3">Account</h3>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="First Login" value={employee.userLogin?.isFirstLogin ? 'Yes (password not changed)' : 'No'} testId="employee-first-login-value" />
                  <Field label="Account Status" value={employee.isDisabled ? 'Disabled' : 'Active'} testId="employee-account-status-value" />
                </div>
              </div>
            </div>
          )}

          {/* Save / Cancel */}
          {isEditing && (
            <div className="flex gap-2 pt-2">
              <Button data-testid="employee-cancel-btn" type="button" variant="outline" onClick={handleCancelEdit}>Cancel</Button>
              <Button data-testid="employee-save-btn" type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          )}
        </form>
      )}

      {/* Reset Password Dialog */}
      <Dialog open={showResetDialog} onOpenChange={handleCloseResetDialog}>
        <DialogContent className="sm:max-w-md" data-testid="employee-reset-password-dialog">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-4 px-1" data-testid="employee-reset-password-content">
            {generatedPassword ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Password generated. The employee must change it on first login.
                </p>
                <div className="flex items-center gap-2 rounded-md border bg-muted/50 px-4 py-3">
                  <span
                    data-testid="employee-generated-password-value"
                    className="flex-1 font-mono text-base tracking-widest select-all"
                  >
                    {generatedPassword}
                  </span>
                  <Button
                    data-testid="employee-copy-generated-password-btn"
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={handleCopyGeneratedPassword}
                    className="shrink-0"
                  >
                    {copiedGenerated ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                {copiedGenerated && (
                  <p className="text-xs text-muted-foreground">Copied to clipboard</p>
                )}
              </div>
            ) : (
              <>
                <div className="flex gap-3" data-testid="employee-reset-mode-group">
                  <button
                    data-testid="employee-reset-mode-direct-btn"
                    type="button"
                    onClick={() => setResetMode('direct')}
                    className={`rounded-md border px-4 py-2 text-sm ${resetMode === 'direct' ? 'border-primary bg-primary/5 font-medium' : 'border-input'}`}
                  >
                    Set Password
                  </button>
                  <button
                    data-testid="employee-reset-mode-generate-btn"
                    type="button"
                    onClick={() => setResetMode('email')}
                    className={`rounded-md border px-4 py-2 text-sm ${resetMode === 'email' ? 'border-primary bg-primary/5 font-medium' : 'border-input'}`}
                  >
                    Generate & Copy
                  </button>
                </div>
                {resetMode === 'direct' && (
                  <div className="space-y-1.5">
                    <Label>New Password</Label>
                    <Input
                      data-testid="employee-reset-new-password-input"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min 6 characters"
                    />
                  </div>
                )}
                {resetMode === 'email' && (
                  <p className="text-sm text-muted-foreground">
                    A random password will be generated and displayed. The employee must change it on first login.
                  </p>
                )}
              </>
            )}
          </div>
          <DialogFooter>
            {generatedPassword ? (
              <Button data-testid="employee-reset-done-btn" onClick={() => handleCloseResetDialog(false)}>
                Done
              </Button>
            ) : (
              <>
                <Button data-testid="employee-reset-cancel-btn" variant="outline" onClick={() => handleCloseResetDialog(false)}>
                  Cancel
                </Button>
                <Button
                  data-testid="employee-reset-confirm-btn"
                  onClick={handleResetPassword}
                  disabled={resetPasswordMutation.isPending || (resetMode === 'direct' && newPassword.length < 6)}
                >
                  {resetPasswordMutation.isPending ? 'Resetting...' : 'Reset Password'}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Discard changes confirmation */}
      <Dialog open={showDiscardDialog} onOpenChange={setShowDiscardDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Discard changes?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">You have unsaved changes. Leaving edit mode will discard them.</p>
          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setShowDiscardDialog(false)}>Keep editing</Button>
            <Button variant="destructive" onClick={() => { setShowDiscardDialog(false); setIsEditing(false); }}>Discard</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <UnsavedChangesDialog blocker={blocker} />
    </div>
  );
}

function Field({ label, value, testId }: { label: string; value?: string | null; testId?: string }) {
  return (
    <div className="space-y-1" {...(testId ? { 'data-testid': testId } : {})}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm font-medium">{value ?? '—'}</div>
    </div>
  );
}

function EditableField({
  label,
  value,
  isEditing,
  viewTestId,
  className,
  children,
}: {
  label: string;
  value?: string | null;
  isEditing: boolean;
  viewTestId?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn('space-y-1', className)}
      {...(!isEditing && viewTestId ? { 'data-testid': viewTestId } : {})}
    >
      <div className="text-xs text-muted-foreground">{label}</div>
      {isEditing && children
        ? children
        : <div className="text-sm font-medium">{value ?? '—'}</div>}
    </div>
  );
}
