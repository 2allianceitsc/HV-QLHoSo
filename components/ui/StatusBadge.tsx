'use client';
import { TrangThaiToTrinh } from '@/types';
import { TRANG_THAI_COLOR, TRANG_THAI_LABEL } from '@/lib/utils';

export function StatusBadge({ status }: { status: TrangThaiToTrinh }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${TRANG_THAI_COLOR[status]}`}>
      {TRANG_THAI_LABEL[status]}
    </span>
  );
}

export function ApproverName({ name, approved }: { name: string; approved: boolean }) {
  return (
    <span className="text-sm font-medium" style={{ color: approved ? 'var(--success)' : 'var(--danger)' }}>
      {name}
    </span>
  );
}
