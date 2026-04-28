import { Module } from '@nestjs/common';
import { LogPrismaModule } from '../prisma/log-prisma.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ErrorLogService } from './error-log.service';
import { ErrorLogController } from './error-log.controller';

@Module({
  imports: [LogPrismaModule, PrismaModule],
  providers: [ErrorLogService],
  controllers: [ErrorLogController],
  exports: [ErrorLogService],
})
export class ErrorLogModule {}
