import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface ILoginOtpFilter {
  email?: string;
  isUsed?: string;
  page?: number;
  limit?: number;
}

type OtpActionType = 'LOGIN_2FA' | 'SETUP_2FA' | 'FORGOT_PASSWORD';

export interface ILoginOtpRow {
  id: string;
  userId: string;
  otp: string;
  expiresAt: Date;
  isUsed: boolean;
  createdAt: Date;
  actionType: OtpActionType;
  userLogin?: { username: string; email: string };
}

@Injectable()
export class LoginOtpService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filter: ILoginOtpFilter) {
    const page = Number(filter.page) || 1;
    const limit = Math.min(Number(filter.limit) || 50, 200);
    const offset = (page - 1) * limit;
    const windowSize = offset + limit;

    const loginOtpWhere: Record<string, unknown> = {};
    const passwordResetOtpWhere: Record<string, unknown> = {};

    if (filter.isUsed !== undefined) {
      const isUsed = filter.isUsed === 'true';
      loginOtpWhere['isUsed'] = isUsed;
      passwordResetOtpWhere['isUsed'] = isUsed;
    }

    if (filter.email) {
      loginOtpWhere['userLogin'] = {
        email: { contains: filter.email, mode: 'insensitive' },
      };
      passwordResetOtpWhere['email'] = { contains: filter.email, mode: 'insensitive' };
    }

    const [loginOtps, passwordResetOtps, loginOtpTotal, passwordResetOtpTotal] = await Promise.all([
      this.prisma.loginOtp.findMany({
        where: loginOtpWhere,
        take: windowSize,
        orderBy: { createdAt: 'desc' },
        include: {
          userLogin: {
            select: {
              username: true,
              email: true,
              staff: { select: { is2FAEnabled: true } },
            },
          },
        },
      }),
      this.prisma.passwordResetOtp.findMany({
        where: passwordResetOtpWhere,
        take: windowSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.loginOtp.count({ where: loginOtpWhere }),
      this.prisma.passwordResetOtp.count({ where: passwordResetOtpWhere }),
    ]);

    const normalizedLoginOtpRows: ILoginOtpRow[] = loginOtps.map((row) => ({
      id: row.id,
      userId: row.userId,
      otp: row.otp,
      expiresAt: row.expiresAt,
      isUsed: row.isUsed,
      createdAt: row.createdAt,
      actionType: row.userLogin?.staff?.is2FAEnabled === false ? 'SETUP_2FA' : 'LOGIN_2FA',
      userLogin: row.userLogin
        ? { username: row.userLogin.username, email: row.userLogin.email }
        : undefined,
    }));

    const normalizedResetRows: ILoginOtpRow[] = passwordResetOtps.map((row) => ({
      id: row.id,
      userId: '',
      otp: row.otp,
      expiresAt: row.expiresAt,
      isUsed: row.isUsed,
      createdAt: row.createdAt,
      actionType: 'FORGOT_PASSWORD',
      userLogin: { username: '—', email: row.email },
    }));

    const mergedRows = [...normalizedLoginOtpRows, ...normalizedResetRows]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(offset, offset + limit);

    const total = loginOtpTotal + passwordResetOtpTotal;

    return {
      success: true,
      data: mergedRows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }
}
