import { Module } from '@nestjs/common';
import { BrandingController } from './branding.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [BrandingController],
})
export class BrandingModule {}
