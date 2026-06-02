import {
  Injectable,
  Logger,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { randomInt } from 'crypto';
import { uuidv7 } from 'uuidv7';
import { UserRole } from '@shared/enums/user-role.enum';
import { IJwtPayload } from './strategies/jwt.strategy';
import { EmailService } from './email/email.service';
import { TwoFAService } from './two-fa/two-fa.service';
import { DebugService } from '../common/debug/debug.service';

interface ITokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface ICurrentUser {
  id: string;
  staffId: string;
  username: string;
  email: string;
  roles: UserRole[];
  hvRoles: string[];
  fullName: string;
  photoBusiness: string | null;
  departmentId: string | null;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
    private readonly twoFAService: TwoFAService,
    private readonly debugService: DebugService,
  ) {
    // Initialize Firebase Admin SDK once (for Google token verification)
    if (!admin.apps.length) {
      try {
        // Try inline JSON from env first (production/Railway), then local file (dev)
        const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
        const localFilePath = path.join(process.cwd(), 'firebase-service-account.json');

        if (serviceAccountJson) {
          const sa = JSON.parse(serviceAccountJson) as admin.ServiceAccount;
          admin.initializeApp({ credential: admin.credential.cert(sa) });
          this.logger.log('Firebase Admin initialized via FIREBASE_SERVICE_ACCOUNT env');
        } else if (fs.existsSync(localFilePath)) {
          const sa = JSON.parse(fs.readFileSync(localFilePath, 'utf8')) as admin.ServiceAccount;
          admin.initializeApp({ credential: admin.credential.cert(sa) });
          this.logger.log('Firebase Admin initialized via firebase-service-account.json');
        } else {
          this.logger.error(`Firebase Admin: no credentials. Add firebase-service-account.json to ${process.cwd()} or set FIREBASE_SERVICE_ACCOUNT env`);
        }
      } catch (err) {
        this.logger.error('Firebase Admin initializeApp failed', err);
      }
    }
  }

  // ── Login ─────────────────────────────────────────────────────────────────
  async login(username: string, password: string) {
    const debug = await this.debugService.isEnabled();

    // When debug mode is on, surface ALL matching rows first — lets us catch
    // duplicate accounts that make findFirst's result nondeterministic.
    if (debug) {
      const allMatches = await this.prisma.userLogin.findMany({
        where: {
          OR: [
            { username: { equals: username, mode: 'insensitive' } },
            { email: { equals: username, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          username: true,
          email: true,
          isDeleted: true,
          isDisabled: true,
          isActive: true,
          isFirstLogin: true,
          lastLogin: true,
          logUpdatedAt: true,
        },
      });
      await this.debugService.log(
        'AuthService.login',
        `Input "${username}" matches ${allMatches.length} UserLogin row(s)`,
        { input: username, matches: allMatches },
      );
    }

    const userLogin = await this.prisma.userLogin.findFirst({
      where: {
        OR: [
          { username: { equals: username, mode: 'insensitive' } },
          { email: { equals: username, mode: 'insensitive' } },
        ],
        isDeleted: false,
        isDisabled: false,
        isActive: true,
      },
      include: {
        staff: {
          include: {
            staffRoles: {
              where: { isDeleted: false },
              include: { role: true },
            },
          },
        },
      },
    });

    if (debug) {
      await this.debugService.log(
        'AuthService.login',
        userLogin ? 'findFirst selected row' : 'findFirst returned null',
        userLogin
          ? {
              id: userLogin.id,
              username: userLogin.username,
              email: userLogin.email,
              isFirstLogin: userLogin.isFirstLogin,
              staffId: userLogin.staff?.id ?? null,
              employeeId: userLogin.staff?.employeeId ?? null,
            }
          : { input: username },
      );
    }

    if (!userLogin) {
      const err = new UnauthorizedException('Invalid username or password');
      (err as unknown as { loginFailReason: string }).loginFailReason = 'user_not_found';
      throw err;
    }

    const isPasswordValid = await bcrypt.compare(password, userLogin.passwordHash);
    if (debug) {
      await this.debugService.log(
        'AuthService.login',
        `bcrypt.compare result: ${isPasswordValid}`,
        { selectedUserId: userLogin.id, passwordHashUpdatedAt: userLogin.logUpdatedAt },
      );
    }
    if (!isPasswordValid) {
      const err = new UnauthorizedException('Invalid username or password');
      (err as unknown as { loginFailReason: string }).loginFailReason = 'invalid_password';
      throw err;
    }

    if (userLogin.isFirstLogin) {
      const recoveryKey = this.jwtService.sign(
        { sub: userLogin.id, type: 'first-login' },
        { secret: this.configService.get<string>('JWT_SECRET'), expiresIn: '30m' },
      );
      return { success: true, data: { mustChangePassword: true, recoveryKey } };
    }

    // ── 2FA Decision Tree (BA §4.1) ──────────────────────────────────────────
    const twoFaResult = await this.twoFAService.evaluate2FA(userLogin.id, userLogin.username, userLogin.staff?.id ?? null, userLogin.email);
    if (twoFaResult) return { success: true, data: twoFaResult };
    // ─────────────────────────────────────────────────────────────────────────

    await this.prisma.userLogin.update({
      where: { id: userLogin.id },
      data: { lastLogin: new Date() },
    });

    const roles = this.extractRoles(userLogin.staff?.staffRoles ?? []);
    const tokens = await this.generateTokens(userLogin.id, userLogin.staff?.id ?? '', roles);

    return {
      success: true,
      data: {
        mustChangePassword: false,
        user: this.buildUserInfo(userLogin, roles),
        ...tokens,
      },
    };
  }

  // ── Google Login ──────────────────────────────────────────────────────────
  async googleLogin(idToken: string) {
    let googleEmail: string;
    try {
      const decoded = await admin.auth().verifyIdToken(idToken);
      googleEmail = (decoded.email ?? '').toLowerCase().trim();
    } catch (err) {
      this.logger.error('Firebase verifyIdToken failed', err);
      throw new UnauthorizedException(`Invalid or expired Google token: ${(err as Error).message}`);
    }

    if (!googleEmail) {
      throw new UnauthorizedException('Google account has no email');
    }

    const userLogin = await this.prisma.userLogin.findFirst({
      where: { email: { equals: googleEmail, mode: 'insensitive' }, isDeleted: false },
      include: {
        staff: {
          include: {
            staffRoles: { where: { isDeleted: false }, include: { role: true } },
          },
        },
      },
    });

    // E015: email not registered
    if (!userLogin) {
      throw new NotFoundException('Email này chưa được đăng ký trong hệ thống.');
    }

    // E002: account disabled
    if (!userLogin.isActive || userLogin.isDisabled) {
      throw new ForbiddenException('Tài khoản đã bị khóa. Liên hệ quản trị viên.');
    }

    await this.prisma.userLogin.update({
      where: { id: userLogin.id },
      data: { lastLogin: new Date() },
    });

    // Skip isFirstLogin check — Google login bypasses first-time password change
    const roles = this.extractRoles(userLogin.staff?.staffRoles ?? []);
    const tokens = await this.generateTokens(userLogin.id, userLogin.staff?.id ?? '', roles);

    return {
      success: true,
      data: {
        user: this.buildUserInfo(userLogin, roles),
        ...tokens,
      },
    };
  }

  // ── Logout ────────────────────────────────────────────────────────────────
  async logout(jti: string, exp: number, userId: string, staffId: string): Promise<void> {
    const now = new Date();

    const ops: Promise<unknown>[] = [
      // Blacklist current token JTI
      this.prisma.refreshTokenBlacklist.upsert({
        where: { jti },
        create: { jti, expiresAt: new Date(exp * 1000) },
        update: {},
      }),
      // Revoke all sessions — any token issued before `now` will be rejected
      this.prisma.userLogin.update({
        where: { id: userId },
        data: { allSessionsRevokedAt: now, logUpdatedBy: 'system' },
      }),
    ];

    await Promise.all(ops);
  }

  // ── Refresh ───────────────────────────────────────────────────────────────
  async refresh(payload: IJwtPayload & { refreshToken: string }) {
    const isBlacklisted = await this.prisma.refreshTokenBlacklist.findUnique({
      where: { jti: payload.jti },
    });

    if (isBlacklisted) {
      throw new UnauthorizedException('Refresh token has been revoked');
    }

    const userLogin = await this.prisma.userLogin.findFirst({
      where: { id: payload.sub, isDeleted: false, isActive: true },
      include: {
        staff: {
          include: {
            staffRoles: { where: { isDeleted: false }, include: { role: true } },
          },
        },
      },
    });

    if (!userLogin) {
      throw new UnauthorizedException('User not found');
    }

    if (payload.exp) {
      await this.prisma.refreshTokenBlacklist.upsert({
        where: { jti: payload.jti },
        create: {
          jti: payload.jti,
          expiresAt: new Date(payload.exp * 1000),
        },
        update: {},
      });
    }

    const roles = this.extractRoles(userLogin.staff?.staffRoles ?? []);
    return this.generateTokens(userLogin.id, userLogin.staff?.id ?? '', roles);
  }

  // ── Forgot Password ───────────────────────────────────────────────────────
  async forgotPassword(rawEmail: string) {
    const email = rawEmail.toLowerCase().trim();

    // Read OTP config from DB (with defaults)
    const [cooldownSetting, maxDailySetting, expiryMinutesSetting] = await Promise.all([
      this.prisma.systemSetting.findUnique({ where: { key: 'otp.resend_cooldown' } }),
      this.prisma.systemSetting.findUnique({ where: { key: 'otp.max_daily' } }),
      this.prisma.systemSetting.findUnique({ where: { key: 'otp.expiry_minutes' } }),
    ]);

    const cooldownSeconds = parseInt(cooldownSetting?.value ?? '60', 10);
    const maxDaily = parseInt(maxDailySetting?.value ?? '3', 10);
    const expiryMinutes = parseInt(expiryMinutesSetting?.value ?? '5', 10);

    // Check rate limits BEFORE querying user (avoid timing attack)
    const rateLimit = await this.prisma.otpRateLimit.findUnique({ where: { email } });

    if (rateLimit) {
      // Resend cooldown check
      const secondsSinceLastRequest = (Date.now() - rateLimit.lastRequestAt.getTime()) / 1000;
      if (secondsSinceLastRequest < cooldownSeconds) {
        throw new HttpException(
          { code: 'E_OTP_COOLDOWN', message: 'Please wait before requesting another OTP.' },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      // Daily limit check — resets if dailyDate is a different UTC day
      const todayUtc = new Date().toISOString().split('T')[0];
      const rateLimitDate = rateLimit.dailyDate.toISOString().split('T')[0];
      if (rateLimitDate === todayUtc && rateLimit.dailyCount >= maxDaily) {
        throw new HttpException(
          { code: 'E009', message: 'Maximum OTP requests reached for today. Please try again tomorrow.' },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    const debug = await this.debugService.isEnabled();
    if (debug) {
      const allEmailMatches = await this.prisma.userLogin.findMany({
        where: { email: { equals: email, mode: 'insensitive' } },
        select: { id: true, username: true, email: true, isDeleted: true, isFirstLogin: true },
      });
      await this.debugService.log(
        'AuthService.forgotPassword',
        `Email "${email}" matches ${allEmailMatches.length} UserLogin row(s) (incl. deleted)`,
        { normalized: email, matches: allEmailMatches },
      );
    }

    const userLogin = await this.prisma.userLogin.findFirst({
      where: { email, isDeleted: false },
    });

    if (debug) {
      await this.debugService.log(
        'AuthService.forgotPassword',
        userLogin
          ? 'findFirst selected row — OTP will be queued'
          : 'No user found for this email — returning 404',
        userLogin
          ? { id: userLogin.id, username: userLogin.username, email: userLogin.email, isFirstLogin: userLogin.isFirstLogin }
          : { normalized: email },
      );
    }

    if (!userLogin) {
      throw new NotFoundException('Email address not found in the system.');
    }

    if (userLogin) {
      // Invalidate old unused OTPs
      await this.prisma.passwordResetOtp.updateMany({
        where: { email, isUsed: false },
        data: { isUsed: true },
      });

      const otp = this.generateOtp();
      const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

      await this.prisma.passwordResetOtp.create({
        data: { id: uuidv7(), email, otp, expiresAt },
      });

      await this.emailService.queueOtpEmail(email, otp);

      // Upsert rate limit
      const now = new Date();
      const todayUtc = new Date(now.toISOString().split('T')[0]);
      const rateLimitDate = rateLimit?.dailyDate.toISOString().split('T')[0];
      const isSameDay = rateLimitDate === now.toISOString().split('T')[0];

      await this.prisma.otpRateLimit.upsert({
        where: { email },
        create: {
          id: uuidv7(),
          email,
          dailyCount: 1,
          dailyDate: todayUtc,
          lastRequestAt: now,
          logCreatedBy: 'system',
        },
        update: {
          dailyCount: isSameDay ? { increment: 1 } : 1,
          dailyDate: isSameDay ? undefined : todayUtc,
          lastRequestAt: now,
          logUpdatedBy: 'system',
        },
      });
    }

    return { success: true, message: 'OTP has been sent to your email.' };
  }

  // ── Resend OTP (Forgot Password) ──────────────────────────────────────────
  async resendForgotPasswordOtp(rawEmail: string): Promise<{ sent: boolean; cooldownSeconds: number; remainingAttempts: number }> {
    const email = rawEmail.toLowerCase().trim();

    const [cooldownSetting, maxDailySetting, expiryMinutesSetting] = await Promise.all([
      this.prisma.systemSetting.findUnique({ where: { key: 'otp.resend_cooldown' } }),
      this.prisma.systemSetting.findUnique({ where: { key: 'otp.max_daily' } }),
      this.prisma.systemSetting.findUnique({ where: { key: 'otp.expiry_minutes' } }),
    ]);

    const cooldownSeconds = parseInt(cooldownSetting?.value ?? '60', 10);
    const maxDaily = parseInt(maxDailySetting?.value ?? '3', 10);
    const expiryMinutes = parseInt(expiryMinutesSetting?.value ?? '5', 10);

    const rateLimit = await this.prisma.otpRateLimit.findUnique({ where: { email } });

    if (rateLimit) {
      const secondsSinceLastRequest = (Date.now() - rateLimit.lastRequestAt.getTime()) / 1000;
      if (secondsSinceLastRequest < cooldownSeconds) {
        throw new HttpException(
          { code: 'E_OTP_COOLDOWN', message: 'Please wait before requesting another OTP.' },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      const todayUtc = new Date().toISOString().split('T')[0];
      const rateLimitDate = rateLimit.dailyDate.toISOString().split('T')[0];
      if (rateLimitDate === todayUtc && rateLimit.dailyCount >= maxDaily) {
        throw new HttpException(
          { code: 'E009', message: 'Maximum OTP requests reached for today. Please try again tomorrow.' },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    const userLogin = await this.prisma.userLogin.findFirst({
      where: { email, isDeleted: false, isActive: true },
    });

    if (userLogin) {
      await this.prisma.passwordResetOtp.updateMany({
        where: { email, isUsed: false },
        data: { isUsed: true },
      });

      const otp = this.generateOtp();
      const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

      await this.prisma.passwordResetOtp.create({
        data: { id: uuidv7(), email, otp, expiresAt },
      });

      await this.emailService.queueOtpEmail(email, otp);

      const now = new Date();
      const todayUtc = new Date(now.toISOString().split('T')[0]);
      const rateLimitDate = rateLimit?.dailyDate.toISOString().split('T')[0];
      const isSameDay = rateLimitDate === now.toISOString().split('T')[0];

      await this.prisma.otpRateLimit.upsert({
        where: { email },
        create: {
          id: uuidv7(),
          email,
          dailyCount: 1,
          dailyDate: todayUtc,
          lastRequestAt: now,
          logCreatedBy: 'system',
        },
        update: {
          dailyCount: isSameDay ? { increment: 1 } : 1,
          dailyDate: isSameDay ? undefined : todayUtc,
          lastRequestAt: now,
          logUpdatedBy: 'system',
        },
      });
    }

    // Calculate remaining attempts from current DB state
    const finalRateLimit = await this.prisma.otpRateLimit.findUnique({ where: { email } });
    const todayUtc = new Date().toISOString().split('T')[0];
    const isSameDayFinal = finalRateLimit?.dailyDate.toISOString().split('T')[0] === todayUtc;
    const usedToday = isSameDayFinal ? (finalRateLimit?.dailyCount ?? 0) : 0;
    const remainingAttempts = Math.max(0, maxDaily - usedToday);

    return { sent: true, cooldownSeconds, remainingAttempts };
  }

  // ── Verify OTP ────────────────────────────────────────────────────────────
  async verifyOtp(email: string, otp: string) {
    // Find by email + otp + not used (without expiry check — check separately for clear error)
    const record = await this.prisma.passwordResetOtp.findFirst({
      where: { email, otp, isUsed: false },
      orderBy: { createdAt: 'desc' },
    });

    if (!record) {
      throw new BadRequestException('Invalid OTP');
    }

    if (record.expiresAt < new Date()) {
      throw new BadRequestException('OTP has expired. Please request a new one.');
    }

    const resetToken = this.jwtService.sign(
      { sub: email, otpId: record.id, type: 'password-reset' },
      {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: '15m',
      },
    );

    return { success: true, data: { resetToken } };
  }

  // ── Reset Password ────────────────────────────────────────────────────────
  async resetPassword(resetToken: string, newPassword: string): Promise<{ userId: string; username: string }> {
    let payload: { sub: string; otpId: string; type: string };

    try {
      payload = this.jwtService.verify(resetToken, {
        secret: this.configService.get<string>('JWT_SECRET'),
      }) as typeof payload;
    } catch {
      throw new BadRequestException('Invalid or expired token');
    }

    if (payload.type !== 'password-reset') {
      throw new BadRequestException('Invalid token');
    }

    const otpRecord = await this.prisma.passwordResetOtp.findFirst({
      where: { id: payload.otpId, isUsed: false },
    });

    if (!otpRecord) {
      throw new BadRequestException('Token đã được sử dụng');
    }

    const debug = await this.debugService.isEnabled();
    if (debug) {
      const allEmailMatches = await this.prisma.userLogin.findMany({
        where: { email: { equals: payload.sub, mode: 'insensitive' } },
        include: {
          staff: { select: { id: true, employeeId: true, firstName: true, surname: true } },
        },
      });
      await this.debugService.log(
        'AuthService.resetPassword',
        `Token email "${payload.sub}" matches ${allEmailMatches.length} UserLogin row(s) (incl. deleted)`,
        {
          tokenEmail: payload.sub,
          matches: allEmailMatches.map((u) => ({
            id: u.id,
            username: u.username,
            email: u.email,
            isDeleted: u.isDeleted,
            isFirstLogin: u.isFirstLogin,
            staff: u.staff
              ? { id: u.staff.id, employeeId: u.staff.employeeId, name: `${u.staff.firstName} ${u.staff.surname}` }
              : null,
          })),
        },
      );
    }

    const userLogin = await this.prisma.userLogin.findFirst({
      where: { email: payload.sub, isDeleted: false },
      include: { staff: { select: { id: true, employeeId: true, firstName: true, surname: true } } },
    });

    if (!userLogin) {
      throw new NotFoundException('User not found');
    }

    const isSameAsOld = await bcrypt.compare(newPassword, userLogin.passwordHash);
    if (isSameAsOld) {
      throw new BadRequestException('New password must be different from current password');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await this.prisma.$transaction([
      this.prisma.userLogin.update({
        where: { id: userLogin.id },
        data: { passwordHash, isFirstLogin: false },
      }),
      this.prisma.passwordResetOtp.update({
        where: { id: otpRecord.id },
        data: { isUsed: true },
      }),
    ]);

    if (debug) {
      await this.debugService.log(
        'AuthService.resetPassword',
        'Password hash saved for selected user',
        {
          userId: userLogin.id,
          username: userLogin.username,
          email: userLogin.email,
          staff: userLogin.staff
            ? { id: userLogin.staff.id, employeeId: userLogin.staff.employeeId, name: `${userLogin.staff.firstName} ${userLogin.staff.surname}` }
            : null,
        },
      );
    }

    return { userId: userLogin.id, username: userLogin.username };
  }

  // ── First Time Password ───────────────────────────────────────────────────
  async firstTimePassword(recoveryKey: string, newPassword: string) {
    let payload: { sub: string; type: string };

    try {
      payload = this.jwtService.verify(recoveryKey, {
        secret: this.configService.get<string>('JWT_SECRET'),
      }) as typeof payload;
    } catch {
      throw new BadRequestException('Invalid or expired recovery key');
    }

    if (payload.type !== 'first-login') {
      throw new BadRequestException('Invalid recovery key');
    }

    const userLogin = await this.prisma.userLogin.findFirst({
      where: { id: payload.sub, isDeleted: false },
      include: {
        staff: {
          include: {
            staffRoles: { where: { isDeleted: false }, include: { role: true } },
          },
        },
      },
    });

    if (!userLogin) {
      throw new NotFoundException('User not found');
    }

    const isSameAsOld = await bcrypt.compare(newPassword, userLogin.passwordHash);
    if (isSameAsOld) {
      throw new BadRequestException('New password must be different from current password');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await this.prisma.userLogin.update({
      where: { id: userLogin.id },
      data: { passwordHash, isFirstLogin: false, lastLogin: new Date() },
    });

    // ── 2FA Decision Tree (after first-login password change) ────────────────
    const twoFaResult = await this.twoFAService.evaluate2FA(userLogin.id, userLogin.username, userLogin.staff?.id ?? null, userLogin.email);
    if (twoFaResult) return { success: true, data: twoFaResult };
    // ─────────────────────────────────────────────────────────────────────────

    const roles = this.extractRoles(userLogin.staff?.staffRoles ?? []);
    const tokens = await this.generateTokens(userLogin.id, userLogin.staff?.id ?? '', roles);

    return {
      success: true,
      data: {
        user: this.buildUserInfo(userLogin, roles),
        ...tokens,
      },
    };
  }

  // ── Change Password ───────────────────────────────────────────────────────
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const userLogin = await this.prisma.userLogin.findFirst({
      where: { id: userId, isDeleted: false },
      include: { staff: { select: { id: true, employeeId: true, firstName: true, surname: true } } },
    });

    if (!userLogin) {
      throw new NotFoundException('User not found');
    }

    const isValid = await bcrypt.compare(currentPassword, userLogin.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    if (newPassword === currentPassword) {
      throw new BadRequestException('New password must be different from current password');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.prisma.userLogin.update({
      where: { id: userId },
      data: { passwordHash },
    });

    await this.debugService.log(
      'AuthService.changePassword',
      'Password hash saved',
      {
        userId: userLogin.id,
        username: userLogin.username,
        email: userLogin.email,
        staff: userLogin.staff
          ? { id: userLogin.staff.id, employeeId: userLogin.staff.employeeId, name: `${userLogin.staff.firstName} ${userLogin.staff.surname}` }
          : null,
      },
    );
  }

  // ── Get Me ────────────────────────────────────────────────────────────────
  async getMe(userId: string): Promise<ICurrentUser> {
    const userLogin = await this.prisma.userLogin.findFirst({
      where: { id: userId, isDeleted: false, isActive: true },
      include: {
        staff: {
          include: {
            staffRoles: { where: { isDeleted: false }, include: { role: true } },
          },
        },
      },
    });

    if (!userLogin) {
      throw new NotFoundException('User not found');
    }

    const roles = this.extractRoles(userLogin.staff?.staffRoles ?? []);
    return this.buildUserInfo(userLogin, roles);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  /** Public — used by 2FA verify flow after challenge is cleared */
  async buildLoginResponse(userLogin: {
    id: string;
    username: string;
    email: string;
    staff?: {
      id: string;
      firstName: string;
      middleName: string | null;
      surname: string;
      photoBusiness: string | null;
      hvRoles: string[];
      departmentId: string | null;
      staffRoles: Array<{ role: { name: string } }>;
    } | null;
  }) {
    const roles = this.extractRoles(userLogin.staff?.staffRoles ?? []);
    const tokens = await this.generateTokens(userLogin.id, userLogin.staff?.id ?? '', roles);
    const user = this.buildUserInfo(userLogin, roles);

    return { user, ...tokens };
  }

  private async generateTokens(userId: string, staffId: string, roles: UserRole[]): Promise<ITokenPair> {
    const jti = uuidv7();
    const refreshJti = uuidv7();

    const hvRoles = staffId
      ? (await this.prisma.staff.findUnique({ where: { id: staffId }, select: { hvRoles: true } }))?.hvRoles ?? ['staff']
      : ['admin'];

    const accessPayload: IJwtPayload = { sub: userId, staffId, roles, hvRoles, jti };
    const refreshPayload: IJwtPayload = { sub: userId, staffId, roles, hvRoles, jti: refreshJti };

    const [accessToken, refreshToken] = await Promise.all([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.jwtService.signAsync(accessPayload as any, {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: (this.configService.get<string>('JWT_EXPIRES_IN') ?? '30d') as unknown as number,
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.jwtService.signAsync(refreshPayload as any, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: (this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '30d') as unknown as number,
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private extractRoles(staffRoles: Array<{ role: { name: string } }>): UserRole[] {
    const validRoles = Object.values(UserRole) as string[];
    return staffRoles
      .map((sr) => sr.role.name)
      .filter((name) => validRoles.includes(name)) as UserRole[];
  }

  private buildUserInfo(
    userLogin: {
      id: string;
      username: string;
      email: string;
      staff?: {
        id: string;
        firstName: string;
        middleName: string | null;
        surname: string;
        photoBusiness: string | null;
        hvRoles: string[];
        departmentId: string | null;
      } | null;
    },
    roles: UserRole[],
  ): ICurrentUser {
    const staff = userLogin.staff;
    const fullName = staff
      ? [staff.firstName, staff.middleName, staff.surname].filter(Boolean).join(' ')
      : userLogin.username;

    return {
      id: userLogin.id,
      staffId: staff?.id ?? '',
      username: userLogin.username,
      email: userLogin.email,
      roles,
      hvRoles: staff?.hvRoles ?? ['staff'],
      fullName,
      photoBusiness: staff?.photoBusiness ?? null,
      departmentId: staff?.departmentId ?? null,
    };
  }

  private generateOtp(): string {
    return randomInt(100000, 1000000).toString();
  }

  /** DEV ONLY — exposes last unused OTP for integration testing */
  async devGetLastOtp(email: string) {
    const record = await this.prisma.passwordResetOtp.findFirst({
      where: { email: email.toLowerCase().trim(), isUsed: false },
      orderBy: { createdAt: 'desc' },
    });
    if (!record) {
      throw new NotFoundException('No unused OTP found for this email');
    }
    return { success: true, data: { otp: record.otp, expiresAt: record.expiresAt } };
  }
}
