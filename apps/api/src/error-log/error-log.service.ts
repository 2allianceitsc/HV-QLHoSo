import { Injectable } from '@nestjs/common';
import { LogPrismaService } from '../prisma/log-prisma.service';
import { PrismaService } from '../prisma/prisma.service';
import { notifyGoogleChat } from '../common/utils/notify';
import { uuidv7 } from 'uuidv7';

export interface LogErrorParams {
  source: 'BACKEND' | 'FRONTEND';
  statusCode?: number;
  method?: string;
  url?: string;
  message: string;
  stack?: string;
  userId?: string;
  userAgent?: string;
  ipAddress?: string;
  requestBody?: string;
  pageUrl?: string;
}

@Injectable()
export class ErrorLogService {
  constructor(
    private readonly logPrisma: LogPrismaService,
    private readonly prisma: PrismaService,
  ) {}

  async findAll(filter: { page: number; limit: number; source?: string; search?: string }) {
    const { page, limit, source, search } = filter;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (source) where['source'] = source;
    if (search) {
      where['OR'] = [
        { message: { contains: search, mode: 'insensitive' } },
        { url: { contains: search, mode: 'insensitive' } },
        { userId: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.logPrisma.errorLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.logPrisma.errorLog.count({ where }),
    ]);

    return { success: true, data: { data, total, page, limit } };
  }

  async log(params: LogErrorParams): Promise<void> {
    // 1. Persist to log DB (best-effort, never throws)
    try {
      await this.logPrisma.errorLog.create({
        data: { id: uuidv7(), ...params },
      });
    } catch {
      // intentionally silent — DB failure must not mask the original error
    }

    // 2. Notify Google Chat (fire-and-forget)
    const env = process.env.RAILWAY_ENVIRONMENT ?? process.env.NODE_ENV ?? 'unknown';
    const icon = params.source === 'BACKEND' ? '🔴' : '🟡';
    const lines: string[] = [
      `${icon} *[${params.source} ${params.statusCode ?? 'ERR'}]* \`${params.method ?? ''} ${params.url ?? ''}\``,
      `*Env:* ${env}`,
    ];
    if (params.userId) lines.push(`*User:* ${params.userId}`);
    if (params.pageUrl) lines.push(`*Page:* ${params.pageUrl}`);
    if (params.userAgent) lines.push(`*UA:* ${params.userAgent.slice(0, 120)}`);
    lines.push(`*Message:* ${params.message}`);
    if (params.requestBody) lines.push(`*Body:* \`\`\`${params.requestBody.slice(0, 800)}\`\`\``);
    if (params.stack) lines.push(`\`\`\`\n${params.stack.slice(0, 600)}\n\`\`\``);

    void notifyGoogleChat(lines.join('\n'), this.prisma);
  }
}
