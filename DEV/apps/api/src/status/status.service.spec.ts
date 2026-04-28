import { Test, TestingModule } from '@nestjs/testing';
import { StatusService } from './status.service';
import { PrismaService } from '../prisma/prisma.service';

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeStatus(overrides: Record<string, unknown> = {}) {
  return {
    id: 'status-id',
    name: 'Working',
    isDeleted: false,
    isDisabled: false,
    orderNo: 1,
    companyId: null,
    officeId: null,
    clientId: null,
    teamId: null,
    ...overrides,
  };
}

/**
 * Return a mock implementation for prisma.statusDefinition.findMany that
 * routes by the `where` clause to a named scope bucket.
 * This keeps tests order-independent (Promise.all fires all 5 queries at once).
 */
function scopedFindMany(buckets: {
  global?: ReturnType<typeof makeStatus>[];
  company?: ReturnType<typeof makeStatus>[];
  office?: ReturnType<typeof makeStatus>[];
  client?: ReturnType<typeof makeStatus>[];
  team?: ReturnType<typeof makeStatus>[];
}) {
  return (args: { where: Record<string, unknown> }) => {
    const w = args.where;
    // Global: all scope fields explicitly null
    if (w.companyId === null && w.officeId === null && w.clientId === null && w.teamId === null) {
      return Promise.resolve(buckets.global ?? []);
    }
    if (w.teamId !== undefined) return Promise.resolve(buckets.team ?? []);
    if (w.officeId !== undefined) return Promise.resolve(buckets.office ?? []);
    if (w.clientId !== undefined) return Promise.resolve(buckets.client ?? []);
    if (w.companyId !== undefined) return Promise.resolve(buckets.company ?? []);
    return Promise.resolve([]);
  };
}

// ── Mock ───────────────────────────────────────────────────────────────────────

const prismaMock = {
  staff: { findFirst: jest.fn() },
  statusDefinition: { findMany: jest.fn() },
  clientStaff: { findMany: jest.fn() },
};

// ── Suite ──────────────────────────────────────────────────────────────────────

