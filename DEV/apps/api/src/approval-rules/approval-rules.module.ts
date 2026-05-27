import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ApprovalRulesService } from './approval-rules.service';
import { ApprovalRuleDetailsController, ApprovalRulesController } from './approval-rules.controller';

@Module({
  imports: [PrismaModule],
  controllers: [ApprovalRulesController, ApprovalRuleDetailsController],
  providers: [ApprovalRulesService],
  exports: [ApprovalRulesService],
})
export class ApprovalRulesModule {}
