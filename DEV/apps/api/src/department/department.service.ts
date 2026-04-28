import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
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
  email: true,
  position: { select: { id: true, name: true } },
} as const;

@Injectable()
export class DepartmentService {
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
      this.prisma.department.findMany({
        where,
        skip,
        take: limit,
        orderBy: { logCreatedAt: 'desc' },
        include: { company: { select: { id: true, name: true } } },
      }),
      this.prisma.department.count({ where }),
    ]);

    return {
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const dept = await this.prisma.department.findFirst({
      where: { id },
      include: { company: { select: { id: true, name: true } } },
    });
    if (!dept) throw new NotFoundException(`Department ${id} not found`);
    return dept;
  }

  async create(dto: CreateDepartmentDto, createdBy: string) {
    return this.prisma.department.create({
      data: {
        id: uuidv7(),
        code: dto.departmentCode,
        name: dto.departmentName,
        companyId: dto.companyId,
        note: dto.description,
        colorHex: dto.colorHex,
        iconId: dto.iconId,
        orderNo: dto.orderNo ?? 0,
        logCreatedBy: createdBy,
        logUpdatedBy: createdBy,
      },
    });
  }

  async update(id: string, dto: UpdateDepartmentDto, updatedBy: string) {
    await this.findOne(id);
    return this.prisma.department.update({
      where: { id },
      data: {
        ...(dto.departmentCode !== undefined && { code: dto.departmentCode }),
        ...(dto.departmentName !== undefined && { name: dto.departmentName }),
        ...(dto.companyId !== undefined && { companyId: dto.companyId }),
        ...(dto.description !== undefined && { note: dto.description }),
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
      where: { departmentId: id },
    });

    if (staffCount > 0) {
      throw new BadRequestException(
        `Cannot delete department: has ${staffCount} staff member(s) attached`,
      );
    }

    return this.prisma.department.update({
      where: { id },
      data: { isDeleted: true },
    });
  }

  // ── Managers ──────────────────────────────────────────────────────────────────

  async findManagers(departmentId: string) {
    const rows = await this.prisma.departmentManager.findMany({
      where: { departmentId, isDeleted: false },
      include: { staff: { select: STAFF_MANAGER_SELECT } },
      orderBy: { logCreatedAt: 'asc' },
    });
    return rows.map((r) => r.staff);
  }

  async addManager(departmentId: string, staffId: string, actorId: string) {
    await this.findOne(departmentId);
    const staff = await this.prisma.staff.findFirst({
      where: { id: staffId, isDeleted: false, isDisabled: false },
    });
    if (!staff) throw new NotFoundException(`Staff ${staffId} not found or inactive`);

    const existing = await this.prisma.departmentManager.findFirst({
      where: { departmentId, staffId },
    });

    let result;
    if (existing) {
      result = await this.prisma.departmentManager.update({
        where: { id: existing.id },
        data: { isDeleted: false, logUpdatedBy: actorId },
      });
    } else {
      result = await this.prisma.departmentManager.create({
        data: {
          id: uuidv7(),
          departmentId,
          staffId,
          logCreatedBy: actorId,
          logUpdatedBy: actorId,
        },
      });
    }

    await this.auditService.log('ASSIGN_MANAGER', 'Department', departmentId, actorId, undefined, { staffId });
    return result;
  }

  async removeManager(departmentId: string, staffId: string, actorId: string) {
    await this.findOne(departmentId);
    const row = await this.prisma.departmentManager.findFirst({
      where: { departmentId, staffId, isDeleted: false },
    });
    if (!row) throw new NotFoundException(`Manager assignment not found`);

    const result = await this.prisma.departmentManager.update({
      where: { id: row.id },
      data: { isDeleted: true, logUpdatedBy: actorId },
    });
    await this.auditService.log('UNASSIGN_MANAGER', 'Department', departmentId, actorId, undefined, { staffId });
    return result;
  }

  async replaceManagers(departmentId: string, staffIds: string[], actorId: string) {
    await this.findOne(departmentId);

    const current = await this.prisma.departmentManager.findMany({
      where: { departmentId, isDeleted: false },
      select: { staffId: true },
    });
    const currentIds = new Set(current.map((r) => r.staffId));
    const newIds = new Set(staffIds);

    const toAdd = staffIds.filter((id) => !currentIds.has(id));
    const toRemove = [...currentIds].filter((id) => !newIds.has(id));

    await this.prisma.$transaction(async (tx) => {
      if (toRemove.length > 0) {
        await tx.departmentManager.updateMany({
          where: { departmentId, staffId: { in: toRemove }, isDeleted: false },
          data: { isDeleted: true, logUpdatedBy: actorId },
        });
      }
      for (const sId of toAdd) {
        const existing = await tx.departmentManager.findFirst({ where: { departmentId, staffId: sId } });
        if (existing) {
          await tx.departmentManager.update({ where: { id: existing.id }, data: { isDeleted: false, logUpdatedBy: actorId } });
        } else {
          await tx.departmentManager.create({
            data: { id: uuidv7(), departmentId, staffId: sId, logCreatedBy: actorId, logUpdatedBy: actorId },
          });
        }
      }
    });

    await this.auditService.log('REPLACE_MANAGERS', 'Department', departmentId, actorId, undefined, { staffIds });
    return this.findManagers(departmentId);
  }

  // ── Employees ─────────────────────────────────────────────────────────────────

  async findEmployees(departmentId: string, params: PaginationParams) {
    await this.findOne(departmentId);
    const page = Number(params.page) || 1;
    const limit = Number(params.limit) || 50;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { departmentId, isDeleted: false };
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
