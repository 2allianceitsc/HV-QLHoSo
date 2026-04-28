import { AlertTriangle, Info, XCircle, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSystemWarnings } from '@/hooks/useSystem';
import type { ISystemWarning } from '@/api/system.api';

interface Props {
  /** Filter to a specific warning category (e.g. "employees"). Omit for all. */
  category?: string;
  className?: string;
}

function severityIcon(severity: ISystemWarning['severity']) {
  switch (severity) {
    case 'error':   return <XCircle className="h-4 w-4 flex-shrink-0 text-destructive" />;
    case 'warning': return <AlertTriangle className="h-4 w-4 flex-shrink-0 text-amber-500" />;
    default:        return <Info className="h-4 w-4 flex-shrink-0 text-blue-500" />;
  }
}

function severityBg(severity: ISystemWarning['severity']) {
  switch (severity) {
    case 'error':   return 'border-destructive/30 bg-destructive/5';
    case 'warning': return 'border-amber-300/60 bg-amber-50 dark:bg-amber-950/20';
    default:        return 'border-blue-300/60 bg-blue-50 dark:bg-blue-950/20';
  }
}

export function SystemWarningsPanel({ category, className }: Props) {
  const { data: warnings, isLoading } = useSystemWarnings(category);

  if (isLoading || !warnings?.length) return null;

  return (
    <div className={`space-y-2 ${className ?? ''}`}>
      {warnings.map((w) => (
        <div
          key={w.code}
          data-testid={`warning-${w.code}`}
          data-count={w.count}
          className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-sm ${severityBg(w.severity)}`}
        >
          {severityIcon(w.severity)}
          <span className="flex-1 text-foreground">{w.message}</span>
          {w.actionUrl && (
            <Link
              to={w.actionUrl}
              className="flex items-center gap-1 whitespace-nowrap text-xs font-medium text-primary hover:underline"
            >
              Fix now <ExternalLink className="h-3 w-3" />
            </Link>
          )}
        </div>
      ))}
    </div>
  );
}
