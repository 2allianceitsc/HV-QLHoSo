// ============================================================================
// Permission model seed — Phase 1 (CR-008)
// ============================================================================
// Reproduces current hard-coded role checks as DB rows so the new
// ScreenPermissionGuard has the same effective behavior as @Roles(...).
// This seed is idempotent: re-runs insert missing rows but never overwrite
// admin edits to RolePermission rows (update: {} on upsert).
//
// Source of truth for what goes here:
//   docs/architecture/permission-seed-catalog.md
// ============================================================================

import type { PrismaClient } from '@prisma/client';
import { uuidv7 } from 'uuidv7';
import { DEFAULT_MATRIX } from '../../src/system/permissions/default-matrix.constants';

// ---------------------------------------------------------------------------
// Static catalogs
// ---------------------------------------------------------------------------

type ScreenSeed = {
  code: string;
  name: string;
  route: string;
  area: string;
  orderNo: number;
  parentCode?: string;
};

const SCREENS: ScreenSeed[] = [
  // Auth (unauthenticated; no permissions attached — listed for completeness)
  { code: 'A01', name: 'Login',                 route: '/login',                area: 'auth',       orderNo: 10 },
  { code: 'A02', name: 'Forgot Password',       route: '/forgot-password',      area: 'auth',       orderNo: 20 },
  { code: 'A03', name: 'Verify OTP',            route: '/verify-otp',           area: 'auth',       orderNo: 30 },
  { code: 'A04', name: 'Reset Password',        route: '/reset-password',       area: 'auth',       orderNo: 40 },
  { code: 'A05', name: 'First-Time Password',   route: '/first-time-password',  area: 'auth',       orderNo: 50 },
  { code: 'A06', name: 'Verify 2FA',            route: '/verify-2fa',           area: 'auth',       orderNo: 60 },
  { code: 'A07', name: 'Setup 2FA',             route: '/setup-2fa',            area: 'auth',       orderNo: 70 },

  // Dashboards
  { code: 'D01', name: 'Employee Dashboard',    route: '/',                     area: 'dashboard',  orderNo: 10 },
  { code: 'D02', name: 'Manager Dashboard',     route: '/manager',              area: 'dashboard',  orderNo: 20 },
  { code: 'D03', name: 'HR Dashboard',          route: '/hr',                   area: 'dashboard',  orderNo: 30 },
  { code: 'D04', name: 'Client Dashboard',      route: '/client',               area: 'dashboard',  orderNo: 40 },

  // Employees
  { code: 'E01', name: 'Employee List',         route: '/employees',            area: 'employee',   orderNo: 10 },
  { code: 'E02', name: 'Add Employee',          route: '/employees/new',        area: 'employee',   orderNo: 20 },
  { code: 'E03', name: 'Import Employees',      route: '/employees/import',     area: 'employee',   orderNo: 30 },
  { code: 'E04', name: 'Employee Detail',       route: '/employees/:id',        area: 'employee',   orderNo: 40 },

  // Clients
  { code: 'C01', name: 'Client List',           route: '/clients',              area: 'client',     orderNo: 10 },
  { code: 'C02', name: 'Client Detail',         route: '/clients/:id',          area: 'client',     orderNo: 20 },

  // Attendance
  { code: 'AT01', name: 'My Attendance',        route: '/attendance',           area: 'attendance', orderNo: 10 },
  { code: 'AT02', name: 'Team Attendance',      route: '/attendance/team',      area: 'attendance', orderNo: 20 },

  // Reports
  { code: 'R01', name: 'Attendance Report',     route: '/reports/attendance',       area: 'reports', orderNo: 10 },
  { code: 'R02', name: 'HR Report',             route: '/reports/hr',               area: 'reports', orderNo: 20 },
  { code: 'R03', name: 'VIBE Report',           route: '/reports/vibe',             area: 'reports', orderNo: 30 },
  { code: 'R04', name: 'Timezone Report',       route: '/reports/timezone',         area: 'reports', orderNo: 40 },
  { code: 'R05', name: 'Working Hours',         route: '/reports/working-hours',    area: 'reports', orderNo: 50 },
  { code: 'R06', name: 'Staff Allocation',      route: '/reports/staff-allocation', area: 'reports', orderNo: 60 },

  // Settings
  { code: 'S01', name: 'Company',               route: '/settings/company',             area: 'settings', orderNo: 10 },
  { code: 'S02', name: 'Departments',           route: '/settings/departments',         area: 'settings', orderNo: 20 },
  { code: 'S03', name: 'Offices',               route: '/settings/offices',             area: 'settings', orderNo: 30 },
  { code: 'S04', name: 'Positions',             route: '/settings/positions',           area: 'settings', orderNo: 40 },
  { code: 'S05', name: 'Teams',                 route: '/settings/teams',               area: 'settings', orderNo: 50 },
  { code: 'S06', name: 'Marital Statuses',      route: '/settings/marital-statuses',    area: 'settings', orderNo: 60 },
  { code: 'S07', name: 'Data Dictionary',       route: '/settings/data-dictionary',     area: 'settings', orderNo: 70 },
  { code: 'S08', name: 'Security',              route: '/settings/security',            area: 'settings', orderNo: 80 },
  { code: 'S09', name: 'Dropdown Display',      route: '/settings/dropdown-display',    area: 'settings', orderNo: 90 },

  // System
  { code: 'SY01', name: 'Roles',                     route: '/system/roles',             area: 'system', orderNo: 10 },
  { code: 'SY02', name: 'System Settings',           route: '/system/settings',          area: 'system', orderNo: 20 },
  { code: 'SY03', name: 'Status Definitions',        route: '/system/statuses',          area: 'system', orderNo: 30 },
  { code: 'SY04', name: 'Logs',                      route: '/system/logs',              area: 'system', orderNo: 40 },
  { code: 'SY05', name: 'API Logs',                  route: '/system/logs/api',          area: 'system', orderNo: 45 },
  { code: 'SY06', name: 'Error Logs',                route: '/system/logs/exception',    area: 'system', orderNo: 46 },
  { code: 'SY07', name: 'Notifications',             route: '/notifications',            area: 'account', orderNo: 50 },
  // SY08 (Notification Settings) removed — merged into SY02 tab=notifications (BA change 2026-04-22)
  { code: 'SY09', name: 'VIBE Icons',                route: '/system/vibe-icons',        area: 'system', orderNo: 60 },
  { code: 'SY10', name: 'Teams (System)',            route: '/system/teams',             area: 'system', orderNo: 70 },
  { code: 'SY11', name: 'Email Queue',               route: '/system/email/queue',       area: 'system', orderNo: 80 },
  { code: 'SY12', name: 'Email Job',                 route: '/system/email/job',         area: 'system', orderNo: 85 },
  { code: 'SY13', name: 'Email Templates',           route: '/system/email/templates',   area: 'system', orderNo: 86 },
  { code: 'SY14', name: 'Email Configurations',      route: '/system/email',             area: 'system', orderNo: 87 },
  { code: 'SY15', name: 'System Warnings',           route: '/system/warnings',          area: 'system', orderNo: 90 },
  { code: 'SY16', name: 'Login OTPs',                route: '/system/login-otps',        area: 'system', orderNo: 95 },
  { code: 'SY17', name: 'Data Integrity',            route: '/system/data-integrity',    area: 'system', orderNo: 96 },
  { code: 'SY18', name: 'Role Permissions Matrix',   route: '/system/role-permissions',  area: 'system', orderNo: 15 },

  // Misc
  { code: 'M01', name: 'Profile',                    route: '/profile',                  area: 'misc',   orderNo: 10 },
  { code: 'M02', name: '404 Not Found',              route: '*',                         area: 'misc',   orderNo: 999 },
];

