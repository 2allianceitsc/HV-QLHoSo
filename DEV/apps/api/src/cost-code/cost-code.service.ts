import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { uuidv7 } from 'uuidv7';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateCostCodeDto {
  @IsString() @IsNotEmpty() code!: string;
  @IsString() @IsNotEmpty() name!: string;
  @IsUUID() departmentId!: string;
}

export class UpdateCostCodeDto {
  @IsString() @IsOptional() name?: string;
  @IsUUID() @IsOptional() departmentId?: string;
  @IsBoolean() @IsOptional() isActive?: boolean;
}

@Injectable()
export class CostCodeService {
  constructor(private readonly prisma: PrismaService) {}

  list(departmentId?: string) {
    return this.prisma.costCode.findMany({
      where: { isDeleted: false, ...(departmentId ? { departmentId } : {}) },
      include: { department: { select: { id: true, name: true } } },
      orderBy: { code: 'asc' },
    });
  }

  async create(dto: CreateCostCodeDto, createdBy: string) {
    return this.prisma.costCode.create({
      data: { id: uuidv7(), code: dto.code, name: dto.name, departmentId: dto.departmentId, logCreatedBy: createdBy },
    });
  }

  async update(id: string, dto: UpdateCostCodeDto, updatedBy: string) {
    await this.getOrThrow(id);
    return this.prisma.costCode.update({
      where: { id },
      data: { ...dto, logUpdatedBy: updatedBy },
    });
  }

  async remove(id: string, updatedBy: string) {
    await this.getOrThrow(id);
    return this.prisma.costCode.update({ where: { id }, data: { isDeleted: true, logUpdatedBy: updatedBy } });
  }

  private async getOrThrow(id: string) {
    const cc = await this.prisma.costCode.findUnique({ where: { id } });
    if (!cc || cc.isDeleted) throw new NotFoundException('Cost code not found');
    return cc;
  }
}
