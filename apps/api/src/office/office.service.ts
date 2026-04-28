import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOfficeDto } from './dto/create-office.dto';
import { UpdateOfficeDto } from './dto/update-office.dto';
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
export class OfficeService {
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
      this.prisma.office.findMany({
        where,
        skip,
        take: limit,
        orderBy: { logCreatedAt: 'desc' },
        include: { company: { select: { id: true, name: true } } },
      }),
      this.prisma.office.count({ where }),
    ]);

    return {
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const office = await this.prisma.office.findFirst({
      where: { id },
      include: { company: { select: { id: true, name: true } } },
    });
    if (!office) throw new NotFoundException(`Office ${id} not found`);
    return office;
  }

  async create(dto: CreateOfficeDto, createdBy: string) {
    return this.prisma.office.create({
      data: {
        id: uuidv7(),
        code: dto.officeCode,
        name: dto.officeName,
        companyId: dto.companyId,
        address: dto.officeAddress,
        city: dto.city,
        country: dto.country,
        timezone: dto.timezone,
        colorHex: dto.colorHex,
        iconId: dto.iconId,
        orderNo: dto.orderNo ?? 0,
        logCreatedBy: createdBy,
        logUpdatedBy: createdBy,
      },
    });
  }

  async update(id: string, dto: UpdateOfficeDto, updatedBy: string) {
    await this.findOne(id);
    return this.prisma.office.update({
      where: { id },
      data: {
        ...(dto.officeCode !== undefined && { code: dto.officeCode }),
        ...(dto.officeName !== undefined && { name: dto.officeName }),
        ...(dto.companyId !== undefined && { companyId: dto.companyId }),
        ...(dto.officeAddress !== undefined && { address: dto.officeAddress }),
        ...(dto.city !== undefined && { city: dto.city }),
        ...(dto.country !== undefined && { country: dto.country }),
        ...(dto.timezone !== undefined && { timezone: dto.timezone }),
        ...(dto.colorHex !== undefined && { colorHex: dto.colorHex }),
        ...(dto.iconId !== undefined && { iconId: dto.iconId }),
        ...(dto.orderNo !== undefined && { orderNo: dto.orderNo }),
        logUpdatedBy: updatedBy,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    const staffCount = await this.prisma.staff.count({
      where: { officeId: id },
    });

    if (staffCount > 0) {
      throw new BadRequestException(
        `Cannot delete office: has ${staffCount} staff member(s) attached`,
      );
    }

    return this.prisma.office.update({
      where: { id },
      data: { isDeleted: true },
    });
  }

  // ── Managers ──────────────────────────────────────────────────────────────────

  async findManagers(officeId: string) {
    const rows = await this.prisma.officeManager.findMany({
      where: { officeId, isDeleted: false },
      include: { staff: { select: STAFF_MANAGER_SELECT } },
      orderBy: { logCreatedAt: 'asc' },
    });
    return rows.map((r) => r.staff);
  }

  async addManager(officeId: string, staffId: string, actorId: string) {
    await this.findOne(officeId);
    const staff = await this.prisma.staff.findFirst({
      where: { id: staffId, isDeleted: false, isDisabled: false },
    });
    if (!staff) throw new NotFoundException(`Staff ${staffId} not found or inactive`);

    const existing = await this.prisma.officeManager.findFirst({
      where: { officeId, staffId },
    });

    let result;
    if (existing) {
      result = await this.prisma.officeManager.update({
        where: { id: existing.id },
        data: { isDeleted: false, logUpdatedBy: actorId },
      });
    } else {
      result = await this.prisma.officeManager.create({
        data: {
          id: uuidv7(),
          officeId,
          staffId,
          logCreatedBy: actorId,
          logUpdatedBy: actorId,
        },
      });
    }

    await this.auditService.log('ASSIGN_MANAGER', 'Office', officeId, actorId, undefined, { staffId });
    return result;
  }

  async removeManager(officeId: string, staffId: string, actorId: string) {
    await this.findOne(officeId);
    const row = await this.prisma.officeManager.findFirst({
      where: { officeId, staffId, isDeleted: false },
    });
    if (!row) throw new NotFoundException(`Manager assignment not found`);

    const result = await this.prisma.officeManager.update({
      where: { id: row.id },
      data: { isDeleted: true, logUpdatedBy: actorId },
    });
    await this.auditService.log('UNASSIGN_MANAGER', 'Office', officeId, actorId, undefined, { staffId });
    return result;
  }

  async replaceManagers(officeId: string, staffIds: string[], actorId: string) {
    await this.findOne(officeId);

    const current = await this.prisma.officeManager.findMany({
      where: { officeId, isDeleted: false },
      select: { staffId: true },
    });
    const currentIds = new Set(current.map((r) => r.staffId));
    const newIds = new Set(staffIds);

    const toAdd = staffIds.filter((id) => !currentIds.has(id));
    const toRemove = [...currentIds].filter((id) => !newIds.has(id));

    await this.prisma.$transaction(async (tx) => {
      if (toRemove.length > 0) {
        await tx.officeManager.updateMany({
          where: { officeId, staffId: { in: toRemove }, isDeleted: false },
          data: { isDeleted: true, logUpdatedBy: actorId },
        });
      }
      for (const sId of toAdd) {
        const existing = await tx.officeManager.findFirst({ where: { officeId, staffId: sId } });
        if (existing) {
          await tx.officeManager.update({ where: { id: existing.id }, data: { isDeleted: false, logUpdatedBy: actorId } });
        } else {
          await tx.officeManager.create({
            data: { id: uuidv7(), officeId, staffId: sId, logCreatedBy: actorId, logUpdatedBy: actorId },
          });
        }
      }
    });

    await this.auditService.log('REPLACE_MANAGERS', 'Office', officeId, actorId, undefined, { staffIds });
    return this.findManagers(officeId);
  }

  // ── Employees ─────────────────────────────────────────────────────────────────

  async findEmployees(officeId: string, params: PaginationParams) {
    await this.findOne(officeId);
    const page = Number(params.page) || 1;
    const limit = Number(params.limit) || 50;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { officeId, isDeleted: false };
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
