import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { uuidv7 } from 'uuidv7';
import { PrismaService } from '../prisma/prisma.service';
import {
  DROPDOWN_ENTITY_TYPES,
  DROPDOWN_FIELD_OPTIONS,
  MAX_SECONDARY_FIELDS,
  type DropdownEntityType,
  type IDropdownDisplayConfig,
} from '@shared/constants/dropdown-display';
import type { DropdownDisplayConfigItemDto } from './dto/update-dropdown-display.dto';

@Injectable()
export class DropdownDisplayService {
  constructor(private readonly prisma: PrismaService) {}

  private async getCompanyIdForUser(staffId: string | undefined): Promise<string> {
    if (!staffId) {
      throw new BadRequestException('Staff record required to resolve company');
    }
    const staff = await this.prisma.staff.findUnique({
      where: { id: staffId },
      select: { companyId: true },
    });
    if (!staff) throw new NotFoundException(`Staff ${staffId} not found`);
    return staff.companyId;
  }

  async findAllForUser(staffId: string | undefined): Promise<IDropdownDisplayConfig[]> {
    const companyId = await this.getCompanyIdForUser(staffId);
    const rows = await this.prisma.dropdownDisplayConfig.findMany({
      where: { companyId, isDeleted: false },
      select: { entityType: true, primaryField: true, secondaryFields: true },
    });
    return rows.map((r) => ({
      entityType: r.entityType as DropdownEntityType,
      primaryField: r.primaryField,
      secondaryFields: r.secondaryFields ?? [],
    }));
  }

  async upsertMany(
    configs: DropdownDisplayConfigItemDto[],
    staffId: string | undefined,
    userId: string,
  ): Promise<IDropdownDisplayConfig[]> {
    const companyId = await this.getCompanyIdForUser(staffId);

    for (const cfg of configs) this.validateConfig(cfg);

    await this.prisma.$transaction(
      configs.map((cfg) =>
        this.prisma.dropdownDisplayConfig.upsert({
          where: {
            companyId_entityType: { companyId, entityType: cfg.entityType },
          },
          create: {
            id: uuidv7(),
            companyId,
            entityType: cfg.entityType,
            primaryField: cfg.primaryField,
            secondaryFields: cfg.secondaryFields,
            logCreatedBy: userId,
            logUpdatedBy: userId,
          },
          update: {
            primaryField: cfg.primaryField,
            secondaryFields: cfg.secondaryFields,
            logUpdatedBy: userId,
          },
        }),
      ),
    );

    return this.findAllForUser(staffId);
  }

  private validateConfig(cfg: DropdownDisplayConfigItemDto): void {
    if (!DROPDOWN_ENTITY_TYPES.includes(cfg.entityType)) {
      throw new BadRequestException(`Unknown entityType: ${cfg.entityType}`);
    }

    const allowed = DROPDOWN_FIELD_OPTIONS[cfg.entityType];

    if (!allowed.includes(cfg.primaryField)) {
      throw new BadRequestException(
        `Invalid primaryField "${cfg.primaryField}" for ${cfg.entityType}. ` +
          `Allowed: ${allowed.join(', ')}`,
      );
    }

    if (cfg.secondaryFields.length > MAX_SECONDARY_FIELDS) {
      throw new BadRequestException(
        `secondaryFields max length is ${MAX_SECONDARY_FIELDS}`,
      );
    }

    const seen = new Set<string>();
    for (const f of cfg.secondaryFields) {
      if (!allowed.includes(f)) {
        throw new BadRequestException(
          `Invalid secondary field "${f}" for ${cfg.entityType}`,
        );
      }
      if (f === cfg.primaryField) {
        throw new BadRequestException(
          `Secondary field "${f}" cannot equal primaryField`,
        );
      }
      if (seen.has(f)) {
        throw new BadRequestException(`Duplicate secondary field "${f}"`);
      }
      seen.add(f);
    }
  }
}
