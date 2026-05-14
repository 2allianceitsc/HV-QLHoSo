import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { IJwtPayload } from '../../auth/strategies/jwt.strategy';
import { HV_ROLES_KEY, HvRole } from '../decorators/hv-roles.decorator';

@Injectable()
export class HvRoleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<HvRole[]>(HV_ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as IJwtPayload | undefined;
    if (!user) throw new ForbiddenException('Insufficient HV role');

    // SUPER_ADMIN legacy role bypasses all hvRole checks
    if (user.roles?.includes('SUPER_ADMIN' as never)) return true;

    if (!user.hvRoles?.length) throw new ForbiddenException('Insufficient HV role');

    // admin hvRole bypasses all role checks
    if (user.hvRoles.includes('admin')) return true;

    if (!required.some((r) => user.hvRoles.includes(r))) {
      throw new ForbiddenException('Insufficient HV role');
    }
    return true;
  }
}
