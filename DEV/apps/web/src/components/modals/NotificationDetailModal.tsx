import { X } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import type { INotification } from '@/api/notifications.api';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

interface IProps {
  notification: INotification;
  onClose: () => void;
}

function isAutoLogoutRedirectLink(link: string | null): boolean {
  return typeof link === 'string' && link.startsWith('/login?reason=auto-logout');
}

// Keep in sync with TYPE_BADGE_CLASS in NotificationsInboxPage.tsx —
// list and detail must show the same color tone for the same type.
const TYPE_BADGE_MAP: Record<string, string> = {
  info: 'bg-blue-100 text-blue-700 border-blue-200',
  warning: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  alert: 'bg-red-100 text-red-700 border-red-200',
};

export function NotificationDetailModal({ notification, onClose }: IProps) {
  const navigate = useNavigate();
  const canNavigate = !!notification.link && !isAutoLogoutRedirectLink(notification.link);

  const handleNavigate = () => {
    if (canNavigate && notification.link) {
      onClose();
      void navigate(notification.link);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md bg-card rounded-xl shadow-xl border border-border flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="shrink-0 flex items-start justify-between p-5 border-b border-border">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span
              className={cn(
                'px-2 py-0.5 text-xs font-medium rounded border',
                TYPE_BADGE_MAP[notification.type] ?? TYPE_BADGE_MAP['info'],
              )}
            >
              {notification.type}
            </span>
            <h2 className="text-base font-semibold text-foreground truncate">{notification.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="ml-2 text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-4">
          <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{notification.body}</p>

          <p className="text-xs text-muted-foreground">
            {format(new Date(notification.logCreatedAt), 'PPpp')}
          </p>

          {isAutoLogoutRedirectLink(notification.link) && (
            <p className="text-xs text-muted-foreground">
              This auto-logout notification is kept for audit/history only and does not have a detail page.
            </p>
          )}

          {canNavigate && notification.link && (
            <Button variant="outline" size="sm" onClick={handleNavigate} className="w-full">
              View details
            </Button>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 flex justify-end px-5 pb-4 pt-3 border-t border-border">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
