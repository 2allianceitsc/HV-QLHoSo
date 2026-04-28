import { Module } from '@nestjs/common';
import { VibeIconsController } from './vibe-icons.controller';
import { VibeIconsService } from './vibe-icons.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [VibeIconsController],
  providers: [VibeIconsService],
})
export class VibeIconsModule {}
