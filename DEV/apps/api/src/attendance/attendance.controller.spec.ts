/**
 * Integration Tests: AttendanceController
 *
 * Tests the full HTTP layer: controller + guards + DTO validation + service response.
 * PrismaService and StatusService are mocked. JwtAuthGuard is overridden.
 *
 * BA references: §6.2 (Status Change Flow), §7.5 M03, E201, R077, N-A04
 * Test plan: QC/test-coverage/CHANGE-STATUS-TEST-PLAN.md
 *
 * Run:
 *   pnpm --filter api test -- --testPathPattern attendance.controller
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const request = require('supertest') as typeof import('supertest');
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { PrismaService } from '../prisma/prisma.service';
import { StatusService } from '../status/status.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EmailJobService } from '../email/email-job.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

// ── Mock: stub user injected by JwtAuthGuard ─────────────────────────────────

const MOCK_STAFF_ID = 'staff-integration-test';
const MOCK_USER = {
  sub: 'user-sub-1',
  username: 'alice',
  email: 'alice@test.com',
  staffId: MOCK_STAFF_ID,
  roles: ['EMPLOYEE'],
};

/** Guard that passes through with a fixed user — simulates valid JWT */
const passGuard = { canActivate: (ctx: import('@nestjs/common').ExecutionContext) => {
  const req = ctx.switchToHttp().getRequest();
  req.user = MOCK_USER;
  return true;
}};

// ── Mock: Prisma ──────────────────────────────────────────────────────────────

const STATUS_WORKING = 'status-working-int';
const STATUS_BREAK   = 'status-break-int';

const prismaMock = {
  timeTracking: {
    findFirst:  jest.fn(),
    findMany:   jest.fn(),
    findUnique: jest.fn(),
    create:     jest.fn(),
    update:     jest.fn(),
  },
  staff: {
    findUnique: jest.fn(),
    findFirst:  jest.fn(),
  },
  systemSetting: {
    findMany:   jest.fn(),
    findUnique: jest.fn(),
  },
  statusDefinition: { findFirst: jest.fn() },
  emailQueue:       { create: jest.fn() },
  vIBEIcons:        { findUnique: jest.fn() },
  moodLog:          { create: jest.fn() },
  userLogin:        { updateMany: jest.fn() },
  $transaction: jest.fn().mockImplementation((fn: (tx: unknown) => Promise<unknown>) => fn(prismaMock)),
};

const statusServiceMock = { getStatusesForUser: jest.fn() };
const notificationsMock = { create: jest.fn(), broadcastToManagers: jest.fn() };
const emailJobServiceMock = { trigger: jest.fn() };

// ── Test suite ────────────────────────────────────────────────────────────────

