/**
 * nav.config.tsx — Sidebar navigation configuration (HV-QLHoSo)
 *
 * Visibility logic (in AppLayout.tsx):
 *   1. `screen` present → checked against DB permission matrix (VIEW action).
 *   2. `roles` present  → legacy role-based check against user.roles[].
 *   3. Neither          → visible to all authenticated users.
 *
 * HV role → legacy role mapping (until hvRole lands in JWT):
 *   staff    ≈ EMPLOYEE
 *   reviewer ≈ MANAGER
 *   approver ≈ HR_ADMIN
 *   admin    ≈ SUPER_ADMIN
 */

import {
  FileText,
  BarChart2,
  DollarSign,
  FileCheck2,
  Users,
  Building2,
  Tag,
  ShieldCheck,
  ScrollText,
  Sliders,
  Bell,
  Layers,
} from 'lucide-react';

export type AppRole = 'EMPLOYEE' | 'MANAGER' | 'HR_ADMIN' | 'SUPER_ADMIN';
export type HvRoleNav = 'staff' | 'reviewer' | 'approver' | 'admin';

export interface INavItemConfig {
  label: string;
  path: string;
  icon: React.ReactNode;
  end?: boolean;
  screen?: string;
  roles?: AppRole[];
  hvRoles?: HvRoleNav[];
}

export interface INavGroupConfig {
  label?: string;
  roles?: AppRole[];
  hvRoles?: HvRoleNav[];
  items: INavItemConfig[];
}

// ─── Main nav ─────────────────────────────────────────────────────────────────

export const NAV_GROUPS: INavGroupConfig[] = [
  {
    // Tờ trình — visible to all authenticated users
    items: [
      { label: 'Tờ trình', path: '/submissions', icon: <FileText size={16} />, end: true },
    ],
  },
  {
    label: 'Báo cáo',
    hvRoles: ['reviewer', 'approver', 'admin'],
    items: [
      { label: 'Tổng hợp',         path: '/reports',            icon: <BarChart2 size={16} />, end: true },
      { label: 'Chi tiết chi phí', path: '/reports/expenses',  icon: <DollarSign size={16} />, hvRoles: ['approver', 'admin'] },
      { label: 'Hợp đồng',        path: '/reports/contracts', icon: <FileCheck2 size={16} /> },
    ],
  },
  {
    label: 'Quản trị',
    // SUPER_ADMIN (legacy) hoặc hvRole=admin đều thấy menu này
    roles: ['SUPER_ADMIN'],
    hvRoles: ['admin'],
    items: [
      { label: 'Người dùng',      path: '/admin/users',           icon: <Users size={16} /> },
      { label: 'Bộ phận',         path: '/admin/departments',     icon: <Building2 size={16} /> },
      { label: 'Mã phí',          path: '/admin/cost-codes',      icon: <Tag size={16} /> },
      { label: 'Trạng thái',       path: '/admin/submission-statuses', icon: <Layers size={16} /> },
      { label: 'Phân quyền theo loại CP', path: '/admin/approval-rules', icon: <ShieldCheck size={16} /> },
    ],
  },
  {
    label: 'Hệ thống',
    roles: ['SUPER_ADMIN'],
    items: [
      { label: 'Nhật ký',        path: '/system/logs',            icon: <ScrollText size={16} />, screen: 'SY04' },
      { label: 'Cài đặt',        path: '/system/settings',        icon: <Sliders size={16} />,    screen: 'SY02' },
      { label: 'Kênh thông báo', path: '/system/notification-channels', icon: <Bell size={16} />,  roles: ['SUPER_ADMIN'] },
    ],
  },
  {
    label: 'Tài khoản',
    items: [
      { label: 'Thông báo', path: '/notifications', icon: <Bell size={16} /> },
    ],
  },
];
