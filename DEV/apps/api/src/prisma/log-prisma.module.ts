import { Global, Module } from '@nestjs/common';
import { LogPrismaService } from './log-prisma.service';

@Global()
@Module({
  providers: [LogPrismaService],
  exports: [LogPrismaService],
})
export class LogPrismaModule {}