describe('AttendanceController (integration — INT-CS)', () => {
  let app: INestApplication;

  const defaultStaff = {
    shiftStartTime: '08:00',
    shiftEndTime: '17:00',
    latestEndShiftTime: '18:00',
    managerId: null,
    firstName: 'Alice',
    surname: 'Nguyen',
  };

  const newRecord = {
    id: 'new-tt-record',
    staffId: MOCK_STAFF_ID,
    statusId: STATUS_WORKING,
    startTime: new Date().toISOString(),
    status: {
      id: STATUS_WORKING,
      name: 'Working',
      displayName: 'Working',
      colorHex: '#00AA00',
      iconId: null,
      isBreak: false,
      isLogoutStatus: false,
      maxDurationSeconds: null,
    },
  };

  beforeAll(async () => {
    // Register only what the controller needs — avoids pulling in full module
    // dependency trees (NotificationsGateway → ConfigService → JwtService etc.)
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [AttendanceController],
      providers: [
        AttendanceService,
        { provide: PrismaService,       useValue: prismaMock },
        { provide: StatusService,       useValue: statusServiceMock },
        { provide: NotificationsService, useValue: notificationsMock },
        { provide: EmailJobService,     useValue: emailJobServiceMock },
      ],
    })
      .overrideGuard(JwtAuthGuard).useValue(passGuard)
      .compile();

    app = moduleRef.createNestApplication();
    // Mirror production: whitelist strips unknown fields, transform coerces types
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => { await app.close(); });

  beforeEach(() => {
    jest.clearAllMocks();
    // Default: status in scope, no open record, standard staff
    statusServiceMock.getStatusesForUser.mockResolvedValue([
      { id: STATUS_WORKING, name: 'Working', isLogoutStatus: false, isBreak: false },
      { id: STATUS_BREAK,   name: 'Break',   isLogoutStatus: false, isBreak: true  },
    ]);
    prismaMock.timeTracking.findFirst.mockResolvedValue(null);
    prismaMock.staff.findUnique.mockResolvedValue(defaultStaff);
    prismaMock.timeTracking.create.mockResolvedValue(newRecord);
  });

  // ── INT-CS01: Auth guard ────────────────────────────────────────────────────

  it('INT-CS01: POST /attendance without auth → 401 Unauthorized', async () => {
    // Guard that rejects with 401 — simulates missing/invalid JWT token
    const { UnauthorizedException } = await import('@nestjs/common');
    const rejectGuard = { canActivate: () => { throw new UnauthorizedException(); } };

    const strictModule: TestingModule = await Test.createTestingModule({
      controllers: [AttendanceController],
      providers: [
        AttendanceService,
        { provide: PrismaService,        useValue: prismaMock },
        { provide: StatusService,        useValue: statusServiceMock },
        { provide: NotificationsService, useValue: notificationsMock },
        { provide: EmailJobService,      useValue: emailJobServiceMock },
      ],
    })
      .overrideGuard(JwtAuthGuard).useValue(rejectGuard)
      .compile();

    const strictApp = strictModule.createNestApplication();
    await strictApp.init();

    await request(strictApp.getHttpServer())
      .post('/attendance')
      .send({ statusId: STATUS_WORKING })
      .expect(401);

    await strictApp.close();
  });

  // ── INT-CS02: DTO validation ────────────────────────────────────────────────

  it('INT-CS02: POST /attendance missing statusId → 400 with validation errors', async () => {
    const res = await request(app.getHttpServer())
      .post('/attendance')
      .send({}) // statusId omitted
      .expect(400);

    expect(res.body.message).toEqual(expect.arrayContaining([
      expect.stringContaining('statusId'),
    ]));
  });

  // ── INT-CS03: E201 scope error ──────────────────────────────────────────────

  it('INT-CS03 (E201): statusId not in employee scope → 403 with code E201', async () => {
    // BA §6.2, E201 — guard runs before any DB write
    statusServiceMock.getStatusesForUser.mockResolvedValue([
      { id: 'other-status', name: 'Meeting' },
      // STATUS_WORKING deliberately absent
    ]);

    const res = await request(app.getHttpServer())
      .post('/attendance')
      .send({ statusId: STATUS_WORKING })
      .expect(403);

    expect(res.body.code).toBe('E201');
  });

  // ── INT-CS04: Over-break no notes ───────────────────────────────────────────

  it('INT-CS04 (M03): break exceeded with no notes → 400 with relevant message', async () => {
    // BA §7.5 M03 — employee must provide note when leaving an over-break status
    prismaMock.timeTracking.findFirst.mockResolvedValue({
      id: 'open-break',
      startTime: new Date(Date.now() - 7_200_000), // 2h elapsed, max 30m
      status: { isBreak: true, maxDurationSeconds: 1800 },
    });

    const res = await request(app.getHttpServer())
      .post('/attendance')
      .send({ statusId: STATUS_WORKING }) // no notes
      .expect(400);

    expect(res.body.message).toMatch(/break time exceeded/i);
  });

  // ── INT-CS05: Happy path ─────────────────────────────────────────────────────

  it('INT-CS05: valid status change → 201 with new TT record', async () => {
    const res = await request(app.getHttpServer())
      .post('/attendance')
      .send({ statusId: STATUS_WORKING })
      .expect(201);

    expect(res.body).toMatchObject({
      id: 'new-tt-record',
      staffId: MOCK_STAFF_ID,
      statusId: STATUS_WORKING,
    });
  });

  // ── INT-CS06: Happy path with notes (normal, not over-break) ────────────────

  it('INT-CS06 (R_CS_06): normal status change with notes → notes in new TT row', async () => {
    // Non-break open record (elapsed doesn't matter — isBreak=false)
    prismaMock.timeTracking.findFirst.mockResolvedValue({
      id: 'open-working',
      startTime: new Date(Date.now() - 3_600_000),
      status: { isBreak: false, maxDurationSeconds: null },
    });

    await request(app.getHttpServer())
      .post('/attendance')
      .send({ statusId: STATUS_WORKING, notes: 'Switching tasks' })
      .expect(201);

    // Notes must go to the new INSERT, not the UPDATE of the closing row
    const createCall = prismaMock.timeTracking.create.mock.calls[0][0];
    expect(createCall.data.notes).toBe('Switching tasks');

    const updateCall = prismaMock.timeTracking.update.mock.calls[0][0];
    expect(updateCall.data).not.toHaveProperty('notes');
  });
});
