import { Module } from '@nestjs/common';
import { EmailJobService } from './email-job.service';
import { EmailQueueController } from './email-queue.controller';
import { EmailJobController } from './email-job.controller';
import { EmailTemplateController } from './email-template.controller';
import { EmailConfigService } from './email-config.service';
import { EmailConfigController } from './email-config.controller';
import { HvEmailTemplateController } from './hv-email-template.controller';

@Module({
  controllers: [
    EmailQueueController,
    EmailJobController,
    EmailTemplateController,
    EmailConfigController,
    HvEmailTemplateController,
  ],
  providers: [EmailJobService, EmailConfigService],
  exports: [EmailJobService],
})
export class EmailModule {}
