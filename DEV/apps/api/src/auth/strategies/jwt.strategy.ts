import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '@shared/enums/user-role.enum';
import { PrismaService } from '../../prisma/prisma.service';
import { DebugService } from '../../common/debug/debug.service';

export interface IJwtPayload {
  sub: string;
  staffId: string;
  roles: UserRole[];
  hvRoles: string[];
  jti: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly debugService: DebugService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => {
          return (req?.cookies as Record<string, string>)?.['access_token'] ?? null;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') ?? 'fallback-secret',
    });
  }

  async validate(payload: IJwtPayload): Promise<IJwtPayload> {
    const debug = await this.debugService.isEnabled();

    if (debug) {
      await this.debugService.log(
        'JwtStrategy.validate',
        'Token received',
        {
          sub: payload.sub,
          jti: payload.jti,
          staffId: payload.staffId,
          roles: payload.roles,
          iat: payload.iat,
          iatReadable: payload.iat ? new Date(payload.iat * 1000).toISOString() : null,
          exp: payload.exp,
          expReadable: payload.exp ? new Date(payload.exp * 1000).toISOString() : null,
        },
      );
    }

    if (!payload.sub || !payload.jti) {
      if (debug) {
        await this.debugService.log('JwtStrategy.validate', 'REJECTED: missing sub or jti', { sub: payload.sub, jti: payload.jti });
      }
      throw new UnauthorizedException('Invalid token payload');
    }

    // Single PK lookup — both manual logout and auto-logout now set
    // allSessionsRevokedAt, so no separate TT notes query is needed.
    // Compare in seconds (floor) to avoid rejecting tokens issued in the
    // same second as the revocation — JWT iat has second-level precision only.
    const userLogin = await this.prisma.userLogin.findUnique({
      where: { id: payload.sub },
      select: { allSessionsRevokedAt: true, isDeleted: true, isActive: true, isDisabled: true },
    });

    if (debug) {
      await this.debugService.log(
        'JwtStrategy.validate',
        userLogin ? 'DB lookup result' : 'DB lookup returned null — user not found',
        userLogin
          ? {
              allSessionsRevokedAt: userLogin.allSessionsRevokedAt?.toISOString() ?? null,
              allSessionsRevokedAtUnix: userLogin.allSessionsRevokedAt
                ? Math.floor(userLogin.allSessionsRevokedAt.getTime() / 1000)
                : null,
              isDeleted: userLogin.isDeleted,
              isActive: userLogin.isActive,
              isDisabled: userLogin.isDisabled,
              tokenIat: payload.iat,
              revokedCheck: userLogin.allSessionsRevokedAt && payload.iat
                ? `iat(${payload.iat}) < revokedAt(${Math.floor(userLogin.allSessionsRevokedAt.getTime() / 1000)}) → ${payload.iat < Math.floor(userLogin.allSessionsRevokedAt.getTime() / 1000) ? 'REVOKED' : 'OK'}`
                : 'no-revoke-check',
            }
          : { sub: payload.sub },
      );
    }

    if (userLogin?.allSessionsRevokedAt && payload.iat
        && payload.iat < Math.floor(userLogin.allSessionsRevokedAt.getTime() / 1000)) {
      if (debug) {
        await this.debugService.log(
          'JwtStrategy.validate',
          'REJECTED: session revoked',
          {
            sub: payload.sub,
            tokenIat: payload.iat,
            tokenIatReadable: new Date(payload.iat * 1000).toISOString(),
            revokedAt: Math.floor(userLogin.allSessionsRevokedAt.getTime() / 1000),
            revokedAtReadable: userLogin.allSessionsRevokedAt.toISOString(),
            diff: `token is ${Math.floor(userLogin.allSessionsRevokedAt.getTime() / 1000) - payload.iat}s older than revocation`,
          },
        );
      }
      throw new UnauthorizedException('Session has been revoked');
    }

    if (debug) {
      await this.debugService.log('JwtStrategy.validate', 'ACCEPTED: token is valid', { sub: payload.sub, jti: payload.jti });
    }

    // SUPER_ADMIN has no staff record → old tokens carry hvRoles:['staff'] by mistake.
    // Override here so existing sessions work without re-login.
    if (payload.roles?.includes(UserRole.SUPER_ADMIN) && !payload.hvRoles?.includes('admin')) {
      payload.hvRoles = ['admin'];
    }

    return payload;
  }
}
