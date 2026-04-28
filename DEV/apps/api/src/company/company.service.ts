import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { CreateCompanyContactDto } from './dto/create-company-contact.dto';
import { UpdateCompanyContactDto } from './dto/update-company-contact.dto';
import { AuditService } from '../system/audit/audit.service';
import { uuidv7 } from 'uuidv7';

export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
}

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
export class CompanyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async findAll(params: PaginationParams) {
    const page = Number(params.page) || 1;
    const limit = Number(params.limit) || 20;
    const skip = (page - 1) * limit;

    const where = params.search
      ? {
          OR: [
            { name: { contains: params.search, mode: 'insensitive' as const } },
            { code: { contains: params.search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [data, total] = await Promise.all([
      this.prisma.company.findMany({
        where,
        skip,
        take: limit,
        orderBy: { logCreatedAt: 'desc' },
        include: { contacts: true },
      }),
      this.prisma.company.count({ where }),
    ]);

    return {
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const company = await this.prisma.company.findFirst({
      where: { id },
      include: { contacts: true, departments: true, offices: true },
    });
    if (!company) throw new NotFoundException(`Company ${id} not found`);
    return company;
  }

  async create(dto: CreateCompanyDto, createdBy: string) {
    return this.prisma.company.create({
      data: {
        id: uuidv7(),
        name: dto.companyName,
        code: dto.companyCode,
        address: dto.companyAddress,
        taxCode: dto.companyTinNumber,
        logoUrl: dto.companyLogoUrl,
        phone: dto.companyPhone,
        website: dto.companyWebsite,
        colorHex: dto.colorHex,
        iconId: dto.iconId,
        defaultTimezone: dto.defaultTimezone,
        logCreatedBy: createdBy,
        logUpdatedBy: createdBy,
      },
    });
  }

  async update(id: string, dto: UpdateCompanyDto, updatedBy: string) {
    await this.findOne(id);
    return this.prisma.company.update({
      where: { id },
      data: {
        ...(dto.companyName !== undefined && { name: dto.companyName }),
        ...(dto.companyCode !== undefined && { code: dto.companyCode }),
        ...(dto.companyAddress !== undefined && { address: dto.companyAddress }),
        ...(dto.companyTinNumber !== undefined && { taxCode: dto.companyTinNumber }),
        ...(dto.companyLogoUrl !== undefined && { logoUrl: dto.companyLogoUrl }),
        ...(dto.companyPhone !== undefined && { phone: dto.companyPhone }),
        ...(dto.companyWebsite !== undefined && { website: dto.companyWebsite }),
        ...(dto.colorHex !== undefined && { colorHex: dto.colorHex }),
        ...(dto.iconId !== undefined && { iconId: dto.iconId }),
        ...(dto.defaultTimezone !== undefined && { defaultTimezone: dto.defaultTimezone }),
        logUpdatedBy: updatedBy,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    const [deptCount, officeCount, staffCount] = await Promise.all([
      this.prisma.department.count({ where: { companyId: id } }),
      this.prisma.office.count({ where: { companyId: id } }),
      this.prisma.staff.count({ where: { companyId: id } }),
    ]);

    const issues: string[] = [];
    if (deptCount > 0) issues.push(`${deptCount} department(s)`);
    if (officeCount > 0) issues.push(`${officeCount} office(s)`);
    if (staffCount > 0) issues.push(`${staffCount} staff member(s)`);

    if (issues.length > 0) {
      throw new BadRequestException(
        `Cannot delete company: has ${issues.join(', ')} attached`,
      );
    }

    return this.prisma.company.update({
      where: { id },
      data: { isDeleted: true },
    });
  }

  async findContacts(companyId: string) {
    return this.prisma.companyContacts.findMany({
      where: { companyId, isDeleted: false },
      orderBy: { orderNo: 'asc' },
    });
  }

  async createContact(
    companyId: string,
    dto: CreateCompanyContactDto,
    createdBy: string,
  ) {
    return this.prisma.companyContacts.create({
      data: {
        id: uuidv7(),
        companyId,
        firstName: dto.firstName,
        surname: dto.surname,
        emailAddress: dto.emailAddress,
        mobileCountryCode: dto.mobileCountryCode,
        mobileNumber: dto.mobileNumber,
        landlineCountryCode: dto.landlineCountryCode,
        landlineAreaCode: dto.landlineAreaCode,
        landlineNumber: dto.landlineNumber,
        streetAddress: dto.streetAddress,
        suburb: dto.suburb,
        city: dto.city,
        state: dto.state,
        country: dto.country,
        postcode: dto.postcode,
        note: dto.note,
        logCreatedBy: createdBy,
        logUpdatedBy: createdBy,
      },
    });
  }

  async updateContact(
    companyId: string,
    contactId: string,
    dto: UpdateCompanyContactDto,
    updatedBy: string,
  ) {
    return this.prisma.companyContacts.update({
      where: { id: contactId, companyId },
      data: {
        ...(dto.firstName !== undefined && { firstName: dto.firstName }),
        ...(dto.surname !== undefined && { surname: dto.surname }),
        ...(dto.emailAddress !== undefined && { emailAddress: dto.emailAddress }),
        ...(dto.mobileCountryCode !== undefined && { mobileCountryCode: dto.mobileCountryCode }),
        ...(dto.mobileNumber !== undefined && { mobileNumber: dto.mobileNumber }),
        ...(dto.landlineCountryCode !== undefined && { landlineCountryCode: dto.landlineCountryCode }),
        ...(dto.landlineAreaCode !== undefined && { landlineAreaCode: dto.landlineAreaCode }),
        ...(dto.landlineNumber !== undefined && { landlineNumber: dto.landlineNumber }),
        ...(dto.streetAddress !== undefined && { streetAddress: dto.streetAddress }),
        ...(dto.suburb !== undefined && { suburb: dto.suburb }),
        ...(dto.city !== undefined && { city: dto.city }),
        ...(dto.state !== undefined && { state: dto.state }),
        ...(dto.country !== undefined && { country: dto.country }),
        ...(dto.postcode !== undefined && { postcode: dto.postcode }),
        ...(dto.note !== undefined && { note: dto.note }),
        logUpdatedBy: updatedBy,
      },
    });
  }

  async removeContact(companyId: string, contactId: string) {
    return this.prisma.companyContacts.update({
      where: { id: contactId, companyId },
      data: { isDeleted: true },
    });
  }

  // ── Managers ──────────────────────────────────────────────────────────────────

  async findManagers(companyId: string) {
    const rows = await this.prisma.companyManager.findMany({
      where: { companyId, isDeleted: false },
      include: { staff: { select: STAFF_MANAGER_SELECT } },
      orderBy: { logCreatedAt: 'asc' },
    });
    return rows.map((r) => r.staff);
  }

  async addManager(companyId: string, staffId: string, actorId: string) {
    // Validate scope
    await this.findOne(companyId);
    // Validate staff
    const staff = await this.prisma.staff.findFirst({
      where: { id: staffId, isDeleted: false, isDisabled: false },
    });
    if (!staff) throw new NotFoundException(`Staff ${staffId} not found or inactive`);

    // Upsert: reactivate soft-deleted row or create new
    const existing = await this.prisma.companyManager.findFirst({
      where: { companyId, staffId },
    });

    let result;
    if (existing) {
      result = await this.prisma.companyManager.update({
        where: { id: existing.id },
        data: { isDeleted: false, logUpdatedBy: actorId },
      });
    } else {
      result = await this.prisma.companyManager.create({
        data: {
          id: uuidv7(),
          companyId,
          staffId,
          logCreatedBy: actorId,
          logUpdatedBy: actorId,
        },
      });
    }

    await this.auditService.log('ASSIGN_MANAGER', 'Company', companyId, actorId, undefined, { staffId });
    return result;
  }

  async removeManager(companyId: string, staffId: string, actorId: string) {
    await this.findOne(companyId);
    const row = await this.prisma.companyManager.findFirst({
      where: { companyId, staffId, isDeleted: false },
    });
    if (!row) throw new NotFoundException(`Manager assignment not found`);

    const result = await this.prisma.companyManager.update({
      where: { id: row.id },
      data: { isDeleted: true, logUpdatedBy: actorId },
    });
    await this.auditService.log('UNASSIGN_MANAGER', 'Company', companyId, actorId, undefined, { staffId });
    return result;
  }

  async replaceManagers(companyId: string, staffIds: string[], actorId: string) {
    await this.findOne(companyId);

    const current = await this.prisma.companyManager.findMany({
      where: { companyId, isDeleted: false },
      select: { staffId: true },
    });
    const currentIds = new Set(current.map((r) => r.staffId));
    const newIds = new Set(staffIds);

    const toAdd = staffIds.filter((id) => !currentIds.has(id));
    const toRemove = [...currentIds].filter((id) => !newIds.has(id));

    await this.prisma.$transaction(async (tx) => {
      // Remove extras
      if (toRemove.length > 0) {
        await tx.companyManager.updateMany({
          where: { companyId, staffId: { in: toRemove }, isDeleted: false },
          data: { isDeleted: true, logUpdatedBy: actorId },
        });
      }
      // Add missing
      for (const sId of toAdd) {
        const existing = await tx.companyManager.findFirst({ where: { companyId, staffId: sId } });
        if (existing) {
          await tx.companyManager.update({ where: { id: existing.id }, data: { isDeleted: false, logUpdatedBy: actorId } });
        } else {
          await tx.companyManager.create({
            data: { id: uuidv7(), companyId, staffId: sId, logCreatedBy: actorId, logUpdatedBy: actorId },
          });
        }
      }
    });

    await this.auditService.log('REPLACE_MANAGERS', 'Company', companyId, actorId, undefined, { staffIds });
    return this.findManagers(companyId);
  }

  // ── Employees ─────────────────────────────────────────────────────────────────

  async findEmployees(companyId: string, params: PaginationParams) {
    await this.findOne(companyId);
    const page = Number(params.page) || 1;
    const limit = Number(params.limit) || 50;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { companyId, isDeleted: false };
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
