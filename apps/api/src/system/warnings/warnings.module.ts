import { Module } from '@nestjs/common';
import { SystemWarningsController } from './warnings.controller';
import { SystemWarningsService } from './warnings.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { SystemVibeIconsModule } from '../vibe-icons/vibe-icons.module';

@Module({
  imports: [PrismaModule, SystemVibeIconsModule],
  controllers: [SystemWarningsController],
  providers: [SystemWarningsService],
  exports: [SystemWarningsService],
})
export class SystemWarningsModule {}
