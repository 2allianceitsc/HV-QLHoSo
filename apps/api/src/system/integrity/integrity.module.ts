import { Module } from '@nestjs/common';
import { IntegrityController } from './integrity.controller';
import { IntegrityService } from './integrity.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [IntegrityController],
  providers: [IntegrityService],
})
export class IntegrityModule {}
