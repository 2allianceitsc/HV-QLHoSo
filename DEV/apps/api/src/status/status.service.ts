import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StatusService {
  constructor(private readonly prisma: PrismaService) {}

  async getStatusesForUser(staffId: string) {
    const staff = await this.prisma.staff.findFirst({
      where: { id: staffId },
      select: { teamId: true, officeId: true, companyId: true },
    });

    if (!staff) return [];

    const clientAssignments = await this.prisma.clientStaff.findMany({
      where: { staffId, isDeleted: false },
      select: { clientId: true },
    });
    const clientIds = clientAssignments.map((ca) => ca.clientId);

    const activeFilter = { isDeleted: false, isDisabled: false };

    // BA 2026-04-23: Status resolution is UNION across all scopes the employee
    // belongs to (Company + Office + Client + Team), deduped by Id. No fallback.
    // Global statuses (all scope IDs NULL — Login/Logout) also merged in.
    // Sort rule (CR-015, 2026-04-23): ascending by (orderNo, name) everywhere
    // a status list is shown — picker, dropdown, dashboard.
    const orderBy = [{ orderNo: 'asc' as const }, { name: 'asc' as const }];

    const [globalStatuses, companyStatuses, officeStatuses, clientStatuses, teamStatuses] =
      await Promise.all([
        this.prisma.statusDefinition.findMany({
          where: { companyId: null, officeId: null, clientId: null, teamId: null, ...activeFilter },
          orderBy,
        }),
        staff.companyId
          ? this.prisma.statusDefinition.findMany({
              where: { companyId: staff.companyId, ...activeFilter },
              orderBy,
            })
          : Promise.resolve([]),
        staff.officeId
          ? this.prisma.statusDefinition.findMany({
              where: { officeId: staff.officeId, ...activeFilter },
              orderBy,
            })
          : Promise.resolve([]),
        clientIds.length > 0
          ? this.prisma.statusDefinition.findMany({
              where: { clientId: { in: clientIds }, ...activeFilter },
              orderBy,
            })
          : Promise.resolve([]),
        staff.teamId
          ? this.prisma.statusDefinition.findMany({
              where: { teamId: staff.teamId, ...activeFilter },
              orderBy,
            })
          : Promise.resolve([]),
      ]);

    const seen = new Set<string>();
    const merged = [...companyStatuses, ...officeStatuses, ...clientStatuses, ...teamStatuses, ...globalStatuses]
      .filter((s) => {
        if (seen.has(s.id)) return false;
        seen.add(s.id);
        return true;
      })
      .sort((a, b) => (a.orderNo ?? 0) - (b.orderNo ?? 0) || a.name.localeCompare(b.name));

    return merged;
  }
}