type TabSeed = { code: string; name: string; orderNo: number };

const SCREEN_TABS: Record<string, TabSeed[]> = {
  E04: [
    { code: 'personal', name: 'Personal', orderNo: 10 },
    { code: 'work',     name: 'Work',     orderNo: 20 },
    { code: 'roles',    name: 'Roles',    orderNo: 30 },
    { code: 'hr-only',  name: 'HR Only',  orderNo: 40 },
    { code: 'security', name: 'Security', orderNo: 50 },
  ],
  C02: [
    { code: 'departments', name: 'Departments', orderNo: 10 },
    { code: 'projects',    name: 'Projects',    orderNo: 20 },
    { code: 'contacts',    name: 'Contacts',    orderNo: 30 },
    { code: 'staff',       name: 'Staff',       orderNo: 40 },
  ],
  SY04: [
    { code: 'api',       name: 'API Logs',       orderNo: 10 },
    { code: 'exception', name: 'Exception Logs', orderNo: 20 },
  ],
  SY14: [
    { code: 'providers', name: 'Providers', orderNo: 10 },
    { code: 'templates', name: 'Templates', orderNo: 20 },
    { code: 'queue',     name: 'Queue',     orderNo: 30 },
    { code: 'job',       name: 'Job',       orderNo: 40 },
  ],
};

const PERMISSIONS = [
  { code: 'VIEW',    name: 'View',    orderNo: 10, isDisabled: false },
  { code: 'CREATE',  name: 'Create',  orderNo: 20, isDisabled: false },
  { code: 'UPDATE',  name: 'Update',  orderNo: 30, isDisabled: false },
  { code: 'DELETE',  name: 'Delete',  orderNo: 40, isDisabled: false },
  { code: 'EXPORT',  name: 'Export',  orderNo: 50, isDisabled: false },
  { code: 'APPROVE', name: 'Approve', orderNo: 60, isDisabled: true }, // reserved for future
];

