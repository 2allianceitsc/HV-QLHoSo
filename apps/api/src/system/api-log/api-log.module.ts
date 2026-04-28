import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ApiLogService } from './api-log.service';
import { ApiLogController } from './api-log.controller';

@Module({
  imports: [PrismaModule],
  controllers: [ApiLogController],
  providers: [ApiLogService],
  exports: [ApiLogService],
})
export class ApiLogModule {}
