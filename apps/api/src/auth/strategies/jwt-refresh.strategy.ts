import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { IJwtPayload } from './jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(configService: ConfigService, private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => {
          return (req?.cookies as Record<string, string>)?.['refresh_token'] ?? null;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_REFRESH_SECRET') ?? 'fallback-refresh-secret',
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: IJwtPayload): Promise<IJwtPayload & { refreshToken: string }> {
    const refreshToken = (req.cookies as Record<string, string>)?.['refresh_token'];
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token not found');
    }

    // Single PK lookup — both manual logout and auto-logout now set
    // allSessionsRevokedAt, so no separate TT notes query is needed.
    const userLogin = await this.prisma.userLogin.findUnique({
      where: { id: payload.sub },
      select: { allSessionsRevokedAt: true },
    });

    if (userLogin?.allSessionsRevokedAt && payload.iat
        && payload.iat < Math.floor(userLogin.allSessionsRevokedAt.getTime() / 1000)) {
      throw new UnauthorizedException('Refresh token has been revoked');
    }

    return { ...payload, refreshToken };
  }
}
