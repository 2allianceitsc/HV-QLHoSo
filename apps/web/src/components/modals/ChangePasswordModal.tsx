import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { changePasswordApi } from '@/api/auth.api';

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Must contain at least 1 uppercase letter')
      .regex(/[0-9]/, 'Must contain at least 1 number'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
  .refine((d) => d.newPassword !== d.currentPassword, {
    message: 'New password must be different from current password',
    path: ['newPassword'],
  });

type IChangePasswordForm = z.infer<typeof changePasswordSchema>;

interface IChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ChangePasswordModal({ isOpen, onClose }: IChangePasswordModalProps) {
  const [isCurrentVisible, setIsCurrentVisible] = useState(false);
  const [isNewVisible, setIsNewVisible] = useState(false);
  const [isConfirmVisible, setIsConfirmVisible] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<IChangePasswordForm>({ resolver: zodResolver(changePasswordSchema) });

  const handleClose = () => {
    reset();
    setSuccessMessage(null);
    setErrorMessage(null);
    onClose();
  };

  const handleChangePassword = async (data: IChangePasswordForm) => {
    setErrorMessage(null);
    try {
      await changePasswordApi(data.currentPassword, data.newPassword);
      setSuccessMessage('Password changed successfully.');
      reset();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setErrorMessage(axiosErr?.response?.data?.message ?? 'Unable to change password. Please try again.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md mx-4 bg-card rounded-xl shadow-xl border border-border flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-6 pt-6 pb-4">
          <h2 className="text-lg font-semibold text-foreground">Change Password</h2>
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
          id="change-password-form"
          onSubmit={handleSubmit(handleChangePassword)}
          noValidate
          className="flex flex-col flex-1 min-h-0"
        >
          <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-4 space-y-4">
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

            <PasswordField
              id="currentPassword"
              label="Current Password"
              isVisible={isCurrentVisible}
              onToggle={() => setIsCurrentVisible((p) => !p)}
              registration={register('currentPassword')}
              error={errors.currentPassword?.message}
            />
            <PasswordField
              id="newPassword"
              label="New Password"
              isVisible={isNewVisible}
              onToggle={() => setIsNewVisible((p) => !p)}
              registration={register('newPassword')}
              error={errors.newPassword?.message}
            />
            <PasswordField
              id="confirmPassword"
              label="Confirm New Password"
              isVisible={isConfirmVisible}
              onToggle={() => setIsConfirmVisible((p) => !p)}
              registration={register('confirmPassword')}
              error={errors.confirmPassword?.message}
            />
          </div>

          {/* Sticky footer */}
          <div className="shrink-0 flex gap-3 px-6 pb-6 pt-4 border-t border-border">
            <Button type="button" variant="outline" className="flex-1" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Confirm
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface IPasswordFieldProps {
  id: string;
  label: string;
  isVisible: boolean;
  onToggle: () => void;
  registration: ReturnType<ReturnType<typeof useForm>['register']>;
  error?: string;
}

function PasswordField({ id, label, isVisible, onToggle, registration, error }: IPasswordFieldProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-foreground mb-1.5">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={isVisible ? 'text' : 'password'}
          className="w-full h-10 px-3 pr-10 rounded-md border border-input bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
          {...registration}
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
        >
          {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
