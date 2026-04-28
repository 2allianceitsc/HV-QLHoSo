import { Module } from '@nestjs/common';
import { TwoFAService } from './two-fa.service';

@Module({
  providers: [TwoFAService],
  exports: [TwoFAService],
})
export class TwoFAModule {}
