import { Module } from '@nestjs/common';
import { EmailJobService } from './email-job.service';
import { EmailQueueController } from './email-queue.controller';
import { EmailJobController } from './email-job.controller';
import { EmailTemplateController } from './email-template.controller';
import { EmailConfigService } from './email-config.service';
import { EmailConfigController } from './email-config.controller';

@Module({
  controllers: [
    EmailQueueController,
    EmailJobController,
    EmailTemplateController,
    EmailConfigController,
  ],
  providers: [EmailJobService, EmailConfigService],
  exports: [EmailJobService],
})
export class EmailModule {}
