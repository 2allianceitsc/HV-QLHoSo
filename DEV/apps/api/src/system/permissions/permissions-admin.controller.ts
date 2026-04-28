import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  Query,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@shared/enums/user-role.enum';
import {
  CurrentUser,
  CurrentUserPayload,
} from '../../common/decorators/current-user.decorator';
import {
  PermissionsAdminService,
  IMatrixChange,
} from './permissions-admin.service';

/**
 * SY18 — admin UI endpoints for the Role × Screen × Tab × Action matrix.
 *
 * Access: `SUPER_ADMIN` only, hard-coded via @Roles — these endpoints must
 * remain reachable even if the matrix is mis-configured, to avoid lock-out.
 */
@ApiTags('system/role-permissions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
@Controller('system/role-permissions')
export class PermissionsAdminController {
  constructor(private readonly admin: PermissionsAdminService) {}

  @Get('catalog')
  @ApiOperation({
    summary: 'Screen + tab + permission-action catalog for the matrix editor.',
  })
  getCatalog() {
    return this.admin.getCatalog();
  }

  @Get('roles')
  @ApiOperation({ summary: 'List roles available in the matrix editor.' })
  listRoles() {
    return this.admin.listRoles();
  }

  @Get()
  @ApiOperation({ summary: 'List permission rules for a given role.' })
  listRules(@Query('roleId') roleId: string) {
    return this.admin.listRulesForRole(roleId);
  }

  @Put('matrix')
  @ApiOperation({
    summary: 'Bulk upsert matrix cells (atomic).',
  })
  applyMatrix(
    @Body() body: { changes: IMatrixChange[] },
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.admin.applyMatrixChanges(body.changes ?? [], {
      id: user.sub,
      name: user.username,
    });
  }

  @Post('roles/:roleId/reset')
  @ApiOperation({ summary: 'Clear all rules for a role (re-seed to restore defaults).' })
  reset(
    @Param('roleId') roleId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.admin.resetRoleToDefaults(roleId, {
      id: user.sub,
      name: user.username,
    });
  }
}
