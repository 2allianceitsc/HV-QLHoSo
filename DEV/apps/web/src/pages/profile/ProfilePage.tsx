import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard';
import { UnsavedChangesDialog } from '@/components/UnsavedChangesDialog';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Camera, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/UserAvatar';
import { AvatarUploadDialog } from '@/components/AvatarUploadDialog';
import { useProfile, useUpdateProfile, useUploadBirthdayPhoto, useUpdateWidgetSettings } from '@/hooks/useProfile';
import { useAuthStore } from '@/stores/auth.store';
import { TwoFASection } from './TwoFASection';
import { INPUT_LENGTH } from '@shared/constants/input-length';
import { optionalText, requiredName, optionalEmail, optionalPhone, optionalDateOfBirth, optionalNonNegativeInt } from '@/lib/validation';
import { CharacterCount } from '@/components/form/CharacterCount';

const personalSchema = z.object({
  firstName: requiredName('First name'),
  middleName: optionalText('Middle name', INPUT_LENGTH.name),
  surname: requiredName('Last name'),
  mobileNumber: optionalPhone('Phone number'),
  dateOfBirth: optionalDateOfBirth(),
  gender: optionalText('Gender'),
  presentAddress: optionalText('Present address'),
  permanentAddress: optionalText('Permanent address'),
  personalEmailAddress: optionalEmail('Personal email address'),
  cityOfBirth: optionalText('City of birth'),
  countryOfBirth: optionalText('Country of birth'),
  maritalStatus: optionalText('Marital status'),
  firstNameOfSpouse: optionalText('First name of spouse', INPUT_LENGTH.name),
  middleNameOfSpouse: optionalText('Middle name of spouse', INPUT_LENGTH.name),
  surnameOfSpouse: optionalText('Surname of spouse', INPUT_LENGTH.name),
  numberOfChildren: optionalNonNegativeInt('Number of children'),
  emergencyContactFullName: optionalText('Emergency contact full name'),
  relationshipToYou: optionalText('Relationship to you'),
  emergencyContactAreaCode: optionalText('Emergency contact area code'),
  emergencyContactNumber: optionalPhone('Emergency contact number'),
});

type IPersonalForm = z.infer<typeof personalSchema>;

const genderOptions = [
  { value: '', label: '-- Select --' },
  { value: '1', label: 'Male' },
  { value: '2', label: 'Female' },
  { value: '0', label: 'Other' },
];

const maritalStatusOptions = [
  { value: '', label: '-- Select --' },
  { value: '1', label: 'Single' },
  { value: '2', label: 'Married' },
  { value: '3', label: 'Divorced' },
  { value: '4', label: 'Widowed' },
  { value: '5', label: 'Other' },
];

