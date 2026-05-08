import { Controller, Get, Param, Query, UseGuards, NotFoundException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { HvRoleGuard } from '../common/guards/hv-role.guard';
import { HvRoles } from '../common/decorators/hv-roles.decorator';
import { PrismaService } from '../prisma/prisma.service';

@UseGuards(JwtAuthGuard, HvRoleGuard)
@HvRoles('admin')
@Controller('system/logs')
export class SystemLogsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('emails')
  async listEmailLogs(
    @Query('q') q?: string,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    const p = Math.max(1, +page || 1);
    const l = Math.min(100, Math.max(1, +limit || 20));
    const where: Record<string, unknown> = { isDeleted: false };

    if (status) where['status'] = status;
    if (type) where['type'] = type;
    if (q) {
      where['OR'] = [
        { to: { contains: q, mode: 'insensitive' } },
        { subject: { contains: q, mode: 'insensitive' } },
      ];
    }
    if (fromDate || toDate) {
      where['logCreatedAt'] = {
        ...(fromDate ? { gte: new Date(fromDate) } : {}),
        ...(toDate ? { lte: new Date(toDate) } : {}),
      };
    }

    const [items, total] = await Promise.all([
      this.prisma.emailQueue.findMany({
        where,
        orderBy: { logCreatedAt: 'desc' },
        skip: (p - 1) * l,
        take: l,
        select: {
          id: true,
          to: true,
          subject: true,
          type: true,
          status: true,
          lastError: true,
          sentAt: true,
          logCreatedAt: true,
        },
      }),
      this.prisma.emailQueue.count({ where }),
    ]);

    return { items, total, page: p, limit: l, totalPages: Math.ceil(total / l) };
  }

  @Get('emails/:id')
  async getEmailLog(@Param('id') id: string) {
    const email = await this.prisma.emailQueue.findUnique({
      where: { id },
      select: {
        id: true,
        to: true,
        subject: true,
        bodyHtml: true,
        type: true,
        status: true,
        lastError: true,
        sentAt: true,
        logCreatedAt: true,
      },
    });
    if (!email || email === null) throw new NotFoundException('Email log not found');
    return email;
  }
}
