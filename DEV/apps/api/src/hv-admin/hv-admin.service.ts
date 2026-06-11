import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { IsHexColor, IsInt, IsOptional, MaxLength, Min } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { uuidv7 } from 'uuidv7';
import * as bcrypt from 'bcryptjs';
import { ArrayMinSize, IsArray, IsBoolean, IsEmail, IsEnum, IsNotEmpty, IsString, IsUUID } from 'class-validator';

const CORE_STATUS_CODES = new Set(['draft', 'pending_review', 'in_review', 'approved', 'rejected']);

export class CreateSubmissionStatusDto {
  @IsString() @IsNotEmpty() @MaxLength(50) code!: string;
  @IsString() @IsNotEmpty() @MaxLength(100) label!: string;
  @IsHexColor() colorHex!: string;
  @IsInt() @Min(0) @IsOptional() orderNo?: number;
}

export class UpdateSubmissionStatusDto {
  @IsString() @IsNotEmpty() @MaxLength(100) label!: string;
  @IsHexColor() colorHex!: string;
}

export class CreateHvUserDto {
  @IsString() @IsNotEmpty() username!: string;
  @IsEmail() email!: string;
  @IsString() @IsNotEmpty() firstName!: string;
  @IsString() @IsOptional() middleName?: string;
  @IsString() @IsNotEmpty() surname!: string;
  @IsUUID() departmentId!: string;
  @IsString() @IsOptional() position?: string;
  @IsArray() @IsEnum(['staff', 'reviewer', 'approver', 'admin'], { each: true }) @ArrayMinSize(1) hvRoles!: string[];
}

export class UpdateHvUserDto {
  @IsString() @IsNotEmpty() @IsOptional() username?: string;
  @IsEmail() @IsOptional() email?: string;
  @IsString() @IsOptional() firstName?: string;
  @IsString() @IsOptional() middleName?: string;
  @IsString() @IsOptional() surname?: string;
  @IsUUID() @IsOptional() departmentId?: string;
  @IsString() @IsOptional() position?: string;
  @IsArray() @IsEnum(['staff', 'reviewer', 'approver', 'admin'], { each: true }) @ArrayMinSize(1) @IsOptional() hvRoles?: string[];
  @IsBoolean() @IsOptional() isActive?: boolean;
}

const STAFF_SELECT = {
  id: true, employeeId: true, firstName: true, middleName: true, surname: true,
  companyEmailAddress: true, departmentId: true, hvRoles: true, isDeleted: true,
  department: { select: { id: true, name: true } },
  userLogin: { select: { id: true, username: true, email: true, isFirstLogin: true, isActive: true } },
};

@Injectable()
export class HvAdminService {
  constructor(private readonly prisma: PrismaService) {}

  async listUsers(hvRole?: string, isSuperAdmin = false) {
    const users = await this.prisma.staff.findMany({
      where: { isDeleted: false, ...(hvRole ? { hvRoles: { has: hvRole } } : {}) },
      select: STAFF_SELECT,
      orderBy: { surname: 'asc' },
    });
    // Admin (không phải superadmin) không được nhìn thấy tài khoản superadmin
    if (!isSuperAdmin) {
      return users.filter((u) => u.userLogin?.username !== 'superadmin');
    }
    return users;
  }

  async createUser(dto: CreateHvUserDto, createdBy: string) {
    const existing = await this.prisma.userLogin.findFirst({ where: { username: dto.username, isDeleted: false } });
    if (existing) throw new ConflictException('Username already taken');

    const passwordHash = await bcrypt.hash('HV@123!', 12);

    return this.prisma.$transaction(async (tx) => {
      const userLogin = await tx.userLogin.create({
        data: {
          id: uuidv7(),
          username: dto.username,
          email: dto.email,
          passwordHash,
          isFirstLogin: true,
          isActive: true,
          logCreatedBy: createdBy,
        },
      });

      const count = await tx.staff.count();
      const staff = await tx.staff.create({
        data: {
          id: uuidv7(),
          userLoginId: userLogin.id,
          employeeId: `HV${String(count + 1).padStart(3, '0')}`,
          companyId: (await tx.company.findFirst({ select: { id: true } }))!.id,
          firstName: dto.firstName,
          middleName: dto.middleName,
          surname: dto.surname,
          companyEmailAddress: dto.email,
          departmentId: dto.departmentId,
          hvRoles: dto.hvRoles,
          logCreatedBy: createdBy,
        },
      });

      return staff;
    });
  }

