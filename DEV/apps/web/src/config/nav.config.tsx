/**
 * nav.config.tsx — Sidebar navigation configuration
 *
 * Visibility is determined in this order:
 *   1. `screen` field present → filter by `usePermission(screen, null, 'VIEW')`
 *      (authoritative — matches the backend permission matrix).
 *   2. `roles` field present → legacy role-based check (retained during
 *      migration; prefer `screen` for new items).
 *   3. Neither → visible to all non-CLIENT roles.
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
  Clock,
  ClipboardList,
  BarChart3,
  Users,
  Briefcase,
  Activity,
  Smile,
  Building2,
  UsersRound,
  MapPin,
  Award,
  BookUser,
  Key,
  Sliders,
  ScrollText,
  Bell,
  Mail,
  Layers,
  AlertTriangle,
  ShieldCheck,
  FlaskConical,
} from 'lucide-react';

export type AppRole = 'EMPLOYEE' | 'MANAGER' | 'HR_ADMIN' | 'SUPER_ADMIN' | 'CLIENT';

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
   * - `undefined` → all non-CLIENT roles
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

// ─── CLIENT nav (shown only to CLIENT role) ───────────────────────────────────

export const CLIENT_NAV_GROUPS: INavGroupConfig[] = [
  {
    items: [
      { label: 'Dashboard', path: '/client', icon: <BarChart3 size={16} />, screen: 'D04', roles: ['CLIENT'] },
    ],
  },
];

// ─── Main nav ─────────────────────────────────────────────────────────────────

export const NAV_GROUPS: INavGroupConfig[] = [
  {
    // No label — personal / daily use items
    items: [
      { label: 'Dashboard',    path: '/',                    icon: <Home size={16} />,          end: true },
      { label: 'Attendance',   path: '/attendance/history',  icon: <Clock size={16} />,         screen: 'AT01' },
      { label: 'Team History', path: '/attendance/team',     icon: <ClipboardList size={16} />, screen: 'AT02', roles: ['MANAGER', 'HR_ADMIN', 'SUPER_ADMIN'] },
      { label: 'Manager View', path: '/manager',             icon: <BarChart3 size={16} />,     screen: 'D02',  roles: ['MANAGER', 'HR_ADMIN', 'SUPER_ADMIN'] },
    ],
  },
  {
    label: 'Management',
    roles: ['HR_ADMIN', 'SUPER_ADMIN'],
    items: [
      { label: 'Employees',         path: '/employees',          icon: <Users size={16} />,     screen: 'E01' },
      { label: 'Clients',           path: '/clients',            icon: <Briefcase size={16} />, screen: 'C01' },
      { label: 'HR Dashboard',      path: '/hr',                 icon: <BarChart3 size={16} />, screen: 'D03' },
      { label: 'Attendance Report', path: '/reports/attendance',        icon: <Activity size={16} />,  screen: 'R01' },
      { label: 'VIBE Reports',      path: '/reports/vibe',             icon: <Smile size={16} />,     screen: 'R03' },
      { label: 'HR Report',         path: '/reports/hr',               icon: <Users size={16} />,     screen: 'R02', roles: ['HR_ADMIN', 'SUPER_ADMIN'] },
      { label: 'Timezone Review',   path: '/reports/timezone',         icon: <MapPin size={16} />,    screen: 'R04', roles: ['MANAGER', 'HR_ADMIN', 'SUPER_ADMIN'] },
      { label: 'Working Hours',     path: '/reports/working-hours',    icon: <BarChart3 size={16} />, screen: 'R05', roles: ['MANAGER', 'HR_ADMIN', 'SUPER_ADMIN', 'CLIENT'] },
      { label: 'Staff Allocation',  path: '/reports/staff-allocation', icon: <Briefcase size={16} />, screen: 'R06', roles: ['MANAGER', 'HR_ADMIN', 'SUPER_ADMIN'] },
    ],
  },
  {
    label: 'Organisation',
    roles: ['HR_ADMIN', 'SUPER_ADMIN'],
    items: [
      { label: 'Companies',        path: '/settings/company',          icon: <Building2 size={16} />,   screen: 'S01' },
      { label: 'Departments',      path: '/settings/departments',      icon: <UsersRound size={16} />,  screen: 'S02' },
      { label: 'Offices',          path: '/settings/offices',          icon: <MapPin size={16} />,      screen: 'S03' },
      { label: 'Positions',        path: '/settings/positions',        icon: <Award size={16} />,       screen: 'S04' },
      { label: 'Teams',            path: '/settings/teams',            icon: <Users size={16} />,       screen: 'S05' },
      { label: 'Company Contacts', path: '/settings/company-contacts', icon: <BookUser size={16} />, screen: 'S01' },
      { label: 'Dropdown Display', path: '/settings/dropdown-display', icon: <Sliders size={16} />,    screen: 'S09' },
    ],
  },
  {
    label: 'System',
    roles: ['HR_ADMIN', 'SUPER_ADMIN'],
    items: [
      { label: 'Email',           path: '/system/email',           icon: <Mail size={16} />,         screen: 'SY14' },
      { label: 'Logs',            path: '/system/logs',            icon: <ScrollText size={16} />,   screen: 'SY04' },
      { label: 'Configurations',  path: '/system/configurations',  icon: <Layers size={16} />,       screen: 'SY03' },
      { label: 'Roles',           path: '/system/roles',           icon: <Key size={16} />,          screen: 'SY01' },
      { label: 'Role Permissions',path: '/system/role-permissions',icon: <ShieldCheck size={16} />, screen: 'SY18', roles: ['SUPER_ADMIN'] },
      { label: 'Settings',        path: '/system/settings',        icon: <Sliders size={16} />,      screen: 'SY02', roles: ['SUPER_ADMIN'] },
      { label: 'System Warnings', path: '/system/warnings',        icon: <AlertTriangle size={16} />, screen: 'SY15' },
      // { label: 'Teams',           path: '/system/teams',           icon: <Users size={16} />,        screen: 'SY10' },
      { label: 'Login OTP (2FA)', path: '/system/login-otps',      icon: <ShieldCheck size={16} />,  screen: 'SY16', roles: ['SUPER_ADMIN'] },
      { label: 'Time Sync Test',  path: '/system/test',             icon: <FlaskConical size={16} />,  roles: ['SUPER_ADMIN'] },
    ],
  },
  {
    label: 'Account',
    items: [
      { label: 'Notifications', path: '/notifications', icon: <Bell size={16} /> },
      { label: 'Security (2FA)', path: '/settings/security', icon: <ShieldCheck size={16} />, screen: 'S08' },
    ],
  },
];
