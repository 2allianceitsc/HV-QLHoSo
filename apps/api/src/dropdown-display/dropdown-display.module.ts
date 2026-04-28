import { Module } from '@nestjs/common';
import { DropdownDisplayController } from './dropdown-display.controller';
import { DropdownDisplayService } from './dropdown-display.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [DropdownDisplayController],
  providers: [DropdownDisplayService],
  exports: [DropdownDisplayService],
})
export class DropdownDisplayModule {}
