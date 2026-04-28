import { Test, TestingModule } from '@nestjs/testing';
import { ReportsService } from './reports.service';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '@shared/enums/user-role.enum';

// ── Prisma mock ──────────────────────────────────────────────────────────────

const prismaMock = {
  staff: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
  },
  team: {
    findMany: jest.fn(),
  },
  clientStaff: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
  },
  timeTracking: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
  moodLog: {
    findMany: jest.fn(),
  },
  statusDefinition: {
    findMany: jest.fn(),
  },
  businessClient: {
    findMany: jest.fn(),
  },
};

// ── Test IDs ─────────────────────────────────────────────────────────────────

const MGR_ID = 'mgr-001';
const DIRECT_REPORT_1 = 'dr-001';
const DIRECT_REPORT_2 = 'dr-002';
const TEAM_A_ID = 'team-a';
const TEAM_B_ID = 'team-b';
const TEAM_MEMBER_1 = 'tm-001';
const SUB_LEADER_ID = 'sub-leader-001';
const SUB_LEADER_STAFF_1 = 'sls-001';
const CLIENT_USER_ID = 'client-user-001';
const BIZ_CLIENT_ID = 'biz-client-001';
const CLIENT_ASSIGNED_1 = 'ca-001';
const CLIENT_TEAM_MEMBER_1 = 'ctm-001';
const CLIENT_DIRECT_1 = 'cd-001';
const EMPLOYEE_ID = 'emp-001';

// ── Setup ────────────────────────────────────────────────────────────────────

