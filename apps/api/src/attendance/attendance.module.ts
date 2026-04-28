import { Module } from '@nestjs/common';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { StatusModule } from '../status/status.module';
import { EmailModule } from '../email/email.module';
import { DebugModule } from '../common/debug/debug.module';

@Module({
  imports: [PrismaModule, NotificationsModule, StatusModule, EmailModule, DebugModule],
  controllers: [AttendanceController],
  providers: [AttendanceService],
  exports: [AttendanceService],
})
export class AttendanceModule {}
