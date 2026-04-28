import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@shared/enums/user-role.enum';
import { ApiLogService, IApiLogFilter } from './api-log.service';

@ApiTags('system/api-logs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.HR_ADMIN, UserRole.SUPER_ADMIN)
@Controller('system/api-logs')
export class ApiLogController {
  constructor(private readonly apiLogService: ApiLogService) {}

  @Get()
  @ApiOperation({ summary: 'Get paginated API request logs' })
  findAll(@Query() filter: IApiLogFilter) {
    return this.apiLogService.findAll(filter);
  }
}
