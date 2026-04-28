import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ShieldCheck, RefreshCw, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { verify2FAApi, resend2FAOtpApi } from '@/api/auth.api';
import { completeLogin } from '@/lib/auth-init';
import { getSafeRedirect } from '@/lib/auth-redirect';

export function TwoFAVerifyPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state as { challengeToken?: string; method?: string; redirect?: string; availableMethods?: string[] } | null) ?? {};
  const challengeToken = state.challengeToken ?? '';
  const method = state.method ?? 'TOTP';
  const redirectTo = state.redirect ?? null;


  const [otp, setOtp] = useState<string[]>(Array(6).fill(''));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Redirect to login if no challenge token
  useEffect(() => {
    if (!challengeToken) void navigate('/login', { replace: true });
  }, [challengeToken, navigate]);

  // Support both legacy ('EMAIL_OTP') and new ('Email') method codes
  const isEmailOtp = method === 'EMAIL_OTP' || method === 'Email';

  // Countdown for email OTP resend
  useEffect(() => {
    if (!isEmailOtp || countdown <= 0) {
      if (countdown <= 0) setCanResend(true);
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, isEmailOtp]);

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key >= '0' && e.key <= '9') {
      e.preventDefault();
      setOtp((prev) => { const next = [...prev]; next[index] = e.key; return next; });
      if (index < 5) inputRefs.current[index + 1]?.focus();
    } else if (e.key === 'Backspace') {
      e.preventDefault();
      if (otp[index]) {
        setOtp((prev) => { const next = [...prev]; next[index] = ''; return next; });
      } else if (index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'Enter') {
      void handleSubmit();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newOtp = Array(6).fill('');
    pasted.split('').forEach((char, i) => { newOtp[i] = char; });
    setOtp(newOtp);
    inputRefs.current[Math.min(pasted.length, 5)]?.focus();
  };

  const handleSubmit = async () => {
    const code = otp.join('');
    if (code.length !== 6) { setErrorMessage('Please enter all 6 digits'); return; }
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const { user } = await verify2FAApi(challengeToken, code);
      await completeLogin(user);
      const safeRedirect = getSafeRedirect(redirectTo);
      void navigate(safeRedirect ?? (user.roles.includes('CLIENT') ? '/client' : '/'), { replace: true });
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setErrorMessage(typeof msg === 'string' ? msg : 'Invalid or expired code. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    try {
      await resend2FAOtpApi(challengeToken);
      setOtp(Array(6).fill(''));
      setCountdown(60);
      setCanResend(false);
      setErrorMessage(null);
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setErrorMessage(typeof msg === 'string' ? msg : 'Failed to resend. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  const label = isEmailOtp
    ? 'Enter the 6-digit code sent to your email'
    : 'Enter the 6-digit code from your authenticator app';

  return (
    <div>
      <div className="flex flex-col items-center mb-6 gap-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
          <ShieldCheck className="h-7 w-7 text-primary" />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-semibold">Two-Factor Authentication</h2>
          <p className="text-sm text-muted-foreground mt-1">{label}</p>
        </div>
      </div>

      {errorMessage && (
        <div className="mb-5 flex items-start gap-3 p-3.5 text-sm text-destructive bg-destructive/8 border border-destructive/20 rounded-xl">
          <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* OTP inputs */}
      <div className="flex justify-center gap-2 mb-6" onPaste={handlePaste}>
        {otp.map((digit, i) => (
          <input
            key={i}
            ref={(el) => { inputRefs.current[i] = el; }}
            type="text"
            inputMode="numeric"
            readOnly
            value={digit}
            onKeyDown={(e) => handleKeyDown(i, e)}
            maxLength={1}
            className="h-12 w-10 rounded-lg border border-input bg-background text-center text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-ring"
            autoFocus={i === 0}
            aria-label={`OTP digit ${i + 1}`}
          />
        ))}
      </div>

      <Button
        className="w-full"
        onClick={() => void handleSubmit()}
        disabled={isSubmitting || otp.join('').length !== 6}
      >
        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Verify
      </Button>

      {isEmailOtp && (
        <div className="mt-4 text-center text-sm text-muted-foreground">
          {canResend ? (
            <button
              onClick={() => void handleResend()}
              disabled={isResending}
              className="text-primary hover:underline disabled:opacity-50"
            >
              {isResending ? 'Sending…' : 'Resend code'}
            </button>
          ) : (
            <span className="flex items-center justify-center gap-1">
              <RefreshCw className="h-3.5 w-3.5" />
              Resend in {countdown}s
            </span>
          )}
        </div>
      )}

      <div className="mt-4 text-center">
        <button
          onClick={() => void navigate('/login')}
          className="text-sm text-muted-foreground hover:text-foreground hover:underline"
        >
          ← Back to login
        </button>
      </div>
    </div>
  );
}
