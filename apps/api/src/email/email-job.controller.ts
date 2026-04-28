import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@shared/enums/user-role.enum';
import { EmailJobService } from './email-job.service';

@ApiTags('email-job')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.HR_ADMIN, UserRole.SUPER_ADMIN)
@Controller('email-job')
export class EmailJobController {
  constructor(private readonly emailJobService: EmailJobService) {}

  @Get('status')
  @ApiOperation({ summary: 'Get email job status + queue stats' })
  async getStatus() {
    const [status, stats] = await Promise.all([
      this.emailJobService.getStatus(),
      this.emailJobService.getQueueStats(),
    ]);
    return { success: true, data: { ...status, stats } };
  }

  @Post('trigger')
  @ApiOperation({ summary: 'Manually trigger email job processing' })
  trigger() {
    this.emailJobService.trigger();
    return { success: true, message: 'Email job triggered' };
  }

  @Post('toggle')
  @ApiOperation({ summary: 'Enable or disable the email cron job' })
  toggle(@Body() body: { enabled: boolean }) {
    this.emailJobService.setEnabled(body.enabled);
    return { success: true, data: { enabled: body.enabled } };
  }
}
