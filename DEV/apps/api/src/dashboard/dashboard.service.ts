import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IJwtPayload } from '../auth/strategies/jwt.strategy';
import { UserRole } from '@shared/enums/user-role.enum';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Employee Dashboard ────────────────────────────────────────────────────
  async getEmployeeDashboard(user: IJwtPayload) {
    const staff = await this.prisma.staff.findFirst({
      where: { id: user.staffId },
    });

    if (!staff) throw new NotFoundException('Staff not found');

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrowStart = new Date(todayStart.getTime() + 86400000);

    // Open record (no endTime)
    const currentRecord = await this.prisma.timeTracking.findFirst({
      where: {
        staffId: user.staffId,
        endTime: null,
        startTime: { gte: todayStart },
      },
      include: {
        status: {
          select: {
            name: true,
            colorHex: true,
            isBreak: true,
            maxDurationSeconds: true,
          },
        },
      },
      orderBy: { startTime: 'desc' },
    });

    // Today's completed working records
    const todayRecords = await this.prisma.timeTracking.findMany({
      where: {
        staffId: user.staffId,
        startTime: { gte: todayStart, lt: tomorrowStart },
        endTime: { not: null },
        durationSeconds: { not: null },
        status: { isWorkingInStatus: true },
      },
    });

    const todayWorkedSeconds = todayRecords.reduce(
      (sum, r) => sum + (r.durationSeconds ?? 0),
      0,
    );

    return {
      currentRecord: currentRecord
        ? {
            id: currentRecord.id,
            status: currentRecord.status,
            startTime: currentRecord.startTime,
          }
        : null,
      staff: {
        firstName: staff.firstName,
        surname: staff.surname,
        shiftStartTime: staff.shiftStartTime,
        shiftEndTime: staff.shiftEndTime,
        latestEndShiftTime: staff.latestEndShiftTime,
      },
      todayWorkedSeconds,
    };
  }

  // ── Manager Dashboard ─────────────────────────────────────────────────────
  async getManagerDashboard(user: IJwtPayload) {
    const currentStaff = await this.prisma.staff.findFirst({
      where: { id: user.staffId },
      include: { team: { select: { id: true, name: true } } },
    });

    if (!currentStaff) throw new NotFoundException('Staff not found');

    const isHrAdmin = user.roles.includes(UserRole.HR_ADMIN) || user.roles.includes(UserRole.SUPER_ADMIN);

    // Scope: team members for MANAGER, all staff for HR_ADMIN+
    const staffWhere: Record<string, unknown> = {};
    if (!isHrAdmin) {
      if (!currentStaff.teamId) {
        return { teamId: '', teamName: '', total: 0, working: 0, onBreak: 0, absent: 0, members: [] };
      }
      staffWhere['teamId'] = currentStaff.teamId;
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const members = await this.prisma.staff.findMany({
      where: staffWhere,
      select: {
        id: true,
        firstName: true,
        surname: true,
        employeeId: true,
        timeTrackings: {
          where: {
            startTime: { gte: todayStart },
            endTime: null,
          },
          include: {
            status: {
              select: {
                name: true,
                colorHex: true,
                isWorkingInStatus: true,
                isBreak: true,
              },
            },
          },
          orderBy: { startTime: 'desc' },
          take: 1,
        },
      },
    });

    const mappedMembers = members.map((m) => {
      const openRecord = m.timeTrackings[0] ?? null;
      const elapsedSeconds = openRecord
        ? Math.floor((now.getTime() - openRecord.startTime.getTime()) / 1000)
        : null;

      return {
        staffId: m.id,
        firstName: m.firstName,
        surname: m.surname,
        employeeId: m.employeeId,
        currentStatus: openRecord
          ? { name: openRecord.status.name, colorHex: openRecord.status.colorHex }
          : null,
        elapsedSeconds,
      };
    });

    const working = mappedMembers.filter((m) => {
      const openRecord = members.find((s) => s.id === m.staffId)?.timeTrackings[0];
      return openRecord?.status.isWorkingInStatus === true;
    }).length;

    const onBreak = mappedMembers.filter((m) => {
      const openRecord = members.find((s) => s.id === m.staffId)?.timeTrackings[0];
      return openRecord?.status.isBreak === true;
    }).length;

    const absent = mappedMembers.filter((m) => m.currentStatus === null).length;

    return {
      teamId: currentStaff.teamId ?? '',
      teamName: currentStaff.team?.name ?? 'All Staff',
      total: members.length,
      working,
      onBreak,
      absent,
      members: mappedMembers,
    };
  }

  // ── HR Dashboard ──────────────────────────────────────────────────────────
  private async countDisabledManagers(): Promise<number> {
    const [a, b, c, d] = await Promise.all([
      this.prisma.companyManager.count({ where: { isDeleted: false, staff: { isDeleted: false, isDisabled: true } } }),
      this.prisma.departmentManager.count({ where: { isDeleted: false, staff: { isDeleted: false, isDisabled: true } } }),
      this.prisma.officeManager.count({ where: { isDeleted: false, staff: { isDeleted: false, isDisabled: true } } }),
      this.prisma.teamManager.count({ where: { isDeleted: false, staff: { isDeleted: false, isDisabled: true } } }),
    ]);
    return a + b + c + d;
  }

  async getHrDashboard() {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [allStaff, disabledManagersCount] = await Promise.all([
      this.prisma.staff.findMany({
        where: {},
        select: {
          id: true,
          departmentId: true,
          department: { select: { id: true, name: true } },
          timeTrackings: {
            where: {
              startTime: { gte: todayStart },
              endTime: null,
            },
            include: {
              status: {
                select: {
                  isWorkingInStatus: true,
                  isBreak: true,
                },
              },
            },
            orderBy: { startTime: 'desc' },
            take: 1,
          },
        },
      }),
      this.countDisabledManagers(),
    ]);

    let working = 0;
    let onBreak = 0;
    let absent = 0;
    let offline = 0;

    const deptMap = new Map<
      string,
      { departmentName: string; total: number; working: number; onBreak: number; absent: number }
    >();

    for (const s of allStaff) {
      const openRecord = s.timeTrackings[0] ?? null;
      const deptName = s.department?.name ?? 'Unassigned';
      const deptId = s.departmentId ?? 'none';

      if (!deptMap.has(deptId)) {
        deptMap.set(deptId, { departmentName: deptName, total: 0, working: 0, onBreak: 0, absent: 0 });
      }

      const deptEntry = deptMap.get(deptId)!;
      deptEntry.total++;

      if (!openRecord) {
        // Check if they had any record today
        absent++;
        deptEntry.absent++;
      } else if (openRecord.status.isBreak) {
        onBreak++;
        deptEntry.onBreak++;
      } else if (openRecord.status.isWorkingInStatus) {
        working++;
        deptEntry.working++;
      } else {
        offline++;
      }
    }

    const dateStr = todayStart.toISOString().split('T')[0];

    return {
      date: dateStr,
      totalStaff: allStaff.length,
      working,
      onBreak,
      absent,
      offline,
      byDepartment: Array.from(deptMap.values()),
      disabledManagersCount,
    };
  }

  // ── Client Dashboard ──────────────────────────────────────────────────────
  async getClientDashboard(user: IJwtPayload) {
    // Find the staff record for this user to get clientId
    const currentStaff = await this.prisma.staff.findFirst({
      where: { id: user.staffId },
      select: { clientId: true },
    });

    if (!currentStaff?.clientId) {
      throw new ForbiddenException('No client associated with this account');
    }

    const client = await this.prisma.businessClient.findFirst({
      where: { id: currentStaff.clientId },
      select: { name: true, code: true },
    });

    if (!client) throw new NotFoundException('Client not found');

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Get staff assigned to this client via ClientStaff
    const clientStaffRecords = await this.prisma.clientStaff.findMany({
      where: { clientId: currentStaff.clientId },
      include: {
        staff: {
          select: {
            id: true,
            firstName: true,
            surname: true,
            employeeId: true,
            timeTrackings: {
              where: {
                startTime: { gte: todayStart },
                endTime: null,
              },
              include: {
                status: {
                  select: { name: true, colorHex: true },
                },
              },
              orderBy: { startTime: 'desc' },
              take: 1,
            },
          },
        },
      },
    });

    const assignedStaff = clientStaffRecords.map((cs) => {
      const s = cs.staff;
      const openRecord = s.timeTrackings[0] ?? null;

      return {
        staffId: s.id,
        firstName: s.firstName,
        surname: s.surname,
        employeeId: s.employeeId,
        currentStatus: openRecord
          ? { name: openRecord.status.name, colorHex: openRecord.status.colorHex }
          : null,
        department: null as string | null,
      };
    });

    return {
      client: { name: client.name, code: client.code },
      assignedStaff,
    };
  }
}