describe('ReportsService', () => {
  let service: ReportsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
    jest.clearAllMocks();
  });

  // ══════════════════════════════════════════════════════════════════════════
  // Scope Helper Tests (BA 3.3.2, 3.3.3)
  // ══════════════════════════════════════════════════════════════════════════

  describe('resolveManagerStaffIds (BA 3.3.2)', () => {
    const callHelper = (mgrId: string) =>
      (service as any).resolveManagerStaffIds(mgrId);

    it('includes self (condition D)', async () => {
      prismaMock.staff.findMany.mockResolvedValue([]);
      prismaMock.team.findMany.mockResolvedValue([]);

      const ids = await callHelper(MGR_ID);

      expect(ids).toContain(MGR_ID);
    });

    it('includes direct reports (condition A)', async () => {
      // A) Direct reports query
      prismaMock.staff.findMany
        .mockResolvedValueOnce([{ id: DIRECT_REPORT_1 }, { id: DIRECT_REPORT_2 }])
        // C) Sub-leaders query
        .mockResolvedValueOnce([]);
      // B) Managed teams
      prismaMock.team.findMany.mockResolvedValue([]);

      const ids = await callHelper(MGR_ID);

      expect(ids).toContain(DIRECT_REPORT_1);
      expect(ids).toContain(DIRECT_REPORT_2);
      expect(ids).toContain(MGR_ID);
    });

    it('includes staff in managed teams (condition B)', async () => {
      // A) Direct reports
      prismaMock.staff.findMany
        .mockResolvedValueOnce([])
        // C) Sub-leaders
        .mockResolvedValueOnce([])
        // B-2) Staff in managed teams
        .mockResolvedValueOnce([{ id: TEAM_MEMBER_1 }]);
      // B-1) Managed teams
      prismaMock.team.findMany.mockResolvedValue([{ id: TEAM_A_ID }]);

      const ids = await callHelper(MGR_ID);

      expect(ids).toContain(TEAM_MEMBER_1);
      expect(ids).toContain(MGR_ID);
    });

    it('includes sub-leader staff (condition C)', async () => {
      // A) Direct reports — sub-leader shows up here too
      prismaMock.staff.findMany
        .mockResolvedValueOnce([{ id: SUB_LEADER_ID }])
        // C-1) Sub-leaders (isManager=true)
        .mockResolvedValueOnce([{ id: SUB_LEADER_ID }])
        // B-2) Team staff (no managed teams)
        // C-2) Sub-leader's reports
        .mockResolvedValueOnce([{ id: SUB_LEADER_STAFF_1 }]);
      // B-1) No managed teams
      prismaMock.team.findMany.mockResolvedValue([]);

      const ids = await callHelper(MGR_ID);

      expect(ids).toContain(SUB_LEADER_ID);
      expect(ids).toContain(SUB_LEADER_STAFF_1);
      expect(ids).toContain(MGR_ID);
    });

    it('deduplicates IDs across all conditions', async () => {
      const SHARED_ID = 'shared-001';
      // A) Direct reports
      prismaMock.staff.findMany
        .mockResolvedValueOnce([{ id: SHARED_ID }])
        // C-1) Sub-leaders
        .mockResolvedValueOnce([])
        // B-2) Team staff
        .mockResolvedValueOnce([{ id: SHARED_ID }]);
      // B-1) Teams
      prismaMock.team.findMany.mockResolvedValue([{ id: TEAM_A_ID }]);

      const ids = await callHelper(MGR_ID);

      const occurrences = ids.filter((id: string) => id === SHARED_ID);
      expect(occurrences).toHaveLength(1);
    });

    it('returns only self when no reports, teams, or sub-leaders', async () => {
      prismaMock.staff.findMany.mockResolvedValue([]);
      prismaMock.team.findMany.mockResolvedValue([]);

      const ids = await callHelper(MGR_ID);

      expect(ids).toEqual([MGR_ID]);
    });
  });

  describe('resolveBizClientId (BA 3.3.3)', () => {
    const callHelper = (staffId: string) =>
      (service as any).resolveBizClientId(staffId);

    it('returns clientId when staff has one', async () => {
      prismaMock.staff.findUnique.mockResolvedValue({ clientId: BIZ_CLIENT_ID });

      const id = await callHelper(CLIENT_USER_ID);

      expect(id).toBe(BIZ_CLIENT_ID);
    });

    it('falls back to ClientStaff when staff has no clientId', async () => {
      prismaMock.staff.findUnique.mockResolvedValue({ clientId: null });
      prismaMock.clientStaff.findFirst.mockResolvedValue({ clientId: BIZ_CLIENT_ID });

      const id = await callHelper(CLIENT_USER_ID);

      expect(id).toBe(BIZ_CLIENT_ID);
    });

    it('returns null when both staff.clientId and ClientStaff are empty', async () => {
      prismaMock.staff.findUnique.mockResolvedValue({ clientId: null });
      prismaMock.clientStaff.findFirst.mockResolvedValue(null);

      const id = await callHelper(CLIENT_USER_ID);

      expect(id).toBeNull();
    });

    it('returns null when staff not found', async () => {
      prismaMock.staff.findUnique.mockResolvedValue(null);
      prismaMock.clientStaff.findFirst.mockResolvedValue(null);

      const id = await callHelper('non-existent');

      expect(id).toBeNull();
    });
  });

  describe('resolveClientStaffIds (BA 3.3.3)', () => {
    const callHelper = (bizClientId: string) =>
      (service as any).resolveClientStaffIds(bizClientId);

    it('includes staff via ClientStaff assignment (condition A)', async () => {
      // A) ClientStaff
      prismaMock.clientStaff.findMany.mockResolvedValue([{ staffId: CLIENT_ASSIGNED_1 }]);
      // B) Client teams
      prismaMock.team.findMany.mockResolvedValue([]);
      // C) Staff.clientId
      prismaMock.staff.findMany.mockResolvedValueOnce([]);

      const ids = await callHelper(BIZ_CLIENT_ID);

      expect(ids).toContain(CLIENT_ASSIGNED_1);
    });

    it('includes staff via Team.clientId (condition B)', async () => {
      prismaMock.clientStaff.findMany.mockResolvedValue([]);
      prismaMock.team.findMany.mockResolvedValue([{ id: TEAM_A_ID }]);
      // C) Staff.clientId
      prismaMock.staff.findMany
        .mockResolvedValueOnce([])
        // B-2) Team staff
        .mockResolvedValueOnce([{ id: CLIENT_TEAM_MEMBER_1 }]);

      const ids = await callHelper(BIZ_CLIENT_ID);

      expect(ids).toContain(CLIENT_TEAM_MEMBER_1);
    });

    it('includes staff via Staff.clientId (condition C)', async () => {
      prismaMock.clientStaff.findMany.mockResolvedValue([]);
      prismaMock.team.findMany.mockResolvedValue([]);
      prismaMock.staff.findMany.mockResolvedValueOnce([{ id: CLIENT_DIRECT_1 }]);

      const ids = await callHelper(BIZ_CLIENT_ID);

      expect(ids).toContain(CLIENT_DIRECT_1);
    });

    it('deduplicates across all 3 conditions', async () => {
      const SHARED_STAFF = 'shared-cs-001';
      prismaMock.clientStaff.findMany.mockResolvedValue([{ staffId: SHARED_STAFF }]);
      prismaMock.team.findMany.mockResolvedValue([{ id: TEAM_A_ID }]);
      // C) Staff.clientId
      prismaMock.staff.findMany
        .mockResolvedValueOnce([{ id: SHARED_STAFF }])
        // B-2) Team staff
        .mockResolvedValueOnce([{ id: SHARED_STAFF }]);

      const ids = await callHelper(BIZ_CLIENT_ID);

      expect(ids.filter((id: string) => id === SHARED_STAFF)).toHaveLength(1);
    });

    it('returns empty when no staff matched', async () => {
      prismaMock.clientStaff.findMany.mockResolvedValue([]);
      prismaMock.team.findMany.mockResolvedValue([]);
      prismaMock.staff.findMany.mockResolvedValue([]);

      const ids = await callHelper(BIZ_CLIENT_ID);

      expect(ids).toEqual([]);
    });
  });

  describe('resolveManagerClientIds', () => {
    const callHelper = (mgrId: string) =>
      (service as any).resolveManagerClientIds(mgrId);

    it('returns clientIds from managed teams', async () => {
      prismaMock.team.findMany.mockResolvedValue([
        { clientId: 'client-a' },
        { clientId: 'client-b' },
        { clientId: null },
      ]);

      const ids = await callHelper(MGR_ID);

      expect(ids).toContain('client-a');
      expect(ids).toContain('client-b');
      expect(ids).not.toContain(null);
      expect(ids).toHaveLength(2);
    });

    it('returns empty when no managed teams', async () => {
      prismaMock.team.findMany.mockResolvedValue([]);

      const ids = await callHelper(MGR_ID);

      expect(ids).toEqual([]);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // resolveWhere — Attendance Report (S25 T1) scope tests
  // ══════════════════════════════════════════════════════════════════════════

  describe('resolveWhere (S25 T1 scope)', () => {
    const baseParams = { startDate: '2026-01-01', endDate: '2026-01-31' };
    const callResolveWhere = (
      params: any,
      user: { staffId: string; roles: string[] },
    ) => (service as any).resolveWhere(params, user);

    it('SUPER_ADMIN: no staff filter', async () => {
      const where = await callResolveWhere(baseParams, {
        staffId: 'sa-001',
        roles: [UserRole.SUPER_ADMIN],
      });

      expect(where['staff']).toBeUndefined();
      expect(where['staffId']).toBeUndefined();
    });

    it('HR_ADMIN: no staff filter', async () => {
      const where = await callResolveWhere(baseParams, {
        staffId: 'hr-001',
        roles: [UserRole.HR_ADMIN],
      });

      expect(where['staff']).toBeUndefined();
      expect(where['staffId']).toBeUndefined();
    });

    it('EMPLOYEE: filter to self only', async () => {
      const where = await callResolveWhere(baseParams, {
        staffId: EMPLOYEE_ID,
        roles: [UserRole.EMPLOYEE],
      });

      expect(where['staffId']).toBe(EMPLOYEE_ID);
    });

    it('MANAGER: filter staff.id IN managedIds', async () => {
      // Mock resolveManagerStaffIds chain
      prismaMock.staff.findMany
        .mockResolvedValueOnce([{ id: DIRECT_REPORT_1 }]) // A) direct reports
        .mockResolvedValueOnce([]); // C) sub-leaders
      prismaMock.team.findMany.mockResolvedValue([]);

      const where = await callResolveWhere(baseParams, {
        staffId: MGR_ID,
        roles: [UserRole.MANAGER],
      });

      expect(where['staff']).toBeDefined();
      expect(where['staff']['id']).toEqual({
        in: expect.arrayContaining([MGR_ID, DIRECT_REPORT_1]),
      });
    });

    it('CLIENT: filter staff.id IN clientStaffIds', async () => {
      // resolveBizClientId
      prismaMock.staff.findUnique.mockResolvedValue({ clientId: BIZ_CLIENT_ID });
      // resolveClientStaffIds
      prismaMock.clientStaff.findMany.mockResolvedValue([{ staffId: CLIENT_ASSIGNED_1 }]);
      prismaMock.team.findMany.mockResolvedValue([]);
      prismaMock.staff.findMany.mockResolvedValueOnce([]); // C) Staff.clientId

      const where = await callResolveWhere(baseParams, {
        staffId: CLIENT_USER_ID,
        roles: [UserRole.CLIENT],
      });

      expect(where['staff']).toBeDefined();
      expect(where['staff']['id']).toEqual({
        in: expect.arrayContaining([CLIENT_ASSIGNED_1]),
      });
    });

    it('CLIENT with no bizClientId: returns no-match', async () => {
      prismaMock.staff.findUnique.mockResolvedValue({ clientId: null });

      const where = await callResolveWhere(baseParams, {
        staffId: CLIENT_USER_ID,
        roles: [UserRole.CLIENT],
      });

      expect(where['staffId']).toBe('__no_match__');
    });

    it('multi-role MANAGER+EMPLOYEE: uses MANAGER scope (widest)', async () => {
      prismaMock.staff.findMany
        .mockResolvedValueOnce([{ id: DIRECT_REPORT_1 }])
        .mockResolvedValueOnce([]);
      prismaMock.team.findMany.mockResolvedValue([]);

      const where = await callResolveWhere(baseParams, {
        staffId: MGR_ID,
        roles: [UserRole.EMPLOYEE, UserRole.MANAGER],
      });

      // Should NOT fall into EMPLOYEE self-only — MANAGER takes priority
      expect(where['staffId']).toBeUndefined();
      expect(where['staff']).toBeDefined();
      expect(where['staff']['id']).toEqual({
        in: expect.arrayContaining([MGR_ID, DIRECT_REPORT_1]),
      });
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // resolveVibeStaffWhere (VIBE T1, T2) scope tests
  // ══════════════════════════════════════════════════════════════════════════

  describe('resolveVibeStaffWhere (VIBE T1/T2 scope)', () => {
    const callHelper = (
      roles: string[],
      staffId: string,
      filter: { clientId?: string; teamId?: string; officeId?: string } = {},
    ) => (service as any).resolveVibeStaffWhere(roles, staffId, filter);

    it('HR_ADMIN: no id filter', async () => {
      const where = await callHelper([UserRole.HR_ADMIN], 'hr-001');

      expect(where['id']).toBeUndefined();
      expect(where['isDeleted']).toBe(false);
    });

    it('MANAGER: id IN managedIds', async () => {
      prismaMock.staff.findMany
        .mockResolvedValueOnce([{ id: DIRECT_REPORT_1 }])
        .mockResolvedValueOnce([]);
      prismaMock.team.findMany.mockResolvedValue([]);

      const where = await callHelper([UserRole.MANAGER], MGR_ID);

      expect(where['id']).toEqual({
        in: expect.arrayContaining([MGR_ID, DIRECT_REPORT_1]),
      });
    });

    it('CLIENT: id IN clientStaffIds', async () => {
      prismaMock.staff.findUnique.mockResolvedValue({ clientId: BIZ_CLIENT_ID });
      prismaMock.clientStaff.findMany.mockResolvedValue([{ staffId: CLIENT_ASSIGNED_1 }]);
      prismaMock.team.findMany.mockResolvedValue([]);
      prismaMock.staff.findMany.mockResolvedValueOnce([]);

      const where = await callHelper([UserRole.CLIENT], CLIENT_USER_ID);

      expect(where['id']).toEqual({
        in: expect.arrayContaining([CLIENT_ASSIGNED_1]),
      });
    });

    it('EMPLOYEE: id = self', async () => {
      const where = await callHelper([UserRole.EMPLOYEE], EMPLOYEE_ID);

      expect(where['id']).toBe(EMPLOYEE_ID);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // resolveStaffScopeWhere (S25 T2–T6, S39, S40, Birthdays) scope tests
  // ══════════════════════════════════════════════════════════════════════════

  describe('resolveStaffScopeWhere scope', () => {
    const callHelper = (
      params: { companyId?: string; officeId?: string; clientId?: string; teamId?: string },
      user: { staffId: string; roles: string[] },
    ) => (service as any).resolveStaffScopeWhere(params, user);

    it('HR_ADMIN: no id filter', async () => {
      const where = await callHelper({}, {
        staffId: 'hr-001',
        roles: [UserRole.HR_ADMIN],
      });

      expect(where['id']).toBeUndefined();
    });

    it('MANAGER: id IN managedIds', async () => {
      prismaMock.staff.findMany
        .mockResolvedValueOnce([{ id: DIRECT_REPORT_1 }])
        .mockResolvedValueOnce([]);
      prismaMock.team.findMany.mockResolvedValue([]);

      const where = await callHelper({}, {
        staffId: MGR_ID,
        roles: [UserRole.MANAGER],
      });

      expect(where['id']).toEqual({
        in: expect.arrayContaining([MGR_ID, DIRECT_REPORT_1]),
      });
    });

    it('MANAGER with teamId param: both id filter AND teamId applied', async () => {
      prismaMock.staff.findMany
        .mockResolvedValueOnce([{ id: DIRECT_REPORT_1 }])
        .mockResolvedValueOnce([]);
      prismaMock.team.findMany.mockResolvedValue([]);

      const where = await callHelper({ teamId: TEAM_A_ID }, {
        staffId: MGR_ID,
        roles: [UserRole.MANAGER],
      });

      expect(where['id']).toEqual({
        in: expect.arrayContaining([MGR_ID, DIRECT_REPORT_1]),
      });
      expect(where['teamId']).toBe(TEAM_A_ID);
    });

    it('CLIENT: id IN clientStaffIds', async () => {
      prismaMock.staff.findUnique.mockResolvedValue({ clientId: BIZ_CLIENT_ID });
      prismaMock.clientStaff.findMany.mockResolvedValue([{ staffId: CLIENT_ASSIGNED_1 }]);
      prismaMock.team.findMany.mockResolvedValue([]);
      prismaMock.staff.findMany.mockResolvedValueOnce([]);

      const where = await callHelper({}, {
        staffId: CLIENT_USER_ID,
        roles: [UserRole.CLIENT],
      });

      expect(where['id']).toEqual({
        in: expect.arrayContaining([CLIENT_ASSIGNED_1]),
      });
    });

    it('EMPLOYEE: id = self', async () => {
      const where = await callHelper({}, {
        staffId: EMPLOYEE_ID,
        roles: [UserRole.EMPLOYEE],
      });

      expect(where['id']).toBe(EMPLOYEE_ID);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // Safe-by-default assertions
  // ══════════════════════════════════════════════════════════════════════════

  describe('safe-by-default behavior', () => {
    it('resolveManagerStaffIds with no reports returns only self', async () => {
      prismaMock.staff.findMany.mockResolvedValue([]);
      prismaMock.team.findMany.mockResolvedValue([]);

      const ids = await (service as any).resolveManagerStaffIds(MGR_ID);

      expect(ids).toEqual([MGR_ID]);
    });

    it('resolveClientStaffIds with no matches returns empty array', async () => {
      prismaMock.clientStaff.findMany.mockResolvedValue([]);
      prismaMock.team.findMany.mockResolvedValue([]);
      prismaMock.staff.findMany.mockResolvedValue([]);

      const ids = await (service as any).resolveClientStaffIds(BIZ_CLIENT_ID);

      expect(ids).toEqual([]);
    });

    it('CLIENT with null bizClientId produces no-match in resolveWhere', async () => {
      prismaMock.staff.findUnique.mockResolvedValue({ clientId: null });

      const where = await (service as any).resolveWhere(
        { startDate: '2026-01-01', endDate: '2026-01-31' },
        { staffId: CLIENT_USER_ID, roles: [UserRole.CLIENT] },
      );

      expect(where['staffId']).toBe('__no_match__');
    });

    it('CLIENT with null bizClientId produces no-match in resolveVibeStaffWhere', async () => {
      prismaMock.staff.findUnique.mockResolvedValue({ clientId: null });

      const where = await (service as any).resolveVibeStaffWhere(
        [UserRole.CLIENT],
        CLIENT_USER_ID,
        {},
      );

      expect(where['id']).toBe('__no_match__');
    });

    it('CLIENT with null bizClientId produces no-match in resolveStaffScopeWhere', async () => {
      prismaMock.staff.findUnique.mockResolvedValue({ clientId: null });

      const where = await (service as any).resolveStaffScopeWhere(
        {},
        { staffId: CLIENT_USER_ID, roles: [UserRole.CLIENT] },
      );

      expect(where['id']).toBe('__no_match__');
    });
  });
});