  async updateUser(staffId: string, dto: UpdateHvUserDto, updatedBy: string) {
    const staff = await this.prisma.staff.findFirst({ where: { id: staffId, isDeleted: false } });
    if (!staff) throw new NotFoundException('User not found');

    if (staff.userLoginId && (dto.email || dto.username || dto.isActive !== undefined)) {
      if (dto.username) {
        const conflict = await this.prisma.userLogin.findFirst({
          where: { username: dto.username, isDeleted: false, NOT: { id: staff.userLoginId } },
        });
        if (conflict) throw new ConflictException('Username already taken');
      }
      const loginData: Record<string, unknown> = { logUpdatedBy: updatedBy };
      if (dto.username) loginData.username = dto.username;
      if (dto.email) loginData.email = dto.email;
      if (dto.isActive !== undefined) {
        loginData.isActive = dto.isActive;
        // Immediately revoke all active sessions when deactivating
        if (!dto.isActive) loginData.allSessionsRevokedAt = new Date();
      }
      await this.prisma.userLogin.update({ where: { id: staff.userLoginId }, data: loginData });
    }

    return this.prisma.staff.update({
      where: { id: staffId },
      data: {
        ...(dto.firstName && { firstName: dto.firstName }),
        ...(dto.middleName !== undefined && { middleName: dto.middleName }),
        ...(dto.surname && { surname: dto.surname }),
        ...(dto.departmentId && { departmentId: dto.departmentId }),
        ...(dto.hvRoles && { hvRoles: dto.hvRoles }),
        ...(dto.email && { companyEmailAddress: dto.email }),
        logUpdatedBy: updatedBy,
      },
      select: STAFF_SELECT,
    });
  }

  async deleteUser(staffId: string, updatedBy: string) {
    const staff = await this.prisma.staff.findFirst({ where: { id: staffId, isDeleted: false } });
    if (!staff) throw new NotFoundException('User not found');
    return this.prisma.staff.update({ where: { id: staffId }, data: { isDeleted: true, logUpdatedBy: updatedBy } });
  }

  async resetPassword(staffId: string, updatedBy: string) {
    const staff = await this.prisma.staff.findFirst({ where: { id: staffId, isDeleted: false }, select: { userLoginId: true } });
    if (!staff?.userLoginId) throw new NotFoundException('User not found');

    const passwordHash = await bcrypt.hash('HV@123!', 12);
    await this.prisma.userLogin.update({
      where: { id: staff.userLoginId },
      data: { passwordHash, isFirstLogin: true, logUpdatedBy: updatedBy },
    });

    return { message: 'Password reset to HV@123!. User must change on next login.' };
  }

  listDepartments() {
    return this.prisma.department.findMany({
      where: { isDeleted: false },
      select: { id: true, name: true, isDisabled: true },
      orderBy: { name: 'asc' },
    });
  }

  toggleDepartmentDisabled(id: string, isDisabled: boolean, updatedBy: string) {
    return this.prisma.department.update({ where: { id }, data: { isDisabled, logUpdatedBy: updatedBy } });
  }

  async createDepartment(name: string, createdBy: string) {
    const company = await this.prisma.company.findFirst({ select: { id: true } });
    return this.prisma.department.create({
      data: { id: uuidv7(), name, companyId: company!.id, logCreatedBy: createdBy },
    });
  }

  updateDepartment(id: string, name: string, updatedBy: string) {
    return this.prisma.department.update({ where: { id }, data: { name, logUpdatedBy: updatedBy } });
  }

  deleteDepartment(id: string, updatedBy: string) {
    return this.prisma.department.update({ where: { id }, data: { isDeleted: true, logUpdatedBy: updatedBy } });
  }

  listSubmissionStatuses() {
    return this.prisma.submissionStatus.findMany({ orderBy: { orderNo: 'asc' } });
  }

  async createSubmissionStatus(dto: CreateSubmissionStatusDto, createdBy: string) {
    const existing = await this.prisma.submissionStatus.findUnique({ where: { code: dto.code } });
    if (existing) throw new ConflictException(`Mã trạng thái '${dto.code}' đã tồn tại`);
    return this.prisma.submissionStatus.create({
      data: { code: dto.code, label: dto.label, colorHex: dto.colorHex, orderNo: dto.orderNo ?? 99, logUpdatedBy: createdBy },
    });
  }

  async updateSubmissionStatus(code: string, dto: UpdateSubmissionStatusDto, updatedBy: string) {
    const existing = await this.prisma.submissionStatus.findUnique({ where: { code } });
    if (!existing) throw new NotFoundException(`Status '${code}' not found`);
    return this.prisma.submissionStatus.update({
      where: { code },
      data: { label: dto.label, colorHex: dto.colorHex, logUpdatedBy: updatedBy },
    });
  }

  async deleteSubmissionStatus(code: string) {
    if (CORE_STATUS_CODES.has(code)) {
      throw new BadRequestException(`Trạng thái '${code}' là trạng thái hệ thống, không thể xóa`);
    }
    const existing = await this.prisma.submissionStatus.findUnique({ where: { code } });
    if (!existing) throw new NotFoundException(`Status '${code}' not found`);
    return this.prisma.submissionStatus.delete({ where: { code } });
  }
}