export function ProfilePage() {
  const [isAvatarOpen, setIsAvatarOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [birthdayPhotoError, setBirthdayPhotoError] = useState<string | null>(null);
  const birthdayFileRef = useRef<HTMLInputElement>(null);

  const { data: profile, isLoading } = useProfile();
  const { mutateAsync: updateProfile } = useUpdateProfile();
  const { mutateAsync: uploadBirthdayPhoto, isPending: isBirthdayUploading } = useUploadBirthdayPhoto();
  const { mutate: updateWidgetSettings } = useUpdateWidgetSettings();
  const user = useAuthStore((s) => s.user);
  const isEmployee = (user?.roles ?? []).includes('EMPLOYEE');

  const handleBirthdayPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setBirthdayPhotoError('Only jpeg, png, webp images are accepted');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setBirthdayPhotoError('Image size must not exceed 2MB');
      return;
    }
    setBirthdayPhotoError(null);
    try {
      await uploadBirthdayPhoto(file);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setBirthdayPhotoError(axiosErr?.response?.data?.message ?? 'Unable to upload. Please try again.');
    }
    // Reset input so same file can be re-selected
    e.target.value = '';
  };

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<IPersonalForm>({
    resolver: zodResolver(personalSchema),
    values: {
      firstName: profile?.firstName ?? '',
      middleName: profile?.middleName ?? '',
      surname: profile?.surname ?? '',
      mobileNumber: profile?.mobileNumber ?? '',
      dateOfBirth: profile?.dateOfBirth ? profile.dateOfBirth.split('T')[0] : '',
      gender: profile?.gender !== null && profile?.gender !== undefined
        ? String(profile.gender)
        : '',
      presentAddress: profile?.presentAddress ?? '',
      permanentAddress: profile?.permanentAddress ?? '',
      personalEmailAddress: profile?.personalEmailAddress ?? '',
      cityOfBirth: profile?.cityOfBirth ?? '',
      countryOfBirth: profile?.countryOfBirth ?? '',
      maritalStatus: profile?.maritalStatus !== null && profile?.maritalStatus !== undefined
        ? String(profile.maritalStatus)
        : '',
      firstNameOfSpouse: profile?.firstNameOfSpouse ?? '',
      middleNameOfSpouse: profile?.middleNameOfSpouse ?? '',
      surnameOfSpouse: profile?.surnameOfSpouse ?? '',
      numberOfChildren: profile?.numberOfChildren !== null && profile?.numberOfChildren !== undefined
        ? String(profile.numberOfChildren)
        : '',
      emergencyContactFullName: profile?.emergencyContactFullName ?? '',
      relationshipToYou: profile?.relationshipToYou ?? '',
      emergencyContactAreaCode: profile?.emergencyContactAreaCode ?? '',
      emergencyContactNumber: profile?.emergencyContactNumber ?? '',
    },
  });

  const { blocker } = useUnsavedChangesGuard(isDirty);

  const handleSave = async (data: IPersonalForm) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await updateProfile({
        firstName: data.firstName,
        middleName: data.middleName || undefined,
        surname: data.surname,
        mobileNumber: data.mobileNumber || undefined,
        dateOfBirth: data.dateOfBirth || undefined,
        gender: data.gender !== '' && data.gender !== undefined ? Number(data.gender) : undefined,
        presentAddress: data.presentAddress || undefined,
        permanentAddress: data.permanentAddress || undefined,
        personalEmailAddress: data.personalEmailAddress || undefined,
        cityOfBirth: data.cityOfBirth || undefined,
        countryOfBirth: data.countryOfBirth || undefined,
        maritalStatus: data.maritalStatus !== '' && data.maritalStatus !== undefined ? Number(data.maritalStatus) : undefined,
        firstNameOfSpouse: data.firstNameOfSpouse || undefined,
        middleNameOfSpouse: data.middleNameOfSpouse || undefined,
        surnameOfSpouse: data.surnameOfSpouse || undefined,
        numberOfChildren: data.numberOfChildren !== '' && data.numberOfChildren !== undefined ? Number(data.numberOfChildren) : undefined,
        emergencyContactFullName: data.emergencyContactFullName || undefined,
        relationshipToYou: data.relationshipToYou || undefined,
        emergencyContactAreaCode: data.emergencyContactAreaCode || undefined,
        emergencyContactNumber: data.emergencyContactNumber || undefined,
      });
      setSuccessMsg('Information updated successfully.');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setErrorMsg(axiosErr?.response?.data?.message ?? 'Unable to update. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const avatarUrl = user?.photoBusiness ?? profile?.photoBusiness ?? null;
  const firstName = profile?.firstName ?? '';
  const surname = profile?.surname ?? '';
  const fullName = [profile?.firstName, profile?.middleName, profile?.surname]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header card */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-5">
          <div className="relative group">
            <UserAvatar src={avatarUrl} firstName={firstName || 'U'} surname={surname || 'N'} size="lg" />
            <button
              onClick={() => setIsAvatarOpen(true)}
              className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Change photo"
            >
              <Camera className="h-6 w-6 text-white" />
            </button>
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">{fullName || 'No name set'}</h1>
            {profile?.employeeId && (
              <p className="text-sm text-muted-foreground">{profile.employeeId}</p>
            )}
            {profile?.position && (
              <p className="text-sm text-muted-foreground">{profile.position.name}</p>
            )}
            <button
              type="button"
              onClick={() => setIsAvatarOpen(true)}
              className="mt-2 text-sm text-primary hover:underline flex items-center gap-1"
            >
              <Camera className="h-3.5 w-3.5" />
              Change photo
            </button>
          </div>
        </div>
      </div>

      {/* Personal Information */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          Personal Information
        </h2>

        <form onSubmit={handleSubmit(handleSave)} noValidate>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">First Name</label>
              <input
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
                maxLength={INPUT_LENGTH.name}
                {...register('firstName')}
              />
              <CharacterCount current={watch('firstName')} max={INPUT_LENGTH.name} />
              {errors.firstName && (
                <p className="mt-1 text-xs text-destructive">{errors.firstName.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Last Name</label>
              <input
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
                maxLength={INPUT_LENGTH.name}
                {...register('surname')}
              />
              <CharacterCount current={watch('surname')} max={INPUT_LENGTH.name} />
              {errors.surname && (
                <p className="mt-1 text-xs text-destructive">{errors.surname.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Middle Name</label>
              <input
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
                maxLength={INPUT_LENGTH.name}
                {...register('middleName')}
              />
              <CharacterCount current={watch('middleName')} max={INPUT_LENGTH.name} />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Phone Number</label>
              <input
                type="tel"
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
                maxLength={20}
                {...register('mobileNumber')}
              />
              {errors.mobileNumber && (
                <p className="mt-1 text-xs text-destructive">{errors.mobileNumber.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Date of Birth</label>
              <input
                type="date"
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
                min="1900-01-01"
                max={(() => { const d = new Date(); d.setFullYear(d.getFullYear() - 18); return d.toISOString().split('T')[0]; })()}
                {...register('dateOfBirth')}
              />
              {errors.dateOfBirth && (
                <p className="mt-1 text-xs text-destructive">{errors.dateOfBirth.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Gender</label>
              <select
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
                {...register('gender')}
              >
                {genderOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end mt-5">
            <div className="flex flex-col items-end gap-1">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save Changes
              </Button>
              {successMsg && <p className="text-xs text-green-600">{successMsg}</p>}
              {errorMsg && <p className="text-xs text-destructive">{errorMsg}</p>}
            </div>
          </div>
        </form>
      </div>

      {/* Extended Personal Information */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          Extended Personal Information
        </h2>

        {/* Addresses & Identity */}
        <div className="mb-6">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Addresses &amp; Identity
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-foreground mb-1.5">Present Address</label>
              <textarea
                rows={2}
                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 resize-none"
                maxLength={INPUT_LENGTH.text}
                {...register('presentAddress')}
              />
              <CharacterCount current={watch('presentAddress')} max={INPUT_LENGTH.text} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-foreground mb-1.5">Permanent Address</label>
              <textarea
                rows={2}
                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 resize-none"
                maxLength={INPUT_LENGTH.text}
                {...register('permanentAddress')}
              />
              <CharacterCount current={watch('permanentAddress')} max={INPUT_LENGTH.text} />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Personal Email Address</label>
              <input
                type="email"
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
                maxLength={INPUT_LENGTH.text}
                {...register('personalEmailAddress')}
              />
              <CharacterCount current={watch('personalEmailAddress')} max={INPUT_LENGTH.text} />
              {errors.personalEmailAddress && (
                <p className="mt-1 text-xs text-destructive">{errors.personalEmailAddress.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">City of Birth</label>
              <input
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
                maxLength={INPUT_LENGTH.text}
                {...register('cityOfBirth')}
              />
              <CharacterCount current={watch('cityOfBirth')} max={INPUT_LENGTH.text} />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Country of Birth</label>
              <input
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
                maxLength={INPUT_LENGTH.text}
                {...register('countryOfBirth')}
              />
              <CharacterCount current={watch('countryOfBirth')} max={INPUT_LENGTH.text} />
            </div>
          </div>
        </div>

        <hr className="border-border mb-6" />

        {/* Family */}
        <div className="mb-6">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Family
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Marital Status</label>
              <select
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
                {...register('maritalStatus')}
              >
                {maritalStatusOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Number of Children</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
                {...register('numberOfChildren')}
                onChange={(e) => {
                  e.target.value = e.target.value.replace(/[^0-9]/g, '');
                  setValue('numberOfChildren', e.target.value, { shouldValidate: true });
                }}
              />
              {errors.numberOfChildren && (
                <p className="mt-1 text-xs text-destructive">{errors.numberOfChildren.message}</p>
              )}
            </div>
            {watch('maritalStatus') === '2' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Spouse First Name</label>
                  <input
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
                    maxLength={INPUT_LENGTH.name}
                    {...register('firstNameOfSpouse')}
                  />
                  <CharacterCount current={watch('firstNameOfSpouse')} max={INPUT_LENGTH.name} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Spouse Middle Name</label>
                  <input
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
                    maxLength={INPUT_LENGTH.name}
                    {...register('middleNameOfSpouse')}
                  />
                  <CharacterCount current={watch('middleNameOfSpouse')} max={INPUT_LENGTH.name} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Spouse Surname</label>
                  <input
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
                    maxLength={INPUT_LENGTH.name}
                    {...register('surnameOfSpouse')}
                  />
                  <CharacterCount current={watch('surnameOfSpouse')} max={INPUT_LENGTH.name} />
                </div>
              </>
            )}
          </div>
        </div>

        <hr className="border-border mb-6" />

        {/* Emergency Contact */}
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Emergency Contact
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Full Name</label>
              <input
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
                maxLength={INPUT_LENGTH.text}
                {...register('emergencyContactFullName')}
              />
              <CharacterCount current={watch('emergencyContactFullName')} max={INPUT_LENGTH.text} />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Relationship to You</label>
              <input
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
                maxLength={INPUT_LENGTH.text}
                {...register('relationshipToYou')}
              />
              <CharacterCount current={watch('relationshipToYou')} max={INPUT_LENGTH.text} />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Area Code</label>
              <input
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
                maxLength={INPUT_LENGTH.text}
                {...register('emergencyContactAreaCode')}
              />
              <CharacterCount current={watch('emergencyContactAreaCode')} max={INPUT_LENGTH.text} />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Phone Number</label>
              <input
                type="tel"
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
                maxLength={20}
                {...register('emergencyContactNumber')}
              />
              {errors.emergencyContactNumber && (
                <p className="mt-1 text-xs text-destructive">{errors.emergencyContactNumber.message}</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end mt-5">
          <div className="flex flex-col items-end gap-1">
            <Button
              type="button"
              disabled={isSubmitting}
              onClick={() => void handleSubmit(handleSave)()}
            >
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save Changes
            </Button>
            {successMsg && <p className="text-xs text-green-600">{successMsg}</p>}
            {errorMsg && <p className="text-xs text-destructive">{errorMsg}</p>}
          </div>
        </div>
      </div>

      {/* Birthday Photo */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          Birthday Photo
        </h2>
        <div className="flex items-center gap-5">
          {profile?.photoBirthday ? (
            <img
              src={profile.photoBirthday}
              alt="Birthday photo"
              className="h-24 w-24 rounded-lg object-cover border border-border flex-shrink-0"
            />
          ) : (
            <div className="h-24 w-24 rounded-lg border-2 border-dashed border-border flex items-center justify-center flex-shrink-0 bg-muted/30">
              <Camera className="h-8 w-8 text-muted-foreground" />
            </div>
          )}
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Upload a birthday photo that will be displayed on your special day.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isBirthdayUploading}
              onClick={() => birthdayFileRef.current?.click()}
            >
              {isBirthdayUploading
                ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                : <Upload className="mr-2 h-4 w-4" />}
              {profile?.photoBirthday ? 'Change Photo' : 'Upload Photo'}
            </Button>
            {birthdayPhotoError && (
              <p className="text-xs text-destructive">{birthdayPhotoError}</p>
            )}
            <input
              ref={birthdayFileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => void handleBirthdayPhotoChange(e)}
              className="hidden"
            />
          </div>
        </div>
      </div>

      {/* Work Information (read-only) */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          Work Information
        </h2>

        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
          <WorkField label="Employee ID" value={profile?.employeeId} />
          <WorkField label="Company" value={profile?.company.name} />
          <WorkField label="Department" value={profile?.department?.name} />
          <WorkField label="Office" value={profile?.office?.name} />
          <WorkField label="Position" value={profile?.position?.name} />
          <WorkField label="Team" value={profile?.team?.name} />
          {profile?.userLogin?.username && (
            <WorkField label="Username" value={profile.userLogin.username} />
          )}
          {profile?.userLogin?.lastLogin && (
            <WorkField
              label="Last Login"
              value={new Date(profile.userLogin.lastLogin).toLocaleString('en-US')}
            />
          )}
        </dl>

        {profile?.roles && profile.roles.length > 0 && (
          <div className="mt-4">
            <dt className="text-sm text-muted-foreground mb-1.5">Roles</dt>
            <dd className="flex flex-wrap gap-1.5">
              {profile.roles.map((role) => (
                <span
                  key={role}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary"
                >
                  {role}
                </span>
              ))}
            </dd>
          </div>
        )}
      </div>

      <TwoFASection />

      {isEmployee && (
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-base font-semibold text-foreground mb-4">Preferences</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Show quick status switcher</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Floating widget to change status without navigating to the dashboard
              </p>
            </div>
            <button
              role="switch"
              aria-checked={profile?.showFloatingWidget ?? true}
              onClick={() =>
                updateWidgetSettings({ showFloatingWidget: !(profile?.showFloatingWidget ?? true) })
              }
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
                ${(profile?.showFloatingWidget ?? true) ? 'bg-primary' : 'bg-input'}`}
            >
              <span
                className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform
                  ${(profile?.showFloatingWidget ?? true) ? 'translate-x-5' : 'translate-x-0'}`}
              />
            </button>
          </div>
        </div>
      )}

      <AvatarUploadDialog
        isOpen={isAvatarOpen}
        onClose={() => setIsAvatarOpen(false)}
        currentAvatarUrl={avatarUrl}
        firstName={firstName || 'U'}
        surname={surname || 'N'}
      />

      <UnsavedChangesDialog blocker={blocker} />
    </div>
  );
}

function WorkField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium text-foreground mt-0.5">{value ?? '—'}</dd>
    </div>
  );
}
