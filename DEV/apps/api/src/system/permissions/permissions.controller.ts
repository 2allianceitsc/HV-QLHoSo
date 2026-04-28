import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import {
  CurrentUser,
  CurrentUserPayload,
} from '../../common/decorators/current-user.decorator';
import { PermissionsService, UserPermissionPayload } from './permissions.service';

/**
 * Phase 2 — expose the resolved permission set for the current user.
 * The FE fetches this once at login (and on Socket.IO invalidation events)
 * to drive `usePermission()` / <RequirePermission>.
 *
 * See: docs/architecture/permission-api.md § GET /api/me/permissions
 */
@ApiTags('permissions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('me')
export class MePermissionsController {
  constructor(private readonly permissions: PermissionsService) {}

  @Get('permissions')
  @ApiOperation({
    summary:
      'Effective screen/tab permission set for the authenticated user. Cached 60s.',
  })
  async getMine(
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<UserPermissionPayload> {
    // staffId is populated for every authenticated user; guard against the
    // optional type to satisfy TS + return a safe empty set if absent.
    const staffId = user.staffId ?? user.sub;
    return this.permissions.getForUser(staffId);
  }
}
