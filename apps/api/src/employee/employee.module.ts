import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { EmployeeService } from './employee.service';
import { EmployeeController } from './employee.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuditModule } from '../system/audit/audit.module';

@Module({
  imports: [
    PrismaModule,
    MulterModule.register({ limits: { fileSize: 10 * 1024 * 1024 } }), // 10MB
    NotificationsModule,
    AuditModule,
  ],
  controllers: [EmployeeController],
  providers: [EmployeeService],
  exports: [EmployeeService],
})
export class EmployeeModule {}
