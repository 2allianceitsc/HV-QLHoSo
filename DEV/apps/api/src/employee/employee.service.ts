import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto, UpdateRolesDto, ResetPasswordDto } from './dto/update-employee.dto';
import { uuidv7 } from 'uuidv7';
import * as bcrypt from 'bcrypt';
import * as XLSX from 'xlsx';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../system/audit/audit.service';

export interface IEmployeeFilter {
  page?: number;
  limit?: number;
  search?: string;
  departmentId?: string;
  officeId?: string;
  teamId?: string;
  roleId?: string;
  isActive?: string;
  /** '__none__' = no timezone set; any other value = exact timezone match */
  timezone?: string;
}

@Injectable()
export class EmployeeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly auditService: AuditService,
  ) {}

  // ── List ─────────────────────────────────────────────────────────────────────
  async findAll(filter: IEmployeeFilter) {
    const page = Number(filter.page) || 1;
    const limit = Number(filter.limit) || 20;
    const skip = (page - 1) * limit;

    const staffWhere: Record<string, unknown> = { isDeleted: false };

    if (filter.departmentId) staffWhere['departmentId'] = filter.departmentId;
    if (filter.officeId) staffWhere['officeId'] = filter.officeId;
    if (filter.teamId) staffWhere['teamId'] = filter.teamId;
    if (filter.isActive !== undefined) {
      staffWhere['isDisabled'] = filter.isActive === 'false';
    }

    if (filter.search) {
      staffWhere['OR'] = [
        { firstName: { contains: filter.search, mode: 'insensitive' } },
        { surname: { contains: filter.search, mode: 'insensitive' } },
        { employeeId: { contains: filter.search, mode: 'insensitive' } },
        {
          userLogin: {
            email: { contains: filter.search, mode: 'insensitive' },
          },
        },
      ];
    }

    if (filter.roleId) {
      staffWhere['staffRoles'] = {
        some: { roleId: filter.roleId, isDeleted: false },
      };
    }

    if (filter.timezone !== undefined) {
      if (filter.timezone === '__none__') {
        staffWhere['timezone'] = null;
      } else if (filter.timezone) {
        staffWhere['timezone'] = filter.timezone;
      }
    }

    const [data, total] = await Promise.all([
      this.prisma.staff.findMany({
        where: staffWhere,
        skip,
        take: limit,
        orderBy: { logCreatedAt: 'desc' },
        include: {
          userLogin: { select: { id: true, username: true, email: true, isActive: true, isDisabled: true } },
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
      this.prisma.staff.count({ where: staffWhere }),
    ]);

    return {
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  // ── Find One ─────────────────────────────────────────────────────────────────
  async findOne(id: string) {
    const staff = await this.prisma.staff.findFirst({
      where: { id, isDeleted: false },
      include: {
        userLogin: { select: { id: true, username: true, email: true, isActive: true, isDisabled: true, isFirstLogin: true } },
        department: { select: { id: true, name: true } },
        office: { select: { id: true, name: true } },
        position: { select: { id: true, name: true } },
        team: { select: { id: true, name: true } },
        company: { select: { id: true, name: true } },
        staffRoles: {
          where: { isDeleted: false },
          include: { role: { select: { id: true, name: true, displayName: true } } },
        },
      },
    });
    if (!staff) throw new NotFoundException(`Employee ${id} not found`);
    return staff;
  }

  // ── Create ───────────────────────────────────────────────────────────────────
  async create(dto: CreateEmployeeDto, createdBy: string, ipAddress?: string) {
    // Email uniqueness
    const existingEmail = await this.prisma.userLogin.findFirst({ where: { email: dto.email, isDeleted: false } });
    if (existingEmail) throw new ConflictException('Email already exists');

    if (dto.employeeId) {
      const existingEmpId = await this.prisma.staff.findFirst({
        where: { employeeId: dto.employeeId, isDeleted: false },
      });
      if (existingEmpId) throw new ConflictException('Employee ID already exists');
    }

    const username = await this.generateUsername(dto.surname, dto.firstName, dto.dateOfBirth);
    const tempPassword = this.generateTempPassword();
    const employeeId = dto.employeeId || (await this.generateEmployeeId());
    const passwordHash = await bcrypt.hash(tempPassword, 12);
    const userLoginId = uuidv7();
    const staffId = uuidv7();

    // Timezone resolution: provided → office → company
    let timezone = dto.timezone;
    if (!timezone && dto.officeId) {
      const office = await this.prisma.office.findUnique({ where: { id: dto.officeId }, select: { timezone: true } });
      timezone = office?.timezone ?? undefined;
    }
    if (!timezone) {
      const company = await this.prisma.company.findUnique({ where: { id: dto.companyId }, select: { defaultTimezone: true } });
      timezone = company?.defaultTimezone ?? undefined;
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.userLogin.create({
        data: {
          id: userLoginId,
          username,
          email: dto.email,
          passwordHash,
          isFirstLogin: true,
          logCreatedBy: createdBy,
          logUpdatedBy: createdBy,
        },
      });

      const staffCreateData = {
        id: staffId,
        userLoginId,
        employeeId,
        companyId: dto.companyId,
        firstName: dto.firstName,
        middleName: dto.middleName,
        surname: dto.surname,
        mobileNumber: dto.mobileNumber,
        dateOfBirth: new Date(dto.dateOfBirth),
        departmentId: dto.departmentId || undefined,
        officeId: dto.officeId || undefined,
        positionId: dto.positionId || undefined,
        teamId: dto.teamId || undefined,
        shiftStartTime: dto.shiftStartTime,
        shiftEndTime: dto.shiftEndTime,
        latestStartTime: dto.latestStartTime,
        latestEndShiftTime: dto.latestEndShiftTime,
        shiftEndDayOffset: dto.shiftEndDayOffset ?? 0,
        timezone,
        logCreatedBy: createdBy,
        logUpdatedBy: createdBy,
      } as any;

      await tx.staff.create({ data: staffCreateData });

      if (dto.roleIds?.length) {
        await tx.staffRole.createMany({
          data: dto.roleIds.map((roleId) => ({
            id: uuidv7(),
            staffId,
            roleId,
            logCreatedBy: createdBy,
            logUpdatedBy: createdBy,
          })),
        });
      }
    });

    const created = await this.findOne(staffId);

    void this.auditService.log('CREATE', 'Staff', staffId, createdBy, undefined, { employeeId }, ipAddress);

    void this.notificationsService.create(
      staffId,
      'Welcome to HVFlow',
      `Welcome, ${dto.firstName}! Your account has been created. Username: ${username}. Please log in to get started.`,
      'info',
    );

    return created;
  }

  private stripAccents(str: string): string {
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]/g, '');
  }

  private async generateUsername(surname: string, firstName: string, dateOfBirth: string): Promise<string> {
    const yearSuffix = dateOfBirth ? dateOfBirth.substring(2, 4) : '00';
    const cleanSurname = this.stripAccents(surname);
    const cleanFirst = this.stripAccents(firstName).charAt(0).toUpperCase();
    const base = `${cleanSurname}${cleanFirst}${yearSuffix}`;

    // Batch check base + up to 99 suffixed candidates in one query
    const candidates = [base, ...Array.from({ length: 99 }, (_, i) => `${base}${i + 1}`)];
    const taken = await this.prisma.userLogin.findMany({
      where: { username: { in: candidates }, isDeleted: false },
      select: { username: true },
    });
    const takenSet = new Set(taken.map((u) => u.username.toLowerCase()));
    const available = candidates.find((c) => !takenSet.has(c.toLowerCase()));

    if (!available) {
      throw new ConflictException('Unable to generate unique username. Please check name and date of birth.');
    }
    return available;
  }

  private generateTempPassword(): string {
    const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  // ── Update ───────────────────────────────────────────────────────────────────
  async update(id: string, dto: UpdateEmployeeDto, updatedBy: string, ipAddress?: string) {
    const staff = await this.findOne(id);

    if (dto.employeeId) {
      const conflict = await this.prisma.staff.findFirst({
        where: { employeeId: dto.employeeId, isDeleted: false, NOT: { id } },
      });
      if (conflict) throw new ConflictException('Employee ID already exists');
    }

    // Helper: treat empty string as "no change" (undefined) so FK/non-null fields are skipped
    const s = (v: string | undefined) => (v !== undefined && v !== '' ? v : undefined);

    const updateData = {
      ...(dto.firstName && { firstName: dto.firstName }),
      ...(s(dto.middleName) !== undefined && { middleName: dto.middleName }),
      ...(dto.surname && { surname: dto.surname }),
      ...(s(dto.employeeId) !== undefined && { employeeId: dto.employeeId }),
      ...(s(dto.companyId) !== undefined && { companyId: s(dto.companyId) }),
      ...(s(dto.departmentId) !== undefined && { departmentId: s(dto.departmentId) }),
      ...(s(dto.officeId) !== undefined && { officeId: s(dto.officeId) }),
      ...(s(dto.positionId) !== undefined && { positionId: s(dto.positionId) }),
      ...(s(dto.teamId) !== undefined && { teamId: s(dto.teamId) }),
      ...(s(dto.mobileNumber) !== undefined && { mobileNumber: s(dto.mobileNumber) }),
      ...(s(dto.shiftStartTime) !== undefined && { shiftStartTime: s(dto.shiftStartTime) }),
      ...(s(dto.shiftEndTime) !== undefined && { shiftEndTime: s(dto.shiftEndTime) }),
      ...(s(dto.latestStartTime) !== undefined && { latestStartTime: s(dto.latestStartTime) }),
      ...(s(dto.latestEndShiftTime) !== undefined && { latestEndShiftTime: s(dto.latestEndShiftTime) }),
      ...(dto.shiftEndDayOffset !== undefined && { shiftEndDayOffset: dto.shiftEndDayOffset }),
      // timezone is nullable — empty string means "clear to null"; undefined means "no change"
      ...(dto.timezone !== undefined && { timezone: dto.timezone === '' ? null : dto.timezone }),
      ...(s(dto.taxIdNumber) !== undefined && { taxIdNumber: s(dto.taxIdNumber) }),
      ...(s(dto.englishSurname) !== undefined && { englishSurname: s(dto.englishSurname) }),
      ...(s(dto.homePhoneAreaCode) !== undefined && { homePhoneAreaCode: s(dto.homePhoneAreaCode) }),
      ...(s(dto.homePhoneNumber) !== undefined && { homePhoneNumber: s(dto.homePhoneNumber) }),
      ...(s(dto.favoriteCake) !== undefined && { favoriteCake: s(dto.favoriteCake) }),
      ...(s(dto.sssNumber) !== undefined && { sssNumber: s(dto.sssNumber) }),
      ...(s(dto.philHealthIdNumber) !== undefined && { philHealthIdNumber: s(dto.philHealthIdNumber) }),
      ...(s(dto.hdmfNumber) !== undefined && { hdmfNumber: s(dto.hdmfNumber) }),
      ...(s(dto.nominatedBankName) !== undefined && { nominatedBankName: s(dto.nominatedBankName) }),
      ...(s(dto.nominatedBankAccountName) !== undefined && { nominatedBankAccountName: s(dto.nominatedBankAccountName) }),
      ...(s(dto.nominatedBankAccountNumber) !== undefined && { nominatedBankAccountNumber: s(dto.nominatedBankAccountNumber) }),
      ...(dto.isDisabled !== undefined && { isDisabled: dto.isDisabled }),
      ...(dto.dateOfBirth && { dateOfBirth: new Date(dto.dateOfBirth) }),
      ...(dto.gender !== undefined && { gender: dto.gender }),
      logUpdatedBy: updatedBy,
    } as any;

    await this.prisma.staff.update({
      where: { id },
      data: updateData,
    });

    // BUG-001: propagate isActive to UserLogin record
    if (dto.isActive !== undefined && staff.userLoginId) {
      await this.prisma.userLogin.update({
        where: { id: staff.userLoginId },
        data: { isActive: dto.isActive, logUpdatedBy: updatedBy },
      });
    }

    void this.auditService.log('UPDATE', 'Staff', id, updatedBy, undefined, undefined, ipAddress);

    return this.findOne(id);
  }

  // ── Soft Delete ───────────────────────────────────────────────────────────────
  async remove(id: string, deletedBy: string, ipAddress?: string) {
    const staff = await this.findOne(id);
    const result = await this.prisma.staff.update({
      where: { id },
      data: { isDeleted: true, logUpdatedBy: deletedBy },
    });
    // Also soft-delete the associated UserLogin so the username/email become
    // available again for future imports (unique index checks filter by isDeleted=false).
    if (staff.userLoginId) {
      await this.prisma.userLogin.update({
        where: { id: staff.userLoginId },
        data: { isDeleted: true, logUpdatedBy: deletedBy },
      });
    }
    void this.auditService.log('DELETE', 'Staff', id, deletedBy, undefined, undefined, ipAddress);
    return result;
  }

  // ── Reset Password ────────────────────────────────────────────────────────────
  async resetPassword(id: string, dto: ResetPasswordDto) {
    const staff = await this.findOne(id);
    if (!staff.userLoginId) throw new BadRequestException('No user login associated');

    let password = dto.newPassword;
    if (!password) {
      password = this.generateRandomPassword();
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await this.prisma.userLogin.update({
      where: { id: staff.userLoginId },
      data: { passwordHash, isFirstLogin: true },
    });

    // Return the generated password only when admin didn't supply one (generate-mode).
    // In direct-mode (newPassword provided) there's nothing to echo back.
    // Do NOT include `success` here — ResponseInterceptor detects `success: boolean` and
    // skips wrapping, breaking the frontend's wrap() which expects res.data.data.
    return dto.newPassword ? {} : { temporaryPassword: password };
  }

  // ── Update Roles ─────────────────────────────────────────────────────────────
  async updateRoles(id: string, dto: UpdateRolesDto, updatedBy: string) {
    await this.findOne(id);

    // findMany is safe here — middleware adds isDeleted:false automatically, giving us only active rows
    const active = await this.prisma.staffRole.findMany({ where: { staffId: id } });
    const toRemove = active.filter((sr) => !dto.roleIds.includes(sr.roleId));

    await this.prisma.$transaction([
      ...toRemove.map((sr) =>
        this.prisma.staffRole.update({
          where: { id: sr.id },
          data: { isDeleted: true, logUpdatedBy: updatedBy },
        }),
      ),
      // upsert bypasses the soft-delete middleware — restores a soft-deleted row OR creates a new one,
      // avoiding the unique(staffId,roleId) violation that a plain create() would cause on re-add
      ...dto.roleIds.map((roleId) =>
        this.prisma.staffRole.upsert({
          where: { staffId_roleId: { staffId: id, roleId } },
          update: { isDeleted: false, logUpdatedBy: updatedBy },
          create: {
            id: uuidv7(),
            staffId: id,
            roleId,
            logCreatedBy: updatedBy,
            logUpdatedBy: updatedBy,
          },
        }),
      ),
    ]);

    return this.findOne(id);
  }

  // ── Import Preview ────────────────────────────────────────────────────────────
  async importPreview(fileBuffer: Buffer) {
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: '' });

    const valid: Record<string, string>[] = [];
    const invalid: { row: Record<string, string>; errors: string[] }[] = [];

    for (const row of rows) {
      const errors: string[] = [];

      if (!row['firstName']) errors.push('firstName is required');
      if (!row['surname']) errors.push('surname is required');
      if (!row['username']) errors.push('username is required');
      if (!row['email']) errors.push('email is required');
      if (!row['companyId']) errors.push('companyId is required');
      if (!row['password']) errors.push('password is required');

      if (row['email'] && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row['email'])) {
        errors.push('email format invalid');
      }

      if (row['username']) {
        const existingUser = await this.prisma.userLogin.findFirst({
          where: { username: row['username'], isDeleted: false },
        });
        if (existingUser) errors.push(`username "${row['username']}" already exists`);
      }

      if (row['email'] && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row['email'])) {
        const existingEmail = await this.prisma.userLogin.findFirst({
          where: { email: row['email'], isDeleted: false },
        });
        if (existingEmail) errors.push(`email "${row['email']}" already exists`);
      }

      if (errors.length === 0) {
        valid.push(row);
      } else {
        invalid.push({ row, errors });
      }
    }

    return { valid, invalid };
  }

  // ── Import Confirm ────────────────────────────────────────────────────────────
  async importConfirm(rows: Record<string, string>[], createdBy: string) {
    if (!Array.isArray(rows) || rows.length === 0) return { created: 0, errors: [] };
    let created = 0;

    for (const row of rows) {
      try {
        await this.create(
          {
            email: row['email'],
            firstName: row['firstName'],
            middleName: row['middleName'],
            surname: row['surname'],
            dateOfBirth: row['dateOfBirth'] || '',
            companyId: row['companyId'],
            employeeId: row['employeeId'],
            departmentId: row['departmentId'],
            officeId: row['officeId'],
            positionId: row['positionId'],
            teamId: row['teamId'],
            mobileNumber: row['mobileNumber'],
          },
          createdBy,
        );
        created++;
      } catch {
        // skip individual failures silently during bulk import
      }
    }

    return { created };
  }

  // ── List Roles ────────────────────────────────────────────────────────────────
  async findAllRoles() {
    return this.prisma.role.findMany({
      where: { isDeleted: false },
      orderBy: { name: 'asc' },
    });
  }

  // ── Distinct Timezones ────────────────────────────────────────────────────────
  async findDistinctTimezones(): Promise<string[]> {
    const rows = await this.prisma.staff.findMany({
      where: { isDeleted: false, timezone: { not: null } },
      select: { timezone: true },
      distinct: ['timezone'],
      orderBy: { timezone: 'asc' },
    });
    return rows.map((r) => r.timezone as string);
  }

  // ── Generate Employee ID ──────────────────────────────────────────────────────
  private async generateEmployeeId(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `EMP-${year}-`;

    // Must bypass the soft-delete middleware here: the DB has a @unique constraint on
    // EmployeeId regardless of IsDeleted, so soft-deleted rows still occupy their ID.
    // $queryRaw is intentional — this is a read-only uniqueness check, not a business query.
    const countRows = await this.prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) AS count FROM "Staff" WHERE "EmployeeId" LIKE ${prefix + '%'}
    `;
    let seq = Number(countRows[0].count) + 1;

    for (let attempt = 0; attempt < 200; attempt++) {
      const candidate = `${prefix}${String(seq).padStart(4, '0')}`;
      const conflict = await this.prisma.$queryRaw<{ id: string }[]>`
        SELECT id FROM "Staff" WHERE "EmployeeId" = ${candidate} LIMIT 1
      `;
      if (conflict.length === 0) return candidate;
      seq += 1;
    }

    // Fallback: timestamp suffix guarantees uniqueness
    return `${prefix}${Date.now()}`;
  }

  private generateRandomPassword(): string {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#';
    return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  }

  // ── Admin 2FA Management ──────────────────────────────────────────────────────

  async getEmployee2FAStatus(staffId: string) {
    const [staff, systemSetting] = await Promise.all([
      this.prisma.staff.findFirst({
        where: { id: staffId, isDeleted: false },
        select: {
          is2FAEnabled: true,
          is2FANeedEnable: true,
          staffAuthenticators: {
            where: { isDeleted: false },
            select: { code: true, name: true, isEnable: true },
          },
        },
      }),
      this.prisma.systemSetting.findUnique({ where: { key: 'twofa.force_to_enable' } }),
    ]);
    if (!staff) return { enabled: false, method: null, required: false, systemForced: false };

    const activeMethods = staff.staffAuthenticators.filter((a) => a.isEnable);
    const primary = activeMethods.find((a) => a.code === 'Google') ?? activeMethods[0] ?? null;

    return {
      enabled: staff.is2FAEnabled,
      method: primary?.code ?? null,
      required: staff.is2FANeedEnable,
      systemForced: systemSetting?.value === 'true',
    };
  }

  async adminRevoke2FA(staffId: string, actorId: string) {
    const staff = await this.prisma.staff.findFirst({
      where: { id: staffId, isDeleted: false },
      select: { id: true, is2FAEnabled: true },
    });
    if (!staff) throw new NotFoundException('Staff not found');
    if (!staff.is2FAEnabled) throw new BadRequestException('2FA is not enabled for this user');

    const now = new Date();
    await this.prisma.$transaction([
      // Soft-delete all authenticator records
      this.prisma.staffAuthenticator.updateMany({
        where: { staffId: staff.id, isDeleted: false },
        data: { isDeleted: true, logUpdatedBy: actorId, logUpdatedAt: now },
      }),
      // Reset 2FA flag on Staff
      this.prisma.staff.update({
        where: { id: staff.id },
        data: { is2FAEnabled: false, logUpdatedBy: actorId, logUpdatedAt: now },
      }),
    ]);

    void this.auditService.log('ADMIN_REVOKE_2FA', 'Staff', staffId, actorId);

    return { success: true };
  }

  async getSessionStatus(staffId: string) {
    const staff = await this.prisma.staff.findFirst({
      where: { id: staffId, isDeleted: false },
      select: { id: true, userLogin: { select: { allSessionsRevokedAt: true } } },
    });
    if (!staff) throw new NotFoundException('Staff not found');

    const blockedUntil = staff.userLogin?.allSessionsRevokedAt ?? null;
    const now = new Date();
    return {
      isBlocked: !!blockedUntil && blockedUntil > now,
      blockedUntil: blockedUntil?.toISOString() ?? null,
    };
  }

  async clearSessionBlock(staffId: string, actorId: string) {
    const staff = await this.prisma.staff.findFirst({
      where: { id: staffId, isDeleted: false },
      select: { id: true, userLoginId: true },
    });
    if (!staff) throw new NotFoundException('Staff not found');
    if (!staff.userLoginId) throw new BadRequestException('No user account linked to this employee');

    await this.prisma.userLogin.update({
      where: { id: staff.userLoginId },
      data: { allSessionsRevokedAt: null, logUpdatedBy: actorId },
    });

    void this.auditService.log('ADMIN_CLEAR_SESSION_BLOCK', 'Staff', staffId, actorId);
    return { success: true };
  }

  async adminSet2FARequired(staffId: string, required: boolean, actorId: string) {
    const staff = await this.prisma.staff.findFirst({
      where: { id: staffId, isDeleted: false },
      select: { id: true },
    });
    if (!staff) throw new NotFoundException('Staff not found');

    await this.prisma.staff.update({
      where: { id: staff.id },
      data: { is2FANeedEnable: required, logUpdatedBy: actorId },
    });

    void this.auditService.log(
      required ? 'ADMIN_REQUIRE_2FA' : 'ADMIN_UNREQUIRE_2FA',
      'Staff',
      staffId,
      actorId,
    );

    return { success: true };
  }
}
