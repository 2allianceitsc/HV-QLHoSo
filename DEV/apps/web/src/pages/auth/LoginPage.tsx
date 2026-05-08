import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { getSafeRedirect } from '@/lib/auth-redirect';
import { Eye, EyeOff, Loader2, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { loginApi, loginWithGoogleApi } from '@/api/auth.api';
import { completeLogin } from '@/lib/auth-init';
import { usePublicConfig, useBrandingUrl } from '@/hooks/useSystem';
import { signInWithGoogle } from '@/lib/firebase';

const TEST_ACCOUNTS = [
  { role: 'Super Admin', username: 'superadmin', password: 'Admin@123!' },
  { role: 'HR Admin', username: 'truonglekhanh', password: 'Vibe@123!' },
  { role: 'Manager', username: 'truonglehung', password: 'Vibe@123!' },
  { role: 'Employee', username: 'lexuankhanh', password: 'Vibe@123!' },
];

const loginSchema = z.object({
  username: z.string().min(1, 'Vui lòng nhập tên đăng nhập hoặc email'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
});

type ILoginForm = z.infer<typeof loginSchema>;

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = new URLSearchParams(location.search).get('redirect');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isTestOpen, setIsTestOpen] = useState(true);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
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

  const handleGoogleLogin = async () => {
    setErrorMessage(null);
    setIsGoogleLoading(true);
    try {
      const idToken = await signInWithGoogle();
      const result = await loginWithGoogleApi(idToken);
      if (result.user) {
        await completeLogin(result.user);
        const safeRedirect = getSafeRedirect(redirectTo);
        void navigate(safeRedirect ?? (result.user.roles.includes('CLIENT') ? '/client' : '/'));
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setErrorMessage(
        axiosErr?.response?.data?.message ??
          (err instanceof Error ? err.message : 'Đăng nhập bằng Google thất bại. Vui lòng thử lại.'),
      );
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div>
      {/* Dual logos: ESC (left) + HV Docs Pro (right) */}
      <div className="flex items-center justify-between mb-6">
        <img
          src={escLogoUrl}
          alt="ESC"
          className="h-14 max-w-[120px] object-contain"
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
        />
        <img
          src={logoUrl}
          alt="HV Docs Pro"
          className="h-14 max-w-[120px] object-contain"
        />
      </div>

      <div className="mb-6">
        <h1 className="text-[22px] font-extrabold text-foreground tracking-tight">Chào mừng trở lại</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Nhập thông tin đăng nhập để tiếp tục
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
            Tên đăng nhập hoặc Email
          </label>
          <input
            id="username"
            type="text"
            autoComplete="username"
            autoFocus
            className="w-full h-11 px-3.5 rounded-xl border border-input bg-background text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-primary transition-all disabled:opacity-50"
            placeholder="Nhập tên đăng nhập hoặc email"
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
            Mật khẩu
          </label>
          <div className="relative">
            <input
              id="password"
              type={isPasswordVisible ? 'text' : 'password'}
              autoComplete="current-password"
              className="w-full h-11 px-3.5 pr-11 rounded-xl border border-input bg-background text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-primary transition-all disabled:opacity-50"
              placeholder="Nhập mật khẩu"
              {...register('password')}
            />
            <button
              type="button"
              onClick={() => setIsPasswordVisible((p) => !p)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label={isPasswordVisible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
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
            Quên mật khẩu?
          </Link>
        </div>

        <Button type="submit" size="lg" className="w-full mt-2" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Đang đăng nhập...
            </>
          ) : (
            'Đăng nhập'
          )}
        </Button>
      </form>

      {/* Divider */}
      <div className="flex items-center gap-3 my-5">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-muted-foreground">hoặc</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* Google login */}
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="w-full gap-2"
        onClick={() => void handleGoogleLogin()}
        disabled={isGoogleLoading || isSubmitting}
      >
        {isGoogleLoading ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
        )}
        Đăng nhập bằng Google
      </Button>

      {/* Test accounts panel — controlled via SystemSettings key login.show_test_accounts */}
      {showTestAccounts && <div className="mt-5 border border-dashed border-border rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => setIsTestOpen((v) => !v)}
          className="w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
        >
          <span>Tài khoản test — nhấn để điền</span>
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
