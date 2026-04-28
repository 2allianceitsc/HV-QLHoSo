import { Module } from '@nestjs/common';
import { LoginOtpController } from './login-otp.controller';
import { LoginOtpService } from './login-otp.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [LoginOtpController],
  providers: [LoginOtpService],
})
export class LoginOtpModule {}
