import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Shield, Key, Mail, Loader2, QrCode, RefreshCw, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  getAuthenticatorsApi,
  getRequirementStatusApi,
  updateAuthenticatorApi,
  getQrCodeApi,
} from '@/api/auth.api';
import { getApiErrorMessage } from '@/lib/apiError';

export function TwoFASection() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [qrOpen, setQrOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [recipientDraft, setRecipientDraft] = useState('');

  const { data: authenticators = [], isLoading: authsLoading } = useQuery({
    queryKey: ['2fa-authenticators'],
    queryFn: getAuthenticatorsApi,
  });

  const { data: status, isLoading: statusLoading } = useQuery({
    queryKey: ['2fa-requirement-status'],
    queryFn: getRequirementStatusApi,
  });

  const enabledCount = authenticators.filter((a) => a.isEnable).length;
  const isRequired = (status?.isRequired ?? false) || (status?.systemForced ?? false);

  const toggle = useMutation({
    mutationFn: ({ id, isEnable }: { id: string; isEnable: boolean }) =>
      updateAuthenticatorApi(id, { isEnable }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['2fa-authenticators'] });
      void qc.invalidateQueries({ queryKey: ['2fa-requirement-status'] });
    },
    onError: (err) =>
      toast({ title: getApiErrorMessage(err, 'Failed to update method'), variant: 'destructive' }),
  });

  const saveRecipient = useMutation({
    mutationFn: ({ id, recipient }: { id: string; recipient: string }) =>
      updateAuthenticatorApi(id, { recipient }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['2fa-authenticators'] });
      setEditingId(null);
    },
    onError: (err) =>
      toast({ title: getApiErrorMessage(err, 'Failed to update email'), variant: 'destructive' }),
  });

  const { data: qrData, refetch: fetchQr, isFetching: qrFetching } = useQuery({
    queryKey: ['2fa-qr'],
    queryFn: getQrCodeApi,
    enabled: false,
  });

  const isLoading = authsLoading || statusLoading;
  if (isLoading) return null;

  // No records + 2FA required → "Required — Not Configured" state (Bug 3 fix)
  if (authenticators.length === 0) {
    if (!isRequired) return null;
    return (
      <div className="bg-card border border-amber-200 dark:border-amber-800 rounded-xl p-6" data-testid="2fa-section">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Two-Factor Authentication
          </h2>
          <Badge variant="outline" className="border-amber-400 text-amber-600 dark:text-amber-400 text-xs ml-auto">
            {status?.systemForced ? 'Required system-wide' : 'Required by admin'}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Two-factor authentication is required for your account but has not been configured yet.
          You will be prompted to set it up on your next login.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-6" data-testid="2fa-section">
      <div className="flex items-center gap-2 mb-4">
        <Shield className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Two-Factor Authentication
        </h2>
        {isRequired && (
          <Badge variant="outline" className="border-amber-400 text-amber-600 dark:text-amber-400 text-xs ml-auto">
            {status?.systemForced ? 'Required system-wide' : 'Required by admin'}
          </Badge>
        )}
      </div>

      <div className="space-y-3">
        {authenticators.map((auth) => (
          <div key={auth.id} className="border border-border rounded-lg p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                {auth.code === 'Google' ? (
                  <Key className="h-4 w-4 shrink-0 text-muted-foreground" />
                ) : (
                  <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium">{auth.name}</p>
                  {auth.code === 'Email' && auth.recipient && (
                    <p className="text-xs text-muted-foreground truncate">{auth.recipient}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {auth.code === 'Google' && auth.isEnable && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => { setQrOpen(true); void fetchQr(); }}
                  >
                    <QrCode className="h-3.5 w-3.5 mr-1.5" />
                    QR Code
                  </Button>
                )}

                <button
                  type="button"
                  role="switch"
                  aria-checked={auth.isEnable}
                  aria-label={`${auth.isEnable ? 'Disable' : 'Enable'} ${auth.name}`}
                  data-testid={`2fa-toggle-${auth.code.toLowerCase()}`}
                  disabled={toggle.isPending}
                  onClick={() => {
                    const disabling = auth.isEnable;
                    if (disabling && enabledCount <= 1 && isRequired) {
                      toast({
                        title: 'Cannot disable',
                        description: 'At least one method must remain active.',
                        variant: 'destructive',
                      });
                      return;
                    }
                    toggle.mutate({ id: auth.id, isEnable: !auth.isEnable });
                  }}
                  className={[
                    'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 border-transparent transition-colors',
                    'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                    'disabled:cursor-not-allowed disabled:opacity-50',
                    auth.isEnable ? 'bg-primary' : 'bg-input',
                  ].join(' ')}
                >
                  <span
                    className={[
                      'pointer-events-none inline-block h-4 w-4 rounded-full bg-background shadow-lg transition-transform',
                      auth.isEnable ? 'translate-x-5' : 'translate-x-0.5',
                    ].join(' ')}
                  />
                </button>
              </div>
            </div>

            {auth.code === 'Email' && auth.isEnable && (
              <div className="mt-3 pt-3 border-t border-border">
                {editingId === auth.id ? (
                  <div className="flex gap-2 items-center">
                    <Input
                      type="email"
                      value={recipientDraft}
                      onChange={(e) => setRecipientDraft(e.target.value)}
                      placeholder="OTP delivery email"
                      className="h-8 text-sm flex-1"
                    />
                    <Button
                      type="button"
                      size="sm"
                      disabled={saveRecipient.isPending || !recipientDraft.trim()}
                      onClick={() => saveRecipient.mutate({ id: auth.id, recipient: recipientDraft.trim() })}
                    >
                      {saveRecipient.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Save'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingId(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => { setEditingId(auth.id); setRecipientDraft(auth.recipient ?? ''); }}
                    className="text-xs text-primary hover:underline"
                  >
                    Change OTP email address
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-4 w-4" />
              Google Authenticator QR Code
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-2">
            {qrFetching ? (
              <div className="h-48 flex items-center justify-center">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : qrData ? (
              <>
                <img src={qrData.qrDataUri} alt="2FA QR Code" className="w-48 h-48" />
                <div className="w-full">
                  <Label className="text-xs text-muted-foreground">Manual entry key</Label>
                  <div className="mt-1 flex items-center gap-2">
                    <code className="flex-1 text-xs font-mono bg-muted px-2 py-1.5 rounded break-all">
                      {qrData.secret}
                    </code>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      title="Copy"
                      onClick={() => void navigator.clipboard.writeText(qrData.secret)}
                    >
                      Copy
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Unable to load QR code.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
