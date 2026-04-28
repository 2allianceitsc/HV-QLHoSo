import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { StatusService } from '../status/status.service';
import { EmailJobService } from '../email/email-job.service';

// ── Mocks ──────────────────────────────────────────────────────────────────────

const prismaMock = {
  timeTracking: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  userLogin: {
    updateMany: jest.fn(),
  },
  staff: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
  },
  systemSetting: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
  statusDefinition: {
    findFirst: jest.fn(),
  },
  emailQueue: {
    create: jest.fn(),
  },
  vIBEIcons: {
    findUnique: jest.fn(),
  },
  moodLog: {
    create: jest.fn(),
  },
  // Simulate $transaction by running the callback with prismaMock itself as tx
  $transaction: jest.fn().mockImplementation((fn: (tx: unknown) => Promise<unknown>) => fn(prismaMock)),
};

const notificationsMock = {
  create: jest.fn(),
  broadcastToManagers: jest.fn(),
  existsByNote: jest.fn().mockResolvedValue(false), // default: dedup key not seen yet
};

const emailJobServiceMock = {
  trigger: jest.fn(),
};

const statusServiceMock = {
  getStatusesForUser: jest.fn(),
};

// ── Base DTO ───────────────────────────────────────────────────────────────────

const baseDto = {
  statusId: 'status-A',
  timezone: 'Asia/Ho_Chi_Minh',
  notes: undefined as string | undefined,
};

// ── Suite ──────────────────────────────────────────────────────────────────────

