import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@shared/enums/user-role.enum';
import { IntegrityService } from './integrity.service';

@ApiTags('system/integrity-checks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
@Controller('system/integrity-checks')
export class IntegrityController {
  constructor(private readonly integrityService: IntegrityService) {}

  @Get()
  @ApiOperation({ summary: 'Run all integrity checks — returns counts per check' })
  runAll() {
    return this.integrityService.runAll();
  }

  @Get(':checkId/details')
  @ApiOperation({ summary: 'Get detail rows for a specific integrity check (max 100)' })
  getDetails(@Param('checkId') checkId: string) {
    return this.integrityService.getDetails(checkId);
  }
}
