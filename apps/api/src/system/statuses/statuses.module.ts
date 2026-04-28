import { Module } from '@nestjs/common';
import { SystemStatusesController } from './statuses.controller';
import { SystemStatusesService } from './statuses.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SystemStatusesController],
  providers: [SystemStatusesService],
})
export class SystemStatusesModule {}