describe('AttendanceService.changeStatus — scope validation (E201)', () => {
  let service: AttendanceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttendanceService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: NotificationsService, useValue: notificationsMock },
        { provide: StatusService, useValue: statusServiceMock },
        { provide: EmailJobService, useValue: emailJobServiceMock },
      ],
    }).compile();

    service = module.get<AttendanceService>(AttendanceService);
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ── TC-14 ──────────────────────────────────────────────────────────────────

  it('TC-14: Valid statusId in allowed scope → changeStatus succeeds (no exception)', async () => {
    statusServiceMock.getStatusesForUser.mockResolvedValue([
      { id: 'status-A', name: 'Working' },
    ]);
    // No open record → skip break check
    prismaMock.timeTracking.findFirst.mockResolvedValue(null);
    // Staff shift times
    prismaMock.staff.findUnique.mockResolvedValue({ shiftStartTime: null, shiftEndTime: null });
    // Create returns a mock record
    prismaMock.timeTracking.create.mockResolvedValue({ id: 'tt-new', statusId: 'status-A' });

    await expect(
      service.changeStatus('staff-1', { ...baseDto, statusId: 'status-A' }),
    ).resolves.not.toThrow();
  });

  // ── TC-15 ──────────────────────────────────────────────────────────────────

  it('TC-15: statusId NOT in allowed scope → throws ForbiddenException with E201', async () => {
    statusServiceMock.getStatusesForUser.mockResolvedValue([
      { id: 'status-A', name: 'Team Working' },
    ]);

    await expect(
      service.changeStatus('staff-1', { ...baseDto, statusId: 'status-B' }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('TC-15b: ForbiddenException carries code E201 and correct message', async () => {
    statusServiceMock.getStatusesForUser.mockResolvedValue([
      { id: 'status-A', name: 'Team Working' },
    ]);

    let caughtError: ForbiddenException | undefined;
    try {
      await service.changeStatus('staff-1', { ...baseDto, statusId: 'status-B' });
    } catch (err) {
      caughtError = err as ForbiddenException;
    }

    expect(caughtError).toBeInstanceOf(ForbiddenException);
    const body = caughtError!.getResponse() as { code: string; message: string };
    expect(body.code).toBe('E201');
    expect(body.message).toMatch(/not available/i);
  });

  // ── TC-16 ──────────────────────────────────────────────────────────────────

  it('TC-16: Logout status from company scope is rejected when employee is in team scope', async () => {
    // Employee resolved to team statuses (team scope only — no logout status)
    statusServiceMock.getStatusesForUser.mockResolvedValue([
      { id: 'team-working', name: 'Working' },
      { id: 'team-break', name: 'Break' },
    ]);

    // Attempt to use a company-scope logout status
    await expect(
      service.changeStatus('staff-1', { ...baseDto, statusId: 'company-logout-status' }),
    ).rejects.toThrow(ForbiddenException);
  });

  // ── TC-17 ──────────────────────────────────────────────────────────────────

  it('TC-17: E201 is raised before break duration validation (scope check runs first)', async () => {
    // Step 0 (scope check): out-of-scope status → should throw E201 immediately
    statusServiceMock.getStatusesForUser.mockResolvedValue([
      { id: 'status-A', name: 'Working' },
    ]);

    // If break check ran first it would throw BadRequestException about break notes.
    // Providing no notes + out-of-scope status: E201 must come first.
    const dto = { ...baseDto, statusId: 'out-of-scope-status', notes: undefined };

    let thrownError: unknown;
    try {
      await service.changeStatus('staff-1', dto);
    } catch (err) {
      thrownError = err;
    }

    // Must be ForbiddenException (E201), not BadRequestException (break note)
    expect(thrownError).toBeInstanceOf(ForbiddenException);
    // Prisma timeTracking.findFirst (Step 1) must not have been called
    // because scope check (Step 0) threw before reaching Step 1
    expect(prismaMock.timeTracking.findFirst).not.toHaveBeenCalled();
  });

  it('TC-17c: overbreak notes are saved only to previous break record', async () => {
    const now = new Date('2026-04-13T03:10:00.000Z');
    jest.useFakeTimers().setSystemTime(now);

    statusServiceMock.getStatusesForUser.mockResolvedValue([
      { id: 'status-A', name: 'Working' },
    ]);
    prismaMock.timeTracking.findFirst.mockResolvedValue({
      id: 'open-break-1',
      staffId: 'staff-1',
      startTime: new Date('2026-04-13T03:00:00.000Z'),
      status: {
        isBreak: true,
        maxDurationSeconds: 300,
      },
    });
    prismaMock.staff.findUnique.mockResolvedValue({ shiftStartTime: null, shiftEndTime: null });
    prismaMock.timeTracking.create.mockResolvedValue({ id: 'tt-new', statusId: 'status-A' });

    await service.changeStatus('staff-1', {
      ...baseDto,
      statusId: 'status-A',
      notes: 'Need extra time for urgent call',
    });

    expect(prismaMock.timeTracking.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'open-break-1' },
        data: expect.objectContaining({
          notes: 'Need extra time for urgent call',
        }),
      }),
    );

    expect(prismaMock.timeTracking.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          notes: null,
        }),
      }),
    );
  });

  it('TC-18: autoLogout closes record at latestEndShiftTime and inserts logout status record', async () => {
    const now = new Date('2026-04-09T06:05:00.000Z');
    jest.useFakeTimers().setSystemTime(now);

    prismaMock.systemSetting.findMany.mockResolvedValue([
      { key: 'attendance.auto_logout.enabled', value: 'true' },
      { key: 'notification.auto_logout_in_app.enabled', value: 'true' },
      { key: 'notification.auto_logout_email.enabled', value: 'false' },
    ]);
    prismaMock.timeTracking.findMany.mockResolvedValue([
      {
        id: 'open-record',
        staffId: 'staff-1',
        startTime: new Date('2026-04-09T04:00:00.000Z'),
        shiftStartTime: '08:00',
        shiftEndTime: '17:00',
        timezone: 'UTC',
        notes: null,
        staff: {
          id: 'staff-1',
          companyId: 'company-1',
          firstName: 'Khanh',
          email: 'khanh@example.com',
          latestEndShiftTime: '06:00',
        },
      },
    ]);
    statusServiceMock.getStatusesForUser.mockResolvedValue([
      { id: 'logout-status', isLogoutStatus: true },
    ]);
    prismaMock.timeTracking.findFirst.mockResolvedValue({
      status: { isLogoutStatus: false },
    });
    // idempotency check inside $transaction: record not yet closed
    prismaMock.timeTracking.findUnique.mockResolvedValue({ endTime: null });
    prismaMock.userLogin.updateMany.mockResolvedValue({});

    await service.autoLogout();

    expect(prismaMock.timeTracking.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'open-record' },
        data: expect.objectContaining({
          durationSeconds: 7200,
          notes: expect.stringContaining('Auto logout — shift ended'),
        }),
      }),
    );
    expect(prismaMock.timeTracking.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          staffId: 'staff-1',
          statusId: 'logout-status',
          durationSeconds: 0,
          notes: expect.stringContaining('Auto logout — shift ended'),
        }),
      }),
    );
    expect(notificationsMock.create).toHaveBeenCalledWith(
      'staff-1',
      'Auto Logout',
      'You were automatically logged out at 06:00 as your shift has ended.',
      'alert',
      '/login?reason=auto-logout',
    );

  });

  it('TC-21: autoLogout skips records that started after latestEndShiftTime', async () => {
    const now = new Date('2026-04-09T06:05:00.000Z');
    jest.useFakeTimers().setSystemTime(now);

    prismaMock.systemSetting.findMany.mockResolvedValue([
      { key: 'attendance.auto_logout.enabled', value: 'true' },
      { key: 'notification.auto_logout_in_app.enabled', value: 'true' },
      { key: 'notification.auto_logout_email.enabled', value: 'false' },
    ]);
    prismaMock.timeTracking.findMany.mockResolvedValue([
      {
        id: 'late-record',
        staffId: 'staff-1',
        startTime: new Date('2026-04-09T06:03:00.000Z'),
        shiftStartTime: '08:00',
        shiftEndTime: '17:00',
        timezone: 'Asia/Ho_Chi_Minh',
        notes: null,
        staff: {
          id: 'staff-1',
          companyId: 'company-1',
          firstName: 'Khanh',
          email: 'khanh@example.com',
          latestEndShiftTime: '06:00',
        },
      },
    ]);
    statusServiceMock.getStatusesForUser.mockResolvedValue([
      { id: 'logout-status', isLogoutStatus: true },
    ]);
    prismaMock.timeTracking.findFirst.mockResolvedValue({
      status: { isLogoutStatus: false },
    });

    await service.autoLogout();

    expect(prismaMock.timeTracking.update).not.toHaveBeenCalled();
    expect(prismaMock.timeTracking.create).not.toHaveBeenCalled();
  });

  it('TC-19: autoLogout exits early when feature toggle is disabled', async () => {
    prismaMock.systemSetting.findMany.mockResolvedValue([
      { key: 'attendance.auto_logout.enabled', value: 'false' },
    ]);

    await service.autoLogout();

    expect(prismaMock.timeTracking.findMany).not.toHaveBeenCalled();
  });

  it('TC-23 (R_ALO_01): autoLogout on overbreak record → break row gets distinct notes, logout row stays generic', async () => {
    // BA §4.2 + §7.5: when the open record is a break that exceeded maxDurationSeconds,
    // the break row receives "Auto logout — break time exceeded, no status selected [cron:…]"
    // The logout TT row always gets the generic "Auto logout — shift ended [cron:…]".
    const now = new Date('2026-04-09T06:05:00.000Z');
    jest.useFakeTimers().setSystemTime(now);

    prismaMock.systemSetting.findMany.mockResolvedValue([
      { key: 'attendance.auto_logout.enabled', value: 'true' },
      { key: 'notification.auto_logout_in_app.enabled', value: 'false' },
      { key: 'notification.auto_logout_email.enabled', value: 'false' },
    ]);
    // Break started 2h before shift end → elapsed 7200s > maxDurationSeconds 1800s → overbreak
    prismaMock.timeTracking.findMany.mockResolvedValue([
      {
        id: 'open-break-record',
        staffId: 'staff-1',
        startTime: new Date('2026-04-09T04:00:00.000Z'),
        shiftStartTime: '08:00',
        shiftEndTime: '17:00',
        timezone: 'UTC',
        notes: null,
        staff: {
          id: 'staff-1',
          companyId: 'company-1',
          firstName: 'Alice',
          email: 'alice@example.com',
          latestStartTime: '08:00',
          latestEndShiftTime: '06:00',
          shiftEndDayOffset: 0,
          timezone: 'UTC',
        },
        status: { isLogoutStatus: false, isBreak: true, maxDurationSeconds: 1800 },
      },
    ]);
    statusServiceMock.getStatusesForUser.mockResolvedValue([
      { id: 'logout-status', isLogoutStatus: true },
    ]);
    prismaMock.timeTracking.findFirst.mockResolvedValue({ status: { isLogoutStatus: false } });
    prismaMock.timeTracking.findUnique.mockResolvedValue({ endTime: null });
    prismaMock.userLogin.updateMany.mockResolvedValue({});

    await service.autoLogout();

    // Break row must carry the overbreak-specific note
    expect(prismaMock.timeTracking.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'open-break-record' },
        data: expect.objectContaining({
          notes: expect.stringContaining('Auto logout — break time exceeded, no status selected'),
        }),
      }),
    );
    // Logout row keeps generic note
    expect(prismaMock.timeTracking.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          notes: expect.stringContaining('Auto logout — shift ended'),
        }),
      }),
    );
  });

  it('TC-24 (R_ALO_02): autoLogout on non-overbreak break → break row gets standard notes', async () => {
    // Break within limit (elapsed < maxDurationSeconds) → normal "Auto logout — shift ended" note
    const now = new Date('2026-04-09T06:05:00.000Z');
    jest.useFakeTimers().setSystemTime(now);

    prismaMock.systemSetting.findMany.mockResolvedValue([
      { key: 'attendance.auto_logout.enabled', value: 'true' },
      { key: 'notification.auto_logout_in_app.enabled', value: 'false' },
      { key: 'notification.auto_logout_email.enabled', value: 'false' },
    ]);
    // Break started only 10 min before shift end → elapsed 600s < maxDurationSeconds 1800s
    prismaMock.timeTracking.findMany.mockResolvedValue([
      {
        id: 'open-break-within-limit',
        staffId: 'staff-2',
        startTime: new Date('2026-04-09T05:50:00.000Z'),
        shiftStartTime: '08:00',
        shiftEndTime: '17:00',
        timezone: 'UTC',
        notes: null,
        staff: {
          id: 'staff-2',
          companyId: 'company-1',
          firstName: 'Bob',
          email: 'bob@example.com',
          latestStartTime: '08:00',
          latestEndShiftTime: '06:00',
          shiftEndDayOffset: 0,
          timezone: 'UTC',
        },
        status: { isLogoutStatus: false, isBreak: true, maxDurationSeconds: 1800 },
      },
    ]);
    statusServiceMock.getStatusesForUser.mockResolvedValue([
      { id: 'logout-status', isLogoutStatus: true },
    ]);
    prismaMock.timeTracking.findFirst.mockResolvedValue({ status: { isLogoutStatus: false } });
    prismaMock.timeTracking.findUnique.mockResolvedValue({ endTime: null });
    prismaMock.userLogin.updateMany.mockResolvedValue({});

    await service.autoLogout();

    // Not an overbreak → standard note (must NOT contain the overbreak phrase)
    expect(prismaMock.timeTracking.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'open-break-within-limit' },
        data: expect.objectContaining({
          notes: expect.stringContaining('Auto logout — shift ended'),
        }),
      }),
    );
    expect(prismaMock.timeTracking.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.not.objectContaining({
          notes: expect.stringContaining('break time exceeded'),
        }),
      }),
    );
  });

  it('TC-22: autoLogout skips when the latest status in shift window is already logout', async () => {
    const now = new Date('2026-04-09T06:05:00.000Z');
    jest.useFakeTimers().setSystemTime(now);

    prismaMock.systemSetting.findMany.mockResolvedValue([
      { key: 'attendance.auto_logout.enabled', value: 'true' },
      { key: 'notification.auto_logout_in_app.enabled', value: 'true' },
      { key: 'notification.auto_logout_email.enabled', value: 'false' },
    ]);
    prismaMock.timeTracking.findMany.mockResolvedValue([
      {
        id: 'open-record-logout-latest',
        staffId: 'staff-1',
        startTime: new Date('2026-04-09T04:00:00.000Z'),
        shiftStartTime: '08:00',
        shiftEndTime: '17:00',
        timezone: 'Asia/Ho_Chi_Minh',
        notes: null,
        staff: {
          id: 'staff-1',
          companyId: 'company-1',
          firstName: 'Khanh',
          email: 'khanh@example.com',
          latestStartTime: '08:00',
          latestEndShiftTime: '13:00',
          shiftEndDayOffset: 0,
        },
      },
    ]);
    statusServiceMock.getStatusesForUser.mockResolvedValue([
      { id: 'logout-status', isLogoutStatus: true },
    ]);
    prismaMock.timeTracking.findFirst.mockResolvedValue({
      status: { isLogoutStatus: true },
    });

    await service.autoLogout();

    expect(prismaMock.timeTracking.update).not.toHaveBeenCalled();
    expect(prismaMock.timeTracking.create).not.toHaveBeenCalled();
    expect(notificationsMock.create).not.toHaveBeenCalled();
  });
});

