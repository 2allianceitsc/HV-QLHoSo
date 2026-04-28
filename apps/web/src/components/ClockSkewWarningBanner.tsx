import { useState } from 'react';
import { AlertTriangle, X, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';

function detectOS(): 'windows' | 'mac' | 'linux' | 'other' {
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes('win')) return 'windows';
  if (ua.includes('mac')) return 'mac';
  if (ua.includes('linux')) return 'linux';
  return 'other';
}

const FIX_STEPS: Record<'windows' | 'mac' | 'linux' | 'other', { label: string; steps: string[] }> = {
  windows: {
    label: 'Windows',
    steps: [
      'Right-click the clock on the taskbar → "Adjust date/time"',
      'Turn on "Set time automatically"',
      'Click "Sync now" under "Synchronise your clock"',
    ],
  },
  mac: {
    label: 'macOS',
    steps: [
      'Apple menu → System Settings → General → Date & Time',
      'Enable "Set time and date automatically"',
      'Select a time server (e.g. time.apple.com)',
    ],
  },
  linux: {
    label: 'Linux',
    steps: [
      'Run: sudo timedatectl set-ntp true',
      'Verify: timedatectl status',
    ],
  },
  other: {
    label: 'Your device',
    steps: [
      'Open your device date/time settings',
      'Enable automatic time synchronisation',
    ],
  },
};

function fmtTime(ms: number): string {
  return new Date(ms).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
}

export function ClockSkewWarningBanner() {
  const clockSkewMs = useAuthStore((s) => s.clockSkewMs);
  const clockSkewWarningMs = useAuthStore((s) => s.clockSkewWarningMs);
  const clockSyncClientMs = useAuthStore((s) => s.clockSyncClientMs);
  const clockSyncServerMs = useAuthStore((s) => s.clockSyncServerMs);
  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(false);

  if (dismissed) return null;
  if (clockSkewMs === null) return null;
  if (Math.abs(clockSkewMs) <= clockSkewWarningMs) return null;

  const direction = clockSkewMs < 0 ? 'behind' : 'ahead of';
  const absSec = (Math.abs(clockSkewMs) / 1000).toFixed(1);
  const os = detectOS();
  const fix = FIX_STEPS[os];

  const clientTimeStr = clockSyncClientMs !== null ? fmtTime(clockSyncClientMs) : '—';
  const serverTimeStr = clockSyncServerMs !== null ? fmtTime(clockSyncServerMs) : '—';

  return (
    <div className="border-b border-yellow-300 bg-yellow-50 px-4 py-2 text-sm text-yellow-800">
      <div className="flex items-center gap-3">
        <AlertTriangle className="h-4 w-4 shrink-0 text-yellow-600" />
        <span className="flex-1">
          Your computer clock is <strong>{absSec}s {direction}</strong> the server — time-sensitive features may behave unexpectedly.{' '}
          <span className="text-yellow-700">
            Client: <strong>{clientTimeStr}</strong> · Server: <strong>{serverTimeStr}</strong>
          </span>
        </span>
        <button
          type="button"
          onClick={() => setExpanded((p) => !p)}
          className="flex items-center gap-1 shrink-0 rounded px-2 py-0.5 text-xs font-medium hover:bg-yellow-100 transition-colors"
        >
          How to fix
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="shrink-0 rounded p-0.5 hover:bg-yellow-100"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {expanded && (
        <div className="mt-2 ml-7 space-y-1">
          <p className="text-xs font-semibold text-yellow-700">Steps for {fix.label}:</p>
          <ol className="list-decimal list-inside space-y-0.5">
            {fix.steps.map((step, i) => (
              <li key={i} className="text-xs text-yellow-700">{step}</li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
