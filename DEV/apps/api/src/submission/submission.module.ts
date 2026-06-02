import { Module } from '@nestjs/common';
import { SubmissionService } from './submission.service';
import { SubmissionController } from './submission.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { StorageModule } from '../storage/storage.module';
import { ApprovalRulesModule } from '../approval-rules/approval-rules.module';
import { NotificationChannelsModule } from '../notification-channels/notification-channels.module';

@Module({
  imports: [PrismaModule, StorageModule, ApprovalRulesModule, NotificationChannelsModule],
  controllers: [SubmissionController],
  providers: [SubmissionService],
  exports: [SubmissionService],
})
export class SubmissionModule {}
