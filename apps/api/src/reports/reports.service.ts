import { Injectable } from '@nestjs/common';
import { Response } from 'express';
import * as ExcelJS from 'exceljs';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '@shared/enums/user-role.enum';
import { IAttendanceReportParams, IAttendanceRow } from './dto/attendance-report.dto';
import { toUtcDateRange } from '../common/utils/date-range';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Scope Helpers (BA §3.3) ────────────────────────────────────────────────

  /**
   * BA §5.12 / CR-015 §2.3 BR-M5 — Manager sees all staff belonging to ANY scope
   * where mgrId appears in the corresponding *Manager junction table:
   *   - CompanyManager    → all Staff WHERE companyId IN managed company IDs
   *   - DepartmentManager → all Staff WHERE departmentId IN managed dept IDs
   *   - OfficeManager     → all Staff WHERE officeId IN managed office IDs
   *   - TeamManager       → all Staff WHERE teamId IN managed team IDs
   *   - Always includes self (mgrId)
   * Both junction rows and staff rows are filtered by isDeleted: false.
   */
  private async resolveManagerStaffIds(mgrId: string): Promise<string[]> {
    // Step 1: Parallel lookup of all scope IDs managed by mgrId
    const [companyRoles, deptRoles, officeRoles, teamRoles] = await Promise.all([
      this.prisma.companyManager.findMany({
        where: { staffId: mgrId, isDeleted: false },
        select: { companyId: true },
      }),
      this.prisma.departmentManager.findMany({
        where: { staffId: mgrId, isDeleted: false },
        select: { departmentId: true },
      }),
      this.prisma.officeManager.findMany({
        where: { staffId: mgrId, isDeleted: false },
        select: { officeId: true },
      }),
      this.prisma.teamManager.findMany({
        where: { staffId: mgrId, isDeleted: false },
        select: { teamId: true },
      }),
    ]);

    const companyIds = companyRoles.map((r) => r.companyId);
    const deptIds = deptRoles.map((r) => r.departmentId);
    const officeIds = officeRoles.map((r) => r.officeId);
    const teamIds = teamRoles.map((r) => r.teamId);

    // Step 2: Parallel fetch of staff for each non-empty scope
    const [companyStaff, deptStaff, officeStaff, teamStaff] = await Promise.all([
      companyIds.length > 0
        ? this.prisma.staff.findMany({
            where: { companyId: { in: companyIds }, isDeleted: false },
            select: { id: true },
          })
        : [],
      deptIds.length > 0
        ? this.prisma.staff.findMany({
            where: { departmentId: { in: deptIds }, isDeleted: false },
            select: { id: true },
          })
        : [],
      officeIds.length > 0
        ? this.prisma.staff.findMany({
            where: { officeId: { in: officeIds }, isDeleted: false },
            select: { id: true },
          })
        : [],
      teamIds.length > 0
        ? this.prisma.staff.findMany({
            where: { teamId: { in: teamIds }, isDeleted: false },
            select: { id: true },
          })
        : [],
    ]);

    const ids = new Set([
      mgrId,
      ...companyStaff.map((s) => s.id),
      ...deptStaff.map((s) => s.id),
      ...officeStaff.map((s) => s.id),
      ...teamStaff.map((s) => s.id),
    ]);
    return Array.from(ids);
  }

  /**
   * BA 3.3.3 — Resolve CLIENT user's businessClientId.
   * Priority: Staff.clientId (direct) → ClientStaff assignment (fallback)
   */
  private async resolveBizClientId(staffId: string): Promise<string | null> {
    const staff = await this.prisma.staff.findUnique({
      where: { id: staffId },
      select: { clientId: true },
    });
    if (staff?.clientId) return staff.clientId;

    // Fallback: lookup via ClientStaff assignment
    const clientStaff = await this.prisma.clientStaff.findFirst({
      where: { staffId, isDeleted: false },
      select: { clientId: true },
    });
    return clientStaff?.clientId ?? null;
  }

  /**
   * BA 3.3.3 — Client sees staff from UNION of:
   *   A) ClientStaff direct assignment
   *   B) Team.clientId = bizClientId
   *   C) Staff.clientId = bizClientId
   */
  private async resolveClientStaffIds(bizClientId: string): Promise<string[]> {
    const [assignedViaClientStaff, clientTeams, assignedDirect] = await Promise.all([
      // A) Direct assignment via ClientStaff
      this.prisma.clientStaff.findMany({
        where: { clientId: bizClientId, isDeleted: false },
        select: { staffId: true },
      }),
      // B) Teams linked to this client
      this.prisma.team.findMany({
        where: { clientId: bizClientId, isDeleted: false },
        select: { id: true },
      }),
      // C) Staff.clientId directly
      this.prisma.staff.findMany({
        where: { clientId: bizClientId, isDeleted: false },
        select: { id: true },
      }),
    ]);

    const assignedViaTeam = clientTeams.length > 0
      ? await this.prisma.staff.findMany({
          where: { teamId: { in: clientTeams.map((t) => t.id) }, isDeleted: false },
          select: { id: true },
        })
      : [];

    const ids = new Set([
      ...assignedViaClientStaff.map((s) => s.staffId),
      ...assignedViaTeam.map((s) => s.id),
      ...assignedDirect.map((s) => s.id),
    ]);
    return Array.from(ids);
  }

  /** Resolve visible client IDs for a MANAGER — all clients linked to managed teams (CR-015: uses TeamManager junction) */
  private async resolveManagerClientIds(mgrId: string): Promise<string[]> {
    const teamRows = await this.prisma.teamManager.findMany({
      where: { staffId: mgrId, isDeleted: false },
      select: { teamId: true },
    });
    const teamIds = teamRows.map((r) => r.teamId);
    if (teamIds.length === 0) return [];
    const teams = await this.prisma.team.findMany({
      where: { id: { in: teamIds }, isDeleted: false },
      select: { clientId: true },
    });
    const ids = new Set(teams.map((t) => t.clientId).filter((id): id is string => id != null));
    return Array.from(ids);
  }

  // ── End Scope Helpers ──────────────────────────────────────────────────────

  private async resolveWhere(
    params: IAttendanceReportParams,
    currentUser: { staffId: string; roles: string[] },
  ) {
    const roles = currentUser.roles;
    const isHrOrAdmin =
      roles.includes(UserRole.HR_ADMIN) || roles.includes(UserRole.SUPER_ADMIN);

    // Date range — convert client-local dates to UTC using the client's timezone
    const dateFilter = toUtcDateRange(params.startDate, params.endDate, params.clientTimezone);

    const where: Record<string, unknown> = {
      isDeleted: false,
      isSuperseded: false,
      startTime: dateFilter,
    };

    if (params.statusId) where['statusId'] = params.statusId;

    if (roles.includes(UserRole.EMPLOYEE) && !isHrOrAdmin && !roles.includes(UserRole.MANAGER)) {
      where['staffId'] = currentUser.staffId;
      return where;
    }

    // Build staff sub-filter
    const staffWhere: Record<string, unknown> = { isDeleted: false };
    if (params.departmentId) staffWhere['departmentId'] = params.departmentId;
    if (params.clientId) {
      staffWhere['clientStaff'] = { some: { clientId: params.clientId, isDeleted: false } };
    }

    if (isHrOrAdmin) {
      if (params.staffId) {
        where['staffId'] = params.staffId;
      } else if (Object.keys(staffWhere).length > 1) {
        where['staff'] = staffWhere;
      }
    } else if (roles.includes(UserRole.MANAGER)) {
      const managedIds = await this.resolveManagerStaffIds(currentUser.staffId);
      if (params.staffId) {
        where['staffId'] = params.staffId;
        // Narrow to scope — Prisma ANDs both conditions
        staffWhere['id'] = { in: managedIds };
        where['staff'] = staffWhere;
      } else {
        staffWhere['id'] = { in: managedIds };
        where['staff'] = staffWhere;
      }
    } else if (roles.includes(UserRole.CLIENT)) {
      const bizClientId = await this.resolveBizClientId(currentUser.staffId);
      if (bizClientId) {
        const clientStaffIds = await this.resolveClientStaffIds(bizClientId);
        staffWhere['id'] = { in: clientStaffIds };
        where['staff'] = staffWhere;
      } else {
        // No client linked — return nothing (safe-by-default)
        where['staffId'] = '__no_match__';
      }
    }

    return where;
  }

  private mapToRow(record: {
    staffId: string;
    startTime: Date;
    endTime: Date | null;
    durationSeconds: number | null;
    notes: string | null;
    staff: {
      employeeId: string;
      firstName: string;
      surname: string;
      department: { name: string } | null;
    };
    status: { name: string; displayName: string | null; colorHex: string | null; isBreak: boolean; maxDurationSeconds: number | null };
  }): IAttendanceRow {
    const isBreak = record.status.isBreak;
    const maxDur = record.status.maxDurationSeconds;
    const dur = record.durationSeconds;
    const overbreakSeconds =
      isBreak && maxDur && maxDur > 0 && dur && dur > maxDur ? dur - maxDur : null;

    return {
      staffId: record.staffId,
      employeeId: record.staff.employeeId,
      firstName: record.staff.firstName,
      surname: record.staff.surname,
      department: record.staff.department?.name ?? null,
      statusName: record.status.displayName ?? record.status.name,
      statusColorHex: record.status.colorHex,
      isBreak,
      maxDurationSeconds: maxDur,
      date: record.startTime.toISOString().slice(0, 10),
      startTime: record.startTime.toISOString(),
      endTime: record.endTime?.toISOString() ?? null,
      durationSeconds: dur,
      overbreakSeconds,
      notes: record.notes,
    };
  }

  async getAttendanceReport(
    params: IAttendanceReportParams,
    currentUser: { staffId: string; roles: string[] },
  ) {
    const page = Number(params.page) || 1;
    const limit = Number(params.limit) || 20;
    const skip = (page - 1) * limit;

    const where = await this.resolveWhere(params, currentUser);

    const include = {
      staff: {
        select: {
          employeeId: true,
          firstName: true,
          surname: true,
          department: { select: { name: true } },
        },
      },
      status: { select: { name: true, displayName: true, colorHex: true, isBreak: true, maxDurationSeconds: true } },
    };

    const [records, total] = await Promise.all([
      this.prisma.timeTracking.findMany({
        where,
        skip,
        take: limit,
        orderBy: { startTime: 'desc' },
        include,
      }),
      this.prisma.timeTracking.count({ where }),
    ]);

    return {
      data: records.map((r) => this.mapToRow(r)),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async exportAttendanceReport(
    params: IAttendanceReportParams,
    currentUser: { staffId: string; roles: string[] },
    res: Response,
  ) {
    const where = await this.resolveWhere(params, currentUser);

    const records = await this.prisma.timeTracking.findMany({
      where,
      orderBy: { startTime: 'desc' },
      include: {
        staff: {
          select: {
            employeeId: true,
            firstName: true,
            surname: true,
            department: { select: { name: true } },
          },
        },
        status: { select: { name: true, displayName: true, colorHex: true, isBreak: true, maxDurationSeconds: true } },
      },
    });

    const rows = records.map((r) => this.mapToRow(r));

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Attendance Report');

    // Header row
    sheet.columns = [
      { header: 'Employee ID', key: 'employeeId', width: 14 },
      { header: 'Name', key: 'name', width: 24 },
      { header: 'Department', key: 'department', width: 20 },
      { header: 'Status', key: 'status', width: 18 },
      { header: 'Date', key: 'date', width: 12 },
      { header: 'Start Time (UTC)', key: 'startTime', width: 22 },
      { header: 'End Time (UTC)', key: 'endTime', width: 22 },
      { header: 'Duration (hh:mm:ss)', key: 'duration', width: 18 },
      { header: 'Overbreak', key: 'overbreak', width: 16 },
      { header: 'Notes', key: 'notes', width: 30 },
    ];

    // Style header row
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE9ECEF' },
    };
    headerRow.alignment = { vertical: 'middle' };

    // Alternating row colors
    rows.forEach((row, idx) => {
      const overbreakStr = row.overbreakSeconds != null ? this.formatDuration(row.overbreakSeconds) : '';
      const excelRow = sheet.addRow({
        employeeId: row.employeeId,
        name: `${row.firstName} ${row.surname}`,
        department: row.department ?? '',
        status: row.statusName,
        date: row.date,
        startTime: this.formatUtcDateTime(row.startTime),
        endTime: row.endTime ? this.formatUtcDateTime(row.endTime) : '',
        duration: row.durationSeconds != null ? this.formatDuration(row.durationSeconds) : '',
        overbreak: overbreakStr,
        notes: row.notes ?? '',
      });

      // Highlight overbreak cells in orange
      if (overbreakStr) {
        const overbreakCell = excelRow.getCell('overbreak');
        overbreakCell.font = { color: { argb: 'FFDC2626' }, bold: true };
      }

      if (idx % 2 === 1) {
        excelRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF8F9FA' },
        };
      }
    });

    // Set response headers
    const filename = `attendance-report-${params.startDate}-${params.endDate}.xlsx`;
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await workbook.xlsx.write(res);
    res.end();
  }

  async getHrReport(params: { startDate: string; endDate: string; clientTimezone?: string }) {
    const { gte: dateStart, lte: dateEnd } = toUtcDateRange(params.startDate, params.endDate, params.clientTimezone);

    const [allStaff, timeTrackings, byStatus] = await Promise.all([
      this.prisma.staff.findMany({
        where: { isDeleted: false },
        select: {
          id: true,
          isDisabled: true,
          departmentId: true,
          department: { select: { id: true, name: true } },
        },
      }),
      this.prisma.timeTracking.findMany({
        where: {
          isDeleted: false,
          isSuperseded: false,
          startTime: { gte: dateStart, lte: dateEnd },
        },
        select: {
          staffId: true,
          startTime: true,
          durationSeconds: true,
          staff: {
            select: { departmentId: true, isDeleted: false as boolean },
          },
          status: { select: { name: true, displayName: true } },
        },
      }),
      this.prisma.timeTracking.groupBy({
        by: ['statusId'],
        where: {
          isDeleted: false,
          isSuperseded: false,
          startTime: { gte: dateStart, lte: dateEnd },
        },
        _count: { id: true },
        _sum: { durationSeconds: true },
      }),
    ]);

    const totalStaff = allStaff.length;
    const activeStaff = allStaff.filter((s) => !s.isDisabled).length;

    // Distinct working days
    const distinctDates = new Set(
      timeTrackings.map((t) => t.startTime.toISOString().slice(0, 10)),
    );
    const totalWorkingDays = distinctDates.size;

    const avgDailyAttendance =
      totalWorkingDays > 0
        ? Math.round(timeTrackings.length / totalWorkingDays)
        : 0;

    // By department
    const deptMap = new Map<
      string,
      { departmentId: string; departmentName: string; staffIds: Set<string>; dates: Set<string>; records: number }
    >();

    for (const t of timeTrackings) {
      const staff = allStaff.find((s) => s.id === t.staffId);
      const deptId = staff?.departmentId;
      const deptName = staff?.department?.name ?? 'No Department';
      const key = deptId ?? '_no_dept';

      if (!deptMap.has(key)) {
        deptMap.set(key, {
          departmentId: deptId ?? '',
          departmentName: deptName,
          staffIds: new Set(),
          dates: new Set(),
          records: 0,
        });
      }
      const entry = deptMap.get(key)!;
      entry.staffIds.add(t.staffId);
      entry.dates.add(t.startTime.toISOString().slice(0, 10));
      entry.records++;
    }

    const byDepartment = Array.from(deptMap.values()).map((d) => ({
      departmentId: d.departmentId,
      departmentName: d.departmentName,
      staffCount: d.staffIds.size,
      totalWorkingDays: d.dates.size,
      avgDailyAttendance: d.dates.size > 0 ? Math.round(d.records / d.dates.size) : 0,
    }));

    // Resolve status names from groupBy
    const statusIds = byStatus.map((s) => s.statusId);
    const statuses = await this.prisma.statusDefinition.findMany({
      where: { id: { in: statusIds } },
      select: { id: true, name: true, displayName: true },
    });

    const statusMap = new Map<string, (typeof statuses)[0]>(statuses.map((s) => [s.id, s]));
    const byStatusResult = byStatus.map((s) => {
      const def = statusMap.get(s.statusId);
      return {
        statusName: def?.displayName ?? def?.name ?? s.statusId,
        totalRecords: s._count.id,
        totalDurationSeconds: s._sum.durationSeconds ?? 0,
      };
    });

    return {
      period: { startDate: params.startDate, endDate: params.endDate },
      totalStaff,
      activeStaff,
      totalWorkingDays,
      avgDailyAttendance,
      byDepartment,
      byStatus: byStatusResult,
    };
  }

  private formatUtcDateTime(iso: string): string {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
  }

  private formatDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  }

  // ── VIBE Report helpers ───────────────────────────────────────────────────

  private staffSelect = {
    id: true,
    firstName: true,
    surname: true,
    photoBusiness: true,
    teamId: true,
    team: { select: { id: true, name: true } },
    client: { select: { id: true, name: true } },
    clientStaff: {
      where: { isDeleted: false },
      select: { client: { select: { id: true, name: true } } },
      take: 1,
    },
  } as const;

  /** Resolve staff-level scope filter based on role */
  private async resolveVibeStaffWhere(
    roles: string[],
    currentStaffId: string,
    filter: { clientId?: string; teamId?: string; officeId?: string },
  ) {
    const isHrOrAdmin =
      roles.includes(UserRole.HR_ADMIN) || roles.includes(UserRole.SUPER_ADMIN);
    const isManager = roles.includes(UserRole.MANAGER);
    const isClient = roles.includes(UserRole.CLIENT);

    const where: Record<string, unknown> = { isDeleted: false };

    if (filter.teamId) where['teamId'] = filter.teamId;
    if (filter.officeId) where['officeId'] = filter.officeId;

    if (isHrOrAdmin) {
      if (filter.clientId) {
        where['clientStaff'] = { some: { clientId: filter.clientId, isDeleted: false } };
      }
      return where;
    }

    if (isManager) {
      const managedIds = await this.resolveManagerStaffIds(currentStaffId);
      where['id'] = { in: managedIds };
      if (filter.clientId) {
        where['clientStaff'] = { some: { clientId: filter.clientId, isDeleted: false } };
      }
      return where;
    }

    if (isClient) {
      const bizClientId = await this.resolveBizClientId(currentStaffId);
      if (bizClientId) {
        const clientStaffIds = await this.resolveClientStaffIds(bizClientId);
        where['id'] = { in: clientStaffIds };
      } else {
        where['id'] = '__no_match__';
      }
      return where;
    }

    // Employee — only self
    where['id'] = currentStaffId;
    return where;
  }

  // ── T1: By Employee ───────────────────────────────────────────────────────

  async getVibeByEmployee(
    params: { date?: string; clientId?: string; teamId?: string; officeId?: string },
    currentUser: { staffId: string; roles: string[] },
  ) {
    const date = params.date ?? new Date().toISOString().slice(0, 10);
    const dayStart = new Date(date + 'T00:00:00.000Z');
    const dayEnd = new Date(date + 'T23:59:59.999Z');

    const staffWhere = await this.resolveVibeStaffWhere(
      currentUser.roles,
      currentUser.staffId,
      params,
    );

    const staffList = await this.prisma.staff.findMany({
      where: staffWhere,
      orderBy: [{ surname: 'asc' }, { firstName: 'asc' }],
      select: {
        id: true,
        firstName: true,
        surname: true,
        photoBusiness: true,
      },
    });

    const staffIds = staffList.map((s) => s.id);

    const moodLogs = await this.prisma.moodLog.findMany({
      where: {
        staffId: { in: staffIds },
        loggedAt: { gte: dayStart, lte: dayEnd },
        isDeleted: false,
      },
      orderBy: { loggedAt: 'asc' },
      select: {
        staffId: true,
        loggedAt: true,
        vibeIconText: true,
        vibeIconEmoji: true,
        vibeIconUrl: true,
        comment: true,
        // fallback join for records logged before snapshot columns were added
        vibeIcon: { select: { emojiCode: true, iconText: true, name: true, iconUrl: true } },
      },
    });

    // Group by staffId
    const logMap = new Map<string, typeof moodLogs>();
    for (const ml of moodLogs) {
      if (!logMap.has(ml.staffId)) logMap.set(ml.staffId, []);
      logMap.get(ml.staffId)!.push(ml);
    }

    return {
      date,
      data: staffList.map((s) => ({
        staffId: s.id,
        fullName: `${s.firstName} ${s.surname}`,
        photo: s.photoBusiness ?? null,
        moodLogs: (logMap.get(s.id) ?? []).map((ml) => ({
          loggedAt: ml.loggedAt.toISOString(),
          icon: ml.vibeIconEmoji ?? ml.vibeIcon.emojiCode ?? null,
          iconUrl: ml.vibeIconUrl ?? ml.vibeIcon.iconUrl ?? null,
          iconText: ml.vibeIconText ?? ml.vibeIcon.iconText ?? ml.vibeIcon.name,
          notes: ml.comment ?? null,
        })),
      })),
    };
  }

  // ── T2: By Time / Icon / Employee ─────────────────────────────────────────

  async getVibeByTime(
    params: {
      period?: 'day' | 'week' | 'month' | 'year';
      clientId?: string;
      teamId?: string;
      officeId?: string;
    },
    currentUser: { staffId: string; roles: string[] },
  ) {
    const period = params.period ?? 'day';
    const now = new Date();

    let rangeStart: Date;
    const rangeEnd = new Date(now);
    rangeEnd.setUTCHours(23, 59, 59, 999);

    if (period === 'day') {
      rangeStart = new Date(now.toISOString().slice(0, 10) + 'T00:00:00.000Z');
    } else if (period === 'week') {
      const day = now.getUTCDay(); // 0=Sun
      rangeStart = new Date(now);
      rangeStart.setUTCDate(now.getUTCDate() - day);
      rangeStart.setUTCHours(0, 0, 0, 0);
    } else if (period === 'month') {
      rangeStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    } else {
      rangeStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
    }

    const staffWhere = await this.resolveVibeStaffWhere(
      currentUser.roles,
      currentUser.staffId,
      params,
    );

    const staffList = await this.prisma.staff.findMany({
      where: staffWhere,
      select: {
        id: true,
        firstName: true,
        surname: true,
        photoBusiness: true,
        department: { select: { name: true } },
        team: { select: { name: true } },
        position: { select: { name: true } },
      },
    });
    const staffIds = staffList.map((s) => s.id);
    const staffMap = new Map(staffList.map((s) => [s.id, s]));

    // Last logout per staff per day — get all logs in range then deduplicate
    const allLogs = await this.prisma.moodLog.findMany({
      where: {
        staffId: { in: staffIds },
        loggedAt: { gte: rangeStart, lte: rangeEnd },
        isDeleted: false,
      },
      orderBy: { loggedAt: 'asc' },
      select: {
        id: true,
        staffId: true,
        loggedAt: true,
        vibeIconId: true,
        vibeIconText: true,
        vibeIconEmoji: true,
        vibeIconUrl: true,
        comment: true,
        // fallback join for records logged before snapshot columns were added
        vibeIcon: { select: { id: true, emojiCode: true, iconText: true, name: true, iconUrl: true } },
      },
    });

    // Keep only last logout per staff per day
    const lastPerDay = new Map<string, typeof allLogs[0]>();
    for (const log of allLogs) {
      const key = `${log.staffId}_${log.loggedAt.toISOString().slice(0, 10)}`;
      lastPerDay.set(key, log); // later entries overwrite earlier (already ordered asc)
    }
    const filteredLogs = Array.from(lastPerDay.values());

    // Group by icon
    const iconMap = new Map<
      string,
      { iconId: string; iconText: string; icon: string | null; iconUrl: string | null; entries: typeof filteredLogs }
    >();
    for (const log of filteredLogs) {
      const iconId = log.vibeIconId;
      if (!iconMap.has(iconId)) {
        iconMap.set(iconId, {
          iconId,
          iconText: log.vibeIconText ?? log.vibeIcon.iconText ?? log.vibeIcon.name,
          icon: log.vibeIconEmoji ?? log.vibeIcon.emojiCode ?? null,
          iconUrl: log.vibeIconUrl ?? log.vibeIcon.iconUrl ?? null,
          entries: [],
        });
      }
      iconMap.get(iconId)!.entries.push(log);
    }

    return {
      period,
      totalCount: filteredLogs.length,
      icons: Array.from(iconMap.values()).map((g) => ({
        iconText: g.iconText,
        icon: g.icon,
        iconUrl: g.iconUrl,
        count: g.entries.length,
        staff: g.entries.map((e) => {
          const s = staffMap.get(e.staffId);
          return {
            staffId: e.staffId,
            fullName: s ? `${s.firstName} ${s.surname}` : e.staffId,
            photo: s?.photoBusiness ?? null,
            department: s?.department?.name ?? null,
            team: s?.team?.name ?? null,
            position: s?.position?.name ?? null,
            loggedAt: e.loggedAt.toISOString(),
            notes: e.comment ?? null,
          };
        }),
      })),
    };
  }

  // ── T3: Team Leaders & Staffs ─────────────────────────────────────────────

  async getVibeTeamStructure(currentUser: { staffId: string; roles: string[] }) {
    // CR-015 semantics: show teams managed by this manager with their members.
    // Old "team leader" concept (Staff.managerId + isManager) removed per BA §5.12.
    const teamRows = await this.prisma.teamManager.findMany({
      where: { staffId: currentUser.staffId, isDeleted: false },
      select: { teamId: true },
    });

    if (teamRows.length === 0) {
      return { teamLeaders: [], directStaff: [] };
    }

    const teamIds = teamRows.map((r) => r.teamId);
    const teams = await this.prisma.team.findMany({
      where: { id: { in: teamIds }, isDeleted: false },
      select: { id: true, name: true },
    });

    // Get all staff members in those teams
    const staffInTeams = await this.prisma.staff.findMany({
      where: { teamId: { in: teamIds }, isDeleted: false },
      orderBy: [{ surname: 'asc' }, { firstName: 'asc' }],
      select: {
        id: true,
        firstName: true,
        surname: true,
        photoBusiness: true,
        teamId: true,
      },
    });

    // Group staff by team → return as "teamLeaders" shape for FE compatibility
    const teamMap = new Map(teams.map((t) => [t.id, t]));
    void teamMap; // referenced below via teams.map

    const staffByTeam = new Map<string, typeof staffInTeams>();
    for (const s of staffInTeams) {
      if (!s.teamId) continue;
      if (!staffByTeam.has(s.teamId)) staffByTeam.set(s.teamId, []);
      staffByTeam.get(s.teamId)!.push(s);
    }

    // Return in the same "teamLeaders + staff" shape so FE keeps working
    return {
      teamLeaders: teams.map((team) => ({
        staffId: team.id,       // teamId used as group key
        fullName: team.name,    // team name as "leader name" label
        photo: null,
        isTeamGroup: true,      // signal to FE this is a team, not a person
        staff: (staffByTeam.get(team.id) ?? []).map((s) => ({
          staffId: s.id,
          fullName: `${s.firstName} ${s.surname}`,
          photo: s.photoBusiness ?? null,
        })),
      })),
      directStaff: [],          // no "direct reports" concept in new model
    };
  }

  // ── T4: All Staffs ────────────────────────────────────────────────────────

  async getVibeAllStaffs(
    params: { search?: string },
    currentUser: { staffId: string; roles: string[] },
  ) {
    const isHrOrAdmin =
      currentUser.roles.includes(UserRole.HR_ADMIN) ||
      currentUser.roles.includes(UserRole.SUPER_ADMIN);

    const where: Record<string, unknown> = { isDeleted: false };

    if (!isHrOrAdmin && currentUser.roles.includes(UserRole.MANAGER)) {
      const managedIds = await this.resolveManagerStaffIds(currentUser.staffId);
      where['id'] = { in: managedIds };
    }

    if (params.search) {
      const s = params.search.trim();
      where['OR'] = [
        { firstName: { contains: s, mode: 'insensitive' } },
        { surname: { contains: s, mode: 'insensitive' } },
      ];
    }

    const staffList = await this.prisma.staff.findMany({
      where,
      orderBy: [{ surname: 'asc' }, { firstName: 'asc' }],
      select: {
        id: true,
        firstName: true,
        surname: true,
        photoBusiness: true,
        team: { select: { name: true } },
        clientStaff: {
          where: { isDeleted: false },
          select: { client: { select: { name: true } } },
          take: 1,
        },
      },
    });

    return staffList.map((s) => ({
      staffId: s.id,
      firstName: s.firstName,
      surname: s.surname,
      fullName: `${s.firstName} ${s.surname}`,
      photo: s.photoBusiness ?? null,
      teamName: s.team?.name ?? null,
      clientName: s.clientStaff[0]?.client?.name ?? null,
    }));
  }

  // ── Timezone boundary helper ──────────────────────────────────────────────

  /**
   * Given an HH:mm string (e.g. "09:00") and a UTC Date as reference day,
   * returns the UTC Date that represents that local time on the same calendar
   * day in the given IANA timezone. Falls back to treating HH:mm as UTC if
   * timezone is null/invalid.
   */
  private shiftBoundaryUtc(hhmm: string, refUtc: Date, tz: string | null): Date {
    const [hStr, mStr] = hhmm.split(':');
    const h = parseInt(hStr, 10);
    const m = parseInt(mStr ?? '0', 10);

    if (!tz) {
      const d = new Date(refUtc);
      d.setUTCHours(h, m, 0, 0);
      return d;
    }

    try {
      // Find the UTC offset in minutes for this timezone on the reference date
      const refYear = refUtc.getUTCFullYear();
      const refMonth = refUtc.getUTCMonth();
      const refDay = refUtc.getUTCDate();

      // Construct a date string at midnight UTC and find offset via Intl
      const midnight = new Date(Date.UTC(refYear, refMonth, refDay, 0, 0, 0));
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).formatToParts(midnight);

      const partMap = new Map(parts.map((p) => [p.type, p.value]));
      const localYear = parseInt(partMap.get('year') ?? '0', 10);
      const localMonth = parseInt(partMap.get('month') ?? '1', 10) - 1;
      const localDay = parseInt(partMap.get('day') ?? '1', 10);

      // The boundary is local calendar date (localYear/localMonth/localDay) at h:m
      // expressed as UTC
      const localBoundary = new Date(Date.UTC(localYear, localMonth, localDay, h, m, 0, 0));

      // Compute offset: UTC midnight in local is at (localYear/localMonth/localDay 00:00 local)
      // We need to back-calculate: local midnight = UTC midnight + offset
      // So offset in ms = localBoundary(at 00:00) - midnight
      const localMidnightUtcMs = new Date(Date.UTC(localYear, localMonth, localDay, 0, 0, 0)).getTime();
      const offsetMs = localMidnightUtcMs - midnight.getTime();

      // Boundary in UTC = (h:m local) as UTC minus offset
      return new Date(localBoundary.getTime() - offsetMs);
    } catch {
      // Fallback: treat as UTC
      const d = new Date(refUtc);
      d.setUTCHours(h, m, 0, 0);
      return d;
    }
  }

  // ── Shared staff scope resolver for new report endpoints ─────────────────

  private async resolveStaffScopeWhere(
    params: {
      companyId?: string;
      officeId?: string;
      clientId?: string;
      teamId?: string;
    },
    currentUser: { staffId: string; roles: string[] },
  ): Promise<Record<string, unknown>> {
    const roles = currentUser.roles;
    const isHrOrAdmin =
      roles.includes(UserRole.HR_ADMIN) || roles.includes(UserRole.SUPER_ADMIN);
    const isManager = roles.includes(UserRole.MANAGER);
    const isClient = roles.includes(UserRole.CLIENT);

    const where: Record<string, unknown> = { isDeleted: false, isDisabled: false };

    if (params.companyId) where['companyId'] = params.companyId;
    if (params.officeId) where['officeId'] = params.officeId;
    if (params.teamId) where['teamId'] = params.teamId;
    if (params.clientId) {
      where['clientStaff'] = { some: { clientId: params.clientId, isDeleted: false } };
    }

    if (isHrOrAdmin) return where;

    if (isManager) {
      const managedIds = await this.resolveManagerStaffIds(currentUser.staffId);
      where['id'] = { in: managedIds };
      return where;
    }

    if (isClient) {
      const bizClientId = await this.resolveBizClientId(currentUser.staffId);
      if (bizClientId) {
        const clientStaffIds = await this.resolveClientStaffIds(bizClientId);
        where['id'] = { in: clientStaffIds };
      } else {
        where['id'] = '__no_match__';
      }
      return where;
    }

    where['id'] = currentUser.staffId;
    return where;
  }

  // ── S39: Timezone Review ──────────────────────────────────────────────────

  async getTimezoneReport(
    params: { companyId?: string; officeId?: string; clientId?: string; teamId?: string },
    currentUser: { staffId: string; roles: string[] },
  ) {
    const staffWhere = await this.resolveStaffScopeWhere(params, currentUser);

    const staffList = await this.prisma.staff.findMany({
      where: staffWhere,
      select: {
        id: true,
        firstName: true,
        surname: true,
        photoBusiness: true,
        timezone: true,
        office: { select: { name: true, timezone: true } },
        team: { select: { name: true, clientId: true } },
        client: { select: { timezone: true } },
        company: { select: { defaultTimezone: true } },
        clientStaff: {
          where: { isDeleted: false },
          select: { client: { select: { timezone: true } } },
          take: 1,
        },
      },
    });

    // ── tab1: Timezone Inventory ──
    const groupMap = new Map<
      string,
      {
        timezone: string;
        staffs: {
          id: string;
          fullName: string;
          photo: string | null;
          office: string | null;
          team: string | null;
          client: string | null;
          timezoneSource: 'staff' | 'office' | 'company';
          isDifferentFromOffice: boolean;
        }[];
      }
    >();

    for (const s of staffList) {
      const tzKey = s.timezone ?? 'Not set';
      const source: 'staff' | 'office' | 'company' = s.timezone
        ? 'staff'
        : s.office?.timezone
          ? 'office'
          : 'company';

      const isDifferentFromOffice =
        !!s.timezone && !!s.office?.timezone && s.timezone !== s.office.timezone;

      // Resolve client name: direct client or via clientStaff
      const clientName =
        s.client != null
          ? null // clientId on Staff links to BusinessClient but that model has no 'clientName', it has 'name'
          : (s.clientStaff[0]?.client?.timezone ?? null);

      // Actually get client name: Staff.client.name is 'name' on BusinessClient
      // We need client name for display — re-fetch via team if needed
      // For now use clientStaff relation which has the client object

      if (!groupMap.has(tzKey)) {
        groupMap.set(tzKey, { timezone: tzKey, staffs: [] });
      }

      groupMap.get(tzKey)!.staffs.push({
        id: s.id,
        fullName: `${s.firstName} ${s.surname}`,
        photo: s.photoBusiness ?? null,
        office: s.office?.name ?? null,
        team: s.team?.name ?? null,
        client: clientName,
        timezoneSource: source,
        isDifferentFromOffice,
      });
    }

    const tab1 = {
      groups: Array.from(groupMap.values()).map((g) => ({
        timezone: g.timezone,
        staffCount: g.staffs.length,
        staffs: g.staffs,
      })),
    };

    // ── tab2: Mismatch Alert ──
    const tab2Staffs = staffList
      .map((s) => {
        const staffTimezone = s.timezone ?? null;
        const officeTimezone = s.office?.timezone ?? null;
        const companyTimezone = s.company?.defaultTimezone ?? null;
        // Client timezone: direct client or team's client
        const clientTimezone =
          s.client != null
            ? (s.clientStaff[0]?.client?.timezone ?? null)
            : (s.clientStaff[0]?.client?.timezone ?? null);

        const mismatches: ('office' | 'company' | 'client')[] = [];
        if (staffTimezone && officeTimezone && staffTimezone !== officeTimezone) {
          mismatches.push('office');
        }
        if (staffTimezone && companyTimezone && staffTimezone !== companyTimezone) {
          mismatches.push('company');
        }
        if (staffTimezone && clientTimezone && staffTimezone !== clientTimezone) {
          mismatches.push('client');
        }

        return {
          id: s.id,
          fullName: `${s.firstName} ${s.surname}`,
          photo: s.photoBusiness ?? null,
          staffTimezone,
          officeTimezone,
          companyTimezone,
          clientTimezone,
          mismatches,
        };
      })
      .filter((s) => s.mismatches.length > 0);

    return { tab1, tab2: { staffs: tab2Staffs } };
  }

  // ── S25 Tab 2: Late Arrivals ──────────────────────────────────────────────

  async getLateArrivals(
    params: {
      startDate: string;
      endDate: string;
      companyId?: string;
      officeId?: string;
      clientId?: string;
      teamId?: string;
      page?: number;
      limit?: number;
      clientTimezone?: string;
    },
    currentUser: { staffId: string; roles: string[] },
  ) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;

    const { gte: dateStart, lte: dateEnd } = toUtcDateRange(params.startDate, params.endDate, params.clientTimezone);

    const staffWhere = await this.resolveStaffScopeWhere(params, currentUser);
    const staffList = await this.prisma.staff.findMany({
      where: staffWhere,
      select: {
        id: true,
        firstName: true,
        surname: true,
        photoBusiness: true,
        latestStartTime: true,
        timezone: true,
      },
    });

    const staffIds = staffList.map((s) => s.id);
    const staffMap = new Map(staffList.map((s) => [s.id, s]));

    const records = await this.prisma.timeTracking.findMany({
      where: {
        isDeleted: false,
        isSuperseded: false,
        staffId: { in: staffIds },
        startTime: { gte: dateStart, lte: dateEnd },
        status: { isLoginStatus: true },
      },
      select: {
        staffId: true,
        startTime: true,
      },
      orderBy: { startTime: 'asc' },
    });

    const resultMap = new Map<
      string,
      { lateCount: number; totalLateMinutes: number; details: { date: string; startTime: string; latestStartTime: string; lateMinutes: number }[] }
    >();

    for (const rec of records) {
      const staff = staffMap.get(rec.staffId);
      if (!staff?.latestStartTime) continue;

      const boundary = this.shiftBoundaryUtc(staff.latestStartTime, rec.startTime, staff.timezone ?? null);
      const lateMs = rec.startTime.getTime() - boundary.getTime();
      if (lateMs <= 0) continue;

      const lateMinutes = Math.floor(lateMs / 60000);
      if (!resultMap.has(rec.staffId)) {
        resultMap.set(rec.staffId, { lateCount: 0, totalLateMinutes: 0, details: [] });
      }
      const entry = resultMap.get(rec.staffId)!;
      entry.lateCount++;
      entry.totalLateMinutes += lateMinutes;
      entry.details.push({
        date: rec.startTime.toISOString().slice(0, 10),
        startTime: rec.startTime.toISOString(),
        latestStartTime: staff.latestStartTime,
        lateMinutes,
      });
    }

    const allData = staffList
      .filter((s) => resultMap.has(s.id))
      .map((s) => {
        const e = resultMap.get(s.id)!;
        return {
          staffId: s.id,
          firstName: s.firstName,
          surname: s.surname,
          photo: s.photoBusiness ?? null,
          lateCount: e.lateCount,
          avgLateMinutes: e.lateCount > 0 ? Math.round(e.totalLateMinutes / e.lateCount) : 0,
          details: e.details,
        };
      });

    const total = allData.length;
    const data = allData.slice((page - 1) * limit, page * limit);
    return { data, total };
  }

  // ── S25 Tab 3: Over Breaks ────────────────────────────────────────────────

  async getOverBreaks(
    params: {
      startDate: string;
      endDate: string;
      companyId?: string;
      officeId?: string;
      clientId?: string;
      teamId?: string;
      page?: number;
      limit?: number;
      clientTimezone?: string;
    },
    currentUser: { staffId: string; roles: string[] },
  ) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;

    const { gte: dateStart, lte: dateEnd } = toUtcDateRange(params.startDate, params.endDate, params.clientTimezone);

    const staffWhere = await this.resolveStaffScopeWhere(params, currentUser);
    const staffList = await this.prisma.staff.findMany({
      where: staffWhere,
      select: { id: true, firstName: true, surname: true, photoBusiness: true },
    });
    const staffIds = staffList.map((s) => s.id);
    const staffMap = new Map(staffList.map((s) => [s.id, s]));

    const records = await this.prisma.timeTracking.findMany({
      where: {
        isDeleted: false,
        isSuperseded: false,
        staffId: { in: staffIds },
        startTime: { gte: dateStart, lte: dateEnd },
        status: { isBreak: true },
        durationSeconds: { gt: 0 },
      },
      select: {
        staffId: true,
        startTime: true,
        durationSeconds: true,
        notes: true,
        status: { select: { maxDurationSeconds: true, name: true, colorHex: true } },
      },
      orderBy: { startTime: 'asc' },
    });

    const resultMap = new Map<
      string,
      { overBreakCount: number; totalExcessSeconds: number; details: { date: string; statusName: string; statusColorHex: string | null; durationSeconds: number; maxBreakSeconds: number; excessSeconds: number; notes: string | null }[] }
    >();

    for (const rec of records) {
      const maxSec = rec.status.maxDurationSeconds;
      const dur = rec.durationSeconds;
      if (!maxSec || maxSec <= 0 || !dur || dur <= maxSec) continue;

      const excessSeconds = dur - maxSec;
      if (!resultMap.has(rec.staffId)) {
        resultMap.set(rec.staffId, { overBreakCount: 0, totalExcessSeconds: 0, details: [] });
      }
      const entry = resultMap.get(rec.staffId)!;
      entry.overBreakCount++;
      entry.totalExcessSeconds += excessSeconds;
      entry.details.push({
        date: rec.startTime.toISOString().slice(0, 10),
        statusName: rec.status.name,
        statusColorHex: rec.status.colorHex ?? null,
        durationSeconds: dur,
        maxBreakSeconds: maxSec,
        excessSeconds,
        notes: rec.notes ?? null,
      });
    }

    const allData = staffList
      .filter((s) => resultMap.has(s.id))
      .map((s) => {
        const e = resultMap.get(s.id)!;
        return {
          staffId: s.id,
          firstName: s.firstName,
          surname: s.surname,
          photo: staffMap.get(s.id)?.photoBusiness ?? null,
          overBreakCount: e.overBreakCount,
          totalExcessSeconds: e.totalExcessSeconds,
          details: e.details,
        };
      });

    const total = allData.length;
    const data = allData.slice((page - 1) * limit, page * limit);
    return { data, total };
  }

  // ── S25 Tab 4: Auto Logouts ───────────────────────────────────────────────

  async getAutoLogouts(
    params: {
      startDate: string;
      endDate: string;
      companyId?: string;
      officeId?: string;
      clientId?: string;
      teamId?: string;
      page?: number;
      limit?: number;
      clientTimezone?: string;
    },
    currentUser: { staffId: string; roles: string[] },
  ) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;

    const { gte: dateStart, lte: dateEnd } = toUtcDateRange(params.startDate, params.endDate, params.clientTimezone);

    const staffWhere = await this.resolveStaffScopeWhere(params, currentUser);
    const staffList = await this.prisma.staff.findMany({
      where: staffWhere,
      select: { id: true, firstName: true, surname: true, photoBusiness: true },
    });
    const staffIds = staffList.map((s) => s.id);
    const staffMap = new Map(staffList.map((s) => [s.id, s]));

    const records = await this.prisma.timeTracking.findMany({
      where: {
        isDeleted: false,
        isSuperseded: false,
        staffId: { in: staffIds },
        startTime: { gte: dateStart, lte: dateEnd },
        notes: { contains: 'Auto logout —' },
      },
      select: {
        staffId: true,
        endTime: true,
        startTime: true,
        notes: true,
      },
      orderBy: { startTime: 'asc' },
    });

    const resultMap = new Map<
      string,
      { totalCount: number; shiftEndCount: number; endOfDayCount: number; details: { date: string; time: string; type: 'shift-end' | 'end-of-day' }[] }
    >();

    for (const rec of records) {
      const notes = rec.notes ?? '';
      const type: 'shift-end' | 'end-of-day' = notes.toLowerCase().includes('end of day')
        ? 'end-of-day'
        : 'shift-end';

      const timeRef = rec.endTime ?? rec.startTime;
      if (!resultMap.has(rec.staffId)) {
        resultMap.set(rec.staffId, { totalCount: 0, shiftEndCount: 0, endOfDayCount: 0, details: [] });
      }
      const entry = resultMap.get(rec.staffId)!;
      entry.totalCount++;
      if (type === 'shift-end') entry.shiftEndCount++;
      else entry.endOfDayCount++;
      entry.details.push({
        date: timeRef.toISOString().slice(0, 10),
        time: timeRef.toISOString(),
        type,
      });
    }

    const allData = staffList
      .filter((s) => resultMap.has(s.id))
      .map((s) => {
        const e = resultMap.get(s.id)!;
        return {
          staffId: s.id,
          firstName: s.firstName,
          surname: s.surname,
          photo: staffMap.get(s.id)?.photoBusiness ?? null,
          totalCount: e.totalCount,
          shiftEndCount: e.shiftEndCount,
          endOfDayCount: e.endOfDayCount,
          details: e.details,
        };
      });

    const total = allData.length;
    const data = allData.slice((page - 1) * limit, page * limit);
    return { data, total };
  }

  // ── S25 Tab 5: Absences ───────────────────────────────────────────────────

  async getAbsences(
    params: {
      startDate: string;
      endDate: string;
      period?: 'month' | 'quarter' | 'year';
      companyId?: string;
      officeId?: string;
      clientId?: string;
      teamId?: string;
      page?: number;
      limit?: number;
      clientTimezone?: string;
    },
    currentUser: { staffId: string; roles: string[] },
  ) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;

    const { gte: dateStart, lte: dateEnd } = toUtcDateRange(params.startDate, params.endDate, params.clientTimezone);

    const staffWhere = await this.resolveStaffScopeWhere(params, currentUser);
    const staffList = await this.prisma.staff.findMany({
      where: staffWhere,
      select: { id: true, firstName: true, surname: true, photoBusiness: true },
    });
    const staffIds = staffList.map((s) => s.id);
    const staffMap = new Map(staffList.map((s) => [s.id, s]));

    const records = await this.prisma.timeTracking.findMany({
      where: {
        isDeleted: false,
        isSuperseded: false,
        staffId: { in: staffIds },
        startTime: { gte: dateStart, lte: dateEnd },
        status: {
          OR: [{ isAbsent: true }, { isNormalDayOff: true }, { isHalfDayOff: true }],
        },
      },
      select: {
        staffId: true,
        startTime: true,
        status: { select: { isAbsent: true, isNormalDayOff: true, isHalfDayOff: true } },
      },
      orderBy: { startTime: 'asc' },
    });

    // Count distinct dates per type per staff
    const resultMap = new Map<
      string,
      { absentDates: Set<string>; normalDayOffDates: Set<string>; halfDayOffDates: Set<string> }
    >();

    for (const rec of records) {
      const dateKey = rec.startTime.toISOString().slice(0, 10);
      if (!resultMap.has(rec.staffId)) {
        resultMap.set(rec.staffId, {
          absentDates: new Set(),
          normalDayOffDates: new Set(),
          halfDayOffDates: new Set(),
        });
      }
      const entry = resultMap.get(rec.staffId)!;
      if (rec.status.isAbsent) entry.absentDates.add(dateKey);
      if (rec.status.isNormalDayOff) entry.normalDayOffDates.add(dateKey);
      if (rec.status.isHalfDayOff) entry.halfDayOffDates.add(dateKey);
    }

    const allData = staffList
      .filter((s) => resultMap.has(s.id))
      .map((s) => {
        const e = resultMap.get(s.id)!;
        const absentDays = e.absentDates.size;
        const normalDayOff = e.normalDayOffDates.size;
        const halfDayOff = e.halfDayOffDates.size;
        return {
          staffId: s.id,
          firstName: s.firstName,
          surname: s.surname,
          photo: staffMap.get(s.id)?.photoBusiness ?? null,
          absentDays,
          normalDayOff,
          halfDayOff,
          totalDays: absentDays + normalDayOff + halfDayOff,
        };
      });

    const total = allData.length;
    const data = allData.slice((page - 1) * limit, page * limit);
    return { data, total };
  }

  // ── S25 Tab 6: Overtime ───────────────────────────────────────────────────

  async getOvertime(
    params: {
      startDate: string;
      endDate: string;
      companyId?: string;
      officeId?: string;
      clientId?: string;
      teamId?: string;
      page?: number;
      limit?: number;
      clientTimezone?: string;
    },
    currentUser: { staffId: string; roles: string[] },
  ) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;

    const { gte: dateStart, lte: dateEnd } = toUtcDateRange(params.startDate, params.endDate, params.clientTimezone);

    const staffWhere = await this.resolveStaffScopeWhere(params, currentUser);
    const staffList = await this.prisma.staff.findMany({
      where: staffWhere,
      select: {
        id: true,
        firstName: true,
        surname: true,
        photoBusiness: true,
        shiftEndTime: true,
        timezone: true,
      },
    });
    const staffIds = staffList.map((s) => s.id);
    const staffMap = new Map(staffList.map((s) => [s.id, s]));

    const records = await this.prisma.timeTracking.findMany({
      where: {
        isDeleted: false,
        isSuperseded: false,
        staffId: { in: staffIds },
        startTime: { gte: dateStart, lte: dateEnd },
        status: { isWorkingInStatus: true },
        endTime: { not: null },
      },
      select: {
        staffId: true,
        startTime: true,
        endTime: true,
      },
      orderBy: { startTime: 'asc' },
    });

    const resultMap = new Map<
      string,
      { totalOvertimeSeconds: number; details: { date: string; overtimeSeconds: number }[] }
    >();

    for (const rec of records) {
      if (!rec.endTime) continue;
      const staff = staffMap.get(rec.staffId);
      if (!staff?.shiftEndTime) continue;

      const boundary = this.shiftBoundaryUtc(staff.shiftEndTime, rec.startTime, staff.timezone ?? null);
      const overtimeMs = Math.max(0, rec.endTime.getTime() - boundary.getTime());
      if (overtimeMs <= 0) continue;

      const overtimeSeconds = Math.floor(overtimeMs / 1000);
      if (!resultMap.has(rec.staffId)) {
        resultMap.set(rec.staffId, { totalOvertimeSeconds: 0, details: [] });
      }
      const entry = resultMap.get(rec.staffId)!;
      entry.totalOvertimeSeconds += overtimeSeconds;
      entry.details.push({
        date: rec.startTime.toISOString().slice(0, 10),
        overtimeSeconds,
      });
    }

    const allData = staffList
      .filter((s) => resultMap.has(s.id))
      .map((s) => {
        const e = resultMap.get(s.id)!;
        return {
          staffId: s.id,
          firstName: s.firstName,
          surname: s.surname,
          photo: staffMap.get(s.id)?.photoBusiness ?? null,
          totalOvertimeSeconds: e.totalOvertimeSeconds,
          details: e.details,
        };
      });

    const total = allData.length;
    const data = allData.slice((page - 1) * limit, page * limit);
    return { data, total };
  }

  // ── S26 Tab 2: HR Headcount ───────────────────────────────────────────────

  async getHrHeadcount(params: { groupBy?: 'department' | 'office' | 'team' | 'client' }) {
    const groupBy = params.groupBy ?? 'department';

    const staffList = await this.prisma.staff.findMany({
      where: { isDeleted: false, isDisabled: false },
      select: {
        id: true,
        department: { select: { name: true } },
        office: { select: { name: true } },
        team: { select: { name: true } },
        client: { select: { name: true } },
      },
    });

    const total = staffList.length;

    const groupMap = new Map<string, number>();
    for (const s of staffList) {
      let label: string;
      if (groupBy === 'department') label = s.department?.name ?? 'No Department';
      else if (groupBy === 'office') label = s.office?.name ?? 'No Office';
      else if (groupBy === 'team') label = s.team?.name ?? 'No Team';
      else label = s.client?.name ?? 'No Client';

      groupMap.set(label, (groupMap.get(label) ?? 0) + 1);
    }

    const groups = Array.from(groupMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([label, count]) => ({
        label,
        count,
        percentage: total > 0 ? Math.round((count / total) * 10000) / 100 : 0,
      }));

    return { total, groups };
  }

  // ── S26 Tab 3: HR Birthdays ───────────────────────────────────────────────

  async getHrBirthdays(
    params: { period?: 'next-week' | 'this-month' | 'next-month' },
    currentUser: { staffId: string; roles: string[] },
  ) {
    const period = params.period ?? 'this-month';
    const now = new Date();
    const currentMonth = now.getUTCMonth() + 1; // 1-12
    const currentDay = now.getUTCDate();
    const currentYear = now.getUTCFullYear();

    const staffWhere = await this.resolveStaffScopeWhere({}, currentUser);

    const staffList = await this.prisma.staff.findMany({
      where: { ...staffWhere, dateOfBirth: { not: null } },
      select: {
        id: true,
        firstName: true,
        surname: true,
        photoBusiness: true,
        photoBirthday: true,
        dateOfBirth: true,
        department: { select: { name: true } },
        office: { select: { name: true } },
        favoriteCake: true,
      },
    });

    // Filter by period
    const filtered = staffList
      .map((s) => {
        const dob = s.dateOfBirth!;
        const dobMonth = dob.getUTCMonth() + 1;
        const dobDay = dob.getUTCDate();
        const dobYear = dob.getUTCFullYear();

        let matches = false;
        let daysUntil = 0;

        if (period === 'this-month') {
          matches = dobMonth === currentMonth;
          // Days until birthday this year (may be past)
          const thisYearBday = new Date(Date.UTC(currentYear, dobMonth - 1, dobDay));
          daysUntil = Math.ceil((thisYearBday.getTime() - now.getTime()) / 86400000);
          if (daysUntil < 0) daysUntil += 365;
        } else if (period === 'next-month') {
          const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
          matches = dobMonth === nextMonth;
          const nextMonthYear = currentMonth === 12 ? currentYear + 1 : currentYear;
          const nextBday = new Date(Date.UTC(nextMonthYear, dobMonth - 1, dobDay));
          daysUntil = Math.ceil((nextBday.getTime() - now.getTime()) / 86400000);
        } else {
          // next-week: birthday falls within next 7 days
          const sevenDaysLater = new Date(now.getTime() + 7 * 86400000);
          // Check this year's birthday
          let bdayThisYear = new Date(Date.UTC(currentYear, dobMonth - 1, dobDay));
          if (bdayThisYear.getTime() < now.getTime()) {
            // Try next year
            bdayThisYear = new Date(Date.UTC(currentYear + 1, dobMonth - 1, dobDay));
          }
          matches = bdayThisYear.getTime() >= now.getTime() && bdayThisYear.getTime() <= sevenDaysLater.getTime();
          daysUntil = Math.ceil((bdayThisYear.getTime() - now.getTime()) / 86400000);
        }

        if (!matches) return null;

        const age = currentYear - dobYear - (currentMonth < dobMonth || (currentMonth === dobMonth && currentDay < dobDay) ? 1 : 0);

        return {
          id: s.id,
          firstName: s.firstName,
          surname: s.surname,
          photo: s.photoBusiness ?? null,
          photoBirthday: s.photoBirthday ?? null,
          dateOfBirth: s.dateOfBirth!.toISOString().slice(0, 10),
          age,
          department: s.department?.name ?? null,
          office: s.office?.name ?? null,
          favoriteCake: s.favoriteCake ?? null,
          daysUntilBirthday: daysUntil,
        };
      })
      .filter((s): s is NonNullable<typeof s> => s !== null)
      .sort((a, b) => a.daysUntilBirthday - b.daysUntilBirthday);

    return { staffs: filtered };
  }

  // ── S40: Working Hours Summary ────────────────────────────────────────────

  async getWorkingHours(
    params: {
      startDate: string;
      endDate: string;
      companyId?: string;
      officeId?: string;
      clientId?: string;
      teamId?: string;
      page?: number;
      limit?: number;
      clientTimezone?: string;
    },
    currentUser: { staffId: string; roles: string[] },
  ) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;

    const { gte: dateStart, lte: dateEnd } = toUtcDateRange(params.startDate, params.endDate, params.clientTimezone);

    const staffWhere = await this.resolveStaffScopeWhere(params, currentUser);
    const staffList = await this.prisma.staff.findMany({
      where: staffWhere,
      select: {
        id: true,
        firstName: true,
        surname: true,
        photoBusiness: true,
        shiftStartTime: true,
        shiftEndTime: true,
        timezone: true,
      },
    });
    const staffIds = staffList.map((s) => s.id);
    const staffMap = new Map(staffList.map((s) => [s.id, s]));

    const records = await this.prisma.timeTracking.findMany({
      where: {
        isDeleted: false,
        isSuperseded: false,
        staffId: { in: staffIds },
        startTime: { gte: dateStart, lte: dateEnd },
        endTime: { not: null },
      },
      select: {
        staffId: true,
        startTime: true,
        endTime: true,
        durationSeconds: true,
        status: {
          select: { isLoginStatus: true, isWorkingInStatus: true, isBreak: true },
        },
      },
      orderBy: { startTime: 'asc' },
    });

    type StaffAccum = {
      workingDates: Set<string>;
      actualWorkingSeconds: number;
      breakSeconds: number;
      overtimeSeconds: number;
    };
    const accumMap = new Map<string, StaffAccum>();

    for (const rec of records) {
      if (!rec.endTime || !rec.durationSeconds) continue;
      const dateKey = rec.startTime.toISOString().slice(0, 10);

      if (!accumMap.has(rec.staffId)) {
        accumMap.set(rec.staffId, {
          workingDates: new Set(),
          actualWorkingSeconds: 0,
          breakSeconds: 0,
          overtimeSeconds: 0,
        });
      }
      const entry = accumMap.get(rec.staffId)!;

      if (rec.status.isLoginStatus) {
        entry.workingDates.add(dateKey);
      }
      if (rec.status.isWorkingInStatus) {
        entry.actualWorkingSeconds += rec.durationSeconds;

        // Overtime calc
        const staff = staffMap.get(rec.staffId);
        if (staff?.shiftEndTime) {
          const boundary = this.shiftBoundaryUtc(staff.shiftEndTime, rec.startTime, staff.timezone ?? null);
          const overtimeMs = Math.max(0, rec.endTime.getTime() - boundary.getTime());
          entry.overtimeSeconds += Math.floor(overtimeMs / 1000);
        }
      }
      if (rec.status.isBreak) {
        entry.breakSeconds += rec.durationSeconds;
      }
    }

    const allData = staffList.map((s) => {
      const entry = accumMap.get(s.id);
      const workingDayCount = entry?.workingDates.size ?? 0;

      let shiftSeconds = 0;
      if (s.shiftStartTime && s.shiftEndTime && workingDayCount > 0) {
        const [sh, sm] = s.shiftStartTime.split(':').map(Number);
        const [eh, em] = s.shiftEndTime.split(':').map(Number);
        const shiftMinutes = eh * 60 + em - (sh * 60 + sm);
        shiftSeconds = Math.max(0, shiftMinutes * 60) * workingDayCount;
      }

      const actualWorkingSeconds = entry?.actualWorkingSeconds ?? 0;
      const breakSeconds = entry?.breakSeconds ?? 0;
      const overtimeSeconds = entry?.overtimeSeconds ?? 0;
      const utilization = shiftSeconds > 0 ? Math.round((actualWorkingSeconds / shiftSeconds) * 10000) / 100 : null;

      return {
        staffId: s.id,
        firstName: s.firstName,
        surname: s.surname,
        photo: s.photoBusiness ?? null,
        shiftSeconds,
        actualWorkingSeconds,
        breakSeconds,
        overtimeSeconds,
        utilization,
      };
    });

    const total = allData.length;
    const data = allData.slice((page - 1) * limit, page * limit);
    return { data, total };
  }

  async exportWorkingHours(
    params: {
      startDate: string;
      endDate: string;
      companyId?: string;
      officeId?: string;
      clientId?: string;
      teamId?: string;
      clientTimezone?: string;
    },
    currentUser: { staffId: string; roles: string[] },
    res: Response,
  ) {
    const { data } = await this.getWorkingHours({ ...params, page: 1, limit: 100000 }, currentUser);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Working Hours');

    sheet.columns = [
      { header: 'Employee Name', key: 'name', width: 28 },
      { header: 'Shift Hours', key: 'shiftHours', width: 14 },
      { header: 'Actual Working Hours', key: 'actualHours', width: 22 },
      { header: 'Break Hours', key: 'breakHours', width: 14 },
      { header: 'Overtime Hours', key: 'overtimeHours', width: 16 },
      { header: 'Utilization %', key: 'utilization', width: 14 },
    ];

    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE9ECEF' } };
    headerRow.alignment = { vertical: 'middle' };

    data.forEach((row, idx) => {
      const excelRow = sheet.addRow({
        name: `${row.firstName} ${row.surname}`,
        shiftHours: this.formatDuration(row.shiftSeconds),
        actualHours: this.formatDuration(row.actualWorkingSeconds),
        breakHours: this.formatDuration(row.breakSeconds),
        overtimeHours: this.formatDuration(row.overtimeSeconds),
        utilization: row.utilization !== null ? `${row.utilization}%` : 'N/A',
      });
      if (idx % 2 === 1) {
        excelRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F9FA' } };
      }
    });

    const filename = `working-hours-${params.startDate}-${params.endDate}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    await workbook.xlsx.write(res);
    res.end();
  }

  // ── S41: Staff Allocation by Client ──────────────────────────────────────

  async getStaffAllocation(
    params: { companyId?: string },
    currentUser: { staffId: string; roles: string[] },
  ) {
    const roles = currentUser.roles;
    const isHrOrAdmin =
      roles.includes(UserRole.HR_ADMIN) || roles.includes(UserRole.SUPER_ADMIN);
    const isManager = roles.includes(UserRole.MANAGER);

    const clientWhere: Record<string, unknown> = { isDeleted: false };
    if (params.companyId) {
      // BusinessClient has no direct companyId — filter via teams
      // No-op: companyId not on BusinessClient model
    }

    if (!isHrOrAdmin && isManager) {
      const clientIds = await this.resolveManagerClientIds(currentUser.staffId);
      if (clientIds.length > 0) {
        clientWhere['id'] = { in: clientIds };
      } else {
        clientWhere['id'] = '__no_match__';
      }
    }

    const clients = await this.prisma.businessClient.findMany({
      where: clientWhere,
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        teams: {
          where: { isDeleted: false },
          select: {
            id: true,
            name: true,
            managers: {
              where: { isDeleted: false },
              take: 1,
              select: { staff: { select: { firstName: true, surname: true } } },
            },
            staff: {
              where: { isDeleted: false },
              select: {
                id: true,
                firstName: true,
                surname: true,
                photoBusiness: true,
                position: { select: { name: true } },
                office: { select: { name: true } },
              },
            },
          },
        },
        projects: {
          where: { isDeleted: false },
          select: {
            id: true,
            name: true,
            code: true,
            staffs: {
              where: { isDeleted: false },
              select: {
                staff: { select: { id: true, firstName: true, surname: true } },
              },
            },
          },
        },
      },
    });

    return {
      clients: clients.map((c) => ({
        id: c.id,
        clientName: c.name,
        staffCount: c.teams.reduce((sum, t) => sum + t.staff.length, 0),
        teamCount: c.teams.length,
        projectCount: c.projects.length,
        teams: c.teams.map((t) => ({
          id: t.id,
          name: t.name,
          managerName: t.managers[0]?.staff ? `${t.managers[0].staff.firstName} ${t.managers[0].staff.surname}` : null,
          staffCount: t.staff.length,
          staffs: t.staff.map((s) => ({
            id: s.id,
            firstName: s.firstName,
            surname: s.surname,
            photo: s.photoBusiness ?? null,
            position: s.position?.name ?? null,
            office: s.office?.name ?? null,
          })),
        })),
        projects: c.projects.map((p) => ({
          id: p.id,
          name: p.name,
          code: p.code ?? null,
          staffCount: p.staffs.length,
          staffs: p.staffs.map((ps) => ({
            id: ps.staff.id,
            firstName: ps.staff.firstName,
            surname: ps.staff.surname,
          })),
        })),
      })),
    };
  }

  // ── T5: All Staffs by Client ──────────────────────────────────────────────

  async getVibeStaffsByClient(
    params: { search?: string },
    currentUser: { staffId: string; roles: string[] },
  ) {
    const isHrOrAdmin =
      currentUser.roles.includes(UserRole.HR_ADMIN) ||
      currentUser.roles.includes(UserRole.SUPER_ADMIN);

    // Determine which clients are in scope
    let clientWhere: Record<string, unknown> = { isDeleted: false };

    if (!isHrOrAdmin) {
      if (currentUser.roles.includes(UserRole.MANAGER)) {
        const clientIds = await this.resolveManagerClientIds(currentUser.staffId);
        if (clientIds.length > 0) {
          clientWhere['id'] = { in: clientIds };
        } else {
          clientWhere['id'] = '__no_match__';
        }
      }
    }

    const clients = await this.prisma.businessClient.findMany({
      where: clientWhere,
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        teams: {
          where: { isDeleted: false },
          orderBy: { name: 'asc' },
          select: {
            id: true,
            name: true,
            staff: {
              where: {
                isDeleted: false,
                ...(params.search
                  ? {
                      OR: [
                        { firstName: { contains: params.search, mode: 'insensitive' } },
                        { surname: { contains: params.search, mode: 'insensitive' } },
                      ],
                    }
                  : {}),
              },
              orderBy: [{ surname: 'asc' }, { firstName: 'asc' }],
              select: {
                id: true,
                firstName: true,
                surname: true,
                photoBusiness: true,
              },
            },
          },
        },
      },
    });

    return clients
      .filter((c) => c.teams.some((t) => t.staff.length > 0))
      .map((c) => ({
        clientId: c.id,
        clientName: c.name,
        teams: c.teams
          .filter((t) => t.staff.length > 0)
          .map((t) => ({
            teamId: t.id,
            teamName: t.name,
            staff: t.staff.map((s) => ({
              staffId: s.id,
              fullName: `${s.firstName} ${s.surname}`,
              photo: s.photoBusiness ?? null,
            })),
          })),
      }));
  }
  // ─── Private helpers ────────────────────────────────────────────────────────

  private getLocalDateRange(startDate: string, endDate: string): string[] {
    const dates: string[] = [];
    const d = new Date(startDate + 'T00:00:00Z');
    const end = new Date(endDate + 'T00:00:00Z');
    while (d <= end) {
      dates.push(d.toISOString().slice(0, 10));
      d.setUTCDate(d.getUTCDate() + 1);
    }
    return dates;
  }

  private calcShiftDurationSeconds(startHHMM: string, endHHMM: string): number {
    const [sh, sm] = startHHMM.split(':').map(Number);
    const [eh, em] = endHHMM.split(':').map(Number);
    let endMinutes = eh * 60 + em;
    const startMinutes = sh * 60 + sm;
    if (endMinutes <= startMinutes) endMinutes += 24 * 60;
    return (endMinutes - startMinutes) * 60;
  }

  // ── S25 Tab 7: Daily Log ─────────────────────────────────────────────────

  async getDailyLog(
    params: {
      startDate: string;
      endDate: string;
      staffId?: string;
      companyId?: string;
      departmentId?: string;
      teamId?: string;
      clientTimezone?: string;
    },
    currentUser: { staffId: string; roles: string[] },
  ) {
    const { gte: dateStart, lte: dateEnd } = toUtcDateRange(params.startDate, params.endDate, params.clientTimezone);

    const staffWhere = await this.resolveStaffScopeWhere(params, currentUser);
    if (params.departmentId) staffWhere['departmentId'] = params.departmentId;
    if (params.staffId) staffWhere['id'] = params.staffId;

    const staffList = await this.prisma.staff.findMany({
      where: staffWhere,
      select: {
        id: true,
        firstName: true,
        surname: true,
        shiftStartTime: true,
        latestEndShiftTime: true,
        latestStartTime: true,
        shiftEndTime: true,
        timezone: true,
      },
      orderBy: [{ firstName: 'asc' }, { surname: 'asc' }],
    });

    const staffIds = staffList.map((s) => s.id);
    const staffMap = new Map(staffList.map((s) => [s.id, s]));

    const records = staffIds.length > 0
      ? await this.prisma.timeTracking.findMany({
          where: {
            isDeleted: false,
            isSuperseded: false,
            staffId: { in: staffIds },
            startTime: { gte: dateStart, lte: dateEnd },
          },
          select: {
            staffId: true,
            startTime: true,
            endTime: true,
            durationSeconds: true,
            notes: true,
            isLoginStatus: true,
            maxBreakSeconds: true,
            status: { select: { isWorkingInStatus: true, isBreak: true } },
          },
          orderBy: { startTime: 'asc' },
        })
      : [];

    // Group by staffId → dateKey
    const grouped = new Map<string, Map<string, typeof records>>();
    for (const rec of records) {
      const dateKey = rec.startTime.toISOString().slice(0, 10);
      if (!grouped.has(rec.staffId)) grouped.set(rec.staffId, new Map());
      const byDate = grouped.get(rec.staffId)!;
      if (!byDate.has(dateKey)) byDate.set(dateKey, []);
      byDate.get(dateKey)!.push(rec);
    }

    const dates = this.getLocalDateRange(params.startDate, params.endDate);
    const rows: { staffId: string; staffName: string; date: string; onDuty: string | null; offDuty: string | null; login: string | null; logout: string | null; hoursWorkedSeconds: number; lateArrival: boolean; earlyDeparture: boolean; breakExceeded: boolean; autoLogout: boolean }[] = [];

    for (const staff of staffList) {
      for (const date of dates) {
        const dayRecs = grouped.get(staff.id)?.get(date) ?? [];

        const loginRec = dayRecs.find((r) => r.isLoginStatus);
        const withEnd = dayRecs.filter((r) => r.endTime).sort((a, b) => b.endTime!.getTime() - a.endTime!.getTime());
        const logoutTime = withEnd[0]?.endTime ?? null;

        const hoursWorkedSeconds = dayRecs
          .filter((r) => r.status.isWorkingInStatus)
          .reduce((acc, r) => acc + (r.durationSeconds ?? 0), 0);

        let lateArrival = false;
        if (loginRec && staff.latestStartTime) {
          const boundary = this.shiftBoundaryUtc(staff.latestStartTime, loginRec.startTime, staff.timezone ?? null);
          lateArrival = loginRec.startTime.getTime() > boundary.getTime();
        }

        const autoLogout = dayRecs.some((r) => r.notes?.includes('Auto logout —'));

        let earlyDeparture = false;
        if (logoutTime && staff.shiftEndTime && !autoLogout) {
          const boundary = this.shiftBoundaryUtc(staff.shiftEndTime, logoutTime, staff.timezone ?? null);
          earlyDeparture = logoutTime.getTime() < boundary.getTime();
        }

        const breakExceeded = dayRecs.some(
          (r) => r.status.isBreak && r.maxBreakSeconds != null && r.maxBreakSeconds > 0 && (r.durationSeconds ?? 0) > r.maxBreakSeconds,
        );

        rows.push({
          staffId: staff.id,
          staffName: `${staff.firstName} ${staff.surname}`,
          date,
          onDuty: staff.shiftStartTime ?? null,
          offDuty: staff.latestEndShiftTime ?? null,
          login: loginRec ? loginRec.startTime.toISOString() : null,
          logout: logoutTime ? logoutTime.toISOString() : null,
          hoursWorkedSeconds,
          lateArrival,
          earlyDeparture,
          breakExceeded,
          autoLogout,
        });
      }
    }

    return { data: rows, total: rows.length };
  }

  async exportDailyLog(
    params: {
      startDate: string;
      endDate: string;
      staffId?: string;
      companyId?: string;
      departmentId?: string;
      teamId?: string;
      clientTimezone?: string;
    },
    currentUser: { staffId: string; roles: string[] },
    res: Response,
  ) {
    const { data } = await this.getDailyLog(params, currentUser);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Daily Attendance Log');

    sheet.columns = [
      { header: 'Staff Name', key: 'staffName', width: 24 },
      { header: 'Date', key: 'date', width: 12 },
      { header: 'On Duty', key: 'onDuty', width: 10 },
      { header: 'Off Duty', key: 'offDuty', width: 10 },
      { header: 'Log-in', key: 'login', width: 22 },
      { header: 'Log-out', key: 'logout', width: 22 },
      { header: 'Hours Worked', key: 'hoursWorked', width: 14 },
      { header: 'Late Arrival', key: 'lateArrival', width: 13 },
      { header: 'Early Departure', key: 'earlyDeparture', width: 16 },
      { header: 'Break Exceeded', key: 'breakExceeded', width: 15 },
      { header: 'Auto Logout', key: 'autoLogout', width: 12 },
    ];

    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE9ECEF' } };

    for (const row of data) {
      const h = Math.floor(row.hoursWorkedSeconds / 3600);
      const m = Math.floor((row.hoursWorkedSeconds % 3600) / 60);
      const formatFlag = (v: boolean) => (v ? 'Yes' : 'No');
      const excelRow = sheet.addRow({
        staffName: row.staffName,
        date: row.date,
        onDuty: row.onDuty ?? '',
        offDuty: row.offDuty ?? '',
        login: row.login ? this.formatUtcDateTime(row.login) : '',
        logout: row.logout ? this.formatUtcDateTime(row.logout) : '',
        hoursWorked: `${h}h ${m}m`,
        lateArrival: formatFlag(row.lateArrival),
        earlyDeparture: formatFlag(row.earlyDeparture),
        breakExceeded: formatFlag(row.breakExceeded),
        autoLogout: formatFlag(row.autoLogout),
      });

      // Red text for "Yes" flags
      for (const col of ['lateArrival', 'earlyDeparture', 'breakExceeded', 'autoLogout'] as const) {
        const cell = excelRow.getCell(col);
        if (cell.value === 'Yes') cell.font = { color: { argb: 'FFDC2626' }, bold: true };
      }
    }

    const start = params.startDate.replace(/-/g, '');
    const end = params.endDate.replace(/-/g, '');
    const filename = `DailyAttendanceLog_${start}_${end}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    await workbook.xlsx.write(res);
    res.end();
  }

  // ── S26 Tab 4: Weekly Attendance Grid ────────────────────────────────────

  async getWeeklyGrid(
    params: {
      weekStart: string;
      companyId?: string;
      departmentId?: string;
      teamId?: string;
      staffId?: string;
      clientTimezone?: string;
    },
    currentUser: { staffId: string; roles: string[] },
  ) {
    // weekStart = Monday; derive Friday
    const weekStartDate = new Date(params.weekStart + 'T00:00:00Z');
    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setUTCDate(weekStartDate.getUTCDate() + 4);
    const weekEndStr = weekEndDate.toISOString().slice(0, 10);

    const { gte: dateStart, lte: dateEnd } = toUtcDateRange(params.weekStart, weekEndStr, params.clientTimezone);

    const staffWhere = await this.resolveStaffScopeWhere(params, currentUser);
    if (params.departmentId) staffWhere['departmentId'] = params.departmentId;
    if (params.staffId) staffWhere['id'] = params.staffId;

    const staffList = await this.prisma.staff.findMany({
      where: staffWhere,
      select: {
        id: true,
        employeeId: true,
        firstName: true,
        surname: true,
        latestStartTime: true,
        shiftEndTime: true,
        shiftStartTime: true,
        timezone: true,
      },
      orderBy: [{ firstName: 'asc' }, { surname: 'asc' }],
    });

    const staffIds = staffList.map((s) => s.id);

    const records = staffIds.length > 0
      ? await this.prisma.timeTracking.findMany({
          where: {
            isDeleted: false,
            isSuperseded: false,
            staffId: { in: staffIds },
            startTime: { gte: dateStart, lte: dateEnd },
          },
          select: {
            staffId: true,
            startTime: true,
            endTime: true,
            durationSeconds: true,
            isLoginStatus: true,
            maxBreakSeconds: true,
            status: { select: { isWorkingInStatus: true, isBreak: true, isAbsent: true, isPaid: true } },
          },
          orderBy: { startTime: 'asc' },
        })
      : [];

    // Group by staffId → dateKey
    const grouped = new Map<string, Map<string, typeof records>>();
    for (const rec of records) {
      const dateKey = rec.startTime.toISOString().slice(0, 10);
      if (!grouped.has(rec.staffId)) grouped.set(rec.staffId, new Map());
      const byDate = grouped.get(rec.staffId)!;
      if (!byDate.has(dateKey)) byDate.set(dateKey, []);
      byDate.get(dateKey)!.push(rec);
    }

    // Mon-Fri dates
    const weekDates: string[] = [];
    for (let i = 0; i < 5; i++) {
      const d = new Date(weekStartDate);
      d.setUTCDate(weekStartDate.getUTCDate() + i);
      weekDates.push(d.toISOString().slice(0, 10));
    }

    const data = staffList.map((staff, idx) => {
      const days = weekDates.map((date) => {
        const dayRecs = grouped.get(staff.id)?.get(date) ?? [];
        const loginRec = dayRecs.find((r) => r.isLoginStatus);
        const withEnd = dayRecs.filter((r) => r.endTime).sort((a, b) => b.endTime!.getTime() - a.endTime!.getTime());
        const logoutTime = withEnd[0]?.endTime ?? null;

        // Late
        let late = false;
        let lateMinutes = 0;
        if (loginRec && staff.latestStartTime) {
          const boundary = this.shiftBoundaryUtc(staff.latestStartTime, loginRec.startTime, staff.timezone ?? null);
          const diffMs = loginRec.startTime.getTime() - boundary.getTime();
          if (diffMs > 0) { late = true; lateMinutes = Math.ceil(diffMs / 60000); }
        }

        // Undertime
        let undertime = false;
        let undertimeMinutes = 0;
        if (logoutTime && staff.shiftEndTime) {
          const boundary = this.shiftBoundaryUtc(staff.shiftEndTime, logoutTime, staff.timezone ?? null);
          const diffMs = boundary.getTime() - logoutTime.getTime();
          if (diffMs > 0) { undertime = true; undertimeMinutes = Math.ceil(diffMs / 60000); }
        }

        // Unproductive
        let unproductive = false;
        if (dayRecs.length > 0 && staff.shiftStartTime && staff.shiftEndTime) {
          const productiveSeconds = dayRecs
            .filter((r) => r.status.isWorkingInStatus || r.status.isPaid)
            .reduce((acc, r) => acc + (r.durationSeconds ?? 0), 0);
          const shiftDuration = this.calcShiftDurationSeconds(staff.shiftStartTime, staff.shiftEndTime);
          if (shiftDuration > 0 && productiveSeconds < shiftDuration) unproductive = true;
        }

        // Over-break
        const overBreakCount = dayRecs.filter(
          (r) => r.status.isBreak && r.maxBreakSeconds != null && r.maxBreakSeconds > 0 && (r.durationSeconds ?? 0) > r.maxBreakSeconds,
        ).length;

        // Absent
        const absent = dayRecs.some((r) => r.status.isAbsent);

        return { date, late, lateMinutes, undertime, undertimeMinutes, unproductive, overBreak: overBreakCount > 0, overBreakCount, absent };
      });

      return {
        no: idx + 1,
        staffId: staff.id,
        employeeNo: staff.employeeId,
        staffName: `${staff.firstName} ${staff.surname}`,
        days,
      };
    });

    return { data, weekDates };
  }

  // ── S26 Tab 5: Disabled Managers ─────────────────────────────────────────

  async getDisabledManagersWarning(): Promise<
    {
      rowId: string;
      scopeType: 'Company' | 'Department' | 'Office' | 'Team';
      scopeId: string;
      scopeName: string;
      staffId: string;
      staffName: string;
      staffEmployeeId: string;
      disabledSince?: string;
    }[]
  > {
    const [companyRows, deptRows, officeRows, teamRows] = await Promise.all([
      this.prisma.companyManager.findMany({
        where: { isDeleted: false, staff: { isDeleted: false, isDisabled: true } },
        include: {
          staff: { select: { id: true, firstName: true, surname: true, employeeId: true, logUpdatedAt: true } },
          company: { select: { id: true, name: true } },
        },
      }),
      this.prisma.departmentManager.findMany({
        where: { isDeleted: false, staff: { isDeleted: false, isDisabled: true } },
        include: {
          staff: { select: { id: true, firstName: true, surname: true, employeeId: true, logUpdatedAt: true } },
          department: { select: { id: true, name: true } },
        },
      }),
      this.prisma.officeManager.findMany({
        where: { isDeleted: false, staff: { isDeleted: false, isDisabled: true } },
        include: {
          staff: { select: { id: true, firstName: true, surname: true, employeeId: true, logUpdatedAt: true } },
          office: { select: { id: true, name: true } },
        },
      }),
      this.prisma.teamManager.findMany({
        where: { isDeleted: false, staff: { isDeleted: false, isDisabled: true } },
        include: {
          staff: { select: { id: true, firstName: true, surname: true, employeeId: true, logUpdatedAt: true } },
          team: { select: { id: true, name: true } },
        },
      }),
    ]);

    const result: {
      rowId: string;
      scopeType: 'Company' | 'Department' | 'Office' | 'Team';
      scopeId: string;
      scopeName: string;
      staffId: string;
      staffName: string;
      staffEmployeeId: string;
      disabledSince?: string;
    }[] = [];

    for (const r of companyRows) {
      result.push({
        rowId: r.id,
        scopeType: 'Company',
        scopeId: r.company.id,
        scopeName: r.company.name,
        staffId: r.staff.id,
        staffName: `${r.staff.firstName} ${r.staff.surname}`,
        staffEmployeeId: r.staff.employeeId,
        disabledSince: r.staff.logUpdatedAt?.toISOString(),
      });
    }
    for (const r of deptRows) {
      result.push({
        rowId: r.id,
        scopeType: 'Department',
        scopeId: r.department.id,
        scopeName: r.department.name,
        staffId: r.staff.id,
        staffName: `${r.staff.firstName} ${r.staff.surname}`,
        staffEmployeeId: r.staff.employeeId,
        disabledSince: r.staff.logUpdatedAt?.toISOString(),
      });
    }
    for (const r of officeRows) {
      result.push({
        rowId: r.id,
        scopeType: 'Office',
        scopeId: r.office.id,
        scopeName: r.office.name,
        staffId: r.staff.id,
        staffName: `${r.staff.firstName} ${r.staff.surname}`,
        staffEmployeeId: r.staff.employeeId,
        disabledSince: r.staff.logUpdatedAt?.toISOString(),
      });
    }
    for (const r of teamRows) {
      result.push({
        rowId: r.id,
        scopeType: 'Team',
        scopeId: r.team.id,
        scopeName: r.team.name,
        staffId: r.staff.id,
        staffName: `${r.staff.firstName} ${r.staff.surname}`,
        staffEmployeeId: r.staff.employeeId,
        disabledSince: r.staff.logUpdatedAt?.toISOString(),
      });
    }

    return result;
  }

  async exportWeeklyGrid(
    params: {
      weekStart: string;
      companyId?: string;
      departmentId?: string;
      teamId?: string;
      staffId?: string;
      clientTimezone?: string;
    },
    currentUser: { staffId: string; roles: string[] },
    res: Response,
  ) {
    const { data, weekDates } = await this.getWeeklyGrid(params, currentUser);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Weekly Attendance Grid');

    // Colors per violation type (ARGB)
    const COLORS = {
      late: 'FFEF4444',
      undertime: 'FF93C5FD',
      unproductive: 'FF4ADE80',
      overBreak: 'FFF97316',
      absent: 'FF1F2937',
    };
    const VIOLATION_LABELS = ['L', 'U', 'P', 'O', 'A'];
    const VIOLATION_KEYS = ['late', 'undertime', 'unproductive', 'overBreak', 'absent'] as const;

    // Build columns dynamically
    const columns: Partial<ExcelJS.Column>[] = [
      { header: 'No.', key: 'no', width: 6 },
      { header: 'Employee No.', key: 'empNo', width: 14 },
      { header: 'Staff Name', key: 'staffName', width: 22 },
    ];
    for (const date of weekDates) {
      for (let i = 0; i < 5; i++) {
        columns.push({ header: VIOLATION_LABELS[i], key: `${date}_${VIOLATION_KEYS[i]}`, width: 5 });
      }
    }
    sheet.columns = columns;

    // Row 1 — merged day headers
    const dayHeaderRow = sheet.getRow(1);
    dayHeaderRow.getCell(1).value = 'No.';
    dayHeaderRow.getCell(2).value = 'Employee No.';
    dayHeaderRow.getCell(3).value = 'Staff Name';
    let col = 4;
    for (const date of weekDates) {
      const dayLabel = new Date(date + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      sheet.mergeCells(1, col, 1, col + 4);
      dayHeaderRow.getCell(col).value = dayLabel;
      dayHeaderRow.getCell(col).alignment = { horizontal: 'center' };
      col += 5;
    }
    dayHeaderRow.font = { bold: true };
    dayHeaderRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE9ECEF' } };

    // Row 2 — sub-headers (L U P O A per day)
    const subRow = sheet.getRow(2);
    subRow.getCell(1).value = '';
    subRow.getCell(2).value = '';
    subRow.getCell(3).value = '';
    col = 4;
    for (const _date of weekDates) {
      for (let i = 0; i < 5; i++) {
        const cell = subRow.getCell(col + i);
        cell.value = VIOLATION_LABELS[i];
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS[VIOLATION_KEYS[i]] } };
        cell.alignment = { horizontal: 'center' };
      }
      col += 5;
    }

    // Data rows
    for (const row of data) {
      const excelRow = sheet.addRow({});
      excelRow.getCell(1).value = row.no;
      excelRow.getCell(2).value = row.employeeNo;
      excelRow.getCell(3).value = row.staffName;
      let c = 4;
      for (let d = 0; d < weekDates.length; d++) {
        const day = row.days[d];
        for (let v = 0; v < VIOLATION_KEYS.length; v++) {
          const cell = excelRow.getCell(c + v);
          const hasViolation = day[VIOLATION_KEYS[v]];
          cell.value = hasViolation ? 'X' : '';
          cell.alignment = { horizontal: 'center' };
          if (hasViolation) cell.font = { bold: true };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: hasViolation ? COLORS[VIOLATION_KEYS[v]] : 'FFFFFFFF' } };
        }
        c += 5;
      }
    }

    const weekEnd = new Date(params.weekStart + 'T00:00:00Z');
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 4);
    const start = params.weekStart.replace(/-/g, '');
    const end = weekEnd.toISOString().slice(0, 10).replace(/-/g, '');
    const filename = `WeeklyAttendanceGrid_${start}_${end}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    await workbook.xlsx.write(res);
    res.end();
  }
}