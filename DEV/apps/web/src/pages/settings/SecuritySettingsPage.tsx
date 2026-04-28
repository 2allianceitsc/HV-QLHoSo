import { useState } from 'react';
import {
  ShieldCheck,
  ShieldOff,
  Smartphone,
  Mail,
  Copy,
  CheckCircle2,
  QrCode,
  Loader2,
  Edit2,
  X,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getAuthenticatorsApi,
  getRequirementStatusApi,
  updateAuthenticatorApi,
  getQrCodeApi,
} from '@/api/auth.api';
import { getApiErrorMessage } from '@/lib/apiError';

// ── Helpers ───────────────────────────────────────────────────────────────────

function getMethodIcon(code: string) {
  return code === 'Google' ? Smartphone : Mail;
}

function getMethodLabel(code: string) {
  return code === 'Google' ? 'Authenticator App (TOTP)' : 'Email OTP';
}

// ── Toggle Switch (no Switch component available, built inline) ───────────────

function ToggleSwitch({
  checked,
  disabled,
  onChange,
  testId,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
  testId?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      data-testid={testId}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
        checked ? 'bg-primary' : 'bg-input'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          checked ? 'translate-x-4' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function SecuritySettingsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: authenticators = [], isLoading } = useQuery({
    queryKey: ['2fa-authenticators'],
    queryFn: getAuthenticatorsApi,
  });

  const { data: requirementStatus } = useQuery({
    queryKey: ['2fa-requirement-status'],
    queryFn: getRequirementStatusApi,
  });

  // QR dialog state
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [qrData, setQrData] = useState<{ qrDataUri: string; secret: string } | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Recipient edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRecipient, setEditRecipient] = useState('');

  // Toggle enable/disable per method
  const toggleMutation = useMutation({
    mutationFn: ({ id, isEnable }: { id: string; isEnable: boolean }) =>
      updateAuthenticatorApi(id, { isEnable }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['2fa-authenticators'] });
      void queryClient.invalidateQueries({ queryKey: ['2fa-requirement-status'] });
    },
    onError: (err) =>
      toast({ title: getApiErrorMessage(err, 'Failed to update method'), variant: 'destructive' }),
  });

  // Update recipient email per method
  const recipientMutation = useMutation({
    mutationFn: ({ id, recipient }: { id: string; recipient: string }) =>
      updateAuthenticatorApi(id, { recipient }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['2fa-authenticators'] });
      setEditingId(null);
      toast({ title: 'Recipient email updated' });
    },
    onError: (err) =>
      toast({ title: getApiErrorMessage(err, 'Failed to update recipient'), variant: 'destructive' }),
  });

  const handleViewQr = async () => {
    setQrLoading(true);
    try {
      const data = await getQrCodeApi();
      setQrData(data);
      setQrDialogOpen(true);
    } catch (err) {
      toast({ title: getApiErrorMessage(err, 'Failed to load QR code'), variant: 'destructive' });
    } finally {
      setQrLoading(false);
    }
  };

  const handleCopySecret = () => {
    if (!qrData) return;
    void navigator.clipboard.writeText(qrData.secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const hasAny2FA = authenticators.length > 0;
  const enabledCount = authenticators.filter((a) => a.isEnable).length;
  const isRequired = (requirementStatus?.isRequired ?? false) || (requirementStatus?.systemForced ?? false);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-2xl font-bold">Security</h1>
        <p className="text-sm text-muted-foreground">
          Manage two-factor authentication methods for your account.
        </p>
      </div>

      {/* Status summary */}
      <div className={`rounded-xl border p-5 flex items-start gap-4 ${isRequired && !hasAny2FA ? 'border-amber-200 dark:border-amber-800' : 'border-border'}`}>
        <div
          className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${
            hasAny2FA && enabledCount > 0
              ? 'bg-green-100 text-green-600'
              : isRequired
              ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
              : 'bg-muted text-muted-foreground'
          }`}
        >
          {hasAny2FA && enabledCount > 0 ? (
            <ShieldCheck className="h-5 w-5" />
          ) : isRequired ? (
            <AlertTriangle className="h-5 w-5" />
          ) : (
            <ShieldOff className="h-5 w-5" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium">Two-Factor Authentication</span>
            <Badge
              variant={hasAny2FA && enabledCount > 0 ? 'default' : 'secondary'}
              className="text-xs"
            >
              {hasAny2FA && enabledCount > 0
                ? `${enabledCount} method${enabledCount > 1 ? 's' : ''} enabled`
                : 'Not configured'}
            </Badge>
            {isRequired && (
              <Badge variant="outline" className="text-xs border-amber-400 text-amber-600 dark:text-amber-400">
                {requirementStatus?.systemForced ? 'Required system-wide' : 'Required by admin'}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {hasAny2FA
              ? 'Manage your active authentication methods below.'
              : isRequired
              ? 'Two-factor authentication is required for your account but has not been set up yet. You will be prompted to configure it on your next login.'
              : 'Two-factor authentication has not been set up for your account yet.'}
          </p>
        </div>
      </div>

      {/* Authenticator method cards */}
      {hasAny2FA && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Authentication Methods
          </p>

          {authenticators.map((auth) => {
            const Icon = getMethodIcon(auth.code);
            const isEditing = editingId === auth.id;

            return (
              <div key={auth.id} className="rounded-xl border border-border p-4 space-y-3">
                {/* Method header row */}
                <div className="flex items-center gap-3">
                  <Icon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{getMethodLabel(auth.code)}</span>
                      <Badge variant={auth.isEnable ? 'default' : 'secondary'} className="text-xs">
                        {auth.isEnable ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </div>
                  <ToggleSwitch
                    checked={auth.isEnable}
                    disabled={toggleMutation.isPending}
                    testId={`2fa-toggle-${auth.code.toLowerCase()}`}
                    onChange={(checked) => {
                      if (!checked && enabledCount <= 1) {
                        toast({
                          title: 'Cannot disable',
                          description: 'At least one method must remain active.',
                          variant: 'destructive',
                        });
                        return;
                      }
                      toggleMutation.mutate({ id: auth.id, isEnable: checked });
                    }}
                  />
                </div>

                {/* Recipient email row */}
                <div className="flex items-center gap-2 pl-8">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  {isEditing ? (
                    <>
                      <Input
                        className="h-7 text-xs flex-1"
                        value={editRecipient}
                        onChange={(e) => setEditRecipient(e.target.value)}
                        placeholder="recipient@email.com"
                        type="email"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            recipientMutation.mutate({ id: auth.id, recipient: editRecipient });
                          } else if (e.key === 'Escape') {
                            setEditingId(null);
                          }
                        }}
                      />
                      <button
                        type="button"
                        className="text-green-600 hover:text-green-700 disabled:opacity-50"
                        onClick={() =>
                          recipientMutation.mutate({ id: auth.id, recipient: editRecipient })
                        }
                        disabled={recipientMutation.isPending}
                        title="Save"
                      >
                        {recipientMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-foreground"
                        onClick={() => setEditingId(null)}
                        title="Cancel"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="text-xs text-muted-foreground flex-1 truncate">
                        {auth.recipient ?? (
                          <span className="italic">No recipient email set</span>
                        )}
                      </span>
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          setEditingId(auth.id);
                          setEditRecipient(auth.recipient ?? '');
                        }}
                        title="Edit recipient email"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                </div>

                {/* Google-only: View QR Code */}
                {auth.code === 'Google' && (
                  <div className="pl-8">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1.5"
                      onClick={() => void handleViewQr()}
                      disabled={qrLoading}
                    >
                      {qrLoading ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <QrCode className="h-3 w-3" />
                      )}
                      View QR Code
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* QR Code Dialog */}
      <Dialog
        open={qrDialogOpen}
        onOpenChange={(open) => {
          setQrDialogOpen(open);
          if (!open) setCopied(false);
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Authenticator QR Code</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Scan this code with Google Authenticator or any TOTP-compatible app.
            </p>
            {qrData?.qrDataUri && (
              <div className="flex justify-center">
                <img
                  src={qrData.qrDataUri}
                  alt="2FA QR Code"
                  className="h-48 w-48 rounded-lg border border-border p-2"
                />
              </div>
            )}
            {qrData?.secret && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Or enter this key manually:</p>
                <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-2">
                  <code className="flex-1 text-xs font-mono break-all">{qrData.secret}</code>
                  <button
                    type="button"
                    onClick={handleCopySecret}
                    className="text-muted-foreground hover:text-foreground shrink-0"
                    title="Copy secret key"
                  >
                    {copied ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
