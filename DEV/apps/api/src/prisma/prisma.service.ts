import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { notifyGoogleChat } from '../common/utils/notify';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    // Cap pool to 3 — Railway Postgres has low max_connections; default (cpu*2+1)
    // is fine locally but causes "too many clients" under container restarts.
    const baseUrl = (process.env.DATABASE_URL ?? '').split('?')[0];
    const url = `${baseUrl}?connection_limit=3&pool_timeout=10`;
    super({
      datasources: {
        db: { url },
      },
      log:
        process.env.NODE_ENV === 'production'
          ? [
              { emit: 'stdout', level: 'warn' },
              { emit: 'stdout', level: 'error' },
            ]
          : [
              { emit: 'event', level: 'query' },
              { emit: 'stdout', level: 'info' },
              { emit: 'stdout', level: 'warn' },
              { emit: 'stdout', level: 'error' },
            ],
    });

    // Soft-delete middleware
    // Models without isDeleted field are excluded from automatic filtering
    const MODELS_WITHOUT_SOFT_DELETE = new Set([
      'SystemSetting',
      'AuditLog',
      'ErrorLog',
      'ApiRequestLog',
      'PasswordResetOtp',
      'RefreshTokenBlacklist',
      'LoginOtp',
      'Auth2FASecret',
      'Permission',        // action catalog — uses isDisabled, not isDeleted
      // HV models — no isDeleted field in schema
      'ApprovalConfig',
      'ExpenseLine',
      'ExistingInventory',
      'Attachment',
      'SubmissionLog',
      'SubmissionStatus',
      'NotificationChannel',
      'WebhookMessageTemplate',
    ]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.$use(async (params: any, next: (params: any) => Promise<unknown>) => {
      if (MODELS_WITHOUT_SOFT_DELETE.has(params.model)) {
        return next(params);
      }

      // Auto-filter isDeleted = false on read operations
      if (params.action === 'findFirst' || params.action === 'findUnique') {
        params.action = 'findFirst';
        params.args = params.args ?? {};
        params.args['where'] = {
          ...(params.args['where'] ?? {}),
          isDeleted: false,
        };
      }

      if (params.action === 'findMany') {
        params.args = params.args ?? {};
        params.args['where'] = {
          ...(params.args['where'] ?? {}),
          isDeleted: false,
        };
      }

      if (params.action === 'count') {
        params.args = params.args ?? {};
        params.args['where'] = {
          ...(params.args['where'] ?? {}),
          isDeleted: false,
        };
      }

      // Convert delete to soft delete
      if (params.action === 'delete') {
        params.action = 'update';
        params.args['data'] = { isDeleted: true };
      }

      if (params.action === 'deleteMany') {
        params.action = 'updateMany';
        params.args = params.args ?? {};
        params.args['data'] = {
          ...(params.args['data'] ?? {}),
          isDeleted: true,
        };
      }

      return next(params);
    });
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.$connect();
      this.logger.log('Database connected');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error('Database connection failed', message);
      await notifyGoogleChat(
        `🚨 *HV-QTHHS API — Database connection FAILED* (${process.env.RAILWAY_ENVIRONMENT ?? 'unknown env'})\n\`\`\`\n${message}\n\`\`\``,
      );
      throw err;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    this.logger.log('Database disconnected');
  }
}
