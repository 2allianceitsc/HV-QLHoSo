import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import {
  NotificationChannelsController,
  WebhookTemplatesController,
} from './notification-channels.controller';
import { NotificationChannelsService } from './notification-channels.service';

@Module({
  imports: [PrismaModule],
  controllers: [NotificationChannelsController, WebhookTemplatesController],
  providers: [NotificationChannelsService],
  exports: [NotificationChannelsService],
})
export class NotificationChannelsModule {}
