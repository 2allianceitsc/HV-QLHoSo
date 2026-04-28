import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/UserAvatar';
import { AvatarUploadDialog } from '@/components/AvatarUploadDialog';
import { FormTextField } from '@/components/form/FormTextField';
import { useUpdateProfile, useProfile } from '@/hooks/useProfile';
import { useAuthStore } from '@/stores/auth.store';
import { INPUT_LENGTH } from '@shared/constants/input-length';
import { optionalText, requiredName } from '@/lib/validation';

const editProfileSchema = z.object({
  firstName: requiredName('First name'),
  surname: requiredName('Last name'),
  mobileNumber: optionalText('Phone number'),
});

type IEditProfileForm = z.infer<typeof editProfileSchema>;

interface IEditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function EditProfileModal({ isOpen, onClose }: IEditProfileModalProps) {
  const [isAvatarOpen, setIsAvatarOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const user = useAuthStore((s) => s.user);
  const { data: profile } = useProfile();
  const { mutateAsync: updateProfile } = useUpdateProfile();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<IEditProfileForm>({
    resolver: zodResolver(editProfileSchema),
    values: {
      firstName: profile?.firstName ?? user?.fullName?.split(' ')[0] ?? '',
      surname: profile?.surname ?? '',
      mobileNumber: profile?.mobileNumber ?? '',
    },
  });

  const handleClose = () => {
    reset();
    setSuccessMessage(null);
    setErrorMessage(null);
    onClose();
  };

  const handleSave = async (data: IEditProfileForm) => {
    setErrorMessage(null);
    try {
      await updateProfile({
        firstName: data.firstName,
        surname: data.surname,
        mobileNumber: data.mobileNumber,
      });
      setSuccessMessage('Profile updated successfully.');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setErrorMessage(axiosErr?.response?.data?.message ?? 'Unable to update profile. Please try again.');
    }
  };

  if (!isOpen) return null;

  const firstName = profile?.firstName ?? '';
  const surname = profile?.surname ?? '';
  const avatarUrl = user?.photoBusiness ?? profile?.photoBusiness ?? null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/50" onClick={handleClose} />
        <div className="relative z-10 w-full max-w-md mx-4 bg-card rounded-xl shadow-xl border border-border flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="shrink-0 flex items-center justify-between px-6 pt-6 pb-4">
            <h2 className="text-lg font-semibold text-foreground">Edit Profile</h2>
            <button
              onClick={handleClose}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Scrollable content + form */}
          <form
            id="edit-profile-form"
            onSubmit={handleSubmit(handleSave)}
            noValidate
            className="flex flex-col flex-1 min-h-0"
          >
            <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-4 space-y-4">
              {/* Avatar section */}
              <div className="flex items-center gap-4">
                <UserAvatar src={avatarUrl} firstName={firstName || 'U'} surname={surname || 'N'} size="lg" />
                <button
                  type="button"
                  onClick={() => setIsAvatarOpen(true)}
                  className="text-sm text-primary hover:underline"
                >
                  Change photo
                </button>
              </div>

              {successMessage && (
                <div className="p-3 text-sm text-green-700 bg-green-50 border border-green-200 rounded-md">
                  {successMessage}
                </div>
              )}
              {errorMessage && (
                <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
                  {errorMessage}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <FormTextField
                  id="edit-profile-first-name"
                  label="First Name"
                  required
                  registration={register('firstName')}
                  current={watch('firstName')}
                  maxLength={INPUT_LENGTH.name}
                  error={errors.firstName?.message}
                />
                <FormTextField
                  id="edit-profile-surname"
                  label="Last Name"
                  required
                  registration={register('surname')}
                  current={watch('surname')}
                  maxLength={INPUT_LENGTH.name}
                  error={errors.surname?.message}
                />
              </div>

              <FormTextField
                id="edit-profile-mobile-number"
                label="Phone Number"
                registration={register('mobileNumber')}
                current={watch('mobileNumber')}
                maxLength={INPUT_LENGTH.text}
                error={errors.mobileNumber?.message}
              />
            </div>

            {/* Sticky footer */}
            <div className="shrink-0 flex gap-3 px-6 pb-6 pt-4 border-t border-border">
              <Button type="button" variant="outline" className="flex-1" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save
              </Button>
            </div>
          </form>
        </div>
      </div>

      <AvatarUploadDialog
        isOpen={isAvatarOpen}
        onClose={() => setIsAvatarOpen(false)}
        currentAvatarUrl={avatarUrl}
        firstName={firstName || 'U'}
        surname={surname || 'N'}
      />
    </>
  );
}
