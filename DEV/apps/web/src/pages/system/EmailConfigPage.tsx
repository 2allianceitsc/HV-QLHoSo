import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { getApiErrorMessage } from '@/lib/apiError';
import {
  useEmailConfigs,
  useEmailConfig,
  useCreateEmailConfig,
  useUpdateEmailConfig,
  useActivateEmailConfig,
  useDeactivateEmailConfig,
  useDeleteEmailConfig,
  useSendTestEmail,
} from '@/hooks/useSystem';
import type { IEmailProviderConfig, ICreateEmailConfigDto, IUpdateEmailConfigDto } from '@/api/system.api';

// ── Constants ─────────────────────────────────────────────────────────────────

const PROVIDERS = [
  { value: 'smtp',      label: 'SMTP',       hint: 'Gmail, Outlook, any SMTP relay' },
  { value: 'sendgrid',  label: 'SendGrid',   hint: 'Twilio SendGrid API' },
  { value: 'mailgun',   label: 'Mailgun',    hint: 'Mailgun HTTP API' },
  { value: 'resend',    label: 'Resend',     hint: 'Resend.com API' },
];

// ── Config JSON helpers ───────────────────────────────────────────────────────

interface SmtpRaw { host: string; port: string; user: string; pass: string; }
interface ApiRaw  { apiKey: string; }

function emptySmtp(): SmtpRaw { return { host: 'smtp.gmail.com', port: '587', user: '', pass: '' }; }
function emptyApi(): ApiRaw   { return { apiKey: '' }; }

function parseConfig(raw: string, provider: string): SmtpRaw | ApiRaw {
  try {
    return JSON.parse(raw) as SmtpRaw | ApiRaw;
  } catch {
    return provider === 'smtp' ? emptySmtp() : emptyApi();
  }
}

// ── Provider pill ─────────────────────────────────────────────────────────────

function ProviderBadge({ provider }: { provider: string }) {
  const colors: Record<string, string> = {
    smtp:      'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    sendgrid:  'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300',
    mailgun:   'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
    resend:    'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${colors[provider] ?? 'bg-muted text-muted-foreground'}`}>
      {PROVIDERS.find((p) => p.value === provider)?.label ?? provider}
    </span>
  );
}

// ── Config form fields ────────────────────────────────────────────────────────

function SmtpFields({ raw, onChange }: { raw: SmtpRaw; onChange: (v: SmtpRaw) => void }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-1">
        <Label>Host</Label>
        <Input placeholder="smtp.gmail.com" value={raw.host} onChange={(e) => onChange({ ...raw, host: e.target.value })} />
      </div>
      <div className="space-y-1">
        <Label>Port</Label>
        <Input type="number" placeholder="587" value={raw.port} onChange={(e) => onChange({ ...raw, port: e.target.value })} />
      </div>
      <div className="space-y-1">
        <Label>Username / Email</Label>
        <Input placeholder="you@gmail.com" value={raw.user} onChange={(e) => onChange({ ...raw, user: e.target.value })} />
      </div>
      <div className="space-y-1">
        <Label>Password / App Password</Label>
        <Input type="password" placeholder="••••••••" value={raw.pass} onChange={(e) => onChange({ ...raw, pass: e.target.value })} />
      </div>
    </div>
  );
}

function ApiKeyField({ raw, onChange, provider }: { raw: ApiRaw; onChange: (v: ApiRaw) => void; provider: string }) {
  const label = PROVIDERS.find((p) => p.value === provider)?.label ?? provider;
  return (
    <div className="space-y-1">
      <Label>{label} API Key</Label>
      <Input
        type="password"
        placeholder={provider === 'sendgrid' ? 'SG.xxxx...' : 'your-api-key'}
        value={raw.apiKey}
        onChange={(e) => onChange({ apiKey: e.target.value })}
      />
    </div>
  );
}

// ── Modal (create / edit) ─────────────────────────────────────────────────────

interface ModalProps {
  editId?: string;
  onClose: () => void;
}

