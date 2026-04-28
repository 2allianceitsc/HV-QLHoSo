import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { uuidv7 } from 'uuidv7';

export interface IAuditFilter {
  entity?: string;
  actorId?: string;
  action?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(
    action: string,
    entity: string,
    entityId: string,
    actorId?: string,
    actorName?: string,
    changes?: object,
    ipAddress?: string,
  ) {
    await this.prisma.auditLog.create({
      data: {
        id: uuidv7(),
        action,
        entity,
        entityId,
        actorId,
        actorName,
        changes: changes ? JSON.stringify(changes) : undefined,
        ipAddress,
      },
    });
  }

  async findAll(filter: IAuditFilter) {
    const page = Number(filter.page) || 1;
    const limit = Number(filter.limit) || 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (filter.entity) where['entity'] = filter.entity;
    if (filter.actorId) where['actorId'] = filter.actorId;
    if (filter.action) where['action'] = filter.action;

    if (filter.startDate || filter.endDate) {
      where['createdAt'] = {
        ...(filter.startDate ? { gte: new Date(filter.startDate) } : {}),
        ...(filter.endDate ? { lte: new Date(filter.endDate) } : {}),
      };
    }

    const [rows, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    // Resolve missing actorName from UserLogin for rows that only have actorId
    const missingIds = [
      ...new Set(rows.filter((r) => !r.actorName && r.actorId).map((r) => r.actorId as string)),
    ];
    const usernameMap = new Map<string, string>();
    if (missingIds.length) {
      const users = await this.prisma.userLogin.findMany({
        where: { id: { in: missingIds } },
        select: { id: true, username: true },
      });
      for (const u of users) usernameMap.set(u.id, u.username);
    }

    const data = rows.map((r) =>
      !r.actorName && r.actorId && usernameMap.has(r.actorId)
        ? { ...r, actorName: usernameMap.get(r.actorId) }
        : r,
    );

    return {
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }
}
