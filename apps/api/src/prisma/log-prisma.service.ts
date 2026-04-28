import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Dedicated Prisma client for log writes (ErrorLog table).
 * Uses LOG_DATABASE_URL when set, falls back to DATABASE_URL.
 * Keeping this separate means log writes are isolated from the main connection —
 * if the primary DB is under load, error logging still works independently.
 * No soft-delete middleware: log tables never use isDeleted.
 */
@Injectable()
export class LogPrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(LogPrismaService.name);

  constructor() {
    // Cap to 1 — log writes are low-volume; limit shared connections to main DB.
    const rawUrl = process.env.LOG_DATABASE_URL ?? process.env.DATABASE_URL ?? '';
    const url = `${rawUrl.split('?')[0]}?connection_limit=1&pool_timeout=10`;
    super({
      datasources: {
        db: { url },
      },
      log: [
        { emit: 'stdout', level: 'warn' },
        { emit: 'stdout', level: 'error' },
      ],
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log(
      process.env.LOG_DATABASE_URL
        ? 'Log database connected (LOG_DATABASE_URL)'
        : 'Log database connected (shared with DATABASE_URL)',
    );
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
