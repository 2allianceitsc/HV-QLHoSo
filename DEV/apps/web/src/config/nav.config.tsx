/**
 * nav.config.tsx — Sidebar navigation configuration
 *
 * Visibility is determined in this order:
 *   1. `screen` field present → filter by `usePermission(screen, null, 'VIEW')`
 *      (authoritative — matches the backend permission matrix).
 *   2. `roles` field present → legacy role-based check (retained during
 *      migration; prefer `screen` for new items).
 *   3. Neither → visible to all roles.
 *
 * To hide/show a menu item, either:
 *   • Set `screen: 'SXX'` and toggle access in SY18 admin UI, OR
 *   • Remove the item from this file.
 *
 * To add a new item: append an entry with `screen` set to the destination's
 * code. The Screen row must exist in the DB catalog; run `pnpm db:seed` or
 * use SY18's "Sync Catalog" action.
 */

import {
  Home,
  Users,
  Activity,
  Building2,
  UsersRound,
  MapPin,
  Award,
  Key,
  Sliders,
  ScrollText,
  Bell,
  Mail,
  AlertTriangle,
  ShieldCheck,
  FlaskConical,
} from 'lucide-react';

export type AppRole = 'EMPLOYEE' | 'MANAGER' | 'HR_ADMIN' | 'SUPER_ADMIN';

export interface INavItemConfig {
  label: string;
  path: string;
  icon: React.ReactNode;
  /** `true` → only match exact path (passed to react-router NavLink `end`) */
  end?: boolean;
  /**
   * New (Phase 3+): Screen code in the DB catalog. If set, visibility is
   * controlled by `usePermission(screen, null, 'VIEW')` and the item only
   * shows when the user has VIEW on that screen.
   */
  screen?: string;
  /**
   * Legacy role filter (retained for items not yet migrated to `screen`).
   * Ignored if `screen` is set.
   * - `undefined` → all roles
   * - `[]`        → hidden from everyone (use to temporarily disable)
   * - `['MANAGER', ...]` → only those roles
   */
  roles?: AppRole[];
}

export interface INavGroupConfig {
  /** Section header label; omit for unlabelled groups */
  label?: string;
  /**
   * Legacy role filter for the whole group. New groups should omit this and
   * rely on per-item `screen` filters — an empty group is hidden automatically.
   */
  roles?: AppRole[];
  items: INavItemConfig[];
}

// ─── Main nav ─────────────────────────────────────────────────────────────────

export const NAV_GROUPS: INavGroupConfig[] = [
  {
    // No label — personal / daily use items
    items: [
      { label: 'Dashboard',         path: '/',                    icon: <Home size={16} />,          end: true },
    ],
  },
  {
    label: 'Tổ chức',
    roles: ['HR_ADMIN', 'SUPER_ADMIN'],
    items: [
      { label: 'Nhân viên',         path: '/employees',                 icon: <Users size={16} />,       screen: 'E01' },
      { label: 'Công ty',           path: '/settings/company',          icon: <Building2 size={16} />,   screen: 'S01' },
      { label: 'Phòng ban',         path: '/settings/departments',      icon: <UsersRound size={16} />,  screen: 'S02' },
      { label: 'Văn phòng',         path: '/settings/offices',          icon: <MapPin size={16} />,      screen: 'S03' },
      { label: 'Chức vụ',           path: '/settings/positions',        icon: <Award size={16} />,       screen: 'S04' },
      { label: 'Nhóm',              path: '/settings/teams',            icon: <Users size={16} />,       screen: 'S05' },
    ],
  },
  {
    label: 'Hệ thống',
    roles: ['HR_ADMIN', 'SUPER_ADMIN'],
    items: [
      { label: 'Hiển thị dropdown', path: '/settings/dropdown-display', icon: <Sliders size={16} />,     screen: 'S09' },
      { label: 'Email',             path: '/system/email',           icon: <Mail size={16} />,          screen: 'SY14' },
      { label: 'Nhật ký',           path: '/system/logs',            icon: <ScrollText size={16} />,    screen: 'SY04' },
      { label: 'Vai trò',           path: '/system/roles',           icon: <Key size={16} />,           screen: 'SY01' },
      { label: 'Phân quyền vai trò',path: '/system/role-permissions',icon: <ShieldCheck size={16} />,   screen: 'SY18', roles: ['SUPER_ADMIN'] },
      { label: 'Cài đặt',           path: '/system/settings',        icon: <Sliders size={16} />,       screen: 'SY02', roles: ['SUPER_ADMIN'] },
      { label: 'Cảnh báo hệ thống', path: '/system/warnings',        icon: <AlertTriangle size={16} />, screen: 'SY15' },
      // { label: 'Nhóm',             path: '/system/teams',           icon: <Users size={16} />,         screen: 'SY10' },
      { label: 'Kiểm tra đồng bộ giờ', path: '/system/test',        icon: <FlaskConical size={16} />,   roles: ['SUPER_ADMIN'] },
    ],
  },
  {
    label: 'Tài khoản',
    items: [
      { label: 'Thông báo',    path: '/notifications',    icon: <Bell size={16} /> },
    ],
  },
];
