import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  forgotPasswordApi,
  verifyOtpApi,
  resetPasswordApi,
  firstTimePasswordApi,
  resendForgotPasswordOtpApi,
} from '@/api/auth.api';
import { completeLogin } from '@/lib/auth-init';

// ── ForgotPasswordPage ────────────────────────────────────────────────────────

const forgotSchema = z.object({
  email: z.string().email('Invalid email address'),
});
type IForgotForm = z.infer<typeof forgotSchema>;

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [isSuccess, setIsSuccess] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [apiError, setApiError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<IForgotForm>({ resolver: zodResolver(forgotSchema) });

  const handleForgot = async (data: IForgotForm) => {
    setApiError('');
    try {
      await forgotPasswordApi(data.email);
      setSubmittedEmail(data.email);
      setIsSuccess(true);
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;

      if (message) {
        setApiError(message);
      } else if (status === 404) {
        setApiError('Email address not found in the system.');
      } else {
        setApiError('Something went wrong. Please try again.');
      }
    }
  };

  if (isSuccess) {
    return (
      <div>
        <h1 className="text-xl font-semibold text-foreground mb-2">Check your email</h1>
        <p className="text-sm text-muted-foreground mb-6">
          An OTP code has been sent to <strong>{submittedEmail}</strong>. Please check your inbox.
        </p>
        <Button
          onClick={() => void navigate('/verify-otp', { state: { email: submittedEmail } })}
          className="w-full mb-3"
        >
          Enter OTP Code
        </Button>
        <Button variant="ghost" className="w-full" onClick={() => setIsSuccess(false)}>
          Resend
        </Button>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-foreground mb-2">Forgot Password</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Enter your email to receive a password reset OTP.
      </p>
      <form onSubmit={handleSubmit(handleForgot)} noValidate>
        <div className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1.5">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
              placeholder="your@email.com"
              {...register('email')}
            />
            {errors.email && (
              <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Send OTP
          </Button>
          {apiError && (
            <p className="text-sm text-destructive">{apiError}</p>
          )}
          <Link
            to="/login"
            className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to login
          </Link>
        </div>
      </form>
    </div>
  );
}

// ── VerifyOtpPage ─────────────────────────────────────────────────────────────

export function VerifyOtpPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const email = (location.state as { email?: string } | null)?.email ?? '';

  const [otp, setOtp] = useState<string[]>(Array(6).fill(''));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (countdown <= 0) {
      setCanResend(true);
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key >= '0' && e.key <= '9') {
      // Prevent browser from natively modifying the readOnly input
      e.preventDefault();
      const digit = e.key;
      setOtp((prev) => {
        const next = [...prev];
        next[index] = digit;
        return next;
      });
      if (index < 5) {
        inputRefs.current[index + 1]?.focus();
      } else {
        // Last digit entered — auto-submit with computed value
        const nextOtp = [...otp];
        nextOtp[index] = digit;
        void handleSubmitOtp(nextOtp.join(''));
      }
    } else if (e.key === 'Backspace') {
      e.preventDefault();
      if (otp[index]) {
        setOtp((prev) => {
          const next = [...prev];
          next[index] = '';
          return next;
        });
      } else if (index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'Enter') {
      void handleSubmitOtp();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newOtp = Array(6).fill('');
    pasted.split('').forEach((char, i) => {
      newOtp[i] = char;
    });
    setOtp(newOtp);
    inputRefs.current[Math.min(pasted.length, 5)]?.focus();
  };

  const handleSubmitOtp = async (otpOverride?: string) => {
    const otpString = otpOverride ?? otp.join('');
    if (otpString.length !== 6) {
      setErrorMessage('Please enter all 6 digits');
      return;
    }
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const { resetToken } = await verifyOtpApi(email, otpString);
      void navigate('/reset-password', { state: { resetToken } });
    } catch (err) {
      const axiosMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setErrorMessage(typeof axiosMsg === 'string' ? axiosMsg : 'Invalid or expired OTP');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    try {
      const result = await resendForgotPasswordOtpApi(email);
      setCountdown(result.cooldownSeconds);
      setCanResend(false);
      setRemainingAttempts(result.remainingAttempts);
      setOtp(Array(6).fill(''));
    } catch (err) {
      const code = (err as { response?: { data?: { code?: string } } })?.response?.data?.code;
      if (code === 'E009') {
        setRemainingAttempts(0);
        setCanResend(false);
      }
      // 429 cooldown handled by axios interceptor toast
    }
  };

  return (
    <div>
      <h1 className="text-xl font-semibold text-foreground mb-2">Enter OTP Code</h1>
      <p className="text-sm text-muted-foreground mb-6">
        An OTP code has been sent to <strong>{email || 'your email'}</strong>
      </p>

      {errorMessage && (
        <div className="mb-4 p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
          {errorMessage}
        </div>
      )}

      <div className="flex gap-2 justify-center mb-6">
        {otp.map((digit, index) => (
          <input
            key={index}
            ref={(el) => { inputRefs.current[index] = el; }}
            type="text"
            inputMode="numeric"
            readOnly
            value={digit}
            onKeyDown={(e) => handleOtpKeyDown(index, e)}
            onPaste={handleOtpPaste}
            className="w-11 h-12 text-center text-lg font-semibold rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 caret-transparent"
            aria-label={`OTP digit ${index + 1}`}
          />
        ))}
      </div>

      <Button onClick={() => void handleSubmitOtp()} className="w-full mb-4" disabled={isSubmitting}>
        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Verify
      </Button>

      <div className="text-center text-sm text-muted-foreground">
        {remainingAttempts === 0 ? (
          <span className="text-destructive">Maximum OTP requests reached. Try again tomorrow.</span>
        ) : canResend ? (
          <button
            type="button"
            onClick={() => void handleResend()}
            className="text-primary hover:underline underline-offset-4"
          >
            Resend OTP{remainingAttempts !== null ? ` (${remainingAttempts} left)` : ''}
          </button>
        ) : (
          <span>
            Resend in <strong>{countdown}s</strong>
          </span>
        )}
      </div>

      <Link
        to="/forgot-password"
        className="flex items-center justify-center gap-2 mt-4 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </Link>
    </div>
  );
}

// ── ResetPasswordPage ─────────────────────────────────────────────────────────

const resetSchema = z.object({
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain at least 1 uppercase letter')
    .regex(/[0-9]/, 'Must contain at least 1 number'),
});

type IResetForm = z.infer<typeof resetSchema>;

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const resetToken = (location.state as { resetToken?: string } | null)?.resetToken ?? '';

  const [isNewVisible, setIsNewVisible] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<IResetForm>({ resolver: zodResolver(resetSchema) });

  const handleReset = async (data: IResetForm) => {
    await resetPasswordApi(resetToken, data.newPassword);
    void navigate('/login', { state: { message: 'Password reset successfully. Please log in.' } });
  };

  return (
    <div>
      <h1 className="text-xl font-semibold text-foreground mb-2">Reset Password</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Create a new password for your account.
      </p>

      <form onSubmit={handleSubmit(handleReset)} noValidate>
        <div className="space-y-4">
          <PasswordField
            id="newPassword"
            label="New Password"
            placeholder="Min. 8 chars, uppercase, number"
            isVisible={isNewVisible}
            onToggle={() => setIsNewVisible((p) => !p)}
            registration={register('newPassword')}
            error={errors.newPassword?.message}
          />
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Reset Password
          </Button>
        </div>
      </form>
    </div>
  );
}

// ── FirstTimePasswordPage ─────────────────────────────────────────────────────

const firstTimeSchema = z
  .object({
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
  });

type IFirstTimeForm = z.infer<typeof firstTimeSchema>;

export function FirstTimePasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const recoveryKey = (location.state as { recoveryKey?: string } | null)?.recoveryKey ?? '';

  const [isNewVisible, setIsNewVisible] = useState(false);
  const [isConfirmVisible, setIsConfirmVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<IFirstTimeForm>({ resolver: zodResolver(firstTimeSchema) });

  // Block navigation away (using beforeunload)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  const handleFirstTime = async (data: IFirstTimeForm) => {
    setErrorMessage(null);
    try {
      const result = await firstTimePasswordApi(recoveryKey, data.newPassword);
      if (result.requires2FASetup) {
        void navigate('/setup-2fa', { state: { setupToken: result.setupToken } });
        return;
      }
      if (result.requires2FA) {
        void navigate('/verify-2fa', { state: { challengeToken: result.challengeToken, method: result.twoFAMethod, availableMethods: result.availableMethods } });
        return;
      }
      if (result.user) {
        await completeLogin(result.user);
      }
      const isClient = result.user?.roles?.includes('CLIENT');
      void navigate(isClient ? '/client' : '/');
    } catch {
      setErrorMessage('Unable to set password. Please try again or log in again.');
    }
  };

  return (
    <div data-testid="first-time-password-page">
      <h1 className="text-xl font-semibold text-foreground mb-2">Create New Password</h1>
      <p className="text-sm text-muted-foreground mb-6">
        This is your first login. Please create a new password to continue.
      </p>

      {errorMessage && (
        <div data-testid="first-time-password-error" className="mb-4 p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
          {errorMessage}
        </div>
      )}

      <form data-testid="first-time-password-form" onSubmit={handleSubmit(handleFirstTime)} noValidate>
        <div className="space-y-4">
          <PasswordField
            id="newPassword"
            testId="first-time-password-new-password"
            label="New Password"
            placeholder="Min. 8 chars, uppercase, number"
            isVisible={isNewVisible}
            onToggle={() => setIsNewVisible((p) => !p)}
            registration={register('newPassword')}
            error={errors.newPassword?.message}
          />
          <PasswordField
            id="confirmPassword"
            testId="first-time-password-confirm-password"
            label="Confirm Password"
            placeholder="Re-enter your new password"
            isVisible={isConfirmVisible}
            onToggle={() => setIsConfirmVisible((p) => !p)}
            registration={register('confirmPassword')}
            error={errors.confirmPassword?.message}
          />
          <Button data-testid="first-time-password-submit" type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Confirm
          </Button>
        </div>
      </form>
    </div>
  );
}

// ── Shared PasswordField component ───────────────────────────────────────────

interface IPasswordFieldProps {
  id: string;
  label: string;
  placeholder: string;
  isVisible: boolean;
  onToggle: () => void;
  registration: ReturnType<ReturnType<typeof useForm>['register']>;
  error?: string;
  testId?: string;
}

function PasswordField({
  id,
  label,
  placeholder,
  isVisible,
  onToggle,
  registration,
  error,
  testId,
}: IPasswordFieldProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-foreground mb-1.5">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          data-testid={testId}
          type={isVisible ? 'text' : 'password'}
          className="w-full h-10 px-3 pr-10 rounded-md border border-input bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
          placeholder={placeholder}
          {...registration}
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          aria-label={isVisible ? 'Hide password' : 'Show password'}
        >
          {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
