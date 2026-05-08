import { Module } from '@nestjs/common';
import { HvAdminService } from './hv-admin.service';
import { HvAdminController } from './hv-admin.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [HvAdminController],
  providers: [HvAdminService],
})
export class HvAdminModule {}
