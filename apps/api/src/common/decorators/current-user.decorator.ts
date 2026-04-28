import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

export interface CurrentUserPayload {
  sub: string;
  username: string;
  email: string;
  staffId?: string;
  roles: string[];
}

export const CurrentUser = createParamDecorator(
  (data: keyof CurrentUserPayload | undefined, ctx: ExecutionContext): unknown => {
    const request = ctx.switchToHttp().getRequest<Request & { user: CurrentUserPayload }>();
    const user = request.user;

    if (data) {
      return user?.[data];
    }

    return user;
  },
);