// Default role -> screen/tab -> permissions matrix is defined in:
//   src/system/permissions/default-matrix.constants.ts
// Imported above so both seed and runtime reset share one source of truth.

// ---------------------------------------------------------------------------
// Seeder
// ---------------------------------------------------------------------------

export async function seedPermissions(prisma: PrismaClient): Promise<void> {
  console.log('\nSeeding permission model...');

  // 1. Permission action catalog
  for (const p of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code: p.code },
      update: { name: p.name, orderNo: p.orderNo, isDisabled: p.isDisabled },
      create: p,
    });
  }
  console.log(`  Permissions: ${PERMISSIONS.length}`);

  // 2. Screens
  let screensCreated = 0;
  for (const s of SCREENS) {
    const existing = await prisma.screen.findUnique({ where: { code: s.code } });
    if (existing) {
      await prisma.screen.update({
        where: { id: existing.id },
        data: { name: s.name, route: s.route, area: s.area, orderNo: s.orderNo, isDeleted: false },
      });
    } else {
      await prisma.screen.create({
        data: {
          id: uuidv7(),
          code: s.code,
          name: s.name,
          route: s.route,
          area: s.area,
          orderNo: s.orderNo,
          logCreatedBy: 'seed',
          logUpdatedBy: 'seed',
        },
      });
      screensCreated++;
    }
  }
  console.log(`  Screens: ${SCREENS.length} total (${screensCreated} newly created)`);

  // 3. Screen tabs
  let tabsCreated = 0;
  for (const [screenCode, tabs] of Object.entries(SCREEN_TABS)) {
    const screen = await prisma.screen.findUnique({ where: { code: screenCode } });
    if (!screen) {
      console.warn(`  [warn] Skipping tabs for missing screen ${screenCode}`);
      continue;
    }
    for (const t of tabs) {
      const existing = await prisma.screenTab.findFirst({
        where: { screenId: screen.id, code: t.code },
      });
      if (existing) {
        await prisma.screenTab.update({
          where: { id: existing.id },
          data: { name: t.name, orderNo: t.orderNo, isDeleted: false },
        });
      } else {
        await prisma.screenTab.create({
          data: {
            id: uuidv7(),
            screenId: screen.id,
            code: t.code,
            name: t.name,
            orderNo: t.orderNo,
            logCreatedBy: 'seed',
            logUpdatedBy: 'seed',
          },
        });
        tabsCreated++;
      }
    }
  }
  console.log(`  ScreenTabs: ${tabsCreated} newly created`);

  // 4. Default RolePermission matrix.
  //    upsert with update:{} preserves admin edits — seed only inserts missing rows.
  const roleByName = new Map(
    (await prisma.role.findMany({ where: { isDeleted: false } })).map((r) => [r.name, r]),
  );
  const screenByCode = new Map(
    (await prisma.screen.findMany({ where: { isDeleted: false } })).map((s) => [s.code, s]),
  );
  const tabKey = (screenId: string, code: string) => `${screenId}:${code}`;
  const tabByKey = new Map(
    (await prisma.screenTab.findMany({ where: { isDeleted: false } })).map((t) => [
      tabKey(t.screenId, t.code),
      t,
    ]),
  );

  let matrixCreated = 0;
  let matrixSkipped = 0;
  for (const row of DEFAULT_MATRIX) {
    const role = roleByName.get(row.roleName);
    const screen = screenByCode.get(row.screenCode);
    if (!role || !screen) {
      console.warn(
        `  [warn] Missing role or screen for matrix row: ${row.roleName} × ${row.screenCode}`,
      );
      continue;
    }
    const tab = row.tabCode ? tabByKey.get(tabKey(screen.id, row.tabCode)) : null;
    if (row.tabCode && !tab) {
      console.warn(
        `  [warn] Missing tab for matrix row: ${row.screenCode}/${row.tabCode}`,
      );
      continue;
    }

    // Check existence first; the Prisma-level @@unique doesn't enforce NULL
    // tabId uniqueness, so we match manually.
    const existing = await prisma.rolePermission.findFirst({
      where: {
        roleId: role.id,
        screenId: screen.id,
        tabId: tab?.id ?? null,
        permissionCode: row.permissionCode,
        isDeleted: false,
      },
    });

    if (existing) {
      matrixSkipped++;
      continue;
    }

    await prisma.rolePermission.create({
      data: {
        id: uuidv7(),
        roleId: role.id,
        screenId: screen.id,
        tabId: tab?.id ?? null,
        permissionCode: row.permissionCode,
        isAllowed: true,
        note: 'seed:phase-1',
        logCreatedBy: 'seed',
        logUpdatedBy: 'seed',
      },
    });
    matrixCreated++;
  }
  console.log(
    `  RolePermissions: ${matrixCreated} newly created, ${matrixSkipped} preserved (admin edits or prior seed).`,
  );

  console.log('Permission model seed complete.');
}
