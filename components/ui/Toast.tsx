'use client';
import { useEffect } from 'react';
import { Mail, X, CheckCircle, AlertTriangle, Info } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { AppNotification } from '@/types';

export default function Toast() {
  const { notifications, removeNotification } = useStore();
  if (notifications.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {notifications.map(n => (
        <ToastItem key={n.id} notification={n} onRemove={removeNotification} />
      ))}
    </div>
  );
}

function ToastItem({ notification, onRemove }: { notification: AppNotification; onRemove: (id: string) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onRemove(notification.id), 4000);
    return () => clearTimeout(timer);
  }, [notification.id, onRemove]);

  const config = {
    success: { bg: 'var(--success-muted)', color: 'var(--success)', Icon: CheckCircle },
    warning: { bg: 'var(--warning-muted)', color: 'var(--warning)', Icon: AlertTriangle },
    info:    { bg: 'var(--primary-muted)', color: 'var(--primary)', Icon: Info },
  }[notification.type];

  return (
    <div
      className="flex items-start gap-3 px-4 py-3 rounded-xl shadow-lg pointer-events-auto max-w-sm animate-slide-up"
      style={{
        background: config.bg,
        border: `1px solid color-mix(in srgb, ${config.color} 35%, transparent)`,
      }}
    >
      <Mail size={15} style={{ color: config.color }} className="mt-0.5 flex-shrink-0" />
      <p className="text-sm flex-1 leading-snug" style={{ color: 'var(--text-primary)' }}>
        {notification.message}
      </p>
      <button
        onClick={() => onRemove(notification.id)}
        className="flex-shrink-0 hover:opacity-70 transition-opacity"
        style={{ color: 'var(--text-muted)' }}
      >
        <X size={14} />
      </button>
    </div>
  );
}
