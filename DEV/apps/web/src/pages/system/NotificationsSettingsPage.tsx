import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useBulkUpdateSettings, useSystemSettings } from '@/hooks/useSystem';
import { getApiErrorMessage } from '@/lib/apiError';

interface INotificationToggle {
  key: string;
  label: string;
  description: string;
  defaultEnabled: boolean;
}

const AUTO_LOGOUT_TOGGLES: INotificationToggle[] = [
  {
    key: 'notification.auto_logout_in_app.enabled',
    label: 'Auto-Logout In-App Alert (N-A02)',
    description: 'Immediately notify and redirect staff when the system auto-logs them out.',
    defaultEnabled: true,
  },
  {
    key: 'notification.auto_logout_email.enabled',
    label: 'Auto-Logout Email Alert',
    description: 'Queue an email alert using the auto-logout template after shift-end logout.',
    defaultEnabled: false,
  },
];

const ATTENDANCE_TOGGLES: INotificationToggle[] = [
  {
    key: 'notification.pre_logout_in_app.enabled',
    label: 'Pre-Logout Warning (N-A05)',
    description: 'Warn employees in-app before their session auto-ends. Configurable lead time below.',
    defaultEnabled: true,
  },
  {
    key: 'notification.late_arrival_in_app.enabled',
    label: 'Late Arrival Alert to Manager (N-A03)',
    description: "Notify the employee's manager when staff have not checked in after their Latest Start Time.",
    defaultEnabled: true,
  },
  {
    key: 'notification.over_break_manager_in_app.enabled',
    label: 'Over-Break Alert to Manager (N-A04)',
    description: "Notify the employee's manager when a break record is closed after exceeding its limit.",
    defaultEnabled: true,
  },
  {
    key: 'notification.absent_staff_in_app.enabled',
    label: 'Absent Staff Alert to Manager (N-A06)',
    description: "Notify the employee's manager when staff have no check-in at all today after their Latest Start Time (skipped if absent/day-off record exists).",
    defaultEnabled: true,
  },
];

const PRE_LOGOUT_MINUTES_KEY = 'notification.pre_logout_warning_minutes';

export function NotificationsSettingsPage() {
  const { toast } = useToast();
  const { data: grouped, isLoading } = useSystemSettings();
  const bulkUpdateMutation = useBulkUpdateSettings();
  const [toggles, setToggles] = useState<Record<string, boolean>>({});
  const [preLogoutMinutes, setPreLogoutMinutes] = useState('15');

  useEffect(() => {
    const notificationSettings = grouped?.notifications ?? [];

    const allToggles = [...AUTO_LOGOUT_TOGGLES, ...ATTENDANCE_TOGGLES];
    const nextState = Object.fromEntries(
      allToggles.map((toggle) => {
        const matched = notificationSettings.find((item) => item.key === toggle.key);
        return [toggle.key, matched ? matched.value === 'true' : toggle.defaultEnabled];
      }),
    );
    setToggles(nextState);

    const minutesSetting = notificationSettings.find((item) => item.key === PRE_LOGOUT_MINUTES_KEY);
    if (minutesSetting) setPreLogoutMinutes(minutesSetting.value);
  }, [grouped]);

  const handleToggle = (key: string) => {
    setToggles((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  async function handleSave() {
    const minutes = Math.max(1, Math.min(120, parseInt(preLogoutMinutes, 10) || 15));
    try {
      await bulkUpdateMutation.mutateAsync({
        ...Object.fromEntries(
          Object.entries(toggles).map(([key, value]) => [key, value ? 'true' : 'false']),
        ),
        [PRE_LOGOUT_MINUTES_KEY]: String(minutes),
      });
      toast({ title: 'Notification settings saved' });
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: getApiErrorMessage(error, 'Failed to save notification settings'),
        variant: 'destructive',
      });
    }
  }

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading notification settings...</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Notification Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure which in-app and email alerts are sent for attendance events.
          </p>
        </div>
        <Button onClick={() => void handleSave()} disabled={bulkUpdateMutation.isPending}>
          {bulkUpdateMutation.isPending ? 'Saving...' : 'Save'}
        </Button>
      </div>

      {/* Auto-Logout Channels */}
      <section className="border border-border rounded-lg divide-y divide-border">
        <div className="px-4 py-3 bg-muted/30">
          <h2 className="text-sm font-semibold text-foreground">Auto-Logout Channels</h2>
        </div>
        {AUTO_LOGOUT_TOGGLES.map((toggle) => (
          <ToggleRow key={toggle.key} toggle={toggle} value={!!toggles[toggle.key]} onToggle={handleToggle} />
        ))}
      </section>

      {/* Attendance Event Alerts */}
      <section className="border border-border rounded-lg divide-y divide-border">
        <div className="px-4 py-3 bg-muted/30">
          <h2 className="text-sm font-semibold text-foreground">Attendance Event Alerts</h2>
        </div>
        {ATTENDANCE_TOGGLES.map((toggle) => (
          <ToggleRow key={toggle.key} toggle={toggle} value={!!toggles[toggle.key]} onToggle={handleToggle} />
        ))}

        {/* Pre-logout warning minutes — only shown when pre-logout is enabled */}
        {toggles['notification.pre_logout_in_app.enabled'] && (
          <div className="flex items-center justify-between px-4 py-4">
            <div className="flex-1 min-w-0 pr-4">
              <p className="text-sm font-medium text-foreground">Pre-Logout Warning Lead Time</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                How many minutes before auto-logout to send the warning (1–120).
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={1}
                max={120}
                value={preLogoutMinutes}
                onChange={(e) => setPreLogoutMinutes(e.target.value)}
                className="w-20 text-right"
              />
              <span className="text-sm text-muted-foreground">min</span>
            </div>
          </div>
        )}
      </section>

      <div className="rounded-lg border border-border bg-muted/20 px-4 py-3 text-xs text-muted-foreground space-y-1">
        <p>Auto-logout can be globally enabled or disabled from System Settings.</p>
        <p>Email content is managed from the Email Templates screen using the auto-logout template.</p>
        <p>N-A01 (break countdown animation on dashboard) and N-A02 (auto-logout redirect) run independently of these settings.</p>
      </div>
    </div>
  );
}

interface IToggleRowProps {
  toggle: INotificationToggle;
  value: boolean;
  onToggle: (key: string) => void;
}

function ToggleRow({ toggle, value, onToggle }: IToggleRowProps) {
  return (
    <div className="flex items-center justify-between px-4 py-4">
      <div className="flex-1 min-w-0 pr-4">
        <p className="text-sm font-medium text-foreground">{toggle.label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{toggle.description}</p>
      </div>
      <button
        role="switch"
        aria-checked={value}
        onClick={() => onToggle(toggle.key)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${
          value ? 'bg-primary' : 'bg-muted-foreground/30'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            value ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}
