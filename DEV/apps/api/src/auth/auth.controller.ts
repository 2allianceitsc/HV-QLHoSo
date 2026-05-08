import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Res,
  Req,
  Query,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { Response, Request } from 'express';
import { ApiTags, ApiOperation, ApiCookieAuth } from '@nestjs/swagger';
import { JwtService } from '@nestjs/jwt';
import { AuthService, ICurrentUser } from './auth.service';
import { DebugService } from '../common/debug/debug.service';
import { LoginDto } from './dto/login.dto';
import { GoogleLoginDto } from './dto/google-login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { FirstTimePasswordDto } from './dto/first-time-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { IJwtPayload } from './strategies/jwt.strategy';
import { AuditService } from '../system/audit/audit.service';
import { extractIp } from '../common/utils/extract-ip';
import { TwoFAService } from './two-fa/two-fa.service';
import { Setup2FADto, Confirm2FADto, Verify2FADto, Disable2FADto, ResendOtpDto } from './two-fa/dto/two-fa.dto';

const ACCESS_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: false,
  sameSite: 'lax' as const,
  maxAge: 15 * 60 * 1000,
};

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: false,
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly auditService: AuditService,
    private readonly twoFAService: TwoFAService,
    private readonly jwtService: JwtService,
    private readonly debugService: DebugService,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ auth: { ttl: 60000, limit: 20 } })
  @ApiOperation({ summary: 'Login with username/email and password' })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
    @Req() req: Request,
  ) {
    let result: Awaited<ReturnType<typeof this.authService.login>>;
    try {
      result = await this.authService.login(dto.username, dto.password);
    } catch (err) {
      const loginFailReason = (err as Error & { loginFailReason?: string }).loginFailReason ?? (err as Error).message;
      void this.auditService.log('LOGIN_FAILED', 'UserLogin', dto.username, undefined, dto.username, { reason: loginFailReason }, extractIp(req));
      throw err;
    }

    const loginData = result.data as Record<string, unknown>;

    if (loginData['mustChangePassword'] || loginData['requires2FA'] || loginData['requires2FASetup']) {
      return result;
    }

    const { accessToken, refreshToken, ...rest } = result.data as {
      accessToken: string;
      refreshToken: string;
      mustChangePassword: boolean;
      user: ICurrentUser;
    };

    res.cookie('access_token', accessToken, ACCESS_COOKIE_OPTIONS);
    res.cookie('refresh_token', refreshToken, REFRESH_COOKIE_OPTIONS);

    void (async () => {
      try {
        const debug = await this.debugService.isEnabled();
        if (debug) {
          const decoded = this.jwtService.decode(accessToken) as Record<string, unknown> | null;
          await this.debugService.log(
            'AuthController.login',
            'Cookies set — access_token decoded',
            {
              userId: rest.user.id,
              username: rest.user.username,
              cookieMaxAgeMs: ACCESS_COOKIE_OPTIONS.maxAge,
              cookieExpiresIn: `${ACCESS_COOKIE_OPTIONS.maxAge / 60000} min`,
              tokenIat: decoded?.['iat'],
              tokenExp: decoded?.['exp'],
              tokenIatReadable: decoded?.['iat'] ? new Date((decoded['iat'] as number) * 1000).toISOString() : null,
              tokenExpReadable: decoded?.['exp'] ? new Date((decoded['exp'] as number) * 1000).toISOString() : null,
              jti: decoded?.['jti'],
            },
          );
        }
      } catch { /* debug must not affect login response */ }
    })();

    void this.auditService.log('LOGIN', 'UserLogin', rest.user.id, rest.user.id, rest.user.username, undefined, extractIp(req));

    return { success: true, data: rest };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth('access_token')
  @ApiOperation({ summary: 'Logout and clear cookies' })
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = req.user as IJwtPayload;

    try {
      await this.authService.logout(user.jti, user.exp ?? 0, user.sub, user.staffId);
    } catch {
      // Ignore errors on logout to ensure cookies are always cleared
    }

    res.clearCookie('access_token');
    res.clearCookie('refresh_token');

    void this.auditService.log('LOGOUT', 'UserLogin', user.sub ?? 'unknown', user.sub, undefined, undefined, extractIp(req));

    return { success: true, message: 'Logged out successfully' };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @SkipThrottle()
  @UseGuards(JwtRefreshGuard)
  @ApiCookieAuth('refresh_token')
  @ApiOperation({ summary: 'Refresh access token using refresh token cookie' })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = req.user as IJwtPayload & { refreshToken: string };
    const { accessToken, refreshToken } = await this.authService.refresh(user);

    res.cookie('access_token', accessToken, ACCESS_COOKIE_OPTIONS);
    res.cookie('refresh_token', refreshToken, REFRESH_COOKIE_OPTIONS);

    return { success: true, message: 'Token refreshed' };
  }

  @Post('google')
  @HttpCode(HttpStatus.OK)
  @Throttle({ auth: { ttl: 60000, limit: 10 } })
  @ApiOperation({ summary: 'Login with Google (Firebase ID Token)' })
  async googleLogin(
    @Body() dto: GoogleLoginDto,
    @Res({ passthrough: true }) res: Response,
    @Req() req: Request,
  ) {
    const result = await this.authService.googleLogin(dto.idToken);
    const { accessToken, refreshToken, ...rest } = result.data as {
      accessToken: string;
      refreshToken: string;
      user: ICurrentUser;
    };

    res.cookie('access_token', accessToken, ACCESS_COOKIE_OPTIONS);
    res.cookie('refresh_token', refreshToken, REFRESH_COOKIE_OPTIONS);

    void this.auditService.log('LOGIN_GOOGLE', 'UserLogin', rest.user.id, rest.user.id, rest.user.username, undefined, extractIp(req));

    return { success: true, data: rest };
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send OTP to email for password reset' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Post('forgot-password/resend-otp')
  @HttpCode(HttpStatus.OK)
  @Throttle({ auth: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: 'Resend OTP for forgot-password (countdown 60s, max 3/day)' })
  async resendForgotPasswordOtp(@Body() dto: ForgotPasswordDto) {
    return this.authService.resendForgotPasswordOtp(dto.email);
  }

  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify OTP and get reset token' })
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto.email, dto.otp);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password using reset token' })
  async resetPassword(@Body() dto: ResetPasswordDto, @Req() req: Request) {
    const { userId, username } = await this.authService.resetPassword(dto.resetToken, dto.newPassword);
    void this.auditService.log('RESET_PASSWORD', 'UserLogin', userId, userId, username, undefined, extractIp(req));
    return { success: true, message: 'Password updated successfully' };
  }

  @Post('first-time-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set password on first login' })
  async firstTimePassword(
    @Body() dto: FirstTimePasswordDto,
    @Res({ passthrough: true }) res: Response,
    @Req() req: Request,
  ) {
    const result = await this.authService.firstTimePassword(dto.recoveryKey, dto.newPassword);
    const data = result.data as Record<string, unknown>;

    // 2FA may be required after first-time password set
    if (data['requires2FA'] || data['requires2FASetup']) {
      return result;
    }

    const { accessToken, refreshToken, ...rest } = data as { accessToken: string; refreshToken: string; user: ICurrentUser };
    void this.auditService.log('FIRST_TIME_PASSWORD_SET', 'UserLogin', rest.user.id, rest.user.id, rest.user.username, undefined, extractIp(req));
    res.cookie('access_token', accessToken, ACCESS_COOKIE_OPTIONS);
    res.cookie('refresh_token', refreshToken, REFRESH_COOKIE_OPTIONS);
    return { success: true, data: rest };
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth('access_token')
  @ApiOperation({ summary: 'Change password (requires authentication)' })
  async changePassword(
    @Req() req: Request,
    @Body() dto: ChangePasswordDto,
  ) {
    const user = req.user as IJwtPayload;
    try {
      await this.authService.changePassword(user.sub, dto.currentPassword, dto.newPassword);
    } catch (err) {
      void this.auditService.log('CHANGE_PASSWORD_FAILED', 'UserLogin', user.sub, user.sub, undefined, { reason: (err as Error)?.message }, extractIp(req));
      throw err;
    }
    void this.auditService.log('CHANGE_PASSWORD', 'UserLogin', user.sub, user.sub, undefined, undefined, extractIp(req));
    return { success: true, message: 'Password changed successfully' };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth('access_token')
  @ApiOperation({ summary: 'Get current authenticated user info' })
  async getMe(@Req() req: Request): Promise<{ success: boolean; data: ICurrentUser }> {
    const user = req.user as IJwtPayload;
    const currentUser = await this.authService.getMe(user.sub);
    return { success: true, data: currentUser };
  }

  // ── 2FA Endpoints ────────────────────────────────────────────────────────

  @Get('2fa/status')
  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth('access_token')
  @ApiOperation({ summary: 'Get current 2FA status for the logged-in user' })
  async get2FAStatus(@Req() req: Request) {
    const user = req.user as IJwtPayload;
    const status = await this.twoFAService.getStatus(user.sub);
    return { success: true, data: status };
  }

  @Post('2fa/setup')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth('access_token')
  @ApiOperation({ summary: 'Initiate 2FA setup — returns QR code for TOTP or confirmation for Email OTP' })
  async setup2FA(@Body() dto: Setup2FADto, @Req() req: Request) {
    const user = req.user as IJwtPayload;
    const result = await this.twoFAService.initiateSetup(user.sub, dto.method);
    return { success: true, data: result };
  }

  @Post('2fa/setup/confirm')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth('access_token')
  @ApiOperation({ summary: 'Confirm 2FA setup with a verification code' })
  async confirm2FASetup(
    @Body() dto: Confirm2FADto & { method: string; setupToken?: string },
    @Req() req: Request,
  ) {
    const user = req.user as IJwtPayload;
    const result = await this.twoFAService.confirmSetup(
      user.sub,
      dto.method as import('@shared/enums/two-fa-method.enum').TwoFAMethod,
      dto.code,
      dto.setupToken,
    );
    return { success: true, data: result };
  }

  @Delete('2fa')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth('access_token')
  @ApiOperation({ summary: 'Disable 2FA — requires password confirmation' })
  async disable2FA(@Body() dto: Disable2FADto, @Req() req: Request) {
    const user = req.user as IJwtPayload;
    await this.twoFAService.disable(user.sub, dto.password);
    void this.auditService.log('2FA_DISABLED', 'Staff', user.staffId ?? user.sub, user.sub, undefined, undefined, extractIp(req));
    return { success: true, message: '2FA disabled successfully' };
  }

  @Post('2fa/verify')
  @HttpCode(HttpStatus.OK)
  @Throttle({ auth: { ttl: 60000, limit: 10 } })
  @ApiOperation({ summary: 'Verify 2FA code to complete login' })
  async verify2FA(
    @Body() dto: Verify2FADto,
    @Res({ passthrough: true }) res: Response,
    @Req() req: Request,
  ) {
    let userLogin: Awaited<ReturnType<typeof this.twoFAService.verify>>;
    try {
      userLogin = await this.twoFAService.verify(dto.challengeToken, dto.code);
    } catch (err) {
      void this.auditService.log('2FA_FAILED', 'UserLogin', 'unknown', undefined, undefined, { reason: (err as Error)?.message }, extractIp(req));
      throw err;
    }
    const { user, accessToken, refreshToken } = await this.authService.buildLoginResponse(userLogin);

    res.cookie('access_token', accessToken, ACCESS_COOKIE_OPTIONS);
    res.cookie('refresh_token', refreshToken, REFRESH_COOKIE_OPTIONS);

    void this.auditService.log('LOGIN_2FA', 'UserLogin', user.id, user.id, user.username, undefined, extractIp(req));

    return { success: true, data: { user } };
  }

  @Post('2fa/resend-otp')
  @HttpCode(HttpStatus.OK)
  @Throttle({ auth: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: 'Resend Email OTP for 2FA login' })
  async resend2FAOtp(@Body() dto: ResendOtpDto) {
    await this.twoFAService.resendEmailOtp(dto.challengeToken);
    return { success: true, message: 'OTP sent to your registered email' };
  }

  // ── S43: Initial 2FA Setup (forced, before full session) ─────────────────

  @Post('2fa/initial-setup')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'S43: Initiate first-time 2FA setup (setupToken required)' })
  async initialSetup2FA(@Body() dto: { setupToken: string }) {
    const result = await this.twoFAService.initiateInitialSetup(dto.setupToken);
    return { success: true, data: result };
  }

  @Post('2fa/initial-setup/confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'S43: Confirm first-time 2FA setup — completes login session immediately (BA §6.10.1)' })
  async confirmInitialSetup2FA(
    @Body() dto: { setupToken: string; code: string },
    @Res({ passthrough: true }) res: Response,
    @Req() req: Request,
  ) {
    const userLogin = await this.twoFAService.confirmInitialSetup(dto.setupToken, dto.code);
    if (!userLogin) throw new Error('User not found after 2FA setup');

    const { user, accessToken, refreshToken } = await this.authService.buildLoginResponse(userLogin);

    res.cookie('access_token', accessToken, ACCESS_COOKIE_OPTIONS);
    res.cookie('refresh_token', refreshToken, REFRESH_COOKIE_OPTIONS);

    void this.auditService.log('LOGIN_2FA_SETUP', 'UserLogin', user.id, user.id, user.username, undefined, extractIp(req));

    return { success: true, data: { user } };
  }

  // ── S33: Authenticator management (per-method toggle, recipient, QR) ──────

  @Get('2fa/requirement-status')
  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth('access_token')
  @ApiOperation({ summary: 'S33/S08: Get 2FA requirement status for current user (isEnabled, isRequired, systemForced)' })
  async getRequirementStatus(@Req() req: Request) {
    const user = req.user as IJwtPayload;
    if (!user.staffId) return { success: true, data: { isEnabled: false, isRequired: false, systemForced: false } };
    const data = await this.twoFAService.getRequirementStatus(user.staffId);
    return { success: true, data };
  }

  @Get('2fa/authenticators')
  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth('access_token')
  @ApiOperation({ summary: 'S33: List user\'s StaffAuthenticator records' })
  async getAuthenticators(@Req() req: Request) {
    const user = req.user as IJwtPayload;
    if (!user.staffId) return { success: true, data: [] };
    const data = await this.twoFAService.getAuthenticators(user.staffId);
    return { success: true, data };
  }

  @Patch('2fa/authenticators/:id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth('access_token')
  @ApiOperation({ summary: 'S33: Update authenticator (toggle enable, change recipient)' })
  async updateAuthenticator(
    @Param('id') id: string,
    @Body() dto: { isEnable?: boolean; recipient?: string },
    @Req() req: Request,
  ) {
    const user = req.user as IJwtPayload;
    if (!user.staffId) throw new NotFoundException('Staff not found');
    const data = await this.twoFAService.updateAuthenticator(id, user.staffId, dto);
    return { success: true, data };
  }

  @Get('2fa/qr')
  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth('access_token')
  @ApiOperation({ summary: 'S33: Get QR code for Google Authenticator' })
  async getQrCode(@Req() req: Request) {
    const user = req.user as IJwtPayload;
    if (!user.staffId) throw new NotFoundException('Staff not found');
    const data = await this.twoFAService.getQrCode(user.staffId, user.sub);
    return { success: true, data };
  }

  /** DEV ONLY — returns last unused OTP for an email. 404 in production. */
  @Get('dev/last-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[DEV] Get last unused OTP for testing' })
  async devGetLastOtp(@Query('email') email: string) {
    if (process.env.NODE_ENV !== 'development') {
      throw new NotFoundException();
    }
    return this.authService.devGetLastOtp(email);
  }

  /** DEV ONLY — returns last unused Login OTP (2FA) for an email. 404 in production. */
  @Get('dev/last-login-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[DEV] Get last unused 2FA Login OTP for testing' })
  async devGetLastLoginOtp(@Query('email') email: string) {
    if (process.env.NODE_ENV !== 'development') {
      throw new NotFoundException();
    }
    return this.twoFAService.devGetLastLoginOtp(email);
  }

  /** DEV ONLY — returns current valid TOTP code for a known secret. 404 in production. */
  @Get('dev/current-totp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[DEV] Get current TOTP code for a known secret (testing only)' })
  async devCurrentTotp(@Query('secret') secret: string) {
    if (process.env.NODE_ENV !== 'development') {
      throw new NotFoundException();
    }
    return this.twoFAService.devGetCurrentTotp(secret);
  }

  /** DEV ONLY — returns current valid TOTP code derived for a user (HMAC-derived). 404 in production. */
  @Get('dev/derived-totp-code')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[DEV] Get current HMAC-derived TOTP code for a username (testing only)' })
  async devDerivedTotpCode(@Query('username') username: string) {
    if (process.env.NODE_ENV !== 'development') {
      throw new NotFoundException();
    }
    return this.twoFAService.devGetDerivedTotpCode(username);
  }
}
