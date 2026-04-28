import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRoleDto, UpdateRoleDto } from './dto/role.dto';
import { uuidv7 } from 'uuidv7';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const roles = await this.prisma.role.findMany({
      where: { isDeleted: false },
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { staffRoles: { where: { isDeleted: false } } },
        },
      },
    });
    return roles.map((r) => ({
      ...r,
      staffCount: r._count.staffRoles,
    }));
  }

  async findOne(id: string) {
    const role = await this.prisma.role.findFirst({
      where: { id, isDeleted: false },
      include: {
        _count: {
          select: { staffRoles: { where: { isDeleted: false } } },
        },
      },
    });
    if (!role) throw new NotFoundException(`Role ${id} not found`);
    return { ...role, staffCount: role._count.staffRoles };
  }

  async create(dto: CreateRoleDto, createdBy: string) {
    const existing = await this.prisma.role.findFirst({
      where: { name: dto.name, isDeleted: false },
    });
    if (existing) throw new ConflictException(`Role name "${dto.name}" already exists`);

    return this.prisma.role.create({
      data: {
        id: uuidv7(),
        name: dto.name,
        displayName: dto.displayName,
        description: dto.description,
        colorHex: dto.colorHex,
        iconId: dto.iconId,
        logCreatedBy: createdBy,
        logUpdatedBy: createdBy,
      },
    });
  }

  async update(id: string, dto: UpdateRoleDto, updatedBy: string) {
    await this.findOne(id);

    if (dto.name) {
      const conflict = await this.prisma.role.findFirst({
        where: { name: dto.name, isDeleted: false, id: { not: id } },
      });
      if (conflict) throw new ConflictException(`Role name "${dto.name}" already exists`);
    }

    return this.prisma.role.update({
      where: { id },
      data: { ...dto, logUpdatedBy: updatedBy },
    });
  }

  async remove(id: string) {
    const role = await this.findOne(id);

    if (role.staffCount > 0) {
      throw new BadRequestException(
        `Cannot delete role with ${role.staffCount} staff assigned`,
      );
    }

    return this.prisma.role.update({
      where: { id },
      data: { isDeleted: true },
    });
  }
}
