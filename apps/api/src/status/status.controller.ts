import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { StatusService } from './status.service';

@ApiTags('statuses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('statuses')
export class StatusController {
  constructor(private readonly statusService: StatusService) {}

  @Get()
  @ApiOperation({ summary: 'Get statuses for current user (UNION of all scopes)' })
  async getStatuses(@CurrentUser() user: CurrentUserPayload) {
    const staffId = user?.staffId ?? '';
    return this.statusService.getStatusesForUser(staffId);
  }
}
