import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy, type IJwtPayload } from './jwt.strategy';

describe('JwtStrategy', () => {
  const configServiceMock = {
    get: jest.fn().mockReturnValue('test-secret'),
  };

  const debugServiceMock = {
    isEnabled: jest.fn().mockResolvedValue(false),
    log: jest.fn().mockResolvedValue(undefined),
  };

  const makeStrategy = (prismaMock: unknown) =>
    new JwtStrategy(configServiceMock as never, prismaMock as never, debugServiceMock as never);

  const payload: IJwtPayload = {
    sub: 'user-1',
    staffId: 'staff-1',
    roles: [],
    hvRole: 'staff',
    jti: 'token-1',
    iat: Math.floor(new Date('2026-04-09T09:52:00.000Z').getTime() / 1000),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    debugServiceMock.isEnabled.mockResolvedValue(false);
  });

  it('rejects tokens issued before allSessionsRevokedAt', async () => {
    const prismaMock = {
      userLogin: {
        findUnique: jest.fn().mockResolvedValue({
          allSessionsRevokedAt: new Date('2026-04-09T09:55:00.000Z'),
          isDeleted: false,
          isActive: true,
          isDisabled: false,
        }),
      },
    };

    const strategy = makeStrategy(prismaMock);
    await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
  });

  it('allows tokens issued after allSessionsRevokedAt', async () => {
    const prismaMock = {
      userLogin: {
        findUnique: jest.fn().mockResolvedValue({
          allSessionsRevokedAt: new Date('2026-04-09T09:50:00.000Z'),
          isDeleted: false,
          isActive: true,
          isDisabled: false,
        }),
      },
    };

    const strategy = makeStrategy(prismaMock);
    await expect(strategy.validate(payload)).resolves.toEqual(payload);
  });

  it('allows tokens when allSessionsRevokedAt is null', async () => {
    const prismaMock = {
      userLogin: {
        findUnique: jest.fn().mockResolvedValue({
          allSessionsRevokedAt: null,
          isDeleted: false,
          isActive: true,
          isDisabled: false,
        }),
      },
    };

    const strategy = makeStrategy(prismaMock);
    await expect(strategy.validate(payload)).resolves.toEqual(payload);
  });
});
