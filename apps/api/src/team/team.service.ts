import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { AuditService } from '../system/audit/audit.service';
import { PaginationParams } from '../company/company.service';
import { uuidv7 } from 'uuidv7';

const STAFF_MANAGER_SELECT = {
  id: true,
  employeeId: true,
  firstName: true,
  middleName: true,
  surname: true,
  photoBusiness: true,
  userLogin: { select: { email: true } },
  position: { select: { id: true, name: true } },
} as const;

@Injectable()
export class TeamService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async findAll(params: PaginationParams & { companyId?: string }) {
    const page = Number(params.page) || 1;
    const limit = Number(params.limit) || 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (params.companyId) where['companyId'] = params.companyId;
    if (params.search) {
      where['OR'] = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { code: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.team.findMany({
        where,
        skip,
        take: limit,
        orderBy: { logCreatedAt: 'desc' },
        include: {
          company: { select: { id: true, name: true } },
          client:  { select: { id: true, name: true } },
          _count:  { select: { managers: true, staff: true } },
        },
      }),
      this.prisma.team.count({ where }),
    ]);

    return {
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const team = await this.prisma.team.findFirst({
      where: { id },
      include: { company: { select: { id: true, name: true } } },
    });
    if (!team) throw new NotFoundException(`Team ${id} not found`);
    return team;
  }

  async create(dto: CreateTeamDto, createdBy: string) {
    return this.prisma.team.create({
      data: {
        id: uuidv7(),
        name: dto.teamName,
        code: dto.teamCode,
        companyId: dto.companyId,
        clientId: dto.clientId,
        colorHex: dto.colorHex,
        iconId: dto.iconId,
        orderNo: dto.orderNo ?? 0,
        logCreatedBy: createdBy,
        logUpdatedBy: createdBy,
      },
    });
  }

  async update(id: string, dto: UpdateTeamDto, updatedBy: string) {
    await this.findOne(id);
    return this.prisma.team.update({
      where: { id },
      data: {
        ...(dto.teamName !== undefined && { name: dto.teamName }),
        ...(dto.teamCode !== undefined && { code: dto.teamCode }),
        ...(dto.companyId !== undefined && { companyId: dto.companyId }),
        ...(dto.clientId !== undefined && { clientId: dto.clientId }),
        ...(dto.colorHex !== undefined && { colorHex: dto.colorHex }),
        ...(dto.iconId !== undefined && { iconId: dto.iconId }),
        ...(dto.orderNo !== undefined && { orderNo: dto.orderNo }),
        logUpdatedBy: updatedBy,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.team.update({
      where: { id },
      data: { isDeleted: true },
    });
  }

  // ── Managers ──────────────────────────────────────────────────────────────────

  async findManagers(teamId: string) {
    const rows = await this.prisma.teamManager.findMany({
      where: { teamId, isDeleted: false },
      include: { staff: { select: STAFF_MANAGER_SELECT } },
      orderBy: { logCreatedAt: 'asc' },
    });
    return rows.map((r) => r.staff);
  }

  async addManager(teamId: string, staffId: string, actorId: string) {
    await this.findOne(teamId);
    const staff = await this.prisma.staff.findFirst({
      where: { id: staffId, isDeleted: false, isDisabled: false },
    });
    if (!staff) throw new NotFoundException(`Staff ${staffId} not found or inactive`);

    const existing = await this.prisma.teamManager.findFirst({
      where: { teamId, staffId },
    });

    let result;
    if (existing) {
      result = await this.prisma.teamManager.update({
        where: { id: existing.id },
        data: { isDeleted: false, logUpdatedBy: actorId },
      });
    } else {
      result = await this.prisma.teamManager.create({
        data: {
          id: uuidv7(),
          teamId,
          staffId,
          logCreatedBy: actorId,
          logUpdatedBy: actorId,
        },
      });
    }

    await this.auditService.log('ASSIGN_MANAGER', 'Team', teamId, actorId, undefined, { staffId });
    return result;
  }

  async removeManager(teamId: string, staffId: string, actorId: string) {
    await this.findOne(teamId);
    const row = await this.prisma.teamManager.findFirst({
      where: { teamId, staffId, isDeleted: false },
    });
    if (!row) throw new NotFoundException(`Manager assignment not found`);

    const result = await this.prisma.teamManager.update({
      where: { id: row.id },
      data: { isDeleted: true, logUpdatedBy: actorId },
    });
    await this.auditService.log('UNASSIGN_MANAGER', 'Team', teamId, actorId, undefined, { staffId });
    return result;
  }

  async replaceManagers(teamId: string, staffIds: string[], actorId: string) {
    await this.findOne(teamId);

    const current = await this.prisma.teamManager.findMany({
      where: { teamId, isDeleted: false },
      select: { staffId: true },
    });
    const currentIds = new Set(current.map((r) => r.staffId));
    const newIds = new Set(staffIds);

    const toAdd = staffIds.filter((id) => !currentIds.has(id));
    const toRemove = [...currentIds].filter((id) => !newIds.has(id));

    await this.prisma.$transaction(async (tx) => {
      if (toRemove.length > 0) {
        await tx.teamManager.updateMany({
          where: { teamId, staffId: { in: toRemove }, isDeleted: false },
          data: { isDeleted: true, logUpdatedBy: actorId },
        });
      }
      for (const sId of toAdd) {
        const existing = await tx.teamManager.findFirst({ where: { teamId, staffId: sId } });
        if (existing) {
          await tx.teamManager.update({ where: { id: existing.id }, data: { isDeleted: false, logUpdatedBy: actorId } });
        } else {
          await tx.teamManager.create({
            data: { id: uuidv7(), teamId, staffId: sId, logCreatedBy: actorId, logUpdatedBy: actorId },
          });
        }
      }
    });

    await this.auditService.log('REPLACE_MANAGERS', 'Team', teamId, actorId, undefined, { staffIds });
    return this.findManagers(teamId);
  }

  // ── Employees ─────────────────────────────────────────────────────────────────

  async findEmployees(teamId: string, params: PaginationParams) {
    await this.findOne(teamId);
    const page = Number(params.page) || 1;
    const limit = Number(params.limit) || 50;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { teamId, isDeleted: false };
    if (params.search) {
      where['OR'] = [
        { firstName: { contains: params.search, mode: 'insensitive' } },
        { surname: { contains: params.search, mode: 'insensitive' } },
        { employeeId: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.staff.findMany({
        where,
        skip,
        take: limit,
        orderBy: { logCreatedAt: 'desc' },
        include: {
          department: { select: { id: true, name: true } },
          office: { select: { id: true, name: true } },
          position: { select: { id: true, name: true } },
          team: { select: { id: true, name: true } },
          staffRoles: {
            where: { isDeleted: false },
            include: { role: { select: { id: true, name: true, displayName: true } } },
          },
        },
      }),
      this.prisma.staff.count({ where }),
    ]);

    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }
}
