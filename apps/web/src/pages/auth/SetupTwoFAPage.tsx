import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ShieldCheck, Copy, Loader2, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { initialSetup2FAApi, confirmInitialSetup2FAApi, resendInitialSetup2FAOtpApi } from '@/api/auth.api';
import { completeLogin } from '@/lib/auth-init';
import { getSafeRedirect } from '@/lib/auth-redirect';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ISetupState {
  method: 'Google' | 'Email';
  qrDataUri?: string;
  secret?: string;
  message?: string;
}

// ── OTP Input ─────────────────────────────────────────────────────────────────

function OtpInput({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key >= '0' && e.key <= '9') {
      e.preventDefault();
      const next = [...value];
      next[index] = e.key;
      onChange(next);
      if (index < 5) inputRefs.current[index + 1]?.focus();
    } else if (e.key === 'Backspace') {
      e.preventDefault();
      if (value[index]) {
        const next = [...value]; next[index] = ''; onChange(next);
      } else if (index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const next = Array(6).fill('');
    pasted.split('').forEach((c, i) => { next[i] = c; });
    onChange(next);
    inputRefs.current[Math.min(pasted.length, 5)]?.focus();
  };

  return (
    <div className="flex gap-2 justify-center">
      {value.map((digit, i) => (
        <input
          key={i}
          ref={(el) => { inputRefs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          readOnly
          value={digit}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          className="w-11 h-12 text-center text-lg font-semibold rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 caret-transparent"
          aria-label={`OTP digit ${i + 1}`}
        />
      ))}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function SetupTwoFAPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const state = location.state as { setupToken?: string; redirect?: string } | null;
  const setupToken = state?.setupToken ?? '';
  const redirectTo = state?.redirect ?? null;

  const [setup, setSetup] = useState<ISetupState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [otp, setOtp] = useState<string[]>(Array(6).fill(''));
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);

  // Redirect if no setupToken
  useEffect(() => {
    if (!setupToken) { void navigate('/login'); return; }
    void (async () => {
      try {
        const data = await initialSetup2FAApi(setupToken);
        setSetup(data as ISetupState);
      } catch (err) {
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
        setError(msg ?? 'Setup session expired. Please log in again.');
      } finally {
        setLoading(false);
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (setup?.method !== 'Email') return;
    if (countdown <= 0) {
      setCanResend(true);
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, setup?.method]);

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConfirm = async () => {
    const code = otp.join('');
    if (code.length !== 6) { setError('Please enter all 6 digits.'); return; }
    setSubmitting(true);
    setError(null);
    try {
      const { user } = await confirmInitialSetup2FAApi(setupToken, code);
      await completeLogin(user);
      const safeRedirect = getSafeRedirect(redirectTo);
      void navigate(safeRedirect ?? (user.roles.includes('CLIENT') ? '/client' : '/'), { replace: true });
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? 'Invalid code. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    try {
      const data = await resendInitialSetup2FAOtpApi(setupToken);
      setSetup(data as ISetupState);
      setOtp(Array(6).fill(''));
      setCountdown(60);
      setCanResend(false);
      setError(null);
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? 'Failed to resend OTP. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Preparing your 2FA setup…</p>
      </div>
    );
  }

  if (error && !setup) {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <AlertTriangle className="h-8 w-8 text-destructive" />
        <p className="text-sm text-destructive text-center">{error}</p>
        <Button variant="outline" onClick={() => void navigate('/login')}>Back to Login</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col items-center gap-2 text-center">
        <ShieldCheck className="h-10 w-10 text-primary" />
        <h1 className="text-xl font-semibold">Set Up Two-Factor Authentication</h1>
        <p className="text-sm text-muted-foreground max-w-sm">
          {setup?.method === 'Google'
            ? 'Scan the QR code with Google Authenticator or any TOTP app.'
            : 'A verification code has been sent to your email.'}
        </p>
      </div>

      {/* Google: QR code + manual secret */}
      {setup?.method === 'Google' && (
        <div className="flex flex-col items-center gap-4">
          {setup.qrDataUri && (
            <img
              src={setup.qrDataUri}
              alt="2FA QR Code"
              className="w-44 h-44 border border-border rounded-lg p-2"
            />
          )}
          {setup.secret && (
            <div className="w-full">
              <p className="text-xs text-muted-foreground text-center mb-1">
                Or enter this key manually:
              </p>
              <div className="flex items-center gap-2 bg-muted/50 border border-border rounded-md px-3 py-2">
                <code className="flex-1 text-xs font-mono break-all">{setup.secret}</code>
                <button
                  type="button"
                  onClick={() => void handleCopy(setup.secret!)}
                  className="text-muted-foreground hover:text-foreground shrink-0"
                  title="Copy"
                >
                  {copied ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Email: info message */}
      {setup?.method === 'Email' && setup.message && (
        <div className="space-y-3">
          <div className="bg-muted/50 border border-border rounded-md px-4 py-3 text-sm text-center text-muted-foreground">
            {setup.message}
          </div>
          <div className="text-center text-sm text-muted-foreground">
            {canResend ? (
              <button
                type="button"
                onClick={() => void handleResend()}
                disabled={isResending}
                className="text-primary hover:underline disabled:opacity-50"
              >
                {isResending ? 'Sending…' : 'Resend code'}
              </button>
            ) : (
              <span className="inline-flex items-center justify-center gap-1">
                <RefreshCw className="h-3.5 w-3.5" />
                Resend in {countdown}s
              </span>
            )}
          </div>
        </div>
      )}

      {/* OTP input */}
      <div className="space-y-3">
        <p className="text-sm font-medium text-center">
          {setup?.method === 'Google'
            ? 'Enter the 6-digit code from your Authenticator app:'
            : 'Enter the 6-digit code from your email:'}
        </p>
        <OtpInput value={otp} onChange={setOtp} />
      </div>

      {error && (
        <p className="text-sm text-destructive text-center">{error}</p>
      )}

      <Button className="w-full" onClick={() => void handleConfirm()} disabled={submitting || otp.join('').length !== 6}>
        {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Verify & Activate
      </Button>
    </div>
  );
}
