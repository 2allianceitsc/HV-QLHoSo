import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@shared/enums/user-role.enum';
import { AuditService, IAuditFilter } from './audit.service';

@ApiTags('system/audit-logs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.HR_ADMIN, UserRole.SUPER_ADMIN)
@Controller('system/audit-logs')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @ApiOperation({ summary: 'Get paginated audit logs' })
  findAll(@Query() filter: IAuditFilter) {
    return this.auditService.findAll(filter);
  }
}
