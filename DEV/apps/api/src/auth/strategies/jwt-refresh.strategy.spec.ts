import { UnauthorizedException } from '@nestjs/common';
import { JwtRefreshStrategy } from './jwt-refresh.strategy';
import type { IJwtPayload } from './jwt.strategy';

describe('JwtRefreshStrategy', () => {
  const configServiceMock = {
    get: jest.fn((key: string) => {
      if (key === 'JWT_REFRESH_SECRET') return 'refresh-secret';
      return 'fallback';
    }),
  };

  const prismaMock = {
    timeTracking: {
      findFirst: jest.fn(),
    },
  };

  const payload: IJwtPayload = {
    sub: 'user-1',
    staffId: 'staff-1',
    roles: [],
    hvRoles: ['staff'],
    jti: 'refresh-1',
    iat: Math.floor(new Date('2026-04-09T09:52:00.000Z').getTime() / 1000),
  };

  const request = {
    cookies: {
      refresh_token: 'refresh-token-value',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects refresh tokens issued before the actual auto-logout processing time', async () => {
    prismaMock.timeTracking.findFirst.mockResolvedValue({
      logUpdatedAt: new Date('2026-04-09T09:55:00.000Z'),
      endTime: new Date('2026-04-09T09:47:00.000Z'),
      startTime: new Date('2026-04-09T09:47:00.000Z'),
    });

    const strategy = new JwtRefreshStrategy(configServiceMock as never, prismaMock as never);

    await expect(strategy.validate(request as never, payload)).rejects.toThrow(UnauthorizedException);
  });

  it('allows refresh tokens issued after auto-logout processing time', async () => {
    prismaMock.timeTracking.findFirst.mockResolvedValue({
      logUpdatedAt: new Date('2026-04-09T09:50:00.000Z'),
      endTime: new Date('2026-04-09T09:47:00.000Z'),
      startTime: new Date('2026-04-09T09:47:00.000Z'),
    });

    const strategy = new JwtRefreshStrategy(configServiceMock as never, prismaMock as never);

    await expect(strategy.validate(request as never, payload)).resolves.toEqual({
      ...payload,
      refreshToken: 'refresh-token-value',
    });
  });
});