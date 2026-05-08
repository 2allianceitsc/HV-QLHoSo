import { Module } from '@nestjs/common';
import { CostCodeService } from './cost-code.service';
import { CostCodeController } from './cost-code.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CostCodeController],
  providers: [CostCodeService],
  exports: [CostCodeService],
})
export class CostCodeModule {}
