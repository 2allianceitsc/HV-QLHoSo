import { Module } from '@nestjs/common';
import { OfficeService } from './office.service';
import { OfficeController } from './office.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../system/audit/audit.module';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [OfficeController],
  providers: [OfficeService],
  exports: [OfficeService],
})
export class OfficeModule {}
