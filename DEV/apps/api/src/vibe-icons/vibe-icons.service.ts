import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class VibeIconsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Returns icons from the active VIBEIconSet. Falls back to all non-disabled icons if no active set. */
  async findAll() {
    const activeSet = await this.prisma.vIBEIconSet.findFirst({
      where: { isActive: true, isDeleted: false },
      select: { id: true },
    });

    if (activeSet) {
      return this.prisma.vIBEIcons.findMany({
        where: { vibeIconSetId: activeSet.id, isDeleted: false, isDisabled: false },
        orderBy: { orderNo: 'asc' },
        select: {
          id: true,
          name: true,
          hoverText: true,
          iconText: true,
          category: true,
          iconUrl: true,
          emojiCode: true,
          description: true,
          orderNo: true,
        },
      });
    }

    // Fallback: no active set — return all active icons (backward-compat)
    return this.prisma.vIBEIcons.findMany({
      where: { isDeleted: false, isDisabled: false },
      orderBy: { orderNo: 'asc' },
      select: {
        id: true,
        name: true,
        hoverText: true,
        iconText: true,
        category: true,
        iconUrl: true,
        emojiCode: true,
        description: true,
        orderNo: true,
      },
    });
  }
}
