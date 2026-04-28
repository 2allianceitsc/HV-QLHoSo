import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { DebugService } from './debug.service';
import { DebugController, DebugLogsController, DebugTestController } from './debug.controller';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [DebugService],
  controllers: [DebugController, DebugLogsController, DebugTestController],
  exports: [DebugService],
})
export class DebugModule {}
