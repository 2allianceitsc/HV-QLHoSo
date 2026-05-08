import { Module } from '@nestjs/common';
import { ApprovalConfigService } from './approval-config.service';
import { ApprovalConfigController } from './approval-config.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ApprovalConfigController],
  providers: [ApprovalConfigService],
})
export class ApprovalConfigModule {}
