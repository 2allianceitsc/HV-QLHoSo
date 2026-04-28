import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { IJwtPayload } from '../../auth/strategies/jwt.strategy';
import { PermissionsService } from '../../system/permissions/permissions.service';
import {
  REQUIRES_SCREEN_KEY,
  RequiresScreenMetadata,
} from '../decorators/requires-screen.decorator';

/**
 * Phase 3 — enforcing guard for the screen/tab permission model.
 *
 * Runs globally via APP_GUARD. Behavior:
 *   1. If handler has no @RequiresScreen metadata → pass through (no-op).
 *   2. Require an authenticated user; if absent → let JwtAuthGuard handle it.
 *   3. Compute the permission decision via PermissionsService.check().
 *   4. On DENY → throw ForbiddenException with a structured reason.
 *   5. On ALLOW → return true.
 *
 * The legacy `@Roles(...)` + `RolesGuard` still co-exist during Phase 3
 * rollout as a safety net: an endpoint may carry BOTH and both must pass.
 * @Roles will be removed per-module when the team is confident.
 */
@Injectable()
export class ScreenPermissionGuard implements CanActivate {
  private readonly logger = new Logger(ScreenPermissionGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly permissions: PermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const meta = this.reflector.getAllAndOverride<RequiresScreenMetadata>(
      REQUIRES_SCREEN_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!meta) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as IJwtPayload | undefined;
    if (!user?.staffId) {
      // Guard-order note: this guard is registered globally via APP_GUARD, so
      // Nest runs it BEFORE the controller-level JwtAuthGuard that populates
      // request.user. That means authenticated requests legitimately arrive
      // here with no user — we must NOT reject them; the downstream
      // JwtAuthGuard will reject genuine anonymous calls with a proper 401.
      return true;
    }

    const action = meta.permission ?? 'VIEW';

    let decision: 'ALLOW' | 'DENY';
    try {
      const payload = await this.permissions.getForUser(user.staffId);
      decision = PermissionsService.check(payload, meta.screen, meta.tab ?? null, action);
    } catch (err) {
      this.logger.error(
        `Permission resolution failed for ${user.staffId} on ${meta.screen}/${meta.tab ?? '-'}:`,
        err,
      );
      // Fail closed — an unknown-state is a deny, never a silent allow.
      throw new ForbiddenException({
        code: 'PERMISSION_SERVICE_UNAVAILABLE',
        message: 'Permission service is temporarily unavailable.',
      });
    }

    if (decision === 'DENY') {
      this.logger.warn(
        `[PERMISSION_DENIED] ${request.method} ${request.url} — ` +
          `user=${user.staffId} roles=[${(user.roles ?? []).join(',')}] ` +
          `screen=${meta.screen} tab=${meta.tab ?? '-'} action=${action}`,
      );
      throw new ForbiddenException({
        code: 'PERMISSION_DENIED',
        message: 'You do not have permission to access this resource.',
        details: {
          screen: meta.screen,
          tab: meta.tab ?? null,
          action,
        },
      });
    }

    return true;
  }
}
