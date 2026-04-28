import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { getSafeRedirect } from '@/lib/auth-redirect';
import { Eye, EyeOff, Loader2, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { loginApi } from '@/api/auth.api';
import { completeLogin } from '@/lib/auth-init';
import { usePublicConfig, useBrandingUrl } from '@/hooks/useSystem';

const TEST_ACCOUNTS = [
  { role: 'Super Admin', username: 'superadmin', password: 'Admin@123!' },
  { role: 'HR Admin', username: 'truonglekhanh', password: 'Vibe@123!' },
  { role: 'Manager', username: 'truonglehung', password: 'Vibe@123!' },
  { role: 'Employee', username: 'lexuankhanh', password: 'Vibe@123!' },
];

const loginSchema = z.object({
  username: z.string().min(1, 'Username or email is required'),
  password: z.string().min(1, 'Password is required'),
});

type ILoginForm = z.infer<typeof loginSchema>;

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = new URLSearchParams(location.search).get('redirect');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isTestOpen, setIsTestOpen] = useState(true);
  const { data: publicConfig } = usePublicConfig();
  const showTestAccounts = publicConfig?.['login.show_test_accounts'] === 'true';
  const logoUrl = useBrandingUrl('/api/public/branding/logo');
  const escLogoUrl = useBrandingUrl('/api/public/branding/esc-logo');

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ILoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const handleLogin = async (data: ILoginForm) => {
    setErrorMessage(null);
    try {
      const result = await loginApi({ username: data.username, password: data.password });
      if (result.mustChangePassword) {
        void navigate('/first-time-password', { state: { recoveryKey: result.recoveryKey } });
        return;
      }
      if (result.requires2FASetup) {
        void navigate('/setup-2fa', { state: { setupToken: result.setupToken, redirect: redirectTo } });
        return;
      }
      if (result.requires2FA) {
        void navigate('/verify-2fa', { state: { challengeToken: result.challengeToken, method: result.twoFAMethod, availableMethods: result.availableMethods, redirect: redirectTo } });
        return;
      }
      if (result.user) {
        await completeLogin(result.user);
        const safeRedirect = getSafeRedirect(redirectTo);
        void navigate(safeRedirect ?? (result.user.roles.includes('CLIENT') ? '/client' : '/'));
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setErrorMessage(
        axiosErr?.response?.data?.message ??
          (err instanceof Error ? err.message : 'Login failed. Please try again.'),
      );
    }
  };

  return (
    <div>
      {/* Dual logos: ESC (left) + VIBE365 (right) */}
      <div className="flex items-center justify-between mb-6">
        <img
          src={escLogoUrl}
          alt="ESC"
          className="h-14 max-w-[120px] object-contain"
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
        />
        <img
          src={logoUrl}
          alt="VIBE365"
          className="h-14 max-w-[120px] object-contain"
        />
      </div>

      <div className="mb-6">
        <h1 className="text-[22px] font-extrabold text-foreground tracking-tight">Welcome back</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Enter your credentials to continue
        </p>
      </div>

      {errorMessage && (
        <div data-testid="login-error" className="mb-5 flex items-start gap-3 p-3.5 text-sm text-destructive bg-destructive/8 border border-destructive/20 rounded-xl">
          <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form data-testid="login-form" onSubmit={handleSubmit(handleLogin)} noValidate className="space-y-4">

        {/* Username */}
        <div>
          <label htmlFor="username" className="block text-[13px] font-semibold text-foreground mb-1.5">
            Username or Email
          </label>
          <input
            id="username"
            type="text"
            autoComplete="username"
            autoFocus
            className="w-full h-11 px-3.5 rounded-xl border border-input bg-background text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-primary transition-all disabled:opacity-50"
            placeholder="Enter your Username or Email"
            {...register('username')}
          />
          {errors.username && (
            <p className="mt-1.5 text-xs text-destructive flex items-center gap-1">
              <AlertCircle size={11} /> {errors.username.message}
            </p>
          )}
        </div>

        {/* Password */}
        <div>
          <label htmlFor="password" className="block text-[13px] font-semibold text-foreground mb-1.5">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={isPasswordVisible ? 'text' : 'password'}
              autoComplete="current-password"
              className="w-full h-11 px-3.5 pr-11 rounded-xl border border-input bg-background text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-primary transition-all disabled:opacity-50"
              placeholder="Enter your password"
              {...register('password')}
            />
            <button
              type="button"
              onClick={() => setIsPasswordVisible((p) => !p)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label={isPasswordVisible ? 'Hide password' : 'Show password'}
            >
              {isPasswordVisible ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1.5 text-xs text-destructive flex items-center gap-1">
              <AlertCircle size={11} /> {errors.password.message}
            </p>
          )}
        </div>

        {/* Forgot password */}
        <div className="flex justify-end">
          <Link
            to="/forgot-password"
            className="text-[13px] text-primary font-medium hover:underline underline-offset-4 transition-colors"
          >
            Forgot password?
          </Link>
        </div>

        <Button type="submit" size="lg" className="w-full mt-2" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Signing in...
            </>
          ) : (
            'Sign In'
          )}
        </Button>
      </form>

      {/* Test accounts panel — controlled via SystemSettings key login.show_test_accounts */}
      {showTestAccounts && <div className="mt-5 border border-dashed border-border rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => setIsTestOpen((v) => !v)}
          className="w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
        >
          <span>Test accounts — click to fill</span>
          {isTestOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>
        {isTestOpen && (
          <div className="border-t border-dashed border-border divide-y divide-dashed divide-border">
            {TEST_ACCOUNTS.map((a) => (
              <button
                key={a.username}
                type="button"
                onClick={() => { setValue('username', a.username); setValue('password', a.password); }}
                className="w-full flex items-center justify-between px-3.5 py-2 text-xs hover:bg-muted/40 transition-colors text-left"
              >
                <span className="text-muted-foreground w-20 shrink-0">{a.role}</span>
                <span className="font-mono text-foreground flex-1">{a.username}</span>
                <span className="font-mono text-muted-foreground">{a.password}</span>
              </button>
            ))}
          </div>
        )}
      </div>}
    </div>
  );
}
