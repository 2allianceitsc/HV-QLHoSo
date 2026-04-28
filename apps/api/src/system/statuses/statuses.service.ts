import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateStatusDto, UpdateStatusDto, ReorderStatusDto } from './dto/status.dto';
import { uuidv7 } from 'uuidv7';

export interface IStatusFilter {
  scope?: 'system' | 'company' | 'office' | 'client' | 'team';
  scopeId?: string;
}

@Injectable()
export class SystemStatusesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Login / Logout statuses must be global (all scope IDs NULL).
   * See docs/flows/F04-global-login-logout.md.
   */
  private assertLoginLogoutIsGlobal(dto: {
    isLoginStatus?: boolean | null;
    isLogoutStatus?: boolean | null;
    companyId?: string | null;
    officeId?: string | null;
    clientId?: string | null;
    teamId?: string | null;
  }) {
    const isSystemFlag = dto.isLoginStatus === true || dto.isLogoutStatus === true;
    const hasScope = Boolean(dto.companyId || dto.officeId || dto.clientId || dto.teamId);
    if (isSystemFlag && hasScope) {
      throw new BadRequestException(
        'Login/Logout statuses must be global — clear companyId/officeId/clientId/teamId.',
      );
    }
  }

  async findAll(filter: IStatusFilter) {
    const where: Record<string, unknown> = { isDeleted: false };

    if (filter.scope === 'system') {
      // Global rows: all scope IDs NULL. Login/Logout live here.
      where.companyId = null;
      where.officeId = null;
      where.clientId = null;
      where.teamId = null;
    } else if (filter.scope && filter.scopeId) {
      where[`${filter.scope}Id`] = filter.scopeId;
    }

    return this.prisma.statusDefinition.findMany({
      where,
      orderBy: [{ orderNo: 'asc' }, { name: 'asc' }],
    });
  }

  async findOne(id: string) {
    const status = await this.prisma.statusDefinition.findFirst({
      where: { id, isDeleted: false },
    });
    if (!status) throw new NotFoundException(`Status ${id} not found`);
    return status;
  }

  async create(dto: CreateStatusDto, createdBy: string) {
    this.assertLoginLogoutIsGlobal(dto);
    return this.prisma.statusDefinition.create({
      data: {
        id: uuidv7(),
        name: dto.name,
        colorHex: dto.colorHex,
        iconId: dto.iconId,
        companyId: dto.companyId,
        officeId: dto.officeId,
        clientId: dto.clientId,
        teamId: dto.teamId,
        isLoginStatus: dto.isLoginStatus ?? false,
        isLogoutStatus: dto.isLogoutStatus ?? false,
        isWorkingInStatus: dto.isWorkingInStatus ?? false,
        isWorkingOutStatus: dto.isWorkingOutStatus ?? false,
        isBreak: dto.isBreak ?? false,
        isAbsent: dto.isAbsent ?? false,
        isIdleStatus: dto.isIdleStatus ?? false,
        isNormalDayOff: dto.isNormalDayOff ?? false,
        isHalfDayOff: dto.isHalfDayOff ?? false,
        isPaid: dto.isPaid ?? false,
        scopeType: dto.scopeType ?? (dto.clientId ? 'Client' : 'System'),
        maxDurationSeconds: dto.maxDurationSeconds,
        description: dto.description ?? null,
        orderNo: dto.orderNo ?? 0,
        logCreatedBy: createdBy,
        logUpdatedBy: createdBy,
      },
    });
  }

  async update(id: string, dto: UpdateStatusDto, updatedBy: string) {
    const existing = await this.findOne(id);
    // Merge existing scope IDs so partial updates are validated against the
    // final state (e.g. keeping isLoginStatus but not re-sending companyId).
    this.assertLoginLogoutIsGlobal({
      isLoginStatus: dto.isLoginStatus ?? existing.isLoginStatus,
      isLogoutStatus: dto.isLogoutStatus ?? existing.isLogoutStatus,
      companyId: dto.companyId ?? existing.companyId,
      officeId: dto.officeId ?? existing.officeId,
      clientId: dto.clientId ?? existing.clientId,
      teamId: dto.teamId ?? existing.teamId,
    });
    // Partial PATCH (e.g. CR-016 inline orderNo commit sends only `{orderNo}`):
    // do NOT recompute scopeType from an absent `dto.clientId` — that silently
    // flips a stored 'Client' row to 'System'. Leave scopeType unchanged unless
    // the caller explicitly sent scopeType OR changed clientId.
    const nextScopeType =
      dto.scopeType !== undefined
        ? dto.scopeType
        : dto.clientId !== undefined
          ? dto.clientId
            ? 'Client'
            : 'System'
          : undefined;
    return this.prisma.statusDefinition.update({
      where: { id },
      data: {
        name: dto.name,
        colorHex: dto.colorHex,
        iconId: dto.iconId,
        companyId: dto.companyId,
        officeId: dto.officeId,
        clientId: dto.clientId,
        teamId: dto.teamId,
        isLoginStatus: dto.isLoginStatus,
        isLogoutStatus: dto.isLogoutStatus,
        isWorkingInStatus: dto.isWorkingInStatus,
        isWorkingOutStatus: dto.isWorkingOutStatus,
        isBreak: dto.isBreak,
        isAbsent: dto.isAbsent,
        isIdleStatus: dto.isIdleStatus,
        isNormalDayOff: dto.isNormalDayOff,
        isHalfDayOff: dto.isHalfDayOff,
        isPaid: dto.isPaid,
        scopeType: nextScopeType,
        maxDurationSeconds: dto.maxDurationSeconds,
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.isDisabled !== undefined && { isDisabled: dto.isDisabled }),
        orderNo: dto.orderNo,
        logUpdatedBy: updatedBy,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    // Count all rows regardless of isDeleted — soft-deleted TT rows still FK-reference
    // this status and must be preserved for audit trail.
    const usageCount = await this.prisma.timeTracking.count({
      where: { statusId: id },
    });
    if (usageCount > 0) {
      throw new BadRequestException(
        `Cannot delete status referenced in ${usageCount} time tracking records`,
      );
    }

    return this.prisma.statusDefinition.update({
      where: { id },
      data: { isDeleted: true },
    });
  }

  async reorder(dto: ReorderStatusDto, updatedBy: string) {
    const ops = dto.ids.map((id, index) =>
      this.prisma.statusDefinition.update({
        where: { id },
        data: { orderNo: index, logUpdatedBy: updatedBy },
      }),
    );
    await this.prisma.$transaction(ops);
    return { reordered: dto.ids.length };
  }
}
