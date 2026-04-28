import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { LogoutAttendanceDto } from './dto/logout-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import { uuidv7 } from 'uuidv7';
import { NotificationsService } from '../notifications/notifications.service';
import { StatusService } from '../status/status.service';
import { EmailJobService } from '../email/email-job.service';
import { DEFAULT_AUTO_LOGOUT_TEMPLATE } from '../email/email-default-templates';
import { toUtcDateRange } from '../common/utils/date-range';
import { resolveShiftBoundary } from '../common/utils/shift-boundary';
import { DebugService } from '../common/debug/debug.service';

export interface IAttendanceHistoryParams {
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
  statusId?: string;
  clientTimezone?: string;
}

export interface ITeamHistoryParams extends IAttendanceHistoryParams {
  staffId?: string;
}

@Injectable()
export class AttendanceService {
  private readonly logger = new Logger(AttendanceService.name);
  private static readonly AUTO_LOGOUT_NOTE = 'Auto logout — shift ended';

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly statusService: StatusService,
    private readonly emailJobService: EmailJobService,
    private readonly debugService: DebugService,
  ) {}

  private appendAutoLogoutNote(existingNotes?: string | null): string {
    const note = AttendanceService.AUTO_LOGOUT_NOTE;
    return existingNotes ? `${existingNotes} | ${note}` : note;
  }

  /**
   * Return the UTC Date for a given HH:mm local time on the same calendar day
   * as `reference`, using the staff's IANA timezone.
   *
   * Without a timezone the server's clock (UTC on Railway) is used — this was
   * the pre-timezone behaviour and is kept as a fallback.
   */
  private resolveShiftBoundary(
    reference: Date,
    latestEndShiftTime?: string | null,
    timezone?: string | null,
    dayOffset = 0,
  ): Date | null {
    return resolveShiftBoundary(reference, latestEndShiftTime, timezone, dayOffset);
  }

  private resolveEffectiveLogoutAt(startTime: Date, logoutAt: Date): Date {
    return logoutAt.getTime() >= startTime.getTime() ? logoutAt : startTime;
  }

  private async getAutoLogoutSettings() {
    const rows = await this.prisma.systemSetting.findMany({
      where: {
        key: {
          in: [
            'attendance.auto_logout.enabled',
            'notification.auto_logout_in_app.enabled',
            'notification.auto_logout_email.enabled',
          ],
        },
      },
      select: { key: true, value: true },
    });
    const valueMap = new Map(rows.map((row) => [row.key, row.value]));

    return {
      enabled: valueMap.get('attendance.auto_logout.enabled') !== 'false',
      notifyInApp: valueMap.get('notification.auto_logout_in_app.enabled') !== 'false',
      notifyEmail: valueMap.get('notification.auto_logout_email.enabled') === 'true',
    };
  }

  private async resolveLogoutStatusId(staffId: string, companyId: string): Promise<string | null> {
    // 1. Scoped override (team/office/client/company) if any.
    const scopedStatuses = await this.statusService.getStatusesForUser(staffId);
    const scopedLogoutStatus = scopedStatuses.find((status) => status.isLogoutStatus);
    if (scopedLogoutStatus) return scopedLogoutStatus.id;

    // 2. Company-scoped OR global (CompanyId IS NULL). Prefer company-scoped.
    //    See docs/flows/F04-global-login-logout.md — post-migration only the
    //    global row exists, but the OR keeps future per-company overrides usable.
    const logoutStatus = await this.prisma.statusDefinition.findFirst({
      where: {
        isLogoutStatus: true,
        isDeleted: false,
        isDisabled: false,
        OR: [{ companyId }, { companyId: null }],
      },
      orderBy: [{ companyId: 'desc' }, { orderNo: 'asc' }],
      select: { id: true },
    });

    return logoutStatus?.id ?? null;
  }

  private async queueAutoLogoutEmail(
    email: string,
    firstName: string,
    logoutTime: string,
  ): Promise<void> {
    const templateSetting = await this.prisma.systemSetting.findUnique({
      where: { key: 'email.template.auto_logout' },
      select: { value: true },
    });

    const html = (templateSetting?.value?.trim() || DEFAULT_AUTO_LOGOUT_TEMPLATE)
      .replace(/{{FIRST_NAME}}/g, firstName)
      .replace(/{{LOGOUT_TIME}}/g, logoutTime);

    await this.prisma.emailQueue.create({
      data: {
        id: uuidv7(),
        to: email,
        subject: 'VIBE365 - You have been automatically logged out',
        bodyHtml: html,
        type: 'auto-logout',
        logCreatedBy: 'system',
      },
    });

    this.emailJobService.trigger();
  }

  private async closeOpenRecord(staffId: string, now: Date): Promise<void> {
    const tFind = Date.now();
    const openRecord = await this.prisma.timeTracking.findFirst({
      where: { staffId, endTime: null, isDeleted: false, isSuperseded: false },
      orderBy: { startTime: 'desc' },
    });
    this.logger.log(`[closeOpenRecord] staffId=${staffId} step=findFirst ms=${Date.now() - tFind} found=${!!openRecord}`);

    if (openRecord) {
      const tUpdate = Date.now();
      const durationSeconds = Math.floor(
        (now.getTime() - openRecord.startTime.getTime()) / 1000,
      );
      await this.prisma.timeTracking.update({
        where: { id: openRecord.id },
        data: {
          endTime: now,
          durationSeconds,
          logUpdatedAt: now,
        },
      });
      this.logger.log(`[closeOpenRecord] staffId=${staffId} step=update ms=${Date.now() - tUpdate}`);
    }
  }

  async changeStatus(
    staffId: string,
    dto: CreateAttendanceDto,
    ipAddress?: string,
    userAgent?: string,
    createdBy?: string,
  ) {
    const t0 = Date.now();
    const now = new Date();

    // Step 0: Validate statusId is in employee's allowed scope (E201)
    const availableStatuses = await this.statusService.getStatusesForUser(staffId);
    const isAllowed = availableStatuses.some((s) => s.id === dto.statusId);
    if (!isAllowed) {
      throw new ForbiddenException({
        code: 'E201',
        message: 'This status is not available for your current assignment',
      });
    }

    // Step 0.5: Manual status-change cooldown (E205)
    // minStatusChangeGraceMs absorbs clock-skew so a click that arrives slightly early
    // due to ~1 s NTP drift is still accepted (client timer and server clock differ).
    const { minStatusChangeIntervalSeconds, breakGraceSeconds, minStatusChangeGraceMs } = await this.getAttendanceConfig();
    if (minStatusChangeIntervalSeconds > 0) {
      const lastManualRow = await this.prisma.timeTracking.findFirst({
        where: { staffId, notes: null, isLoginStatus: false, isDeleted: false, isSuperseded: false },
        orderBy: { logCreatedAt: 'desc' },
        select: { logCreatedAt: true },
      });
      if (lastManualRow) {
        const elapsedSeconds = (Date.now() - lastManualRow.logCreatedAt.getTime()) / 1000;
        const effectiveMinSeconds = minStatusChangeIntervalSeconds - minStatusChangeGraceMs / 1000;
        if (elapsedSeconds < effectiveMinSeconds) {
          const retryAfterSeconds = Math.ceil(effectiveMinSeconds - elapsedSeconds);
          throw new HttpException(
            {
              code: 'E205',
              message: `Please wait ${retryAfterSeconds} second(s) before changing status again.`,
              retryAfterSeconds,
            },
            HttpStatus.TOO_MANY_REQUESTS,
          );
        }
      }
    }

    // Step 1: Fetch open record and staff shift info up front.
    const [openRecord, staff] = await Promise.all([
      this.prisma.timeTracking.findFirst({
        where: { staffId, endTime: null, isDeleted: false, isSuperseded: false },
        orderBy: { startTime: 'desc' },
        include: { status: { select: { isBreak: true, maxDurationSeconds: true } } },
      }),
      this.prisma.staff.findUnique({
        where: { id: staffId },
        select: {
          shiftStartTime: true,
          shiftEndTime: true,
          latestEndShiftTime: true,
          firstName: true,
          surname: true,
        },
      }),
    ]);

    // Step 2: Break duration enforcement — breakGraceSeconds absorbs network latency so a
    // click at T+0 on the client that arrives at T+1 on the server is not rejected.
    const trimmedNotes = dto.notes?.trim();
    const isOverBreak =
      !!openRecord?.status?.isBreak &&
      !!openRecord.status.maxDurationSeconds &&
      Math.floor((now.getTime() - openRecord.startTime.getTime()) / 1000) >
        openRecord.status.maxDurationSeconds + breakGraceSeconds;

    if (isOverBreak && !trimmedNotes) {
      throw new BadRequestException(
        'Break time exceeded. Please provide notes before changing status.',
      );
    }

    // Step 3: Close the current open record before creating the next one.
    if (openRecord) {
      const breakDurationSeconds = Math.floor((now.getTime() - openRecord.startTime.getTime()) / 1000);
      await this.prisma.timeTracking.update({
        where: { id: openRecord.id },
        data: {
          endTime: now,
          durationSeconds: breakDurationSeconds,
          ...(isOverBreak && trimmedNotes ? { notes: trimmedNotes } : {}),
          ...(dto.clientStartTime ? { clientEndTime: new Date(dto.clientStartTime) } : {}),
          logUpdatedAt: now,
        },
      });

      // N-A04: Notify all managers of this staff's scope when an over-break record is closed (fire-and-forget)
      if (isOverBreak) {
        const staffName = `${staff?.firstName ?? ''} ${staff?.surname ?? ''}`.trim();
        const breakMinutes = Math.ceil(breakDurationSeconds / 60);
        const limitMinutes = Math.floor((openRecord.status.maxDurationSeconds ?? 0) / 60);
        void (async () => {
          const managerIds = await this.getManagersForStaff(staffId);
          await Promise.all(
            managerIds.map((mgr) =>
              this.sendOverBreakManagerNotification(mgr, staffId, staffName, breakMinutes, limitMinutes, now),
            ),
          );
        })();
      }
    }
    const t1 = Date.now();
    this.logger.log(`[changeStatus] staffId=${staffId} step=breakCheck+closeOpen ms=${t1 - t0}`);

    // Create new record
    const record = await this.prisma.timeTracking.create({
      data: {
        id: uuidv7(),
        staffId,
        statusId: dto.statusId,
        startTime: now,
        timezone: dto.timezone,
        ipAddress: ipAddress ?? null,
        userAgent: userAgent ?? null,
        // Overbreak reason belongs to the break row being closed, not the new status row.
        notes: isOverBreak ? null : trimmedNotes,
        shiftStartTime: staff?.shiftStartTime ?? null,
        shiftEndTime: staff?.shiftEndTime ?? null,
        clientStartTime: dto.clientStartTime ? new Date(dto.clientStartTime) : null,
        logCreatedBy: createdBy,
        logUpdatedBy: createdBy,
      },
      include: {
        status: {
          select: {
            id: true,
            name: true,
            displayName: true,
            colorHex: true,
            iconId: true,
            isBreak: true,
            isLogoutStatus: true,
            maxDurationSeconds: true,
          },
        },
      },
      // clientStartTime is included automatically (top-level column on TimeTracking)
    });
    const t2 = Date.now();
    this.logger.log(`[changeStatus] staffId=${staffId} step=createTimeTracking ms=${t2 - t1}`);
    this.logger.log(`[changeStatus] staffId=${staffId} total ms=${t2 - t0}`);

    return record;
  }

  async logout(
    staffId: string,
    dto: LogoutAttendanceDto,
    createdBy?: string,
  ) {
    const now = new Date();

    // Run independent queries in parallel
    const [staff, openRecord] = await Promise.all([
      this.prisma.staff.findUnique({
        where: { id: staffId },
        select: {
          companyId: true,
          latestEndShiftTime: true,
          shiftStartTime: true,
          shiftEndTime: true,
          timezone: true,
        },
      }),
      this.prisma.timeTracking.findFirst({
        where: { staffId, endTime: null, isSuperseded: false, isDeleted: false },
        orderBy: { startTime: 'desc' },
        include: { status: { select: { isBreak: true } } },
      }),
    ]);

    if (openRecord) {
      const durationSeconds = Math.floor(
        (now.getTime() - openRecord.startTime.getTime()) / 1000,
      );

      const overbreakNotesValue =
        openRecord.status?.isBreak && dto.overbreakNotes?.trim()
          ? dto.overbreakNotes.trim()
          : undefined;

      await this.prisma.timeTracking.update({
        where: { id: openRecord.id },
        data: {
          endTime: now,
          durationSeconds,
          ...(overbreakNotesValue ? { notes: overbreakNotesValue } : {}),
          logUpdatedAt: now,
          logUpdatedBy: createdBy,
        },
      });
    }

    // Check LogoutConfig: does this staff's role require MoodLog?
    const requiresMoodLog = await this.staffRequiresMoodLog(staffId);

    // Resolve logout status for inserting logout TimeTracking record
    const logoutStatusId = staff?.companyId
      ? await this.resolveLogoutStatusId(staffId, staff.companyId)
      : null;

    // Snapshot all display fields at log time so report never depends on the live config table
    const vibeIcon =
      requiresMoodLog && dto.vibeIconId
        ? await this.prisma.vIBEIcons.findUnique({
            where: { id: dto.vibeIconId },
            select: { name: true, iconText: true, emojiCode: true, iconUrl: true },
          })
        : null;

    // Insert logout TimeTracking record + MoodLog (if required) in parallel
    await Promise.all([
      logoutStatusId
        ? this.prisma.timeTracking.create({
            data: {
              id: uuidv7(),
              staffId,
              statusId: logoutStatusId,
              startTime: now,
              endTime: now,
              durationSeconds: 0,
              shiftStartTime: staff?.shiftStartTime ?? null,
              shiftEndTime: staff?.shiftEndTime ?? null,
              notes: 'Manual logout',
              logCreatedBy: createdBy,
              logUpdatedBy: createdBy,
            },
          })
        : Promise.resolve(null),
      requiresMoodLog && dto.vibeIconId
        ? this.prisma.moodLog.create({
            data: {
              id: uuidv7(),
              staffId,
              vibeIconId: dto.vibeIconId,
              vibeIconText: vibeIcon?.iconText ?? vibeIcon?.name ?? null,
              vibeIconEmoji: vibeIcon?.emojiCode ?? null,
              vibeIconUrl: vibeIcon?.iconUrl ?? null,
              loggedAt: now,
              comment: dto.comment,
              logCreatedBy: createdBy,
              logUpdatedBy: createdBy,
            },
          })
        : Promise.resolve(null),
    ]);

    return { success: true };
  }

  async getTodayAttendance(staffId: string, clientTimezone?: string) {
    const debug = await this.debugService.isEnabled();
    const nowIso = new Date().toISOString();

    // "Today" must be computed in the caller's timezone, not the server's — on a UTC host,
    // deriving from new Date()/setHours() drops rows that fall in the window [local 00:00, local UTC-offset:00).
    const tz = clientTimezone || 'UTC';
    let tzFallback = false;
    let todayStr: string;
    try {
      todayStr = new Intl.DateTimeFormat('en-CA', {
        timeZone: tz,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date());
    } catch {
      tzFallback = true;
      todayStr = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'UTC',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date());
    }
    const { gte, lte } = toUtcDateRange(todayStr, todayStr, clientTimezone);

    if (debug) {
      await this.debugService.log(
        'AttendanceService.getTodayAttendance',
        `Query boundary resolved (staff=${staffId})`,
        {
          input: { staffId, clientTimezone: clientTimezone ?? null },
          resolved: {
            nowServerIso: nowIso,
            serverTz: process.env.TZ ?? 'system',
            effectiveTimezone: tz,
            timezoneFallbackToUtc: tzFallback,
            todayStr,
            rangeGteIso: gte.toISOString(),
            rangeLteIso: lte.toISOString(),
          },
          whereClause: {
            staffId,
            isDeleted: false,
            OR: [
              { startTime: { gte: gte.toISOString(), lte: lte.toISOString() } },
              { logCreatedAt: { gte: gte.toISOString(), lte: lte.toISOString() } },
            ],
          },
        },
      );
    }

    const rows = await this.prisma.timeTracking.findMany({
      where: {
        staffId,
        isDeleted: false,
        OR: [
          { startTime: { gte, lte } },
          { logCreatedAt: { gte, lte } },
        ],
      },
      orderBy: { logCreatedAt: 'desc' },
      include: {
        status: {
          select: {
            id: true,
            name: true,
            displayName: true,
            colorHex: true,
            iconId: true,
            isBreak: true,
            isLogoutStatus: true,
            maxDurationSeconds: true,
          },
        },
      },
      // clientStartTime included automatically (top-level column)
    });

    if (debug) {
      await this.debugService.log(
        'AttendanceService.getTodayAttendance',
        `Query returned ${rows.length} row(s) for staff ${staffId}`,
        {
          staffId,
          rowCount: rows.length,
          rows: rows.map((r) => ({
            id: r.id,
            statusName: r.status?.name,
            startTimeIso: r.startTime?.toISOString() ?? null,
            endTimeIso: r.endTime?.toISOString() ?? null,
            logCreatedAtIso: r.logCreatedAt?.toISOString() ?? null,
            isSuperseded: r.isSuperseded,
            isLoginStatus: r.isLoginStatus,
          })),
        },
      );
    }

    return rows;
  }

  async getHistory(staffId: string, params: IAttendanceHistoryParams) {
    const page = Number(params.page) || 1;
    const limit = Number(params.limit) || 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { staffId, isDeleted: false };

    if (params.startDate && params.endDate) {
      where['startTime'] = toUtcDateRange(params.startDate, params.endDate, params.clientTimezone);
    } else if (params.startDate) {
      where['startTime'] = { gte: toUtcDateRange(params.startDate, params.startDate, params.clientTimezone).gte };
    } else if (params.endDate) {
      where['startTime'] = { lte: toUtcDateRange(params.endDate, params.endDate, params.clientTimezone).lte };
    }

    if (params.statusId) {
      where['statusId'] = params.statusId;
    }

    const [data, total] = await Promise.all([
      this.prisma.timeTracking.findMany({
        where,
        skip,
        take: limit,
        orderBy: { startTime: 'desc' },
        include: {
          status: { select: { id: true, name: true, displayName: true, colorHex: true, isBreak: true, maxDurationSeconds: true } },
        },
      }),
      this.prisma.timeTracking.count({ where }),
    ]);

    return {
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getTeamHistory(managerStaffId: string, params: ITeamHistoryParams) {
    const page = Number(params.page) || 1;
    const limit = Number(params.limit) || 20;
    const skip = (page - 1) * limit;

    // Manager can see their team's records
    const manager = await this.prisma.staff.findFirst({
      where: { id: managerStaffId },
      select: { teamId: true, companyId: true },
    });

    const where: Record<string, unknown> = { isDeleted: false };

    // Filter by specific staff or team
    if (params.staffId) {
      where['staffId'] = params.staffId;
    } else if (manager?.teamId) {
      where['staff'] = { teamId: manager.teamId };
    }

    if (params.startDate && params.endDate) {
      where['startTime'] = toUtcDateRange(params.startDate, params.endDate, params.clientTimezone);
    } else if (params.startDate) {
      where['startTime'] = { gte: toUtcDateRange(params.startDate, params.startDate, params.clientTimezone).gte };
    } else if (params.endDate) {
      where['startTime'] = { lte: toUtcDateRange(params.endDate, params.endDate, params.clientTimezone).lte };
    }

    if (params.statusId) {
      where['statusId'] = params.statusId;
    }

    const [data, total] = await Promise.all([
      this.prisma.timeTracking.findMany({
        where,
        skip,
        take: limit,
        orderBy: { startTime: 'desc' },
        include: {
          status: { select: { id: true, name: true, displayName: true, colorHex: true, isBreak: true, maxDurationSeconds: true } },
          staff: { select: { id: true, firstName: true, surname: true, employeeId: true } },
        },
      }),
      this.prisma.timeTracking.count({ where }),
    ]);

    return {
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async updateRecord(id: string, dto: UpdateAttendanceDto, updatedBy?: string) {
    const record = await this.prisma.timeTracking.findFirst({
      where: { id, isDeleted: false },
    });
    if (!record) throw new NotFoundException(`Record ${id} not found`);

    const data: Record<string, unknown> = { logUpdatedBy: updatedBy };

    if (dto.startTime) data['startTime'] = new Date(dto.startTime);
    if (dto.endTime) {
      data['endTime'] = new Date(dto.endTime);
      const start = dto.startTime ? new Date(dto.startTime) : record.startTime;
      data['durationSeconds'] = Math.floor(
        (new Date(dto.endTime).getTime() - start.getTime()) / 1000,
      );
    }
    if (dto.notes !== undefined) data['notes'] = dto.notes;
    if (dto.statusId) data['statusId'] = dto.statusId;

    return this.prisma.timeTracking.update({
      where: { id },
      data,
      include: {
        status: { select: { id: true, name: true, displayName: true, colorHex: true } },
      },
    });
  }

  async deleteRecord(id: string, updatedBy?: string) {
    const record = await this.prisma.timeTracking.findFirst({
      where: { id, isDeleted: false },
    });
    if (!record) throw new NotFoundException(`Record ${id} not found`);

    return this.prisma.timeTracking.update({
      where: { id },
      data: { isDeleted: true, logUpdatedBy: updatedBy },
    });
  }

  // ── N-A03: Late Arrival — notify manager when staff checks in after LatestStartTime ──
  @Cron('*/5 * * * *')
  async checkLateArrivals() {
    const enabled = await this.getNotificationFlag('notification.late_arrival_in_app.enabled');
    if (!enabled) return;

    const now = new Date();
    const todayDate = now.toISOString().slice(0, 10); // YYYY-MM-DD (UTC, used for dedup key)

    // Find all active staff with latestStartTime (manager assignment no longer required — use *Manager tables)
    const staffList = await this.prisma.staff.findMany({
      where: {
        latestStartTime: { not: null },
        isDeleted: false,
        isDisabled: false,
      },
      select: {
        id: true,
        firstName: true,
        surname: true,
        latestStartTime: true,
        timezone: true,
      },
    });

    await Promise.all(
      staffList.map(async (staff) => {
        const latestStartBoundary = this.resolveShiftBoundary(now, staff.latestStartTime, staff.timezone);
        if (!latestStartBoundary) return;

        // Only trigger after LatestStartTime has passed
        if (now <= latestStartBoundary) return;

        // Check if staff has logged in today (any TimeTracking with IsLoginStatus = true today)
        const todayStartUTC = new Date(`${todayDate}T00:00:00Z`);
        const hasLogin = await this.prisma.timeTracking.findFirst({
          where: {
            staffId: staff.id,
            isLoginStatus: true,
            isDeleted: false,
            startTime: { gte: todayStartUTC },
          },
          select: { id: true },
        });
        if (hasLogin) return; // already checked in — no alert

        // Resolve all managers for this staff via *Manager tables
        const managerIds = await this.getManagersForStaff(staff.id);
        if (managerIds.length === 0) return; // no managers assigned — skip

        const staffName = `${staff.firstName} ${staff.surname}`.trim();
        const latestStartLocal = staff.latestStartTime!; // HH:mm

        // Dedup: one notification per manager per late-staff per day
        await Promise.all(
          managerIds.map(async (managerId) => {
            const noteKey = `ref:late-arrival:${managerId}:${staff.id}:${todayDate}`;
            const alreadySent = await this.notificationsService.existsByNote(managerId, noteKey);
            if (alreadySent) return;

            await this.notificationsService.create(
              managerId,
              '⚠️ Late Arrival',
              `${staffName} has not checked in today. Latest start time was ${latestStartLocal}.`,
              'warning',
              '/attendance/team',
              noteKey,
            );
          }),
        );
      }),
    );
  }

  @Cron('*/5 * * * *')
  async autoLogout() {
    const now = new Date();
    const cronRunId = uuidv7();
    this.logger.log(`[autoLogout] START cronRunId=${cronRunId}`);
    const settings = await this.getAutoLogoutSettings();

    // N-A05: Pre-logout warning — runs alongside auto-logout cron
    await this.checkPreLogoutWarnings(now, settings.enabled);

    if (!settings.enabled) {
      this.logger.log(`[autoLogout] SKIP (disabled) cronRunId=${cronRunId}`);
      return;
    }

    // Fetch open records with staff shift info (index: endTime + isDeleted)
    // isSuperseded: false — audit-only rows must never be closed by the cron
    const openRecords = await this.prisma.timeTracking.findMany({
      where: { endTime: null, isDeleted: false, isSuperseded: false },
      include: {
        staff: {
          select: {
            id: true,
            companyId: true,
            firstName: true,
            shiftStartTime: true,
            latestStartTime: true,
            latestEndShiftTime: true,
            shiftEndDayOffset: true,   // was missing — night-shift workers need offset > 0
            timezone: true,
            userLogin: { select: { email: true } },
          },
        },
        status: { select: { isLogoutStatus: true, isBreak: true, maxDurationSeconds: true } },
      },
    });

    const expired = openRecords
      .map((record) => ({
        record,
        // Use the record's own startTime as the date reference so the boundary
        // is computed for the day the session started, not today.
        // This prevents immediately auto-logging out a user who logs in after
        // latestEndShiftTime has already passed today.
        logoutAt: this.resolveShiftBoundary(
          record.startTime,
          record.staff?.latestEndShiftTime,
          record.staff?.timezone,
          record.staff?.shiftEndDayOffset ?? 0,  // honour night-shift day offset
        ),
      }))
      .filter(
        (entry): entry is { record: (typeof openRecords)[number]; logoutAt: Date } => {
          if (!entry.logoutAt) return false;
          if (now < entry.logoutAt) return false;
          // Guard: only process records that were opened BEFORE the shift ended.
          if (entry.record.startTime >= entry.logoutAt) return false;
          // Carry-over guard: logoutAt must be TODAY (UTC date) to avoid
          // re-processing yesterday's missed auto-logout at an unexpected hour.
          const logoutDateUTC = entry.logoutAt.toISOString().slice(0, 10);
          const todayUTC = now.toISOString().slice(0, 10);
          return logoutDateUTC === todayUTC;
        },
      );

    if (expired.length > 0) {
      await Promise.all(
        expired.map(async ({ record, logoutAt }) => {
          const logoutStatusId = await this.resolveLogoutStatusId(record.staff.id, record.staff.companyId);
          if (!logoutStatusId) {
            this.logger.warn(`No logout status configured for staffId=${record.staff.id}`);
            return;
          }

          // Defensive guard: the open record being closed must NOT already be a logout status.
          // If it is, data is in an anomalous state (a logout row was left open) — log and skip.
          if (record.status?.isLogoutStatus) {
            this.logger.error(
              `[autoLogout] ANOMALY: open record is already a logout status — skipping to avoid double-logout` +
              ` staffId=${record.staff.id} recordId=${record.id} statusId=${record.statusId}`,
            );
            return;
          }

          const minBoundary = this.resolveShiftBoundary(
            record.startTime,
            record.staff?.latestStartTime ?? record.staff?.shiftStartTime,
            record.staff?.timezone,
          ) ?? record.startTime;

          // Idempotency guard: if an auto-logout row already exists for this shift,
          // a previous cron run already handled it — skip silently.
          const existingAutoLogout = await this.prisma.timeTracking.findFirst({
            where: {
              staffId: record.staff.id,
              isDeleted: false,
              startTime: { gte: minBoundary, lte: logoutAt },
              userAgent: { startsWith: 'system-auto-logout:' },
            },
            select: { id: true },
          });
          if (existingAutoLogout) {
            this.logger.log(
              `[autoLogout] SKIP already-auto-logged-out staffId=${record.staff.id} existingId=${existingAutoLogout.id}`,
            );
            return;
          }

          const lastRecordInShiftWindow = await this.prisma.timeTracking.findFirst({
            where: {
              staffId: record.staff.id,
              isDeleted: false,
              startTime: {
                gte: minBoundary,
                lte: logoutAt,
              },
            },
            orderBy: { startTime: 'desc' },
            select: {
              status: {
                select: {
                  isLogoutStatus: true,
                },
              },
            },
          });

          // Only auto-logout when the last status in this shift window is not Logout.
          if (lastRecordInShiftWindow?.status?.isLogoutStatus) {
            return;
          }

          const effectiveLogoutAt = this.resolveEffectiveLogoutAt(record.startTime, logoutAt);
          const durationSeconds = Math.max(
            0,
            Math.floor((effectiveLogoutAt.getTime() - record.startTime.getTime()) / 1000),
          );

          // Detect overbreak: break status whose elapsed time exceeds maxDurationSeconds.
          // Per BA §4.2 + §7.5: the break record receives a distinct note so reports can
          // identify "auto-logged out while still on overbreak" (S25 T3 — R077).
          const isOverBreak =
            !!record.status?.isBreak &&
            !!record.status.maxDurationSeconds &&
            record.status.maxDurationSeconds > 0 &&
            durationSeconds > record.status.maxDurationSeconds;

          const notes = isOverBreak
            ? 'Auto logout — break time exceeded, no status selected'
            : this.appendAutoLogoutNote(record.notes);
          const debugInfo = `auto-logout${isOverBreak ? ' | overbreak' : ''} | cron:${cronRunId} | staffId:${record.staff.id}`;

          // ── Idempotency guard ────────────────────────────────────────────────
          // Wrap the write operations in a transaction and re-check endTime.
          // If another cron instance (e.g. concurrent Railway deploy) already
          // closed this record, the fresh fetch will have endTime !== null and
          // we skip — preventing duplicate TT rows and notifications.
          const processed = await this.prisma.$transaction(async (tx) => {
            const fresh = await tx.timeTracking.findUnique({
              where: { id: record.id },
              select: { endTime: true },
            });
            if (fresh?.endTime !== null) {
              this.logger.warn(`[autoLogout] skip duplicate staffId=${record.staff.id} recordId=${record.id}`);
              return false;
            }

            await tx.timeTracking.update({
              where: { id: record.id },
              data: {
                endTime: effectiveLogoutAt,
                durationSeconds,
                notes,
                debugInfo,
                logUpdatedAt: now,
                logUpdatedBy: 'system',
              },
            });

            await tx.timeTracking.create({
              data: {
                id: uuidv7(),
                staffId: record.staff.id,
                statusId: logoutStatusId,
                startTime: effectiveLogoutAt,
                endTime: effectiveLogoutAt,
                durationSeconds: 0,
                shiftStartTime: record.shiftStartTime,
                shiftEndTime: record.shiftEndTime,
                timezone: record.timezone,
                notes: AttendanceService.AUTO_LOGOUT_NOTE,
                debugInfo: `auto-logout | cron:${cronRunId} | staffId:${record.staff.id}`,
                userAgent: `system-auto-logout:${cronRunId}`,
                logCreatedBy: 'system',
                logUpdatedBy: 'system',
              },
            });

            // Revoke all active sessions — same behaviour as manual logout.
            // Any token issued before effectiveLogoutAt will be rejected by
            // JwtStrategy.validate() via the allSessionsRevokedAt check.
            await tx.userLogin.updateMany({
              where: { staff: { id: record.staff.id }, isDeleted: false },
              data: { allSessionsRevokedAt: effectiveLogoutAt, logUpdatedBy: 'system' },
            });

            return true;
          });

          if (!processed) return;

          if (settings.notifyInApp) {
            await this.notificationsService.create(
              record.staff.id,
              'Auto Logout',
              `You were automatically logged out at ${record.staff.latestEndShiftTime} as your shift has ended.`,
              'alert',
              '/login?reason=auto-logout',
            );
          }

          if (settings.notifyEmail && record.staff.userLogin?.email) {
            await this.queueAutoLogoutEmail(
              record.staff.userLogin.email,
              record.staff.firstName,
              record.staff.latestEndShiftTime ?? logoutAt.toISOString(),
            );
          }
        }),
      );
    }
    this.logger.log(`[autoLogout] END cronRunId=${cronRunId} processed=${expired.length}`);
  }

  // ── N-A05 helper: pre-logout warning ────────────────────────────────────────
  private async checkPreLogoutWarnings(now: Date, autoLogoutEnabled: boolean) {
    if (!autoLogoutEnabled) return;

    const [preLogoutEnabled, warningMinutesRaw] = await Promise.all([
      this.getNotificationFlag('notification.pre_logout_in_app.enabled'),
      this.prisma.systemSetting.findUnique({
        where: { key: 'notification.pre_logout_warning_minutes' },
        select: { value: true },
      }),
    ]);

    if (!preLogoutEnabled) return;

    const warningMs = Math.max(1, parseInt(warningMinutesRaw?.value ?? '15', 10)) * 60 * 1000;
    const todayDate = now.toISOString().slice(0, 10);

    // Fetch open records with staff info (same query as autoLogout)
    const openRecords = await this.prisma.timeTracking.findMany({
      where: { endTime: null, isDeleted: false },
      include: {
        staff: {
          select: {
            id: true,
            firstName: true,
            latestEndShiftTime: true,
            shiftEndDayOffset: true,
            timezone: true,
          },
        },
      },
    });

    for (const record of openRecords) {
      const staff = record.staff;
      const logoutAt = this.resolveShiftBoundary(
        record.startTime,
        staff?.latestEndShiftTime,
        staff?.timezone,
        staff?.shiftEndDayOffset ?? 0,
      );
      if (!logoutAt) continue;

      // Only warn if within the warning window and not yet at logout time
      if (now >= logoutAt) continue; // auto-logout cron will handle this
      if (logoutAt.getTime() - now.getTime() > warningMs) continue; // too early to warn

      // Dedup: one pre-logout warning per staff per day
      const noteKey = `ref:pre-logout:${staff.id}:${todayDate}`;
      const alreadySent = await this.notificationsService.existsByNote(staff.id, noteKey);
      if (alreadySent) continue;

      const logoutTimeLocal = staff.latestEndShiftTime ?? logoutAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      await this.notificationsService.create(
        staff.id,
        '⏰ Session Ending Soon',
        `Your session will automatically end at ${logoutTimeLocal}. Please wrap up your work and log out manually to record your mood.`,
        'warning',
        undefined,
        noteKey,
      );
    }
  }

  // ── Helper: resolve all active manager staffIds for a given staff member ─────
  /** Returns staffIds of all active managers for a given staff member via *Manager tables. */
  private async getManagersForStaff(staffId: string): Promise<string[]> {
    // 1. Get staff's scope IDs
    const staff = await this.prisma.staff.findUnique({
      where: { id: staffId },
      select: { companyId: true, departmentId: true, officeId: true, teamId: true },
    });
    if (!staff) return [];

    // 2. Parallel lookup across all 4 *Manager tables
    const [companyMgrs, deptMgrs, officeMgrs, teamMgrs] = await Promise.all([
      this.prisma.companyManager.findMany({
        where: { companyId: staff.companyId, isDeleted: false },
        select: { staffId: true },
      }),
      staff.departmentId
        ? this.prisma.departmentManager.findMany({
            where: { departmentId: staff.departmentId, isDeleted: false },
            select: { staffId: true },
          })
        : [],
      staff.officeId
        ? this.prisma.officeManager.findMany({
            where: { officeId: staff.officeId, isDeleted: false },
            select: { staffId: true },
          })
        : [],
      staff.teamId
        ? this.prisma.teamManager.findMany({
            where: { teamId: staff.teamId, isDeleted: false },
            select: { staffId: true },
          })
        : [],
    ]);

    // 3. Deduplicate; exclude the staff themselves
    const allMgrIds = [
      ...companyMgrs.map((m) => m.staffId),
      ...deptMgrs.map((m) => m.staffId),
      ...officeMgrs.map((m) => m.staffId),
      ...teamMgrs.map((m) => m.staffId),
    ].filter((id) => id !== staffId);
    return [...new Set(allMgrIds)];
  }

  // ── N-A04 helper: notify manager of over-break ───────────────────────────────
  private async sendOverBreakManagerNotification(
    managerId: string,
    staffId: string,
    staffName: string,
    breakMinutes: number,
    limitMinutes: number,
    now: Date,
  ): Promise<void> {
    try {
      const enabled = await this.getNotificationFlag('notification.over_break_manager_in_app.enabled');
      if (!enabled) return;

      // Dedup: one notification per manager per staff-break per day
      const todayDate = now.toISOString().slice(0, 10);
      const noteKey = `ref:over-break:${managerId}:${staffId}:${todayDate}`;
      const alreadySent = await this.notificationsService.existsByNote(managerId, noteKey);
      if (alreadySent) return;

      await this.notificationsService.create(
        managerId,
        '⚠️ Break Time Exceeded',
        `${staffName} took ${breakMinutes} minute(s) on break, exceeding the ${limitMinutes}-minute limit.`,
        'warning',
        '/attendance/team',
        noteKey,
      );
    } catch (err) {
      this.logger.warn(`[N-A04] Failed to notify manager ${managerId}: ${String(err)}`);
    }
  }

  // ── N-A06: Staff Absent — notify manager when staff has no login record today ──
  @Cron('*/5 * * * *')
  async checkAbsentStaff() {
    const enabled = await this.getNotificationFlag('notification.absent_staff_in_app.enabled');
    if (!enabled) return;

    const now = new Date();
    const todayDate = now.toISOString().slice(0, 10); // YYYY-MM-DD (UTC, used for dedup key)
    const todayStartUTC = new Date(`${todayDate}T00:00:00Z`);

    // Find all active staff with latestStartTime (CR-015: manager resolved via junction tables)
    const staffList = await this.prisma.staff.findMany({
      where: {
        latestStartTime: { not: null },
        isDeleted: false,
        isDisabled: false,
      },
      select: {
        id: true,
        firstName: true,
        surname: true,
        latestStartTime: true,
        timezone: true,
      },
    });

    await Promise.all(
      staffList.map(async (staff) => {
        const latestStartBoundary = this.resolveShiftBoundary(now, staff.latestStartTime, staff.timezone);
        if (!latestStartBoundary) return;

        // Only trigger after LatestStartTime has passed
        if (now <= latestStartBoundary) return;

        // Skip if staff has logged in today
        const hasLogin = await this.prisma.timeTracking.findFirst({
          where: {
            staffId: staff.id,
            isLoginStatus: true,
            isDeleted: false,
            startTime: { gte: todayStartUTC },
          },
          select: { id: true },
        });
        if (hasLogin) return;

        // Skip if staff has an absence/day-off record today (status.isAbsent/isNormalDayOff/isHalfDayOff)
        const hasExcuse = await this.prisma.timeTracking.findFirst({
          where: {
            staffId: staff.id,
            isDeleted: false,
            startTime: { gte: todayStartUTC },
            status: {
              OR: [
                { isAbsent: true },
                { isNormalDayOff: true },
                { isHalfDayOff: true },
              ],
            },
          },
          select: { id: true },
        });
        if (hasExcuse) return;

        // CR-015: resolve managers via junction tables; fan-out to each manager
        const managerIds = await this.getManagersForStaff(staff.id);
        if (managerIds.length === 0) return;

        const staffName = `${staff.firstName} ${staff.surname}`.trim();
        const latestStartLocal = staff.latestStartTime!; // HH:mm

        await Promise.all(
          managerIds.map(async (managerId) => {
            // Dedup: one notification per manager per absent-staff per day
            const noteKey = `ref:absent:${managerId}:${staff.id}:${todayDate}`;
            const alreadySent = await this.notificationsService.existsByNote(managerId, noteKey);
            if (alreadySent) return;

            await this.notificationsService.create(
              managerId,
              '🚨 Staff Absent',
              `${staffName} has not checked in today. Latest start time was ${latestStartLocal}.`,
              'alert',
              '/attendance/team',
              noteKey,
            );
          }),
        );
      }),
    );
  }

  // ── Logout Config: determine if a staff member must submit mood on logout ────
  private async staffRequiresMoodLog(staffId: string): Promise<boolean> {
    const configRow = await this.prisma.systemSetting.findUnique({
      where: { key: 'logout_config' },
      select: { value: true },
    });

    let moodLogRoles: string[] = ['EMPLOYEE', 'MANAGER', 'HR_ADMIN', 'SUPER_ADMIN'];
    if (configRow?.value) {
      try {
        const parsed = JSON.parse(configRow.value) as { MoodLogRoles?: string[] };
        if (Array.isArray(parsed.MoodLogRoles)) moodLogRoles = parsed.MoodLogRoles;
      } catch {
        // Malformed JSON — use defaults
      }
    }

    if (moodLogRoles.length === 0) return false;

    // Fetch staff's role names
    const staffRoles = await this.prisma.staffRole.findMany({
      where: { staffId, isDeleted: false },
      include: { role: { select: { name: true } } },
    });

    return staffRoles.some((sr) => moodLogRoles.includes(sr.role.name));
  }

  // ── Shared settings helpers ──────────────────────────────────────────────────
  private async getNotificationFlag(key: string): Promise<boolean> {
    const row = await this.prisma.systemSetting.findUnique({
      where: { key },
      select: { value: true },
    });
    return row?.value !== 'false';
  }

  async getAttendanceConfig(): Promise<{ minStatusChangeIntervalSeconds: number; clockSkewWarningMs: number; breakGraceSeconds: number; minStatusChangeGraceMs: number }> {
    const defaults = { minStatusChangeIntervalSeconds: 3, clockSkewWarningMs: 5000, breakGraceSeconds: 2, minStatusChangeGraceMs: 1000 };
    const row = await this.prisma.systemSetting.findUnique({
      where: { key: 'attendance_config' },
      select: { value: true },
    });
    if (!row?.value) return defaults;
    try {
      const parsed = JSON.parse(row.value) as { MinStatusChangeIntervalSeconds?: number; ClockSkewWarningMs?: number; BreakGraceSeconds?: number; MinStatusChangeGraceMs?: number };
      const interval = parsed.MinStatusChangeIntervalSeconds;
      const skewWarning = parsed.ClockSkewWarningMs;
      const grace = parsed.BreakGraceSeconds;
      const changeGraceMs = parsed.MinStatusChangeGraceMs;
      return {
        minStatusChangeIntervalSeconds: typeof interval === 'number' && interval >= 0 ? interval : defaults.minStatusChangeIntervalSeconds,
        clockSkewWarningMs: typeof skewWarning === 'number' && skewWarning > 0 ? skewWarning : defaults.clockSkewWarningMs,
        breakGraceSeconds: typeof grace === 'number' && grace >= 0 ? grace : defaults.breakGraceSeconds,
        minStatusChangeGraceMs: typeof changeGraceMs === 'number' && changeGraceMs >= 0 ? changeGraceMs : defaults.minStatusChangeGraceMs,
      };
    } catch {
      return defaults;
    }
  }
}
