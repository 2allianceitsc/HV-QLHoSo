import { Module } from '@nestjs/common';
import { HvReportsService } from './hv-reports.service';
import { HvReportsController } from './hv-reports.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [PrismaModule, StorageModule],
  controllers: [HvReportsController],
  providers: [HvReportsService],
})
export class HvReportsModule {}
