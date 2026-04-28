import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { AuditService } from '../system/audit/audit.service';
import {
  CreateClientDepartmentDto,
  UpdateClientDepartmentDto,
  CreateClientProjectDto,
  UpdateClientProjectDto,
  CreateClientContactDto,
  UpdateClientContactDto,
  AssignStaffDto,
  UpdateAssignStaffDto,
} from './dto/client-sub.dto';
import { uuidv7 } from 'uuidv7';

export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
}

@Injectable()
export class ClientService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  // ── Clients ──────────────────────────────────────────────────────────────────

  async findAll(params: PaginationParams) {
    const page = Number(params.page) || 1;
    const limit = Number(params.limit) || 20;
    const skip = (page - 1) * limit;

    const where = {
      isDeleted: false,
      ...(params.search
        ? {
            OR: [
              { name: { contains: params.search, mode: 'insensitive' as const } },
              { code: { contains: params.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.businessClient.findMany({
        where,
        skip,
        take: limit,
        orderBy: { logCreatedAt: 'desc' },
        include: {
          _count: {
            select: {
              clientStaff: { where: { isDeleted: false } },
              departments: { where: { isDeleted: false } },
              projects: { where: { isDeleted: false } },
            },
          },
        },
      }),
      this.prisma.businessClient.count({ where }),
    ]);

    return {
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const client = await this.prisma.businessClient.findFirst({
      where: { id, isDeleted: false },
      include: {
        _count: {
          select: {
            clientStaff: { where: { isDeleted: false } },
            departments: { where: { isDeleted: false } },
            projects: { where: { isDeleted: false } },
            contacts: { where: { isDeleted: false } },
          },
        },
      },
    });
    if (!client) throw new NotFoundException(`Client ${id} not found`);
    return client;
  }

  async create(dto: CreateClientDto, createdBy: string, ipAddress?: string) {
    const existing = await this.prisma.businessClient.findFirst({
      where: { code: dto.code, isDeleted: false },
    });
    if (existing) throw new ConflictException(`Client code '${dto.code}' already exists`);

    const client = await this.prisma.businessClient.create({
      data: {
        id: uuidv7(),
        name: dto.name,
        code: dto.code,
        address: dto.address,
        phone: dto.phone,
        email: dto.email,
        website: dto.website,
        colorHex: dto.colorHex,
        iconId: dto.iconId,
        timezone: dto.timezone,
        defaultStartTime: dto.defaultStartTime,
        defaultEndTime: dto.defaultEndTime,
        country: dto.country,
        logCreatedBy: createdBy,
        logUpdatedBy: createdBy,
      },
    });
    void this.auditService.log('CREATE', 'BusinessClient', client.id, createdBy, undefined, { name: dto.name }, ipAddress);
    return client;
  }

  async update(id: string, dto: UpdateClientDto, updatedBy: string) {
    await this.findOne(id);
    if (dto.code) {
      const conflict = await this.prisma.businessClient.findFirst({
        where: { code: dto.code, isDeleted: false, NOT: { id } },
      });
      if (conflict) throw new ConflictException(`Client code '${dto.code}' already in use`);
    }
    return this.prisma.businessClient.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.code !== undefined && { code: dto.code }),
        ...(dto.address !== undefined && { address: dto.address }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.website !== undefined && { website: dto.website }),
        ...(dto.colorHex !== undefined && { colorHex: dto.colorHex }),
        ...(dto.iconId !== undefined && { iconId: dto.iconId }),
        ...(dto.timezone !== undefined && { timezone: dto.timezone }),
        ...(dto.defaultStartTime !== undefined && { defaultStartTime: dto.defaultStartTime }),
        ...(dto.defaultEndTime !== undefined && { defaultEndTime: dto.defaultEndTime }),
        ...(dto.country !== undefined && { country: dto.country }),
        logUpdatedBy: updatedBy,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    const [deptCount, projCount, staffCount] = await Promise.all([
      this.prisma.clientDepartment.count({ where: { clientId: id, isDeleted: false } }),
      this.prisma.clientProject.count({ where: { clientId: id, isDeleted: false } }),
      this.prisma.clientStaff.count({ where: { clientId: id, isDeleted: false } }),
    ]);

    if (deptCount > 0 || projCount > 0 || staffCount > 0) {
      throw new BadRequestException('Client has active departments/projects/staff');
    }

    return this.prisma.businessClient.update({
      where: { id },
      data: { isDeleted: true },
    }).then((result) => {
      void this.auditService.log('DELETE', 'BusinessClient', id);
      return result;
    });
  }

  // ── Departments ───────────────────────────────────────────────────────────────

  async findDepartments(clientId: string) {
    await this.findOne(clientId);
    return this.prisma.clientDepartment.findMany({
      where: { clientId, isDeleted: false },
      orderBy: { logCreatedAt: 'asc' },
    });
  }

  async createDepartment(clientId: string, dto: CreateClientDepartmentDto, createdBy: string) {
    await this.findOne(clientId);
    return this.prisma.clientDepartment.create({
      data: {
        id: uuidv7(),
        clientId,
        name: dto.name,
        code: dto.code,
        logCreatedBy: createdBy,
        logUpdatedBy: createdBy,
      },
    });
  }

  async updateDepartment(
    clientId: string,
    deptId: string,
    dto: UpdateClientDepartmentDto,
    updatedBy: string,
  ) {
    await this.findOneDepartment(clientId, deptId);
    return this.prisma.clientDepartment.update({
      where: { id: deptId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.code !== undefined && { code: dto.code }),
        logUpdatedBy: updatedBy,
      },
    });
  }

  async removeDepartment(clientId: string, deptId: string) {
    await this.findOneDepartment(clientId, deptId);

    const staffCount = await this.prisma.clientStaff.count({
      where: { clientDepartmentId: deptId, isDeleted: false },
    });
    if (staffCount > 0) {
      throw new BadRequestException('Department has assigned staff');
    }

    return this.prisma.clientDepartment.update({
      where: { id: deptId },
      data: { isDeleted: true },
    });
  }

  private async findOneDepartment(clientId: string, deptId: string) {
    const dept = await this.prisma.clientDepartment.findFirst({
      where: { id: deptId, clientId, isDeleted: false },
    });
    if (!dept) throw new NotFoundException(`Department ${deptId} not found`);
    return dept;
  }

  // ── Projects ──────────────────────────────────────────────────────────────────

  async findProjects(clientId: string) {
    await this.findOne(clientId);
    return this.prisma.clientProject.findMany({
      where: { clientId, isDeleted: false },
      include: { department: { select: { id: true, name: true } } },
      orderBy: { logCreatedAt: 'asc' },
    });
  }

  async createProject(clientId: string, dto: CreateClientProjectDto, createdBy: string) {
    await this.findOne(clientId);
    return this.prisma.clientProject.create({
      data: {
        id: uuidv7(),
        clientId,
        name: dto.name,
        code: dto.code,
        departmentId: dto.departmentId,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        status: dto.status,
        logCreatedBy: createdBy,
        logUpdatedBy: createdBy,
      },
    });
  }

  async updateProject(
    clientId: string,
    projId: string,
    dto: UpdateClientProjectDto,
    updatedBy: string,
  ) {
    await this.findOneProject(clientId, projId);
    return this.prisma.clientProject.update({
      where: { id: projId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.code !== undefined && { code: dto.code }),
        ...(dto.departmentId !== undefined && { departmentId: dto.departmentId }),
        ...(dto.startDate !== undefined && { startDate: dto.startDate ? new Date(dto.startDate) : null }),
        ...(dto.endDate !== undefined && { endDate: dto.endDate ? new Date(dto.endDate) : null }),
        ...(dto.status !== undefined && { status: dto.status }),
        logUpdatedBy: updatedBy,
      },
    });
  }

  async removeProject(clientId: string, projId: string) {
    await this.findOneProject(clientId, projId);
    return this.prisma.clientProject.update({
      where: { id: projId },
      data: { isDeleted: true },
    });
  }

  private async findOneProject(clientId: string, projId: string) {
    const proj = await this.prisma.clientProject.findFirst({
      where: { id: projId, clientId, isDeleted: false },
    });
    if (!proj) throw new NotFoundException(`Project ${projId} not found`);
    return proj;
  }

  // ── Contacts ──────────────────────────────────────────────────────────────────

  async findContacts(clientId: string) {
    await this.findOne(clientId);
    return this.prisma.clientContacts.findMany({
      where: { clientId, isDeleted: false },
      orderBy: { logCreatedAt: 'asc' },
    });
  }

  async createContact(clientId: string, dto: CreateClientContactDto, createdBy: string) {
    await this.findOne(clientId);
    return this.prisma.clientContacts.create({
      data: {
        id: uuidv7(),
        clientId,
        firstName: dto.firstName,
        surname: dto.surname,
        emailAddress: dto.emailAddress,
        mobileCountryCode: dto.mobileCountryCode,
        mobileNumber: dto.mobileNumber,
        streetAddress: dto.streetAddress,
        suburb: dto.suburb,
        city: dto.city,
        state: dto.state,
        country: dto.country,
        postcodeZipcode: dto.postcodeZipcode,
        logCreatedBy: createdBy,
        logUpdatedBy: createdBy,
      },
    });
  }

  async updateContact(
    clientId: string,
    contactId: string,
    dto: UpdateClientContactDto,
    updatedBy: string,
  ) {
    await this.findOneContact(clientId, contactId);
    return this.prisma.clientContacts.update({
      where: { id: contactId },
      data: {
        ...(dto.firstName !== undefined && { firstName: dto.firstName }),
        ...(dto.surname !== undefined && { surname: dto.surname }),
        ...(dto.emailAddress !== undefined && { emailAddress: dto.emailAddress }),
        ...(dto.mobileCountryCode !== undefined && { mobileCountryCode: dto.mobileCountryCode }),
        ...(dto.mobileNumber !== undefined && { mobileNumber: dto.mobileNumber }),
        ...(dto.streetAddress !== undefined && { streetAddress: dto.streetAddress }),
        ...(dto.suburb !== undefined && { suburb: dto.suburb }),
        ...(dto.city !== undefined && { city: dto.city }),
        ...(dto.state !== undefined && { state: dto.state }),
        ...(dto.country !== undefined && { country: dto.country }),
        ...(dto.postcodeZipcode !== undefined && { postcodeZipcode: dto.postcodeZipcode }),
        logUpdatedBy: updatedBy,
      },
    });
  }

  async removeContact(clientId: string, contactId: string) {
    await this.findOneContact(clientId, contactId);
    return this.prisma.clientContacts.update({
      where: { id: contactId },
      data: { isDeleted: true },
    });
  }

  private async findOneContact(clientId: string, contactId: string) {
    const contact = await this.prisma.clientContacts.findFirst({
      where: { id: contactId, clientId, isDeleted: false },
    });
    if (!contact) throw new NotFoundException(`Contact ${contactId} not found`);
    return contact;
  }

  // ── Employees ─────────────────────────────────────────────────────────────────

  async findEmployees(clientId: string) {
    await this.findOne(clientId);
    return this.prisma.clientStaff.findMany({
      where: { clientId, isDeleted: false },
      include: {
        staff: {
          select: {
            id: true,
            employeeId: true,
            firstName: true,
            surname: true,
            companyEmailAddress: true,
            userLogin: { select: { email: true } },
          },
        },
        clientDepartment: { select: { id: true, name: true } },
      },
      orderBy: { logCreatedAt: 'asc' },
    });
  }

  async assignEmployee(clientId: string, dto: AssignStaffDto, createdBy: string) {
    await this.findOne(clientId);

    const staff = await this.prisma.staff.findFirst({ where: { id: dto.staffId } });
    if (!staff) throw new NotFoundException(`Staff ${dto.staffId} not found`);

    const existing = await this.prisma.clientStaff.findFirst({
      where: { staffId: dto.staffId, clientId, isDeleted: false },
    });
    if (existing) throw new ConflictException('Staff already assigned to this client');

    return this.prisma.clientStaff.create({
      data: {
        id: uuidv7(),
        staffId: dto.staffId,
        clientId,
        clientDepartmentId: dto.clientDepartmentId ?? null,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        isPrimary: dto.isPrimary ?? false,
        logCreatedBy: createdBy,
        logUpdatedBy: createdBy,
      },
    });
  }

  async updateEmployee(
    clientId: string,
    staffId: string,
    dto: UpdateAssignStaffDto,
    updatedBy: string,
  ) {
    const record = await this.prisma.clientStaff.findFirst({
      where: { staffId, clientId, isDeleted: false },
    });
    if (!record) throw new NotFoundException('Assignment not found');

    return this.prisma.clientStaff.update({
      where: { id: record.id },
      data: {
        ...(dto.clientDepartmentId !== undefined && { clientDepartmentId: dto.clientDepartmentId }),
        ...(dto.startDate !== undefined && { startDate: dto.startDate ? new Date(dto.startDate) : null }),
        ...(dto.endDate !== undefined && { endDate: dto.endDate ? new Date(dto.endDate) : null }),
        ...(dto.isPrimary !== undefined && { isPrimary: dto.isPrimary }),
        logUpdatedBy: updatedBy,
      },
      include: {
        staff: { select: { id: true, employeeId: true, firstName: true, surname: true, companyEmailAddress: true, userLogin: { select: { email: true } } } },
        clientDepartment: { select: { id: true, name: true } },
      },
    });
  }

  async unassignEmployee(clientId: string, staffId: string) {
    const record = await this.prisma.clientStaff.findFirst({
      where: { staffId, clientId, isDeleted: false },
    });
    if (!record) throw new NotFoundException('Assignment not found');

    return this.prisma.clientStaff.update({
      where: { id: record.id },
      data: { isDeleted: true },
    });
  }
}
