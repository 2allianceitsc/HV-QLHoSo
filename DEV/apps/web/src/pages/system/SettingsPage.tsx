import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormTextField } from '@/components/form/FormTextField';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { usePersistentState } from '@/hooks/usePersistentState';
import { useSystemSettings, useBulkUpdateSettings, useSystemRoles } from '@/hooks/useSystem';
import { useCompanies } from '@/hooks/useCompany';
import type { ISystemSetting } from '@/api/system.api';
import { getApiErrorMessage } from '@/lib/apiError';
import { safeArray } from '@/lib/safeArray';
import { INPUT_LENGTH } from '@shared/constants/input-length';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { NotificationsSettingsPage } from './NotificationsSettingsPage';

interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicUrl: string;
}

const R2_FIELDS: { key: keyof R2Config; label: string; placeholder: string; secret?: boolean }[] = [
  { key: 'accountId',        label: 'Account ID',        placeholder: 'a0d87bc2...' },
  { key: 'accessKeyId',      label: 'Access Key ID',     placeholder: '69a97850...' },
  { key: 'secretAccessKey',  label: 'Secret Access Key', placeholder: '••••••••', secret: true },
  { key: 'bucket',           label: 'Bucket Name',       placeholder: 'hvflow' },
  { key: 'publicUrl',        label: 'Public URL',        placeholder: 'https://pub-xxx.r2.dev' },
];

function parseR2(raw: string): R2Config {
  try { return JSON.parse(raw) as R2Config; } catch { return { accountId: '', accessKeyId: '', secretAccessKey: '', bucket: '', publicUrl: '' }; }
}

function isBooleanSetting(value: string | undefined): boolean {
  return value === 'true' || value === 'false';
}

