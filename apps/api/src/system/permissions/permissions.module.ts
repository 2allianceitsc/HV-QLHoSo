import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { PermissionsService } from './permissions.service';
import { PermissionsAdminService } from './permissions-admin.service';
import { MePermissionsController } from './permissions.controller';
import { PermissionsAdminController } from './permissions-admin.controller';
import { ScreenPermissionGuard } from '../../common/guards/screen-permission.guard';

/**
 * Screen & tab permission model (CR-008).
 *
 * - Phase 1: schema + seed + resolver (done).
 * - Phase 2: /api/me/permissions + shadow-mode guard (done).
 * - Phase 3: guard enforces + FE integration (done).
 * - Phase 4 (this): SY18 admin endpoints + UI.
 *
 * Admin endpoints live on a separate controller gated by the legacy
 * `@Roles(SUPER_ADMIN)` guard (NOT `@RequiresScreen`) — this prevents
 * lock-out if the matrix is mis-configured.
 */
@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [MePermissionsController, PermissionsAdminController],
  providers: [
    PermissionsService,
    PermissionsAdminService,
    { provide: APP_GUARD, useClass: ScreenPermissionGuard },
  ],
  exports: [PermissionsService],
})
export class PermissionsModule {}
