import { Module } from '@nestjs/common';
import { DepartmentService } from './department.service';
import { DepartmentController } from './department.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../system/audit/audit.module';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [DepartmentController],
  providers: [DepartmentService],
  exports: [DepartmentService],
})
export class DepartmentModule {}