function toTestIdSegment(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function AuthenticatorSelect({
  value,
  onChange,
  testId,
}: {
  value: string;
  onChange: (v: string) => void;
  testId: string;
}) {
  return (
    <select
      data-testid={testId}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
    >
      <option value="Google">Google (Authenticator App)</option>
      <option value="Email">Email OTP</option>
    </select>
  );
}

function R2ConfigFields({
  raw,
  onChange,
  baseTestId,
}: {
  raw: string;
  onChange: (json: string) => void;
  baseTestId: string;
}) {
  const config = parseR2(raw);
  function update(field: keyof R2Config, value: string) {
    onChange(JSON.stringify({ ...config, [field]: value }));
  }
  return (
    <div className="col-span-2 grid gap-3 sm:grid-cols-2">
      {R2_FIELDS.map((f) => (
        <div key={f.key} className="space-y-1">
          <Label htmlFor={`r2-${f.key}`}>{f.label}</Label>
          <Input
            id={`r2-${f.key}`}
            data-testid={`${baseTestId}-${toTestIdSegment(f.key)}`}
            type={f.secret ? 'password' : 'text'}
            placeholder={f.placeholder}
            value={config[f.key] ?? ''}
            onChange={(e) => update(f.key, e.target.value)}
          />
        </div>
      ))}
    </div>
  );
}

function CompanyPicker({
  value,
  onChange,
  testId,
}: {
  value: string;
  onChange: (id: string) => void;
  testId: string;
}) {
  const { data } = useCompanies({ limit: 100 });
  const companies = safeArray(data?.data);
  const selected = companies.find((c) => c.id === value);

  return (
    <div className="flex items-center gap-3">
      <select
        data-testid={testId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        <option value="">— None (hide logo) —</option>
        {companies.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>
      {selected?.logoUrl && (
        <img
          src={selected.logoUrl}
          alt={selected.name}
          className="h-9 w-9 rounded border border-border object-contain flex-shrink-0"
        />
      )}
    </div>
  );
}

const BRANDING_KEYS = ['APP_LOGO_BASE64', 'APP_FAVICON_BASE64', 'ESC_LOGO_BASE64'] as const;

// ── CLIENT role code — always excluded from MoodLog ───────────────────────────
const CLIENT_ROLE = 'CLIENT';

const DEFAULT_MOOD_LOG_ROLES = ['EMPLOYEE', 'MANAGER', 'HR_ADMIN', 'SUPER_ADMIN'];

function parseLogoutConfig(raw: string | undefined): string[] {
  if (!raw) return DEFAULT_MOOD_LOG_ROLES;
  try {
    const parsed = JSON.parse(raw) as { MoodLogRoles?: string[] };
    return Array.isArray(parsed.MoodLogRoles) ? parsed.MoodLogRoles : DEFAULT_MOOD_LOG_ROLES;
  } catch {
    return DEFAULT_MOOD_LOG_ROLES;
  }
}

function LogoutConfigTab() {
  const { toast } = useToast();
  const { data: grouped, isLoading: settingsLoading } = useSystemSettings();
  const { data: rolesData, isLoading: rolesLoading } = useSystemRoles();
  const bulkUpdateMutation = useBulkUpdateSettings();
  const queryClient = useQueryClient();

  const roles = safeArray(rolesData).filter((r) => r.name !== CLIENT_ROLE);

  const [checkedRoles, setCheckedRoles] = useState<Set<string>>(new Set(DEFAULT_MOOD_LOG_ROLES));

  useEffect(() => {
    const notifSettings = safeArray(grouped?.notifications);
    const attendanceSettings = safeArray(grouped?.attendance);
    const raw = [...notifSettings, ...attendanceSettings].find((s) => s.key === 'logout_config')?.value;
    setCheckedRoles(new Set(parseLogoutConfig(raw)));
  }, [grouped]);

  const toggleRole = (roleName: string) => {
    setCheckedRoles((prev) => {
      const next = new Set(prev);
      if (next.has(roleName)) next.delete(roleName);
      else next.add(roleName);
      return next;
    });
  };

  const handleSave = async () => {
    const config = JSON.stringify({ MoodLogRoles: [...checkedRoles] });
    try {
      await bulkUpdateMutation.mutateAsync({ logout_config: config });
      await queryClient.invalidateQueries({ queryKey: ['public-config'] });
      toast({ title: 'Logout settings saved' });
    } catch (err: unknown) {
      toast({ title: 'Error', description: getApiErrorMessage(err, 'Failed to save'), variant: 'destructive' });
    }
  };

  if (settingsLoading || rolesLoading) {
    return <p className="text-sm text-muted-foreground">Loading...</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Mood Log Roles</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Select which roles are required to submit a mood log when logging out. Roles not ticked will skip M07 and logout immediately.
          </p>
        </div>
        <Button onClick={() => void handleSave()} disabled={bulkUpdateMutation.isPending}>
          {bulkUpdateMutation.isPending ? 'Saving...' : 'Save'}
        </Button>
      </div>

      <div className="rounded-lg border border-border divide-y divide-border">
        {roles.length === 0 && (
          <p className="px-4 py-4 text-sm text-muted-foreground">No roles found.</p>
        )}
        {roles.map((role) => {
          const checked = checkedRoles.has(role.name);
          return (
            <label
              key={role.id}
              className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors"
            >
              <button
                type="button"
                role="switch"
                aria-checked={checked}
                onClick={() => toggleRole(role.name)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${
                  checked ? 'bg-primary' : 'bg-muted-foreground/30'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    checked ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{role.displayName ?? role.name}</p>
                {role.description && (
                  <p className="text-xs text-muted-foreground mt-0.5">{role.description}</p>
                )}
              </div>
              <span className="text-xs text-muted-foreground font-mono">{role.name}</span>
            </label>
          );
        })}
      </div>

      <div className="rounded-lg border border-border bg-muted/20 px-4 py-3 text-xs text-muted-foreground space-y-1">
        <p>CLIENT role is always excluded — clients never see the mood log popup.</p>
        <p>Changes take effect immediately for the next logout after saving.</p>
      </div>
    </div>
  );
}

type SettingsTab = 'general' | 'security' | 'email' | 'notifications' | 'attendance' | 'logout';

export function SystemSettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get('tab');
  
  const validTabs: SettingsTab[] = ['general', 'security', 'email', 'notifications', 'attendance', 'logout'];
  const activeTab: SettingsTab = validTabs.includes(rawTab as SettingsTab) ? (rawTab as SettingsTab) : 'general';

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value }, { replace: true });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">System Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Configure system-wide behaviour and permissions.</p>
      </div>
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="w-full flex justify-start overflow-x-auto h-auto p-1 bg-muted/50 rounded-lg border border-border">
          <TabsTrigger value="general" className="flex-shrink-0">General</TabsTrigger>
          <TabsTrigger value="security" className="flex-shrink-0">Security</TabsTrigger>
          <TabsTrigger value="email" className="flex-shrink-0">Email</TabsTrigger>
          <TabsTrigger value="notifications" className="flex-shrink-0">Notifications</TabsTrigger>
          <TabsTrigger value="attendance" className="flex-shrink-0">Attendance</TabsTrigger>
          <TabsTrigger value="logout" className="flex-shrink-0">Logout</TabsTrigger>
        </TabsList>
        
        <TabsContent value="general" className="mt-4">
          <SettingsInnerPage allowedCategories={['branding', 'display', 'system', 'general', 'storage']} />
        </TabsContent>
        <TabsContent value="security" className="mt-4">
          <SettingsInnerPage allowedCategories={['security']} hideCategoriesSidebar />
        </TabsContent>
        <TabsContent value="email" className="mt-4">
          <SettingsInnerPage allowedCategories={['email']} hideCategoriesSidebar />
        </TabsContent>
        <TabsContent value="notifications" className="mt-4 space-y-8">
          <SettingsInnerPage allowedCategories={['notifications']} hideCategoriesSidebar />
          <NotificationsSettingsPage />
        </TabsContent>
        <TabsContent value="attendance" className="mt-4">
          <SettingsInnerPage allowedCategories={['attendance']} hideCategoriesSidebar />
        </TabsContent>
        <TabsContent value="logout" className="mt-4">
          <LogoutConfigTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SettingsInnerPage({ allowedCategories, hideCategoriesSidebar }: { allowedCategories?: string[]; hideCategoriesSidebar?: boolean }) {
  const { toast } = useToast();
  const { data: grouped, isLoading } = useSystemSettings();
  const bulkUpdateMutation = useBulkUpdateSettings();
  const queryClient = useQueryClient();

  const [localValues, setLocalValues] = useState<Record<string, string>>({});
  const [selectedCategory, setSelectedCategory] = usePersistentState<string>('hvflow.system-settings.category', '');
  const [searchTerm, setSearchTerm] = usePersistentState<string>('hvflow.system-settings.search', '');

  const categoryEntries = useMemo(() => {
    if (!grouped) return [] as Array<[string, ISystemSetting[]]>;
    let entries = Object.entries(grouped);
    if (allowedCategories && allowedCategories.length > 0) {
      entries = entries.filter(([category]) => allowedCategories.includes(category));
    }
    return entries
      .map(([category, settings]) => [category, safeArray(settings)] as [string, ISystemSetting[]])
      .filter(([, settings]) => settings.length > 0);
  }, [grouped, allowedCategories]);

  const filteredCategoryEntries = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    if (!keyword) return categoryEntries;

    return categoryEntries
      .map(([category, settings]) => {
        const filtered = settings.filter((s) => {
          const haystack = `${s.key} ${s.description ?? ''} ${s.value ?? ''}`.toLowerCase();
          return haystack.includes(keyword);
        });
        return [category, filtered] as [string, ISystemSetting[]];
      })
      .filter(([, settings]) => settings.length > 0);
  }, [categoryEntries, searchTerm]);

  useEffect(() => {
    if (!grouped) return;
    const flat: Record<string, string> = {};
    for (const settings of Object.values(grouped)) {
      if (!Array.isArray(settings)) continue;
      for (const s of settings) {
        flat[s.key] = s.value;
      }
    }
    setLocalValues(flat);
  }, [grouped]);

  useEffect(() => {
    if (filteredCategoryEntries.length === 0) {
      setSelectedCategory('');
      return;
    }
    const exists = filteredCategoryEntries.some(([category]) => category === selectedCategory);
    if (!exists) setSelectedCategory(filteredCategoryEntries[0][0]);
  }, [filteredCategoryEntries, selectedCategory]);

  const activeCategorySettings = filteredCategoryEntries.find(([category]) => category === selectedCategory)?.[1] ?? [];

  function formatCategoryTitle(category: string): string {
    return category
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  const handleSaveAll = useCallback(async () => {
    const brandingChanged = BRANDING_KEYS.some((k) => {
      const orig = grouped ? Object.values(grouped).flat().find((s) => s.key === k)?.value ?? '' : '';
      return localValues[k] !== undefined && localValues[k] !== orig;
    });

    try {
      await bulkUpdateMutation.mutateAsync(localValues);
      if (brandingChanged) {
        await queryClient.invalidateQueries({ queryKey: ['public-config'] });
      }
      toast({ title: 'Settings saved' });
    } catch (err: unknown) {
      toast({ title: 'Error', description: getApiErrorMessage(err, 'Failed to save'), variant: 'destructive' });
    }
  }, [bulkUpdateMutation, grouped, localValues, queryClient, toast]);

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading settings...</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <p className="text-sm text-muted-foreground">Settings are grouped by module so you can scan and edit faster.</p>
        <Button
          data-testid="system-settings-save-all-btn"
          onClick={() => void handleSaveAll()}
          disabled={bulkUpdateMutation.isPending}
          className="sm:min-w-[140px]"
        >
          {bulkUpdateMutation.isPending ? 'Saving...' : 'Save All'}
        </Button>
      </div>

      {!grouped || Object.keys(grouped).length === 0 ? (
        <p className="text-sm text-muted-foreground">No settings configured.</p>
      ) : (
        <div className="space-y-4">
          <Input
            data-testid="system-settings-search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by key, description, or current value..."
          />

          {filteredCategoryEntries.length === 0 ? (
            <div className="rounded-lg border border-border p-8 text-center text-sm text-muted-foreground">
              No settings match your search.
            </div>
          ) : (
            <div className={hideCategoriesSidebar ? "block" : "grid gap-6 lg:grid-cols-[260px_1fr]"}>
              {!hideCategoriesSidebar && (
                <aside className="rounded-lg border border-border p-3 h-fit">
                  <p className="px-2 pb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Categories</p>
                  <div className="space-y-1">
                    {filteredCategoryEntries.map(([category, settings]) => {
                      const active = category === selectedCategory;
                      return (
                        <button
                          data-testid={`system-settings-category-${toTestIdSegment(category)}-btn`}
                          key={category}
                          type="button"
                          onClick={() => setSelectedCategory(category)}
                          className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${
                            active
                              ? 'bg-primary text-primary-foreground'
                              : 'hover:bg-muted text-foreground'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span className="font-medium">{formatCategoryTitle(category)}</span>
                            <span className={`text-xs ${active ? 'text-primary-foreground/90' : 'text-muted-foreground'}`}>
                              {settings.length}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </aside>
              )}

              <section className="rounded-lg border border-border p-4 sm:p-6 space-y-4">
                <div className="border-b border-border pb-3">
                  <h2 className="text-lg font-semibold">{formatCategoryTitle(selectedCategory)}</h2>
                  <p className="text-xs text-muted-foreground mt-1">{activeCategorySettings.length} settings</p>
                </div>

                <div className="space-y-3">
                  {activeCategorySettings.map((s: ISystemSetting) => (
                    <div key={s.key} className="rounded-md border border-border p-3 sm:p-4">
                      <div className="grid gap-3 md:grid-cols-[1fr_340px] md:items-start">
                        <div className="space-y-1">
                          <Label htmlFor={s.key} className="text-sm font-medium">
                            {s.description ?? s.key}
                          </Label>
                          <p className="text-xs text-muted-foreground break-all">{s.key}</p>
                        </div>

                        <div>
                          {s.key === 'twofa.authenticators' ? (
                            <AuthenticatorSelect
                              testId={`system-setting-${toTestIdSegment(s.key)}-select`}
                              value={localValues[s.key] ?? 'Google'}
                              onChange={(v) => setLocalValues((prev) => ({ ...prev, [s.key]: v }))}
                            />
                          ) : s.key === 'twofa.whitelist' ? (
                            <FormTextField
                              id={s.key}
                              label={s.description ?? s.key}
                              hideLabel
                              data-testid={`system-setting-${toTestIdSegment(s.key)}-textarea`}
                              multiline
                              rows={3}
                              value={localValues[s.key] ?? ''}
                              onChange={(e) => setLocalValues((prev) => ({ ...prev, [s.key]: e.target.value }))}
                              placeholder="username1, username2, user@email.com (comma-separated)"
                              current={localValues[s.key] ?? ''}
                              maxLength={INPUT_LENGTH.text}
                              fieldClassName="min-h-[72px] bg-transparent shadow-sm focus-visible:ring-1"
                            />
                          ) : s.key === 'twofa.gg_secret_key' ? (
                            <FormTextField
                              id={s.key}
                              label={s.description ?? s.key}
                              hideLabel
                              data-testid={`system-setting-${toTestIdSegment(s.key)}-input`}
                              type="password"
                              value={localValues[s.key] ?? ''}
                              onChange={(e) => setLocalValues((prev) => ({ ...prev, [s.key]: e.target.value }))}
                              placeholder="Base32-encoded system secret"
                              current={localValues[s.key] ?? ''}
                              maxLength={INPUT_LENGTH.code}
                            />
                          ) : s.key === 'LOGIN_COMPANY_ID' ? (
                            <CompanyPicker
                              testId={`system-setting-${toTestIdSegment(s.key)}-select`}
                              value={localValues[s.key] ?? ''}
                              onChange={(id) => setLocalValues((prev) => ({ ...prev, [s.key]: id }))}
                            />
                          ) : s.key === 'storage.r2' ? (
                            <R2ConfigFields
                              baseTestId={`system-setting-${toTestIdSegment(s.key)}-input`}
                              raw={localValues[s.key] ?? '{}'}
                              onChange={(json) => setLocalValues((prev) => ({ ...prev, [s.key]: json }))}
                            />
                          ) : s.key === 'APP_LOGO_BASE64' || s.key === 'APP_FAVICON_BASE64' ? (
                            <div className="flex gap-2 items-center">
                              <Input
                                id={s.key}
                                data-testid={`system-setting-${toTestIdSegment(s.key)}-file-input`}
                                type="file"
                                accept="image/*"
                                className="flex-1"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  const reader = new FileReader();
                                  reader.onload = (ev) => {
                                    if (ev.target?.result && typeof ev.target.result === 'string') {
                                      setLocalValues((prev) => ({ ...prev, [s.key]: ev.target!.result as string }));
                                    }
                                  };
                                  reader.readAsDataURL(file);
                                }}
                              />
                              {localValues[s.key] && (
                                <div className="h-9 w-9 relative shadow-sm rounded border border-border flex-shrink-0 bg-white/20">
                                  <img src={localValues[s.key]} alt="preview" className="object-contain w-full h-full" />
                                </div>
                              )}
                              {localValues[s.key] && (
                                <Button
                                  data-testid={`system-setting-${toTestIdSegment(s.key)}-clear-btn`}
                                  variant="ghost"
                                  size="sm"
                                  className="px-2 text-destructive text-xs"
                                  onClick={() => setLocalValues((prev) => ({ ...prev, [s.key]: '' }))}
                                >
                                  Clear
                                </Button>
                              )}
                            </div>
                          ) : (
                            isBooleanSetting(localValues[s.key]) ? (
                              <button
                                data-testid={`system-setting-${toTestIdSegment(s.key)}-switch`}
                                type="button"
                                role="switch"
                                aria-checked={localValues[s.key] === 'true'}
                                onClick={() =>
                                  setLocalValues((prev) => ({
                                    ...prev,
                                    [s.key]: prev[s.key] === 'true' ? 'false' : 'true',
                                  }))
                                }
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${
                                  localValues[s.key] === 'true' ? 'bg-primary' : 'bg-muted-foreground/30'
                                }`}
                              >
                                <span
                                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                    localValues[s.key] === 'true' ? 'translate-x-6' : 'translate-x-1'
                                  }`}
                                />
                              </button>
                            ) : (
                              <FormTextField
                                id={s.key}
                                label={s.description ?? s.key}
                                hideLabel
                                data-testid={`system-setting-${toTestIdSegment(s.key)}-input`}
                                value={localValues[s.key] ?? ''}
                                onChange={(e) =>
                                  setLocalValues((prev) => ({ ...prev, [s.key]: e.target.value }))
                                }
                                current={localValues[s.key] ?? ''}
                                maxLength={INPUT_LENGTH.text}
                              />
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
