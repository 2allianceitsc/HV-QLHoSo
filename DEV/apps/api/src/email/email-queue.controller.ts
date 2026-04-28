import { Controller, Get, Patch, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@shared/enums/user-role.enum';
import { EmailJobService } from './email-job.service';

@ApiTags('email-queue')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.HR_ADMIN, UserRole.SUPER_ADMIN)
@Controller('email-queue')
export class EmailQueueController {
  constructor(private readonly emailJobService: EmailJobService) {}

  @Get()
  @ApiOperation({ summary: 'List email queue (paginated)' })
  findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('subject') subject?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.emailJobService.getQueueList(+page, +limit, status, type, subject, startDate, endDate);
  }

  @Patch(':id/retry')
  @ApiOperation({ summary: 'Retry a failed email' })
  async retry(@Param('id') id: string) {
    await this.emailJobService.retryEmail(id);
    return { success: true, message: 'Email queued for retry' };
  }
}
