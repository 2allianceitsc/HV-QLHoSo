// Default permission matrix for all non-SUPER_ADMIN roles.
// Source of truth used by both db:seed and resetRoleToDefaults.
// SUPER_ADMIN is intentionally absent — it bypasses the matrix entirely.

export type RoleName = 'EMPLOYEE' | 'MANAGER' | 'HR_ADMIN' | 'CLIENT';
export type ActionCode = 'VIEW' | 'CREATE' | 'UPDATE' | 'DELETE' | 'EXPORT' | 'APPROVE';

export type MatrixRow = {
  roleName: RoleName;
  screenCode: string;
  tabCode: string | null;
  permissionCode: ActionCode;
};

const actions = (
  roleName: RoleName,
  screenCode: string,
  tabCode: string | null,
  codes: ActionCode[],
): MatrixRow[] => codes.map((permissionCode) => ({ roleName, screenCode, tabCode, permissionCode }));

const FULL_CRUD: ActionCode[] = ['VIEW', 'CREATE', 'UPDATE', 'DELETE'];
const VIEW_UPDATE: ActionCode[] = ['VIEW', 'UPDATE'];
const VIEW_CREATE: ActionCode[] = ['VIEW', 'CREATE'];
const VIEW_EXPORT: ActionCode[] = ['VIEW', 'EXPORT'];

export const DEFAULT_MATRIX: MatrixRow[] = [
  // Dashboards — VIEW only, one per role.
  ...actions('EMPLOYEE', 'D01', null, ['VIEW']),
  ...actions('MANAGER',  'D02', null, ['VIEW']),
  ...actions('HR_ADMIN', 'D03', null, ['VIEW']),
  ...actions('CLIENT',   'D04', null, ['VIEW']),

  // Employees — HR_ADMIN has Full CRUD on list/detail; MANAGER read-only.
  ...actions('MANAGER',  'E01', null, ['VIEW']),
  ...actions('HR_ADMIN', 'E01', null, FULL_CRUD),
  ...actions('HR_ADMIN', 'E02', null, VIEW_CREATE),
  ...actions('HR_ADMIN', 'E03', null, VIEW_CREATE),
  ...actions('MANAGER',  'E04', null, ['VIEW']),
  ...actions('HR_ADMIN', 'E04', null, FULL_CRUD),
  // E04 tabs — MANAGER reads personal/work only; HR_ADMIN edits all five.
  ...actions('MANAGER',  'E04', 'personal', ['VIEW']),
  ...actions('MANAGER',  'E04', 'work',     ['VIEW']),
  ...actions('HR_ADMIN', 'E04', 'personal', VIEW_UPDATE),
  ...actions('HR_ADMIN', 'E04', 'work',     VIEW_UPDATE),
  ...actions('HR_ADMIN', 'E04', 'roles',    VIEW_UPDATE),
  ...actions('HR_ADMIN', 'E04', 'hr-only',  VIEW_UPDATE),
  ...actions('HR_ADMIN', 'E04', 'security', VIEW_UPDATE),

  // Clients — HR_ADMIN Full; MANAGER read; CLIENT read own detail.
  ...actions('MANAGER',  'C01', null, ['VIEW']),
  ...actions('HR_ADMIN', 'C01', null, FULL_CRUD),
  ...actions('MANAGER',  'C02', null, ['VIEW']),
  ...actions('HR_ADMIN', 'C02', null, FULL_CRUD),
  ...actions('CLIENT',   'C02', null, ['VIEW']),
  // C02 tabs — MANAGER & CLIENT read; HR_ADMIN edits.
  ...(['departments', 'projects', 'contacts', 'staff'] as const).flatMap<MatrixRow>((tab) => [
    ...actions('MANAGER',  'C02', tab, ['VIEW']),
    ...actions('HR_ADMIN', 'C02', tab, VIEW_UPDATE),
    ...actions('CLIENT',   'C02', tab, ['VIEW']),
  ]),

  // Attendance — VIEW only.
  ...actions('EMPLOYEE', 'AT01', null, ['VIEW']),
  ...actions('MANAGER',  'AT02', null, ['VIEW']),
  ...actions('HR_ADMIN', 'AT02', null, ['VIEW']),

  // Reports — VIEW + EXPORT only; no CRUD.
  ...actions('MANAGER',  'R01', null, VIEW_EXPORT),
  ...actions('HR_ADMIN', 'R01', null, VIEW_EXPORT),
  ...actions('CLIENT',   'R01', null, VIEW_EXPORT),
  ...actions('HR_ADMIN', 'R02', null, VIEW_EXPORT),
  ...actions('MANAGER',  'R03', null, ['VIEW']),
  ...actions('HR_ADMIN', 'R03', null, ['VIEW']),
  ...actions('MANAGER',  'R04', null, ['VIEW']),
  ...actions('HR_ADMIN', 'R04', null, ['VIEW']),
  ...actions('MANAGER',  'R05', null, VIEW_EXPORT),
  ...actions('HR_ADMIN', 'R05', null, VIEW_EXPORT),
  ...actions('CLIENT',   'R05', null, VIEW_EXPORT),
  ...actions('MANAGER',  'R06', null, ['VIEW']),
  ...actions('HR_ADMIN', 'R06', null, ['VIEW']),

  // Settings — HR_ADMIN Full on org entities; S07 is V+U only; S08 open to all.
  ...(['S01', 'S02', 'S03', 'S04', 'S05', 'S06', 'S09'] as const).flatMap<MatrixRow>((code) =>
    actions('HR_ADMIN', code, null, FULL_CRUD),
  ),
  ...actions('HR_ADMIN', 'S07', null, VIEW_UPDATE),
  ...actions('EMPLOYEE', 'S08', null, ['VIEW']),
  ...actions('MANAGER',  'S08', null, ['VIEW']),
  ...actions('HR_ADMIN', 'S08', null, ['VIEW']),
  ...actions('CLIENT',   'S08', null, ['VIEW']),

  // System — HR_ADMIN exceptions; everything else via SUPER_ADMIN bypass.
  // SY07 = /notifications (Account area, all roles; route is unguarded so any authenticated user can reach it)
  // SY08 removed — merged into SY02 tab=notifications (BA change 2026-04-22)
  ...actions('HR_ADMIN', 'SY03', null, FULL_CRUD),
  ...actions('EMPLOYEE', 'SY07', null, ['VIEW']),
  ...actions('MANAGER',  'SY07', null, ['VIEW']),
  ...actions('HR_ADMIN', 'SY07', null, ['VIEW']),
  ...actions('CLIENT',   'SY07', null, ['VIEW']),
  ...actions('HR_ADMIN', 'SY09', null, FULL_CRUD),

  // Misc — universally reachable.
  ...(['EMPLOYEE', 'MANAGER', 'HR_ADMIN', 'CLIENT'] as const).flatMap<MatrixRow>((roleName) => [
    ...actions(roleName, 'M01', null, VIEW_UPDATE),
    ...actions(roleName, 'M02', null, ['VIEW']),
  ]),
];
