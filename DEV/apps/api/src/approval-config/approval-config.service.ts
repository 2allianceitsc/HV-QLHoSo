import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { uuidv7 } from 'uuidv7';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class UpdateApprovalConfigDto {
  @IsUUID() @IsNotEmpty() reviewerId!: string;
  @IsUUID() @IsNotEmpty() approverId!: string;
}

@Injectable()
export class ApprovalConfigService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.approvalConfig.findMany({
      include: {
        department: { select: { id: true, name: true } },
        reviewer: { select: { id: true, firstName: true, middleName: true, surname: true } },
        approver: { select: { id: true, firstName: true, middleName: true, surname: true } },
      },
      orderBy: { department: { name: 'asc' } },
    });
  }

  async upsert(departmentId: string, dto: UpdateApprovalConfigDto, updatedBy: string) {
    const existing = await this.prisma.approvalConfig.findUnique({ where: { departmentId } });
    if (existing) {
      return this.prisma.approvalConfig.update({
        where: { departmentId },
        data: { reviewerId: dto.reviewerId, approverId: dto.approverId, logUpdatedBy: updatedBy },
      });
    }

    const dept = await this.prisma.department.findFirst({ where: { id: departmentId, isDeleted: false } });
    if (!dept) throw new NotFoundException('Department not found');

    return this.prisma.approvalConfig.create({
      data: { id: uuidv7(), departmentId, reviewerId: dto.reviewerId, approverId: dto.approverId, logUpdatedBy: updatedBy },
    });
  }

  listReviewers() {
    return this.prisma.staff.findMany({
      where: { isDeleted: false, hvRoles: { hasSome: ['reviewer', 'admin'] } },
      select: { id: true, firstName: true, middleName: true, surname: true, departmentId: true },
      orderBy: { firstName: 'asc' },
    });
  }

  listApprovers() {
    return this.prisma.staff.findMany({
      where: { isDeleted: false, hvRoles: { hasSome: ['approver', 'admin'] } },
      select: { id: true, firstName: true, middleName: true, surname: true, departmentId: true },
      orderBy: { firstName: 'asc' },
    });
  }
}