describe('StatusService.getStatusesForUser — UNION merge (BA 2026-04-23)', () => {
  let service: StatusService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StatusService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<StatusService>(StatusService);
    jest.clearAllMocks();
  });

  // ── TC-01 ──────────────────────────────────────────────────────────────────

  it('TC-01: all 4 scopes populated → returns UNION of all 4', async () => {
    prismaMock.staff.findFirst.mockResolvedValue({
      teamId: 'T1',
      officeId: 'O1',
      companyId: 'CO1',
    });
    prismaMock.clientStaff.findMany.mockResolvedValue([{ clientId: 'CL1' }]);
    prismaMock.statusDefinition.findMany.mockImplementation(
      scopedFindMany({
        company: [makeStatus({ id: 'co-s', name: 'Company Working', orderNo: 1 })],
        office: [makeStatus({ id: 'of-s', name: 'Office Working', orderNo: 2 })],
        client: [makeStatus({ id: 'cl-s', name: 'Client Working', orderNo: 3 })],
        team: [makeStatus({ id: 'te-s', name: 'Team Working', orderNo: 4 })],
      }),
    );

    const result = await service.getStatusesForUser('staff-1');

    expect(result).toHaveLength(4);
    expect(result.map((s) => s.id)).toEqual(['co-s', 'of-s', 'cl-s', 'te-s']);
  });

  // ── TC-02 ──────────────────────────────────────────────────────────────────

  it('TC-02: only Team has statuses → returns team statuses only (no fallback needed)', async () => {
    prismaMock.staff.findFirst.mockResolvedValue({
      teamId: 'T1',
      officeId: 'O1',
      companyId: 'CO1',
    });
    prismaMock.clientStaff.findMany.mockResolvedValue([{ clientId: 'CL1' }]);
    prismaMock.statusDefinition.findMany.mockImplementation(
      scopedFindMany({
        team: [makeStatus({ id: 'te-s', name: 'Team Working' })],
      }),
    );

    const result = await service.getStatusesForUser('staff-1');

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Team Working');
  });

  // ── TC-03 ──────────────────────────────────────────────────────────────────

  it('TC-03: teamId=null → team query is skipped entirely', async () => {
    prismaMock.staff.findFirst.mockResolvedValue({
      teamId: null,
      officeId: 'O1',
      companyId: 'CO1',
    });
    prismaMock.clientStaff.findMany.mockResolvedValue([]);
    prismaMock.statusDefinition.findMany.mockImplementation(
      scopedFindMany({
        office: [makeStatus({ id: 'of-s', name: 'Office Working' })],
      }),
    );

    const result = await service.getStatusesForUser('staff-1');

    expect(result[0].name).toBe('Office Working');
    // No query ever fired with a `teamId` filter
    const calls = prismaMock.statusDefinition.findMany.mock.calls;
    expect(calls.some((c: [{ where: Record<string, unknown> }]) => 'teamId' in c[0].where && c[0].where.teamId !== null)).toBe(false);
  });

  // ── TC-04 ──────────────────────────────────────────────────────────────────

  it('TC-04: multiple clients → client query uses IN list; union across clients', async () => {
    prismaMock.staff.findFirst.mockResolvedValue({
      teamId: null,
      officeId: null,
      companyId: 'CO1',
    });
    prismaMock.clientStaff.findMany.mockResolvedValue([
      { clientId: 'CL1' },
      { clientId: 'CL2' },
    ]);
    prismaMock.statusDefinition.findMany.mockImplementation(
      scopedFindMany({
        client: [
          makeStatus({ id: 'cl1-s', name: 'CL1 Status', orderNo: 1 }),
          makeStatus({ id: 'cl2-s', name: 'CL2 Status', orderNo: 2 }),
        ],
      }),
    );

    const result = await service.getStatusesForUser('staff-1');

    expect(result).toHaveLength(2);
    expect(prismaMock.statusDefinition.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ clientId: { in: ['CL1', 'CL2'] } }),
      }),
    );
  });

  // ── TC-05 ──────────────────────────────────────────────────────────────────

  it('TC-05: dedupe by Id — same status defined across scopes appears once', async () => {
    prismaMock.staff.findFirst.mockResolvedValue({
      teamId: 'T1',
      officeId: 'O1',
      companyId: 'CO1',
    });
    prismaMock.clientStaff.findMany.mockResolvedValue([]);
    const shared = makeStatus({ id: 'shared-id', name: 'Working', orderNo: 1 });
    prismaMock.statusDefinition.findMany.mockImplementation(
      scopedFindMany({
        company: [shared],
        office: [shared],
        team: [shared],
      }),
    );

    const result = await service.getStatusesForUser('staff-1');

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('shared-id');
  });

  // ── TC-06 ──────────────────────────────────────────────────────────────────

  it('TC-06: global statuses (Login/Logout, all scope IDs NULL) are always merged in', async () => {
    prismaMock.staff.findFirst.mockResolvedValue({
      teamId: null,
      officeId: null,
      companyId: 'CO1',
    });
    prismaMock.clientStaff.findMany.mockResolvedValue([]);
    prismaMock.statusDefinition.findMany.mockImplementation(
      scopedFindMany({
        global: [makeStatus({ id: 'logout', name: 'Logout', orderNo: 99 })],
        company: [makeStatus({ id: 'co-s', name: 'Working', orderNo: 1 })],
      }),
    );

    const result = await service.getStatusesForUser('staff-1');

    expect(result).toHaveLength(2);
    expect(result.map((s) => s.id)).toEqual(['co-s', 'logout']);
  });

  // ── TC-07 ──────────────────────────────────────────────────────────────────

  it('TC-07: results sorted by orderNo asc across merged scopes', async () => {
    prismaMock.staff.findFirst.mockResolvedValue({
      teamId: 'T1',
      officeId: 'O1',
      companyId: 'CO1',
    });
    prismaMock.clientStaff.findMany.mockResolvedValue([]);
    prismaMock.statusDefinition.findMany.mockImplementation(
      scopedFindMany({
        company: [makeStatus({ id: 'a', orderNo: 5 })],
        office: [makeStatus({ id: 'b', orderNo: 2 })],
        team: [makeStatus({ id: 'c', orderNo: 8 })],
      }),
    );

    const result = await service.getStatusesForUser('staff-1');

    expect(result.map((s) => s.id)).toEqual(['b', 'a', 'c']);
  });

  // ── TC-08 ──────────────────────────────────────────────────────────────────

  it('TC-08: every scope query includes isDisabled:false + isDeleted:false filters', async () => {
    prismaMock.staff.findFirst.mockResolvedValue({
      teamId: 'T1',
      officeId: 'O1',
      companyId: 'CO1',
    });
    prismaMock.clientStaff.findMany.mockResolvedValue([{ clientId: 'CL1' }]);
    prismaMock.statusDefinition.findMany.mockImplementation(scopedFindMany({}));

    await service.getStatusesForUser('staff-1');

    const calls = prismaMock.statusDefinition.findMany.mock.calls;
    for (const [args] of calls) {
      expect(args.where).toEqual(
        expect.objectContaining({ isDeleted: false, isDisabled: false }),
      );
    }
  });

  // ── TC-09 ──────────────────────────────────────────────────────────────────

  it('TC-09: ClientStaff query filters isDeleted:false', async () => {
    prismaMock.staff.findFirst.mockResolvedValue({
      teamId: null,
      officeId: null,
      companyId: 'CO1',
    });
    prismaMock.clientStaff.findMany.mockResolvedValue([]);
    prismaMock.statusDefinition.findMany.mockImplementation(scopedFindMany({}));

    await service.getStatusesForUser('staff-1');

    expect(prismaMock.clientStaff.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ staffId: 'staff-1', isDeleted: false }),
      }),
    );
  });

  // ── TC-10 ──────────────────────────────────────────────────────────────────

  it('TC-10: staff not found → returns [] without querying statuses', async () => {
    prismaMock.staff.findFirst.mockResolvedValue(null);

    const result = await service.getStatusesForUser('nonexistent');

    expect(result).toEqual([]);
    expect(prismaMock.statusDefinition.findMany).not.toHaveBeenCalled();
  });

  // ── TC-11 ──────────────────────────────────────────────────────────────────

  it('TC-11: no statuses anywhere → returns []', async () => {
    prismaMock.staff.findFirst.mockResolvedValue({
      teamId: 'T1',
      officeId: 'O1',
      companyId: 'CO1',
    });
    prismaMock.clientStaff.findMany.mockResolvedValue([{ clientId: 'CL1' }]);
    prismaMock.statusDefinition.findMany.mockImplementation(scopedFindMany({}));

    const result = await service.getStatusesForUser('staff-1');

    expect(result).toEqual([]);
  });

  // ── TC-12 ──────────────────────────────────────────────────────────────────

  it('TC-12: multi-client union — same-name statuses from different clients are separate records', async () => {
    prismaMock.staff.findFirst.mockResolvedValue({
      teamId: null,
      officeId: null,
      companyId: 'CO1',
    });
    prismaMock.clientStaff.findMany.mockResolvedValue([
      { clientId: 'CL1' },
      { clientId: 'CL2' },
    ]);
    prismaMock.statusDefinition.findMany.mockImplementation(
      scopedFindMany({
        client: [
          makeStatus({ id: 'cl1-working', name: 'Working', orderNo: 1 }),
          makeStatus({ id: 'cl2-working', name: 'Working', orderNo: 2 }),
        ],
      }),
    );

    const result = await service.getStatusesForUser('staff-1');

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('cl1-working');
    expect(result[1].id).toBe('cl2-working');
  });

  // ── TC-13 ──────────────────────────────────────────────────────────────────

  it('TC-13: no clients assigned → client query is skipped', async () => {
    prismaMock.staff.findFirst.mockResolvedValue({
      teamId: null,
      officeId: null,
      companyId: 'CO1',
    });
    prismaMock.clientStaff.findMany.mockResolvedValue([]);
    prismaMock.statusDefinition.findMany.mockImplementation(scopedFindMany({}));

    await service.getStatusesForUser('staff-1');

    const calls = prismaMock.statusDefinition.findMany.mock.calls;
    const clientCall = calls.find(
      (c: [{ where: Record<string, unknown> }]) => 'clientId' in c[0].where && c[0].where.clientId !== null,
    );
    expect(clientCall).toBeUndefined();
  });
});
