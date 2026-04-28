import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEmailConfigDto, UpdateEmailConfigDto } from './dto/email-config.dto';
import { uuidv7 } from 'uuidv7';

@Injectable()
export class EmailConfigService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.emailProviderConfig.findMany({
      where: { isDeleted: false },
      orderBy: [{ isActive: 'desc' }, { orderNo: 'asc' }, { logCreatedAt: 'asc' }],
      select: {
        id: true,
        name: true,
        provider: true,
        fromName: true,
        fromEmail: true,
        isActive: true,
        isDisabled: true,
        note: true,
        orderNo: true,
        logCreatedAt: true,
        logUpdatedAt: true,
        // config intentionally excluded from list (contains secrets)
      },
    });
  }

  async findOne(id: string) {
    const row = await this.prisma.emailProviderConfig.findFirst({
      where: { id, isDeleted: false },
    });
    if (!row) throw new NotFoundException(`Email config ${id} not found`);
    return row;
  }

  async create(dto: CreateEmailConfigDto, createdBy: string) {
    const id = uuidv7();
    return this.prisma.emailProviderConfig.create({
      data: {
        id,
        name: dto.name,
        provider: dto.provider,
        config: dto.config,
        fromName: dto.fromName,
        fromEmail: dto.fromEmail,
        note: dto.note ?? null,
        logCreatedBy: createdBy,
        logUpdatedBy: createdBy,
      },
    });
  }

  async update(id: string, dto: UpdateEmailConfigDto, updatedBy: string) {
    await this.findOne(id);
    return this.prisma.emailProviderConfig.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.provider !== undefined && { provider: dto.provider }),
        ...(dto.config !== undefined && { config: dto.config }),
        ...(dto.fromName !== undefined && { fromName: dto.fromName }),
        ...(dto.fromEmail !== undefined && { fromEmail: dto.fromEmail }),
        ...(dto.note !== undefined && { note: dto.note }),
        ...(dto.isDisabled !== undefined && { isDisabled: dto.isDisabled }),
        logUpdatedBy: updatedBy,
      },
    });
  }

  async setActive(id: string, updatedBy: string) {
    await this.findOne(id);
    // Deactivate all, then activate target — in a transaction
    await this.prisma.$transaction([
      this.prisma.emailProviderConfig.updateMany({
        where: { isDeleted: false, isActive: true },
        data: { isActive: false, logUpdatedBy: updatedBy },
      }),
      this.prisma.emailProviderConfig.update({
        where: { id },
        data: { isActive: true, logUpdatedBy: updatedBy },
      }),
    ]);
    return { success: true, message: 'Active provider updated' };
  }

  async deactivate(id: string, updatedBy: string) {
    await this.findOne(id);
    await this.prisma.emailProviderConfig.update({
      where: { id },
      data: { isActive: false, logUpdatedBy: updatedBy },
    });
    return { success: true, message: 'Provider deactivated — no emails will be sent until another provider is set active' };
  }

  async remove(id: string, updatedBy: string) {
    const row = await this.findOne(id);
    if (row.isActive) {
      throw new ConflictException('Cannot delete the active email provider. Set another provider as active first.');
    }
    await this.prisma.emailProviderConfig.update({
      where: { id },
      data: { isDeleted: true, logUpdatedBy: updatedBy },
    });
    return { success: true };
  }

  async getActive() {
    return this.prisma.emailProviderConfig.findFirst({
      where: { isActive: true, isDeleted: false, isDisabled: false },
    });
  }
}