// ── logout() — manual logout note isolation ────────────────────────────────────

describe('AttendanceService.logout — manual logout', () => {
  let service: AttendanceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttendanceService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: NotificationsService, useValue: notificationsMock },
        { provide: StatusService, useValue: statusServiceMock },
        { provide: EmailJobService, useValue: emailJobServiceMock },
      ],
    }).compile();

    service = module.get<AttendanceService>(AttendanceService);
    jest.clearAllMocks();
  });

  it('TC-L01: manual logout after latestEndShiftTime must NOT append auto-logout notes to open record', async () => {
    // Staff whose shift ended at 23:00 — user logs out at 23:06 manually
    prismaMock.staff.findUnique.mockResolvedValue({
      companyId: 'company-1',
      latestEndShiftTime: '23:00',
      shiftStartTime: '09:00',
      shiftEndTime: '23:00',
      timezone: 'Asia/Ho_Chi_Minh',
    });
    prismaMock.timeTracking.findFirst.mockResolvedValue({
      id: 'open-record-pantry',
      startTime: new Date('2026-04-14T16:03:00Z'), // 23:03 HCM
      notes: null,
    });
    statusServiceMock.getStatusesForUser.mockResolvedValue([
      { id: 'logout-status', isLogoutStatus: true },
    ]);
    prismaMock.vIBEIcons.findUnique.mockResolvedValue({ name: 'Happy' });
    prismaMock.timeTracking.create.mockResolvedValue({});
    prismaMock.moodLog.create.mockResolvedValue({});

    await service.logout('staff-1', { vibeIconId: 'icon-1', comment: '' }, 'staff-1');

    const updateCall = prismaMock.timeTracking.update.mock.calls[0][0];
    expect(updateCall.data.notes).toBeUndefined(); // notes field not touched
    expect(updateCall.data).not.toHaveProperty('notes'); // regression guard
  });

  it('TC-L02: manual logout within shift time also must NOT append auto-logout notes', async () => {
    prismaMock.staff.findUnique.mockResolvedValue({
      companyId: 'company-1',
      latestEndShiftTime: '23:00',
      shiftStartTime: '09:00',
      shiftEndTime: '23:00',
      timezone: 'Asia/Ho_Chi_Minh',
    });
    prismaMock.timeTracking.findFirst.mockResolvedValue({
      id: 'open-record-working',
      startTime: new Date('2026-04-14T08:00:00Z'),
      notes: null,
    });
    statusServiceMock.getStatusesForUser.mockResolvedValue([
      { id: 'logout-status', isLogoutStatus: true },
    ]);
    prismaMock.vIBEIcons.findUnique.mockResolvedValue({ name: 'Neutral' });
    prismaMock.timeTracking.create.mockResolvedValue({});
    prismaMock.moodLog.create.mockResolvedValue({});

    await service.logout('staff-1', { vibeIconId: 'icon-2', comment: '' }, 'staff-1');

    const updateCall = prismaMock.timeTracking.update.mock.calls[0][0];
    expect(updateCall.data).not.toHaveProperty('notes');
  });
});

