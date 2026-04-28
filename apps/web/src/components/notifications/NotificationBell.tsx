import { useState } from 'react';
import { Bell } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '@/hooks/useNotifications';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { NotificationDetailModal } from '@/components/modals/NotificationDetailModal';
import type { INotification } from '@/api/notifications.api';
import { cn } from '@/lib/utils';

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState<INotification | null>(null);
  const navigate = useNavigate();
  const { notifications, unreadCount, handleMarkAsRead, handleMarkAllAsRead } = useNotifications();

  const displayCount = unreadCount > 9 ? '9+' : unreadCount > 0 ? String(unreadCount) : null;

  const handleItemClick = async (notification: INotification) => {
    if (!notification.isRead) {
      await handleMarkAsRead(notification.id);
    }
    setSelected(notification);
    setIsOpen(false);
  };

  const handleViewAll = () => {
    setIsOpen(false);
    void navigate('/notifications');
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => setIsOpen((p) => !p)}
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {displayCount && (
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 h-5 min-w-5 px-1 text-xs flex items-center justify-center rounded-full"
          >
            {displayCount}
          </Badge>
        )}
      </Button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full mt-2 z-20 w-96 bg-card border border-border rounded-lg shadow-xl flex flex-col max-h-[480px]">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
              <span className="font-semibold text-sm text-foreground">Notifications</span>
              {unreadCount > 0 && (
                <button
                  onClick={() => void handleMarkAllAsRead()}
                  className="text-xs text-primary hover:underline"
                >
                  Mark all read
                </button>
              )}
            </div>

            {/* List */}
            <div className="overflow-y-auto flex-1">
              {notifications.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No notifications</p>
              ) : (
                notifications.slice(0, 20).map((n) => (
                  <button
                    key={n.id}
                    onClick={() => void handleItemClick(n)}
                    className={cn(
                      'w-full text-left px-4 py-3 border-b border-border last:border-0 hover:bg-accent transition-colors',
                      !n.isRead && 'border-l-2 border-l-primary bg-primary/5',
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <TypeDot type={n.type} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{n.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(n.logCreatedAt), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2 border-t border-border flex-shrink-0">
              <button
                onClick={handleViewAll}
                className="text-xs text-primary hover:underline w-full text-center"
              >
                View all notifications
              </button>
            </div>
          </div>
        </>
      )}

      {selected && (
        <NotificationDetailModal
          notification={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

function TypeDot({ type }: { type: 'info' | 'warning' | 'alert' }) {
  const colorMap = {
    info: 'bg-blue-500',
    warning: 'bg-yellow-500',
    alert: 'bg-red-500',
  };
  return (
    <span
      className={cn('mt-1 h-2 w-2 rounded-full flex-shrink-0', colorMap[type])}
      aria-hidden
    />
  );
}
