import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePositionDto } from './dto/create-position.dto';
import { UpdatePositionDto } from './dto/update-position.dto';
import { PaginationParams } from '../company/company.service';
import { uuidv7 } from 'uuidv7';

@Injectable()
export class PositionService {
  constructor(private readonly prisma: PrismaService) {}

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
      this.prisma.position.findMany({
        where,
        skip,
        take: limit,
        orderBy: { logCreatedAt: 'desc' },
        include: { company: { select: { id: true, name: true } } },
      }),
      this.prisma.position.count({ where }),
    ]);

    return {
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const position = await this.prisma.position.findFirst({ where: { id } });
    if (!position) throw new NotFoundException(`Position ${id} not found`);
    return position;
  }

  async create(dto: CreatePositionDto, createdBy: string) {
    return this.prisma.position.create({
      data: {
        id: uuidv7(),
        code: dto.positionCode,
        name: dto.positionName,
        companyId: dto.companyId,
        note: dto.description,
        level: dto.level,
        colorHex: dto.colorHex,
        iconId: dto.iconId,
        orderNo: dto.orderNo ?? 0,
        logCreatedBy: createdBy,
        logUpdatedBy: createdBy,
      },
    });
  }

  async update(id: string, dto: UpdatePositionDto, updatedBy: string) {
    await this.findOne(id);
    return this.prisma.position.update({
      where: { id },
      data: {
        ...(dto.positionCode !== undefined && { code: dto.positionCode }),
        ...(dto.positionName !== undefined && { name: dto.positionName }),
        ...(dto.companyId !== undefined && { companyId: dto.companyId }),
        ...(dto.description !== undefined && { note: dto.description }),
        ...(dto.level !== undefined && { level: dto.level }),
        ...(dto.colorHex !== undefined && { colorHex: dto.colorHex }),
        ...(dto.iconId !== undefined && { iconId: dto.iconId }),
        ...(dto.orderNo !== undefined && { orderNo: dto.orderNo }),
        logUpdatedBy: updatedBy,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.position.update({
      where: { id },
      data: { isDeleted: true },
    });
  }
}