function ConfigModal({ editId, onClose }: ModalProps) {
  const { toast } = useToast();
  const createMutation = useCreateEmailConfig();
  const updateMutation = useUpdateEmailConfig();
  const { data: existing, isLoading } = useEmailConfig(editId ?? '');

  const isEdit = !!editId;

  const [name, setName]           = useState('');
  const [provider, setProvider]   = useState('smtp');
  const [fromName, setFromName]   = useState('HVFlow');
  const [fromEmail, setFromEmail] = useState('');
  const [note, setNote]           = useState('');
  const [smtpRaw, setSmtpRaw]     = useState<SmtpRaw>(emptySmtp());
  const [apiRaw, setApiRaw]       = useState<ApiRaw>(emptyApi());
  const [initialized, setInitialized] = useState(false);

  // Populate form once existing data loads
  if (isEdit && existing && !initialized) {
    setName(existing.name);
    setProvider(existing.provider);
    setFromName(existing.fromName);
    setFromEmail(existing.fromEmail);
    setNote(existing.note ?? '');
    const parsed = parseConfig(existing.config, existing.provider);
    if (existing.provider === 'smtp') setSmtpRaw(parsed as SmtpRaw);
    else setApiRaw(parsed as ApiRaw);
    setInitialized(true);
  }

  const configJson = provider === 'smtp'
    ? JSON.stringify(smtpRaw)
    : JSON.stringify(apiRaw);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (isEdit && editId) {
        const dto: IUpdateEmailConfigDto = { name, provider, config: configJson, fromName, fromEmail, note: note || undefined };
        await updateMutation.mutateAsync({ id: editId, dto });
        toast({ title: 'Config updated' });
      } else {
        const dto: ICreateEmailConfigDto = { name, provider, config: configJson, fromName, fromEmail, note: note || undefined };
        await createMutation.mutateAsync(dto);
        toast({ title: 'Config created' });
      }
      onClose();
    } catch (err) {
      toast({ title: 'Error', description: getApiErrorMessage(err, 'Failed to save'), variant: 'destructive' });
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  if (isEdit && isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-background rounded-lg p-8 text-sm text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4">
      <div className="bg-background rounded-lg w-full max-w-lg shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-base font-semibold">{isEdit ? 'Edit Email Config' : 'New Email Config'}</h2>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl leading-none">×</button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="p-6 space-y-4">
          {/* Name */}
          <div className="space-y-1">
            <Label htmlFor="cfg-name">Config Name <span className="text-destructive">*</span></Label>
            <Input id="cfg-name" placeholder="e.g. Gmail Corp, SendGrid Prod" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>

          {/* Provider */}
          <div className="space-y-2">
            <Label>Provider <span className="text-destructive">*</span></Label>
            <div className="flex flex-wrap gap-2">
              {PROVIDERS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setProvider(p.value)}
                  className={`px-3 py-1.5 rounded-full border text-sm font-medium transition-colors ${
                    provider === p.value
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border text-muted-foreground hover:border-foreground hover:text-foreground'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">{PROVIDERS.find((p) => p.value === provider)?.hint}</p>
          </div>

          {/* Shared: from name + email */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>From Display Name <span className="text-destructive">*</span></Label>
              <Input placeholder="HVFlow" value={fromName} onChange={(e) => setFromName(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label>
                From Email <span className="text-destructive">*</span>
                {provider !== 'smtp' && <span className="ml-1 text-xs text-muted-foreground">(verified sender)</span>}
              </Label>
              <Input type="email" placeholder="no-reply@company.com" value={fromEmail} onChange={(e) => setFromEmail(e.target.value)} required />
            </div>
          </div>

          {/* Provider-specific credentials */}
          <div className="rounded-md border border-border bg-muted/30 p-4">
            {provider === 'smtp'
              ? <SmtpFields raw={smtpRaw} onChange={setSmtpRaw} />
              : <ApiKeyField raw={apiRaw} onChange={setApiRaw} provider={provider} />
            }
          </div>

          {/* Note */}
          <div className="space-y-1">
            <Label>Note (optional)</Label>
            <Input placeholder="e.g. used for transactional emails" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isPending}>{isPending ? 'Saving...' : isEdit ? 'Update' : 'Create'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Test email popover ────────────────────────────────────────────────────────

function TestEmailPopover({ configId, configName }: { configId: string; configName: string }) {
  const { toast } = useToast();
  const testMutation = useSendTestEmail();
  const [open, setOpen] = useState(false);
  const [to, setTo] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  function handleOpen() {
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!to) return;
    try {
      await testMutation.mutateAsync({ id: configId, to });
      toast({ title: 'Test email sent', description: `Delivered to ${to} via "${configName}"` });
      setOpen(false);
      setTo('');
    } catch (err) {
      toast({
        title: 'Test failed',
        description: getApiErrorMessage(err, 'Could not send test email'),
        variant: 'destructive',
      });
    }
  }

  if (!open) {
    return (
      <Button size="sm" variant="outline" onClick={handleOpen}>
        Test
      </Button>
    );
  }

  return (
    <form onSubmit={(e) => void handleSend(e)} className="flex gap-1.5 items-center">
      <Input
        ref={inputRef}
        type="email"
        placeholder="recipient@email.com"
        value={to}
        onChange={(e) => setTo(e.target.value)}
        className="h-8 text-sm w-44"
        required
      />
      <Button type="submit" size="sm" disabled={testMutation.isPending}>
        {testMutation.isPending ? '...' : 'Send'}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="px-2"
        onClick={() => { setOpen(false); setTo(''); }}
      >
        ✕
      </Button>
    </form>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function EmailConfigPage() {
  const { toast } = useToast();
  const { data: configs = [], isLoading } = useEmailConfigs();
  const activateMutation   = useActivateEmailConfig();
  const deactivateMutation = useDeactivateEmailConfig();
  const deleteMutation     = useDeleteEmailConfig();
  const updateMutation     = useUpdateEmailConfig();

  const [showModal, setShowModal]   = useState(false);
  const [editId, setEditId]         = useState<string | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<IEmailProviderConfig | null>(null);

  async function handleActivate(id: string) {
    try {
      await activateMutation.mutateAsync(id);
      toast({ title: 'Active provider updated' });
    } catch (err) {
      toast({ title: 'Error', description: getApiErrorMessage(err, 'Failed to activate'), variant: 'destructive' });
    }
  }

  async function handleDeactivate(id: string) {
    try {
      await deactivateMutation.mutateAsync(id);
      toast({ title: 'Provider deactivated', description: 'No emails will be sent until another provider is set active.' });
    } catch (err) {
      toast({ title: 'Error', description: getApiErrorMessage(err, 'Failed to deactivate'), variant: 'destructive' });
    }
  }

  async function handleToggleDisable(cfg: IEmailProviderConfig) {
    if (cfg.isActive) {
      toast({ title: 'Cannot disable active provider', description: 'Set another config as active first.', variant: 'destructive' });
      return;
    }
    try {
      await updateMutation.mutateAsync({ id: cfg.id, dto: { isDisabled: !cfg.isDisabled } });
      toast({ title: cfg.isDisabled ? 'Provider enabled' : 'Provider disabled' });
    } catch (err) {
      toast({ title: 'Error', description: getApiErrorMessage(err, 'Failed to update'), variant: 'destructive' });
    }
  }

  function handleRequestDelete(config: IEmailProviderConfig) {
    if (config.isActive) {
      toast({ title: 'Cannot delete active provider', description: 'Set another config as active first.', variant: 'destructive' });
      return;
    }
    setDeleteTarget(config);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      toast({ title: 'Config deleted' });
    } catch (err) {
      toast({ title: 'Error', description: getApiErrorMessage(err, 'Failed to delete'), variant: 'destructive' });
    } finally {
      setDeleteTarget(null);
    }
  }

  function openCreate() { setEditId(undefined); setShowModal(true); }
  function openEdit(id: string) { setEditId(id); setShowModal(true); }
  function closeModal() { setShowModal(false); setEditId(undefined); }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Email Providers</h1>
          <p className="text-sm text-muted-foreground">
            Configure multiple email providers. Only the <strong>active</strong> one is used for sending.
          </p>
        </div>
        <Button onClick={openCreate}>+ Add Provider</Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : configs.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-10 text-center">
          <p className="text-sm text-muted-foreground mb-3">No email providers configured yet.</p>
          <Button variant="outline" onClick={openCreate}>Add your first provider</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {configs.map((cfg) => (
            <div
              key={cfg.id}
              className={`rounded-lg border p-4 flex flex-col sm:flex-row sm:items-center gap-3 transition-colors ${
                cfg.isActive
                  ? 'border-primary/50 bg-primary/5'
                  : 'border-border bg-card'
              }`}
            >
              {/* Active indicator */}
              <div className="flex-shrink-0">
                {cfg.isActive ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                    Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-xs">
                    Inactive
                  </span>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm">{cfg.name}</span>
                  <ProviderBadge provider={cfg.provider} />
                  {cfg.isDisabled && (
                    <span className="text-xs text-destructive">(disabled)</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  From: {cfg.fromName} &lt;{cfg.fromEmail}&gt;
                  {cfg.note && <span className="ml-2">· {cfg.note}</span>}
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-2 flex-shrink-0 flex-wrap items-center">
                <TestEmailPopover configId={cfg.id} configName={cfg.name} />
                {cfg.isActive ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-muted-foreground"
                    onClick={() => void handleDeactivate(cfg.id)}
                    disabled={deactivateMutation.isPending}
                  >
                    Deactivate
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void handleActivate(cfg.id)}
                    disabled={activateMutation.isPending || cfg.isDisabled}
                    title={cfg.isDisabled ? 'Enable this provider before activating' : undefined}
                  >
                    Set Active
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => openEdit(cfg.id)}>
                  Edit
                </Button>
                {!cfg.isActive && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className={cfg.isDisabled
                      ? 'text-muted-foreground hover:text-foreground'
                      : 'text-warning hover:text-warning hover:bg-warning/10'}
                    onClick={() => void handleToggleDisable(cfg)}
                    disabled={updateMutation.isPending}
                  >
                    {cfg.isDisabled ? 'Enable' : 'Disable'}
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => handleRequestDelete(cfg)}
                  disabled={deleteMutation.isPending || cfg.isActive}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && <ConfigModal editId={editId} onClose={closeModal} />}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Confirm Delete"
        description={`Are you sure you want to delete "${deleteTarget?.name ?? ''}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
