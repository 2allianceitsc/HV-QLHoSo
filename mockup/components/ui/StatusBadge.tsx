'use client';
import { TrangThaiToTrinh } from '@/types';
import { TRANG_THAI_COLOR, TRANG_THAI_LABEL } from '@/lib/utils';

export function StatusBadge({ status }: { status: TrangThaiToTrinh }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${TRANG_THAI_COLOR[status]}`}>
      <span className="w-1.5 h-1.5 rounded-full opacity-70" style={{ background: 'currentColor' }} />
      {TRANG_THAI_LABEL[status]}
    </span>
  );
}

export function ApproverName({ name, approved }: { name: string; approved: boolean }) {
  return (
    <span className="text-xs font-medium" style={{ color: approved ? 'var(--success)' : name === '—' ? 'var(--text-muted)' : 'var(--text-secondary)' }}>
      {name}
    </span>
  );
}

