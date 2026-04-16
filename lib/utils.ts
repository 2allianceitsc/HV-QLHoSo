import { ToTrinh, TrangThaiToTrinh } from '@/types';
import { MOCK_USERS, MOCK_MA_PHI, PHAN_QUYEN_DUYET } from './mockData';

export function getUserById(id: string) {
  return MOCK_USERS.find(u => u.id === id);
}

export function getMaPhiByMa(ma: string) {
  return MOCK_MA_PHI.find(mp => mp.ma === ma);
}

export function getPhanQuyenDuyet(boPhan: string) {
  return PHAN_QUYEN_DUYET.find(p => p.boPhan === boPhan) ?? PHAN_QUYEN_DUYET[0];
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function today(): string {
  return new Date().toISOString().split('T')[0];
}

export function genMaToTrinh(loai: 'MS' | 'NT', existing: ToTrinh[]): string {
  const prefix = loai === 'MS' ? 'MS' : 'NT';
  const count = existing.filter(t => t.loai === loai && t.ma.startsWith(prefix)).length;
  return `${prefix}${String(count + 1).padStart(4, '0')}`;
}

export const TRANG_THAI_LABEL: Record<TrangThaiToTrinh, string> = {
  nhap: 'Nháp',
  cho_duyet: 'Chờ thẩm định',
  tham_dinh: 'Chờ phê duyệt',
  phe_duyet: 'Đã phê duyệt',
  tu_choi: 'Từ chối',
};

export const TRANG_THAI_COLOR: Record<TrangThaiToTrinh, string> = {
  nhap: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  cho_duyet: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400',
  tham_dinh: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
  phe_duyet: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
  tu_choi: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
};

export function getInitials(name: string): string {
  return name.split(' ').slice(-2).map(w => w[0]).join('').toUpperCase();
}