// ── changeStatus() — business rules ───────────────────────────────────────────
// BA: §6.2 (Status Change Flow), §7.5 M03 (Over-Break modal), R077, N-A04
// Test plan: QC/test-coverage/CHANGE-STATUS-TEST-PLAN.md

describe('AttendanceService.changeStatus — business rules', () => {
  let service: AttendanceService;

  const STAFF_ID = 'staff-cs';
  const STATUS_ID = 'status-working';
  const BREAK_STATUS_ID = 'status-break';

  const baseDto = { statusId: STATUS_ID, timezone: 'Asia/Ho_Chi_Minh' };

  /** Default staff row — override per test as needed */
  const defaultStaff = {
    shiftStartTime: '08:00',
    shiftEndTime: '17:00',
    latestEndShiftTime: '18:00',
    managerId: null as string | null,
    firstName: 'Alice',
    surname: 'Nguyen',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttendanceService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: NotificationsService, useValue: notificationsMock },
        { provide: StatusService, useValue: statusServiceMock },
        { provide: EmailJobService, useValue: emailJobServiceMock },
      ],
    }).compile();

    service = module.get<AttendanceService>(AttendanceService);
    jest.clearAllMocks();

    // Default: statusId is allowed in scope
    statusServiceMock.getStatusesForUser.mockResolvedValue([
      { id: STATUS_ID, name: 'Working', isLogoutStatus: false, isBreak: false },
      { id: BREAK_STATUS_ID, name: 'Break', isLogoutStatus: false, isBreak: true },
    ]);

    // Default: no open record, staff has standard shift
    prismaMock.timeTracking.findFirst.mockResolvedValue(null);
    prismaMock.staff.findUnique.mockResolvedValue(defaultStaff);
    prismaMock.timeTracking.create.mockResolvedValue({
      id: 'new-record',
      staffId: STAFF_ID,
      statusId: STATUS_ID,
      startTime: new Date(),
      status: { id: STATUS_ID, name: 'Working', isBreak: false, isLogoutStatus: false },
    });
  });

  // ── TC-CS01: R_CS_02 ────────────────────────────────────────────────────────
  it('TC-CS01 (R_CS_02): no open record → INSERT only, UPDATE never called', async () => {
    prismaMock.timeTracking.findFirst.mockResolvedValue(null);

    await service.changeStatus(STAFF_ID, baseDto);

    expect(prismaMock.timeTracking.update).not.toHaveBeenCalled();
    expect(prismaMock.timeTracking.create).toHaveBeenCalledTimes(1);
  });

  // ── TC-CS02: R_CS_03 ────────────────────────────────────────────────────────
  it('TC-CS02 (R_CS_03): open non-break record → UPDATE closes it then INSERT new', async () => {
    prismaMock.timeTracking.findFirst.mockResolvedValue({
      id: 'open-working',
      startTime: new Date(Date.now() - 3600_000),
      status: { isBreak: false, maxDurationSeconds: null },
    });

    await service.changeStatus(STAFF_ID, baseDto);

    expect(prismaMock.timeTracking.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'open-working' } }),
    );
    expect(prismaMock.timeTracking.create).toHaveBeenCalledTimes(1);
  });

  // ── TC-CS03: R_CS_06 ────────────────────────────────────────────────────────
  it('TC-CS03 (R_CS_06): break within limit + notes → notes go to NEW row only', async () => {
    const MAX = 1800; // 30 min
    prismaMock.timeTracking.findFirst.mockResolvedValue({
      id: 'open-break',
      startTime: new Date(Date.now() - 10_000), // only 10s elapsed — within limit
      status: { isBreak: true, maxDurationSeconds: MAX },
    });

    await service.changeStatus(STAFF_ID, { ...baseDto, notes: 'Went for coffee' });

    // Break row UPDATE must NOT carry the notes (notes belong to the new row)
    const updateCall = prismaMock.timeTracking.update.mock.calls[0][0];
    expect(updateCall.data).not.toHaveProperty('notes');

    // New row must have the notes
    const createCall = prismaMock.timeTracking.create.mock.calls[0][0];
    expect(createCall.data.notes).toBe('Went for coffee');
  });

  // ── TC-CS04: R_CS_04 ────────────────────────────────────────────────────────
  it('TC-CS04 (R_CS_04): break exceeded + NO notes → BadRequestException', async () => {
    prismaMock.timeTracking.findFirst.mockResolvedValue({
      id: 'open-break-over',
      startTime: new Date(Date.now() - 3_600_000), // 60 min elapsed
      status: { isBreak: true, maxDurationSeconds: 1800 }, // max 30 min
    });

    await expect(
      service.changeStatus(STAFF_ID, { ...baseDto, notes: undefined }),
    ).rejects.toThrow('Break time exceeded');
  });

  // ── TC-CS05: R_CS_05 ────────────────────────────────────────────────────────
  it('TC-CS05 (R_CS_05): break exceeded + notes → notes to OLD break row; new row notes = null', async () => {
    // BA §7.5 M03 + R077: note goes to break row for Over-Break report (S25 T3)
    prismaMock.timeTracking.findFirst.mockResolvedValue({
      id: 'open-break-over',
      startTime: new Date(Date.now() - 3_600_000),
      status: { isBreak: true, maxDurationSeconds: 1800 },
    });

    await service.changeStatus(STAFF_ID, { ...baseDto, notes: 'Felt unwell' });

    // Break row UPDATE must carry the notes
    const updateCall = prismaMock.timeTracking.update.mock.calls[0][0];
    expect(updateCall.data.notes).toBe('Felt unwell');

    // New row must have null notes (not the break reason)
    const createCall = prismaMock.timeTracking.create.mock.calls[0][0];
    expect(createCall.data.notes).toBeNull();
  });

  // ── TC-CS06: R_CS_07 ────────────────────────────────────────────────────────
  it('TC-CS06 (R_CS_07): break exceeded + managerId → N-A04 manager notification sent', async () => {
    // BA §4.2, N-A04: manager receives notification when employee over-break closes
    prismaMock.staff.findUnique.mockResolvedValue({
      ...defaultStaff,
      managerId: 'manager-1',
    });
    prismaMock.timeTracking.findFirst.mockResolvedValue({
      id: 'open-break-over',
      startTime: new Date(Date.now() - 3_600_000),
      status: { isBreak: true, maxDurationSeconds: 1800 },
    });
    // N-A04: notification feature enabled
    prismaMock.systemSetting.findUnique.mockResolvedValue({ value: 'true' });
    notificationsMock.existsByNote.mockResolvedValue(false); // dedup: not sent yet

    await service.changeStatus(STAFF_ID, { ...baseDto, notes: 'Traffic jam' });

    // sendOverBreakManagerNotification is fire-and-forget (void) — flush microtasks
    await Promise.resolve();

    expect(notificationsMock.create).toHaveBeenCalledWith(
      'manager-1',
      expect.stringContaining('Break'),
      expect.stringContaining('Alice'),
      'warning',
      '/attendance/team',
      expect.stringContaining('over-break'),
    );
  });

  // ── TC-CS07: R_CS_08 ────────────────────────────────────────────────────────
  it('TC-CS07 (R_CS_08): break exceeded + no managerId → notification NOT sent', async () => {
    prismaMock.staff.findUnique.mockResolvedValue({ ...defaultStaff, managerId: null });
    prismaMock.timeTracking.findFirst.mockResolvedValue({
      id: 'open-break-over',
      startTime: new Date(Date.now() - 3_600_000),
      status: { isBreak: true, maxDurationSeconds: 1800 },
    });

    await service.changeStatus(STAFF_ID, { ...baseDto, notes: 'Reason provided' });

    expect(notificationsMock.create).not.toHaveBeenCalled();
  });

  // ── TC-CS08: R_CS_09 ────────────────────────────────────────────────────────
  it('TC-CS08 (R_CS_09): maxDurationSeconds=0 → no break limit enforced (0 = unlimited)', async () => {
    // BA §5.5: 0 = no limit — should never throw regardless of elapsed time
    prismaMock.timeTracking.findFirst.mockResolvedValue({
      id: 'open-break-unlimited',
      startTime: new Date(Date.now() - 10_000_000), // huge elapsed
      status: { isBreak: true, maxDurationSeconds: 0 },
    });

    await expect(
      service.changeStatus(STAFF_ID, { ...baseDto, notes: undefined }),
    ).resolves.toBeDefined();

    expect(prismaMock.timeTracking.create).toHaveBeenCalledTimes(1);
  });

  // ── TC-CS09: R_CS_10 ────────────────────────────────────────────────────────
  it('TC-CS09 (R_CS_10): whitespace-only notes treated as empty → BadRequestException on over-break', async () => {
    prismaMock.timeTracking.findFirst.mockResolvedValue({
      id: 'open-break-over',
      startTime: new Date(Date.now() - 3_600_000),
      status: { isBreak: true, maxDurationSeconds: 1800 },
    });

    await expect(
      service.changeStatus(STAFF_ID, { ...baseDto, notes: '   ' }),
    ).rejects.toThrow('Break time exceeded');
  });

  // ── TC-CS10: R_CS_11 ────────────────────────────────────────────────────────
  it('TC-CS10 (R_CS_11): new TT row inherits shiftStartTime/shiftEndTime from Staff', async () => {
    prismaMock.staff.findUnique.mockResolvedValue({
      ...defaultStaff,
      shiftStartTime: '09:00',
      shiftEndTime: '18:00',
    });

    await service.changeStatus(STAFF_ID, baseDto);

    const createCall = prismaMock.timeTracking.create.mock.calls[0][0];
    expect(createCall.data.shiftStartTime).toBe('09:00');
    expect(createCall.data.shiftEndTime).toBe('18:00');
  });

  // ── TC-CS11: R_CS_12 ────────────────────────────────────────────────────────
  it('TC-CS11 (R_CS_12): E201 scope guard fires BEFORE break duration check', async () => {
    // Even if employee is in an over-break state, E201 fires first
    statusServiceMock.getStatusesForUser.mockResolvedValue([
      { id: 'status-allowed', name: 'Working' },
      // STATUS_ID deliberately omitted — not in scope
    ]);
    prismaMock.timeTracking.findFirst.mockResolvedValue({
      id: 'open-break-over',
      startTime: new Date(Date.now() - 3_600_000),
      status: { isBreak: true, maxDurationSeconds: 1800 },
    });

    await expect(
      service.changeStatus(STAFF_ID, { statusId: STATUS_ID, timezone: 'UTC' }),
    ).rejects.toThrow('not available');

    // Break check must never run — create/update not called
    expect(prismaMock.timeTracking.update).not.toHaveBeenCalled();
    expect(prismaMock.timeTracking.create).not.toHaveBeenCalled();
  });
});
