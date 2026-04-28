import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@shared/enums/user-role.enum';
import { LoginOtpService, ILoginOtpFilter } from './login-otp.service';

@ApiTags('system/login-otps')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
@Controller('system/login-otps')
export class LoginOtpController {
  constructor(private readonly loginOtpService: LoginOtpService) {}

  @Get()
  @ApiOperation({ summary: '[SUPER_ADMIN] List Login OTP records for 2FA debugging' })
  findAll(@Query() filter: ILoginOtpFilter) {
    return this.loginOtpService.findAll(filter);
  }
}
