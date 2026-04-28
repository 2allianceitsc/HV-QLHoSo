import { Module } from '@nestjs/common';
import { SystemVibeIconsController } from './vibe-icons.controller';
import { SystemVibeIconsService } from './vibe-icons.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SystemVibeIconsController],
  providers: [SystemVibeIconsService],
  exports: [SystemVibeIconsService],
})
export class SystemVibeIconsModule {}
